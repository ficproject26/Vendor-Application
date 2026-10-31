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
}: NewActivityModalProps) {
  if (!notification) return null;

  const raw = notification.raw || {};
  const isOrder = notification.category === 'Order' || notification.segment === 'Orders';
  const isBooking = notification.category === 'Booking' || notification.segment === 'Bookings';
  const isJob = notification.category === 'Job' || notification.segment === 'Jobs';

  const isStay = isBooking && (
    String(raw.type || '').toLowerCase() === 'stay' ||
    String(raw.category || '').toLowerCase().includes('stay') ||
    Boolean(raw.checkInDate)
  );

  const isTravel = isBooking && (
    String(raw.type || '').toLowerCase() === 'travel' ||
    String(raw.category || '').toLowerCase().includes('travel') ||
    Boolean(raw.travelDate) ||
    Boolean(raw.boardingPoint)
  );

  const txTypeTitle = isJob
    ? 'New Job Application'
    : isBooking
    ? isStay
      ? 'New Stay Booking'
      : isTravel
      ? 'New Travel Booking'
      : 'New Service Booking'
    : 'New Customer Order';

  const txId = String(raw.order_number || notification.id || raw.id || raw._id || 'TXN');
  const customerName = raw.customer_name || raw.memberName || raw.candidateName || notification.customerName || 'Customer';
  const customerPhone = raw.customer_phone || raw.customerPhone || raw.phone || raw.candidatePhone || raw.mobileNumber || '';
  const customerEmail = raw.customer_email || raw.customerEmail || raw.candidateEmail || raw.email || '';
  const customerId = raw.customer_id || raw.customerId || raw.memberId || '';

  const dateTimeStr = notification.dateTime || (raw.createdAt ? new Date(raw.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now');
  const statusStr = raw.status || notification.status || 'Received';

  // Items / Breakdown
  const rawItems = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : [];
  const itemsList = rawItems.length > 0
    ? rawItems
    : [
        {
          name: notification.itemName || raw.product_details || raw.name || (isJob ? 'Job Application' : 'Order Item'),
          quantity: Number(notification.quantity || raw.quantity || 1),
          price: Number(raw.price || raw.unitPrice || 0),
          image: raw.image || raw.productImage || null,
          variant: raw.variant || raw.selectedVariant || null,
        },
      ];

  // Financial summary
  const subtotal = Number(raw.subtotal || raw.itemsSubtotal || (rawItems.length > 0 ? rawItems.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0) : 0));
  const discount = Number(raw.discount || raw.discountApplied || 0);
  const deliveryFee = Number(raw.deliveryCharges || raw.deliveryFee || 0);
  const taxes = Number(raw.taxes || raw.taxAmount || 0);
  const totalAmount = raw.finalAmount || raw.totalAmount || raw.amount || (subtotal > 0 ? subtotal - discount + deliveryFee + taxes : null);

  const paymentMethod = raw.paymentMethod || raw.payment_method || (raw.isCOD ? 'Cash on Delivery' : 'Connect Wallet');
  const isCod = String(paymentMethod).toLowerCase().includes('cod') || String(paymentMethod).toLowerCase().includes('cash');
  const paymentStatus = raw.paymentStatus || raw.payment_status || (isCod ? 'Pending' : 'Paid');

  // Location / Address
  const getDeliveryAddress = (): string => {
    const directFields = [
      raw.deliveryAddress,
      raw.customer_address,
      raw.shippingAddress,
      raw.customerAddress,
      raw.address,
      raw.location,
      raw.memberAddress,
    ];
    for (const f of directFields) {
      if (f && typeof f === 'object') {
        const parts = [f.street, f.area, f.city, f.district, f.state, f.pincode].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
      if (typeof f === 'string' && f.trim() && f !== 'N/A') {
        return f.trim();
      }
    }
    if (raw.city || raw.pincode) {
      return [raw.city, raw.state, raw.pincode].filter(Boolean).join(', ');
    }
    return 'Not Specified';
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
                2. Transaction Details
              </Text>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Transaction ID:</Text>
                <Text style={[tw`text-xs font-extrabold font-mono`, isDark ? tw`text-white` : tw`text-gray-900`]}>#{txId}</Text>
              </View>
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
                  <View style={tw`flex-row justify-between`}>
                    <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Service:</Text>
                    <Text style={[tw`text-xs font-extrabold text-indigo-600 flex-1 text-right ml-2`]}>
                      {raw.serviceName || raw.bus_name || notification.itemName}
                    </Text>
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
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Time Slot:</Text>
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                        {raw.appointmentDate || 'Today'} ({raw.appointmentTimeSlot || raw.appointment_slot || '10:30 AM'})
                      </Text>
                    </View>
                  )}
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
                    {totalAmount ? (String(totalAmount).startsWith('₹') ? totalAmount : `₹${Number(totalAmount).toLocaleString('en-IN')}`) : '₹0'}
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
