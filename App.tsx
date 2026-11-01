import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, TouchableOpacity, useColorScheme, PermissionsAndroid, Platform, AppState, BackHandler, ToastAndroid, Alert} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import tw, { useAppColorScheme } from 'twrnc';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  screenName?: string;
  isDark?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ScreenErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`[ScreenErrorBoundary] Error in ${this.props.screenName || 'Screen'}:`, error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark ?? false;
      return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
          </View>
          <Text style={{ color: isDark ? '#FFFFFF' : '#0F172A', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Unable to load {this.props.screenName || 'screen'}
          </Text>
          <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 12, marginBottom: 20, textAlign: 'center', paddingHorizontal: 16 }}>
            {this.state.error?.message || 'A temporary rendering error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={this.resetError}
            style={{ backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Reload Screen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
import {
  Home,
  ClipboardList,
  Store,
  User,
  TrendingUp,
  Landmark,
} from 'lucide-react-native';

// Screens
import HomeScreen from './android/src/screens/HomeScreen';
import OrdersScreen from './android/src/screens/OrdersScreen';
import BusinessScreen from './android/src/screens/BusinessScreen';
import PaymentsScreen from './android/src/screens/PaymentsScreen';
import ProfileScreen from './android/src/screens/ProfileScreen';
import LoginScreen from './android/src/screens/LoginScreen';
import SignupScreen from './android/src/screens/SignupScreen';
import DeliveryPartnersScreen from './android/src/screens/DeliveryPartnersScreen';
import CustomersScreen from './android/src/screens/CustomersScreen';
import SubscriptionScreen from './android/src/screens/SubscriptionScreen';
import VendorPaymentsScreen from './android/src/screens/VendorPaymentsScreen';
import QueriesScreen from './android/src/screens/QueriesScreen';
import NotificationHistoryScreen from './android/src/screens/NotificationHistoryScreen';
import SplashScreen from './android/src/screens/SplashScreen';
import NotificationBanner, { VendorActivityNotification } from './android/src/components/NotificationBanner';
import NewActivityModal from './android/src/components/NewActivityModal';
import { socketService } from './android/src/services/socketService';
import { soundNotificationService, NotificationTapEvent } from './android/src/services/soundNotificationService';
import { registerDeviceToken } from './android/src/services/apiService';

let messagingModule: any = null;
try {
  messagingModule = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('[App] Firebase Messaging module fallback');
}

export type CategoryKey = 'Products' | 'Services' | 'Food' | 'Travel' | 'Stay' | 'Jobs' | 'Daily Needs';

export interface BusinessItem {
  id: string;
  businessId?: string;
  vendorId?: string;
  name: string;
  detail: string;
  price: string;
  originalPrice?: string;
  isActive: boolean;
  category: CategoryKey;
  image: string;
  subCategory?: string;
  itemType?: string;
  unit?: string;
  stock?: string;
  pinCode?: string;
  // Category-specific fields
  selectedAmenities?: string[];
  amenities?: string[];
  roomClass?: string;
  numberOfGuests?: string;
  boardingPoint?: string;
  boardingTime?: string;
  additionalBoardingPoints?: { point: string; time: string }[];
  boardingPoints?: string[];
  dropPoint?: string;
  arrivalTime?: string;
  additionalDropPoints?: { point: string; time: string }[];
  dropPoints?: string[];
  droppingPoints?: string[];
  totalDistance?: string;
  busSchedule?: string;
  routeStops?: { stopName: string; time: string }[];
  // Travel Specific Fields
  operator?: string;
  operatorName?: string;
  from?: string;
  to?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  duration?: string;
  badge?: string;
  vehicleNumber?: string;
  vehicleRegNo?: string;
  busNumber?: string;
  seatsLeft?: number;
  foodType?: string;
  preparationTime?: string;
  offer?: {
    title: string;
    description?: string;
    discountType: 'percentage' | 'fixed' | 'promotional';
    discountValue: number;
    originalPrice: number;
    offerPrice: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    isActive: boolean;
  };
  jobType?: string;
  salaryPeriod?: string;
  experienceLevel?: string;
  qualification?: string;
  jobLocation?: string;
  experienceRequired?: string;
  salaryPackage?: string;
  skillsRequirement?: string;
  jobDescription?: string;
  keyResponsibilities?: string;
  deadlineDate?: string;
  applicationTips?: string;
  qualificationRequired?: string;
  linkedProfileUrl?: string;
  contactNumber?: string;
  mailId?: string;
  vacancies?: string;
  jobID?: string;
  companyName?: string;
  companyWebsite?: string;
  // Stay Specific Fields
  hotelName?: string;
  stayCity?: string;
  locationCity?: string;
  stayAddress?: string;
  location?: string;
  bedType?: string;
  roomSize?: string;
  roomView?: string;
  checkInTime?: string;
  checkOutTime?: string;
  starRating?: number;
  freeCancellation?: boolean;
  freeBreakfast?: boolean;
  coupleFriendly?: boolean;
  payAtHotel?: boolean;
  deliveryTime?: string;
  [key: string]: any;
}

import { setToken, setVendorUser, getVendorUser, getToken, fetchProfile, fetchAllBusinessesProducts, updateOrderStatus, logoutVendor } from './android/src/services/apiService';
import { sessionManager } from './android/src/services/sessionManager';

type Tab =
  | 'Home'
  | 'Orders'
  | 'Business'
  | 'Payments'
  | 'Profile'
  | 'DeliveryPartners'
  | 'Customers'
  | 'Subscriptions'
  | 'VendorPayments'
  | 'Queries'
  | 'NotificationHistory'
  | 'Analytics';
type AuthScreen = 'login' | 'signup';

function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const initialUser = getVendorUser();
  const initialToken = getToken();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Boolean(initialToken && initialUser));
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const [businessItems, setBusinessItems] = useState<BusinessItem[]>([]);
  const [purchasedTier, setPurchasedTier] = useState<'Silver' | 'Gold' | 'Diamond'>('Silver');

  const [colorScheme, toggleColorScheme, setColorScheme] = useAppColorScheme(tw);

  // Synchronize twrnc dark mode scheme dynamically
  useEffect(() => {
    setColorScheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Restore persisted theme preference across app restarts
  useEffect(() => {
    sessionManager.loadThemePreference().then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeMode(saved);
      }
    }).catch(() => {});
  }, []);

  const isSuspended = Boolean(
    currentUser?.isSuspended ||
    currentUser?.isLocked ||
    String(currentUser?.status || '').toLowerCase() === 'suspended' ||
    String(currentUser?.approvalStatus || '').toLowerCase() === 'suspended'
  );

  const isPendingApproval = Boolean(
    currentUser?.approvalStatus === 'PENDING_PINCODE_APPROVAL' ||
    currentUser?.approvalStatus === 'PENDING_KYC_APPROVAL' ||
    currentUser?.approvalStatus === 'PENDING_PAYMENT_APPROVAL' ||
    String(currentUser?.status || '').toLowerCase() === 'pending' ||
    String(currentUser?.status || '').toLowerCase() === 'pending pincode admin review'
  );

  // Automatic persistent session restoration on app launch
  useEffect(() => {
    let isMounted = true;
    const isUserApproved = (u: any) => {
      if (!u) return false;
      if (u.isSuspended || u.isLocked) return false;
      const status = String(u.status || '').toLowerCase();
      const approval = String(u.approvalStatus || '').toLowerCase();
      if (['suspended', 'inactive', 'terminated'].includes(status) || approval === 'suspended') return false;
      if (['rejected', 'cancelled'].includes(status) || approval === 'rejected') return false;
      if (u.isApproved === false) return false;
      if (
        ['pending', 'submitted', 'pending_pincode_approval', 'kyc_pending', 'kyc_in_progress', 'payment_pending', 'pending pincode admin review'].includes(status) ||
        ['pending_pincode_approval', 'pending_kyc_approval', 'pending_payment_approval'].includes(approval)
      ) {
        return false;
      }
      return true;
    };

    const restoreSession = async () => {
      try {
        const stored = await sessionManager.loadSession();
        if (!stored || !stored.token || !stored.user) {
          if (isMounted) {
            setIsLoggedIn(false);
            setIsInitializing(false);
          }
          return;
        }

        // Verify that stored user account is approved before granting dashboard access
        if (!isUserApproved(stored.user)) {
          console.warn('[App] Stored user is not approved/active. Redirecting to login.');
          await logoutVendor();
          if (isMounted) {
            setIsLoggedIn(false);
            setCurrentUser(null);
            setIsInitializing(false);
          }
          return;
        }

        // Restore credentials into runtime memory immediately
        setToken(stored.token);
        setVendorUser(stored.user);
        if (isMounted) {
          setCurrentUser(stored.user);
          const tier = stored.user.membershipPlan === 'Gold' ? 'Gold' : stored.user.membershipPlan === 'Diamond' ? 'Diamond' : 'Silver';
          setPurchasedTier(tier);
          setIsLoggedIn(true);
          setIsInitializing(false); // Unblock UI immediately: < 20ms startup
        }

        // Validate session with production backend asynchronously in the background
        sessionManager.validateSession(stored.token).then(async (validation) => {
          if (!isMounted) return;
          if (validation.valid) {
            if (validation.user) {
              if (!isUserApproved(validation.user)) {
                console.warn('[App] Validated user is under review or not active. Logging out.');
                await logoutVendor();
                if (isMounted) {
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                }
                return;
              }
              setVendorUser(validation.user);
              setCurrentUser(validation.user);
              await sessionManager.saveSession(stored.token, validation.user, stored.rememberMe);
            }
          } else {
            console.warn('[App] Session revoked/expired on backend:', validation.reason);
            await logoutVendor();
            if (isMounted) {
              setIsLoggedIn(false);
              setCurrentUser(null);
            }
          }
        }).catch((err) => {
          console.warn('[App] Background session validation exception:', err);
        });
      } catch (err) {
        console.warn('[App] Session restoration exception:', err);
        if (isMounted) setIsLoggedIn(false);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auth handlers
  const handleLogin = (user: any) => {
    setCurrentUser(user);
    // Dynamically set purchased tier from user plan
    const tier = user.membershipPlan === 'Gold' ? 'Gold' : user.membershipPlan === 'Diamond' ? 'Diamond' : 'Silver';
    setPurchasedTier(tier);
    setIsLoggedIn(true);
  };

  const handleSignup = () => {
    setAuthScreen('login');
  };

  const handleNavigateToSignup = () => {
    setAuthScreen('signup');
  };

  const handleNavigateToLogin = () => {
    setAuthScreen('login');
  };

  const handleLogout = async () => {
    try {
      soundNotificationService.stopKeepAliveService();
      await logoutVendor();
    } catch (e) {
      console.warn('[App] Logout error:', e);
    }
    setCurrentUser(null);
    setBusinessItems([]);
    setIsLoggedIn(false);
    setActiveNotification(null);
    socketService.disconnect();
    setNavigationHistory([]);
    setActiveTab('Home'); // Reset active tab when logging out
  };
  
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [navigationHistory, setNavigationHistory] = useState<Array<{ tab: Tab; params?: any }>>([]);
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['Home']));
  const [businessTabParams, setBusinessTabParams] = useState<any>(null);
  const [ordersTabParams, setOrdersTabParams] = useState<{ segment?: 'Orders' | 'Bookings' | 'Jobs'; targetId?: string } | null>(null);
  const [activeNotification, setActiveNotification] = useState<VendorActivityNotification | null>(null);
  const [modalNotification, setModalNotification] = useState<VendorActivityNotification | null>(null);
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [isOrderActionProcessing, setIsOrderActionProcessing] = useState(false);
  const modalTimerRef = useRef<any>(null);
  const modalQueueRef = useRef<VendorActivityNotification[]>([]);

  const clearModalTimers = useCallback(() => {
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }
  }, []);

  const dismissCurrentModal = useCallback(() => {
    clearModalTimers();
    soundNotificationService.stopNewOrderSound();
    if (modalQueueRef.current && modalQueueRef.current.length > 0) {
      const nextNotif = modalQueueRef.current.shift()!;
      displayModalNotification(nextNotif);
    } else {
      setIsActivityModalVisible(false);
      setModalNotification(null);
    }
  }, [clearModalTimers]);

  const displayModalNotification = useCallback((notif: VendorActivityNotification) => {
    if (!notif) return;
    clearModalTimers();
    setModalNotification(notif);
    setIsActivityModalVisible(true);
    soundNotificationService.playNewOrderSound();

    // Exact 15-second auto-dismiss timer
    modalTimerRef.current = setTimeout(() => {
      dismissCurrentModal();
    }, 15000);
  }, [clearModalTimers, dismissCurrentModal]);

  const enqueueOrDisplayModalNotification = useCallback((notif: VendorActivityNotification) => {
    if (!notif) return;
    const notifId = String(notif.id || notif.raw?.id || notif.raw?._id || notif.raw?.order_number || '');
    if (isActivityModalVisible && modalNotification) {
      const isAlreadyInQueue = modalQueueRef.current.some(it => {
        const itId = String(it.id || it.raw?.id || it.raw?._id || it.raw?.order_number || '');
        return itId && itId === notifId;
      });
      const isCurrentActive = String(modalNotification.id || modalNotification.raw?.id || modalNotification.raw?._id || modalNotification.raw?.order_number || '') === notifId;
      if (!isAlreadyInQueue && !isCurrentActive) {
        modalQueueRef.current.push(notif);
      }
    } else {
      displayModalNotification(notif);
    }
  }, [isActivityModalVisible, modalNotification, displayModalNotification]);

  const handleAcceptOrder = async (notif: VendorActivityNotification) => {
    setIsOrderActionProcessing(true);
    try {
      const statusToSet = notif.category === 'Booking' ? 'Confirmed' : 'Accepted';
      await updateOrderStatus(notif.id, statusToSet);
      dismissCurrentModal();
      setActiveNotification(null);
      handleNavigate('Orders', { segment: notif.segment, targetId: notif.id });
    } catch (err: any) {
      console.warn('Failed to accept order:', err);
    } finally {
      setIsOrderActionProcessing(false);
    }
  };

  const handleRejectOrder = async (notif: VendorActivityNotification) => {
    setIsOrderActionProcessing(true);
    try {
      await updateOrderStatus(notif.id, 'Cancelled');
      dismissCurrentModal();
      setActiveNotification(null);
    } catch (err: any) {
      console.warn('Failed to reject order:', err);
    } finally {
      setIsOrderActionProcessing(false);
    }
  };

  const handleViewOrderDetails = (notif: VendorActivityNotification) => {
    dismissCurrentModal();
    setActiveNotification(null);
    handleNavigate('Orders', { segment: notif.segment, targetId: notif.id });
  };

  const handleNavigate = useCallback((tab: Tab, params?: any) => {
    setActiveTab(prevTab => {
      if (prevTab !== tab) {
        setNavigationHistory(h => {
          const prevParams = prevTab === 'Business' ? businessTabParams : prevTab === 'Orders' ? ordersTabParams : undefined;
          return [...h, { tab: prevTab, params: prevParams }].slice(-50);
        });
      }
      return tab;
    });

    if (tab === 'Business') {
      setBusinessTabParams(params || null);
    }
    if (tab === 'Orders') {
      setOrdersTabParams(params || null);
    }
    setVisitedTabs(prev => new Set(prev).add(tab));
  }, [businessTabParams, ordersTabParams]);

  const handleBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      setNavigationHistory(prev => {
        if (prev.length === 0) return prev;
        const newHist = [...prev];
        const last = newHist.pop()!;
        setActiveTab(last.tab);
        if (last.tab === 'Business') setBusinessTabParams(last.params || null);
        if (last.tab === 'Orders') setOrdersTabParams(last.params || null);
        return newHist;
      });
      return true;
    }
    if (activeTab !== 'Home') {
      setActiveTab('Home');
      return true;
    }
    return false;
  }, [navigationHistory, activeTab]);

  // Global Android Hardware Back Button Handler
  const lastBackPressRef = useRef<number>(0);
  useEffect(() => {
    const onHardwareBack = () => {
      // 1. If activity modal is visible, close it first
      if (isActivityModalVisible) {
        dismissCurrentModal();
        return true;
      }
      // 2. If active activity banner is showing, dismiss it
      if (activeNotification) {
        setActiveNotification(null);
        return true;
      }
      // 3. If there is navigation history, pop to previous screen
      if (navigationHistory.length > 0) {
        handleBack();
        return true;
      }
      // 4. If on secondary tab other than Home, navigate back to Home
      if (activeTab !== 'Home') {
        setActiveTab('Home');
        return true;
      }
      // 5. At root Home with empty history: Double tap within 2s to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [isActivityModalVisible, activeNotification, navigationHistory, activeTab, dismissCurrentModal, handleBack]);

  // Request Android 13+ POST_NOTIFICATIONS Permission & Register FCM Token
  useEffect(() => {
    const initNotificationsAndToken = async () => {
      let hasPermission = true;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
          console.log('[App] POST_NOTIFICATIONS status:', granted);
        } catch (err) {
          console.warn('[App] Error requesting POST_NOTIFICATIONS:', err);
        }
      }

      if (messagingModule && hasPermission) {
        try {
          const authStatus = await messagingModule().requestPermission();
          const enabled =
            authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
            authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;
          console.log('[App] FCM Auth Status:', authStatus, 'Enabled:', enabled);

          if (enabled) {
            const token = await messagingModule().getToken();
            if (token) {
              console.log('🔥 [App] FCM Device Token obtained:', token);
              await registerDeviceToken(token);
            }
          }
        } catch (fcmErr: any) {
          console.warn('[App] FCM Token registration notice:', fcmErr?.message || fcmErr);
        }
      }
    };

    initNotificationsAndToken();

    // Start background keep-alive service when authenticated
    if (isLoggedIn) {
      soundNotificationService.startKeepAliveService();
    }

    // Ensure background service stays active when app transitions to background or minimized
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (isLoggedIn && (nextState === 'background' || nextState === 'inactive')) {
        soundNotificationService.startKeepAliveService();
      }
    });

    // Listen for FCM token refresh events
    let unsubscribeTokenRefresh: (() => void) | null = null;
    if (messagingModule) {
      try {
        unsubscribeTokenRefresh = messagingModule().onTokenRefresh(async (newToken: string) => {
          console.log('🔄 [App] FCM Token refreshed:', newToken);
          await registerDeviceToken(newToken);
        });
      } catch (e) {}
    }

    return () => {
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
      appStateSub.remove();
    };
  }, [isLoggedIn]);

  // Handle system notification tap routing
  const routeNotificationTap = (tapData: NotificationTapEvent) => {
    if (!tapData) return;
    const { targetId, category, segment } = tapData;
    const catLower = (category || '').toLowerCase();
    const segLower = (segment || '').toLowerCase();

    if (segLower === 'bookings' || catLower === 'services' || catLower === 'stay' || catLower === 'travel' || catLower === 'booking') {
      handleNavigate('Orders', { segment: 'Bookings', targetId });
    } else if (segLower === 'jobs' || catLower === 'jobs' || catLower === 'job') {
      handleNavigate('Orders', { segment: 'Jobs', targetId });
    } else if (segLower === 'business' || catLower === 'payments') {
      handleNavigate('Payments');
    } else {
      handleNavigate('Orders', { segment: 'Orders', targetId });
    }
  };

  // Listen for system notification clicks & FCM pushes across all states
  useEffect(() => {
    // 1. Native System Tray Notification Tap (Cold Start)
    soundNotificationService.getInitialNotification().then((data) => {
      if (data) {
        routeNotificationTap(data);
      }
    });

    // 2. Native System Tray Notification Tap (Runtime)
    const unsubscribeNativeTap = soundNotificationService.onNotificationTapped((data) => {
      routeNotificationTap(data);
    });

    // 3. FCM Foreground Message Listener
    let unsubscribeFcmForeground: (() => void) | null = null;
    if (messagingModule) {
      try {
        unsubscribeFcmForeground = messagingModule().onMessage(async (remoteMessage: any) => {
          console.log('📥 [App] Foreground FCM Push Message:', remoteMessage);
          if (remoteMessage) {
            const title =
              remoteMessage.notification?.title ||
              remoteMessage.data?.title ||
              'New Transaction';

            const message =
              remoteMessage.notification?.body ||
              remoteMessage.data?.message ||
              remoteMessage.data?.body ||
              'New update received';

            const targetId =
              remoteMessage.data?.targetId ||
              remoteMessage.data?.orderId ||
              remoteMessage.data?.id ||
              '';

            const category =
              remoteMessage.data?.category ||
              remoteMessage.data?.type ||
              'Orders';

            const segment =
              remoteMessage.data?.segment ||
              (category.toLowerCase().includes('job') ? 'Jobs' :
               (category.toLowerCase().includes('service') || category.toLowerCase().includes('stay') || category.toLowerCase().includes('travel') || category.toLowerCase().includes('booking') ? 'Bookings' : 'Orders'));

            // Always trigger native system tray notification + audio alert
            soundNotificationService.showSystemNotification({
              title,
              message,
              targetId,
              category,
              segment,
              playSound: true,
            });

            // Display in-app popup modal / banner
            const resolvedSegment: 'Orders' | 'Bookings' | 'Jobs' =
              segment === 'Bookings' ? 'Bookings' : (segment === 'Jobs' ? 'Jobs' : 'Orders');

            const activityNotif: VendorActivityNotification = {
              id: targetId || `FCM-${Date.now()}`,
              category: resolvedSegment === 'Bookings' ? 'Booking' : (resolvedSegment === 'Jobs' ? 'Job' : 'Order'),
              segment: resolvedSegment,
              title,
              description: message,
              itemName: remoteMessage.data?.itemName || message,
              customerName: remoteMessage.data?.customerName || 'Customer',
              amount: remoteMessage.data?.amount ? String(remoteMessage.data.amount) : undefined,
              status: remoteMessage.data?.status || 'Confirmed',
              dateTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              receivedAt: Date.now(),
              raw: remoteMessage.data,
            };
            setActiveNotification(activityNotif);
            enqueueOrDisplayModalNotification(activityNotif);
          }
        });
      } catch (e) {}

      // 4. FCM Background Tap Listener
      let unsubscribeFcmOpened: (() => void) | null = null;
      try {
        unsubscribeFcmOpened = messagingModule().onNotificationOpenedApp((remoteMessage: any) => {
          console.log('👆 [App] FCM Background Tap:', remoteMessage);
          if (remoteMessage?.data) {
            routeNotificationTap({
              targetId: remoteMessage.data.targetId || remoteMessage.data.orderId || '',
              category: remoteMessage.data.category || 'Orders',
              segment: remoteMessage.data.segment || 'Orders',
            });
          }
        });
      } catch (e) {}

      // 5. FCM Terminated / Cold Start Tap Listener
      try {
        messagingModule().getInitialNotification().then((remoteMessage: any) => {
          if (remoteMessage?.data) {
            console.log('🚀 [App] FCM Terminated Cold-Start Tap:', remoteMessage);
            routeNotificationTap({
              targetId: remoteMessage.data.targetId || remoteMessage.data.orderId || '',
              category: remoteMessage.data.category || 'Orders',
              segment: remoteMessage.data.segment || 'Orders',
            });
          }
        });
      } catch (e) {}
    }

    return () => {
      unsubscribeNativeTap();
      if (unsubscribeFcmForeground) unsubscribeFcmForeground();
    };
  }, [enqueueOrDisplayModalNotification]);

  // Global Real-Time Activity Notification Listener
  useEffect(() => {
    if (isLoggedIn) {
      socketService.connect();

      const unsubscribe = socketService.onNotificationReceived((notif) => {
        console.log('📢 [App.tsx] Received notification:', notif?.id, notif?.category, notif?.title);
        setActiveNotification(notif);
        // Display modal popup when app is in foreground or transitioning
        const curState = AppState.currentState;
        if (curState === 'active' || curState === 'unknown' || !curState) {
          enqueueOrDisplayModalNotification(notif);
        }
      });

      return () => {
        unsubscribe();
        clearModalTimers();
        modalQueueRef.current = [];
      };
    } else {
      socketService.disconnect();
      setActiveNotification(null);
      clearModalTimers();
      modalQueueRef.current = [];
    }
  }, [isLoggedIn, enqueueOrDisplayModalNotification, clearModalTimers]);

  const handleNotificationPress = (notif: VendorActivityNotification) => {
    setActiveNotification(null);
    socketService.markOrderHandled(notif.id);
    handleNavigate('Orders', {
      segment: notif.segment,
      targetId: notif.id,
    });
  };

  useEffect(() => {
    if (isLoggedIn) {
      const vendorId = currentUser?._id || currentUser?.id || 'default';
      // Optimistically restore cached catalog items immediately (< 10ms)
      sessionManager.getVendorCache(vendorId, 'catalog_items').then((cached) => {
        if (Array.isArray(cached) && cached.length > 0) {
          setBusinessItems(cached);
        }
      }).catch(() => {});

      const loadAllData = async () => {
        try {
          const profRes = await fetchProfile();
          if (profRes && profRes.user) {
            setCurrentUser(profRes.user);
            if (profRes.user.membershipPlan) {
              const tier = profRes.user.membershipPlan === 'Gold' ? 'Gold' : profRes.user.membershipPlan === 'Diamond' ? 'Diamond' : 'Silver';
              setPurchasedTier(tier);
            }
          }
          const items = await fetchAllBusinessesProducts();
          if (Array.isArray(items)) {
            setBusinessItems(items);
            sessionManager.saveVendorCache(vendorId, 'catalog_items', items);
          }
        } catch (err) {
          console.warn('Failed to load profile/products:', err);
        }
      };
      loadAllData();
    }
  }, [isLoggedIn]);

  const renderScreens = () => {
    return (
      <View style={tw`flex-1`}>
        {/* Home Screen */}
        {visitedTabs.has('Home') && (
          <View style={[tw`flex-1`, activeTab === 'Home' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Home" onReset={() => setActiveTab('Home')}>
              <HomeScreen
                items={businessItems}
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                isDark={isDark}
                purchasedTier={purchasedTier}
              />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Orders Screen */}
        {visitedTabs.has('Orders') && (
          <View style={[tw`flex-1`, activeTab === 'Orders' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Orders" onReset={() => setActiveTab('Home')}>
              <OrdersScreen
                isDark={isDark}
                routeParams={ordersTabParams}
                clearRouteParams={() => setOrdersTabParams(null)}
              />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Business Screen */}
        {visitedTabs.has('Business') && (
          <View style={[tw`flex-1`, activeTab === 'Business' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Business" onReset={() => setActiveTab('Home')}>
              <BusinessScreen
                items={businessItems}
                currentUser={currentUser}
                setItems={setBusinessItems}
                isDark={isDark}
                routeParams={businessTabParams}
                clearRouteParams={() => setBusinessTabParams(null)}
              />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Payments Screen (Sales & Settlements) */}
        {visitedTabs.has('Payments') && (
          <View style={[tw`flex-1`, activeTab === 'Payments' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Payments" onReset={() => setActiveTab('Home')}>
              <VendorPaymentsScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Analytics Trends Screen */}
        {visitedTabs.has('Analytics') && (
          <View style={[tw`flex-1`, activeTab === 'Analytics' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Analytics" onReset={() => setActiveTab('Home')}>
              <PaymentsScreen isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Profile Screen */}
        {visitedTabs.has('Profile') && (
          <View style={[tw`flex-1`, activeTab === 'Profile' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Profile" onReset={() => setActiveTab('Home')}>
              <ProfileScreen
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                isDark={isDark}
                purchasedTier={purchasedTier}
                setPurchasedTier={setPurchasedTier}
              />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Delivery Partners Screen */}
        {visitedTabs.has('DeliveryPartners') && (
          <View style={[tw`flex-1`, activeTab === 'DeliveryPartners' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="DeliveryPartners" onReset={() => setActiveTab('Home')}>
              <DeliveryPartnersScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Customers Screen */}
        {visitedTabs.has('Customers') && (
          <View style={[tw`flex-1`, activeTab === 'Customers' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Customers" onReset={() => setActiveTab('Home')}>
              <CustomersScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Subscriptions Screen */}
        {visitedTabs.has('Subscriptions') && (
          <View style={[tw`flex-1`, activeTab === 'Subscriptions' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Subscriptions" onReset={() => setActiveTab('Profile')}>
              <SubscriptionScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Vendor Payments / Payouts Screen */}
        {visitedTabs.has('VendorPayments') && (
          <View style={[tw`flex-1`, activeTab === 'VendorPayments' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="VendorPayments" onReset={() => setActiveTab('Profile')}>
              <VendorPaymentsScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Support Queries Screen */}
        {visitedTabs.has('Queries') && (
          <View style={[tw`flex-1`, activeTab === 'Queries' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="Queries" onReset={() => setActiveTab('Profile')}>
              <QueriesScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Notification History Screen */}
        {visitedTabs.has('NotificationHistory') && (
          <View style={[tw`flex-1`, activeTab === 'NotificationHistory' ? tw`flex` : tw`hidden`]}>
            <ScreenErrorBoundary screenName="NotificationHistory" onReset={() => setActiveTab('Home')}>
              <NotificationHistoryScreen onNavigate={handleNavigate} onBack={handleBack} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}
      </View>
    );
  };

  const navItems = [
    {key: 'Home' as Tab, label: 'Home', icon: Home},
    {key: 'Orders' as Tab, label: 'Orders', icon: ClipboardList},
    {key: 'Business' as Tab, label: 'Business', icon: Store},
    {key: 'Payments' as Tab, label: 'Payments', icon: Landmark},
    {key: 'Profile' as Tab, label: 'Profile', icon: User},
  ];

  return (
    <SafeAreaProvider>
      <ScreenErrorBoundary screenName="VendorMobile" isDark={isDark}>
        {showSplash || isInitializing ? (
          <SplashScreen onFinish={() => { if (!isInitializing) setShowSplash(false); }} />
        ) : !isLoggedIn ? (
          <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-white`]}>
            {authScreen === 'login' ? (
              <LoginScreen
                isDark={isDark}
                onLogin={handleLogin}
                onNavigateToSignup={handleNavigateToSignup}
              />
            ) : (
              <SignupScreen
                isDark={isDark}
                onSignup={handleSignup}
                onNavigateToLogin={handleNavigateToLogin}
              />
            )}
          </View>
        ) : (
          <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
            {/* Account Suspension Banner */}
            {isSuspended && (
              <View style={[tw`px-4 py-3 flex-row items-center justify-between border-b`, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <View style={tw`flex-row items-center flex-1 mr-3`}>
                  <View style={[tw`w-8 h-8 rounded-full items-center justify-center mr-2.5`, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={tw`text-red-600 font-black text-sm`}>⚠️</Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-red-900 font-bold text-xs`}>Account Suspended by Administration</Text>
                    <Text style={tw`text-red-700 text-[10px]`}>
                      Store operations are restricted. Contact Support for review.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleNavigate('Queries')}
                  style={[tw`px-3 py-1.5 rounded-lg`, { backgroundColor: '#DC2626' }]}>
                  <Text style={tw`text-white font-bold text-[10px]`}>Support</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Account Pending Review Banner */}
            {isPendingApproval && !isSuspended && (
              <View style={[tw`px-4 py-3 flex-row items-center justify-between border-b`, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                <View style={tw`flex-row items-center flex-1 mr-3`}>
                  <View style={[tw`w-8 h-8 rounded-full items-center justify-center mr-2.5`, { backgroundColor: '#FDE68A' }]}>
                    <Text style={tw`text-amber-800 font-black text-sm`}>⏳</Text>
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-amber-950 font-bold text-xs`}>Application Under Review (Sub Admin / KYC)</Text>
                    <Text style={tw`text-amber-800 text-[10px]`}>
                      Account is awaiting administrative verification. Feature access will unlock upon approval.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleNavigate('Profile')}
                  style={[tw`px-3 py-1.5 rounded-lg`, { backgroundColor: '#D97706' }]}>
                  <Text style={tw`text-white font-bold text-[10px]`}>Status</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Active Screen View */}
            <View style={tw`flex-1`}>
              {renderScreens()}
            </View>

            {/* Bottom Tab Bar */}
            <View
              style={[
                tw`flex-row justify-around pb-5 pt-2.5`,
                isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white border-t border-gray-150`,
                {
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: -4},
                  shadowOpacity: isDark ? 0.2 : 0.05,
                  shadowRadius: 10,
                  elevation: 8,
                },
              ]}>
              {navItems.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      setVisitedTabs(prev => new Set(prev).add(item.key));
                      setActiveTab(item.key);
                    }}
                    activeOpacity={0.7}
                    style={tw`items-center justify-center w-16`}>
                    <View style={tw`p-1`}>
                      <IconComponent
                        size={22}
                        color={isActive ? (isDark ? '#818CF8' : '#4F46E5') : isDark ? '#71717a' : '#9CA3AF'}
                      />
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] font-bold mt-0.5`,
                        isActive ? (isDark ? tw`text-indigo-400` : tw`text-indigo-600`) : isDark ? tw`text-zinc-500` : tw`text-gray-400`,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Global Real-Time Activity Notification Banner (Rendered LAST so it floats above all screens and modals) */}
            {activeNotification && (
              <NotificationBanner
                key={activeNotification.id}
                notification={activeNotification}
                onPress={handleNotificationPress}
                onDismiss={() => setActiveNotification(null)}
                isDark={isDark}
                autoDismissDuration={8000}
              />
            )}

            {/* Interactive Real-Time Activity Modal with Order Accept / Reject Actions & 15s Auto-Dismiss */}
            <NewActivityModal
              notification={modalNotification}
              visible={isActivityModalVisible}
              onAccept={handleAcceptOrder}
              onReject={handleRejectOrder}
              onViewDetails={handleViewOrderDetails}
              onClose={dismissCurrentModal}
              isProcessing={isOrderActionProcessing}
              isDark={isDark}
              queueCount={modalQueueRef.current.length}
            />
          </View>
        )}
      </ScreenErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
