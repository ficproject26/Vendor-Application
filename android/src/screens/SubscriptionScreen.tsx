import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Calendar,
  Sparkles,
  Building2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import {
  fetchSubscriptions,
  fetchSubscriptionSummary,
  fetchSubscriptionHistory,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getVendorUser,
} from '../services/apiService';

interface SubscriptionScreenProps {
  onNavigate?: (tab: any) => void;
  isDark?: boolean;
}

export default function SubscriptionScreen({
  onNavigate,
  isDark = false,
}: SubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<'plans' | 'history'>('plans');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>({
    totalPaid: 0,
    activeCount: 0,
    expiredCount: 0,
  });
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [subscribingBizId, setSubscribingBizId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [subsRes, sumRes, histRes] = await Promise.all([
        fetchSubscriptions().catch(() => null),
        fetchSubscriptionSummary('all').catch(() => null),
        fetchSubscriptionHistory('all').catch(() => null),
      ]);

      if (subsRes && subsRes.success) {
        if (Array.isArray(subsRes.subscriptions)) {
          setSubscriptionsList(subsRes.subscriptions);
        }
      } else {
        // Fallback to user businesses
        const user = getVendorUser();
        const bizList = user?.businesses || [];
        setSubscriptionsList(
          bizList.map((b: any) => ({
            businessId: b._id || b.id,
            businessName: b.businessName || 'Business Outlet',
            category: b.vendorType || b.category || 'General',
            status: b.isSubscriptionActive ? 'active' : 'inactive',
            validUntil: b.subscriptionExpiresAt || null,
            amount: 999,
          }))
        );
      }

      if (sumRes && sumRes.success && sumRes.summary) {
        setSummary(sumRes.summary);
      }

      if (histRes && histRes.success && Array.isArray(histRes.transactions)) {
        setHistoryList(histRes.transactions);
      }
    } catch (err) {
      console.warn('[SubscriptionScreen] Error loading subscription data:', err);
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

  const handleSubscribe = async (biz: any) => {
    const bizId = biz.businessId || biz._id || biz.id;
    if (!bizId) return;

    setSubscribingBizId(bizId);
    try {
      const res = await createSubscriptionOrder({ businessId: bizId });
      if (res && res.success && res.orderId) {
        Alert.alert(
          'Subscription Initiated',
          `Order Reference: ${res.orderId}\nPlan: 1 Month Premium Access (₹${res.amount || 999})\nClick confirm to simulate payment verification.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm Payment',
              onPress: async () => {
                const verifyRes = await verifySubscriptionPayment({
                  businessId: bizId,
                  orderId: res.orderId,
                  paymentId: `pay_sim_${Date.now()}`,
                  signature: 'simulated_authorized_signature',
                });
                if (verifyRes && verifyRes.success) {
                  Alert.alert('Success', 'Subscription successfully activated for 1 Month!');
                  loadData();
                } else {
                  Alert.alert('Notice', verifyRes?.message || 'Payment simulation processed.');
                  loadData();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.message || 'Subscription order generation in progress.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initiate subscription order.');
    } finally {
      setSubscribingBizId(null);
    }
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
              Subscriptions
            </Text>
            <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Manage plans, 1-month validity & invoices
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

      {/* Segment Tabs */}
      <View style={[tw`flex-row px-5 pt-3 pb-2`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
        <TouchableOpacity
          onPress={() => setSelectedTab('plans')}
          style={[
            tw`flex-1 py-2.5 items-center justify-center border-b-2`,
            selectedTab === 'plans'
              ? tw`border-indigo-600`
              : tw`border-transparent`,
          ]}>
          <Text
            style={[
              tw`font-bold text-sm`,
              selectedTab === 'plans'
                ? tw`text-indigo-600`
                : isDark
                ? tw`text-zinc-400`
                : tw`text-gray-500`,
            ]}>
            Active Plans & Outlets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedTab('history')}
          style={[
            tw`flex-1 py-2.5 items-center justify-center border-b-2`,
            selectedTab === 'history'
              ? tw`border-indigo-600`
              : tw`border-transparent`,
          ]}>
          <Text
            style={[
              tw`font-bold text-sm`,
              selectedTab === 'history'
                ? tw`text-indigo-600`
                : isDark
                ? tw`text-zinc-400`
                : tw`text-gray-500`,
            ]}>
            Payment History ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Expense & Status Summary Cards */}
        <View style={tw`flex-row justify-between mb-5`}>
          <View
            style={[
              tw`flex-1 mr-2 p-4 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Total Expenses
              </Text>
              <CreditCard size={16} color="#4F46E5" />
            </View>
            <Text style={[tw`text-xl font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              ₹{(summary.totalPaid || 0).toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              tw`flex-1 mx-1 p-4 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Active Plans
              </Text>
              <ShieldCheck size={16} color="#10B981" />
            </View>
            <Text style={[tw`text-xl font-extrabold text-emerald-600`]}>
              {summary.activeCount || subscriptionsList.filter(s => s.status === 'active').length}
            </Text>
          </View>

          <View
            style={[
              tw`flex-1 ml-2 p-4 rounded-2xl border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <View style={tw`flex-row items-center justify-between mb-2`}>
              <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Renewal Due
              </Text>
              <AlertCircle size={16} color="#F59E0B" />
            </View>
            <Text style={[tw`text-xl font-extrabold text-amber-600`]}>
              {summary.expiredCount || subscriptionsList.filter(s => s.status !== 'active').length}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={tw`py-12`} />
        ) : selectedTab === 'plans' ? (
          /* Tab 1: Per-Business Subscription Outlets */
          <View>
            <Text
              style={[
                tw`text-xs font-bold uppercase tracking-wider mb-3 ml-1`,
                isDark ? tw`text-zinc-400` : tw`text-gray-500`,
              ]}>
              Registered Business Outlets ({subscriptionsList.length})
            </Text>

            {subscriptionsList.length === 0 ? (
              <View
                style={[
                  tw`p-8 rounded-3xl items-center justify-center border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <Building2 size={40} color="#9CA3AF" style={tw`mb-2`} />
                <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                  No Registered Businesses Found
                </Text>
                <Text style={[tw`text-xs text-center mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Create your business outlet in the Business tab to subscribe.
                </Text>
              </View>
            ) : (
              subscriptionsList.map((biz, idx) => {
                const isActive = biz.status === 'active' || biz.isSubscriptionActive;
                const isSubscribing = subscribingBizId === (biz.businessId || biz._id || biz.id);

                return (
                  <View
                    key={biz.businessId || biz._id || idx}
                    style={[
                      tw`rounded-3xl p-5 mb-4 border`,
                      isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                      {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                        elevation: 2,
                      },
                    ]}>
                    <View style={tw`flex-row justify-between items-start mb-3`}>
                      <View style={tw`flex-row items-center flex-1 pr-2`}>
                        <View
                          style={[
                            tw`w-10 h-10 rounded-2xl items-center justify-center mr-3`,
                            isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`,
                          ]}>
                          <Building2 size={20} color="#4F46E5" />
                        </View>
                        <View style={tw`flex-1`}>
                          <Text
                            style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}
                            numberOfLines={1}>
                            {biz.businessName || 'Business Outlet'}
                          </Text>
                          <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            Category: {biz.category || biz.vendorType || 'General'}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          tw`px-2.5 py-1 rounded-full flex-row items-center`,
                          isActive ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' },
                        ]}>
                        {isActive ? (
                          <CheckCircle2 size={12} color="#059669" />
                        ) : (
                          <Clock size={12} color="#D97706" />
                        )}
                        <Text
                          style={[
                            tw`text-xs font-bold ml-1`,
                            isActive ? tw`text-emerald-700` : tw`text-amber-700`,
                          ]}>
                          {isActive ? 'Active' : 'Expired / Due'}
                        </Text>
                      </View>
                    </View>

                    {/* Plan Details & Validity */}
                    <View
                      style={[
                        tw`p-3.5 rounded-2xl mb-4`,
                        isDark ? tw`bg-zinc-950` : tw`bg-gray-50`,
                      ]}>
                      <View style={tw`flex-row justify-between items-center mb-1.5`}>
                        <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          Plan Duration:
                        </Text>
                        <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                          1 Month Fixed Validity
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between items-center mb-1.5`}>
                        <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          Valid Until:
                        </Text>
                        <Text style={[tw`text-xs font-bold`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>
                          {biz.validUntil
                            ? new Date(biz.validUntil).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Not Activated'}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between items-center`}>
                        <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          Subscription Fee:
                        </Text>
                        <Text style={[tw`text-xs font-extrabold text-emerald-600`]}>
                          ₹{biz.amount || 999} / Month
                        </Text>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      onPress={() => handleSubscribe(biz)}
                      disabled={isSubscribing}
                      style={[
                        tw`py-3 rounded-2xl items-center justify-center flex-row`,
                        isActive
                          ? [tw`border border-indigo-600`, isDark ? tw`bg-zinc-900` : tw`bg-indigo-50`]
                          : tw`bg-indigo-600`,
                      ]}>
                      {isSubscribing ? (
                        <ActivityIndicator color={isActive ? '#4F46E5' : '#FFFFFF'} size="small" />
                      ) : (
                        <>
                          <Sparkles size={16} color={isActive ? '#4F46E5' : '#FFFFFF'} />
                          <Text
                            style={[
                              tw`font-bold text-sm ml-2`,
                              isActive ? tw`text-indigo-600` : tw`text-white`,
                            ]}>
                            {isActive ? 'Extend / Renew Subscription' : 'Activate 1-Month Plan'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* Tab 2: Subscription Payment History */
          <View>
            <Text
              style={[
                tw`text-xs font-bold uppercase tracking-wider mb-3 ml-1`,
                isDark ? tw`text-zinc-400` : tw`text-gray-500`,
              ]}>
              Transaction Invoices ({historyList.length})
            </Text>

            {historyList.length === 0 ? (
              <View
                style={[
                  tw`p-8 rounded-3xl items-center justify-center border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                ]}>
                <Clock size={40} color="#9CA3AF" style={tw`mb-2`} />
                <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                  No Payment History
                </Text>
                <Text style={[tw`text-xs text-center mt-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Your past subscription payments and GST invoices will be recorded here.
                </Text>
              </View>
            ) : (
              historyList.map((tx, idx) => (
                <View
                  key={tx._id || tx.transactionId || idx}
                  style={[
                    tw`rounded-2xl p-4 mb-3 border`,
                    isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                  ]}>
                  <View style={tw`flex-row justify-between items-center mb-1`}>
                    <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {tx.businessName || 'Business Outlet'}
                    </Text>
                    <Text style={[tw`font-extrabold text-sm text-emerald-600`]}>
                      ₹{tx.amount || 999}
                    </Text>
                  </View>
                  <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    Order Ref: {tx.orderId || tx.razorpayOrderId || 'N/A'}
                  </Text>
                  <View style={tw`flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800`}>
                    <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent'}
                    </Text>
                    <View style={tw`flex-row items-center`}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={tw`text-emerald-600 text-xs font-bold ml-1`}>
                        {tx.status || 'Paid'}
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

