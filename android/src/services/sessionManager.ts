import { NativeModules, Platform } from 'react-native';
import { API_URL_ANDROID, API_URL_IOS } from './env';

const { SecureAuthStorage } = NativeModules;

export interface StoredSession {
  token: string;
  user: any;
  rememberMe: boolean;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: any;
  isOffline?: boolean;
  reason?: string;
}

// Fallback in-memory store if native module is unavailable (e.g. unit tests or unsupported platform)
let memoryToken: string | null = null;
let memoryUserJson: string | null = null;
let memoryRemember: boolean = true;
const memoryCache = new Map<string, string>();

class SessionManager {
  /**
   * Save authentication session into hardware-backed Android KeyStore storage.
   */
  async saveSession(token: string, user: any, rememberMe: boolean = true): Promise<boolean> {
    try {
      if (!token || !user) return false;
      const userJson = JSON.stringify(user);

      if (SecureAuthStorage?.saveAuthSession) {
        await SecureAuthStorage.saveAuthSession(token, userJson, rememberMe);
        return true;
      } else {
        memoryToken = token;
        memoryUserJson = userJson;
        memoryRemember = rememberMe;
        return true;
      }
    } catch (err) {
      console.warn('[SessionManager] Error saving secure session:', err);
      return false;
    }
  }

  /**
   * Read saved session from secure storage.
   */
  async loadSession(): Promise<StoredSession | null> {
    try {
      if (SecureAuthStorage?.getAuthSession) {
        const raw = await SecureAuthStorage.getAuthSession();
        if (!raw || !raw.token || !raw.userJson) {
          return null;
        }

        try {
          const user = JSON.parse(raw.userJson);
          return {
            token: raw.token,
            user,
            rememberMe: Boolean(raw.rememberMe),
          };
        } catch {
          return null;
        }
      } else {
        if (!memoryToken || !memoryUserJson) return null;
        return {
          token: memoryToken,
          user: JSON.parse(memoryUserJson),
          rememberMe: memoryRemember,
        };
      }
    } catch (err) {
      console.warn('[SessionManager] Error reading secure session:', err);
      return null;
    }
  }

  /**
   * Explicit logout: wipe hardware-encrypted credentials and user cache.
   */
  async clearSession(): Promise<boolean> {
    try {
      memoryToken = null;
      memoryUserJson = null;
      memoryCache.clear();

      if (SecureAuthStorage?.clearAuthSession) {
        await SecureAuthStorage.clearAuthSession();
      }
      return true;
    } catch (err) {
      console.warn('[SessionManager] Error clearing secure session:', err);
      return false;
    }
  }

  /**
   * Validate existing session token against the production backend.
   * If network is unreachable, allows access in offline mode with cached profile.
   * If backend explicitly rejects token (401/403), reports invalid.
   */
  async validateSession(token: string): Promise<SessionValidationResult> {
    const baseUrl = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;
    const url = `${baseUrl || 'https://vendor.ficapp.in/api'}/vendor/profile`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timeoutId) clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success && data?.user) {
        return { valid: true, user: data.user };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          reason: data?.message || 'Your session has expired. Please sign in again.',
        };
      }

      // 5xx or unexpected response: treat as offline resilience so vendor is not locked out
      return { valid: true, isOffline: true };
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      const msg = String(err?.message || '').toLowerCase();
      // Network failure, timeout, or DNS issue: allow offline access with cached credentials
      if (
        msg.includes('network request failed') ||
        msg.includes('aborted') ||
        msg.includes('timed out') ||
        msg.includes('failed to fetch')
      ) {
        return { valid: true, isOffline: true };
      }
      return { valid: true, isOffline: true };
    }
  }

  /**
   * Save user-scoped cache item (e.g. products, dashboard KPIs)
   */
  async saveVendorCache(vendorId: string, key: string, data: any): Promise<void> {
    try {
      const cacheKey = `v_${vendorId || 'default'}_${key}`;
      const payload = JSON.stringify({ data, savedAt: Date.now() });

      if (SecureAuthStorage?.saveCacheData) {
        await SecureAuthStorage.saveCacheData(cacheKey, payload);
      } else {
        memoryCache.set(cacheKey, payload);
      }
    } catch {}
  }

  /**
   * Retrieve user-scoped cache item
   */
  async getVendorCache(vendorId: string, key: string, maxAgeMs: number = 86400000): Promise<any | null> {
    try {
      const cacheKey = `v_${vendorId || 'default'}_${key}`;
      let raw: string | null = null;

      if (SecureAuthStorage?.getCacheData) {
        raw = await SecureAuthStorage.getCacheData(cacheKey);
      } else {
        raw = memoryCache.get(cacheKey) || null;
      }

      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.savedAt > maxAgeMs) {
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Clear all application cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      memoryCache.clear();
      if (SecureAuthStorage?.clearAllCache) {
        await SecureAuthStorage.clearAllCache();
      }
    } catch {}
  }
}

export const sessionManager = new SessionManager();

