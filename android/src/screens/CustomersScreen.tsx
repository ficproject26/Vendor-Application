import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Receipt,
  CreditCard,
  ShoppingBag,
  ExternalLink,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import {
  fetchCustomers,
  fetchCustomerPurchases,
  CustomerItem,
  CustomerPurchaseItem,
} from '../services/apiService';

interface CustomersScreenProps {
  onNavigate?: (tab: any) => void;
  isDark?: boolean;
}

export const formatCustomerId = (c: any): string => {
  if (!c) return 'N/A';
  const isCanonical = (id: any) =>
    id &&
    (String(id).startsWith('FIC-CUS-') ||
      String(id).startsWith('FIC-CUST-') ||
      String(id).startsWith('REG-')) &&
    String(id) !== 'FIC-CUST-100001';

  if (typeof c === 'object') {
    if (isCanonical(c.customerId)) return String(c.customerId);
    if (isCanonical(c.customerDisplayId)) return String(c.customerDisplayId);
    if (isCanonical(c.registrationId)) return String(c.registrationId);
    if (isCanonical(c.userRegistrationId)) return String(c.userRegistrationId);
    if (isCanonical(c.memberId)) return String(c.memberId);
    if (isCanonical(c.id)) return String(c.id);
    if (isCanonical(c._id)) return String(c._id);
  }
  const rawId = String(c).trim();
  if (isCanonical(rawId)) return rawId;
  return 'N/A';
};

