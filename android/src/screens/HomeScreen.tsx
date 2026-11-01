import React, { useState, useRef, useEffect } from 'react';
import { fetchAnalytics, getVendorUser, fetchProfile, fetchOrders, fetchBookings, updateOrderStatus, fetchCustomers, CustomerItem, addLocalOrder, normalizeCategory, fetchVendorRatings } from '../services/apiService';
import { sessionManager } from '../services/sessionManager';
import { socketService } from '../services/socketService';
import { soundNotificationService } from '../services/soundNotificationService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Switch,
  Animated,
  Easing,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { BusinessItem, CategoryKey } from '../../../App';
import {
  Search,
  Menu,
  Bell,
  Wallet,
  ShoppingBag,
  CalendarCheck,
  Eye,
  Star,
  Package,
  Scissors,
  UtensilsCrossed,
  Compass,
  Hotel,
  Briefcase,
  PlusCircle,
  MessageSquarePlus,
  Gift,
  QrCode,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Landmark,
  Headphones,
  User,
  X,
  LogOut,
  Award,
  Percent,
  Truck,
  Check,
  Image as LucideImage,
  Heart,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBasket,
  Calendar,
  MapPin,
  Phone,
  Store,
} from 'lucide-react-native';



const baseCategories = [
  { key: 'Products' as CategoryKey, label: 'Products', unit: 'Item', icon: Package, bgColor: '#EEF2FF', iconColor: '#4F46E5' },
  { key: 'Services' as CategoryKey, label: 'Services', unit: 'Service', icon: Scissors, bgColor: '#F0FDF4', iconColor: '#16A34A' },
  { key: 'Food' as CategoryKey, label: 'Food', unit: 'Item', icon: UtensilsCrossed, bgColor: '#FEF2F2', iconColor: '#DC2626' },
  { key: 'Travel' as CategoryKey, label: 'Travel', unit: 'Package', icon: Compass, bgColor: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'Stay' as CategoryKey, label: 'Stay', unit: 'Room', icon: Hotel, bgColor: '#F5F3FF', iconColor: '#7C3AED' },
  { key: 'Jobs' as CategoryKey, label: 'Job', unit: 'Active Job', icon: Briefcase, bgColor: '#FFF7ED', iconColor: '#EA580C' },
  { key: 'Daily Needs' as CategoryKey, label: 'Daily Needs', unit: 'Item', icon: Heart, bgColor: '#FCE7F3', iconColor: '#DB2777' },
];


// Helper to format incoming order for alert popup
const formatOrderForAlert = (order: any, currentUser: any) => {
  const customerName = order.memberName || order.customer_name || order.customerName || order.candidateName || 'Customer';
  const customerPhone = order.customerPhone || order.customer_phone || order.phone || order.candidatePhone || 'N/A';
  const paymentStatus = order.paymentStatus || order.payment_status || 'Paid';
  const category = order.category || order.type || 'Order';
  const deliveryAddress = order.customerAddress || order.deliveryAddress || order.dropLocation || order.pickupLocation || 'Delivery Address Provided with Order';

  let items: any[] = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    items = order.items.map((i: any) => ({
      name: i.name || i.product_name || 'Ordered Item',
      quantity: Number(i.quantity) || 1,
      price: typeof i.price === 'number' ? i.price : (Number(String(i.price || '0').replace(/[^\d]/g, '')) || 0),
      image: i.image || i.imageUrl || i.thumbnail || null,
      detail: i.detail || i.variant || ''
    }));
  } else if (order.product_details) {
    items = [{
      name: order.product_details,
      quantity: 1,
      price: Number(order.finalAmount || order.totalAmount || order.amount || 0),
      image: order.image || null,
      detail: ''
    }];
  } else {
    items = [{
      name: order.name || 'Catalog Item',
      quantity: 1,
      price: Number(order.finalAmount || order.totalAmount || order.amount || 0),
      image: order.image || null,
      detail: ''
    }];
  }

  const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const discountApplied = Number(order.discountApplied || order.discount || 0);
  const deliveryFee = Number(order.deliveryCharge || order.delivery_fee || order.deliveryFee || 0);
  const finalAmount = Number(order.finalAmount || order.totalAmount || order.amount || (subtotal - discountApplied + deliveryFee));

  return {
    ...order,
    _id: (order._id || order.id || '').toString(),
    id: (order.id || order._id || '').toString(),
    order_number: order.order_number || order.orderNumber || order.id || 'ORD',
    category,
    memberName: customerName,
    customerPhone,
    deliveryAddress,
    paymentStatus,
    items,
    subtotal: subtotal > 0 ? subtotal : finalAmount,
    discountApplied,
    deliveryFee,
    finalAmount,
    businessName: order.businessName || currentUser?.businesses?.[0]?.businessName || currentUser?.businessName || currentUser?.name || 'Store'
  };
};

