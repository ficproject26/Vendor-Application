import React, {useState, useEffect, useMemo} from 'react';
import { fetchOrders, fetchBookings, fetchApplications, updateOrderStatus, getVendorUser } from '../services/apiService';
import { socketService } from '../services/socketService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  ChevronRight,
  MapPin,
  Phone,
  CalendarCheck,
  X,
  FileText,
  Download,
  Mail,
  GraduationCap,
  Briefcase,
  Compass,
  Users,
  CreditCard,
  Receipt,
  Calendar,
} from 'lucide-react-native';

const isCanonicalCustId = (id: any) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-') || String(id).startsWith('REG-')) && String(id) !== 'FIC-CUST-100001';

const getCustomerDisplayId = (item: any): string => {
  if (!item) return 'N/A';
  const raw = item.rawOrder || item;
  if (isCanonicalCustId(raw.customerDisplayId)) return String(raw.customerDisplayId);
  if (isCanonicalCustId(raw.customerId)) return String(raw.customerId);
  if (isCanonicalCustId(raw.registrationId)) return String(raw.registrationId);
  if (isCanonicalCustId(raw.userRegistrationId)) return String(raw.userRegistrationId);
  if (isCanonicalCustId(raw.memberId)) return String(raw.memberId);
  if (raw.order_number) return `CUST-${String(raw.order_number).slice(-6)}`;
  return 'N/A';
};

type OrderStatus = 'All' | 'Pending' | 'Preparing' | 'Assigned' | 'Delivered' | 'Cancelled';

interface Booking {
  id: string;
  dbId?: string;
  customer: string;
  serviceName: string;
  dateTime: string;
  amount: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Checked In' | string;
  paymentStatus?: string;
  paymentMethod?: string;
  phone: string;
  customerAddress?: string;
  category?: string;
  bookingCategory: 'Services' | 'Stay' | 'Travel';
  // Stay fields
  propertyName?: string;
  roomName?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  guestCount?: number;
  // Travel fields
  travelOptionName?: string;
  pickupLocation?: string;
  destinationLocation?: string;
  travelDate?: string;
  departureTime?: string;
  passengerCount?: number;
  // Service fields
  serviceDate?: string;
  serviceTime?: string;
  packageName?: string;
  serviceLocation?: string;
  rawOrder?: any;
  isBusBooking?: boolean;
}


const bookingStatusConfig: Record<string, { color: string; bgColor: string; icon: any }> = {
  Confirmed: {
    color: '#16A34A',
    bgColor: '#F0FDF4',
    icon: CheckCircle2,
  },
  'Checked In': {
    color: '#0284C7',
    bgColor: '#F0F9FF',
    icon: CheckCircle2,
  },
  Pending: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    icon: Clock,
  },
  Completed: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
    icon: CheckCircle2,
  },
  Cancelled: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
    icon: XCircle,
  },
};

interface Order {
  id: string;
  dbId?: string;
  name: string;
  dateTime: string;
  amount: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  quantity?: number;
  image: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  candidateEmail?: string;
  candidateResume?: string;
  candidateEducation?: string;
  candidateExperience?: string;
  jobTitle?: string;
  jobId?: string;
  category?: string;
  rawOrder?: any;
  isBusBooking?: boolean;
}

