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
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  HelpCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
import {
  fetchVendorTickets,
  createVendorTicket,
  replyVendorTicket,
  getVendorUser,
} from '../services/apiService';
import sessionManager from '../services/sessionManager';

interface QueriesScreenProps {
  onNavigate?: (tab: any) => void;
  onBack?: () => void;
  isDark?: boolean;
}

export default function QueriesScreen({
  onNavigate,
  onBack,
  isDark = false,
}: QueriesScreenProps) {
  const insets = useSafeAreaInsets();
  const currentUser = getVendorUser();
  const vendorId = currentUser?._id || currentUser?.id || 'default';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  // Create ticket modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Orders');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail / reply modal states
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    try {
      const res = await fetchVendorTickets();
      if (res && res.success && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
        sessionManager.saveVendorCache(vendorId, 'vendor_tickets', res.tickets);
        // Refresh active selected ticket if open
        if (selectedTicket) {
          const fresh = res.tickets.find((t: any) => t._id === selectedTicket._id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (err) {
      console.warn('[QueriesScreen] Error loading tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Instant Cache Hydration (<10ms)
    sessionManager.getVendorCache(vendorId, 'vendor_tickets').then(cached => {
      if (Array.isArray(cached) && cached.length > 0) {
        setTickets(cached);
        setLoading(false);
      }
    });

    // 2. Background Revalidation
    loadTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleCreateTicket = async () => {
    if (submitting) return;
    if (!newSubject.trim()) {
      Alert.alert('Required Field', 'Please enter a ticket subject.');
      return;
    }
    if (!newMessage.trim()) {
      Alert.alert('Required Field', 'Please enter your message or query detail.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createVendorTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
        category: newCategory,
        priority: newPriority,
      });

      if (res && res.success) {
        Alert.alert('Ticket Created', 'Your support ticket has been submitted to Admin.');
        setIsCreateModalVisible(false);
        setNewSubject('');
        setNewMessage('');
        loadTickets();
      } else {
        Alert.alert('Error', res?.message || 'Failed to submit ticket.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error submitting ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (sendingReply || !replyText.trim() || !selectedTicket?._id) return;
    setSendingReply(true);
    try {
      const res = await replyVendorTicket(selectedTicket._id, replyText.trim());
      if (res && res.success) {
        setReplyText('');
        loadTickets();
      } else {
        Alert.alert('Error', res?.message || 'Failed to send reply.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error delivering reply.');
    } finally {
      setSendingReply(false);
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
            onPress={() => onBack ? onBack() : onNavigate?.('Profile')}
            activeOpacity={0.7}
            style={[
              tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
              isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
            ]}>
            <ArrowLeft size={20} color={isDark ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>
          <View>
            <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Support & Queries
            </Text>
            <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Get direct help from Super Admin team
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsCreateModalVisible(true)}
          style={[tw`px-3 py-2 rounded-2xl flex-row items-center bg-indigo-600`]}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={tw`text-white text-xs font-bold ml-1`}>Raise Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`p-5`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={tw`py-12`} />
        ) : tickets.length === 0 ? (
          <View
            style={[
              tw`p-8 rounded-3xl items-center justify-center border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
            ]}>
            <HelpCircle size={44} color="#9CA3AF" style={tw`mb-2`} />
            <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-800`]}>
              No Support Tickets Found
            </Text>
            <Text style={[tw`text-xs text-center mt-1 px-4`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Have an issue with orders, payouts, or your account? Tap "Raise Ticket" above to reach Super Admin directly.
            </Text>
          </View>
        ) : (
          tickets.map((t, idx) => {
            const isOpen = (t.status || 'open').toLowerCase() === 'open';
            const isResolved = (t.status || '').toLowerCase() === 'resolved';

            return (
              <TouchableOpacity
                key={t._id || idx}
                onPress={() => setSelectedTicket(t)}
                activeOpacity={0.7}
                style={[
                  tw`rounded-3xl p-5 mb-3 border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    elevation: 1,
                  },
                ]}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                  <View style={tw`flex-1 pr-2`}>
                    <Text
                      style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}
                      numberOfLines={1}>
                      {t.subject || 'Support Query'}
                    </Text>
                    <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Category: {t.category || 'General'} • Ref: #{String(t._id || '').slice(-6)}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      tw`px-2.5 py-1 rounded-full flex-row items-center`,
                      isResolved
                        ? { backgroundColor: '#ECFDF5' }
                        : isOpen
                        ? { backgroundColor: '#EEF2FF' }
                        : { backgroundColor: '#FEF3C7' },
                    ]}>
                    {isResolved ? (
                      <CheckCircle2 size={12} color="#059669" />
                    ) : (
                      <Clock size={12} color={isOpen ? '#4F46E5' : '#D97706'} />
                    )}
                    <Text
                      style={[
                        tw`text-xs font-bold ml-1`,
                        isResolved
                          ? tw`text-emerald-700`
                          : isOpen
                          ? tw`text-indigo-700`
                          : tw`text-amber-700`,
                      ]}>
                      {t.status || 'Open'}
                    </Text>
                  </View>
                </View>

                {/* Message snippet */}
                <Text
                  style={[tw`text-xs mb-3`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}
                  numberOfLines={2}>
                  {t.message || t.description || 'No initial message'}
                </Text>

                <View
                  style={[
                    tw`flex-row justify-between items-center pt-2 border-t`,
                    isDark ? tw`border-zinc-800` : tw`border-gray-100`,
                  ]}>
                  <View style={tw`flex-row items-center`}>
                    <MessageSquare size={12} color="#9CA3AF" />
                    <Text style={[tw`text-[11px] ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {Array.isArray(t.replies) ? t.replies.length : 0} messages
                    </Text>
                  </View>

                  <View style={tw`flex-row items-center`}>
                    <Text style={[tw`text-xs font-semibold mr-1 text-indigo-600`]}>
                      View Conversation
                    </Text>
                    <ChevronRight size={14} color="#4F46E5" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Raise New Ticket */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              tw`rounded-t-3xl p-6`,
              isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white`,
              { maxHeight: '85%' },
            ]}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                Raise Support Ticket
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center`,
                  isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
                ]}>
                <X size={18} color={isDark ? '#FFFFFF' : '#1F2937'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category picker */}
              <Text style={[tw`text-xs font-bold uppercase mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Category
              </Text>
              <View style={tw`flex-row flex-wrap mb-4`}>
                {['Orders', 'Payouts', 'Catalog', 'Account', 'Other'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      tw`px-3 py-1.5 rounded-xl mr-2 mb-2 border`,
                      newCategory === cat
                        ? tw`bg-indigo-600 border-indigo-600`
                        : isDark
                        ? tw`bg-zinc-800 border-zinc-700`
                        : tw`bg-gray-100 border-gray-200`,
                    ]}>
                    <Text
                      style={[
                        tw`text-xs font-bold`,
                        newCategory === cat ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`,
                      ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject */}
              <Text style={[tw`text-xs font-bold uppercase mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Subject
              </Text>
              <TextInput
                placeholder="e.g. Settlement delayed for order #4829"
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                value={newSubject}
                onChangeText={setNewSubject}
                style={[
                  tw`p-3.5 rounded-2xl border text-sm font-semibold mb-4`,
                  isDark ? tw`bg-zinc-950 border-zinc-800 text-white` : tw`bg-gray-50 border-gray-200 text-gray-900`,
                ]}
              />

              {/* Message Details */}
              <Text style={[tw`text-xs font-bold uppercase mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Query Details
              </Text>
              <TextInput
                placeholder="Describe your issue with full details so Super Admin can assist quickly..."
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  tw`p-3.5 rounded-2xl border text-sm font-semibold mb-5`,
                  isDark ? tw`bg-zinc-950 border-zinc-800 text-white` : tw`bg-gray-50 border-gray-200 text-gray-900`,
                  { minHeight: 100 },
                ]}
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCreateTicket}
                disabled={submitting}
                style={[
                  tw`py-4 rounded-2xl items-center justify-center bg-indigo-600`,
                  submitting && tw`opacity-70`,
                ]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold text-base`}>Submit Support Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: View Ticket Thread & Reply */}
      <Modal
        visible={Boolean(selectedTicket)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View
            style={[
              tw`rounded-t-3xl p-6`,
              isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white`,
              { height: '85%' },
            ]}>
            <View style={tw`flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-zinc-800`}>
              <View style={tw`flex-1 pr-2`}>
                <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                  {selectedTicket?.subject || 'Ticket Details'}
                </Text>
                <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Ref: #{String(selectedTicket?._id || '').slice(-6)} • Status: {selectedTicket?.status || 'Open'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedTicket(null)}
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center`,
                  isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
                ]}>
                <X size={18} color={isDark ? '#FFFFFF' : '#1F2937'} />
              </TouchableOpacity>
            </View>

            {/* Conversation Messages */}
            <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1 mb-3`}>
              {/* Initial vendor message */}
              <View
                style={[
                  tw`p-4 rounded-2xl mb-3`,
                  isDark ? tw`bg-zinc-950 border border-zinc-800` : tw`bg-indigo-50 border border-indigo-100`,
                ]}>
                <Text style={[tw`text-[11px] font-bold text-indigo-600 mb-1`]}>
                  You (Initial Query)
                </Text>
                <Text style={[tw`text-sm`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                  {selectedTicket?.message}
                </Text>
                <Text style={[tw`text-[10px] mt-1 text-right`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : ''}
                </Text>
              </View>

              {/* Replies */}
              {Array.isArray(selectedTicket?.replies) &&
                selectedTicket.replies.map((rep: any, idx: number) => {
                  const isAdmin = rep.senderRole === 'Admin' || rep.sender === 'Admin';

                  return (
                    <View
                      key={idx}
                      style={[
                        tw`p-4 rounded-2xl mb-3`,
                        isAdmin
                          ? isDark
                            ? tw`bg-zinc-800 ml-4 border border-zinc-700`
                            : tw`bg-emerald-50 ml-4 border border-emerald-100`
                          : isDark
                          ? tw`bg-zinc-950 mr-4 border border-zinc-800`
                          : tw`bg-gray-100 mr-4`,
                      ]}>
                      <Text
                        style={[
                          tw`text-[11px] font-bold mb-1`,
                          isAdmin ? tw`text-emerald-700` : tw`text-indigo-600`,
                        ]}>
                        {isAdmin ? '🛡️ Super Admin Support' : 'You'}
                      </Text>
                      <Text style={[tw`text-sm`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                        {rep.message}
                      </Text>
                      <Text style={[tw`text-[10px] mt-1 text-right`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                        {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ''}
                      </Text>
                    </View>
                  );
                })}
            </ScrollView>

            {/* Reply Input Bar */}
            <View style={tw`flex-row items-center`}>
              <TextInput
                placeholder="Type your reply message..."
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                value={replyText}
                onChangeText={setReplyText}
                style={[
                  tw`flex-1 p-3.5 rounded-2xl border text-sm font-semibold mr-2`,
                  isDark ? tw`bg-zinc-950 border-zinc-800 text-white` : tw`bg-gray-50 border-gray-200 text-gray-900`,
                ]}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                style={[
                  tw`w-12 h-12 rounded-2xl items-center justify-center bg-indigo-600`,
                  (!replyText.trim() || sendingReply) && tw`opacity-50`,
                ]}>
                {sendingReply ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

