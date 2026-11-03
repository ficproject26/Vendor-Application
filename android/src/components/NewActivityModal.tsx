import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import tw from 'twrnc';
import {
  ShoppingBag,
  CalendarCheck,
  Briefcase,
  User,
  Clock,
  Sparkles,
  X,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Package,
} from 'lucide-react-native';
import { VendorActivityNotification } from './NotificationBanner';

interface NewActivityModalProps {
  notification: VendorActivityNotification | null;
  visible: boolean;
  onAccept?: (notif: VendorActivityNotification) => void;
  onReject?: (notif: VendorActivityNotification) => void;
  onViewDetails: (notif: VendorActivityNotification) => void;
  onClose: () => void;
  isProcessing?: boolean;
  isDark?: boolean;
  remainingSeconds?: number;
  queueCount?: number;
}

export default function NewActivityModal({
  notification,
  visible,
  onAccept,
  onReject,
  onViewDetails,
  onClose,
  isProcessing = false,
  isDark = false,
  remainingSeconds,
  queueCount = 0,
}: NewActivityModalProps) {
  const [localSeconds, setLocalSeconds] = React.useState(15);

  React.useEffect(() => {
    if (visible && notification) {
      setLocalSeconds(15);
      const interval = setInterval(() => {
        setLocalSeconds(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [visible, notification?.id]);

  const effectiveRemainingSeconds = remainingSeconds !== undefined ? remainingSeconds : localSeconds;

  if (!notification) return null;

  const raw = notification.raw || {};
  const rawType = String(raw.type || (notification as any).type || '').toLowerCase();
  const rawCat = String(raw.category || raw.bookingCategory || notification.category || '').toLowerCase();
  const detailStr = String(raw.product_details || notification.itemName || raw.name || '').toLowerCase();
  const rawServiceName = String(raw.serviceName || '').toLowerCase();

  const isJob = notification.category === 'Job' || notification.segment === 'Jobs' || 
                ['job', 'jobs', 'application', 'job_application'].includes(rawType) || 
                ['job', 'jobs', 'application', 'job_application'].includes(rawCat) || 
                Boolean(raw.candidateResume || raw.applicationId);

  const isBooking = notification.category === 'Booking' || notification.segment === 'Bookings' || 
                    ['booking', 'appointment', 'service', 'services', 'stay', 'travel'].includes(rawType) || 
                    ['booking', 'stay', 'travel', 'services', 'service'].includes(rawCat);

  const serviceKeywordsRegex = /\b(electrician|plumber|technician|solar|repair|repairs|cctv|cleaning|service|services|consultation|doctor|nurse|clinic|hospital|lineman|mechanic|carpenter|painter|handyman)\b/i;

  const isServiceBooking = isBooking && (
    serviceKeywordsRegex.test(detailStr) ||
    serviceKeywordsRegex.test(rawServiceName) ||
    Boolean(raw.doctorName || raw.patientName || raw.serviceName) ||
    ['service', 'services', 'appointment'].includes(rawType) ||
    ['service', 'services'].includes(rawCat)
  );

  const isTravelBooking = isBooking && !isServiceBooking && (
    Boolean(raw.vehicleNumber || raw.vehicleType || raw.boardingPoint || raw.droppingPoint || raw.travelDate || raw.departureTime || raw.bus_name || raw.busName || raw.busId) ||
    /\b(bus|flight|train|vehicle|travel|travels|tour|cab|taxi|superbike)\b/i.test(detailStr) ||
    ['travel', 'travels'].includes(rawCat) ||
    ['travel', 'travels'].includes(rawType)
  );

  const isStayBooking = isBooking && !isServiceBooking && !isTravelBooking && (
    Boolean(raw.roomNumber || raw.roomName || raw.staySchedule || raw.hotelName || raw.propertyName) ||
    /\b(hotel|hotels|resort|resorts|suite|villa|cottage|homestay|lodge|pg)\b/i.test(detailStr) ||
    ['stay', 'hotel', 'resort'].includes(rawCat) ||
    ['stay', 'hotel', 'resort'].includes(rawType)
  );

  const isFoodOrder = !isJob && !isBooking && (
    ['food', 'foods', 'restaurant', 'dining'].includes(rawCat) ||
    ['food', 'foods', 'restaurant'].includes(rawType) ||
    /food|restaurant|biryani|chicken|pizza|burger|meal|dish/i.test(detailStr)
  );

  const isDailyNeedsOrder = !isJob && !isBooking && (
    ['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(rawCat) ||
    ['daily needs', 'daily need', 'grocery'].includes(rawType)
  );

  let txTypeTitle = 'New Product Order';
  if (isJob) {
    txTypeTitle = 'New Job Application';
  } else if (isServiceBooking) {
    txTypeTitle = 'New Service Booking';
  } else if (isStayBooking) {
    txTypeTitle = 'New Stay Booking';
  } else if (isTravelBooking) {
    txTypeTitle = 'New Travel Booking';
  } else if (isBooking) {
    txTypeTitle = 'New Service Booking';
  } else if (isFoodOrder) {
    txTypeTitle = 'New Food Order';
  } else if (isDailyNeedsOrder) {
    txTypeTitle = 'New Daily Needs Order';
  } else {
    txTypeTitle = 'New Product Order';
  }

  const isOrder = !isJob && !isBooking;
  const isStay = isStayBooking;
  const isTravel = isTravelBooking;

  const realTxnId = raw.transactionId || raw.razorpayPaymentId || raw.paymentId || null;
  const txId = String(isJob ? (raw.applicationId || raw.order_number || raw.id || raw._id || 'APP') : (raw.order_number || raw.orderNumber || notification.id || raw.id || raw._id || 'TXN'));
  const jobId = isJob ? (raw.jobId || raw.productId || raw.job_id || null) : null;
  const customerName = raw.customer_name || raw.memberName || raw.customerName || raw.candidateName || notification.customerName || 'Customer';
  const customerPhone = raw.customer_phone || raw.customerPhone || raw.phone || raw.memberPhone || raw.candidatePhone || raw.mobileNumber || '';
  const customerEmail = raw.customer_email || raw.customerEmail || raw.email || raw.candidateEmail || '';
  const customerId = raw.customer_id || raw.customerId || raw.memberId || '';

  const dateTimeStr = notification.dateTime || (raw.createdAt ? new Date(raw.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now');
  const rawStatus = raw.status || notification.status || 'Received';
  let statusStr = rawStatus;
  if ((isFoodOrder || isDailyNeedsOrder || isOrder) && (rawStatus === 'Booking Received' || rawStatus === 'Received')) {
    statusStr = 'Order Received';
  } else if (isBooking && (rawStatus === 'Order Received' || rawStatus === 'Received')) {
    statusStr = 'Booking Received';
  }

  // Helper to parse numeric price reliably without formatting corruption
  const resolveNumericPrice = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = Number(val.replace(/[^\d.-]/g, ''));
      return isNaN(cleaned) ? 0 : cleaned;
    }
    return 0;
  };

  // Items / Breakdown
  const rawItems = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : [];
  const itemsList = rawItems.length > 0
    ? rawItems
    : [
        {
          name: notification.itemName || raw.product_details || raw.name || (isJob ? 'Job Application' : 'Order Item'),
          quantity: Number(notification.quantity || raw.quantity || 1),
          price: resolveNumericPrice(raw.price || raw.unitPrice || 0),
          image: raw.image || raw.productImage || null,
          variant: raw.variant || raw.selectedVariant || null,
        },
      ];

  // Financial summary
  const subtotal = Number(raw.subtotal || raw.itemsSubtotal || (rawItems.length > 0 ? rawItems.reduce((acc: number, it: any) => acc + (resolveNumericPrice(it.price || it.unitPrice || 0) * Number(it.quantity || it.qty || 1)), 0) : 0));
  const discount = resolveNumericPrice(raw.discount || raw.discountApplied || 0);
  const deliveryFee = resolveNumericPrice(raw.deliveryCharges || raw.deliveryFee || raw.deliveryCharge || 0);
  const taxes = resolveNumericPrice(raw.taxes || raw.taxAmount || 0);

  const rawFinalAmount = raw.finalAmount ?? raw.totalAmount ?? raw.amount ?? raw.total ?? (notification.amount ? resolveNumericPrice(notification.amount) : null);
  const finalTotalBill = rawFinalAmount !== null && rawFinalAmount !== undefined
    ? resolveNumericPrice(rawFinalAmount)
    : (subtotal > 0 ? Math.max(0, subtotal - discount + deliveryFee + taxes) : 0);

  const paymentMethod = raw.paymentMethod || raw.payment_method || (raw.isCOD ? 'Cash on Delivery' : 'Online / Gateway');
  const isCod = String(paymentMethod).toLowerCase().includes('cod') || String(paymentMethod).toLowerCase().includes('cash');
  const rawPayStatus = String(raw.paymentStatus || raw.payment_status || '').trim();
  let paymentStatus = 'Pending';
  if (rawPayStatus.toLowerCase() === 'paid' || raw.isPaid === true) {
    paymentStatus = 'Paid';
  } else if (isCod) {
    paymentStatus = 'COD Pending';
  } else if (rawPayStatus) {
    paymentStatus = rawPayStatus;
  } else {
    paymentStatus = 'Payment Pending';
  }

  // Location / Address with intelligent state correction
  const getDeliveryAddress = (): string => {
    const sanitizeStateInAddr = (str: string): string => {
      if (!str) return str;
      let s = str.trim();
      // If address contains Tamil Nadu districts or 60xxxx-64xxxx pincodes with 'Karnataka'
      const isTN = /\b(dharmapuri|harur|salem|chennai|coimbatore|madurai|trichy|tiruchirappalli|tiruppur|erode|vellore|kanchipuram|hosur|krishnagiri|thanjavur|dindigul|cuddalore|tirunelveli|tuticorin|thoothukudi)\b/i.test(s) ||
                   /\b6[0-4][0-9]{4}\b/.test(s);
      if (isTN && /karnataka/i.test(s)) {
        s = s.replace(/\bkarnataka\b/gi, 'Tamil Nadu');
      }
      return s;
    };

    // Check for dine-in table or room delivery first
    if (raw.tableNumber || raw.table_number) {
      return `Dine-in: Table #${raw.tableNumber || raw.table_number}`;
    }
    if (raw.roomNumber || raw.room_number) {
      return `Room Delivery: Room #${raw.roomNumber || raw.room_number}`;
    }

    const directFields = [
      raw.deliveryAddress,
      raw.customer_address,
      raw.customerAddress,
      raw.serviceLocation,
      raw.customerLocation,
      raw.shippingAddress,
      raw.address,
      raw.location,
      raw.dropLocation,
      raw.pickupLocation,
      raw.memberAddress,
    ];
    for (const f of directFields) {
      if (f && typeof f === 'object') {
        const parts = [f.street, f.area, f.landmark, f.city, f.district, f.state, f.pincode].filter(Boolean);
        if (parts.length > 0) return sanitizeStateInAddr(parts.join(', '));
      }
      if (typeof f === 'string' && f.trim() && f !== 'N/A' && f !== '[object Object]') {
        return sanitizeStateInAddr(f.trim());
      }
    }
    if (raw.city || raw.pincode) {
      return sanitizeStateInAddr([raw.area, raw.city, raw.state, raw.pincode].filter(Boolean).join(', '));
    }
    return 'Delivery Address Provided with Order';
  };

  const deliveryAddress = getDeliveryAddress();
  const instructions = raw.deliveryInstructions || raw.notes || raw.customerNotes || raw.specialInstructions || '';

  const handleCallPhone = () => {
    if (customerPhone && customerPhone !== 'Not Specified') {
      Linking.openURL(`tel:${customerPhone}`).catch(() => {});
    }
  };

  const handleEmailCustomer = () => {
    if (customerEmail && customerEmail.includes('@')) {
      Linking.openURL(`mailto:${customerEmail}`).catch(() => {});
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[tw`flex-1 justify-center items-center px-4`, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View
          style={[
            tw`w-full rounded-3xl p-5 border`,
            isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              maxHeight: '90%',
            },
          ]}>
          {/* 15s Auto-Dismiss Progress Bar */}
          {effectiveRemainingSeconds !== undefined ? (
            <View style={[tw`w-full h-1.5 rounded-full overflow-hidden mb-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
              <View
                style={[
                  tw`h-full rounded-full`,
                  {
                    width: `${Math.max(0, Math.min(100, (effectiveRemainingSeconds / 15) * 100))}%`,
                    backgroundColor: isOrder ? '#059669' : isBooking ? '#4F46E5' : '#7C3AED',
                  },
                ]}
              />
            </View>
          ) : null}

          {/* Header */}
          <View style={tw`flex-row justify-between items-start pb-3 border-b border-gray-100 dark:border-zinc-800`}>
            <View style={tw`flex-row items-center flex-1 mr-2`}>
              <View
                style={[
                  tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`,
                  isOrder
                    ? { backgroundColor: '#ECFDF5' }
                    : isBooking
                    ? { backgroundColor: '#EEF2FF' }
                    : { backgroundColor: '#F5F3FF' },
                ]}>
                {isOrder ? (
                  <ShoppingBag size={22} color="#059669" />
                ) : isBooking ? (
                  <CalendarCheck size={22} color="#4F46E5" />
                ) : (
                  <Briefcase size={22} color="#7C3AED" />
                )}
              </View>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`text-base font-extrabold truncate`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                    {txTypeTitle}
                  </Text>
                  <Sparkles size={13} color="#F59E0B" style={tw`ml-1`} />
                </View>
                <Text style={[tw`text-[11px] font-mono mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  #{txId} • {dateTimeStr}
                </Text>
                {effectiveRemainingSeconds !== undefined ? (
                  <View style={[tw`mt-1.5 self-start px-2 py-0.5 rounded-full flex-row items-center border`, isDark ? tw`bg-zinc-800/80 border-zinc-700` : tw`bg-indigo-50 border-indigo-200`]}>
                    <Clock size={10} color={isDark ? '#A1A1AA' : '#4F46E5'} style={tw`mr-1`} />
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-indigo-700`]}>
                      Auto-dismiss in {effectiveRemainingSeconds}s
                    </Text>
                    {queueCount !== undefined && queueCount > 0 ? (
                      <Text style={tw`ml-1 text-[9px] font-black text-amber-600`}>
                        (+{queueCount} queued)
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center`,
                isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}>
              <X size={16} color={isDark ? '#E4E4E7' : '#374151'} />
            </TouchableOpacity>
          </View>

          {/* Body: 6 Scrollable Sections */}
          <ScrollView showsVerticalScrollIndicator={false} style={tw`my-3`}>
            {/* 1. Customer Details */}
            <View
              style={[
                tw`p-3.5 rounded-2xl mb-2.5`,
                isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
              ]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                1. Customer Details
              </Text>
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Name:</Text>
                <Text style={[tw`text-xs font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>{customerName}</Text>
              </View>
              {customerId ? (
                <View style={tw`flex-row justify-between items-center mb-1.5`}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Customer ID:</Text>
                  <Text style={[tw`text-[11px] font-mono font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{customerId}</Text>
                </View>
              ) : null}
              {customerPhone ? (
                <View style={tw`flex-row justify-between items-center mb-1.5`}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Phone:</Text>
                  <TouchableOpacity onPress={handleCallPhone} style={tw`flex-row items-center`}>
                    <Phone size={11} color="#4F46E5" style={tw`mr-1`} />
                    <Text style={tw`text-xs font-bold font-mono text-indigo-600`}>{customerPhone}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {customerEmail ? (
                <View style={tw`flex-row justify-between items-center`}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Email:</Text>
                  <TouchableOpacity onPress={handleEmailCustomer} style={tw`flex-row items-center flex-1 justify-end ml-2`}>
                    <Mail size={11} color="#4F46E5" style={tw`mr-1`} />
                    <Text style={tw`text-xs font-bold text-indigo-600 truncate`}>{customerEmail}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 2. Transaction Information */}
            <View
              style={[
                tw`p-3.5 rounded-2xl mb-2.5 border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                {isJob ? '2. Application Details' : isBooking ? '2. Booking Details' : '2. Transaction Details'}
              </Text>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  {isJob ? 'Application ID:' : isBooking ? 'Booking ID:' : 'Order ID:'}
                </Text>
                <Text style={[tw`text-xs font-extrabold font-mono`, isDark ? tw`text-white` : tw`text-gray-900`]}>#{txId.replace(/^#+/, '')}</Text>
              </View>
              {isJob && jobId ? (
                <View style={tw`flex-row justify-between items-center mb-1`}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Job ID:</Text>
                  <Text style={[tw`text-xs font-bold font-mono text-indigo-600`]}>#{String(jobId).replace(/^#+/, '')}</Text>
                </View>
              ) : null}
              {realTxnId && !isJob ? (
                <View style={tw`flex-row justify-between items-center mb-1`}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Transaction ID:</Text>
                  <Text style={[tw`text-xs font-mono`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{String(realTxnId).replace(/^#+/, '')}</Text>
                </View>
              ) : null}
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Category:</Text>
                <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>{raw.category || raw.type || notification.category}</Text>
              </View>
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Status:</Text>
                <View style={tw`px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60`}>
                  <Text style={tw`text-[11px] font-bold text-emerald-600`}>{statusStr}</Text>
                </View>
              </View>
            </View>

            {/* 3. Items / Booking / Candidate Breakdown */}
            <View
              style={[
                tw`p-3.5 rounded-2xl mb-2.5`,
                isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
              ]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                {isJob ? '3. Position & Qualifications' : isBooking ? '3. Booking Specifications' : '3. Ordered Items'}
              </Text>

              {isJob ? (
                <View style={tw`gap-1.5`}>
                  <View style={tw`flex-row justify-between`}>
                    <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Position:</Text>
                    <Text style={[tw`text-xs font-extrabold text-indigo-600`]}>{raw.jobTitle || notification.itemName}</Text>
                  </View>
                  {raw.candidateEducation ? (
                    <View style={tw`flex-row justify-between`}>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Education:</Text>
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>{raw.candidateEducation}</Text>
                    </View>
                  ) : null}
                  {raw.candidateExperience ? (
                    <View style={tw`flex-row justify-between`}>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Experience:</Text>
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>{raw.candidateExperience}</Text>
                    </View>
                  ) : null}
                  {raw.candidateResume ? (
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Resume / CV:</Text>
                      <Text style={tw`text-[11px] font-bold text-emerald-600`}>Attached</Text>
                    </View>
                  ) : null}
                </View>
              ) : isBooking ? (
                <View style={tw`gap-1.5`}>
                  {(() => {
                    const GENERIC_CATS = ['electrical & solar services', 'electrical & solar', 'electrical services', 'plumbing services', 'services', 'service', 'general service', 'daily needs', 'products'];
                    let modalServiceName = raw.serviceName;
                    let modalPackageName = raw.packageName || (raw.items && raw.items[0]?.variant);

                    if (isTravel && raw.bus_name) {
                      modalServiceName = raw.bus_name;
                    } else if (!modalServiceName || GENERIC_CATS.includes(String(modalServiceName).trim().toLowerCase())) {
                      const candidate = (raw.items && raw.items[0]?.name) || raw.product_details || raw.name || notification.itemName || '';
                      const m = candidate.match(/^([^(•·\n\r]+)(?:\(([^)]+)\))?/);
                      if (m) {
                        modalServiceName = m[1].trim();
                        if (!modalPackageName && m[2]) modalPackageName = m[2].split(/[•·]/)[0].trim();
                      } else {
                        modalServiceName = candidate || 'Service Booking';
                      }
                    } else if (String(modalServiceName).includes('(')) {
                      const m = String(modalServiceName).match(/^([^(]+)(?:\(([^)]+)\))?/);
                      if (m) {
                        modalServiceName = m[1].trim();
                        if (!modalPackageName && m[2]) modalPackageName = m[2].trim();
                      }
                    }

                    let modalApptDate = raw.serviceDate || raw.appointmentDate || raw.bookingDate;
                    let modalApptSlot = raw.serviceTime || raw.appointmentTimeSlot;
                    if ((!modalApptDate || !modalApptSlot) && raw.appointment_slot) {
                      if (raw.appointment_slot.includes(' at ')) {
                        const [d, t] = raw.appointment_slot.split(' at ');
                        if (!modalApptDate) modalApptDate = d.trim();
                        if (!modalApptSlot) modalApptSlot = t.trim();
                      } else if (!modalApptDate) {
                        modalApptDate = raw.appointment_slot;
                      }
                    }
                    if ((!modalApptDate || !modalApptSlot) && raw.product_details) {
                      const m = String(raw.product_details).match(/[•·]\s*([A-Za-z0-9,\s]+?)\s+at\s+([0-9:AMPMapm\s]+)/);
                      if (m) {
                        if (!modalApptDate) modalApptDate = m[1].trim();
                        if (!modalApptSlot) modalApptSlot = m[2].trim();
                      }
                    }

                    return (
                      <>
                        <View style={tw`flex-row justify-between items-start`}>
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Service:</Text>
                          <View style={tw`flex-1 items-end ml-2`}>
                            <Text style={[tw`text-xs font-extrabold text-indigo-600`]}>
                              {modalServiceName || 'Service Booking'}
                            </Text>
                            {modalPackageName ? (
                              <View style={[tw`mt-0.5 px-2 py-0.5 rounded`, isDark ? tw`bg-teal-950/70` : tw`bg-teal-50`]}>
                                <Text style={tw`text-[10px] font-bold text-teal-700 dark:text-teal-400`}>
                                  📦 {modalPackageName}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        {isStay ? (
                          <>
                            <View style={tw`flex-row justify-between`}>
                              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Dates:</Text>
                              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                                {raw.checkInDate || 'N/A'} → {raw.checkOutDate || 'N/A'}
                              </Text>
                            </View>
                            <View style={tw`flex-row justify-between`}>
                              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Guests & Rooms:</Text>
                              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                                {raw.roomsCount || 1} Room(s) • {raw.numAdults || 1} Adult(s)
                              </Text>
                            </View>
                          </>
                        ) : isTravel ? (
                          <>
                            <View style={tw`flex-row justify-between`}>
                              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Travel Date:</Text>
                              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>{raw.travelDate || 'Today'}</Text>
                            </View>
                            <View style={tw`flex-row justify-between`}>
                              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Route:</Text>
                              <Text style={[tw`text-xs font-bold text-right flex-1 ml-2`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                                {raw.boardingPoint?.name || raw.boardingPoint || 'Origin'} → {raw.droppingPoint?.name || raw.droppingPoint || 'Destination'}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <View style={tw`flex-row justify-between`}>
                            <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Schedule:</Text>
                            <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                              {modalApptDate || 'On-Demand Service'} {modalApptSlot ? `(${modalApptSlot})` : ''}
                            </Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              ) : (
                <View style={tw`gap-2`}>
                  {itemsList.map((it: any, idx: number) => {
                    const itQty = Number(it.quantity || it.qty || 1);
                    const itPrice = Number(it.price || it.unitPrice || 0);
                    return (
                      <View key={idx} style={tw`flex-row items-center justify-between py-1 border-b border-gray-100 dark:border-zinc-800/40`}>
                        <View style={tw`flex-row items-center flex-1 mr-2`}>
                          {it.image ? (
                            <Image source={{ uri: it.image }} style={tw`w-9 h-9 rounded-lg mr-2`} />
                          ) : (
                            <View style={tw`w-9 h-9 rounded-lg bg-gray-200 dark:bg-zinc-800 items-center justify-center mr-2`}>
                              <Package size={15} color="#6B7280" />
                            </View>
                          )}
                          <View style={tw`flex-1`}>
                            <Text style={[tw`text-xs font-bold truncate`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                              {it.name}
                            </Text>
                            {it.variant ? (
                              <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                                {it.variant}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={tw`items-end`}>
                          <Text style={[tw`text-xs font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                            ₹{(itPrice * itQty).toLocaleString('en-IN')}
                          </Text>
                          <Text style={[tw`text-[10px] font-semibold text-gray-500`]}>Qty: {itQty}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 4. Location and Address */}
            <View
              style={[
                tw`p-3.5 rounded-2xl mb-2.5 border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                {isStay ? '4. Stay Location' : isTravel ? '4. Boarding Location' : isBooking ? '4. Service Visit Location' : '4. Delivery Address'}
              </Text>
              <View style={tw`flex-row items-start`}>
                <MapPin size={14} color="#4F46E5" style={tw`mt-0.5 mr-1.5`} />
                <Text style={[tw`text-xs font-semibold flex-1 leading-relaxed`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                  {isStay
                    ? raw.propertyAddress || raw.hotelLocation || deliveryAddress
                    : isTravel
                    ? `${raw.boardingPoint?.name || raw.boardingPoint || 'Pickup Point'} (${raw.boardingPoint?.landmark || 'Landmark'})`
                    : deliveryAddress}
                </Text>
              </View>
              {raw.landmark ? (
                <Text style={[tw`text-[11px] font-medium text-gray-500 mt-1 ml-5`]}>
                  Landmark: {raw.landmark}
                </Text>
              ) : null}
            </View>

            {/* 5. Payment Summary */}
            {!isJob && (
              <View
                style={[
                  tw`p-3.5 rounded-2xl mb-2.5`,
                  isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
                ]}>
                <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                  5. Payment Summary
                </Text>
                {subtotal > 0 && (
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={[tw`text-xs font-medium text-gray-500`]}>Subtotal:</Text>
                    <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      ₹{subtotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                {discount > 0 && (
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-xs font-medium text-emerald-600`}>Discount:</Text>
                    <Text style={tw`text-xs font-semibold text-emerald-600`}>-₹{discount.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                <View style={tw`flex-row justify-between items-center my-1.5 pt-1.5 border-t border-gray-200 dark:border-zinc-800`}>
                  <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Total Bill:</Text>
                  <Text style={tw`text-base font-black text-emerald-600`}>
                    ₹{finalTotalBill.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={tw`flex-row justify-between items-center mt-1`}>
                  <Text style={[tw`text-[11px] font-semibold text-gray-500`]}>Mode: {paymentMethod}</Text>
                  <View style={[tw`px-2 py-0.5 rounded-full`, paymentStatus.toLowerCase().includes('paid') ? tw`bg-emerald-100 dark:bg-emerald-950` : tw`bg-amber-100 dark:bg-amber-950`]}>
                    <Text style={[tw`text-[10px] font-bold`, paymentStatus.toLowerCase().includes('paid') ? tw`text-emerald-700` : tw`text-amber-700`]}>
                      {paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 6. Instructions & Notes */}
            <View
              style={[
                tw`p-3.5 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[10px] font-bold uppercase tracking-wider mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                6. Instructions & Notes
              </Text>
              <Text style={[tw`text-xs italic`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                {instructions || 'No special instructions provided.'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions: View Full Details, Acknowledge, Close */}
          <View style={tw`flex-row gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800`}>
            {/* View Full Details Button */}
            <TouchableOpacity
              onPress={() => onViewDetails(notification)}
              style={[
                tw`flex-1 py-3.5 rounded-2xl items-center justify-center flex-row bg-indigo-600 shadow-sm`,
              ]}>
              <ExternalLink size={15} color="#FFFFFF" />
              <Text style={tw`text-white font-extrabold text-xs ml-1.5`}>
                View Full Details
              </Text>
            </TouchableOpacity>

            {/* Acknowledge Button */}
            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`px-4 py-3.5 rounded-2xl items-center justify-center flex-row bg-emerald-600 shadow-sm`,
              ]}>
              <CheckCircle2 size={15} color="#FFFFFF" />
              <Text style={tw`text-white font-bold text-xs ml-1`}>
                Acknowledge
              </Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`px-3 py-3.5 rounded-2xl items-center justify-center border`,
                isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-100 border-gray-200`,
              ]}>
              <Text style={[tw`font-semibold text-xs`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
