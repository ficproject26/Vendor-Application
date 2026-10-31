package com.vendormobile

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureAuthStorageModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val PREFS_NAME = "vendor_secure_session"
    private val CACHE_PREFS_NAME = "vendor_app_cache"
    private val KEY_ALIAS = "VendorMobileAuthKey"
    private val ANDROID_KEYSTORE = "AndroidKeyStore"
    private val TRANSFORMATION = "AES/GCM/NoPadding"
    private val GCM_IV_LENGTH = 12
    private val GCM_TAG_LENGTH = 128

    private val KEY_TOKEN = "enc_jwt_token"
    private val KEY_USER = "enc_user_profile"
    private val KEY_REMEMBER = "auth_remember_me"

    override fun getName(): String {
        return "SecureAuthStorage"
    }

    private fun getPrefs(): SharedPreferences {
        return reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getCachePrefs(): SharedPreferences {
        return reactContext.getSharedPreferences(CACHE_PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (keyStore.containsAlias(KEY_ALIAS)) {
            val entry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
            if (entry != null) {
                return entry.secretKey
            }
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val builder = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)

        keyGenerator.init(builder.build())
        return keyGenerator.generateKey()
    }

    private fun encrypt(plainText: String): String {
        return try {
            val secretKey = getOrCreateSecretKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val iv = cipher.iv
            val cipherText = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))

            val combined = ByteArray(iv.size + cipherText.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(cipherText, 0, combined, iv.size, cipherText.size)

            Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.w("SecureAuthStorage", "Hardware encryption failed, falling back to private prefs", e)
            Base64.encodeToString(plainText.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        }
    }

    private fun decrypt(encryptedBase64: String): String? {
        return try {
            val combined = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            if (combined.size <= GCM_IV_LENGTH) {
                return String(combined, Charsets.UTF_8)
            }

            try {
                val secretKey = getOrCreateSecretKey()
                val iv = ByteArray(GCM_IV_LENGTH)
                val cipherText = ByteArray(combined.size - GCM_IV_LENGTH)
                System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH)
                System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.size)

                val cipher = Cipher.getInstance(TRANSFORMATION)
                val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
                cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

                val plainBytes = cipher.doFinal(cipherText)
                String(plainBytes, Charsets.UTF_8)
            } catch (keystoreEx: Exception) {
                // Fallback for unencrypted Base64
                String(combined, Charsets.UTF_8)
            }
        } catch (e: Exception) {
            Log.e("SecureAuthStorage", "Failed to decrypt stored data", e)
            null
        }
    }

    @ReactMethod
    fun saveAuthSession(token: String, userJson: String, rememberMe: Boolean, promise: Promise) {
        try {
            val encToken = encrypt(token)
            val encUser = encrypt(userJson)

            getPrefs().edit().apply {
                putString(KEY_TOKEN, encToken)
                putString(KEY_USER, encUser)
                putBoolean(KEY_REMEMBER, rememberMe)
                apply()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("SecureAuthStorage", "saveAuthSession error: ${e.message}")
            promise.reject("SAVE_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAuthSession(promise: Promise) {
        try {
            val prefs = getPrefs()
            val encToken = prefs.getString(KEY_TOKEN, null)
            val encUser = prefs.getString(KEY_USER, null)
            val rememberMe = prefs.getBoolean(KEY_REMEMBER, true)

            if (encToken.isNullOrEmpty() || encUser.isNullOrEmpty()) {
                promise.resolve(null)
                return
            }

            val token = decrypt(encToken)
            val userJson = decrypt(encUser)

            if (token.isNullOrEmpty() || userJson.isNullOrEmpty()) {
                promise.resolve(null)
                return
            }

            val map = Arguments.createMap().apply {
                putString("token", token)
                putString("userJson", userJson)
                putBoolean("rememberMe", rememberMe)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e("SecureAuthStorage", "getAuthSession error: ${e.message}")
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearAuthSession(promise: Promise) {
        try {
            getPrefs().edit().clear().apply()
            getCachePrefs().edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("SecureAuthStorage", "clearAuthSession error: ${e.message}")
            promise.reject("CLEAR_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun saveCacheData(key: String, data: String, promise: Promise) {
        try {
            getCachePrefs().edit().putString(key, data).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_CACHE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCacheData(key: String, promise: Promise) {
        try {
            val data = getCachePrefs().getString(key, null)
            promise.resolve(data)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearAllCache(promise: Promise) {
        try {
            getCachePrefs().edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}

