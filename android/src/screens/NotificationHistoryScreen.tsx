import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  Bell,
  ShoppingBag,
  CalendarCheck,
  Briefcase,
  CreditCard,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { socketService } from '../services/socketService';
import { sessionManager } from '../services/sessionManager';
import { getVendorUser, fetchVendorNotifications, markVendorNotificationReadApi } from '../services/apiService';
import { VendorActivityNotification } from '../components/NotificationBanner';

interface NotificationHistoryScreenProps {
  onNavigate?: (tab: any, params?: any) => void;
  onBack?: () => void;
  isDark?: boolean;
}

export default function NotificationHistoryScreen({
  onNavigate,
  onBack,
  isDark = false,
}: NotificationHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<VendorActivityNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = getVendorUser();
  const vendorId = currentUser?.vendorId || currentUser?._id || currentUser?.id || 'vendor_default';

  const loadNotifications = useCallback(async () => {
    try {
      const [serverNotifs, localHistory] = await Promise.allSettled([
        fetchVendorNotifications(),
        sessionManager.getNotificationHistory(vendorId)
      ]);
      const mergedMap = new Map<string, any>();
      if (serverNotifs.status === 'fulfilled' && Array.isArray(serverNotifs.value)) {
        serverNotifs.value.forEach(n => {
          if (n && (n.id || n.orderId)) {
            mergedMap.set(String(n.id || n.orderId), n);
          }
        });
      }
      if (localHistory.status === 'fulfilled' && Array.isArray(localHistory.value)) {
        localHistory.value.forEach(n => {
          if (n && n.id) {
            const key = String(n.id);
            if (!mergedMap.has(key)) {
              mergedMap.set(key, n);
            }
          }
        });
      }
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = a.receivedAt || (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.receivedAt || (b.date ? new Date(b.date).getTime() : 0);
        return timeB - timeA;
      });
      setNotifications(mergedList);
    } catch {
      setNotifications([]);
    } finally {
      setRefreshing(false);
    }
  }, [vendorId]);

  useEffect(() => {
    loadNotifications();

    // Listen to new incoming real-time notifications to update list live
    const unsub = socketService.onNotificationReceived((notif) => {
      setNotifications(prev => [notif, ...prev.filter(item => item.id !== notif.id)].slice(0, 50));
    });

    return () => {
      unsub();
    };
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Notification History',
      'Are you sure you want to clear all notification records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await sessionManager.clearNotificationHistory(vendorId);
            setNotifications([]);
          },
        },
      ]
    );
  };

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#18181b' : '#FFFFFF'}
      />

      {/* Header */}
      <View
        style={[
          tw`px-5 pb-4 flex-row items-center justify-between border-b`,
          isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
          { paddingTop: insets.top + 8 },
        ]}>
        <View style={tw`flex-row items-center flex-1`}>
          <TouchableOpacity
            onPress={() => onBack ? onBack() : onNavigate?.('Home')}
            activeOpacity={0.7}
            style={[
              tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <ArrowLeft size={20} color={isDark ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Notification Center
            </Text>
            <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Real-time alerts, orders & announcements
            </Text>
          </View>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            activeOpacity={0.7}
            style={[
              tw`p-2 rounded-xl flex-row items-center`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <Trash2 size={16} color={isDark ? '#F87171' : '#EF4444'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {notifications.length === 0 ? (
          <View
            style={[
              tw`p-10 rounded-3xl items-center justify-center border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <Bell size={48} color="#9CA3AF" style={tw`mb-3`} />
            <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
              No Recent Notifications
            </Text>
            <Text style={[tw`text-xs text-center mt-1 px-4`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              When new customer orders, bookings, applications or payouts arrive, you will receive real-time notifications here and in your phone's notification bar.
            </Text>
          </View>
        ) : (
          notifications.map((item, idx) => {
            const isBooking = item.category === 'Booking' || item.segment === 'Bookings';
            const isJob = item.category === 'Job' || item.segment === 'Jobs';
            const isOrder = !isBooking && !isJob;
            const hasStatusTransition = Boolean(
              item.previousStatus &&
              (item.newStatus || item.status) &&
              item.previousStatus !== (item.newStatus || item.status)
            );

            return (
              <TouchableOpacity
                key={item.id || idx}
                onPress={() => {
                  markVendorNotificationReadApi(item.id);
                  const targetSegment = isJob ? 'Jobs' : isBooking ? 'Bookings' : 'Orders';
                  onNavigate?.('Orders', { segment: targetSegment, targetId: item.id });
                }}
                activeOpacity={0.7}
                style={[
                  tw`p-4 rounded-2xl mb-3 border flex-row items-start`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-xl items-center justify-center mr-3`,
                    isOrder
                      ? { backgroundColor: '#ECFDF5' }
                      : isBooking
                      ? { backgroundColor: '#EEF2FF' }
                      : { backgroundColor: '#F5F3FF' },
                  ]}>
                  {isOrder ? (
                    <ShoppingBag size={20} color="#059669" />
                  ) : isBooking ? (
                    <CalendarCheck size={20} color="#4F46E5" />
                  ) : (
                    <Briefcase size={20} color="#7C3AED" />
                  )}
                </View>
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Text style={[tw`font-bold text-sm flex-1 mr-2`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {item.title}
                    </Text>
                    {hasStatusTransition && (
                      <View style={[tw`px-2 py-0.5 rounded-full`, isDark ? tw`bg-amber-950/60` : tw`bg-amber-100`]}>
                        <Text style={[tw`text-[9px] font-bold`, isDark ? tw`text-amber-400` : tw`text-amber-800`]}>
                          {item.previousStatus} → {item.newStatus || item.status}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[tw`text-xs mt-0.5 font-medium`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                    {item.customerName ? `${item.customerName} • ` : ''}{item.itemName || 'Activity update'}
                  </Text>

                  {item.description ? (
                    <Text style={[tw`text-[11px] mt-0.5 italic`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={tw`flex-row items-center justify-between mt-1.5`}>
                    <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      {item.dateTime || (item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString() : 'Recent')}
                    </Text>
                    {item.amount && (
                      <Text style={tw`text-xs font-bold text-emerald-600 dark:text-emerald-400`}>
                        {typeof item.amount === 'number' ? `₹${item.amount}` : item.amount.startsWith('₹') ? item.amount : `₹${item.amount}`}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