export const getCustomerAvatarUrl = (c: CustomerItem): string => {
  if (c.avatarUrl) return c.avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    c.name || 'Customer'
  )}&background=4F46E5&color=fff&bold=true`;
};

export default function CustomersScreen({
  onNavigate,
  isDark = false,
}: CustomersScreenProps) {
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase History Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [purchases, setPurchases] = useState<CustomerPurchaseItem[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);

  const loadCustomers = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[CustomersScreen] Failed to fetch customers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const openCustomerPurchases = async (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setPurchaseModalVisible(true);
    setLoadingPurchases(true);
    setPurchases([]);
    try {
      const canonicalId = formatCustomerId(customer);
      const queryId = canonicalId !== 'N/A' ? canonicalId : (customer._id || customer.id || '');
      const history = await fetchCustomerPurchases(queryId, {
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
      });
      setPurchases(Array.isArray(history) ? history : []);
    } catch (err) {
      console.warn('[CustomersScreen] Failed to fetch customer purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const id = formatCustomerId(c).toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
    });
  }, [customers, searchQuery]);

  // Aggregate stats
  const totalSpentAll = useMemo(() => {
    return customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);
  }, [customers]);

  const totalOrdersAll = useMemo(() => {
    return customers.reduce((sum, c) => sum + (Number(c.ordersCount || c.visits) || 1), 0);
  }, [customers]);

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          tw`px-5 pb-4 border-b`,
          { paddingTop: Math.max(insets.top, 16) },
          isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-150`,
        ]}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center flex-1`}>
            {onNavigate && (
              <TouchableOpacity
                onPress={() => onNavigate('Home')}
                activeOpacity={0.7}
                style={[
                  tw`w-10 h-10 rounded-2xl items-center justify-center mr-3`,
                  isDark ? tw`bg-zinc-800 border border-zinc-700` : tw`bg-gray-100 border border-gray-200`,
                ]}>
                <ArrowLeft size={18} color={isDark ? '#FFFFFF' : '#1F2937'} />
              </TouchableOpacity>
            )}
            <View style={tw`flex-1`}>
              <View style={tw`flex-row items-center`}>
                <Text style={[tw`text-xl font-black tracking-tight`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                  Ecosystem Customers
                </Text>
                <View style={tw`ml-2.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30`}>
                  <Text style={tw`text-[10px] font-black text-indigo-500`}>{customers.length}</Text>
                </View>
              </View>
              <Text style={[tw`text-xs font-medium mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Customers who interacted with your business
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            style={[
              tw`w-9 h-9 rounded-xl items-center justify-center`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <RefreshCw size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            tw`flex-row items-center mt-3.5 px-3.5 py-2.5 rounded-2xl border`,
            isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
          ]}>
          <Search size={16} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-2.5`} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by customer name, email, phone or ID..."
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
            style={[tw`flex-1 text-sm font-semibold p-0`, isDark ? tw`text-white` : tw`text-gray-900`]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Aggregate KPI Strip */}
      <View style={tw`px-5 pt-3 pb-1`}>
        <View style={tw`flex-row gap-2.5`}>
          <View
            style={[
              tw`flex-1 p-3 rounded-2xl border`,
              isDark ? tw`bg-zinc-900/70 border-zinc-800` : tw`bg-white border-gray-150`,
            ]}>
            <Text style={[tw`text-[10px] uppercase font-bold tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
              Total Customers
            </Text>
            <Text style={[tw`text-lg font-black mt-0.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              {customers.length}
            </Text>
          </View>

          <View
            style={[
              tw`flex-1 p-3 rounded-2xl border`,
              isDark ? tw`bg-zinc-900/70 border-zinc-800` : tw`bg-white border-gray-150`,
            ]}>
            <Text style={[tw`text-[10px] uppercase font-bold tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
              Interactions
            </Text>
            <Text style={[tw`text-lg font-black mt-0.5 text-indigo-500`]}>
              {totalOrdersAll}
            </Text>
          </View>

          <View
            style={[
              tw`flex-1 p-3 rounded-2xl border`,
              isDark ? tw`bg-zinc-900/70 border-zinc-800` : tw`bg-white border-gray-150`,
            ]}>
            <Text style={[tw`text-[10px] uppercase font-bold tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>
              Total Revenue
            </Text>
            <Text style={tw`text-lg font-black mt-0.5 text-emerald-500`}>
              ₹{totalSpentAll.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Content List */}
      <ScrollView
        contentContainerStyle={tw`p-5 pt-2 pb-24`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
        }>
        {loading ? (
          <View style={tw`py-20 items-center justify-center`}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[tw`text-xs font-semibold mt-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Loading customer profiles...
            </Text>
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View
            style={[
              tw`py-16 px-6 rounded-3xl items-center justify-center border text-center`,
              isDark ? tw`bg-zinc-900/60 border-zinc-800` : tw`bg-white border-gray-200`,
            ]}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
                isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}>
              <User size={30} color={isDark ? '#71717A' : '#9CA3AF'} />
            </View>
            <Text style={[tw`text-base font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              {searchQuery ? 'No Matching Customers' : 'No Customers Registered Yet'}
            </Text>
            <Text style={[tw`text-xs text-center mt-1.5 leading-relaxed`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              {searchQuery
                ? 'Try a different search query for name, phone, or customer ID.'
                : 'Customer records will automatically populate here as they place orders and bookings with your business.'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map(customer => {
            const canonicalId = formatCustomerId(customer);
            const isCanonical = canonicalId !== 'N/A';
            const avatarUrl = getCustomerAvatarUrl(customer);
            const gender =
              customer.gender && customer.gender !== 'Not provided'
                ? customer.gender
                : customer.gender || 'Not specified';

            return (
              <View
                key={customer._id || canonicalId}
                style={[
                  tw`rounded-3xl p-5 mb-4 border shadow-sm`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`,
                ]}>
                {/* Top Info Row */}
                <View style={tw`flex-row items-center mb-4`}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={tw`w-14 h-14 rounded-2xl bg-indigo-100 border border-indigo-200`}
                  />

                  <View style={tw`flex-1 ml-3.5`}>
                    <View style={tw`flex-row items-center justify-between`}>
                      <Text
                        style={[tw`text-base font-extrabold flex-1 mr-2`, isDark ? tw`text-white` : tw`text-gray-900`]}
                        numberOfLines={1}>
                        {customer.name || 'Valued Customer'}
                      </Text>
                      {isCanonical ? (
                        <View style={tw`flex-row items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30`}>
                          <ShieldCheck size={10} color="#10B981" style={tw`mr-1`} />
                          <Text style={tw`text-[10px] font-bold text-emerald-500`}>Verified</Text>
                        </View>
                      ) : null}
                    </View>

                    {customer.email ? (
                      <View style={tw`flex-row items-center mt-1`}>
                        <Mail size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1.5`} />
                        <Text
                          style={[tw`text-xs font-mono`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}
                          numberOfLines={1}>
                          {customer.email}
                        </Text>
                      </View>
                    ) : null}

                    {customer.phone ? (
                      <View style={tw`flex-row items-center mt-1`}>
                        <Phone size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1.5`} />
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          {customer.phone}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* ID & Gender Badges */}
                <View
                  style={[
                    tw`flex-row flex-wrap gap-2 py-2.5 px-3 rounded-2xl mb-3.5`,
                    isDark ? tw`bg-zinc-950/70` : tw`bg-gray-50`,
                  ]}>
                  <View style={tw`flex-row items-center`}>
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      ID:{' '}
                    </Text>
                    <Text
                      style={[
                        tw`text-[10px] font-black font-mono`,
                        isCanonical ? tw`text-indigo-400` : isDark ? tw`text-zinc-400` : tw`text-gray-600`,
                      ]}>
                      {canonicalId}
                    </Text>
                  </View>

                  <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-700` : tw`text-gray-300`]}>•</Text>

                  <View style={tw`flex-row items-center`}>
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      Gender:{' '}
                    </Text>
                    <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      {gender}
                    </Text>
                  </View>

                  {customer.address && customer.address !== 'Not provided' ? (
                    <>
                      <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-700` : tw`text-gray-300`]}>•</Text>
                      <View style={tw`flex-row items-center flex-1`}>
                        <MapPin size={9} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                        <Text
                          style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}
                          numberOfLines={1}>
                          {customer.address}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>

                {/* Stats & Action Row */}
                <View style={tw`flex-row items-center justify-between pt-3 border-t border-gray-150 dark:border-zinc-800`}>
                  <View style={tw`flex-row gap-3`}>
                    <View>
                      <Text style={[tw`text-[9px] uppercase font-extrabold tracking-wider`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Visits / Orders
                      </Text>
                      <Text style={[tw`text-xs font-black mt-0.5`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                        {customer.ordersCount || customer.visits || 1} times
                      </Text>
                    </View>

                    <View style={tw`pl-3 border-l border-gray-200 dark:border-zinc-800`}>
                      <Text style={[tw`text-[9px] uppercase font-extrabold tracking-wider`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Total Spent
                      </Text>
                      <Text style={tw`text-sm font-black text-emerald-500 mt-0.5`}>
                        ₹{Number(customer.totalSpent || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => openCustomerPurchases(customer)}
                    activeOpacity={0.7}
                    style={tw`flex-row items-center px-3.5 py-2 rounded-xl bg-indigo-600`}>
                    <Receipt size={13} color="#FFFFFF" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs font-black text-white`}>History</Text>
                    <ChevronRight size={13} color="#FFFFFF" style={tw`ml-0.5`} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Customer Purchase History Modal */}
      <Modal
        visible={purchaseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPurchaseModalVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View
            style={[
              tw`rounded-t-3xl max-h-[85%] border-t`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`,
            ]}>
            {/* Modal Header */}
            <View
              style={[
                tw`p-5 pb-4 border-b flex-row items-center justify-between`,
                isDark ? tw`border-zinc-800` : tw`border-gray-200`,
              ]}>
              <View style={tw`flex-1 mr-3`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`text-lg font-black`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                    {selectedCustomer?.name || 'Customer'}'s History
                  </Text>
                  <View style={tw`ml-2 px-2 py-0.5 rounded-full bg-indigo-500/15`}>
                    <Text style={tw`text-[10px] font-black text-indigo-500`}>{purchases.length} Records</Text>
                  </View>
                </View>
                <Text style={[tw`text-xs font-mono mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  ID: {selectedCustomer ? formatCustomerId(selectedCustomer) : 'N/A'} • Spent: ₹
                  {Number(selectedCustomer?.totalSpent || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setPurchaseModalVisible(false)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {/* Modal List */}
            <ScrollView contentContainerStyle={tw`p-5 pt-3 pb-8`} showsVerticalScrollIndicator={false}>
              {loadingPurchases ? (
                <View style={tw`py-16 items-center justify-center`}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={[tw`text-xs font-semibold mt-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    Loading purchase history...
                  </Text>
                </View>
              ) : purchases.length === 0 ? (
                <View style={tw`py-14 items-center justify-center text-center`}>
                  <Receipt size={40} color={isDark ? '#3F3F46' : '#D1D5DB'} />
                  <Text style={[tw`text-sm font-bold mt-3`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                    No Purchases Found
                  </Text>
                  <Text style={[tw`text-xs text-center mt-1 px-8`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                    No previous order or booking transactions were logged for this customer under your active business.
                  </Text>
                </View>
              ) : (
                purchases.map(p => {
                  const orderNum = p.order_number || p.orderNumber || p._id;
                  const dateStr = p.orderDate || p.createdAt || p.created_at;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';
                  const amount = Number(p.finalAmount || p.amount || 0);

                  const isPaid = (p.paymentStatus || '').toLowerCase() === 'paid';

                  return (
                    <View
                      key={p._id || orderNum}
                      style={[
                        tw`p-4 rounded-2xl mb-3 border`,
                        isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                      ]}>
                      {/* Order top bar */}
                      <View style={tw`flex-row items-center justify-between mb-2`}>
                        <View style={tw`flex-row items-center flex-1 mr-2`}>
                          <Receipt size={13} color="#4F46E5" style={tw`mr-1.5`} />
                          <Text style={[tw`text-xs font-black font-mono`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                            #{orderNum}
                          </Text>
                        </View>
                        <View
                          style={[
                            tw`px-2 py-0.5 rounded-full border`,
                            isPaid
                              ? tw`bg-emerald-500/10 border-emerald-500/30`
                              : tw`bg-amber-500/10 border-amber-500/30`,
                          ]}>
                          <Text
                            style={[
                              tw`text-[10px] font-black`,
                              isPaid ? tw`text-emerald-500` : tw`text-amber-500`,
                            ]}>
                            {p.paymentStatus || 'Pending'}
                          </Text>
                        </View>
                      </View>

                      {/* Item details */}
                      <Text style={[tw`text-sm font-bold mb-1`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                        {p.itemName || 'Ordered Item'}
                      </Text>

                      {/* Dates or booking details */}
                      {p.checkInDate && (
                        <View style={tw`flex-row items-center mt-1`}>
                          <Calendar size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1.5`} />
                          <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                            Stay: {p.checkInDate} to {p.checkOutDate || 'N/A'} {p.roomNumber ? `• Room ${p.roomNumber}` : ''}
                          </Text>
                        </View>
                      )}

                      {p.appointmentDate && (
                        <View style={tw`flex-row items-center mt-1`}>
                          <Clock size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1.5`} />
                          <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                            Appointment: {p.appointmentDate} {p.appointmentTimeSlot ? `at ${p.appointmentTimeSlot}` : ''}
                          </Text>
                        </View>
                      )}

                      {/* Footer: Date & Amount */}
                      <View style={tw`flex-row items-center justify-between mt-3 pt-2.5 border-t border-gray-200 dark:border-zinc-800`}>
                        <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          {formattedDate}
                        </Text>
                        <View style={tw`flex-row items-center`}>
                          <Text style={[tw`text-xs font-semibold mr-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            {p.paymentMethod || 'COD'}
                          </Text>
                          <Text style={tw`text-sm font-black text-indigo-500`}>
                            ₹{amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