const getTransactionTimestamp = (item: any): number => {
  if (!item) return 0;
  const raw = item.rawOrder || item;
  const rawDate = raw.createdAt || raw.created_at || raw.orderDate || raw.applicationDate || raw.bookingDate || raw.date;
  if (rawDate) {
    const t = new Date(rawDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const idStr = String(raw._id || raw.id || item.dbId || item.id || '');
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const ts = parseInt(idStr.substring(0, 8), 16) * 1000;
    if (!isNaN(ts) && ts > 0) return ts;
  }
  return 0;
};

const statusFilters: OrderStatus[] = ['All', 'Pending', 'Preparing', 'Assigned', 'Delivered', 'Cancelled'];

const statusConfig: any = {
  Pending: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  Reviewed: {
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  'Interview Scheduled': {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  'Application Submitted': {
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  Applied: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  'Under Review': {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  'Order Received': {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  Placed: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  New: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  Processing: {
    color: '#D97706',
    bgColor: '#FFF7ED',
  },
  'In Transit': {
    color: '#4B5563',
    bgColor: '#F3F4F6',
  },
  Declined: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  Confirmed: {
    color: '#16A34A',
    bgColor: '#F0FDF4',
  },
  Preparing: {
    color: '#D97706',
    bgColor: '#FFF7ED',
  },
  Assigned: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  Accepted: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  'Out for Delivery': {
    color: '#4B5563',
    bgColor: '#F3F4F6',
  },
  Delivered: {
    color: '#16A34A',
    bgColor: '#F0FDF4',
  },
  Completed: {
    color: '#16A34A',
    bgColor: '#F0FDF4',
  },
  Cancelled: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  Rejected: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
  },
  Shortlisted: {
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  Interviewing: {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  Hired: {
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
};

interface OrdersScreenProps {
  isDark?: boolean;
  routeParams?: {
    segment?: 'Orders' | 'Bookings' | 'Jobs';
    targetId?: string;
  } | null;
  clearRouteParams?: () => void;
}

export default function OrdersScreen({
  isDark = false,
  routeParams,
  clearRouteParams,
}: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState<'Orders' | 'Bookings' | 'Jobs'>('Orders');
  const [activeFilter, setActiveFilter] = useState<any>('All');
  const [bookingCategoryFilter, setBookingCategoryFilter] = useState<'All' | 'Services' | 'Stay' | 'Travel'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Independent state per section (prevents cross-tab overwrites or blank screens)
  const [ordersRaw, setOrdersRaw] = useState<any[]>([]);
  const [bookingsRaw, setBookingsRaw] = useState<any[]>([]);
  const [jobsRaw, setJobsRaw] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vendorUser = getVendorUser();
  const isJobVendor = vendorUser && vendorUser.vendorType && vendorUser.vendorType.startsWith('Job');
  const regularStatusFilters = ['All', 'Pending', 'Preparing', 'Assigned', 'Delivered', 'Cancelled'];
  const bookingStatusFilters = ['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];
  const jobStatusFilters = ['All', 'Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled'];

  const currentStatusFilters =
    activeSegment === 'Jobs'
      ? jobStatusFilters
      : activeSegment === 'Bookings'
      ? bookingStatusFilters
      : regularStatusFilters;

  const loadSegmentData = async (segment = activeSegment, force = false) => {
    if (segment === 'Orders') {
      if (!force && ordersRaw.length > 0) return;
      setLoadingOrders(true);
      try {
        const data = await fetchOrders();
        setOrdersRaw(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.warn("Failed to fetch orders:", err.message);
      } finally {
        setLoadingOrders(false);
      }
    } else if (segment === 'Bookings') {
      if (!force && bookingsRaw.length > 0) return;
      setLoadingBookings(true);
      try {
        const data = await fetchBookings();
        setBookingsRaw(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.warn("Failed to fetch bookings:", err.message);
      } finally {
        setLoadingBookings(false);
      }
    } else if (segment === 'Jobs') {
      if (!force && jobsRaw.length > 0) return;
      setLoadingJobs(true);
      try {
        const data = await fetchApplications();
        setJobsRaw(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.warn("Failed to fetch jobs:", err.message);
      } finally {
        setLoadingJobs(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeSegment === 'Orders') {
        const data = await fetchOrders();
        setOrdersRaw(Array.isArray(data) ? data : []);
      } else if (activeSegment === 'Bookings') {
        const data = await fetchBookings();
        setBookingsRaw(Array.isArray(data) ? data : []);
      } else {
        const data = await fetchApplications();
        setJobsRaw(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.warn("Refresh failed:", err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle external navigation directly into a segment/target item from real-time notifications
  useEffect(() => {
    if (routeParams?.segment) {
      setActiveSegment(routeParams.segment);
      setActiveFilter('All');
      // Only clear if no targetId is pending; if targetId is present, the target matcher effect will clear it upon finding and opening the item
      if (!routeParams.targetId && clearRouteParams) {
        clearRouteParams();
      }
    }
  }, [routeParams?.segment]);

  useEffect(() => {
    loadSegmentData(activeSegment);
  }, [activeSegment]);

  // Real-Time live listener for incoming Orders, Bookings, and Job Applications
  useEffect(() => {
    socketService.connect();

    const unsubOrder = socketService.onNewOrder((newOrder: any) => {
      if (!newOrder) return;
      const targetId = String(newOrder._id || newOrder.id || newOrder.order_number || '');
      if (!targetId) return;

      setOrdersRaw(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some(o => String(o._id || o.id || o.order_number) === targetId)) {
          return list;
        }
        return [newOrder, ...list];
      });
    });

    const unsubBooking = socketService.onNewBooking((newBooking: any) => {
      if (!newBooking) return;
      const targetId = String(newBooking._id || newBooking.id || newBooking.order_number || '');
      if (!targetId) return;

      setBookingsRaw(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some(b => String(b._id || b.id || b.order_number) === targetId)) {
          return list;
        }
        return [newBooking, ...list];
      });
    });

    const unsubJob = socketService.onNewApplication((newJob: any) => {
      if (!newJob) return;
      const targetId = String(newJob._id || newJob.id || newJob.order_number || newJob.applicationId || '');
      if (!targetId) return;

      setJobsRaw(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some(j => String(j._id || j.id || j.order_number || j.applicationId) === targetId)) {
          return list;
        }
        return [newJob, ...list];
      });
    });

    const unsubStatus = socketService.onOrderStatusChanged((event: any) => {
      const raw = event?.data || event?.order || event;
      const targetId = String(raw?._id || raw?.id || raw?.order_number || raw?.applicationId || event?.entityId || '');
      const newStatus = raw?.status || raw?.orderStatus || event?.data?.status;
      if (!targetId || !newStatus) return;

      const updateMatch = (item: any) => {
        if (String(item._id || item.id || item.order_number || item.applicationId) === targetId) {
          return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return item;
      };

      setOrdersRaw(prev => (Array.isArray(prev) ? prev : []).map(updateMatch));
      setBookingsRaw(prev => (Array.isArray(prev) ? prev : []).map(updateMatch));
      setJobsRaw(prev => (Array.isArray(prev) ? prev : []).map(updateMatch));
    });

    return () => {
      unsubOrder();
      unsubBooking();
      unsubJob();
      unsubStatus();
    };
  }, []);

  const handleStatusTransition = async (orderId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      Alert.alert('Success', `Status updated to ${newStatus}`);
      setSelectedOrder(prev => (prev ? { ...prev, status: newStatus } : null));
      setSelectedBooking(prev => (prev ? { ...prev, status: newStatus as any } : null));
      await loadSegmentData(activeSegment, true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const isBusOrder = (o: any) => {
    if (!o) return false;
    const raw = o.rawOrder || o;
    const cat = String(raw.category || '').toLowerCase();
    const pd = String(raw.product_details || raw.name || raw.serviceName || '').toLowerCase();
    return (
      cat === 'travel' ||
      cat.includes('bus') ||
      Boolean(raw.bus_name) ||
      Boolean(raw.boarding_point) ||
      pd.includes('boarding:') ||
      pd.includes('dropping:') ||
      Boolean(raw.travelers && raw.travelers.length > 0)
    );
  };
 
  // Robust check to determine if a bus booking has already had its seat allocated
  const checkIsBusSeatAllocated = (item: any): boolean => {
    if (!item) return false;
    const raw = item.rawOrder || item;
    if (raw.seat_status === 'Allocated') return true;
    const s = String(raw.allocated_seat || raw.seat || item.allocated_seat || item.seat || '').trim().toLowerCase();
    if (s && !s.includes('pending') && !s.includes('awaiting') && !s.includes('select') && s !== 'none' && s !== '') {
      return true;
    }
    if (Array.isArray(raw.travelers) && raw.travelers.length > 0) {
      const hasAllocated = raw.travelers.some((t: any) => {
        const ts = String(t.seat || '').trim().toLowerCase();
        return ts && !ts.includes('pending') && !ts.includes('awaiting') && ts !== 'none' && ts !== '';
      });
      if (hasAllocated) return true;
    }
    return false;
  };

  const getBusSeatDisplay = (item: any): string => {
    if (!item) return '';
    const raw = item.rawOrder || item;
    if (Array.isArray(raw.travelers) && raw.travelers.length > 0) {
      const seats = raw.travelers
        .map((t: any) => t.seat)
        .filter((s: any) => s && !String(s).toLowerCase().includes('pending') && !String(s).toLowerCase().includes('awaiting'));
      if (seats.length > 0) return seats.join(', ');
    }
    const s = raw.allocated_seat || raw.seat || item.allocated_seat || item.seat || '';
    if (s && !String(s).toLowerCase().includes('pending') && !String(s).toLowerCase().includes('awaiting')) {
      return String(s);
    }
    return 'Allocated';
  };

  // Bus Seat Allocation State & Handlers
  const [seatModalVisible, setSeatModalVisible] = useState(false);
  const [targetBusOrder, setTargetBusOrder] = useState<any>(null);
  const [assignedSeats, setAssignedSeats] = useState<{ [key: number]: string }>({});
  const [customSeatInput, setCustomSeatInput] = useState('');
  const [activePassengerIdx, setActivePassengerIdx] = useState(0);

  // Compute all occupied seats for this bus/service across all orders
  const occupiedSeatsMap = useMemo(() => {
    if (!targetBusOrder) return {};
    const rawTarget = targetBusOrder.rawOrder || targetBusOrder;
    const currentOrderId = String(targetBusOrder.dbId || targetBusOrder.id || rawTarget.id || rawTarget._id || '');
    const currentOrderNumber = String(rawTarget.order_number || targetBusOrder.id || '');
    const targetBusName = (rawTarget.bus_name || targetBusOrder.name || '').toLowerCase().trim();

    const map: {
      [seatNo: string]: {
        seat: string;
        passengerName: string;
        pnr: string;
        phone: string;
        isCurrentBooking: boolean;
      };
    } = {};

    // 1. Scan all orders in database to find already booked seats on this bus
    (bookingsRaw || []).forEach((ord: any) => {
      const isBus = isBusOrder(ord);
      if (!isBus) return;
      const ordRaw = ord.rawOrder || ord;
      const ordId = String(ord._id || ord.id || ordRaw.id || ordRaw._id || '');
      const ordNum = String(ordRaw.order_number || ord.order_number || ord.id || '');
      const isThisBooking = Boolean(
        (ordId && (ordId === currentOrderId || ordId === currentOrderNumber)) ||
        (ordNum && (ordNum === currentOrderId || ordNum === currentOrderNumber))
      );

      // Check if it belongs to the same bus / route
      const busName = (ordRaw.bus_name || ord.name || '').toLowerCase().trim();
      const busMatches = !targetBusName || !busName || targetBusName.includes(busName) || busName.includes(targetBusName);
      if (!busMatches && !isThisBooking) return;

      // Extract seats from travelers array
      if (Array.isArray(ordRaw.travelers) && ordRaw.travelers.length > 0) {
        ordRaw.travelers.forEach((t: any, pIdx: number) => {
          const s = String(t.seat || '').trim().toUpperCase();
          if (s && !s.includes('PENDING') && !s.includes('AWAITING') && s !== 'NONE') {
            map[s] = {
              seat: s,
              passengerName: t.name || ordRaw.customer_name || ord.customerName || `Passenger ${pIdx + 1}`,
              pnr: ordNum || ordId,
              phone: ordRaw.customer_phone || ord.customerPhone || '',
              isCurrentBooking: isThisBooking,
            };
          }
        });
      }

      // Also extract from allocated_seat or seat field
      const seatField = String(ordRaw.allocated_seat || ordRaw.seat || ord.allocated_seat || ord.seat || '').trim();
      if (seatField && !seatField.toLowerCase().includes('pending') && !seatField.toLowerCase().includes('awaiting')) {
        const parts = seatField.split(/[,;\s]+/).filter(Boolean);
        parts.forEach((st, sIdx) => {
          const cleanSeat = st.toUpperCase().trim();
          if (cleanSeat && !map[cleanSeat]) {
            map[cleanSeat] = {
              seat: cleanSeat,
              passengerName: ordRaw.customer_name || ord.customerName || ord.customer || `Passenger ${sIdx + 1}`,
              pnr: ordNum || ordId,
              phone: ordRaw.customer_phone || ord.customerPhone || '',
              isCurrentBooking: isThisBooking,
            };
          }
        });
      }
    });

    return map;
  }, [targetBusOrder, bookingsRaw]);

  const openSeatModal = (item: any) => {
    if (checkIsBusSeatAllocated(item)) {
      Alert.alert(
        'Seat Already Allocated',
        'Seat has already been allocated for this booking and cannot be reallocated.'
      );
      return;
    }

    const raw = item?.rawOrder || item;
    setTargetBusOrder(item);
    const initialSeats: { [key: number]: string } = {};
    const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0
      ? raw.travelers
      : [{ name: item.customerName || item.customer || 'Passenger 1', seat: raw.seat || '' }];
    
    travelers.forEach((t: any, idx: number) => {
      initialSeats[idx] = (t.seat && !String(t.seat).toLowerCase().includes('pending')) ? t.seat : (idx === 0 && raw.seat && !String(raw.seat).toLowerCase().includes('pending') ? raw.seat : '');
    });
    setAssignedSeats(initialSeats);
    setCustomSeatInput(initialSeats[0] || '');
    setActivePassengerIdx(0);
    setSeatModalVisible(true);
  };

  const handleSelectSeat = (seatNo: string) => {
    // If seat is occupied by another booking on this bus, block selection
    const occupied = occupiedSeatsMap[seatNo];
    if (occupied && !occupied.isCurrentBooking) {
      Alert.alert(
        `Seat ${seatNo} Already Booked! 🚫`,
        `This berth is already reserved for:\nPassenger: ${occupied.passengerName}\nBooking Ref: ${occupied.pnr}\n\nPlease choose an available berth.`
      );
      return;
    }
    setAssignedSeats(prev => ({ ...prev, [activePassengerIdx]: seatNo }));
    setCustomSeatInput(seatNo);
  };

  const handleConfirmSeatAllocation = async () => {
    if (!targetBusOrder) return;
    const raw = targetBusOrder.rawOrder || targetBusOrder;
    const orderId = String(targetBusOrder.dbId || targetBusOrder.id || raw.id || raw._id || '');
    const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0
      ? [...raw.travelers]
      : [{ name: targetBusOrder.customerName || targetBusOrder.customer || 'Passenger 1', seat: '' }];

    const updatedTravelers = travelers.map((t: any, idx: number) => ({
      ...t,
      seat: assignedSeats[idx] || customSeatInput || (idx === 0 ? 'U4' : `U${idx + 4}`),
    }));

    const seatSummary = updatedTravelers.map((t: any) => t.seat).filter(Boolean).join(', ') || 'U4';

    // 1. Immediately update bookings optimistically so the "Allocate Seat" button is removed in real-time
    setBookingsRaw(prev => (prev || []).map((ord: any) => {
      const ordId = String(ord._id || ord.id || ord.order_number || '');
      if (ordId === orderId || ord.order_number === orderId || ord.id === orderId) {
        return {
          ...ord,
          status: 'Confirmed',
          seat: seatSummary,
          allocated_seat: seatSummary,
          seat_status: 'Allocated',
          travelers: updatedTravelers,
          rawOrder: {
            ...(ord.rawOrder || {}),
            status: 'Confirmed',
            seat: seatSummary,
            allocated_seat: seatSummary,
            seat_status: 'Allocated',
            travelers: updatedTravelers,
          }
        };
      }
      return ord;
    }));

    // Optimistically update modals if open
    setTargetBusOrder((prev: any) => prev ? {
      ...prev,
      status: 'Confirmed',
      seat: seatSummary,
      allocated_seat: seatSummary,
      seat_status: 'Allocated',
      rawOrder: {
        ...(prev.rawOrder || {}),
        status: 'Confirmed',
        seat: seatSummary,
        allocated_seat: seatSummary,
        seat_status: 'Allocated',
        travelers: updatedTravelers,
      }
    } : null);

    setSelectedOrder((prev: any) => prev ? {
      ...prev,
      status: 'Confirmed',
      seat: seatSummary,
      allocated_seat: seatSummary,
      seat_status: 'Allocated',
      rawOrder: {
        ...(prev.rawOrder || {}),
        status: 'Confirmed',
        seat: seatSummary,
        allocated_seat: seatSummary,
        seat_status: 'Allocated',
        travelers: updatedTravelers,
      }
    } : null);

    setSelectedBooking((prev: any) => prev ? {
      ...prev,
      status: 'Confirmed',
      seat: seatSummary,
      allocated_seat: seatSummary,
      seat_status: 'Allocated',
      rawOrder: {
        ...(prev.rawOrder || {}),
        status: 'Confirmed',
        seat: seatSummary,
        allocated_seat: seatSummary,
        seat_status: 'Allocated',
        travelers: updatedTravelers,
      }
    } : null);

    setSeatModalVisible(false);
    setActionLoading(true);
    try {
      await updateOrderStatus(orderId, 'Confirmed', {
        seat: seatSummary,
        allocated_seat: seatSummary,
        travelers: updatedTravelers,
        bus_name: raw.bus_name || targetBusOrder.name,
      });

      Alert.alert(
        'Seat Allocated & Confirmed! 🎟️',
        `Successfully allocated Seat (${seatSummary}) to ${updatedTravelers[0]?.name || 'Passenger'}.\n\nThe customer boarding pass has been instantly confirmed with this seat!`
      );
      await loadSegmentData('Bookings', true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to allocate seat.');
    } finally {
      setActionLoading(false);
    }
  };

  const isJobItem = (o: any) => {
    if (!o) return false;
    const cat = String(o.category || o.type || '').toLowerCase();
    if (['services', 'service', 'stay', 'travel', 'travels', 'products', 'food', 'daily needs'].includes(cat)) {
      if (!o.jobId && !o.applicationId && !cat.includes('job')) return false;
    }
    const orderNum = String(o.order_number || o.id || o.rawOrder?.order_number || '');
    const id = String(o.id || o._id || '');
    return Boolean(
      cat === 'jobs' ||
      cat === 'job' ||
      orderNum.startsWith('JOB') ||
      orderNum.includes('JOB-') ||
      id.startsWith('ord_job') ||
      (o.jobId || o.applicationId) ||
      (o.candidateResume && String(o.candidateResume).trim() !== '' && o.candidateResume !== 'null') ||
      o.resume_name ||
      o.application_status ||
      String(o.customerAddress || o.customer_address || '').includes('Resume:') ||
      ['Application Submitted', 'Applied', 'Under Review', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Interviewing', 'Hired'].includes(o.status)
    );
  };

  // Helper to strictly identify Order category types (Products, Food, Daily Needs ONLY)
  const isProductFoodDailyOrder = (o: any) => {
    if (!o || isJobItem(o) || isBusOrder(o)) return false;
    const cat = String(o.category || o.type || '').trim().toLowerCase();
    if (['travel', 'stay', 'services', 'service', 'booking', 'appointment', 'hotel', 'hospital', 'doctor', 'technician'].includes(cat) || o.serviceName || o.appointment_slot || o.checkInDate || o.roomNumber) {
      return false;
    }
    return true;
  };

  // Helper to strictly identify Booking category types (Services, Stay, Travel including Bus ONLY)
  const isBookingItem = (o: any) => {
    if (!o || isJobItem(o)) return false;
    if (isBusOrder(o)) return true;
    const cat = String(o.category || o.type || '').trim().toLowerCase();
    return ['travel', 'stay', 'services', 'service', 'booking', 'appointment', 'hotel', 'hospital', 'doctor', 'technician'].includes(cat) || Boolean(o.serviceName) || Boolean(o.appointment_slot) || Boolean(o.checkInDate) || Boolean(o.roomNumber);
  };

  // Standard Product, Food, Daily Needs Orders (NO JOBS, NO BUS, NO BOOKINGS)
  const ordersData: Order[] = useMemo(() => {
    return (ordersRaw || [])
      .filter(o => isProductFoodDailyOrder(o))
      .map(o => {
        const addrStr = String(o.customerAddress || o.pickupLocation || o.customer_address || '');
        const totalQty = Number(o.totalQuantity || (o.items && Array.isArray(o.items) && o.items.length > 0 ? o.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) : (o.quantity || 1)));
        const payStatus = o.paymentStatus || o.payment_status || (['Delivered', 'Completed'].includes(o.status) ? 'Paid' : 'Pending');
        const payMethod = o.paymentMethod || o.payment_method || '';

        return {
          id: o.order_number || o.id || o._id,
          dbId: o._id || o.id,
          name: o.items && o.items.length > 0 ? o.items.map((i: any) => i.name).join(', ') : (o.product_details || o.name || 'Order Item'),
          dateTime: o.appointment_slot || (o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Just now'),
          amount: `₹${Number(o.finalAmount ?? o.totalAmount ?? o.amount ?? 0).toLocaleString('en-IN')}`,
          status: o.status || 'Pending',
          paymentStatus: payStatus,
          paymentMethod: payMethod,
          quantity: totalQty,
          image: o.image || (o.items && o.items[0]?.image) || '',
          customerName: o.customer_name || o.memberName || 'Customer',
          customerPhone: o.customerPhone || o.customer_phone || o.phone || o.memberPhone || '',
          customerAddress: addrStr || '',
          category: o.category || o.type || 'Products',
          rawOrder: o,
          isBusBooking: false,
        };
      })
      .sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
  }, [ordersRaw]);

  // Service, Stay & Travel Bookings (NO JOBS, NO PRODUCT/FOOD/DAILY NEEDS)
  const bookingsData: Booking[] = useMemo(() => {
    return (bookingsRaw || [])
      .filter(o => isBookingItem(o))
      .map(o => {
        const isBus = isBusOrder(o);
        const catStr = String(o.category || o.type || '').trim().toLowerCase();
        const isStay = ['stay', 'hotel', 'hotels', 'resort', 'rooms'].includes(catStr) || Boolean(o.checkInDate) || Boolean(o.roomNumber) || Boolean(o.staySchedule);
        const isTravel = ['travel', 'travels', 'package', 'bus', 'vehicle', 'cab', 'car', 'bike', 'transport'].includes(catStr) || isBus || Boolean(o.boardingPoint) || Boolean(o.vehicleType);
        const bookingCat: 'Services' | 'Stay' | 'Travel' = isStay ? 'Stay' : isTravel ? 'Travel' : 'Services';

        const travelers = Array.isArray(o.travelers) ? o.travelers : [];
        const primaryPassenger = travelers[0]?.name || o.memberName || o.customer_name || o.bookingHolder?.name || 'Customer';

        // Precise Service Name and Package resolution
        const GENERIC_CATS = ['electrical & solar services', 'electrical & solar', 'electrical services', 'plumbing services', 'services', 'service', 'general service', 'daily needs', 'products'];
        let resolvedServiceName = o.serviceName;
        let resolvedPackageName = o.packageName || (o.items && o.items[0]?.variant);

        if (isBus && o.bus_name) {
          resolvedServiceName = o.bus_name;
        } else if (!resolvedServiceName || GENERIC_CATS.includes(String(resolvedServiceName).trim().toLowerCase())) {
          const candidate = (o.items && o.items[0]?.name) || o.product_details || o.name || '';
          const m = candidate.match(/^([^(•·\n\r]+)(?:\(([^)]+)\))?/);
          if (m) {
            resolvedServiceName = m[1].trim();
            if (!resolvedPackageName && m[2]) resolvedPackageName = m[2].split(/[•·]/)[0].trim();
          } else {
            resolvedServiceName = candidate || 'Service Booking';
          }
        } else if (String(resolvedServiceName).includes('(')) {
          const m = String(resolvedServiceName).match(/^([^(]+)(?:\(([^)]+)\))?/);
          if (m) {
            resolvedServiceName = m[1].trim();
            if (!resolvedPackageName && m[2]) resolvedPackageName = m[2].trim();
          }
        }

        const custPhone = o.bookingHolder?.phone || o.customerPhone || o.customer_phone || o.phone || o.memberPhone || '';
        const payStatus = o.paymentStatus || o.payment_status || (['Completed', 'Delivered', 'Checked Out'].includes(o.status) ? 'Paid' : 'Pending');

        // Stay properties
        const propName = o.propertyDetails?.propertyName || o.propertyName || o.hotelName || 'Stay Property';
        const roomName = o.roomDetails?.name || o.roomName || (o.items && o.items[0]?.name) || o.product_details || 'Deluxe Room';
        const cInDate = o.checkInDate || (o.staySchedule && o.staySchedule.checkInDate) || 'Not provided';
        const cInTime = o.checkInTime || (o.staySchedule && o.staySchedule.checkInTime) || '12:00 PM';
        const cOutDate = o.checkOutDate || (o.staySchedule && o.staySchedule.checkOutDate) || 'Not provided';
        const cOutTime = o.checkOutTime || (o.staySchedule && o.staySchedule.checkOutTime) || '11:00 AM';
        const totalGuests = Number(o.totalGuests || o.guestCount || o.numberOfGuests || (o.adults ? (Number(o.adults) + Number(o.children || 0)) : 1));

        // Travel properties
        const travelOptName = isBus && o.bus_name ? o.bus_name : (o.vehicleDetails?.vehicleName || o.vehicleType || (o.items && o.items[0]?.name) || o.product_details || 'Travel Booking');
        const bPoint = o.boarding_point || (typeof o.boardingPoint === 'object' ? (o.boardingPoint?.name || o.boardingPoint?.landmark) : o.boardingPoint) || o.pickupLocation || o.from || 'Origin';
        const dPoint = o.dropping_point || (typeof o.droppingPoint === 'object' ? (o.droppingPoint?.name || o.droppingPoint?.landmark) : o.droppingPoint) || o.deliveryAddress || o.to || 'Destination';
        const tDate = o.travelDate || o.journeyDate || o.departureDate || o.appointmentDate || o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not provided');
        const dTime = o.departureTime || o.appointmentTimeSlot || o.timeSlot || o.time || 'Not provided';
        const passCount = travelers.length > 0 ? travelers.length : Number(o.passengers || o.passengerCount || o.totalGuests || 1);

        // Service properties - robust schedule extraction
        let sDate = o.serviceDate || o.appointmentDate || o.bookingDate || o.date;
        let sTime = o.serviceTime || o.appointmentTimeSlot || o.timeSlot || o.time;

        if ((!sDate || sDate === 'Not provided' || !sTime || sTime === 'Standard Slot') && o.appointment_slot) {
          if (o.appointment_slot.includes(' at ')) {
            const [dp, tp] = o.appointment_slot.split(' at ');
            if (!sDate || sDate === 'Not provided') sDate = dp.trim();
            if (!sTime || sTime === 'Standard Slot') sTime = tp.trim();
          } else if (!sDate || sDate === 'Not provided') {
            sDate = o.appointment_slot;
          }
        }

        if ((!sDate || sDate === 'Not provided' || !sTime || sTime === 'Standard Slot') && o.product_details) {
          const m = String(o.product_details).match(/[•·]\s*([A-Za-z0-9,\s]+?)\s+at\s+([0-9:AMPMapm\s]+)/);
          if (m) {
            if (!sDate || sDate === 'Not provided') sDate = m[1].trim();
            if (!sTime || sTime === 'Standard Slot') sTime = m[2].trim();
          }
        }

        const finalServiceDate = (sDate && sDate !== 'Not provided') ? sDate : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'On-Demand Service');
        const finalServiceTime = (sTime && sTime !== 'Standard Slot') ? sTime : 'On-Demand / Flexible';

        const rawAddr = o.serviceLocation || o.customerAddress || o.customer_address || o.bookingHolder?.address || o.address || '';
        const cleanLocation = (rawAddr && rawAddr !== 'Not provided' && !rawAddr.includes('N/A (')) ? rawAddr : '';

        return {
          id: o.order_number || o.id || o._id,
          dbId: o._id || o.id,
          customer: primaryPassenger,
          serviceName: resolvedServiceName || 'Service Booking',
          packageName: resolvedPackageName || '',
          dateTime: o.appointment_slot || (finalServiceDate ? `${finalServiceDate} at ${finalServiceTime}` : (o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Just now')),
          amount: `₹${Number(o.finalAmount ?? o.totalAmount ?? o.amount ?? 0).toLocaleString('en-IN')}`,
          status: o.status || 'Pending',
          paymentStatus: payStatus,
          paymentMethod: o.paymentMethod || o.payment_method || '',
          phone: custPhone,
          customerAddress: cleanLocation || o.customerAddress || o.customer_address || '',
          serviceLocation: cleanLocation,
          category: o.category || (isStay ? 'Stay' : isTravel ? 'Travel' : 'Services'),
          bookingCategory: bookingCat,
          serviceDate: finalServiceDate,
          serviceTime: finalServiceTime,
          // Stay fields
          propertyName: propName,
          roomName: roomName,
          checkInDate: cInDate,
          checkInTime: cInTime,
          checkOutDate: cOutDate,
          checkOutTime: cOutTime,
          guestCount: totalGuests,
          // Travel fields
          travelOptionName: travelOptName,
          pickupLocation: bPoint,
          destinationLocation: dPoint,
          travelDate: tDate,
          departureTime: dTime,
          passengerCount: passCount,
          rawOrder: o,
          isBusBooking: isBus,
        };
      })
      .sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
  }, [bookingsRaw]);

  // Job Applications (AMOUNT CLEARED TO REMOVE ₹0)
  const jobsData: Order[] = useMemo(() => {
    return (jobsRaw || [])
      .filter(o => isJobItem(o))
      .map(o => {
        const addrStr = String(o.customerAddress || o.pickupLocation || o.customer_address || '');
        let parsedEducation = o.candidateEducation || o.applicant_education || '';
        let parsedExperience = o.candidateExperience || o.applicant_experience || '';
        let parsedResume = o.candidateResume || o.resume_name || '';

        if (addrStr.includes('•') || addrStr.includes('Resume:')) {
          const parts = addrStr.split('•').map((s: string) => s.trim());
          if (parts.length >= 1 && !parsedEducation && !parts[0].includes('Resume:')) {
            parsedEducation = parts[0];
          }
          if (parts.length >= 2 && !parsedExperience && !parts[1].includes('Resume:')) {
            parsedExperience = parts[1];
          }
          const rPart = parts.find((p: string) => p.includes('Resume:'));
          if (rPart && !parsedResume) {
            parsedResume = rPart.replace(/Resume:\s*/, '').trim();
          }
        }

        const candidateName = o.candidateName || o.customer_name || o.memberName || 'Candidate';
        const candidatePhone = o.candidatePhone || o.customerPhone || o.customer_phone || o.phone || o.memberPhone || '';
        const candidateEmail = o.candidateEmail || o.customer_email || o.applicant_email || o.email || '';
        const resolvedJobTitle = o.jobTitle || (o.items && o.items[0]?.name) || o.product_details || o.name || 'Job Application';
        const resolvedJobId = o.jobId || (o.items && o.items[0]?.productId) || o.productId || 'N/A';
        const subDate = o.applicationDate || o.createdAt
          ? new Date(o.applicationDate || o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Just now';

        return {
          id: o.applicationId || o.order_number || o.id || o._id,
          dbId: o._id || o.id,
          name: resolvedJobTitle,
          jobTitle: resolvedJobTitle,
          jobId: resolvedJobId,
          dateTime: subDate,
          amount: '', // Amount removed as requested by user
          status: o.status || 'APPLICATION RECEIVED',
          image: o.image || (o.items && o.items[0]?.image) || '',
          customerName: candidateName,
          customerPhone: candidatePhone,
          customerAddress: addrStr || '',
          candidateEmail: candidateEmail,
          candidateResume: parsedResume || o.candidateResume,
          candidateEducation: parsedEducation || 'Graduate',
          candidateExperience: parsedExperience || 'Fresher',
          category: 'Jobs',
          rawOrder: o,
        };
      })
      .sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
  }, [jobsRaw]);

  useEffect(() => {
    if (routeParams?.targetId) {
      const tid = String(routeParams.targetId).trim().toLowerCase();
      if (activeSegment === 'Bookings' && bookingsData.length > 0) {
        const found = bookingsData.find(
          b => String(b.id).toLowerCase() === tid || String(b.dbId).toLowerCase() === tid
        );
        if (found) {
          setSelectedBooking(found);
          if (clearRouteParams) clearRouteParams();
        }
      } else if (activeSegment === 'Jobs' && jobsData.length > 0) {
        const found = jobsData.find(
          j => String(j.id).toLowerCase() === tid || String(j.dbId).toLowerCase() === tid
        );
        if (found) {
          setSelectedOrder(found);
          if (clearRouteParams) clearRouteParams();
        }
      } else if (activeSegment === 'Orders' && ordersData.length > 0) {
        const found = ordersData.find(
          o => String(o.id).toLowerCase() === tid || String(o.dbId).toLowerCase() === tid
        );
        if (found) {
          setSelectedOrder(found);
          if (clearRouteParams) clearRouteParams();
        }
      }
    }
  }, [routeParams?.targetId, ordersData, bookingsData, jobsData, activeSegment]);

  const renderBusBookingCard = (item: any) => {
    const raw = item.rawOrder || item;
    const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0 ? raw.travelers : [];
    const travelerNames = travelers.map((t: any) => t.name).join(', ') || item.customerName || item.customer || 'Passenger';
    const isAllocated = checkIsBusSeatAllocated(item);
    const seatDisplay = isAllocated ? getBusSeatDisplay(item) : null;
    const boarding = raw.boarding_point || raw.pickupLocation || 'Boarding Point';
    const dropping = raw.dropping_point || raw.deliveryAddress || raw.customerAddress || 'Dropping Point';

    return (
      <View
        key={item.id}
        style={[
          tw`rounded-2xl p-4 mb-3 border`,
          isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-indigo-100`,
          {
            shadowColor: '#4F46E5',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {/* Top Header Badge Row */}
        <View style={tw`flex-row items-center justify-between mb-2.5`}>
          <View style={[tw`flex-row items-center px-2.5 py-1 rounded-full`, isDark ? tw`bg-indigo-950/60` : tw`bg-indigo-50`]}>
            <Compass size={13} color="#6366F1" style={tw`mr-1.5`} />
            <Text style={tw`text-[11px] font-black text-indigo-600 tracking-wider`}>BUS TICKET BOOKING</Text>
          </View>
          <View
            style={[
              tw`flex-row items-center px-2.5 py-1 rounded-full`,
              isAllocated ? (isDark ? tw`bg-emerald-950/60` : tw`bg-emerald-50`) : (isDark ? tw`bg-amber-950/60` : tw`bg-amber-50`),
            ]}>
            {isAllocated ? (
              <>
                <CheckCircle2 size={12} color="#10B981" style={tw`mr-1`} />
                <Text style={tw`text-[11px] font-bold text-emerald-600`}>Confirmed (Seat: {seatDisplay})</Text>
              </>
            ) : (
              <>
                <Clock size={12} color="#F59E0B" style={tw`mr-1`} />
                <Text style={tw`text-[11px] font-bold text-amber-600`}>Seat Allocation Required</Text>
              </>
            )}
          </View>
        </View>

        {/* Bus Name & Booking ID */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => (item.customerName ? setSelectedOrder(item) : setSelectedBooking(item))}>
          <View style={tw`flex-row items-start justify-between`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={[tw`text-base font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {raw.bus_name || item.name || item.serviceName || 'Intercity Bus'}
              </Text>
              <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                PNR / Booking: <Text style={tw`font-mono font-bold text-indigo-500`}>{item.id}</Text>
              </Text>
            </View>
            <Text style={[tw`text-base font-black text-indigo-600`]}>
              {item.amount && item.amount !== '₹0' ? item.amount : 'Paid'}
            </Text>
          </View>

          {/* Route Strip */}
          <View style={[tw`p-2.5 rounded-xl my-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800` : tw`bg-gray-50`]}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>From</Text>
              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                {boarding}
              </Text>
            </View>
            <View style={tw`px-2 items-center`}>
              <Text style={tw`text-[10px] font-bold text-indigo-500`}>➔</Text>
            </View>
            <View style={tw`flex-1 items-end`}>
              <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>To</Text>
              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                {dropping}
              </Text>
            </View>
          </View>

          {/* Passenger & Seat Details */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center flex-1 mr-2`}>
              <Users size={14} color="#6B7280" style={tw`mr-1.5`} />
              <Text style={[tw`text-xs font-medium`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]} numberOfLines={1}>
                {travelerNames} ({travelers.length || 1} Pax)
              </Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <Phone size={12} color="#6B7280" style={tw`mr-1`} />
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                {item.customerPhone || item.phone || 'Not provided'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Row: Direct "Allocate Seat" Button / Locked Confirmed Badge + Details Button */}
        <View style={tw`flex-row gap-x-2 pt-2 border-t border-gray-100 dark:border-zinc-800`}>
          {isAllocated ? (
            <View
              style={[
                tw`flex-1 py-2.5 px-3 rounded-xl flex-row items-center justify-center border`,
                isDark ? tw`bg-emerald-950/40 border-emerald-800` : tw`bg-emerald-50 border-emerald-200`,
              ]}>
              <CheckCircle2 size={13} color="#10B981" style={tw`mr-1.5`} />
              <Text style={tw`text-emerald-700 dark:text-emerald-300 font-bold text-xs`}>
                ✓ Seat Allocated: {seatDisplay}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openSeatModal(item)}
              style={tw`flex-1 py-2.5 px-3 rounded-xl flex-row items-center justify-center bg-amber-500 shadow-sm`}>
              <Text style={tw`text-white font-black text-xs mr-1.5`}>
                💺 Allocate Seat Now
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => (item.customerName ? setSelectedOrder(item) : setSelectedBooking(item))}
            style={[
              tw`px-3 py-2.5 rounded-xl border items-center justify-center`,
              isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`,
            ]}>
            <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredOrders = ordersData
    .filter(o => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Pending') {
        return ['Pending', 'Order Received', 'Placed', 'New'].includes(o.status);
      }
      if (activeFilter === 'Preparing') {
        return ['Accepted', 'Preparing', 'Confirmed', 'Processing'].includes(o.status);
      }
      if (activeFilter === 'Assigned') {
        return ['Assigned', 'Out for Delivery', 'In Transit'].includes(o.status);
      }
      if (activeFilter === 'Delivered') {
        return ['Delivered', 'Completed'].includes(o.status);
      }
      if (activeFilter === 'Cancelled') {
        return ['Cancelled', 'Declined', 'Rejected'].includes(o.status);
      }
      return o.status === activeFilter;
    })
    .filter(o => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
        (o.customerAddress && o.customerAddress.toLowerCase().includes(q))
      );
    });

  const filteredBookings = bookingsData
    .filter(b => {
      if (bookingCategoryFilter !== 'All' && b.bookingCategory !== bookingCategoryFilter) {
        return false;
      }
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Pending') {
        return ['Pending', 'Order Received', 'Placed', 'New'].includes(b.status);
      }
      if (activeFilter === 'Confirmed') {
        return ['Confirmed', 'Accepted', 'Approved', 'Checked In'].includes(b.status);
      }
      if (activeFilter === 'Preparing' || activeFilter === 'Assigned') {
        return ['Accepted', 'Preparing', 'Confirmed', 'Processing', 'Assigned'].includes(b.status);
      }
      if (activeFilter === 'Delivered' || activeFilter === 'Completed') {
        return ['Delivered', 'Completed'].includes(b.status);
      }
      if (activeFilter === 'Cancelled') {
        return ['Cancelled', 'Declined', 'Rejected'].includes(b.status);
      }
      return b.status === (activeFilter as any);
    })
    .filter(b => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.customer.toLowerCase().includes(q) ||
        b.serviceName.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.phone && b.phone.toLowerCase().includes(q))
      );
    });

  const filteredJobs = jobsData
    .filter(o => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Pending') {
        return ['Pending', 'Application Submitted', 'Applied'].includes(o.status);
      }
      if (activeFilter === 'Reviewed') {
        return ['Reviewed', 'Under Review'].includes(o.status);
      }
      if (activeFilter === 'Shortlisted') {
        return ['Shortlisted'].includes(o.status);
      }
      if (activeFilter === 'Interview Scheduled') {
        return ['Interview Scheduled', 'Interviewing'].includes(o.status);
      }
      return o.status === activeFilter;
    })
    .filter(o => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
        (o.customerAddress && o.customerAddress.toLowerCase().includes(q))
      );
    });

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#18181b' : '#FFFFFF'} />

      {/* Header */}
      <View
        style={[
          isDark ? tw`bg-zinc-900 border-b border-zinc-800` : tw`bg-white`,
          tw`px-5 pb-4`,
          {paddingTop: insets.top + 12},
          {
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        {searchVisible ? (
          <View style={[tw`flex-row items-center justify-between mb-4 px-3 py-1.5 rounded-xl flex-1 mr-2`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
            <View style={tw`flex-row items-center flex-1 mr-2`}>
              <Search size={18} color={isDark ? '#A1A1AA' : '#6B7280'} style={tw`mr-2`} />
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search ${activeSegment.toLowerCase()}...`}
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                style={[tw`flex-1 text-sm p-0 m-0 font-medium`, isDark ? tw`text-white` : tw`text-gray-900`]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={tw`p-1 mr-1`}>
                  <X size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setSearchVisible(false);
                setSearchQuery('');
              }}
              style={tw`pl-2 border-l border-gray-300 dark:border-zinc-700`}>
              <Text style={tw`text-indigo-650 font-bold text-xs`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`text-2xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {activeSegment === 'Jobs' ? 'My Jobs' : activeSegment === 'Orders' ? 'My Orders' : 'My Bookings'}
              </Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity onPress={() => setSearchVisible(true)} style={tw`p-2 mr-1`} activeOpacity={0.7}>
                <Search size={22} color={isDark ? '#A1A1AA' : '#6B7280'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={tw`p-2`} activeOpacity={0.7}>
                <Filter size={22} color={isDark ? '#A1A1AA' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Toggle Segment Bar: My Orders | My Bookings | My Jobs */}
        <View style={[tw`flex-row p-1 rounded-xl mb-4`, isDark ? tw`bg-zinc-950` : tw`bg-gray-100`]}>
          <TouchableOpacity
            onPress={() => {
              setActiveSegment('Orders');
              setActiveFilter('All');
            }}
            style={[
              tw`flex-1 py-2 rounded-lg items-center`,
              activeSegment === 'Orders' ? [tw`shadow-sm`, isDark ? tw`bg-zinc-900` : tw`bg-white`] : {},
            ]}>
            <Text
              style={[
                tw`text-xs font-bold`,
                activeSegment === 'Orders'
                  ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                  : tw`text-gray-500`,
              ]}>
              My Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveSegment('Bookings');
              setActiveFilter('All');
            }}
            style={[
              tw`flex-1 py-2 rounded-lg items-center`,
              activeSegment === 'Bookings' ? [tw`shadow-sm`, isDark ? tw`bg-zinc-900` : tw`bg-white`] : {},
            ]}>
            <Text
              style={[
                tw`text-xs font-bold`,
                activeSegment === 'Bookings'
                  ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                  : tw`text-gray-500`,
              ]}>
              My Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveSegment('Jobs');
              setActiveFilter('All');
            }}
            style={[
              tw`flex-1 py-2 rounded-lg items-center`,
              activeSegment === 'Jobs' ? [tw`shadow-sm`, isDark ? tw`bg-zinc-900` : tw`bg-white`] : {},
            ]}>
            <Text
              style={[
                tw`text-xs font-bold`,
                activeSegment === 'Jobs'
                  ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                  : tw`text-gray-500`,
              ]}>
              My Jobs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Booking Category Pills (Services, Stay, Travel) */}
        {activeSegment === 'Bookings' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-2.5`}>
            {(['All', 'Services', 'Stay', 'Travel'] as const).map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setBookingCategoryFilter(cat)}
                style={[
                  tw`mr-2 px-3.5 py-1.5 rounded-xl border`,
                  bookingCategoryFilter === cat
                    ? { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }
                    : isDark
                    ? [tw`bg-zinc-800/80`, { borderColor: '#3F3F46' }]
                    : [tw`bg-gray-100`, { borderColor: '#E5E7EB' }],
                ]}>
                <Text
                  style={[
                    tw`text-xs font-bold`,
                    bookingCategoryFilter === cat
                      ? tw`text-white`
                      : isDark
                      ? tw`text-zinc-300`
                      : tw`text-gray-700`,
                  ]}>
                  {cat === 'All' ? 'All Bookings' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {currentStatusFilters.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter as any)}
              style={[
                tw`mr-2.5 px-5 py-2 rounded-full`,
                activeFilter === filter
                  ? {backgroundColor: '#4F46E5'}
                  : isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}>
              <Text
                style={[
                  tw`font-semibold text-sm`,
                  activeFilter === filter
                    ? tw`text-white`
                    : isDark ? tw`text-zinc-300` : tw`text-gray-600`,
                ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pt-4 pb-6`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }>
        {((activeSegment === 'Orders' && loadingOrders && ordersRaw.length === 0) ||
          (activeSegment === 'Bookings' && loadingBookings && bookingsRaw.length === 0) ||
          (activeSegment === 'Jobs' && loadingJobs && jobsRaw.length === 0)) ? (
          <View style={tw`py-16 items-center justify-center`}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[tw`mt-3 text-xs font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Loading {activeSegment === 'Orders' ? 'Orders' : activeSegment === 'Bookings' ? 'Bookings' : 'Jobs'}...
            </Text>
          </View>
        ) : activeSegment === 'Orders' ? (
          filteredOrders.length === 0 ? (
            <View style={tw`py-16 items-center justify-center`}>
              <Package size={48} color={isDark ? '#52525B' : '#D1D5DB'} />
              <Text style={[tw`mt-4 text-base font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                No Orders Found
              </Text>
            </View>
          ) : (
            filteredOrders.map(order => {
              if (order.isBusBooking) {
                return renderBusBookingCard(order);
              }
              const config = statusConfig[order.status] || {
                color: '#4B5563',
                bgColor: '#F3F4F6',
              };
              const isPaid = (order.paymentStatus === 'Paid' || ['Delivered', 'Completed'].includes(order.status));
              const pMethod = (order.paymentMethod || order.rawOrder?.paymentMethod || order.rawOrder?.payment_method || '').toLowerCase();
              const isCod = pMethod.includes('cod') || pMethod.includes('cash');

              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedOrder(order)}
                  style={[
                    tw`rounded-2xl p-4 mb-3 border`,
                    isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                    {
                      shadowColor: '#000',
                      shadowOffset: {width: 0, height: 2},
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    },
                  ]}>
                  {/* Header Row: Order ID + Status Badges */}
                  <View style={tw`flex-row items-center justify-between mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={[tw`font-extrabold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        #{order.id}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center gap-x-1.5`}>
                      {/* Payment Status Badge */}
                      <View
                        style={[
                          tw`px-2.5 py-1 rounded-full border`,
                          isPaid
                            ? (isDark ? tw`bg-emerald-950/60 border-emerald-800` : tw`bg-emerald-50 border-emerald-200`)
                            : isCod
                            ? (isDark ? tw`bg-amber-950/60 border-amber-800` : tw`bg-amber-50 border-amber-200`)
                            : (isDark ? tw`bg-red-950/60 border-red-800` : tw`bg-red-50 border-red-200`),
                        ]}>
                        <Text
                          style={[
                            tw`text-[11px] font-bold`,
                            isPaid
                              ? tw`text-emerald-600`
                              : isCod
                              ? tw`text-amber-600`
                              : tw`text-red-600`,
                          ]}>
                          {isPaid ? '✓ Paid' : isCod ? 'COD Pending' : (order.paymentStatus || 'Pending')}
                        </Text>
                      </View>

                      {/* Order Status Badge */}
                      <View
                        style={[
                          tw`px-2.5 py-1 rounded-full`,
                          {backgroundColor: config.bgColor},
                        ]}>
                        <Text
                          style={[
                            tw`text-[11px] font-bold`,
                            {color: config.color},
                          ]}>
                          {order.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Body: Product Image + Product Details + Quantity */}
                  <View style={tw`flex-row items-start mb-3`}>
                    {order.image ? (
                      <Image
                        source={{ uri: order.image }}
                        style={tw`w-16 h-16 rounded-xl mr-3 bg-gray-100`}
                      />
                    ) : (
                      <View style={[tw`w-16 h-16 rounded-xl mr-3 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                        <Package size={24} color="#6B7280" />
                      </View>
                    )}

                    <View style={tw`flex-1`}>
                      <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]} numberOfLines={2}>
                        {order.name}
                      </Text>
                      <View style={tw`flex-row items-center mt-1 flex-wrap gap-1.5`}>
                        <View style={[tw`px-2 py-0.5 rounded-md`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                          <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>
                            Qty: {order.quantity || 1}
                          </Text>
                        </View>
                        <View style={[tw`px-2 py-0.5 rounded-md`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                          <Text style={[tw`text-[11px] font-semibold text-indigo-600`]}>
                            {order.category || 'Product'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Customer Info Strip */}
                  <View style={[tw`p-2.5 rounded-xl mb-3 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/70` : tw`bg-gray-50`]}>
                    <View style={tw`flex-row items-center flex-1 mr-2`}>
                      <Users size={14} color="#6B7280" style={tw`mr-1.5`} />
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                        {order.customerName}
                      </Text>
                    </View>
                    {order.customerPhone ? (
                      <View style={tw`flex-row items-center`}>
                        <Phone size={12} color="#6B7280" style={tw`mr-1`} />
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {order.customerPhone}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Footer Row: Date & Time + Amount + Arrow */}
                  <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                    <View style={tw`flex-row items-center`}>
                      <Clock size={13} color="#9CA3AF" style={tw`mr-1.5`} />
                      <Text style={[tw`text-xs font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        {order.dateTime}
                      </Text>
                    </View>

                    <View style={tw`flex-row items-center`}>
                      <Text style={[tw`text-base font-extrabold mr-2`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {order.amount}
                      </Text>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : activeSegment === 'Bookings' ? (
          filteredBookings.length === 0 ? (
            <View style={tw`py-16 items-center justify-center`}>
              <CalendarCheck size={48} color={isDark ? '#52525B' : '#D1D5DB'} />
              <Text style={[tw`mt-4 text-base font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                No Bookings Found
              </Text>
            </View>
          ) : (
            filteredBookings.map(booking => {
              if (booking.isBusBooking) {
                return renderBusBookingCard(booking);
              }
              const config = (bookingStatusConfig as any)[booking.status] || {
                color: '#4B5563',
                bgColor: '#F3F4F6',
                icon: Clock,
              };
              const isPaid = (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Completed' || ['Completed', 'Delivered', 'Checked Out'].includes(booking.status));

              if (booking.bookingCategory === 'Stay') {
                return (
                  <TouchableOpacity
                    key={booking.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedBooking(booking)}
                    style={[
                      tw`rounded-2xl p-4 mb-3 border`,
                      isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-amber-100`,
                      {
                        shadowColor: '#F59E0B',
                        shadowOffset: {width: 0, height: 2},
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                      },
                    ]}>
                    {/* Header Row: Stay Tag + Booking ID + Status Badges */}
                    <View style={tw`flex-row items-center justify-between mb-2.5`}>
                      <View style={[tw`flex-row items-center px-2.5 py-1 rounded-full`, isDark ? tw`bg-amber-950/60` : tw`bg-amber-50`]}>
                        <CalendarCheck size={13} color="#D97706" style={tw`mr-1.5`} />
                        <Text style={tw`text-[11px] font-black text-amber-700 dark:text-amber-400 tracking-wider`}>STAY BOOKING</Text>
                      </View>

                      <View style={tw`flex-row items-center gap-x-1.5`}>
                        <View
                          style={[
                            tw`px-2.5 py-1 rounded-full border`,
                            isPaid
                              ? (isDark ? tw`bg-emerald-950/60 border-emerald-800` : tw`bg-emerald-50 border-emerald-200`)
                              : (isDark ? tw`bg-amber-950/60 border-amber-800` : tw`bg-amber-50 border-amber-200`),
                          ]}>
                          <Text style={[tw`text-[11px] font-bold`, isPaid ? tw`text-emerald-600` : tw`text-amber-600`]}>
                            {isPaid ? '✓ Paid' : (booking.paymentStatus || 'Pending')}
                          </Text>
                        </View>
                        <View style={[tw`px-2.5 py-1 rounded-full`, {backgroundColor: config.bgColor}]}>
                          <Text style={[tw`text-[11px] font-bold`, {color: config.color}]}>
                            {booking.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Property Name & Accommodation */}
                    <View style={tw`mb-2.5`}>
                      <Text style={[tw`text-base font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {booking.propertyName || 'Hotel Stay'}
                      </Text>
                      <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        Booking ID: <Text style={tw`font-mono font-bold text-amber-600 dark:text-amber-400`}>#{booking.id}</Text>
                        {booking.roomName ? ` • ${booking.roomName}` : ''}
                      </Text>
                    </View>

                    {/* Schedule Strip: Check-in and Check-out Displayed Separately */}
                    <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/80` : tw`bg-amber-50/50`]}>
                      <View style={tw`flex-1 mr-2`}>
                        <Text style={tw`text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400`}>Check-In</Text>
                        <Text style={[tw`text-xs font-extrabold mt-0.5`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]}>
                          {booking.checkInDate}
                        </Text>
                        <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          {booking.checkInTime}
                        </Text>
                      </View>
                      <View style={tw`h-8 w-[1px] bg-gray-200 dark:bg-zinc-700 mr-2`} />
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400`}>Check-Out</Text>
                        <Text style={[tw`text-xs font-extrabold mt-0.5`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]}>
                          {booking.checkOutDate}
                        </Text>
                        <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          {booking.checkOutTime}
                        </Text>
                      </View>
                    </View>

                    {/* Guest & Customer Info */}
                    <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/60` : tw`bg-gray-50`]}>
                      <View style={tw`flex-row items-center flex-1 mr-2`}>
                        <Users size={14} color="#6B7280" style={tw`mr-1.5`} />
                        <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                          {booking.customer} ({booking.guestCount || 1} Guests)
                        </Text>
                      </View>
                      {booking.phone ? (
                        <View style={tw`flex-row items-center`}>
                          <Phone size={12} color="#6B7280" style={tw`mr-1`} />
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                            {booking.phone}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer Row */}
                    <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                      <Text style={[tw`text-base font-extrabold text-amber-600 dark:text-amber-400`]}>
                        {booking.amount}
                      </Text>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                );
              }

              if (booking.bookingCategory === 'Travel') {
                return (
                  <TouchableOpacity
                    key={booking.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedBooking(booking)}
                    style={[
                      tw`rounded-2xl p-4 mb-3 border`,
                      isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-blue-100`,
                      {
                        shadowColor: '#2563EB',
                        shadowOffset: {width: 0, height: 2},
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                      },
                    ]}>
                    {/* Header Row: Travel Tag + Booking ID + Status Badges */}
                    <View style={tw`flex-row items-center justify-between mb-2.5`}>
                      <View style={[tw`flex-row items-center px-2.5 py-1 rounded-full`, isDark ? tw`bg-blue-950/60` : tw`bg-blue-50`]}>
                        <Compass size={13} color="#2563EB" style={tw`mr-1.5`} />
                        <Text style={tw`text-[11px] font-black text-blue-700 dark:text-blue-400 tracking-wider`}>TRAVEL BOOKING</Text>
                      </View>

                      <View style={tw`flex-row items-center gap-x-1.5`}>
                        <View
                          style={[
                            tw`px-2.5 py-1 rounded-full border`,
                            isPaid
                              ? (isDark ? tw`bg-emerald-950/60 border-emerald-800` : tw`bg-emerald-50 border-emerald-200`)
                              : (isDark ? tw`bg-amber-950/60 border-amber-800` : tw`bg-amber-50 border-amber-200`),
                          ]}>
                          <Text style={[tw`text-[11px] font-bold`, isPaid ? tw`text-emerald-600` : tw`text-amber-600`]}>
                            {isPaid ? '✓ Paid' : (booking.paymentStatus || 'Pending')}
                          </Text>
                        </View>
                        <View style={[tw`px-2.5 py-1 rounded-full`, {backgroundColor: config.bgColor}]}>
                          <Text style={[tw`text-[11px] font-bold`, {color: config.color}]}>
                            {booking.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Travel Option Name & Booking ID */}
                    <View style={tw`mb-2.5`}>
                      <Text style={[tw`text-base font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {booking.travelOptionName || 'Travel Booking'}
                      </Text>
                      <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        Booking ID: <Text style={tw`font-mono font-bold text-blue-600 dark:text-blue-400`}>#{booking.id}</Text>
                        {booking.travelDate ? ` • ${booking.travelDate} at ${booking.departureTime}` : ''}
                      </Text>
                    </View>

                    {/* Route Strip: Origin ➔ Destination */}
                    <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/80` : tw`bg-blue-50/50`]}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>From</Text>
                        <Text style={[tw`text-xs font-extrabold mt-0.5`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]} numberOfLines={1}>
                          {booking.pickupLocation || 'Origin'}
                        </Text>
                      </View>
                      <View style={tw`px-2 items-center`}>
                        <Text style={tw`text-xs font-bold text-blue-500`}>➔</Text>
                      </View>
                      <View style={tw`flex-1 items-end`}>
                        <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>To</Text>
                        <Text style={[tw`text-xs font-extrabold mt-0.5`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]} numberOfLines={1}>
                          {booking.destinationLocation || 'Destination'}
                        </Text>
                      </View>
                    </View>

                    {/* Passenger & Customer Info */}
                    <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/60` : tw`bg-gray-50`]}>
                      <View style={tw`flex-row items-center flex-1 mr-2`}>
                        <Users size={14} color="#6B7280" style={tw`mr-1.5`} />
                        <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                          {booking.customer} ({booking.passengerCount || 1} Pax)
                        </Text>
                      </View>
                      {booking.phone ? (
                        <View style={tw`flex-row items-center`}>
                          <Phone size={12} color="#6B7280" style={tw`mr-1`} />
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                            {booking.phone}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer Row */}
                    <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                      <Text style={[tw`text-base font-extrabold text-blue-600 dark:text-blue-400`]}>
                        {booking.amount}
                      </Text>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                );
              }

              // Default: Services Booking Card
              return (
                <TouchableOpacity
                  key={booking.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedBooking(booking)}
                  style={[
                    tw`rounded-2xl p-4 mb-3 border`,
                    isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-teal-100`,
                    {
                      shadowColor: '#0D9488',
                      shadowOffset: {width: 0, height: 2},
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    },
                  ]}>
                  {/* Header Row: Service Tag + Booking ID + Status Badges */}
                  <View style={tw`flex-row items-center justify-between mb-2.5`}>
                    <View style={[tw`flex-row items-center px-2.5 py-1 rounded-full`, isDark ? tw`bg-teal-950/60` : tw`bg-teal-50`]}>
                      <CalendarCheck size={13} color="#0D9488" style={tw`mr-1.5`} />
                      <Text style={tw`text-[11px] font-black text-teal-700 dark:text-teal-400 tracking-wider`}>SERVICE BOOKING</Text>
                    </View>

                    <View style={tw`flex-row items-center gap-x-1.5`}>
                      <View
                        style={[
                          tw`px-2.5 py-1 rounded-full border`,
                          isPaid
                            ? (isDark ? tw`bg-emerald-950/60 border-emerald-800` : tw`bg-emerald-50 border-emerald-200`)
                            : (isDark ? tw`bg-amber-950/60 border-amber-800` : tw`bg-amber-50 border-amber-200`),
                        ]}>
                        <Text style={[tw`text-[11px] font-bold`, isPaid ? tw`text-emerald-600` : tw`text-amber-600`]}>
                          {isPaid ? '✓ Paid' : (booking.paymentStatus || 'Pending')}
                        </Text>
                      </View>
                      <View style={[tw`px-2.5 py-1 rounded-full`, {backgroundColor: config.bgColor}]}>
                        <Text style={[tw`text-[11px] font-bold`, {color: config.color}]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Service Name & Booking ID */}
                  <View style={tw`mb-2.5`}>
                    <Text style={[tw`text-base font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {booking.serviceName}
                    </Text>
                    {booking.packageName ? (
                      <View style={[tw`mt-1 self-start px-2 py-0.5 rounded-md`, isDark ? tw`bg-teal-950/70` : tw`bg-teal-50`]}>
                        <Text style={tw`text-[10px] font-bold text-teal-700 dark:text-teal-400`}>
                          📦 {booking.packageName}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[tw`text-xs mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Booking ID: <Text style={tw`font-mono font-bold text-teal-600 dark:text-teal-400`}>#{booking.id}</Text>
                    </Text>
                  </View>

                  {/* Schedule Box: Service Date and Time clearly visible */}
                  <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/80` : tw`bg-teal-50/50`]}>
                    <View style={tw`flex-row items-center flex-1 mr-2`}>
                      <Calendar size={14} color="#0D9488" style={tw`mr-1.5`} />
                      <Text style={[tw`text-xs font-extrabold`, isDark ? tw`text-zinc-100` : tw`text-gray-900`]}>
                        Date: {booking.serviceDate || booking.dateTime}
                      </Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                      <Clock size={13} color="#0D9488" style={tw`mr-1`} />
                      <Text style={[tw`text-xs font-bold text-teal-700 dark:text-teal-400`]}>
                        Slot: {booking.serviceTime || 'Standard'}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Info Strip */}
                  <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-800/60` : tw`bg-gray-50`]}>
                    <View style={tw`flex-row items-center flex-1 mr-2`}>
                      <Users size={14} color="#6B7280" style={tw`mr-1.5`} />
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                        {booking.customer}
                      </Text>
                    </View>
                    {booking.phone ? (
                      <View style={tw`flex-row items-center`}>
                        <Phone size={12} color="#6B7280" style={tw`mr-1`} />
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {booking.phone}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Service Execution Location / Address */}
                  {(booking.serviceLocation || booking.customerAddress) ? (
                    <View style={[tw`p-2.5 rounded-xl mb-2.5 flex-row items-start`, isDark ? tw`bg-zinc-800/40` : tw`bg-teal-50/40`]}>
                      <MapPin size={13} color="#0D9488" style={tw`mr-1.5 mt-0.5 shrink-0`} />
                      <Text style={[tw`text-xs flex-1 font-semibold`, isDark ? tw`text-zinc-300` : tw`text-teal-900`]} numberOfLines={2}>
                        {booking.serviceLocation || booking.customerAddress}
                      </Text>
                    </View>
                  ) : null}

                  {/* Footer Row */}
                  <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                    <Text style={[tw`text-base font-extrabold text-teal-600 dark:text-teal-400`]}>
                      {booking.amount}
                    </Text>
                    <ChevronRight size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          /* Jobs Tab Content */
          filteredJobs.length === 0 ? (
            <View style={tw`py-16 items-center justify-center`}>
              <Briefcase size={48} color={isDark ? '#52525B' : '#D1D5DB'} />
              <Text style={[tw`mt-4 text-base font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                No Job Applications Found
              </Text>
            </View>
          ) : (
            filteredJobs.map(order => {
              const config = statusConfig[order.status] || {
                color: '#4B5563',
                bgColor: '#F3F4F6',
              };

              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedOrder(order)}
                  style={[
                    tw`rounded-2xl p-4 mb-3 border`,
                    isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-purple-100`,
                    {
                      shadowColor: '#8B5CF6',
                      shadowOffset: {width: 0, height: 2},
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    },
                  ]}>
                  {/* Header Row: Application Tag + Application ID + Status Badge */}
                  <View style={tw`flex-row items-center justify-between mb-2.5`}>
                    <View style={[tw`flex-row items-center px-2.5 py-1 rounded-full`, isDark ? tw`bg-purple-950/60` : tw`bg-purple-50`]}>
                      <Briefcase size={13} color="#8B5CF6" style={tw`mr-1.5`} />
                      <Text style={tw`text-[11px] font-black text-purple-700 dark:text-purple-400 tracking-wider`}>JOB APPLICATION</Text>
                    </View>

                    <View style={[tw`px-2.5 py-1 rounded-full`, {backgroundColor: config.bgColor}]}>
                      <Text style={[tw`text-[11px] font-bold`, {color: config.color}]}>
                        {order.status}
                      </Text>
                    </View>
                  </View>

                  {/* Candidate Name & Contact Details */}
                  <View style={tw`mb-2.5`}>
                    <Text style={[tw`text-base font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {order.customerName}
                    </Text>
                    <View style={tw`flex-row items-center mt-1 flex-wrap gap-x-3 gap-y-1`}>
                      {order.customerPhone ? (
                        <View style={tw`flex-row items-center`}>
                          <Phone size={12} color="#6B7280" style={tw`mr-1`} />
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>
                            {order.customerPhone}
                          </Text>
                        </View>
                      ) : null}
                      {order.candidateEmail ? (
                        <View style={tw`flex-row items-center`}>
                          <Mail size={12} color="#6B7280" style={tw`mr-1`} />
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                            {order.candidateEmail}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Job Position & Reference ID Box */}
                  <View style={[tw`p-2.5 rounded-xl mb-2.5`, isDark ? tw`bg-zinc-800/80` : tw`bg-purple-50/50`]}>
                    <Text style={[tw`text-xs font-extrabold text-purple-700 dark:text-purple-300`]}>
                      Role: {order.jobTitle || order.name}
                    </Text>
                    <View style={tw`flex-row items-center justify-between mt-1`}>
                      <Text style={[tw`text-[10px] font-mono`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        App ID: <Text style={tw`font-bold text-indigo-500`}>#{order.id}</Text>
                      </Text>
                      {order.jobId && order.jobId !== 'N/A' ? (
                        <Text style={[tw`text-[10px] font-mono`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          Job ID: #{order.jobId}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Profile Highlights: Education, Experience, Resume */}
                  <View style={tw`flex-row items-center flex-wrap gap-1.5 mb-2.5`}>
                    <View style={[tw`px-2 py-0.5 rounded-md flex-row items-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <GraduationCap size={11} color="#6B7280" style={tw`mr-1`} />
                      <Text style={[tw`text-[10px] font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        {order.candidateEducation || 'Graduate'}
                      </Text>
                    </View>
                    <View style={[tw`px-2 py-0.5 rounded-md flex-row items-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <Briefcase size={11} color="#6B7280" style={tw`mr-1`} />
                      <Text style={[tw`text-[10px] font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        Exp: {order.candidateExperience || 'Fresher'}
                      </Text>
                    </View>
                    {order.candidateResume ? (
                      <View style={[tw`px-2 py-0.5 rounded-md flex-row items-center`, isDark ? tw`bg-indigo-950/60` : tw`bg-indigo-50`]}>
                        <FileText size={11} color="#6366F1" style={tw`mr-1`} />
                        <Text style={[tw`text-[10px] font-bold text-indigo-600`]}>
                          CV Attached
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Footer Row: Applied Date + Details Arrow */}
                  <View style={[tw`flex-row items-center justify-between pt-2.5 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                    <View style={tw`flex-row items-center`}>
                      <Clock size={12} color="#9CA3AF" style={tw`mr-1.5`} />
                      <Text style={[tw`text-xs font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        Applied: {order.dateTime}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      {selectedOrder && (() => {
        const isJob = isJobItem(selectedOrder);
        const isBus = isBusOrder(selectedOrder);
        const raw = selectedOrder.rawOrder || selectedOrder;
        const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0 ? raw.travelers : [];
        const isAllocated = checkIsBusSeatAllocated(selectedOrder);
        const seatDisplay = isAllocated ? getBusSeatDisplay(selectedOrder) : null;
        const boarding = raw.boarding_point || raw.pickupLocation || 'Boarding Point';
        const dropping = raw.dropping_point || raw.deliveryAddress || raw.customerAddress || 'Dropping Point';

        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={!!selectedOrder}
            onRequestClose={() => setSelectedOrder(null)}>
            <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
              <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
                {/* Header */}
                <View style={tw`flex-row justify-between items-center mb-5`}>
                  <View>
                    <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {isJob ? 'Application Details' : isBus ? 'Bus Booking Details' : 'Order Details'}
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                      {isJob ? 'Application ID: ' : isBus ? 'PNR / Booking: ' : 'Order ID: '}{selectedOrder.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedOrder(null)}
                    style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                    <X size={18} color={isDark ? '#E4E4E7' : '#4B5563'} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-5`}>
                  {/* Item Details Card */}
                  <View style={[tw`rounded-2xl p-4 mb-4 flex-row items-center border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-gray-50 border-gray-100`]}>
                    {selectedOrder.image ? (
                      <Image source={{uri: selectedOrder.image}} style={tw`w-16 h-16 rounded-xl mr-4`} />
                    ) : isJob ? (
                      <View style={[tw`w-16 h-16 rounded-xl mr-4 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`]}>
                        <Briefcase size={26} color="#4F46E5" />
                      </View>
                    ) : isBus ? (
                      <View style={[tw`w-16 h-16 rounded-xl mr-4 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-pink-50`]}>
                        <Compass size={26} color="#E11D48" />
                      </View>
                    ) : (
                      <View style={[tw`w-16 h-16 rounded-xl mr-4 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                        <Package size={24} color="#6B7280" />
                      </View>
                    )}
                    <View style={tw`flex-1`}>
                      <Text style={[tw`font-extrabold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>{selectedOrder.name}</Text>
                      <Text style={[tw`text-xs text-gray-400 mt-0.5`]}>{selectedOrder.dateTime}</Text>
                      {!isJob && selectedOrder.amount && selectedOrder.amount !== '₹0' && (
                        <Text style={[tw`text-sm font-black text-indigo-600 mt-1`]}>{selectedOrder.amount}</Text>
                      )}
                    </View>
                    <View style={[tw`px-3 py-1.5 rounded-full`, {backgroundColor: statusConfig[selectedOrder.status]?.bgColor || '#F3F4F6'}]}>
                      <Text style={[tw`text-xs font-bold`, {color: statusConfig[selectedOrder.status]?.color || '#4B5563'}]}>
                        {selectedOrder.status}
                      </Text>
                    </View>
                  </View>

                  {/* Bus Journey & Seat Details Section */}
                  {isBus && (
                    <View style={[tw`rounded-2xl p-4 mb-4 border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Bus Route & Timing
                      </Text>
                      <View style={[tw`p-3 rounded-xl mb-3 flex-row items-center justify-between`, isDark ? tw`bg-zinc-900` : tw`bg-indigo-50/50`]}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>Boarding Point</Text>
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{boarding}</Text>
                        </View>
                        <View style={tw`px-2`}>
                          <Text style={tw`text-indigo-600 font-bold`}>➔</Text>
                        </View>
                        <View style={tw`flex-1 items-end`}>
                          <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>Dropping Point</Text>
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{dropping}</Text>
                        </View>
                      </View>

                      {/* Seat Allocation Status Card */}
                      <View style={[tw`p-3.5 rounded-xl border mb-3`, isAllocated ? (isDark ? tw`bg-emerald-950/30 border-emerald-900` : tw`bg-emerald-50 border-emerald-200`) : (isDark ? tw`bg-amber-950/30 border-amber-900` : tw`bg-amber-50 border-amber-200`)]}>
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                          <View style={tw`flex-row items-center`}>
                            {isAllocated ? (
                              <CheckCircle2 size={16} color="#10B981" style={tw`mr-1.5`} />
                            ) : (
                              <Clock size={16} color="#F59E0B" style={tw`mr-1.5`} />
                            )}
                            <Text style={[tw`text-xs font-black`, isAllocated ? tw`text-emerald-700 dark:text-emerald-300` : tw`text-amber-800 dark:text-amber-300`]}>
                              {isAllocated ? `Seat Confirmed: ${seatDisplay}` : 'Seat Pending Allocation'}
                            </Text>
                          </View>
                          {!isAllocated ? (
                            <TouchableOpacity
                              onPress={() => openSeatModal(selectedOrder)}
                              style={tw`px-3 py-1.5 rounded-lg shadow-sm bg-amber-500`}>
                              <Text style={tw`text-white font-black text-xs`}>
                                Allocate Seat
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={[tw`px-2.5 py-1 rounded-md`, isDark ? tw`bg-emerald-900/40` : tw`bg-emerald-100`]}>
                              <Text style={tw`text-emerald-700 dark:text-emerald-300 font-bold text-[11px]`}>Locked</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {isAllocated
                            ? 'Seat allocation is confirmed and locked. Passenger has access to confirmed seat on their boarding pass.'
                            : 'Customer is waiting for seat number. Click "Allocate Seat" to assign and confirm.'}
                        </Text>
                      </View>

                      {/* Passenger Breakdown */}
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Passengers ({travelers.length || 1})
                      </Text>
                      {(travelers.length > 0 ? travelers : [{ name: selectedOrder.customerName || 'Passenger 1', seat: raw.seat || '' }]).map((t: any, idx: number) => {
                        const tSeat = (t.seat && !String(t.seat).toLowerCase().includes('pending')) ? t.seat : null;
                        return (
                          <View key={idx} style={[tw`p-2.5 rounded-xl border mb-1.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-gray-50 border-gray-100`]}>
                            <View style={tw`flex-row items-center`}>
                              <View style={[tw`w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 items-center justify-center mr-2`]}>
                                <Text style={tw`text-[10px] font-bold text-indigo-600`}>{idx + 1}</Text>
                              </View>
                              <View>
                                <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>{t.name || `Passenger ${idx + 1}`}</Text>
                                {(t.age || t.gender) && (
                                  <Text style={tw`text-[10px] text-gray-400`}>{[t.age ? `${t.age} yrs` : '', t.gender].filter(Boolean).join(' • ')}</Text>
                                )}
                              </View>
                            </View>
                            <View style={[tw`px-2 py-0.5 rounded-md`, tSeat ? tw`bg-emerald-100 dark:bg-emerald-950` : tw`bg-amber-100 dark:bg-amber-950`]}>
                              <Text style={[tw`text-[10px] font-black`, tSeat ? tw`text-emerald-700 dark:text-emerald-300` : tw`text-amber-700 dark:text-amber-300`]}>
                                {tSeat ? `Seat ${tSeat}` : 'Seat Pending'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Customer / Applicant Details Box */}
                  {isJob ? (
                    <View style={[tw`rounded-2xl p-4 border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Applicant Details
                      </Text>

                      {/* Name & Phone */}
                      <View style={tw`flex-row items-center justify-between mb-3`}>
                        <View style={tw`flex-row items-center flex-1 mr-2`}>
                          <View style={[tw`w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-3`, isDark && tw`bg-indigo-950`]}>
                            <Text style={tw`text-indigo-600 font-bold text-base`}>
                              {(selectedOrder.customerName || 'A').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={[tw`font-extrabold text-sm`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                              {selectedOrder.customerName || 'Candidate'}
                            </Text>
                            <Text style={[tw`text-[11px] text-indigo-500 font-semibold`]}>Job Applicant</Text>
                          </View>
                        </View>
                        <View style={tw`flex-row items-center`}>
                          <Phone size={13} color="#6B7280" style={tw`mr-1.5`} />
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                            {selectedOrder.customerPhone}
                          </Text>
                        </View>
                      </View>

                      {/* Application & Job Identifiers */}
                      <View style={[tw`flex-row justify-between items-center py-2 border-t`, isDark ? tw`border-zinc-850` : tw`border-gray-50`]}>
                        <View>
                          <Text style={[tw`text-[10px] font-bold uppercase`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Application ID</Text>
                          <Text style={[tw`text-xs font-mono font-bold text-indigo-500`]}>
                            #{selectedOrder.rawOrder?.applicationId || selectedOrder.id}
                          </Text>
                        </View>
                        <View style={tw`items-end`}>
                          <Text style={[tw`text-[10px] font-bold uppercase`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Job ID</Text>
                          <Text style={[tw`text-xs font-mono font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                            #{selectedOrder.rawOrder?.jobId || selectedOrder.rawOrder?.productId || 'JOB-101'}
                          </Text>
                        </View>
                      </View>

                      {/* Email */}
                      <View style={[tw`flex-row items-center py-2.5 border-t`, isDark ? tw`border-zinc-850` : tw`border-gray-50`]}>
                        <Mail size={14} color="#6B7280" style={tw`mr-2.5`} />
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          {selectedOrder.candidateEmail || selectedOrder.rawOrder?.applicant_email || selectedOrder.rawOrder?.candidateEmail || 'uma@connectapp.com'}
                        </Text>
                      </View>

                      {/* Badges: Education & Experience */}
                      <View style={[tw`flex-row flex-wrap gap-2 py-3 border-t`, isDark ? tw`border-zinc-850` : tw`border-gray-50`]}>
                        <View style={[tw`flex-row items-center px-3 py-1.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-slate-50 border-slate-200`]}>
                          <GraduationCap size={14} color="#4F46E5" style={tw`mr-2`} />
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-slate-800`]}>
                            {selectedOrder.candidateEducation || selectedOrder.rawOrder?.applicant_education || 'B.Tech in Computer Science'}
                          </Text>
                        </View>
                        <View style={[tw`flex-row items-center px-3 py-1.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-amber-50 border-amber-200`]}>
                          <Clock size={14} color="#D97706" style={tw`mr-2`} />
                          <Text style={[tw`text-xs font-bold text-amber-800 dark:text-amber-400`]}>
                            {selectedOrder.candidateExperience || selectedOrder.rawOrder?.applicant_experience || '2years'}
                          </Text>
                        </View>
                      </View>

                      {/* Resume Box with Download Option */}
                      <View style={[tw`p-3.5 rounded-xl border mt-2`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-blue-50/50 border-blue-100`]}>
                        <View style={tw`flex-row items-center justify-between`}>
                          <View style={tw`flex-row items-center flex-1 mr-2`}>
                            <View style={[tw`w-9 h-9 rounded-lg items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : tw`bg-white`]}>
                              <FileText size={18} color="#0284C7" />
                            </View>
                            <View style={tw`flex-1`}>
                              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-slate-800`]} numberOfLines={1}>
                                {selectedOrder.candidateResume || selectedOrder.rawOrder?.resume_name || 'ForgeConnect_Resume.pdf'}
                              </Text>
                              <Text style={tw`text-[10px] text-gray-400`}>Attached Resume • Submitted</Text>
                            </View>
                          </View>

                          {/* Download Button */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                              const rName = selectedOrder.candidateResume || selectedOrder.rawOrder?.resume_name || 'ForgeConnect_Resume.pdf';
                              Alert.alert('Download Resume', `Downloading "${rName}" to your device...\n\nStatus: Saved to Downloads folder!`);
                            }}
                            style={[tw`flex-row items-center px-3 py-2 rounded-lg bg-indigo-600 shadow-sm`]}>
                            <Download size={13} color="#FFFFFF" style={tw`mr-1.5`} />
                            <Text style={tw`text-white font-bold text-xs`}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={[tw`rounded-2xl p-4 border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          Customer Information
                        </Text>
                        <View style={tw`flex-row items-center mb-3`}>
                          <View style={[tw`w-8 h-8 rounded-full bg-indigo-50 items-center justify-center mr-3`, isDark && tw`bg-indigo-950`]}>
                            <Text style={tw`text-indigo-650 font-bold text-sm`}>
                              {selectedOrder.customerName.charAt(0)}
                            </Text>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{selectedOrder.customerName}</Text>
                            <Text style={tw`text-[11px] font-mono text-indigo-500 font-semibold mt-0.5`}>ID: {getCustomerDisplayId(selectedOrder)}</Text>
                          </View>
                        </View>
                        <View style={[tw`flex-row items-center py-2.5 border-b`, isDark ? tw`border-zinc-850` : tw`border-gray-50`]}>
                          <Phone size={14} color="#6B7280" style={tw`mr-3`} />
                          <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{selectedOrder.customerPhone}</Text>
                        </View>
                        <View style={tw`flex-row items-start pt-3`}>
                          <MapPin size={14} color="#6B7280" style={tw`mr-3 mt-0.5`} />
                          <Text style={[tw`text-sm font-semibold flex-1`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{selectedOrder.customerAddress || 'Delivery Address Provided with Order'}</Text>
                        </View>
                      </View>

                      {/* Authoritative Itemized Bill & Transaction Details */}
                      {!isBus && (() => {
                        const rawOrd = selectedOrder.rawOrder || selectedOrder;
                        const orderItems = (Array.isArray(rawOrd.items) && rawOrd.items.length > 0)
                          ? rawOrd.items
                          : [{ name: selectedOrder.name || 'Order Item', quantity: 1, price: Number(String(selectedOrder.amount || '0').replace(/[^\d]/g, '')) || 0 }];
                        
                        const subtotal = orderItems.reduce((acc: number, it: any) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
                        const discountApplied = Number(rawOrd.discountApplied || rawOrd.discount || 0);
                        const deliveryFee = Number(rawOrd.deliveryCharge || rawOrd.deliveryFee || 0);
                        const finalAmount = Number(rawOrd.finalAmount || rawOrd.totalAmount || rawOrd.amount || (subtotal - discountApplied + deliveryFee));
                        const isCod = String(rawOrd.paymentMethod || rawOrd.payment_method || '').toLowerCase().includes('cash') || String(rawOrd.paymentMethod || rawOrd.payment_method || '').toLowerCase().includes('cod');
                        const isPaid = rawOrd.paymentStatus === 'Paid' || ['Delivered', 'Completed'].includes(selectedOrder.status);
                        const txnId = rawOrd.transactionId || rawOrd.razorpayPaymentId || rawOrd.walletTxnId || (rawOrd._id ? String(rawOrd._id).slice(-10).toUpperCase() : 'N/A');

                        return (
                          <View style={[tw`rounded-2xl p-4 border mt-4`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                            {/* Invoice Header */}
                            <View style={[tw`flex-row items-center justify-between pb-3 border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                              <View style={tw`flex-row items-center`}>
                                <Receipt size={16} color="#4F46E5" style={tw`mr-2`} />
                                <Text style={[tw`font-bold text-xs uppercase tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>
                                  Invoice & Items Breakdown
                                </Text>
                              </View>
                              <View style={[tw`px-2.5 py-0.5 rounded-full`, isPaid ? (isDark ? tw`bg-emerald-950/60` : tw`bg-emerald-50`) : (isDark ? tw`bg-amber-950/60` : tw`bg-amber-50`)]}>
                                <Text style={[tw`text-[10px] font-extrabold uppercase`, isPaid ? tw`text-emerald-600` : tw`text-amber-600`]}>
                                  {isPaid ? 'PAID' : (isCod ? 'COD PENDING' : 'PAYMENT PENDING')}
                                </Text>
                              </View>
                            </View>

                            {/* Items List */}
                            <View style={[tw`py-3 border-b`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                              {orderItems.map((it: any, itIdx: number) => {
                                const itPrice = Number(it.price) || 0;
                                const itQty = Number(it.quantity) || 1;
                                const itTotal = itPrice * itQty;
                                return (
                                  <View key={itIdx} style={tw`flex-row items-center justify-between py-1.5`}>
                                    <View style={tw`flex-1 mr-2`}>
                                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]} numberOfLines={1}>
                                        {it.name || 'Item'}
                                      </Text>
                                      <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                                        ₹{itPrice} × {itQty}
                                      </Text>
                                    </View>
                                    <Text style={[tw`text-xs font-black`, isDark ? tw`text-zinc-200` : tw`text-gray-900`]}>
                                      ₹{itTotal}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>

                            {/* Price Computation Summary */}
                            <View style={[tw`py-2.5 border-b gap-y-1`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                              <View style={tw`flex-row justify-between items-center`}>
                                <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Subtotal</Text>
                                <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>₹{subtotal}</Text>
                              </View>
                              {discountApplied > 0 && (
                                <View style={tw`flex-row justify-between items-center`}>
                                  <Text style={tw`text-[11px] text-emerald-600`}>Discount Applied</Text>
                                  <Text style={tw`text-[11px] font-semibold text-emerald-600`}>-₹{discountApplied}</Text>
                                </View>
                              )}
                              {deliveryFee > 0 && (
                                <View style={tw`flex-row justify-between items-center`}>
                                  <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Delivery Charge</Text>
                                  <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>+₹{deliveryFee}</Text>
                                </View>
                              )}
                              <View style={tw`flex-row justify-between items-center pt-1.5`}>
                                <Text style={[tw`text-xs font-black uppercase tracking-wider`, isDark ? tw`text-white` : tw`text-gray-900`]}>Final Amount</Text>
                                <Text style={tw`text-base font-black text-emerald-600`}>₹{finalAmount}</Text>
                              </View>
                            </View>

                            {/* Transaction Details */}
                            <View style={tw`pt-2.5 gap-y-1`}>
                              <View style={tw`flex-row justify-between items-center`}>
                                <Text style={[tw`text-[10px] font-bold uppercase`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Payment Method</Text>
                                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                  {rawOrd.paymentMethod || rawOrd.payment_method || 'Connect Wallet'}
                                </Text>
                              </View>
                              <View style={tw`flex-row justify-between items-center`}>
                                <Text style={[tw`text-[10px] font-bold uppercase`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Transaction ID</Text>
                                <Text style={[tw`text-[11px] font-mono font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                                  {txnId}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })()}
                    </>
                  )}
                </ScrollView>

                {/* Status Action Buttons */}
                <View style={tw`mb-3`}>
                  {isJob ? (
                    <>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        Update Application Stage
                      </Text>
                      {/* Primary 3 Action Buttons */}
                      <View style={tw`flex-row gap-x-2`}>
                        {/* 1. Reviewed */}
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Reviewed')}
                          activeOpacity={0.8}
                          style={[
                            tw`flex-1 py-3 px-1 rounded-2xl items-center justify-center border`,
                            selectedOrder.status === 'Reviewed'
                              ? tw`bg-amber-500 border-amber-600 shadow-sm`
                              : isDark
                              ? tw`bg-zinc-800 border-zinc-700`
                              : tw`bg-amber-50 border-amber-200`,
                          ]}>
                          <Text
                            numberOfLines={1}
                            style={[
                              tw`font-bold text-xs`,
                              selectedOrder.status === 'Reviewed'
                                ? tw`text-white`
                                : tw`text-amber-800 dark:text-amber-300`,
                            ]}>
                            {selectedOrder.status === 'Reviewed' ? '✓ Reviewed' : 'Reviewed'}
                          </Text>
                        </TouchableOpacity>

                        {/* 2. Shortlisted */}
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Shortlisted')}
                          activeOpacity={0.8}
                          style={[
                            tw`flex-1 py-3 px-1 rounded-2xl items-center justify-center border`,
                            selectedOrder.status === 'Shortlisted'
                              ? tw`bg-emerald-600 border-emerald-700 shadow-sm`
                              : isDark
                              ? tw`bg-zinc-800 border-zinc-700`
                              : tw`bg-emerald-50 border-emerald-200`,
                          ]}>
                          <Text
                            numberOfLines={1}
                            style={[
                              tw`font-bold text-xs`,
                              selectedOrder.status === 'Shortlisted'
                                ? tw`text-white`
                                : tw`text-emerald-800 dark:text-emerald-300`,
                            ]}>
                            {selectedOrder.status === 'Shortlisted' ? '✓ Shortlisted' : 'Shortlisted'}
                          </Text>
                        </TouchableOpacity>

                        {/* 3. Schedule Interview */}
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Interview Scheduled')}
                          activeOpacity={0.8}
                          style={[
                            tw`flex-1 py-3 px-1 rounded-2xl items-center justify-center border`,
                            selectedOrder.status === 'Interview Scheduled' || selectedOrder.status === 'Interviewing'
                              ? tw`bg-purple-600 border-purple-700 shadow-sm`
                              : isDark
                              ? tw`bg-zinc-800 border-zinc-700`
                              : tw`bg-purple-50 border-purple-200`,
                          ]}>
                          <Text
                            numberOfLines={1}
                            style={[
                              tw`font-bold text-[11px] text-center`,
                              selectedOrder.status === 'Interview Scheduled' || selectedOrder.status === 'Interviewing'
                                ? tw`text-white`
                                : tw`text-purple-800 dark:text-purple-300`,
                            ]}>
                            {selectedOrder.status === 'Interview Scheduled' || selectedOrder.status === 'Interviewing'
                              ? '✓ Scheduled'
                              : 'Schedule Interview'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : isBus ? (
                    <View style={tw`gap-y-2`}>
                      {!isAllocated && (
                        <TouchableOpacity
                          onPress={() => openSeatModal(selectedOrder)}
                          style={[tw`w-full py-3.5 rounded-2xl items-center justify-center bg-indigo-600 shadow-sm`]}>
                          <Text style={tw`text-white font-black text-sm`}>
                            💺 Allocate Seat to Passenger
                          </Text>
                        </TouchableOpacity>
                      )}
                      {selectedOrder.status !== 'Completed' && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Completed')}
                          style={[tw`w-full py-3 rounded-2xl items-center justify-center bg-emerald-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>✓ Mark Journey Completed</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={tw`flex-row gap-x-2`}>
                      {['Pending', 'Placed', 'Order Received'].includes(selectedOrder.status) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Accepted')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-green-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Cancelled')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-red-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {['Accepted', 'Confirmed'].includes(selectedOrder.status) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Preparing')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-amber-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Mark Preparing</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Out for Delivery')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-blue-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Mark Out for Delivery</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {['Preparing', 'Processing'].includes(selectedOrder.status) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Out for Delivery')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-blue-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Mark Out for Delivery</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Delivered')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-green-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Mark Delivered</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {['Out for Delivery', 'Shipped', 'Assigned'].includes(selectedOrder.status) && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedOrder.dbId || selectedOrder.id, 'Delivered')}
                          style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-green-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>Mark Delivered</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={tw`flex-row gap-x-2`}>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(isJob ? 'Calling Applicant' : 'Calling Customer', `Dialing ${selectedOrder.customerName} at ${selectedOrder.customerPhone}...`);
                    }}
                    style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`]}>
                    <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>
                      {isJob ? 'Call Applicant' : 'Call Customer'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedOrder(null);
                    }}
                    style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center`, {backgroundColor: '#4F46E5'}]}>
                    <Text style={tw`text-white font-bold text-sm`}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Booking Detail Modal */}
      {selectedBooking && (() => {
        const isBus = isBusOrder(selectedBooking);
        const raw = selectedBooking.rawOrder || selectedBooking;
        const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0 ? raw.travelers : [];
        const isAllocated = checkIsBusSeatAllocated(selectedBooking);
        const seatDisplay = isAllocated ? getBusSeatDisplay(selectedBooking) : null;
        const boarding = raw.boarding_point || raw.pickupLocation || 'Boarding Point';
        const dropping = raw.dropping_point || raw.deliveryAddress || raw.customerAddress || 'Dropping Point';

        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={!!selectedBooking}
            onRequestClose={() => setSelectedBooking(null)}>
            <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
              <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
                {/* Header */}
                <View style={tw`flex-row justify-between items-center mb-5`}>
                  <View>
                    <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {isBus ? 'Bus Booking Details' : 'Booking Details'}
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                      {isBus ? 'PNR / Booking: ' : 'Booking ID: '}{selectedBooking.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                    <X size={18} color={isDark ? '#E4E4E7' : '#4B5563'} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-5`}>
                  {/* Service Details Card */}
                  <View style={[tw`rounded-2xl p-4 mb-4 flex-row items-center border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-gray-50 border-gray-100`]}>
                    <View style={[tw`w-12 h-12 rounded-xl items-center justify-center mr-4`, isBus ? (isDark ? tw`bg-zinc-800` : tw`bg-pink-50`) : (isDark ? tw`bg-indigo-950` : tw`bg-indigo-50`)]}>
                      {isBus ? <Compass size={24} color="#E11D48" /> : <CalendarCheck size={24} color="#4F46E5" />}
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`font-extrabold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>{selectedBooking.serviceName}</Text>
                      <Text style={[tw`text-xs text-gray-400 mt-0.5`]}>{selectedBooking.dateTime}</Text>
                      <Text style={[tw`text-sm font-black text-indigo-600 mt-1`]}>{selectedBooking.amount}</Text>
                    </View>
                    <View style={[tw`px-3 py-1.5 rounded-full`, {backgroundColor: bookingStatusConfig[selectedBooking.status]?.bgColor || '#F3F4F6'}]}>
                      <Text style={[tw`text-xs font-bold`, {color: bookingStatusConfig[selectedBooking.status]?.color || '#4B5563'}]}>
                        {selectedBooking.status}
                      </Text>
                    </View>
                  </View>

                  {/* Bus Journey & Seat Details Section */}
                  {isBus && (
                    <View style={[tw`rounded-2xl p-4 mb-4 border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Bus Route & Timing
                      </Text>
                      <View style={[tw`p-3 rounded-xl mb-3 flex-row items-center justify-between`, isDark ? tw`bg-zinc-900` : tw`bg-indigo-50/50`]}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>Boarding Point</Text>
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{boarding}</Text>
                        </View>
                        <View style={tw`px-2`}>
                          <Text style={tw`text-indigo-600 font-bold`}>➔</Text>
                        </View>
                        <View style={tw`flex-1 items-end`}>
                          <Text style={tw`text-[10px] uppercase font-bold text-gray-400`}>Dropping Point</Text>
                          <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{dropping}</Text>
                        </View>
                      </View>

                      {/* Seat Allocation Status Card */}
                      <View style={[tw`p-3.5 rounded-xl border mb-3`, isAllocated ? (isDark ? tw`bg-emerald-950/30 border-emerald-900` : tw`bg-emerald-50 border-emerald-200`) : (isDark ? tw`bg-amber-950/30 border-amber-900` : tw`bg-amber-50 border-amber-200`)]}>
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                          <View style={tw`flex-row items-center`}>
                            {isAllocated ? (
                              <CheckCircle2 size={16} color="#10B981" style={tw`mr-1.5`} />
                            ) : (
                              <Clock size={16} color="#F59E0B" style={tw`mr-1.5`} />
                            )}
                            <Text style={[tw`text-xs font-black`, isAllocated ? tw`text-emerald-700 dark:text-emerald-300` : tw`text-amber-800 dark:text-amber-300`]}>
                              {isAllocated ? `Seat Confirmed: ${seatDisplay}` : 'Seat Pending Allocation'}
                            </Text>
                          </View>
                          {!isAllocated ? (
                            <TouchableOpacity
                              onPress={() => openSeatModal(selectedBooking)}
                              style={tw`px-3 py-1.5 rounded-lg shadow-sm bg-amber-500`}>
                              <Text style={tw`text-white font-black text-xs`}>
                                Allocate Seat
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={[tw`px-2.5 py-1 rounded-md`, isDark ? tw`bg-emerald-900/40` : tw`bg-emerald-100`]}>
                              <Text style={tw`text-emerald-700 dark:text-emerald-300 font-bold text-[11px]`}>Locked</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {isAllocated
                            ? 'Seat allocation is confirmed and locked. Passenger has access to confirmed seat on their boarding pass.'
                            : 'Customer is waiting for seat number. Click "Allocate Seat" to assign and confirm.'}
                        </Text>
                      </View>

                      {/* Passenger Breakdown */}
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Passengers ({travelers.length || 1})
                      </Text>
                      {(travelers.length > 0 ? travelers : [{ name: selectedBooking.customer || 'Passenger 1', seat: raw.seat || '' }]).map((t: any, idx: number) => {
                        const tSeat = (t.seat && !String(t.seat).toLowerCase().includes('pending')) ? t.seat : null;
                        return (
                          <View key={idx} style={[tw`p-2.5 rounded-xl border mb-1.5 flex-row items-center justify-between`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-gray-50 border-gray-100`]}>
                            <View style={tw`flex-row items-center`}>
                              <View style={[tw`w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 items-center justify-center mr-2`]}>
                                <Text style={tw`text-[10px] font-bold text-indigo-600`}>{idx + 1}</Text>
                              </View>
                              <View>
                                <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>{t.name || `Passenger ${idx + 1}`}</Text>
                                {(t.age || t.gender) && (
                                  <Text style={tw`text-[10px] text-gray-400`}>{[t.age ? `${t.age} yrs` : '', t.gender].filter(Boolean).join(' • ')}</Text>
                                )}
                              </View>
                            </View>
                            <View style={[tw`px-2 py-0.5 rounded-md`, tSeat ? tw`bg-emerald-100 dark:bg-emerald-950` : tw`bg-amber-100 dark:bg-amber-950`]}>
                              <Text style={[tw`text-[10px] font-black`, tSeat ? tw`text-emerald-700 dark:text-emerald-300` : tw`text-amber-700 dark:text-amber-300`]}>
                                {tSeat ? `Seat ${tSeat}` : 'Seat Pending'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Customer Details Box */}
                  <View style={[tw`rounded-2xl p-4 border`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      Customer Information
                    </Text>
                    <View style={tw`flex-row items-center mb-3`}>
                      <View style={[tw`w-8 h-8 rounded-full bg-indigo-50 items-center justify-center mr-3`, isDark && tw`bg-indigo-950`]}>
                        <Text style={tw`text-indigo-650 font-bold text-sm`}>
                          {selectedBooking.customer.charAt(0)}
                        </Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{selectedBooking.customer}</Text>
                        <Text style={tw`text-[11px] font-mono text-indigo-500 font-semibold mt-0.5`}>ID: {getCustomerDisplayId(selectedBooking)}</Text>
                      </View>
                    </View>
                    <View style={[tw`flex-row items-center py-2.5 border-b`, isDark ? tw`border-zinc-850` : tw`border-gray-50`]}>
                      <Phone size={14} color="#6B7280" style={tw`mr-3`} />
                      <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{selectedBooking.phone}</Text>
                    </View>
                    {selectedBooking.customerAddress ? (
                      <View style={tw`flex-row items-start pt-3`}>
                        <MapPin size={14} color="#6B7280" style={tw`mr-3 mt-0.5`} />
                        <Text style={[tw`text-sm font-semibold flex-1`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{selectedBooking.customerAddress}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Stay Specific Details */}
                  {Boolean(raw.category === 'Stay' || raw.type === 'Stay' || raw.roomNumber || raw.hotelName || raw.checkInDate) && (
                    <View style={[tw`rounded-2xl p-4 border mt-4`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Stay Schedule & Property Details
                      </Text>
                      <View style={[tw`p-3 rounded-xl mb-3`, isDark ? tw`bg-zinc-900` : tw`bg-purple-50/50`]}>
                        <Text style={[tw`text-xs font-extrabold mb-1`, isDark ? tw`text-purple-300` : tw`text-purple-900`]}>
                          {raw.hotelName || raw.propertyName || selectedBooking.serviceName}
                        </Text>
                        <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {raw.roomsCount || 1} {raw.roomsCount === 1 ? 'Room' : 'Rooms'} • {raw.nightsCount || 1} {raw.nightsCount === 1 ? 'Night' : 'Nights'} • {raw.guests || raw.numberOfGuests || 1} Guest(s)
                        </Text>
                      </View>
                      <View style={tw`grid grid-cols-2 gap-2`}>
                        <View style={[tw`p-2.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-emerald-50/50 border-emerald-100`]}>
                          <Text style={tw`text-[10px] font-bold uppercase text-emerald-600`}>Check-In</Text>
                          <Text style={[tw`text-xs font-bold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                            {raw.checkInDate || raw.scheduledCheckInDate || 'Scheduled'}
                          </Text>
                          <Text style={tw`text-[10px] text-gray-400`}>
                            {raw.checkInTime || raw.scheduledCheckInTime || '12:00 PM'}
                          </Text>
                        </View>
                        <View style={[tw`p-2.5 rounded-xl border mt-2`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-amber-50/50 border-amber-100`]}>
                          <Text style={tw`text-[10px] font-bold uppercase text-amber-600`}>Check-Out</Text>
                          <Text style={[tw`text-xs font-bold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                            {raw.checkOutDate || raw.scheduledCheckOutDate || 'Scheduled'}
                          </Text>
                          <Text style={tw`text-[10px] text-gray-400`}>
                            {raw.checkOutTime || raw.scheduledCheckOutTime || '11:00 AM'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Service Specific Details */}
                  {!isBus && Boolean(raw.category === 'Services' || raw.doctorName || raw.appointmentDate) && (
                    <View style={[tw`rounded-2xl p-4 border mt-4`, isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-white border-gray-100`]}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Service Appointment Schedule
                      </Text>
                      <View style={[tw`p-3 rounded-xl`, isDark ? tw`bg-zinc-900` : tw`bg-indigo-50/50`]}>
                        <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                          📅 {raw.appointmentDate || 'Scheduled date'}
                        </Text>
                        <Text style={[tw`text-xs font-semibold text-indigo-600 mt-1`]}>
                          ⏰ Slot: {raw.appointmentTimeSlot || 'Standard Slot'}
                        </Text>
                        {Boolean(raw.doctorName) && (
                          <Text style={[tw`text-xs font-bold mt-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                            👨‍⚕️ Specialist: {raw.doctorName} {raw.specialty ? `(${raw.specialty})` : ''}
                          </Text>
                        )}
                        {Boolean(raw.patientName) && (
                          <Text style={[tw`text-xs text-gray-400 mt-0.5`]}>
                            Patient: {raw.patientName}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Status Action Buttons */}
                <View style={tw`gap-y-2 mb-3`}>
                  {isBus ? (
                    <>
                      {!isAllocated && (
                        <TouchableOpacity
                          onPress={() => openSeatModal(selectedBooking)}
                          style={[tw`w-full py-3.5 rounded-2xl items-center justify-center bg-indigo-600 shadow-sm`]}>
                          <Text style={tw`text-white font-black text-sm`}>
                            💺 Allocate Seat to Passenger
                          </Text>
                        </TouchableOpacity>
                      )}
                      {selectedBooking.status !== 'Completed' && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedBooking.id, 'Completed')}
                          style={[tw`w-full py-3 rounded-2xl items-center justify-center bg-emerald-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>✓ Mark Journey Completed</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <>
                      {['Pending', 'Placed', 'Booking Received'].includes(selectedBooking.status) && (
                        <View style={tw`flex-row gap-x-2`}>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedBooking.id, 'Confirmed')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-green-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Confirm Booking</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStatusTransition(selectedBooking.id, 'Cancelled')}
                            style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-red-600`]}>
                            <Text style={tw`text-white font-bold text-xs`}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {selectedBooking.status === 'Confirmed' && Boolean(raw.category === 'Stay' || raw.type === 'Stay' || raw.checkInDate) && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedBooking.id, 'Checked In')}
                          style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-emerald-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>Mark Guest Checked In</Text>
                        </TouchableOpacity>
                      )}
                      {selectedBooking.status === 'Checked In' && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedBooking.id, 'Completed')}
                          style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-blue-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>Mark Checked Out & Completed</Text>
                        </TouchableOpacity>
                      )}
                      {selectedBooking.status === 'Confirmed' && !Boolean(raw.category === 'Stay' || raw.type === 'Stay' || raw.checkInDate) && (
                        <TouchableOpacity
                          onPress={() => handleStatusTransition(selectedBooking.id, 'Completed')}
                          style={[tw`flex-1 py-3 rounded-2xl items-center justify-center bg-blue-600`]}>
                          <Text style={tw`text-white font-bold text-xs`}>Mark Completed</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={tw`flex-row gap-x-2`}>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Calling Client', `Dialing ${selectedBooking.customer} at ${selectedBooking.phone}...`);
                    }}
                    style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`]}>
                    <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>Call Client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBooking(null);
                    }}
                    style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center`, {backgroundColor: '#4F46E5'}]}>
                    <Text style={tw`text-white font-bold text-sm`}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Filter Options Modal */}
      {filterModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={filterModalVisible}
          onRequestClose={() => setFilterModalVisible(false)}>
          <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
            <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
              <View style={tw`absolute inset-0`} />
            </TouchableWithoutFeedback>
            <View style={[tw`rounded-t-3xl px-5 pt-6 pb-8`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
              {/* Header */}
              <View style={tw`flex-row justify-between items-center mb-5`}>
                <View>
                  <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Filter by Status</Text>
                  <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                    Select a status to filter your {activeSegment.toLowerCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                  <X size={18} color={isDark ? '#E4E4E7' : '#4B5563'} />
                </TouchableOpacity>
              </View>

              {/* Status List */}
              <View style={tw`gap-y-2`}>
                {statusFilters.map(filter => {
                  const isSelected = activeFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => {
                        setActiveFilter(filter);
                        setFilterModalVisible(false);
                      }}
                      activeOpacity={0.7}
                      style={[
                        tw`flex-row items-center justify-between p-3.5 rounded-xl border`,
                        isSelected
                          ? [tw`border-indigo-500`, isDark ? tw`bg-indigo-950/30` : tw`bg-indigo-50`]
                          : [isDark ? tw`bg-zinc-950 border-zinc-850` : tw`bg-gray-50 border-gray-100`],
                      ]}>
                      <View style={tw`flex-row items-center`}>
                        <View style={[tw`w-2 h-2 rounded-full mr-3`, {
                          backgroundColor:
                            filter === 'All' ? '#6366F1' :
                            filter === 'Pending' ? '#F59E0B' :
                            filter === 'Preparing' ? '#D97706' :
                            filter === 'Assigned' ? '#2563EB' :
                            filter === 'Delivered' ? '#16A34A' : '#DC2626'
                        }]} />
                        <Text style={[tw`font-semibold text-sm`, isSelected ? tw`text-indigo-650 dark:text-indigo-400` : (isDark ? tw`text-zinc-200` : tw`text-gray-800`)]}>
                          {filter}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[tw`w-5 h-5 rounded-full items-center justify-center`, {backgroundColor: '#4F46E5'}]}>
                          <CheckCircle2 size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bus Seat Allocation Modal */}
      {seatModalVisible && targetBusOrder && (() => {
        const raw = targetBusOrder.rawOrder || targetBusOrder;
        const travelers = Array.isArray(raw.travelers) && raw.travelers.length > 0
          ? raw.travelers
          : [{ name: targetBusOrder.customerName || targetBusOrder.customer || 'Passenger 1', seat: '' }];
        const currentPassenger = travelers[activePassengerIdx] || travelers[0];
        const upperSeats = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10'];
        const lowerSeats = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];

        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={seatModalVisible}
            onRequestClose={() => setSeatModalVisible(false)}>
            <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.6)'}]}>
              <View style={[tw`rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
                {/* Header */}
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={[tw`text-xl font-black`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      Allocate Bus Seat 💺
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {raw.bus_name || targetBusOrder.name || 'Bus Journey'} • PNR: {targetBusOrder.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSeatModalVisible(false)}
                    style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                    <X size={18} color={isDark ? '#E4E4E7' : '#4B5563'} />
                  </TouchableOpacity>
                </View>

                {/* Passenger Selector Tabs (if multiple passengers) */}
                {travelers.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-3 pb-1`}>
                    {travelers.map((t: any, idx: number) => {
                      const isSelected = activePassengerIdx === idx;
                      const hasSeat = Boolean(assignedSeats[idx]);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setActivePassengerIdx(idx);
                            setCustomSeatInput(assignedSeats[idx] || '');
                          }}
                          style={[
                            tw`mr-2 px-3 py-2 rounded-xl border flex-row items-center`,
                            isSelected
                              ? tw`bg-indigo-600 border-indigo-700`
                              : isDark
                              ? tw`bg-zinc-800 border-zinc-700`
                              : tw`bg-gray-100 border-gray-200`,
                          ]}>
                          <Text
                            style={[
                              tw`text-xs font-bold mr-1.5`,
                              isSelected ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`,
                            ]}>
                            P{idx + 1}: {t.name || `Pax ${idx + 1}`}
                          </Text>
                          {hasSeat && (
                            <View style={tw`px-1.5 py-0.5 rounded-full bg-emerald-500`}>
                              <Text style={tw`text-[10px] font-black text-white`}>
                                {assignedSeats[idx]}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Current Target Passenger Banner */}
                <View style={[tw`p-3 rounded-xl mb-3 flex-row items-center justify-between border`, isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-indigo-50 border-indigo-100`]}>
                  <View>
                    <Text style={tw`text-[10px] font-bold text-indigo-500 uppercase tracking-wider`}>Allocating for:</Text>
                    <Text style={[tw`text-sm font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {currentPassenger.name || `Passenger ${activePassengerIdx + 1}`}
                    </Text>
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-[10px] font-bold text-gray-400 uppercase tracking-wider`}>Selected Seat</Text>
                    <Text style={tw`text-base font-black text-indigo-600`}>
                      {assignedSeats[activePassengerIdx] || customSeatInput || 'None'}
                    </Text>
                  </View>
                </View>

                {/* Status Legend Row */}
                <View style={[tw`flex-row items-center justify-between mb-3 px-2.5 py-2 rounded-xl`, isDark ? tw`bg-zinc-800/60` : tw`bg-gray-100`]}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-3 h-3 rounded bg-red-500 mr-1.5`} />
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Booked ({Object.values(occupiedSeatsMap).filter(o => !o.isCurrentBooking).length})
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-3 h-3 rounded bg-indigo-600 mr-1.5`} />
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Selected ({assignedSeats[activePassengerIdx] || customSeatInput ? '1' : '0'})
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-3 h-3 rounded border border-emerald-500 mr-1.5`, isDark ? tw`bg-zinc-900` : tw`bg-white`]} />
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Available
                    </Text>
                  </View>
                </View>

                {/* Already Booked Passengers List on this Bus */}
                {Object.values(occupiedSeatsMap).filter(o => !o.isCurrentBooking).length > 0 && (
                  <View style={[tw`p-2.5 rounded-xl mb-3.5 border`, isDark ? tw`bg-zinc-950/60 border-zinc-800` : tw`bg-red-50/40 border-red-100`]}>
                    <Text style={[tw`text-[10px] font-black uppercase tracking-wider mb-2`, isDark ? tw`text-red-400` : tw`text-red-700`]}>
                      👥 ALREADY BOOKED SEATS ON THIS BUS ({Object.values(occupiedSeatsMap).filter(o => !o.isCurrentBooking).length}):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {Object.values(occupiedSeatsMap)
                        .filter(o => !o.isCurrentBooking)
                        .map((bInfo) => (
                          <TouchableOpacity
                            key={bInfo.seat}
                            activeOpacity={0.7}
                            onPress={() => {
                              Alert.alert(
                                `Seat ${bInfo.seat} • Booked`,
                                `Passenger: ${bInfo.passengerName}\nBooking Ref / PNR: ${bInfo.pnr}\n\nThis seat is already occupied by this customer on this bus.`
                              );
                            }}
                            style={[
                              tw`mr-2 px-2.5 py-1.5 rounded-lg flex-row items-center border`,
                              isDark ? tw`bg-red-950/30 border-red-900` : tw`bg-white border-red-200`,
                            ]}>
                            <View style={tw`w-4.5 h-4.5 rounded bg-red-600 items-center justify-center mr-1.5`}>
                              <Text style={tw`text-[9px] font-black text-white`}>{bInfo.seat}</Text>
                            </View>
                            <Text style={[tw`text-xs font-bold mr-1`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                              {bInfo.passengerName}
                            </Text>
                            <Text style={tw`text-[10px] text-gray-400 font-semibold`}>({bInfo.pnr})</Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
                  {/* Upper Berth Section */}
                  <View style={tw`mb-4`}>
                    <Text style={[tw`text-xs font-extrabold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      🛌 Upper Deck Berths (Tap to Select)
                    </Text>
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {upperSeats.map(s => {
                        const occupiedInfo = occupiedSeatsMap[s];
                        const isBookedByOther = Boolean(occupiedInfo && !occupiedInfo.isCurrentBooking);
                        const isCurrentAssigned = (assignedSeats[activePassengerIdx] || customSeatInput) === s;
                        const isOtherAssignedInThisOrder = Object.entries(assignedSeats).some(([idx, seat]) => Number(idx) !== activePassengerIdx && seat === s);

                        return (
                          <TouchableOpacity
                            key={s}
                            disabled={isBookedByOther}
                            onPress={() => handleSelectSeat(s)}
                            activeOpacity={0.7}
                            style={[
                              tw`w-[18%] min-w-[58px] py-1.5 px-1 rounded-xl items-center justify-center border`,
                              isCurrentAssigned
                                ? tw`bg-indigo-600 border-indigo-700 shadow-md`
                                : isOtherAssignedInThisOrder
                                ? tw`bg-emerald-600 border-emerald-700 shadow-sm`
                                : isBookedByOther
                                ? (isDark ? tw`bg-red-950/40 border-red-800` : tw`bg-red-50 border-red-200`)
                                : isDark
                                ? tw`bg-zinc-800 border-zinc-700`
                                : tw`bg-gray-50 border-gray-200`,
                            ]}>
                            <Text
                              style={[
                                tw`text-xs font-black`,
                                isCurrentAssigned || isOtherAssignedInThisOrder
                                  ? tw`text-white`
                                  : isBookedByOther
                                  ? tw`text-red-600 dark:text-red-400`
                                  : isDark
                                  ? tw`text-zinc-200`
                                  : tw`text-gray-800`,
                              ]}>
                              {s}
                            </Text>
                            {isBookedByOther ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-red-600 dark:text-red-300 mt-0.5 text-center`}>
                                  {occupiedInfo.passengerName}
                                </Text>
                                <Text style={tw`text-[7px] text-red-500 font-bold`}>
                                  Booked
                                </Text>
                              </>
                            ) : isCurrentAssigned ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-indigo-100 mt-0.5 text-center`}>
                                  {currentPassenger.name || 'Selected'}
                                </Text>
                                <Text style={tw`text-[7px] text-indigo-200 font-black`}>
                                  ✓ Choice
                                </Text>
                              </>
                            ) : isOtherAssignedInThisOrder ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-emerald-100 mt-0.5 text-center`}>
                                  Pax
                                </Text>
                                <Text style={tw`text-[7px] text-emerald-200 font-bold`}>
                                  Assigned
                                </Text>
                              </>
                            ) : (
                              <Text style={[tw`text-[9px] mt-0.5 font-bold`, tw`text-emerald-600 dark:text-emerald-400`]}>
                                Available
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Lower Berth Section */}
                  <View style={tw`mb-4`}>
                    <Text style={[tw`text-xs font-extrabold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      🛋️ Lower Deck Berths (Tap to Select)
                    </Text>
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {lowerSeats.map(s => {
                        const occupiedInfo = occupiedSeatsMap[s];
                        const isBookedByOther = Boolean(occupiedInfo && !occupiedInfo.isCurrentBooking);
                        const isCurrentAssigned = (assignedSeats[activePassengerIdx] || customSeatInput) === s;
                        const isOtherAssignedInThisOrder = Object.entries(assignedSeats).some(([idx, seat]) => Number(idx) !== activePassengerIdx && seat === s);

                        return (
                          <TouchableOpacity
                            key={s}
                            disabled={isBookedByOther}
                            onPress={() => handleSelectSeat(s)}
                            activeOpacity={0.7}
                            style={[
                              tw`w-[18%] min-w-[58px] py-1.5 px-1 rounded-xl items-center justify-center border`,
                              isCurrentAssigned
                                ? tw`bg-indigo-600 border-indigo-700 shadow-md`
                                : isOtherAssignedInThisOrder
                                ? tw`bg-emerald-600 border-emerald-700 shadow-sm`
                                : isBookedByOther
                                ? (isDark ? tw`bg-red-950/40 border-red-800` : tw`bg-red-50 border-red-200`)
                                : isDark
                                ? tw`bg-zinc-800 border-zinc-700`
                                : tw`bg-gray-50 border-gray-200`,
                            ]}>
                            <Text
                              style={[
                                tw`text-xs font-black`,
                                isCurrentAssigned || isOtherAssignedInThisOrder
                                  ? tw`text-white`
                                  : isBookedByOther
                                  ? tw`text-red-600 dark:text-red-400`
                                  : isDark
                                  ? tw`text-zinc-200`
                                  : tw`text-gray-800`,
                              ]}>
                              {s}
                            </Text>
                            {isBookedByOther ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-red-600 dark:text-red-300 mt-0.5 text-center`}>
                                  {occupiedInfo.passengerName}
                                </Text>
                                <Text style={tw`text-[7px] text-red-500 font-bold`}>
                                  Booked
                                </Text>
                              </>
                            ) : isCurrentAssigned ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-indigo-100 mt-0.5 text-center`}>
                                  {currentPassenger.name || 'Selected'}
                                </Text>
                                <Text style={tw`text-[7px] text-indigo-200 font-black`}>
                                  ✓ Choice
                                </Text>
                              </>
                            ) : isOtherAssignedInThisOrder ? (
                              <>
                                <Text numberOfLines={1} style={tw`text-[8px] font-bold text-emerald-100 mt-0.5 text-center`}>
                                  Pax
                                </Text>
                                <Text style={tw`text-[7px] text-emerald-200 font-bold`}>
                                  Assigned
                                </Text>
                              </>
                            ) : (
                              <Text style={[tw`text-[9px] mt-0.5 font-bold`, tw`text-emerald-600 dark:text-emerald-400`]}>
                                Available
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Or Custom Seat Number Input */}
                  <View style={tw`mt-1`}>
                    <Text style={[tw`text-xs font-extrabold uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Or Enter Custom Seat / Berth Number
                    </Text>
                    <TextInput
                      value={customSeatInput}
                      onChangeText={(val) => {
                        setCustomSeatInput(val);
                        setAssignedSeats(prev => ({ ...prev, [activePassengerIdx]: val }));
                      }}
                      placeholder="e.g. U4, L1, 14A, Window-3"
                      placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                      style={[
                        tw`p-3 rounded-xl border text-sm font-bold`,
                        isDark ? tw`bg-zinc-800 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-900`,
                      ]}
                    />
                  </View>
                </ScrollView>

                {/* Confirm & Save Button */}
                <View style={tw`flex-row gap-x-2`}>
                  <TouchableOpacity
                    onPress={() => setSeatModalVisible(false)}
                    style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`]}>
                    <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirmSeatAllocation}
                    style={[tw`flex-2 py-3.5 rounded-2xl items-center justify-center bg-indigo-600 shadow-md`]}>
                    <Text style={tw`text-white font-black text-sm`}>
                      ✓ Confirm & Issue Seat to Customer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
}
