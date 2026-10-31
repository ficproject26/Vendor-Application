import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import tw from 'twrnc';
import {
  Bell,
  Check,
  X,
  ExternalLink,
  ShoppingBag,
  CalendarCheck,
  Briefcase,
  CreditCard,
  User,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { VendorActivityNotification } from './NotificationBanner';

interface NewActivityModalProps {
  notification: VendorActivityNotification | null;
  visible: boolean;
  onAccept: (notif: VendorActivityNotification) => void;
  onReject: (notif: VendorActivityNotification) => void;
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

  const isOrder = notification.category === 'Order' || notification.segment === 'Orders';
  const isBooking = notification.category === 'Booking' || notification.segment === 'Bookings';
  const isJob = notification.category === 'Job' || notification.segment === 'Jobs';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[tw`flex-1 justify-center items-center px-5`, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <View
          style={[
            tw`w-full rounded-3xl p-6 border`,
            isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
              maxHeight: '85%',
            },
          ]}>
          {/* Top Banner Icon */}
          <View style={tw`flex-row justify-between items-start mb-4`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-12 h-12 rounded-2xl items-center justify-center mr-3`,
                  isOrder
                    ? { backgroundColor: '#ECFDF5' }
                    : isBooking
                    ? { backgroundColor: '#EEF2FF' }
                    : { backgroundColor: '#FEF3C7' },
                ]}>
                {isOrder ? (
                  <ShoppingBag size={24} color="#059669" />
                ) : isBooking ? (
                  <CalendarCheck size={24} color="#4F46E5" />
                ) : (
                  <Briefcase size={24} color="#D97706" />
                )}
              </View>
              <View>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                    {notification.title || 'New Activity Alert'}
                  </Text>
                  <Sparkles size={14} color="#F59E0B" style={tw`ml-1.5`} />
                </View>
                <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  {notification.category || 'Order'} • Ref: #{String(notification.id).slice(-6)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center`,
                isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}>
              <X size={16} color={isDark ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
            {/* Customer Details Box */}
            <View
              style={[
                tw`p-4 rounded-2xl mb-3`,
                isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
              ]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={tw`flex-row items-center`}>
                  <User size={14} color="#9CA3AF" />
                  <Text style={[tw`text-xs font-bold ml-1.5`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                    {notification.customerName || 'Direct Customer'}
                  </Text>
                </View>
                <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  {notification.dateTime || (notification.receivedAt ? new Date(notification.receivedAt).toLocaleTimeString() : 'Just now')}
                </Text>
              </View>

              {notification.raw?.customerPhone || notification.raw?.phone ? (
                <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Phone: {notification.raw.customerPhone || notification.raw.phone}
                </Text>
              ) : null}

              {notification.raw?.deliveryAddress || notification.raw?.address ? (
                <Text style={[tw`text-xs mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Address: {notification.raw.deliveryAddress || notification.raw.address}
                </Text>
              ) : null}
            </View>

            {/* Items Summary Box */}
            <View
              style={[
                tw`p-4 rounded-2xl mb-3 border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
                Item Summary
              </Text>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={[tw`font-bold text-sm flex-1 pr-2`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                  {notification.itemName || 'Ordered Item'}
                </Text>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  Qty: {notification.quantity || 1}
                </Text>
              </View>

              <View style={tw`flex-row justify-between items-center mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Total Bill Amount:
                </Text>
                <Text style={[tw`font-extrabold text-lg text-emerald-600`]}>
                  {notification.amount ? (notification.amount.startsWith('₹') ? notification.amount : `₹${notification.amount}`) : '₹0'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={tw`gap-2`}>
            {isOrder || isBooking ? (
              <View style={tw`flex-row justify-between gap-2`}>
                {/* Accept Button */}
                <TouchableOpacity
                  onPress={() => onAccept(notification)}
                  disabled={isProcessing}
                  style={[
                    tw`flex-1 py-3.5 rounded-2xl items-center justify-center flex-row bg-emerald-600`,
                    isProcessing && tw`opacity-70`,
                  ]}>
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" />
                      <Text style={tw`text-white font-bold text-sm ml-1.5`}>
                        {isBooking ? 'Confirm Booking' : 'Accept Order'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Reject Button */}
                <TouchableOpacity
                  onPress={() => onReject(notification)}
                  disabled={isProcessing}
                  style={[
                    tw`flex-1 py-3.5 rounded-2xl items-center justify-center flex-row border border-red-500 bg-red-50 dark:bg-zinc-900`,
                    isProcessing && tw`opacity-70`,
                  ]}>
                  <X size={18} color="#DC2626" />
                  <Text style={tw`text-red-600 font-bold text-sm ml-1.5`}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* View Full Details Button */}
            <TouchableOpacity
              onPress={() => onViewDetails(notification)}
              style={[
                tw`py-3 rounded-2xl items-center justify-center flex-row border`,
                isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-100 border-gray-200`,
              ]}>
              <ExternalLink size={16} color={isDark ? '#E4E4E7' : '#374151'} />
              <Text style={[tw`font-bold text-xs ml-1.5`, isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>
                View Order Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
