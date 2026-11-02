import React, { useEffect, useState, useMemo } from 'react';
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
  Calendar,
  ShoppingBag,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Users,
  Briefcase,
  Store,
  Compass,
  Hotel,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Polygon,
  Polyline,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from 'react-native-svg';
import { fetchAnalytics, fetchOrders, fetchBookings, fetchApplications } from '../services/apiService';

interface PaymentsScreenProps {
  isDark?: boolean;
}

export default function PaymentsScreen({ isDark = false }: PaymentsScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '6m'>('7d');
  const [analytics, setAnalytics] = useState<any>({
    totalOrdersCount: 0,
    totalRevenue: 0,
    totalItemsCount: 0,
    activeMembershipsCount: 0,
    ordersCount: 0,
    bookingsCount: 0,
    applicationsCount: 0,
    customersCount: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [analRes, ordRes, bkRes, appRes] = await Promise.all([
        fetchAnalytics().catch(() => null),
        fetchOrders().catch(() => []),
        fetchBookings().catch(() => []),
        fetchApplications().catch(() => []),
      ]);

      if (analRes) setAnalytics(analRes);
      if (Array.isArray(ordRes)) setOrders(ordRes);
      if (Array.isArray(bkRes)) setBookings(bkRes);
      if (Array.isArray(appRes)) setApplications(appRes);
    } catch (err) {
      console.warn('[PaymentsScreen] Error loading analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalRevenue = analytics?.totalRevenue || 0;
  const totalOrders = analytics?.ordersCount ?? (analytics?.totalOrdersCount || orders.length || 0);
  const totalBookings = analytics?.bookingsCount ?? (analytics?.totalBookingsCount || bookings.length || 0);
  const totalApplications = analytics?.applicationsCount ?? (analytics?.totalApplicationsCount || applications.length || 0);
  const totalCustomers = analytics?.customersCount ?? (analytics?.totalCustomersCount || 0);

  const grossRevenue = useMemo(() => {
    if (analytics?.totalRevenue && analytics.totalRevenue > 0) return analytics.totalRevenue;
    let sum = 0;
    (orders || []).forEach((o: any) => {
      const val = Number(o.totalAmount || o.amount || o.price || 0);
      if (!isNaN(val)) sum += val;
    });
    (bookings || []).forEach((b: any) => {
      const val = Number(b.totalAmount || b.amount || b.price || 0);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  }, [analytics, orders, bookings]);

  const settledRevenue = useMemo(() => {
    let sum = 0;
    (orders || []).forEach((o: any) => {
      const status = String(o.orderStatus || o.status || '').toLowerCase();
      if (status === 'delivered' || status === 'completed') {
        const val = Number(o.totalAmount || o.amount || o.price || 0);
        if (!isNaN(val)) sum += val;
      }
    });
    (bookings || []).forEach((b: any) => {
      const status = String(b.bookingStatus || b.status || '').toLowerCase();
      if (status === 'completed' || status === 'checked_out') {
        const val = Number(b.totalAmount || b.amount || b.price || 0);
        if (!isNaN(val)) sum += val;
      }
    });
    return sum;
  }, [orders, bookings]);

  // Chart data: 7 days or 6 months
  const trendData = useMemo(() => {
    if (selectedPeriod === '6m') {
      if (Array.isArray(analytics?.monthlyRevenue) && analytics.monthlyRevenue.length > 0) {
        return analytics.monthlyRevenue.map((m: any) => ({
          date: m.month || m.name || '',
          amount: Number(m.revenue || m.amount) || 0,
        }));
      }
      return [
        { date: 'May', amount: 0 },
        { date: 'Jun', amount: 0 },
        { date: 'Jul', amount: 0 },
        { date: 'Aug', amount: 0 },
        { date: 'Sep', amount: 0 },
        { date: 'Oct', amount: 0 },
      ];
    }

    // Default: Last 7 Days
    const trend = analytics?.recentRevenue || analytics?.revenueTrend;
    if (Array.isArray(trend) && trend.length > 0) {
      return trend.slice(-7).map((d: any) => ({
        date: String(d.date || '').slice(-5),
        amount: Number(d.amount) || 0,
      }));
    }

    return [
      { date: 'Mon', amount: 0 },
      { date: 'Tue', amount: 0 },
      { date: 'Wed', amount: 0 },
      { date: 'Thu', amount: 0 },
      { date: 'Fri', amount: 0 },
      { date: 'Sat', amount: 0 },
      { date: 'Sun', amount: 0 },
    ];
  }, [selectedPeriod, analytics]);

  const maxRevenueVal = useMemo(() => {
    const maxVal = Math.max(...trendData.map((d: any) => Number(d.amount) || 0), 1000);
    return Math.ceil(maxVal / 1000) * 1000;
  }, [trendData]);

  const chartPoints = useMemo(() => {
    const totalPoints = trendData.length || 7;
    const startX = 40;
    const endX = 310;
    const stepX = (endX - startX) / Math.max(totalPoints - 1, 1);
    const topY = 30;
    const bottomY = 170;
    const heightRange = bottomY - topY;

    return trendData.map((d: any, i: number) => {
      const x = Math.round(startX + i * stepX);
      const amt = Number(d.amount) || 0;
      const ratio = Math.min(Math.max(amt / maxRevenueVal, 0), 1);
      const y = Math.round(bottomY - ratio * heightRange);
      return { x, y, date: d.date || '', amount: amt };
    });
  }, [trendData, maxRevenueVal]);

  const polylinePoints = chartPoints.map((p: any) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${chartPoints[0]?.x || 40},170 ${polylinePoints} ${chartPoints[chartPoints.length - 1]?.x || 310},170`;

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#18181b' : '#FFFFFF'}
      />

      {/* Header Banner */}
      <View
        style={[
          tw`px-5 pb-4 flex-row items-center justify-between border-b`,
          isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
          { paddingTop: insets.top + 8 },
        ]}>
        <View>
          <Text style={[tw`text-2xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
            Analytics & Reports
          </Text>
          <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
            Real-time sales, order velocity & revenue trends
          </Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={[
            tw`w-9 h-9 rounded-full items-center justify-center`,
            isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
          ]}>
          <RefreshCw size={16} color={isDark ? '#A1A1AA' : '#4B5563'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* 2x2 Stats Grid */}
        <View style={tw`flex-row flex-wrap justify-between mb-4`}>
          {/* Revenue */}
          <View
            style={[
              tw`rounded-3xl p-4.5 mb-3.5 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              { width: '48%' },
            ]}>
            <View style={tw`flex-row justify-between items-start mb-1`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Gross Revenue
              </Text>
              <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: '#EEF2FF' }]}>
                <ShoppingBag size={18} color="#4F46E5" />
              </View>
            </View>
            <Text style={[tw`font-extrabold text-xl text-emerald-600`]}>
              ₹{grossRevenue.toLocaleString()}
            </Text>
            <Text style={[tw`text-[10px] mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
              Settled: ₹{settledRevenue.toLocaleString()}
            </Text>
          </View>

          {/* Orders */}
          <View
            style={[
              tw`rounded-3xl p-4.5 mb-3.5 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              { width: '48%' },
            ]}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Total Orders
              </Text>
              <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: '#ECFDF5' }]}>
                <ClipboardList size={18} color="#10B981" />
              </View>
            </View>
            <Text style={[tw`font-extrabold text-xl`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              {totalOrders}
            </Text>
          </View>

          {/* Bookings */}
          <View
            style={[
              tw`rounded-3xl p-4.5 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              { width: '48%' },
            ]}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Bookings
              </Text>
              <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: '#FFFBEB' }]}>
                <CalendarCheck size={18} color="#F59E0B" />
              </View>
            </View>
            <Text style={[tw`font-extrabold text-xl`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              {totalBookings}
            </Text>
          </View>

          {/* Customers */}
          <View
            style={[
              tw`rounded-3xl p-4.5 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              { width: '48%' },
            ]}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Unique Buyers
              </Text>
              <View style={[tw`w-8 h-8 rounded-xl items-center justify-center`, { backgroundColor: '#FEF2F2' }]}>
                <Users size={18} color="#EF4444" />
              </View>
            </View>
            <Text style={[tw`font-extrabold text-xl`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              {totalCustomers}
            </Text>
          </View>
        </View>

        {/* Business Classification Breakdown Cards */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
          Business Classification Breakdown
        </Text>
        <View style={tw`flex-row justify-between mb-5`}>
          {/* Orders: Product, Food, Daily Needs */}
          <View
            style={[
              tw`flex-1 mr-1.5 p-3.5 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center mb-1`}>
              <Store size={14} color="#4F46E5" style={tw`mr-1`} />
              <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                Direct Orders
              </Text>
            </View>
            <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
              Products, Food & Daily Needs
            </Text>
            <Text style={[tw`font-extrabold text-base mt-2 text-indigo-600`]}>
              {totalOrders}
            </Text>
          </View>

          {/* Bookings: Services, Stay, Travel */}
          <View
            style={[
              tw`flex-1 mx-1.5 p-3.5 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center mb-1`}>
              <CalendarCheck size={14} color="#F59E0B" style={tw`mr-1`} />
              <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                Bookings
              </Text>
            </View>
            <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
              Services, Stays & Travels
            </Text>
            <Text style={[tw`font-extrabold text-base mt-2 text-amber-600`]}>
              {totalBookings}
            </Text>
          </View>

          {/* Candidate Applications: Jobs */}
          <View
            style={[
              tw`flex-1 ml-1.5 p-3.5 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center mb-1`}>
              <Briefcase size={14} color="#10B981" style={tw`mr-1`} />
              <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                Job Candidates
              </Text>
            </View>
            <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
              Applications Received
            </Text>
            <Text style={[tw`font-extrabold text-base mt-2 text-emerald-600`]}>
              {totalApplications}
            </Text>
          </View>
        </View>

        {/* Revenue Overview Chart Section */}
        <View
          style={[
            tw`rounded-3xl p-5 mb-5 border`,
            isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            },
          ]}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <View>
              <Text style={[tw`text-base font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                Revenue Trend
              </Text>
              <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Max Peak: ₹{maxRevenueVal.toLocaleString()}
              </Text>
            </View>

            {/* Period Filter Toggles */}
            <View
              style={[
                tw`flex-row p-1 rounded-xl border`,
                isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-100 border-gray-200`,
              ]}>
              <TouchableOpacity
                onPress={() => setSelectedPeriod('7d')}
                style={[
                  tw`px-3 py-1 rounded-lg`,
                  selectedPeriod === '7d' && tw`bg-indigo-600`,
                ]}>
                <Text
                  style={[
                    tw`text-xs font-bold`,
                    selectedPeriod === '7d'
                      ? tw`text-white`
                      : isDark
                      ? tw`text-zinc-400`
                      : tw`text-gray-600`,
                  ]}>
                  7 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedPeriod('6m')}
                style={[
                  tw`px-3 py-1 rounded-lg`,
                  selectedPeriod === '6m' && tw`bg-indigo-600`,
                ]}>
                <Text
                  style={[
                    tw`text-xs font-bold`,
                    selectedPeriod === '6m'
                      ? tw`text-white`
                      : isDark
                      ? tw`text-zinc-400`
                      : tw`text-gray-600`,
                  ]}>
                  6 Months
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Svg Line Chart */}
          <View style={tw`items-center`}>
            <Svg width="330" height="210">
              <Defs>
                <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
                  <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line x1="40" y1="30" x2="310" y2="30" stroke={isDark ? '#27272A' : '#F3F4F6'} strokeWidth="1" strokeDasharray="3,3" />
              <Line x1="40" y1="65" x2="310" y2="65" stroke={isDark ? '#27272A' : '#F3F4F6'} strokeWidth="1" strokeDasharray="3,3" />
              <Line x1="40" y1="100" x2="310" y2="100" stroke={isDark ? '#27272A' : '#F3F4F6'} strokeWidth="1" strokeDasharray="3,3" />
              <Line x1="40" y1="135" x2="310" y2="135" stroke={isDark ? '#27272A' : '#F3F4F6'} strokeWidth="1" strokeDasharray="3,3" />
              <Line x1="40" y1="170" x2="310" y2="170" stroke={isDark ? '#3F3F46' : '#E5E7EB'} strokeWidth="1" />

              {/* Y Axis Labels */}
              <SvgText x="30" y="34" fill={isDark ? '#71717A' : '#9CA3AF'} fontSize="9" fontWeight="bold" textAnchor="end">₹{Math.round(maxRevenueVal / 1000)}k</SvgText>
              <SvgText x="30" y="69" fill={isDark ? '#71717A' : '#9CA3AF'} fontSize="9" fontWeight="bold" textAnchor="end">₹{Math.round(maxRevenueVal * 0.75 / 1000)}k</SvgText>
              <SvgText x="30" y="104" fill={isDark ? '#71717A' : '#9CA3AF'} fontSize="9" fontWeight="bold" textAnchor="end">₹{Math.round(maxRevenueVal * 0.5 / 1000)}k</SvgText>
              <SvgText x="30" y="139" fill={isDark ? '#71717A' : '#9CA3AF'} fontSize="9" fontWeight="bold" textAnchor="end">₹{Math.round(maxRevenueVal * 0.25 / 1000)}k</SvgText>
              <SvgText x="30" y="174" fill={isDark ? '#71717A' : '#9CA3AF'} fontSize="9" fontWeight="bold" textAnchor="end">0</SvgText>

              {/* Area Gradient */}
              <Polygon points={areaPoints} fill="url(#chartGradient)" />

              {/* Polyline */}
              <Polyline points={polylinePoints} fill="none" stroke="#4F46E5" strokeWidth="2.5" />

              {/* Data points */}
              {chartPoints.map((pt: any, idx: number) => (
                <Circle
                  key={`pt-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#4F46E5"
                  stroke={isDark ? '#18181b' : '#FFFFFF'}
                  strokeWidth="1.5"
                />
              ))}

              {/* X Axis Labels */}
              {chartPoints.map((pt: any, idx: number) => (
                <SvgText
                  key={`lbl-${idx}`}
                  x={pt.x}
                  y="195"
                  fill={isDark ? '#71717A' : '#9CA3AF'}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle">
                  {pt.date}
                </SvgText>
              ))}
            </Svg>
          </View>
        </View>

        {/* Recent Transactions Feed */}
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
            Recent Business Activity
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#4F46E5" style={tw`py-6`} />
        ) : orders.length === 0 ? (
          <View
            style={[
              tw`rounded-3xl p-6 items-center justify-center border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              No transactions recorded yet
            </Text>
          </View>
        ) : (
          orders.slice(0, 4).map((ord: any, idx: number) => (
            <View
              key={ord._id || idx}
              style={[
                tw`rounded-2xl p-4 mb-2.5 flex-row items-center justify-between border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <View style={tw`flex-row items-center flex-1 pr-2`}>
                <View
                  style={[
                    tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                    isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`,
                  ]}>
                  <ShoppingBag size={18} color="#4F46E5" />
                </View>
                <View style={tw`flex-1`}>
                  <Text
                    style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}
                    numberOfLines={1}>
                    {ord.items?.[0]?.name || ord.memberName || 'Customer Order'}
                  </Text>
                  <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    Status: {ord.status || 'Confirmed'} • {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
              </View>

              <Text style={[tw`font-extrabold text-base text-emerald-600`]}>
                ₹{ord.finalAmount || ord.totalAmount || 0}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