export default function HomeScreen({
  items = [],
  currentUser,
  onNavigate,
  onLogout,
  isDark = false,
  purchasedTier = 'Silver',
  setPurchasedTier = () => { },
}: {
  items?: BusinessItem[];
  currentUser?: any;
  onNavigate?: (tab: any, params?: any) => void;
  onLogout?: () => void;
  isDark?: boolean;
  purchasedTier?: 'Silver' | 'Gold' | 'Diamond';
  setPurchasedTier?: React.Dispatch<React.SetStateAction<'Silver' | 'Gold' | 'Diamond'>>;
}) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const activeUser = currentUser || getVendorUser();

  // Get list of categories user has registered businesses for
  const registeredCategories = (activeUser?.businesses || [])
    .map((b: any) => normalizeCategory(b?.vendorType || b?.category || b?.baseVendorType))
    .filter(Boolean);

  // Dynamically build Quick Actions based on registered businesses
  const dynamicQuickActions = [];

  // Add Product (only if user has 'Products' business)
  if (registeredCategories.includes('Products')) {
    dynamicQuickActions.push({
      label: 'Add Product',
      icon: PlusCircle,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Products', autoOpenModal: 'item' })
    });
  }

  // Add Service (only if user has 'Services' business)
  if (registeredCategories.includes('Services')) {
    dynamicQuickActions.push({
      label: 'Add Service',
      icon: MessageSquarePlus,
      color: '#16A34A',
      bgColor: '#F0FDF4',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Services', autoOpenModal: 'item' })
    });
  }

  // Add Dish (only if user has 'Food' business)
  if (registeredCategories.includes('Food')) {
    dynamicQuickActions.push({
      label: 'Add Dish',
      icon: UtensilsCrossed,
      color: '#DC2626',
      bgColor: '#FEF2F2',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Food', autoOpenModal: 'item' })
    });
  }

  // Add Package (only if user has 'Travel' business)
  if (registeredCategories.includes('Travel')) {
    dynamicQuickActions.push({
      label: 'Add Package',
      icon: Compass,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Travel', autoOpenModal: 'item' })
    });
  }

  // Add Room (only if user has 'Stay' business)
  if (registeredCategories.includes('Stay')) {
    dynamicQuickActions.push({
      label: 'Add Room',
      icon: Hotel,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Stay', autoOpenModal: 'item' })
    });
  }

  // Post Job (only if user has 'Jobs' business)
  if (registeredCategories.includes('Jobs')) {
    dynamicQuickActions.push({
      label: 'Post Job',
      icon: Briefcase,
      color: '#EA580C',
      bgColor: '#FFF7ED',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Jobs', autoOpenModal: 'item' })
    });
  }

  // Add Item (only if user has 'Daily Needs' business)
  if (registeredCategories.includes('Daily Needs')) {
    dynamicQuickActions.push({
      label: 'Add Item',
      icon: Heart,
      color: '#DB2777',
      bgColor: '#FCE7F3',
      onPress: () => onNavigate && onNavigate('Business', { category: 'Daily Needs', autoOpenModal: 'item' })
    });
  }

  // Offer action is always available
  dynamicQuickActions.push({
    label: 'Add Offer',
    icon: Gift,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    onPress: () => Alert.alert('Add Offer', 'Add new coupon or discount deal for your customers.')
  });

  // Scan QR is always available
  dynamicQuickActions.push({
    label: 'Scan QR',
    icon: QrCode,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    onPress: () => Alert.alert('Scan QR', 'Barcode & QR scanner camera interface.')
  });

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentOrdersList, setRecentOrdersList] = useState<any[]>([]);
  const [recentBookingsList, setRecentBookingsList] = useState<any[]>([]);

  const vendorId = (activeUser?._id || activeUser?.id || activeUser?.vendorId || 'default').toString();

  const loadAnalytics = async () => {
    if (!analytics) {
      setLoading(true);
    }
    try {
      const [data, ordersData, bookingsData] = await Promise.all([
        fetchAnalytics(),
        fetchOrders().catch(() => []),
        fetchBookings().catch(() => []),
      ]);
      setAnalytics(data);
      sessionManager.saveVendorCache(vendorId, 'analytics', data);

      if (Array.isArray(ordersData)) {
        // Seed existing order IDs into socketService so startup orders NEVER trigger alerts
        ordersData.forEach((o: any) => {
          const id = (o._id || o.id || o.order_number || '').toString();
          if (id) socketService.markOrderHandled(id);
        });
        const sliceOrders = ordersData.slice(0, 5);
        setRecentOrdersList(sliceOrders);
        sessionManager.saveVendorCache(vendorId, 'recent_orders', sliceOrders);
      }
      if (Array.isArray(bookingsData)) {
        bookingsData.forEach((b: any) => {
          const id = (b._id || b.id || b.order_number || '').toString();
          if (id) socketService.markOrderHandled(id);
        });
        const sliceBookings = bookingsData.slice(0, 5);
        setRecentBookingsList(sliceBookings);
        sessionManager.saveVendorCache(vendorId, 'recent_bookings', sliceBookings);
      }
    } catch (err: any) {
      console.warn("Failed to load analytics:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    // Fast optimistic hydration from encrypted local store (< 10ms)
    Promise.all([
      sessionManager.getVendorCache(vendorId, 'analytics'),
      sessionManager.getVendorCache(vendorId, 'recent_orders'),
      sessionManager.getVendorCache(vendorId, 'recent_bookings'),
      sessionManager.getVendorCache(vendorId, 'ratings'),
    ]).then(([cAnalytics, cOrders, cBookings, cRatings]) => {
      if (!isMounted) return;
      if (cAnalytics) setAnalytics(cAnalytics);
      if (Array.isArray(cOrders) && cOrders.length > 0) setRecentOrdersList(cOrders);
      if (Array.isArray(cBookings) && cBookings.length > 0) setRecentBookingsList(cBookings);
      if (cRatings) setRatingsData(cRatings);
    }).catch(() => {});

    loadAnalytics();
    loadVendorRatings();

    return () => {
      isMounted = false;
    };
  }, [vendorId]);

  // Customer Ratings & Reviews States
  const [isReviewsVisible, setIsReviewsVisible] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [ratingsData, setRatingsData] = useState<{
    averageRating: number;
    totalRatings: number;
    breakdown: Record<string, number>;
    reviews: Array<{
      id: string;
      orderId?: string;
      customerName: string;
      rating: number;
      comment: string;
      createdAt: string;
    }>;
  }>({
    averageRating: 0,
    totalRatings: 0,
    breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    reviews: [],
  });

  const loadVendorRatings = async () => {
    if (!ratingsData.totalRatings) {
      setLoadingRatings(true);
    }
    try {
      const res = await fetchVendorRatings();
      if (res && res.success) {
        const rData = {
          averageRating: res.averageRating || 0,
          totalRatings: res.totalRatings || 0,
          breakdown: res.breakdown || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
          reviews: res.reviews || [],
        };
        setRatingsData(rData);
        sessionManager.saveVendorCache(vendorId, 'ratings', rData);
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to load ratings:', err);
    } finally {
      setLoadingRatings(false);
    }
  };

  const totalOrders = analytics?.ordersCount ?? analytics?.totalOrdersCount ?? (Array.isArray(recentOrdersList) ? recentOrdersList.length : 0);
  const totalRevenue = analytics?.totalRevenue ?? 0;
  const totalProducts = analytics?.itemsCount ?? analytics?.totalItemsCount ?? (Array.isArray(items) ? items.length : 0);
  const activeMemberships = analytics?.activeMembershipsCount ?? analytics?.customersCount ?? 0;

  const statsData = [
    {
      label: 'Orders',
      value: String(totalOrders),
      change: totalOrders > 0 ? `${totalOrders} Total` : '',
      icon: ShoppingBag,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      onPress: () => onNavigate && onNavigate('Orders', { segment: 'Orders' }),
    },
    {
      label: 'Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      change: totalRevenue > 0 ? 'Verified' : '',
      icon: Wallet,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      onPress: () => onNavigate && onNavigate('VendorPayments'),
    },
    {
      label: 'Products',
      value: String(totalProducts),
      change: totalProducts > 0 ? `${totalProducts} Items` : '',
      icon: Package,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      onPress: () => onNavigate && onNavigate('Business'),
    },
    {
      label: 'Customer Rating',
      value: ratingsData.totalRatings > 0 ? `${ratingsData.averageRating.toFixed(1)} ★` : '5.0 ★',
      change: ratingsData.totalRatings > 0 ? `${ratingsData.totalRatings} Reviews` : 'Verified Feedback',
      icon: Star,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      isStar: true,
      onPress: () => {
        setIsReviewsVisible(true);
        loadVendorRatings();
      },
    },
  ];

  // Drawer States
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const slideAnim = useRef(new Animated.Value(-screenWidth)).current;

  const [isCustomersVisible, setIsCustomersVisible] = useState(false);
  const [customersList, setCustomersList] = useState<CustomerItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersSearchQuery, setCustomersSearchQuery] = useState('');

  const loadCustomersData = async () => {
    setLoadingCustomers(true);
    try {
      const data = await fetchCustomers();
      setCustomersList(data || []);
    } catch (err) {
      console.warn("Failed to load customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenCustomers = () => {
    setIsCustomersVisible(true);
    if (!customersList || customersList.length === 0) {
      loadCustomersData();
    }
  };

  // Notification States
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const hasUnread = notifications.some(n => !n.isRead);

  // Incoming Order / Booking Popup Modal State
  const [incomingOrderModalVisible, setIncomingOrderModalVisible] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const [orderAlertQueue, setOrderAlertQueue] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number>(30);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const incomingOrderRef = useRef<any>(null);
  const orderQueueRef = useRef<any[]>([]);

  useEffect(() => {
    incomingOrderRef.current = incomingOrder;
  }, [incomingOrder]);

  useEffect(() => {
    orderQueueRef.current = orderAlertQueue;
  }, [orderAlertQueue]);

  // Cleanly dismiss or advance to next queued order
  const handleDismissCurrentOrder = () => {
    const current = incomingOrderRef.current || incomingOrder;
    if (current) {
      socketService.markOrderHandled((current._id || current.id || '').toString());
    }
    soundNotificationService.stopNewOrderSound();

    const queue = orderQueueRef.current;
    if (queue && queue.length > 0) {
      const next = queue[0];
      setOrderAlertQueue(queue.slice(1));
      setIncomingOrder(next);
      setIncomingOrderModalVisible(true);
      soundNotificationService.playNewOrderSound();
    } else {
      setIncomingOrderModalVisible(false);
      setIncomingOrder(null);
    }
  };

  const handleCloseOrder = handleDismissCurrentOrder;

  // UI countdown timer: dismisses popup when reaches 0 without rejecting or accepting
  useEffect(() => {
    let timer: any;
    let interval: any;

    if (incomingOrderModalVisible) {
      setCountdown(30);
      progressAnim.setValue(1);

      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();

      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timer = setTimeout(() => {
        handleDismissCurrentOrder();
      }, 30000);
    } else {
      progressAnim.setValue(1);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [incomingOrderModalVisible, incomingOrder?._id]);

  // Real-Time Socket.IO Listener for genuinely new incoming orders
  useEffect(() => {
    socketService.connect();

    const unsubscribeNewOrder = socketService.onNewOrder((newOrderData: any) => {
      const formatted = formatOrderForAlert(newOrderData, activeUser);
      if (!incomingOrderRef.current) {
        setIncomingOrder(formatted);
        setIncomingOrderModalVisible(true);
      } else {
        setOrderAlertQueue(prev => [...prev, formatted]);
      }
      loadAnalytics();
    });

    const unsubscribeNewBooking = socketService.onNewBooking(() => {
      loadAnalytics();
    });

    const unsubscribeStatusChanged = socketService.onOrderStatusChanged((event: any) => {
      const changedId = (event.entityId || event.data?._id || event.data?.id || '').toString();
      const current = incomingOrderRef.current;
      if (current && (current._id?.toString() === changedId || current.id?.toString() === changedId)) {
        // Order handled on another client (e.g. Website) - dismiss alert
        handleDismissCurrentOrder();
      }
      setOrderAlertQueue(prev => prev.filter(o => o._id?.toString() !== changedId && o.id?.toString() !== changedId));
      loadAnalytics();
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeNewBooking();
      unsubscribeStatusChanged();
    };
  }, [activeUser]);

  // Handle Accept Order
  const handleAcceptOrder = async () => {
    const current = incomingOrderRef.current || incomingOrder;
    if (!current || isSubmittingAction) return;

    const targetId = (current._id || current.id || '').toString();
    if (!targetId) return;

    setIsSubmittingAction(true);
    try {
      const res = await updateOrderStatus(targetId, 'Accepted');
      if (res.success || res.status === 'success' || res.data) {
        socketService.markOrderHandled(targetId);
        soundNotificationService.stopNewOrderSound();
        Alert.alert('Order Accepted', `Order ${current.order_number || ''} accepted successfully!`);

        // Advance to next queued order if any
        const queue = orderQueueRef.current;
        if (queue && queue.length > 0) {
          const next = queue[0];
          setOrderAlertQueue(queue.slice(1));
          setIncomingOrder(next);
          soundNotificationService.playNewOrderSound();
        } else {
          setIncomingOrderModalVisible(false);
          setIncomingOrder(null);
        }
        loadAnalytics();
      } else {
        Alert.alert('Notice', res.message || 'Order could not be accepted.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update order status.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Reject Order
  const handleRejectOrder = async () => {
    const current = incomingOrderRef.current || incomingOrder;
    if (!current || isSubmittingAction) return;

    const targetId = (current._id || current.id || '').toString();
    if (!targetId) return;

    setIsSubmittingAction(true);
    try {
      const res = await updateOrderStatus(targetId, 'Rejected');
      if (res.success || res.status === 'success' || res.data) {
        socketService.markOrderHandled(targetId);
        soundNotificationService.stopNewOrderSound();
        Alert.alert('Order Rejected', `Order ${current.order_number || ''} has been rejected.`);

        // Advance to next queued order if any
        const queue = orderQueueRef.current;
        if (queue && queue.length > 0) {
          const next = queue[0];
          setOrderAlertQueue(queue.slice(1));
          setIncomingOrder(next);
          soundNotificationService.playNewOrderSound();
        } else {
          setIncomingOrderModalVisible(false);
          setIncomingOrder(null);
        }
        loadAnalytics();
      } else {
        Alert.alert('Notice', res.message || 'Order could not be rejected.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject order.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Drawer Animations
  const openDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsDrawerVisible(false));
  };

  const handleMenuPress = (tab: any, params?: any) => {
    closeDrawer();
    if (onNavigate) {
      onNavigate(tab, params);
    }
  };

  const handleLogoutPress = () => {
    closeDrawer();
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your store account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  // Notification Handlers
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  const activeCategories = baseCategories
    .map(cat => {
      const count = safeItems.filter(item => item && item.category === cat.key).length;
      const hasBusiness = activeUser?.businesses && Array.isArray(activeUser.businesses) && activeUser.businesses.length > 0
        ? activeUser.businesses.some((biz: any) => {
            const normType = normalizeCategory(biz?.vendorType);
            const normCat = normalizeCategory(biz?.category);
            const normBase = normalizeCategory(biz?.baseVendorType);
            return normType === cat.key || normCat === cat.key || normBase === cat.key;
          })
        : (activeUser?.vendorType || activeUser?.category)
            ? normalizeCategory(activeUser?.vendorType || activeUser?.category) === cat.key
            : false;
      return {
        ...cat,
        count: `${count} ${cat.unit}${count !== 1 ? 's' : ''}`,
        rawCount: count,
        hasBusiness: !!hasBusiness,
      };
    })
    .filter(cat => cat.hasBusiness);

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#18181b' : '#F9FAFB'} />

      {/* Header */}
      <View
        style={[
          isDark ? tw`bg-zinc-900 border-b border-zinc-800` : tw`bg-white`,
          tw`flex-row items-center justify-between px-5 pb-3`,
          { paddingTop: insets.top + 12 },
        ]}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => setIsDrawerVisible(true)}
            activeOpacity={0.7}
            style={tw`mr-3 p-1`}>
            <Menu size={24} color={isDark ? '#F4F4F5' : '#1F2937'} />
          </TouchableOpacity>
          <View style={tw`flex-row items-center`}>
            <Image
              source={require('../assets/logo.png')}
              style={tw`w-9 h-9 rounded-full mr-2.5`}
              resizeMode="cover"
            />
            <Text style={[tw`text-2xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Connect <Text style={{ color: '#F59E0B' }}>App</Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setIsNotificationsVisible(true)}
          activeOpacity={0.7}
          style={tw`relative p-2`}>
          <Bell size={24} color={isDark ? '#F4F4F5' : '#1F2937'} />
          {hasUnread && (
            <View
              style={tw`absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white`}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-6`}>
        {/* Revenue Card */}
        <View style={tw`mx-5 mt-4`}>
          <View
            style={[
              tw`rounded-2xl p-5 overflow-hidden`,
              {
                backgroundColor: '#4F46E5',
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 12,
              },
            ]}>
            {/* Decorative circles */}
            <View
              style={[
                tw`absolute -top-6 -right-6 w-28 h-28 rounded-full`,
                { backgroundColor: 'rgba(255,255,255,0.08)' },
              ]}
            />
            <View
              style={[
                tw`absolute -bottom-10 -left-10 w-32 h-32 rounded-full`,
                { backgroundColor: 'rgba(255,255,255,0.05)' },
              ]}
            />

            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-medium mb-1`, { color: 'rgba(255,255,255,0.8)' }]}>
                  Total Revenue
                </Text>
                <Text style={tw`text-white text-3xl font-bold tracking-tight`}>
                  ₹{(analytics?.totalRevenue ?? 0).toLocaleString()}
                </Text>
                <View style={tw`flex-row items-center mt-2`}>
                  <TrendingUp size={14} color="#86EFAC" />
                  <Text style={tw`text-green-300 text-sm font-semibold ml-1`}>
                    {analytics?.totalOrdersCount ?? 0} Orders
                  </Text>
                  <Text style={[tw`text-sm ml-1`, { color: 'rgba(255,255,255,0.7)' }]}>
                    Recorded
                  </Text>
                </View>
              </View>
              <View
                style={[
                  tw`w-14 h-14 rounded-2xl items-center justify-center`,
                  { backgroundColor: 'rgba(255,255,255,0.15)' },
                ]}>
                <Wallet size={28} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards Grid */}
        <View style={tw`flex-row flex-wrap justify-between mx-5 mt-5`}>
          {statsData.map(stat => {
            const IconComp = stat.icon;
            return (
              <TouchableOpacity
                key={stat.label}
                onPress={stat.onPress}
                activeOpacity={0.7}
                style={[
                  tw`rounded-2xl p-4 mb-3.5`,
                  {
                    width: '48.5%',
                    backgroundColor: isDark ? '#18181b' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDark ? '#27272a' : '#F3F4F6',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.2 : 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}>
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <View
                    style={[
                      tw`w-10 h-10 rounded-xl items-center justify-center`,
                      { backgroundColor: isDark ? '#27272a' : stat.bgColor },
                    ]}>
                    <IconComp size={20} color={stat.color} />
                  </View>
                  {stat.change ? (
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full border`,
                        stat.change === 'Active'
                          ? isDark
                            ? tw`bg-amber-950/40 border-amber-800/50`
                            : tw`bg-amber-50 border-amber-200`
                          : isDark
                            ? tw`bg-emerald-950/40 border-emerald-800/50`
                            : tw`bg-emerald-50 border-emerald-200`,
                      ]}>
                      <Text
                        style={[
                          tw`text-[10px] font-bold`,
                          stat.change === 'Active'
                            ? tw`text-amber-600`
                            : tw`text-emerald-600`,
                        ]}>
                        {stat.change}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    tw`text-xs font-medium mb-1`,
                    isDark ? tw`text-zinc-400` : tw`text-gray-500`,
                  ]}
                  numberOfLines={1}>
                  {stat.label}
                </Text>

                <View style={tw`flex-row items-center`}>
                  <Text
                    style={[
                      tw`text-2xl font-bold tracking-tight`,
                      isDark ? tw`text-white` : tw`text-gray-900`,
                    ]}
                    numberOfLines={1}>
                    {stat.value}
                  </Text>
                  {stat.isStar && (
                    <Star
                      size={16}
                      color="#F59E0B"
                      fill="#F59E0B"
                      style={tw`ml-1.5`}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* My Businesses */}
        <View style={tw`mt-6 mx-5`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              My Businesses
            </Text>
            <TouchableOpacity
              onPress={() => onNavigate && onNavigate('Business')}
              activeOpacity={0.7}
              style={tw`flex-row items-center`}>
              <Text style={tw`text-indigo-600 font-semibold text-sm`}>
                View All
              </Text>
              <ChevronRight size={16} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row flex-wrap justify-between`}>
            {activeCategories.length > 0 ? (
              activeCategories.map(biz => {
                const IconComp = biz.icon;
                const cardWidth = activeCategories.length === 2 ? '48.5%' : activeCategories.length === 1 ? '100%' : '31.3%';
                return (
                  <TouchableOpacity
                    key={biz.label}
                    onPress={() => onNavigate && onNavigate('Business', { category: biz.key })}
                    activeOpacity={0.7}
                    style={[
                      tw`rounded-2xl p-4 mb-3`,
                      {
                        width: cardWidth,
                        backgroundColor: isDark ? '#1C1917' : biz.bgColor,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? '#292524' : 'transparent',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 4,
                        elevation: 1,
                      },
                    ]}>
                    <IconComp size={26} color={biz.iconColor} />
                    <Text
                      style={[tw`font-bold text-sm mt-2.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {biz.label}
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>
                      {biz.count}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View
                style={[
                  tw`w-full rounded-2xl p-6 items-center justify-center border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <Store size={36} color={isDark ? '#71717a' : '#9CA3AF'} style={tw`mb-2`} />
                <Text style={[tw`text-sm font-bold text-center mb-1`, isDark ? tw`text-zinc-300` : tw`text-gray-800`]}>
                  No Registered Businesses
                </Text>
                <Text style={[tw`text-xs text-center mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>
                  You haven't added any businesses yet. Register a business to start receiving orders and bookings.
                </Text>
                <TouchableOpacity
                  onPress={() => onNavigate && onNavigate('Business', { autoOpenModal: 'business' })}
                  activeOpacity={0.8}
                  style={tw`bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center`}>
                  <PlusCircle size={16} color="#FFFFFF" style={tw`mr-1.5`} />
                  <Text style={tw`text-white font-bold text-xs`}>Add Business</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={tw`mt-4 mx-5`}>
          <Text style={[tw`text-lg font-bold mb-4`, isDark ? tw`text-white` : tw`text-gray-900`]}>
            Quick Actions
          </Text>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row gap-4 px-1 pb-1`}>
            {dynamicQuickActions.map(action => {
              const IconComp = action.icon;
              return (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  style={[tw`items-center mr-3`, { width: 70 }]}>
                  <View
                    style={[
                      tw`w-14 h-14 rounded-2xl items-center justify-center mb-2`,
                      { backgroundColor: isDark ? '#27272a' : action.bgColor },
                    ]}>
                    <IconComp size={26} color={action.color} />
                  </View>
                  <Text
                    style={[tw`text-[10px] font-semibold text-center`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}
                    numberOfLines={1}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Top Selling Products */}
        <View style={tw`mt-6 mx-5`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Top Selling Products
            </Text>
            <View style={[tw`flex-row items-center px-2 py-0.5 rounded-full`, { backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF' }]}>
              <TrendingUp size={12} color="#4F46E5" />
              <Text style={[tw`text-[10px] font-bold ml-1`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>TRENDING</Text>
            </View>
          </View>

          <View style={[
            tw`rounded-2xl p-4`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }
          ]}>
            {items.length === 0 ? (
              <View style={tw`py-6 items-center justify-center`}>
                <Package size={32} color={isDark ? '#52525b' : '#9CA3AF'} style={tw`mb-2`} />
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  No products added yet
                </Text>
              </View>
            ) : (
              items.slice(0, 3).map((prod: any, index: number, arr: any[]) => (
                <View
                  key={prod.id || prod._id || index}
                  style={[
                    tw`flex-row items-center py-3`,
                    index < arr.length - 1 ? [tw`border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-50`] : {},
                  ]}>
                  {prod.image ? (
                    <Image source={{ uri: prod.image }} style={tw`w-12 h-12 rounded-xl mr-3 bg-gray-100`} />
                  ) : (
                    <View style={[tw`w-12 h-12 rounded-xl mr-3 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <Package size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </View>
                  )}
                  <View style={tw`flex-1`}>
                    <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-indigo-400` : tw`text-indigo-650`]}>
                        {prod.category || 'Product'}
                      </Text>
                      {prod.stock !== undefined ? (
                        <>
                          <View style={[tw`w-1 h-1 rounded-full mx-2`, isDark ? tw`bg-zinc-700` : tw`bg-gray-300`]} />
                          <Text style={[tw`text-xs font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>
                            Stock: {prod.stock}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[tw`font-black text-sm ml-2`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                    {prod.price ? (typeof prod.price === 'number' ? `₹${prod.price}` : String(prod.price).startsWith('₹') ? prod.price : `₹${prod.price}`) : '₹0'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Recent Orders */}
        <View style={tw`mt-6 mx-5`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Recent Orders
            </Text>
            <TouchableOpacity onPress={() => onNavigate && onNavigate('Orders', { segment: 'Orders' })} style={tw`flex-row items-center`}>
              <Text style={tw`text-indigo-600 font-semibold text-sm`}>
                View All
              </Text>
              <ChevronRight size={16} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View style={[
            tw`rounded-2xl p-4`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }
          ]}>
            {recentOrdersList.length === 0 ? (
              <View style={tw`py-6 items-center justify-center`}>
                <ShoppingBasket size={32} color={isDark ? '#52525b' : '#9CA3AF'} style={tw`mb-2`} />
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  No orders received yet
                </Text>
              </View>
            ) : (
              recentOrdersList.map((ord: any, index: number, arr: any[]) => {
                const ordName = ord.items?.[0]?.name || ord.product_details || ord.name || `Order #${(ord.order_number || ord._id || '').slice(-6)}`;
                const ordCust = ord.customer_name || ord.memberName || 'Customer';
                const ordTime = ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today';
                const ordAmount = `₹${ord.finalAmount || ord.amount || 0}`;
                const ordStatus = ord.status || 'Pending';
                const statusBg = ordStatus === 'Delivered' || ordStatus === 'Confirmed'
                  ? (isDark ? '#064e3b' : '#F0FDF4')
                  : (isDark ? '#451a03' : '#FFF7ED');
                const statusColor = ordStatus === 'Delivered' || ordStatus === 'Confirmed' ? '#16A34A' : '#D97706';

                return (
                  <View
                    key={ord._id || ord.id || index}
                    style={[
                      tw`flex-row items-center justify-between py-3`,
                      index < arr.length - 1 ? [tw`border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-50`] : {},
                    ]}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF' }]}>
                        <ShoppingBasket size={18} color="#4F46E5" />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                          {ordName}
                        </Text>
                        <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                          To: {ordCust} • {ordTime}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`items-end ml-2`}>
                      <Text style={[tw`font-black text-sm mb-1`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {ordAmount}
                      </Text>
                      <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: statusBg }]}>
                        <Text style={[tw`text-[9px] font-bold`, { color: statusColor }]}>{ordStatus}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={tw`mt-6 mx-5`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Recent Bookings
            </Text>
            <TouchableOpacity onPress={() => onNavigate && onNavigate('Orders', { segment: 'Bookings' })} style={tw`flex-row items-center`}>
              <Text style={tw`text-indigo-600 font-semibold text-sm`}>
                View All
              </Text>
              <ChevronRight size={16} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View style={[
            tw`rounded-2xl p-4`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }
          ]}>
            {recentBookingsList.length === 0 ? (
              <View style={tw`py-6 items-center justify-center`}>
                <Calendar size={32} color={isDark ? '#52525b' : '#9CA3AF'} style={tw`mb-2`} />
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  No bookings received yet
                </Text>
              </View>
            ) : (
              recentBookingsList.map((bkg: any, index: number, arr: any[]) => {
                const bkgService = bkg.serviceName || bkg.product_details || bkg.items?.[0]?.name || 'Service Booking';
                const bkgCust = bkg.customer_name || bkg.memberName || 'Customer';
                const bkgTime = bkg.appointment_slot || (bkg.createdAt ? new Date(bkg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today');
                const bkgAmount = `₹${bkg.finalAmount || bkg.amount || 0}`;
                const bkgStatus = bkg.status || 'Pending';
                const statusBg = bkgStatus === 'Confirmed' || bkgStatus === 'Completed'
                  ? (isDark ? '#064e3b' : '#F0FDF4')
                  : (isDark ? '#451a03' : '#FFFBEB');
                const statusColor = bkgStatus === 'Confirmed' || bkgStatus === 'Completed' ? '#16A34A' : '#D97706';

                return (
                  <View
                    key={bkg._id || bkg.id || index}
                    style={[
                      tw`flex-row items-center justify-between py-3`,
                      index < arr.length - 1 ? [tw`border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-50`] : {},
                    ]}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: isDark ? '#2e1065' : '#F5F3FF' }]}>
                        <Calendar size={18} color="#7C3AED" />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                          {bkgService}
                        </Text>
                        <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                          By: {bkgCust} • {bkgTime}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`items-end ml-2`}>
                      <Text style={[tw`font-black text-sm mb-1`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {bkgAmount}
                      </Text>
                      <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: statusBg }]}>
                        <Text style={[tw`text-[9px] font-bold`, { color: statusColor }]}>{bkgStatus}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Drawer Modal */}
      <Modal
        transparent={true}
        visible={isDrawerVisible}
        onRequestClose={closeDrawer}
        onShow={openDrawer}
        animationType="none">
        <View style={tw`flex-1 flex-row`}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={[tw`absolute inset-0`, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
          </TouchableWithoutFeedback>

          {/* Drawer Content */}
          <Animated.View
            style={[
              tw`h-full pb-6`,
              isDark ? tw`bg-zinc-900` : tw`bg-white`,
              {
                width: screenWidth * 0.78,
                transform: [{ translateX: slideAnim }],
                shadowColor: '#000',
                shadowOffset: { width: 4, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 16,
              },
            ]}>
            {/* Header / Profile section */}
            <View
              style={[
                tw`bg-indigo-600 px-5 pb-6 justify-between`,
                { paddingTop: insets.top + 16 },
              ]}>
              <View style={tw`flex-row justify-between items-start mb-4`}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' }}
                  style={tw`w-14 h-14 rounded-full bg-gray-200`}
                />
                <TouchableOpacity
                  onPress={closeDrawer}
                  style={tw`p-1 rounded-full bg-indigo-700`}>
                  <X size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-white text-lg font-bold mr-2`}>
                    {activeUser?.name || 'Vendor'}
                  </Text>
                  <View style={[tw`px-2 py-0.5 rounded-full flex-row items-center`, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Sparkles size={9} color="#FFFFFF" />
                    <Text style={tw`text-white text-[9px] font-bold ml-0.5`}>Pro</Text>
                  </View>
                </View>
                <Text style={tw`text-indigo-200 text-xs mt-0.5`}>
                  {activeUser?.businessName ? `${activeUser.businessName} • Vendor` : 'Vendor'}
                </Text>
              </View>
            </View>

            {/* Store Status Toggle */}
            <View style={tw`flex-row items-center justify-between px-5 py-4 border-b border-gray-100 bg-indigo-50/40`}>
              <View style={tw`flex-row items-center`}>
                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: storeOpen ? '#16A34A' : '#DC2626' }]} />
                <Text style={tw`text-gray-700 text-sm font-semibold`}>
                  {storeOpen ? 'Store is Open' : 'Store is Closed'}
                </Text>
              </View>
              <Switch
                value={storeOpen}
                onValueChange={setStoreOpen}
                trackColor={{ false: '#D1D5DB', true: '#C7D2FE' }}
                thumbColor={storeOpen ? '#4F46E5' : '#9CA3AF'}
              />
            </View>

            {/* Menu Items */}
            <ScrollView style={tw`flex-1 pt-2`} showsVerticalScrollIndicator={false}>
              {/* Overview */}
              <TouchableOpacity
                onPress={() => handleMenuPress('Home')}
                activeOpacity={0.7}
                style={[tw`flex-row items-center px-5 py-3 bg-indigo-50 mr-4 rounded-r-xl`]}>
                <View style={tw`mr-3.5`}>
                  <QrCode size={18} color="#4F46E5" />
                </View>
                <Text style={tw`text-indigo-600 font-bold text-sm flex-1`}>
                  Overview
                </Text>
              </TouchableOpacity>

              {/* MY CATEGORIES Header */}
              <Text style={tw`text-gray-400 font-bold text-[10px] uppercase tracking-wider px-5 mt-5 mb-2`}>
                My Categories
              </Text>

              {activeCategories.map(item => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleMenuPress('Business', { category: item.key })}
                    activeOpacity={0.7}
                    style={tw`flex-row items-center px-5 py-2.5`}>
                    <View style={tw`mr-3.5`}>
                      <Icon size={18} color="#4B5563" />
                    </View>
                    <Text style={tw`text-gray-700 font-semibold text-sm flex-1`}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* DASHBOARD MENU Header */}
              <Text style={tw`text-gray-400 font-bold text-[10px] uppercase tracking-wider px-5 mt-5 mb-2`}>
                Dashboard Menu
              </Text>

              {[
                { label: 'Subscriptions', icon: Sparkles, action: () => handleMenuPress('Subscriptions') },
                { label: 'Payouts & Settlements', icon: Landmark, action: () => handleMenuPress('VendorPayments') },
                { label: 'Queries & Support', icon: Headphones, action: () => handleMenuPress('Queries') },
                { label: 'Customers', icon: User, action: () => handleMenuPress('Customers') },
                { label: 'Delivery Partners', icon: Truck, action: () => handleMenuPress('DeliveryPartners') },
                { label: 'Analytics', icon: TrendingUp, action: () => handleMenuPress('Payments') },
                { label: 'Offers & Coupons', icon: Gift, action: () => { closeDrawer(); Alert.alert('Offers & Coupons', 'Create and manage promotional discounts and coupon codes.'); } },
                { label: 'Reviews & Ratings', icon: Star, action: () => { closeDrawer(); setIsReviewsVisible(true); loadVendorRatings(); } },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.action}
                    activeOpacity={0.7}
                    style={tw`flex-row items-center px-5 py-2.5`}>
                    <View style={tw`mr-3.5`}>
                      <Icon size={18} color="#4B5563" />
                    </View>
                    <Text style={tw`text-gray-700 font-semibold text-sm flex-1`}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Logout Footer */}
            <TouchableOpacity
              onPress={handleLogoutPress}
              activeOpacity={0.7}
              style={tw`flex-row items-center px-5 py-4 border-t border-gray-100`}>
              <LogOut size={20} color="#DC2626" />
              <Text style={tw`text-red-600 font-bold text-sm ml-3.5`}>
                Log Out Account
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Notifications Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isNotificationsVisible}
        onRequestClose={() => setIsNotificationsVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          {/* Backdrop click to close */}
          <TouchableWithoutFeedback onPress={() => setIsNotificationsVisible(false)}>
            <View style={tw`absolute inset-0`} />
          </TouchableWithoutFeedback>

          {/* Bottom Sheet Container */}
          <View
            style={[
              tw`rounded-t-3xl pb-6`,
              isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white`,
              {
                maxHeight: '80%',
                minHeight: '40%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 16,
              },
            ]}>
            {/* Header Drag Handle / Decorator */}
            <View style={tw`items-center py-2.5`}>
              <View style={[tw`w-12 h-1.5 rounded-full`, isDark ? tw`bg-zinc-700` : tw`bg-gray-200`]} />
            </View>

            {/* Header Title Row */}
            <View style={[tw`flex-row items-center justify-between px-5 pb-3 border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
              <View style={tw`flex-row items-center`}>
                <Text style={[tw`text-xl font-bold mr-2`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                  Notifications
                </Text>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <View style={tw`bg-indigo-100 px-2 py-0.5 rounded-full`}>
                    <Text style={tw`text-indigo-600 text-xs font-bold`}>
                      {notifications.filter(n => !n.isRead).length} new
                    </Text>
                  </View>
                )}
              </View>

              <View style={tw`flex-row items-center`}>
                {hasUnread && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    activeOpacity={0.7}
                    style={tw`mr-3`}>
                    <Text style={tw`text-indigo-600 text-xs font-bold`}>
                      Mark all as read
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsNotificationsVisible(false)}
                  style={tw`p-1.5 bg-gray-100 rounded-full`}>
                  <X size={16} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable list of notifications */}
            <ScrollView
              contentContainerStyle={tw`px-5 py-2`}
              showsVerticalScrollIndicator={false}>
              {notifications.filter(n => !n.isRead).length === 0 ? (
                <View style={tw`py-12 items-center justify-center`}>
                  <Bell size={48} color="#9CA3AF" style={tw`mb-3`} />
                  <Text style={tw`text-gray-500 font-semibold text-base`}>
                    No notifications yet
                  </Text>
                  <Text style={tw`text-gray-400 text-xs mt-1`}>
                    We will notify you when something important happens!
                  </Text>
                </View>
              ) : (
                notifications.filter(n => !n.isRead).map(item => {
                  // Icon mapping based on notification type
                  let IconComponent = Bell;
                  let iconBg = '#F3F4F6';
                  let iconColor = '#4B5563';

                  if (item.type === 'order') {
                    IconComponent = ShoppingBag;
                    iconBg = '#FEF3C7';
                    iconColor = '#D97706';
                  } else if (item.type === 'stock') {
                    IconComponent = Package;
                    iconBg = '#FEE2E2';
                    iconColor = '#DC2626';
                  } else if (item.type === 'payment') {
                    IconComponent = Wallet;
                    iconBg = '#D1FAE5';
                    iconColor = '#059669';
                  } else if (item.type === 'review') {
                    IconComponent = Star;
                    iconBg = '#E0E7FF';
                    iconColor = '#4F46E5';
                  }

                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggleRead(item.id)}
                      activeOpacity={0.7}
                      style={[
                        tw`flex-row items-start p-3.5 my-1.5 rounded-xl border`,
                        item.isRead
                          ? isDark ? tw`bg-zinc-800/60 border-zinc-700/50` : tw`bg-white border-gray-100`
                          : isDark ? tw`bg-indigo-950/40 border-indigo-900/60` : tw`bg-indigo-50/20 border-indigo-100`,
                      ]}>
                      {/* Left icon circle */}
                      <View
                        style={[
                          tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                          { backgroundColor: iconBg },
                        ]}>
                        <IconComponent size={20} color={iconColor} />
                      </View>

                      {/* Content block */}
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row justify-between items-start`}>
                          <Text
                            style={[
                              tw`text-sm flex-1 mr-2`,
                              item.isRead
                                ? isDark ? tw`font-semibold text-zinc-300` : tw`font-semibold text-gray-800`
                                : isDark ? tw`font-bold text-white` : tw`font-bold text-gray-900`,
                            ]}>
                            {item.title}
                          </Text>
                          {!item.isRead && (
                            <View style={tw`w-2 h-2 bg-indigo-600 rounded-full mt-1.5`} />
                          )}
                        </View>
                        <Text style={tw`text-gray-500 text-xs mt-1 leading-4`}>
                          {item.body}
                        </Text>
                        <Text style={tw`text-gray-400 text-[10px] mt-2`}>
                          {item.time}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

            {/* Customer Ratings & Reviews Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isReviewsVisible}
        onRequestClose={() => setIsReviewsVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]`, isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white`]}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <View>
                <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Customer Reviews</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  {ratingsData.totalRatings > 0 ? `${ratingsData.totalRatings} verified customer ratings` : 'Verified order reviews'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsReviewsVisible(false)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {loadingRatings ? (
              <View style={tw`py-12 items-center justify-center`}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={[tw`text-xs mt-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Loading customer feedback...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Rating Overview Card */}
                <View style={[tw`p-4 rounded-2xl mb-4 flex-row items-center`, isDark ? tw`bg-zinc-800` : tw`bg-amber-50 border border-amber-100`]}>
                  <View style={tw`items-center justify-center pr-5 border-r border-amber-200`}>
                    <Text style={[tw`text-4xl font-black`, isDark ? tw`text-amber-400` : tw`text-amber-600`]}>
                      {ratingsData.averageRating > 0 ? ratingsData.averageRating.toFixed(1) : '5.0'}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          color="#F59E0B"
                          fill={star <= Math.round(ratingsData.averageRating || 5) ? '#F59E0B' : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={[tw`text-[10px] font-semibold mt-1`, isDark ? tw`text-zinc-400` : tw`text-amber-800`]}>
                      {ratingsData.totalRatings} {ratingsData.totalRatings === 1 ? 'Rating' : 'Ratings'}
                    </Text>
                  </View>

                  {/* Breakdown Bars */}
                  <View style={tw`flex-1 pl-4`}>
                    {[5, 4, 3, 2, 1].map(stars => {
                      const count = ratingsData.breakdown[String(stars)] || 0;
                      const pct = ratingsData.totalRatings > 0 ? Math.round((count / ratingsData.totalRatings) * 100) : 0;
                      return (
                        <View key={stars} style={tw`flex-row items-center my-0.5`}>
                          <Text style={[tw`text-[10px] w-4 font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>{stars}★</Text>
                          <View style={[tw`flex-1 h-2 rounded-full mx-2 overflow-hidden`, isDark ? tw`bg-zinc-700` : tw`bg-amber-200`]}>
                            <View style={[tw`h-full rounded-full bg-amber-500`, { width: `${pct}%` }]} />
                          </View>
                          <Text style={[tw`text-[10px] w-6 text-right font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Reviews List */}
                <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>
                  Recent Reviews
                </Text>

                {ratingsData.reviews.length === 0 ? (
                  <View style={[tw`p-6 rounded-2xl items-center justify-center my-2`, isDark ? tw`bg-zinc-800` : tw`bg-gray-50 border border-gray-150`]}>
                    <Star size={32} color="#D1D5DB" />
                    <Text style={[tw`font-bold text-sm mt-2 text-center`, isDark ? tw`text-white` : tw`text-gray-700`]}>No Customer Reviews Yet</Text>
                    <Text style={[tw`text-xs text-center mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Ratings submitted by customers upon completing orders and bookings will be listed here.
                    </Text>
                  </View>
                ) : (
                  ratingsData.reviews.map((rev, idx) => (
                    <View
                      key={rev.id || idx}
                      style={[
                        tw`p-3.5 rounded-2xl mb-2.5`,
                        isDark ? tw`bg-zinc-800` : tw`bg-gray-50 border border-gray-100`
                      ]}>
                      <View style={tw`flex-row justify-between items-start`}>
                        <View style={tw`flex-row items-center flex-1`}>
                          <View style={[tw`w-8 h-8 rounded-full items-center justify-center mr-2.5`, { backgroundColor: '#EEF2FF' }]}>
                            <User size={16} color="#4F46E5" />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                              {rev.customerName || 'Verified Customer'}
                            </Text>
                            {rev.orderId ? (
                              <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                                Order #{rev.orderId}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={tw`items-end`}>
                          <View style={tw`flex-row items-center`}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                size={12}
                                color="#F59E0B"
                                fill={s <= (rev.rating || 5) ? '#F59E0B' : 'transparent'}
                              />
                            ))}
                          </View>
                          {rev.createdAt ? (
                            <Text style={[tw`text-[9px] mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {rev.comment ? (
                        <Text style={[tw`text-xs mt-2 leading-relaxed`, isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>
                          "{rev.comment}"
                        </Text>
                      ) : (
                        <Text style={[tw`text-xs mt-1.5 italic`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          Customer gave a {rev.rating}★ rating without written comments.
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setIsReviewsVisible(false)}
              style={[tw`py-3 mt-3 rounded-2xl items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
              <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customers List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCustomersVisible}
        onRequestClose={() => setIsCustomersVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <View>
                <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Customers</Text>
                <Text style={[tw`text-xs`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Manage your customer database and records</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCustomersVisible(false)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[tw`flex-row items-center border rounded-xl px-3 py-2 mb-4`, isDark ? tw`bg-zinc-950 border-zinc-700` : tw`bg-gray-50 border-gray-200`]}>
              <Search size={18} color={isDark ? '#52525b' : '#9CA3AF'} style={tw`mr-2`} />
              <TextInput
                style={[tw`flex-1 text-sm font-semibold p-0`, isDark ? tw`text-white` : tw`text-gray-800`]}
                placeholder="Search customers by name or phone..."
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                value={customersSearchQuery}
                onChangeText={setCustomersSearchQuery}
              />
              {customersSearchQuery ? (
                <TouchableOpacity onPress={() => setCustomersSearchQuery('')}>
                  <X size={16} color={isDark ? '#A1A1AA' : '#4B5563'} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Customers List */}
            {loadingCustomers ? (
              <View style={tw`py-10 items-center justify-center`}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={[tw`text-xs mt-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Loading customer profiles...</Text>
              </View>
            ) : (
              (() => {
                const filteredCustomers = customersList.filter(c => {
                  const q = customersSearchQuery.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.email && c.email.toLowerCase().includes(q))
                  );
                });

                if (filteredCustomers.length === 0) {
                  return (
                    <View style={tw`py-12 items-center justify-center`}>
                      <User size={48} color={isDark ? '#3F3F46' : '#D1D5DB'} strokeWidth={1.5} />
                      <Text style={[tw`text-sm font-bold mt-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>No customers found</Text>
                      <Text style={[tw`text-xs mt-1 text-center px-6`, isDark ? tw`text-zinc-650` : tw`text-gray-400`]}>Your customer records will automatically populate here as they place bookings and orders.</Text>
                    </View>
                  );
                }

                return (
                  <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
                    {filteredCustomers.map(customer => {
                      const nameParts = (customer.name || 'Customer').split(' ');
                      const initials = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
                      const isCanonical = (id: any) =>
                        id &&
                        (String(id).startsWith('FIC-CUS-') ||
                          String(id).startsWith('FIC-CUST-') ||
                          String(id).startsWith('REG-')) &&
                        String(id) !== 'FIC-CUST-100001';
                      const canonicalId = isCanonical(customer.customerId)
                        ? String(customer.customerId)
                        : isCanonical(customer.customerDisplayId)
                        ? String(customer.customerDisplayId)
                        : isCanonical(customer.registrationId)
                        ? String(customer.registrationId)
                        : 'N/A';
                      const totalSpentNum = Number(customer.totalSpent || 0);

                      return (
                        <View
                          key={customer._id || (customer as any).id || canonicalId}
                          style={[
                            tw`flex-row items-center p-3 rounded-2xl mb-2.5`,
                            isDark ? tw`bg-zinc-950 border border-zinc-800/40` : tw`bg-gray-50 border border-gray-100`,
                          ]}>
                          {/* Avatar Circle */}
                          <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3.5`, { backgroundColor: '#EEF2FF' }]}>
                            <Text style={tw`text-indigo-600 font-extrabold text-sm`}>{initials}</Text>
                          </View>

                          {/* Customer Details */}
                          <View style={tw`flex-1`}>
                            <View style={tw`flex-row items-center`}>
                              <Text style={[tw`font-bold text-sm mr-2`, isDark ? tw`text-white` : tw`text-gray-800`]}>{customer.name}</Text>
                              {canonicalId !== 'N/A' && (
                                <Text style={tw`text-[9px] font-mono font-bold text-indigo-500`}>({canonicalId})</Text>
                              )}
                            </View>
                            {customer.phone ? (
                              <View style={tw`flex-row items-center mt-0.5`}>
                                <Phone size={10} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                                <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>{customer.phone}</Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Stats Badge */}
                          <View style={tw`items-end`}>
                            <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              {customer.ordersCount || customer.visits || 1} {((customer.ordersCount || customer.visits || 1) === 1) ? 'Order' : 'Orders'}
                            </Text>
                            <Text style={tw`text-emerald-600 font-black text-xs mt-0.5`}>
                              ₹{totalSpentNum.toLocaleString('en-IN')}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                );
              })()
            )}

            {/* Action Buttons */}
            <View style={tw`flex-row gap-2.5`}>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomersVisible(false);
                  handleMenuPress('Customers');
                }}
                style={tw`flex-1 py-3 rounded-2xl items-center justify-center bg-indigo-600`}>
                <Text style={tw`font-bold text-sm text-white`}>Open Full Directory</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsCustomersVisible(false)}
                style={[tw`px-6 py-3 rounded-2xl items-center justify-center border border-gray-200 bg-gray-50`, isDark && tw`bg-zinc-800 border-zinc-700`]}>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-650`]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incoming Order / Booking Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={incomingOrderModalVisible}
        onRequestClose={handleCloseOrder}>
        <View style={[tw`flex-1 justify-center items-center px-5`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[tw`w-full max-w-sm rounded-3xl p-6 relative overflow-hidden`, isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`]}>

            {/* 10-second Countdown Progress Bar */}
            <View style={[tw`absolute top-0 left-0 right-0 h-1.5 bg-indigo-100 overflow-hidden`, isDark && tw`bg-zinc-800`]}>
              <Animated.View
                style={[
                  tw`h-full w-full bg-indigo-600 rounded-r-full`,
                  {
                    transform: [
                      {
                        translateX: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-screenWidth, 0],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            {/* Countdown Badge */}
            <View style={tw`absolute top-3.5 right-4 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 flex-row items-center`}>
              <Clock size={12} color="#4F46E5" style={tw`mr-1`} />
              <Text style={tw`text-indigo-600 font-extrabold text-[11px]`}>{countdown}s</Text>
            </View>

            {/* Title & Target Business Badge */}
            <View style={tw`items-center mb-3 mt-1`}>
              <View style={[tw`w-12 h-12 rounded-full items-center justify-center mb-2`, { backgroundColor: '#EEF2FF' }]}>
                <ShoppingBag size={24} color="#4F46E5" />
              </View>

              <Text style={[tw`text-lg font-black text-center`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                Incoming {incomingOrder?.type || 'Order'} Alert!
              </Text>

              {/* Destination Business Name */}
              <View style={tw`flex-row items-center mt-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100`}>
                <Store size={12} color="#4F46E5" style={tw`mr-1.5`} />
                <Text style={tw`text-indigo-700 font-extrabold text-xs`}>
                  {incomingOrder?.businessName || activeUser?.businesses?.[0]?.businessName || 'Store'}
                </Text>
              </View>

              <Text style={[tw`text-xs mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Auto-closing in {countdown} sec{countdown !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Customer Details Card */}
            <View style={[tw`rounded-2xl p-3 mb-3`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <Text style={[tw`text-[10px] font-bold uppercase tracking-wider`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Customer Details</Text>
                <View style={tw`bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100`}>
                  <Text style={tw`text-emerald-700 text-[10px] font-bold`}>{incomingOrder?.paymentStatus || 'Paid'}</Text>
                </View>
              </View>

              <View style={tw`flex-row items-center mb-1`}>
                <User size={14} color="#4B5563" style={tw`mr-2`} />
                <Text style={[tw`font-extrabold text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Customer Name: </Text>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>{incomingOrder?.memberName || 'Customer'}</Text>
              </View>

              <View style={tw`flex-row items-center`}>
                <Phone size={13} color="#6B7280" style={tw`mr-2`} />
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>{incomingOrder?.customerPhone || 'N/A'}</Text>
              </View>
            </View>

            {/* Delivery Location Card */}
            <View style={[tw`rounded-2xl p-3 mb-3`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Delivery Location</Text>

              <View style={tw`flex-row items-start`}>
                <MapPin size={15} color="#EF4444" style={tw`mr-2 mt-0.5`} />
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-xs font-bold leading-4`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                    {incomingOrder?.customerAddress || incomingOrder?.pickupLocation || incomingOrder?.dropLocation || 'Address not provided'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Product Details & Price Breakdown Card */}
            <View style={[tw`rounded-2xl p-3 mb-3`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Product Details & Pricing</Text>

              {incomingOrder?.items && incomingOrder.items.length > 0 ? (
                incomingOrder.items.map((item: any, idx: number) => (
                  <View key={idx} style={[tw`py-1.5 border-b border-gray-100`, isDark && tw`border-zinc-900`, idx === incomingOrder.items.length - 1 && tw`border-b-0`]}>
                    <View style={tw`flex-row justify-between items-start`}>
                      <View style={tw`flex-1 mr-2`}>
                        <View style={tw`flex-row items-center mb-0.5`}>
                          <View style={tw`bg-indigo-100 px-1.5 py-0.2 rounded mr-1.5`}>
                            <Text style={tw`text-indigo-700 font-extrabold text-[10px]`}>{item.quantity || 1}x</Text>
                          </View>
                          <Text style={[tw`text-xs font-bold flex-1`, isDark ? tw`text-white` : tw`text-gray-800`]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        {item.detail ? (
                          <Text style={[tw`text-[10px] ml-6`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            {item.detail}
                          </Text>
                        ) : null}
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={[tw`text-xs font-black`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          ₹{(item.price * (item.quantity || 1))}
                        </Text>
                        <Text style={[tw`text-[9px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          ₹{item.price} each
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={tw`py-1`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <Text style={[tw`text-xs font-bold flex-1 mr-2`, isDark ? tw`text-white` : tw`text-gray-800`]} numberOfLines={1}>
                      1x {incomingOrder?.product_details || incomingOrder?.name || 'Catalog Item'}
                    </Text>
                    <Text style={[tw`text-xs font-black`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      ₹{incomingOrder?.finalAmount || incomingOrder?.amount || 0}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Total Price Summary */}
            <View style={tw`flex-row justify-between items-center mb-4 px-1`}>
              <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Total Price:</Text>
              <Text style={tw`text-indigo-600 text-2xl font-black`}>₹{incomingOrder?.finalAmount}</Text>
            </View>

            {/* Buttons */}
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={handleRejectOrder}
                disabled={isSubmittingAction}
                activeOpacity={0.7}
                style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-rose-900/50 bg-rose-950/20` : tw`border-rose-200 bg-rose-50`, isSubmittingAction && tw`opacity-50`]}>
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#E11D48" />
                ) : (
                  <Text style={tw`font-extrabold text-sm text-rose-600`}>Reject</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAcceptOrder}
                disabled={isSubmittingAction}
                activeOpacity={0.7}
                style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center`, { backgroundColor: '#10B981' }, isSubmittingAction && tw`opacity-50`]}>
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={tw`text-white font-black text-sm`}>Accept Order</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}
