import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  RefreshCw,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  BadgePercent,
  Calendar,
} from 'lucide-react-native';
import {
  fetchSalesPayments,
  fetchVendorSettlements,
} from '../services/apiService';

interface VendorPaymentsScreenProps {
  onNavigate?: (tab: any) => void;
  isDark?: boolean;
}

export default function VendorPaymentsScreen({
  onNavigate,
  isDark = false,
}: VendorPaymentsScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'sales' | 'settlements'>('sales');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [salesPayments, setSalesPayments] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>({ totalAmount: 0, count: 0 });
  const [settlements, setSettlements] = useState<any[]>([]);
  const [settlementsSummary, setSettlementsSummary] = useState<any>({
    totalSettled: 0,
    totalCommission: 0,
    pendingSettlement: 0,
  });

  const loadData = async () => {
    try {
      const [salesRes, settRes] = await Promise.all([
        fetchSalesPayments().catch(() => null),
        fetchVendorSettlements().catch(() => null),
      ]);

      if (salesRes && salesRes.success) {
        if (Array.isArray(salesRes.payments)) {
          setSalesPayments(salesRes.payments);
        }
        if (salesRes.summary) {
          setSalesSummary(salesRes.summary);
        }
      }

      if (settRes && settRes.success) {
        if (Array.isArray(settRes.settlements)) {
          setSettlements(settRes.settlements);
        }
        if (settRes.summary) {
          setSettlementsSummary(settRes.summary);
        }
      }
    } catch (err) {
      console.warn('[VendorPaymentsScreen] Error loading payment records:', err);
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

  const filteredSales = salesPayments.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const id = String(p.orderId || p.order_number || p._id || '').toLowerCase();
    const cust = String(p.customerName || p.memberName || '').toLowerCase();
    const cat = String(p.category || '').toLowerCase();
    return id.includes(q) || cust.includes(q) || cat.includes(q);
  });

  const filteredSettlements = settlements.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const utr = String(s.utr || s.referenceNumber || s._id || '').toLowerCase();
    const bank = String(s.bankName || s.accountNumber || '').toLowerCase();
    return utr.includes(q) || bank.includes(q);
  });

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
            onPress={() => onNavigate?.('Profile')}
            activeOpacity={0.7}
            style={[
              tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <ArrowLeft size={20} color={isDark ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Payments & Payouts
            </Text>
            <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Customer sales transactions & bank settlements
            </Text>
          </View>
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

      {/* Navigation Tabs */}
      <View style={[tw`flex-row px-5 pt-3 pb-2`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('sales');
            setSearchQuery('');
          }}
          style={[
            tw`flex-1 py-2.5 items-center justify-center border-b-2`,
            activeTab === 'sales' ? tw`border-indigo-600` : tw`border-transparent`,
          ]}>
          <Text
            style={[
              tw`font-bold text-sm`,
              activeTab === 'sales'
                ? tw`text-indigo-600`
                : isDark
                ? tw`text-zinc-400`
                : tw`text-gray-500`,
            ]}>
            Sales Payments ({salesPayments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab('settlements');
            setSearchQuery('');
          }}
          style={[
            tw`flex-1 py-2.5 items-center justify-center border-b-2`,
            activeTab === 'settlements' ? tw`border-indigo-600` : tw`border-transparent`,
          ]}>
          <Text
            style={[
              tw`font-bold text-sm`,
              activeTab === 'settlements'
                ? tw`text-indigo-600`
                : isDark
                ? tw`text-zinc-400`
                : tw`text-gray-500`,
            ]}>
            Bank Settlements ({settlements.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* KPI Summary Cards */}
        {activeTab === 'sales' ? (
          <View style={tw`flex-row justify-between mb-5`}>
            <View
              style={[
                tw`flex-1 mr-2 p-4 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Gross Sales
                </Text>
                <ArrowDownLeft size={16} color="#10B981" />
              </View>
              <Text style={[tw`text-xl font-extrabold text-emerald-600`]}>
                ₹{(salesSummary.totalAmount || 0).toLocaleString()}
              </Text>
            </View>

            <View
              style={[
                tw`flex-1 ml-2 p-4 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Orders Paid
                </Text>
                <CreditCard size={16} color="#4F46E5" />
              </View>
              <Text style={[tw`text-xl font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {salesSummary.count || salesPayments.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={tw`flex-row justify-between mb-5`}>
            <View
              style={[
                tw`flex-1 mr-1.5 p-3.5 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Net Payouts
              </Text>
              <Text style={[tw`text-lg font-extrabold text-emerald-600`]}>
                ₹{(settlementsSummary.totalSettled || 0).toLocaleString()}
              </Text>
            </View>

            <View
              style={[
                tw`flex-1 mx-1.5 p-3.5 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Commission
              </Text>
              <Text style={[tw`text-lg font-extrabold text-indigo-600`]}>
                ₹{(settlementsSummary.totalCommission || 0).toLocaleString()}
              </Text>
            </View>

            <View
              style={[
                tw`flex-1 ml-1.5 p-3.5 rounded-2xl border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              ]}>
              <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Pending
              </Text>
              <Text style={[tw`text-lg font-extrabold text-amber-600`]}>
                ₹{(settlementsSummary.pendingSettlement || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Search Input */}
        <View
          style={[
            tw`flex-row items-center px-4 py-3 rounded-2xl mb-4 border`,
            isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`,
          ]}>
          <Search size={18} color="#9CA3AF" style={tw`mr-2`} />
          <TextInput
            placeholder={
              activeTab === 'sales'
                ? 'Search by Order ID, Customer, Category...'
                : 'Search by UTR, Bank Account...'
            }
            placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[tw`flex-1 text-sm font-semibold p-0`, isDark ? tw`text-white` : tw`text-gray-900`]}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={tw`py-12`} />
        ) : activeTab === 'sales' ? (
          /* Tab 1: Sales Payments List */
          <View>
            {filteredSales.length === 0 ? (
              <View
                style={[
                  tw`p-8 rounded-3xl items-center justify-center border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <CreditCard size={40} color="#9CA3AF" style={tw`mb-2`} />
                <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                  No Sales Transactions Found
                </Text>
                <Text style={[tw`text-xs text-center mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Customer order payments will appear here as soon as they are placed.
                </Text>
              </View>
            ) : (
              filteredSales.map((item, idx) => {
                const isPaid = (item.paymentStatus || 'completed').toLowerCase() === 'completed';

                return (
                  <View
                    key={item._id || idx}
                    style={[
                      tw`rounded-2xl p-4 mb-3 border`,
                      isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                    ]}>
                    <View style={tw`flex-row justify-between items-start mb-2`}>
                      <View style={tw`flex-1 pr-2`}>
                        <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {item.order_number || item.orderId || `ORD-${String(item._id || '').slice(-6)}`}
                        </Text>
                        <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          Customer: {item.customerName || item.memberName || 'Direct Buyer'}
                        </Text>
                      </View>
                      <Text style={[tw`font-extrabold text-base text-emerald-600`]}>
                        ₹{item.finalAmount || item.amount || 0}
                      </Text>
                    </View>

                    <View
                      style={[
                        tw`flex-row justify-between items-center pt-2 border-t`,
                        isDark ? tw`border-zinc-800` : tw`border-gray-100`,
                      ]}>
                      <View style={tw`flex-row items-center`}>
                        <Text
                          style={[
                            tw`text-[11px] px-2 py-0.5 rounded font-semibold mr-2`,
                            isDark ? tw`bg-zinc-800 text-zinc-300` : tw`bg-gray-100 text-gray-600`,
                          ]}>
                          {item.paymentMethod || 'Online'}
                        </Text>
                        <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                      </View>

                      <View style={tw`flex-row items-center`}>
                        {isPaid ? (
                          <CheckCircle2 size={12} color="#059669" />
                        ) : (
                          <Clock size={12} color="#D97706" />
                        )}
                        <Text
                          style={[
                            tw`text-xs font-bold ml-1`,
                            isPaid ? tw`text-emerald-600` : tw`text-amber-600`,
                          ]}>
                          {item.paymentStatus || 'Completed'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Tab 2: Admin Settlements List */
          <View>
            {filteredSettlements.length === 0 ? (
              <View
                style={[
                  tw`p-8 rounded-3xl items-center justify-center border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <Landmark size={40} color="#9CA3AF" style={tw`mb-2`} />
                <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                  No Bank Settlements Found
                </Text>
                <Text style={[tw`text-xs text-center mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Official settlements processed by Super Admin to your registered bank account will appear here with UTR reference numbers.
                </Text>
              </View>
            ) : (
              filteredSettlements.map((sett, idx) => (
                <View
                  key={sett._id || idx}
                  style={[
                    tw`rounded-2xl p-4 mb-3 border`,
                    isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                  ]}>
                  <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View style={tw`flex-1 pr-2`}>
                      <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        UTR: {sett.utr || sett.referenceNumber || 'Processing'}
                      </Text>
                      <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        Account: {sett.accountNumber ? `••••${String(sett.accountNumber).slice(-4)}` : 'Bank Transfer'}
                      </Text>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={[tw`font-extrabold text-base text-emerald-600`]}>
                        ₹{sett.netPayout || sett.amount || 0}
                      </Text>
                      <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        Net Credited
                      </Text>
                    </View>
                  </View>

                  {/* Breakdown row */}
                  <View
                    style={[
                      tw`flex-row justify-between items-center py-2 px-3 rounded-xl mb-2`,
                      isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
                    ]}>
                    <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Gross: ₹{sett.grossAmount || sett.amount || 0}
                    </Text>
                    <Text style={[tw`text-[11px] text-indigo-600 font-semibold`]}>
                      Commission Deducted: ₹{sett.commissionAmount || 0}
                    </Text>
                  </View>

                  <View
                    style={[
                      tw`flex-row justify-between items-center pt-1 border-t`,
                      isDark ? tw`border-zinc-800` : tw`border-gray-100`,
                    ]}>
                    <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      {sett.settledAt || sett.createdAt
                        ? new Date(sett.settledAt || sett.createdAt).toLocaleString()
                        : 'Recent'}
                    </Text>
                    <View style={tw`flex-row items-center`}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={tw`text-emerald-600 text-xs font-bold ml-1`}>
                        {sett.status || 'Settled'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

