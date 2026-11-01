import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, TouchableOpacity, useColorScheme, PermissionsAndroid, Platform, AppState} from 'react-native';
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

export type CategoryKey = 'Products' | 'Services' | 'Food' | 'Travel' | 'Stay' | 'Jobs' | 'Daily Needs';

export interface BusinessItem {
  id: string;
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
      await logoutVendor();
    } catch (e) {
      console.warn('[App] Logout error:', e);
    }
    setCurrentUser(null);
    setBusinessItems([]);
    setIsLoggedIn(false);
    setActiveNotification(null);
    socketService.disconnect();
    setActiveTab('Home'); // Reset active tab when logging out
  };
  
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['Home']));
  const [businessTabParams, setBusinessTabParams] = useState<any>(null);
  const [ordersTabParams, setOrdersTabParams] = useState<{ segment?: 'Orders' | 'Bookings' | 'Jobs'; targetId?: string } | null>(null);
  const [activeNotification, setActiveNotification] = useState<VendorActivityNotification | null>(null);
  const [modalNotification, setModalNotification] = useState<VendorActivityNotification | null>(null);
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [isOrderActionProcessing, setIsOrderActionProcessing] = useState(false);
  const [modalRemainingSeconds, setModalRemainingSeconds] = useState(15);
  const modalTimerRef = useRef<any>(null);
  const modalIntervalRef = useRef<any>(null);
  const modalQueueRef = useRef<VendorActivityNotification[]>([]);

  const clearModalTimers = useCallback(() => {
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }
    if (modalIntervalRef.current) {
      clearInterval(modalIntervalRef.current);
      modalIntervalRef.current = null;
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
      setModalRemainingSeconds(15);
    }
  }, [clearModalTimers]);

  const displayModalNotification = useCallback((notif: VendorActivityNotification) => {
    if (!notif) return;
    clearModalTimers();
    setModalNotification(notif);
    setIsActivityModalVisible(true);
    setModalRemainingSeconds(15);

    // Exact 15-second auto-dismiss timer
    modalTimerRef.current = setTimeout(() => {
      dismissCurrentModal();
    }, 15000);

    // 1-second countdown interval
    modalIntervalRef.current = setInterval(() => {
      setModalRemainingSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
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

  const handleNavigate = (tab: Tab, params?: any) => {
    if (tab === 'Business') {
      setBusinessTabParams(params || null);
    }
    if (tab === 'Orders') {
      setOrdersTabParams(params || null);
    }
    setVisitedTabs(prev => new Set(prev).add(tab));
    setActiveTab(tab);
  };

  // Request Android 13+ POST_NOTIFICATIONS Permission on Mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          console.log('[App] POST_NOTIFICATIONS status:', granted);
        } catch (err) {
          console.warn('[App] Error requesting POST_NOTIFICATIONS:', err);
        }
      }
    };
    requestNotificationPermission();
  }, []);

  // Handle system notification tap routing
  const routeNotificationTap = (tapData: NotificationTapEvent) => {
    if (!tapData) return;
    const { targetId, category, segment } = tapData;
    const catLower = (category || '').toLowerCase();
    const segLower = (segment || '').toLowerCase();

    if (segLower === 'bookings' || catLower === 'services' || catLower === 'stay' || catLower === 'travel') {
      handleNavigate('Orders', { segment: 'Bookings', targetId });
    } else if (segLower === 'jobs' || catLower === 'jobs') {
      handleNavigate('Orders', { segment: 'Jobs', targetId });
    } else if (segLower === 'business' || catLower === 'payments') {
      handleNavigate('Payments');
    } else {
      handleNavigate('Orders', { segment: 'Orders', targetId });
    }
  };

  // Listen for system notification clicks (cold start & runtime)
  useEffect(() => {
    soundNotificationService.getInitialNotification().then((data) => {
      if (data) {
        routeNotificationTap(data);
      }
    });

    const unsubscribe = soundNotificationService.onNotificationTapped((data) => {
      routeNotificationTap(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Global Real-Time Activity Notification Listener
  useEffect(() => {
    if (isLoggedIn) {
      socketService.connect();

      const unsubscribe = socketService.onNotificationReceived((notif) => {
        console.log('📢 [App.tsx] Received notification:', notif?.id, notif?.category, notif?.title);
        setActiveNotification(notif);
        // Only pop up in-app modal if app is actively in foreground; background displays system tray notification
        if (AppState.currentState === 'active') {
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
              <VendorPaymentsScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Analytics Trends Screen */}
        {activeTab === 'Analytics' && (
          <View style={tw`flex-1`}>
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
        {activeTab === 'DeliveryPartners' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="DeliveryPartners" onReset={() => setActiveTab('Home')}>
              <DeliveryPartnersScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Customers Screen */}
        {activeTab === 'Customers' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="Customers" onReset={() => setActiveTab('Home')}>
              <CustomersScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Subscriptions Screen */}
        {activeTab === 'Subscriptions' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="Subscriptions" onReset={() => setActiveTab('Profile')}>
              <SubscriptionScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Vendor Payments / Payouts Screen */}
        {activeTab === 'VendorPayments' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="VendorPayments" onReset={() => setActiveTab('Profile')}>
              <VendorPaymentsScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Support Queries Screen */}
        {activeTab === 'Queries' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="Queries" onReset={() => setActiveTab('Profile')}>
              <QueriesScreen onNavigate={handleNavigate} isDark={isDark} />
            </ScreenErrorBoundary>
          </View>
        )}

        {/* Notification History Screen */}
        {activeTab === 'NotificationHistory' && (
          <View style={tw`flex-1`}>
            <ScreenErrorBoundary screenName="NotificationHistory" onReset={() => setActiveTab('Home')}>
              <NotificationHistoryScreen onNavigate={handleNavigate} isDark={isDark} />
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
              remainingSeconds={modalRemainingSeconds}
              queueCount={modalQueueRef.current.length}
            />
          </View>
        )}
      </ScreenErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
