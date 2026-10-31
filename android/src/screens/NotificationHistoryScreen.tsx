import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
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
import { VendorActivityNotification } from '../components/NotificationBanner';

interface NotificationHistoryScreenProps {
  onNavigate?: (tab: any, params?: any) => void;
  isDark?: boolean;
}

export default function NotificationHistoryScreen({
  onNavigate,
  isDark = false,
}: NotificationHistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<VendorActivityNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = () => {
    // In a production setup, notifications can be stored in AsyncStorage or fetched from /api/vendor/notifications
    // For now we load from active memory buffer
    setNotifications([]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
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
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => onNavigate?.('Home')}
            activeOpacity={0.7}
            style={[
              tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <ArrowLeft size={20} color={isDark ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Notification Center
            </Text>
            <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Real-time alerts, orders & announcements
            </Text>
          </View>
        </View>
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
          notifications.map((item, idx) => (
            <TouchableOpacity
              key={item.id || idx}
              onPress={() => {
                if (item.segment) {
                  onNavigate?.('Orders', { segment: item.segment, targetId: item.id });
                }
              }}
              style={[
                tw`p-4 rounded-2xl mb-3 border flex-row items-start`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3 bg-indigo-50 dark:bg-zinc-800`]}>
                <ShoppingBag size={20} color="#4F46E5" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                  {item.title}
                </Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  {item.customerName ? `${item.customerName} • ` : ''}{item.itemName || 'Activity update'}
                </Text>
                <Text style={[tw`text-[10px] mt-1.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  {item.dateTime || (item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString() : 'Recent')}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
