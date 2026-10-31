import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ShoppingCart,
  CalendarCheck,
  Briefcase,
  User,
  X,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react-native';

export interface VendorActivityNotification {
  id: string; // Order / Booking / Application ID
  category: 'Order' | 'Booking' | 'Job';
  title: string; // 'New Product Order' | 'New Service Booking' | 'New Job Application'
  customerName: string; // Customer name or candidate name
  itemName: string; // Product name, service name, or job title
  quantity?: number;
  amount?: string;
  dateTime: string;
  status: string;
  segment: 'Orders' | 'Bookings' | 'Jobs';
  raw?: any;
  receivedAt: number;
}

interface NotificationBannerProps {
  notification: VendorActivityNotification | null;
  onPress: (notification: VendorActivityNotification) => void;
  onDismiss: () => void;
  isDark?: boolean;
  autoDismissDuration?: number; // ms, default 8000
}

export default function NotificationBanner({
  notification,
  onPress,
  onDismiss,
  isDark = false,
  autoDismissDuration = 8000,
}: NotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  console.log('🎨 [NotificationBanner] Render:', notification?.id, notification?.title, 'insets.top:', insets.top);

  useEffect(() => {
    if (notification) {
      console.log('🎬 [NotificationBanner] Starting slide-in animation for:', notification.id);
      // Quick subtle spring down from -40 to 0
      slideAnim.setValue(-40);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();

      // Reset & animate progress bar
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: autoDismissDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Clear any previous timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Schedule auto-dismiss
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissDuration);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [notification]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  // Visual theming based on event category
  const isJob = notification.category === 'Job';
  const isBooking = notification.category === 'Booking';

  const categoryColor = isJob ? '#0284C7' : isBooking ? '#7C3AED' : '#059669';
  const categoryBgLight = isJob ? '#E0F2FE' : isBooking ? '#EDE9FE' : '#D1FAE5';
  const categoryBgDark = isJob ? 'rgba(2, 132, 199, 0.2)' : isBooking ? 'rgba(124, 58, 237, 0.2)' : 'rgba(5, 150, 105, 0.2)';
  const badgeBorder = isJob ? '#BAE6FD' : isBooking ? '#DDD6FE' : '#A7F3D0';

  const IconComponent = isJob ? Briefcase : isBooking ? CalendarCheck : ShoppingCart;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const bannerTop = insets.top > 0 ? insets.top + 8 : (Platform.OS === 'ios' ? 52 : 38);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: bannerTop,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          onPress(notification);
        }}
        style={[
          styles.card,
          isDark ? styles.cardDark : styles.cardLight,
        ]}>
        {/* Top Header Row */}
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`flex-row items-center flex-1 mr-2`}>
            {/* Category Icon Badge */}
            <View
              style={[
                tw`w-7 h-7 rounded-full items-center justify-center mr-2 border`,
                {
                  backgroundColor: isDark ? categoryBgDark : categoryBgLight,
                  borderColor: badgeBorder,
                },
              ]}>
              <IconComponent size={14} color={categoryColor} />
            </View>

            {/* Event Title */}
            <Text
              style={[
                tw`font-extrabold text-xs mr-2`,
                { color: categoryColor },
              ]}>
              {notification.title}
            </Text>

            {/* ID Pill */}
            <View
              style={[
                tw`px-2 py-0.5 rounded-full border`,
                isDark
                  ? tw`bg-zinc-800 border-zinc-700`
                  : tw`bg-gray-100 border-gray-200`,
              ]}>
              <Text
                style={[
                  tw`text-[10px] font-bold`,
                  isDark ? tw`text-zinc-300` : tw`text-gray-700`,
                ]}>
                {notification.id}
              </Text>
            </View>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              tw`w-6 h-6 rounded-full items-center justify-center`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <X size={13} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Main Details Body */}
        <View style={tw`flex-row items-start justify-between`}>
          <View style={tw`flex-1 mr-2`}>
            {/* Item / Service / Job Name */}
            <Text
              style={[
                tw`font-bold text-sm mb-1`,
                isDark ? tw`text-white` : tw`text-gray-900`,
              ]}
              numberOfLines={1}>
              {notification.itemName}
            </Text>

            {/* Customer / Candidate Name */}
            <View style={tw`flex-row items-center mb-1`}>
              <User size={12} color={isDark ? '#94A3B8' : '#64748B'} style={tw`mr-1`} />
              <Text
                style={[
                  tw`text-xs font-semibold`,
                  isDark ? tw`text-zinc-300` : tw`text-gray-700`,
                ]}
                numberOfLines={1}>
                {notification.customerName}
              </Text>
            </View>

            {/* Secondary Metadata Row */}
            <View style={tw`flex-row items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-0.5`}>
              {notification.quantity !== undefined && notification.quantity > 0 && (
                <View style={tw`flex-row items-center`}>
                  <Layers size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                  <Text
                    style={[
                      tw`text-[11px] font-medium`,
                      isDark ? tw`text-zinc-400` : tw`text-gray-500`,
                    ]}>
                    Qty: {notification.quantity}
                  </Text>
                </View>
              )}

              {notification.amount ? (
                <Text style={tw`text-[11px] font-bold text-emerald-600 dark:text-emerald-400`}>
                  {notification.amount}
                </Text>
              ) : null}

              <View style={tw`flex-row items-center`}>
                <Clock size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                <Text
                  style={[
                    tw`text-[11px] font-medium`,
                    isDark ? tw`text-zinc-400` : tw`text-gray-500`,
                  ]}>
                  {notification.dateTime}
                </Text>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  tw`px-1.5 py-0.2 rounded border`,
                  isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-100 border-gray-200`,
                ]}>
                <Text
                  style={[
                    tw`text-[9px] font-semibold`,
                    isDark ? tw`text-zinc-300` : tw`text-gray-600`,
                  ]}>
                  {notification.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Action Arrow */}
          <View style={tw`items-center justify-center self-center pl-1`}>
            <View
              style={[
                tw`w-7 h-7 rounded-full items-center justify-center border`,
                isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-50 border-gray-200`,
              ]}>
              <ChevronRight size={15} color={categoryColor} />
            </View>
            <Text
              style={[
                tw`text-[9px] font-bold mt-0.5`,
                { color: categoryColor },
              ]}>
              View
            </Text>
          </View>
        </View>

        {/* Auto-Dismiss Progress Bar */}
        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: isDark ? '#27272A' : '#F1F5F9' },
          ]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth,
                backgroundColor: categoryColor,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    borderRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  progressBarTrack: {
    height: 3,
    width: '100%',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
