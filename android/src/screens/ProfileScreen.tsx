import React, {useState, useEffect} from 'react';
import { getVendorUser, updateProfile, fetchProfile, updateAcceptingOrders } from '../services/apiService';
import sessionManager from '../services/sessionManager';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Modal,
  TextInput,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  User,
  Store,
  Bell,
  Lock,
  ChevronRight,
  Shield,
  HelpCircle,
  LogOut,
  Star,
  MapPin,
  Sparkles,
  ClipboardList,
  CreditCard,
  Sliders,
  X,
  Award,
  Check,
  Percent,
  Truck,
  Building2,
  BadgeCheck,
  Landmark,
  Headphones,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';

export default function ProfileScreen({
  onNavigate,
  onLogout,
  themeMode = 'system',
  setThemeMode,
  isDark = false,
  purchasedTier = 'Silver',
  setPurchasedTier = () => {},
}: {
  onNavigate?: (tab: any, params?: any) => void;
  onLogout?: () => void;
  themeMode?: 'light' | 'dark' | 'system';
  setThemeMode?: (mode: 'light' | 'dark' | 'system') => void;
  isDark?: boolean;
  purchasedTier?: 'Silver' | 'Gold' | 'Diamond';
  setPurchasedTier?: React.Dispatch<React.SetStateAction<'Silver' | 'Gold' | 'Diamond'>>;
}) {
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<any>(getVendorUser());
  const [refreshing, setRefreshing] = useState(false);

  const loadFreshProfile = async () => {
    try {
      const res = await fetchProfile();
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        if (res.user.isAcceptingOrders !== undefined) {
          setStoreOpen(Boolean(res.user.isAcceptingOrders));
        } else if (res.user.acceptingOrders !== undefined) {
          setStoreOpen(Boolean(res.user.acceptingOrders));
        }
      }
    } catch (err) {
      console.warn('[ProfileScreen] Failed to load fresh profile:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFreshProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFreshProfile();
  };

  const initialUser = getVendorUser();
  const [storeOpen, setStoreOpen] = useState(() => {
    if (initialUser?.isAcceptingOrders !== undefined) return Boolean(initialUser.isAcceptingOrders);
    if (initialUser?.acceptingOrders !== undefined) return Boolean(initialUser.acceptingOrders);
    return true;
  });
  const [updatingStoreStatus, setUpdatingStoreStatus] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Modal Visibility States
  const [isBusinessSettingsVisible, setIsBusinessSettingsVisible] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  const handleToggleAcceptingOrders = async (val: boolean) => {
    if (updatingStoreStatus) return;
    setUpdatingStoreStatus(true);
    const prev = storeOpen;
    setStoreOpen(val);
    try {
      const res = await updateAcceptingOrders(val);
      if (!res.success) {
        setStoreOpen(prev);
        Alert.alert('Update Failed', res.message || 'Unable to update store order acceptance status.');
      } else {
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            isAcceptingOrders: val,
            acceptingOrders: val,
          });
        }
      }
    } catch (err: any) {
      setStoreOpen(prev);
      Alert.alert('Error', err.message || 'Failed to update store order acceptance status.');
    } finally {
      setUpdatingStoreStatus(false);
    }
  };

  // Business settings fields
  const [businessHours, setBusinessHours] = useState('');
  const [homeDelivery, setHomeDelivery] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [upiId, setUpiId] = useState('');
  const [autoAccept, setAutoAccept] = useState(true);

  // New Profile Form fields requested by the user
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [alternateVendorName, setAlternateVendorName] = useState('');
  const [coPartnerName, setCoPartnerName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [telephone, setTelephone] = useState('');
  const [fax, setFax] = useState('');
  const [alternateNumber, setAlternateNumber] = useState('');

  const [address, setAddress] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [panNo, setPanNo] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');

  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankStreet, setBankStreet] = useState('');
  const [bankCity, setBankCity] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  React.useEffect(() => {
    if (isBusinessSettingsVisible && currentUser) {
      setBusinessName(currentUser.businessName || '');
      setName(currentUser.name || '');
      setAlternateVendorName(currentUser.alternateVendorName || '');
      setCoPartnerName(currentUser.coPartnerName || '');
      setAgentName(currentUser.agentName || '');
      setEmail(currentUser.email || '');
      setMobileNumber(currentUser.mobileNumber || '');
      setTelephone(currentUser.telephone || '');
      setFax(currentUser.fax || '');
      setAlternateNumber(currentUser.alternateNumber || '');

      setAddress(currentUser.address || '');
      setStreet(currentUser.street || '');
      setCity(currentUser.city || '');
      setState(currentUser.state || '');
      setCountry(currentUser.country || '');
      setPostalCode(currentUser.postalCode || '');
      setPanNo(currentUser.panNo || '');
      setCompanyRegNo(currentUser.companyRegNo || '');
      setBusinessLicense(currentUser.businessLicense || '');

      setAccountHolderName(currentUser.accountHolderName || '');
      setBankName(currentUser.bankName || '');
      setBankBranch(currentUser.bankBranch || '');
      setBankStreet(currentUser.bankStreet || '');
      setBankCity(currentUser.bankCity || '');
      setAccountNo(currentUser.accountNo || '');
      setIfscCode(currentUser.ifscCode || '');
      setSwiftCode(currentUser.swiftCode || '');
    }
  }, [isBusinessSettingsVisible, currentUser]);

  const handleSaveSettings = async () => {
    if (mobileNumber) {
      const cleanMob = mobileNumber.replace(/[^0-9]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMob)) {
        Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    }
    if (panNo) {
      const cleanPan = panNo.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        Alert.alert('Invalid PAN Format', 'Please enter a valid 10-character Indian PAN number (e.g. ABCDE1234F).');
        return;
      }
    }
    if (ifscCode) {
      const cleanIfsc = ifscCode.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        Alert.alert('Invalid IFSC Code', 'Please enter a valid 11-character Indian IFSC code (e.g. SBIN0001234).');
        return;
      }
    }

    setSavingSettings(true);
    try {
      const payload = {
        businessName,
        name,
        alternateVendorName,
        coPartnerName,
        agentName,
        email,
        mobileNumber,
        telephone,
        fax,
        alternateNumber,
        address,
        street,
        city,
        state,
        country,
        postalCode,
        panNo,
        companyRegNo,
        businessLicense,
        accountHolderName,
        bankName,
        bankBranch,
        bankStreet,
        bankCity,
        accountNo,
        ifscCode,
        swiftCode,
      };
      
      const res = await updateProfile(payload);
      if (res.success) {
        setIsSavedFeedback(true);
        setTimeout(() => {
          setIsSavedFeedback(false);
          setIsBusinessSettingsVisible(false);
        }, 1200);
      } else {
        Alert.alert('Save Failed', res.message || 'Error occurred while saving settings.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error occurred while saving.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#18181b' : '#FFFFFF'} />

      {/* Header Banner */}
      <View
        style={[
          tw`px-5 pb-5`,
          isDark ? tw`bg-zinc-900` : tw`bg-white`,
          {paddingTop: insets.top + 16},
          {
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}>
        {/* Profile Card */}
        <View style={tw`flex-row items-center mb-4`}>
          {currentUser?.logo ? (
            <Image
              source={{ uri: currentUser.logo }}
              style={tw`w-16 h-16 rounded-full mr-4 bg-gray-200`}
            />
          ) : (
            <View style={[tw`w-16 h-16 rounded-full mr-4 items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`]}>
              <User size={28} color="#4F46E5" />
            </View>
          )}
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>{currentUser?.name || 'Vendor'}</Text>
              <View style={[tw`ml-2 px-2 py-0.5 rounded-full flex-row items-center`, {backgroundColor: '#EEF2FF'}]}>
                <Building2 size={10} color="#4F46E5" />
                <Text style={tw`text-indigo-600 text-xs font-bold ml-0.5`}>Vendor</Text>
              </View>
            </View>
            <Text style={[tw`text-xs mt-0.5 font-semibold`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>{currentUser?.businessName ? `${currentUser.businessName} • Vendor` : 'Vendor'}</Text>
            <View style={tw`flex-row items-center mt-1`}>
              <MapPin size={12} color="#6B7280" />
              <Text style={[tw`text-xs ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>{currentUser?.address || currentUser?.city || 'No address provided'}</Text>
            </View>

            {/* Verification Badges */}
            {(() => {
              const isApprovedVendor = 
                Boolean(currentUser?.isApproved) ||
                ['active', 'approved', 'assigned'].includes(String(currentUser?.status || '').toLowerCase()) ||
                ['approved', 'active'].includes(String(currentUser?.approvalStatus || '').toLowerCase());
              
              const rawKyc = String(currentUser?.kycStatus || '').trim().toLowerCase();
              const isKycVerified = ['verified', 'approved', 'completed'].includes(rawKyc) || (isApprovedVendor && (!rawKyc || rawKyc === 'pending'));
              const kycDisplay = isKycVerified ? 'Verified' : (currentUser?.kycStatus || 'Pending');

              return (
                <View style={tw`flex-row items-center mt-1.5`}>
                  <View style={[
                    tw`px-2 py-0.5 rounded-md flex-row items-center mr-2`,
                    isApprovedVendor ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' }
                  ]}>
                    {isApprovedVendor ? (
                      <CheckCircle2 size={10} color="#059669" />
                    ) : (
                      <Clock size={10} color="#D97706" />
                    )}
                    <Text style={[
                      tw`text-[10px] font-bold ml-1`,
                      isApprovedVendor ? tw`text-emerald-700` : tw`text-amber-700`
                    ]}>
                      {isApprovedVendor ? 'Verified Vendor' : 'Approval Pending'}
                    </Text>
                  </View>

                  <View style={[
                    tw`px-2 py-0.5 rounded-md flex-row items-center`,
                    isKycVerified ? { backgroundColor: '#EEF2FF' } : { backgroundColor: '#FEF3C7' }
                  ]}>
                    <Shield size={10} color={isKycVerified ? '#4F46E5' : '#D97706'} />
                    <Text style={[
                      tw`text-[10px] font-bold ml-1`,
                      isKycVerified ? tw`text-indigo-700` : tw`text-amber-700`
                    ]}>
                      KYC: {kycDisplay}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Short Metrics */}
        <View style={[tw`flex-row justify-between rounded-2xl p-4 mt-2`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
          <View style={tw`items-center flex-1`}>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`font-bold text-lg`, isDark ? tw`text-white` : tw`text-gray-900`]}>{currentUser?.rating !== undefined ? Number(currentUser.rating).toFixed(1) : '5.0'}</Text>
              <Star size={14} color="#F59E0B" fill="#F59E0B" style={tw`ml-1`} />
            </View>
            <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Avg Rating</Text>
          </View>
          <View style={[tw`w-px`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
          <View style={tw`items-center flex-1`}>
            <Text style={[tw`font-bold text-lg`, isDark ? tw`text-white` : tw`text-gray-900`]}>{currentUser?.followersCount !== undefined ? String(currentUser.followersCount) : '0'}</Text>
            <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Followers</Text>
          </View>
          <View style={[tw`w-px`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
          <View style={tw`items-center flex-1`}>
            <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'}</Text>
            <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Member</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pt-4 pb-6`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Registered Outlets Card */}
        {Array.isArray(currentUser?.businesses) && currentUser.businesses.length > 0 && (
          <View style={tw`mb-4`}>
            <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2 ml-1`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
              Registered Business Outlets ({currentUser.businesses.length})
            </Text>
            <View style={[
              tw`rounded-2xl overflow-hidden p-3 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
              {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }
            ]}>
              {currentUser.businesses.map((biz: any, i: number) => (
                <View key={biz._id || i} style={[
                  tw`flex-row items-center justify-between py-2.5`,
                  i > 0 && (isDark ? tw`border-t border-zinc-800` : tw`border-t border-gray-100`)
                ]}>
                  <View style={tw`flex-row items-center flex-1 pr-2`}>
                    <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mr-2.5`, isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`]}>
                      <Building2 size={16} color="#4F46E5" />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                        {biz.businessName || 'Business Outlet'}
                      </Text>
                      <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        {biz.vendorType || biz.category || 'General'}
                      </Text>
                    </View>
                  </View>
                  {(() => {
                    const isApprovedBiz = 
                      biz.isApproved === true || 
                      biz.isActive === true || 
                      ['active', 'approved'].includes(String(biz.status || '').toLowerCase());
                    return (
                      <View style={[
                        tw`px-2 py-0.5 rounded-full flex-row items-center`,
                        isApprovedBiz ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' }
                      ]}>
                        <Text style={[
                          tw`text-[10px] font-bold`,
                          isApprovedBiz ? tw`text-emerald-700` : tw`text-amber-700`
                        ]}>
                          {isApprovedBiz ? 'Approved' : 'Pending Approval'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Store Settings Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>Store Status</Text>
        <View
          style={[
            tw`bg-white rounded-2xl p-4 mb-4`,
            isDark && tw`bg-zinc-900 border border-zinc-800`,
            {
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            },
          ]}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, {backgroundColor: '#EFF6FF'}]}>
                <Store size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Accepting Orders</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Toggle to pause or resume incoming orders</Text>
              </View>
            </View>
            <Switch
              value={storeOpen}
              onValueChange={handleToggleAcceptingOrders}
              disabled={updatingStoreStatus}
              trackColor={{false: '#E5E7EB', true: '#BFDBFE'}}
              thumbColor={storeOpen ? '#2563EB' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Business & Membership Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>Business & Operations</Text>
        <View
          style={[
            tw`rounded-2xl overflow-hidden mb-4`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            },
          ]}>
          {/* My Orders */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('Orders')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#EEF2FF'}]}>
                <ClipboardList size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>My Orders</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>View customer orders and status</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Subscriptions */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('Subscriptions')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#ECFDF5'}]}>
                <Sparkles size={20} color="#059669" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Subscriptions & Plans</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>1-month validity plans & invoices</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Payments & Settlements */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('VendorPayments')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#EEF2FF'}]}>
                <Landmark size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Payouts & Settlements</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Sales payments & bank payout records</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Support & Queries */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('Queries')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#FEF3C7'}]}>
                <Headphones size={20} color="#D97706" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Queries & Support</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Direct tickets with Super Admin</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Delivery Partners */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('DeliveryPartners')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#EFF6FF'}]}>
                <Truck size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Delivery Partners</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Fleet riders and delivery agents</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Customers Directory */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('Customers')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#FDF2F8'}]}>
                <Users size={20} color="#DB2777" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Customer Directory</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>View customer profiles & purchase history</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* My Business */}
          <TouchableOpacity 
            onPress={() => onNavigate?.('Business')}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#E0F2FE'}]}>
                <Store size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>My Business</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Manage services, products & catalog</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Business Settings */}
          <TouchableOpacity 
            onPress={() => setIsBusinessSettingsVisible(true)}
            activeOpacity={0.7}
            style={tw`flex-row items-center justify-between p-4`}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#F0FDF4'}]}>
                <Sliders size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Business Settings</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Timings, delivery, payments & rules</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* General Settings Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>Settings</Text>
        <View
          style={[
            tw`rounded-2xl overflow-hidden mb-4`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            },
          ]}>
          {/* Notifications */}
          <View style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#FEF2F2'}]}>
                <Bell size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Push Notifications</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>Enable real-time alerts</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{false: '#E5E7EB', true: '#FCA5A5'}}
              thumbColor={notifications ? '#DC2626' : '#9CA3AF'}
            />
          </View>

          {/* Edit Profile */}
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Store Profile Details', 'Manage your store brand name, descriptions, banner images, logo, business contacts, and GPS location.');
            }}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#EEF2FF'}]}>
                <User size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Store Profile Details</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Manage logo, contact, info</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Security */}
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Security & PIN', 'Update your authentication password, manage security PIN, or configure touch / face biometrics for quick logging.');
            }}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#F5F3FF'}]}>
                <Lock size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Security & PIN</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Change password and login pin</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Theme Settings */}
          <TouchableOpacity
            onPress={() => setIsThemeModalVisible(true)}
            activeOpacity={0.7}
            style={tw`flex-row items-center justify-between p-4`}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#EFF6FF'}]}>
                <Sliders size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Theme Mode</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  Current: {themeMode === 'system' ? 'System Default' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-700`]}>Support</Text>
        <View
          style={[
            tw`rounded-2xl overflow-hidden mb-5`,
            isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
            {
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            },
          ]}>
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Privacy Policy', 'Check details of our terms of use, privacy statement, and data protection settings.');
            }}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#F0FDF4'}]}>
                <Shield size={20} color="#16A34A" />
              </View>
              <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Help & Support Center', 'Reach out to our customer care executive at support@antigravity.io for live support.');
            }}
            activeOpacity={0.7}
            style={tw`flex-row items-center justify-between p-4`}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#FFF7ED'}]}>
                <HelpCircle size={20} color="#EA580C" />
              </View>
              <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Help & Support Center</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={onLogout}
          activeOpacity={0.7}
          style={[
            tw`bg-red-50 rounded-2xl p-4 flex-row items-center justify-center border border-red-100`,
            isDark && tw`bg-red-950 border-red-900`,
            {
              shadowColor: '#DC2626',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.02,
              shadowRadius: 4,
              elevation: 1,
            },
          ]}>
          <LogOut size={20} color="#DC2626" />
          <Text style={tw`text-red-600 font-bold text-base ml-2`}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Business Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isBusinessSettingsVisible}
        onRequestClose={() => setIsBusinessSettingsVisible(false)}>
        <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
          <View style={tw`bg-white rounded-t-3xl px-5 pt-6 pb-8 max-h-[90%]`}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <View>
                <Text style={tw`text-xl font-bold text-gray-900`}>Business Settings</Text>
                <Text style={tw`text-gray-400 text-xs mt-0.5`}>Manage store operational configurations</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBusinessSettingsVisible(false)}
                style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}>
                <X size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Settings Fields Scroll Container */}
            <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-5`}>
              {/* General Information Section */}
              <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-150`}>
                <Text style={tw`text-indigo-600 font-bold text-xs uppercase tracking-wider mb-3`}>General Information</Text>
                
                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Business Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Enter business name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Owner Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter owner name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Vendor Name per Bank Details</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={alternateVendorName}
                    onChangeText={setAlternateVendorName}
                    placeholder="Enter vendor name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Co-Partner Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={coPartnerName}
                    onChangeText={setCoPartnerName}
                    placeholder="Enter co-partner name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Agent Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={agentName}
                    onChangeText={setAgentName}
                    placeholder="Enter agent name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>E-mail Address</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Mobile Contact</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Telephone</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={telephone}
                    onChangeText={setTelephone}
                    placeholder="Enter telephone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Fax</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={fax}
                    onChangeText={setFax}
                    placeholder="Enter fax number"
                  />
                </View>

                <View style={tw`mb-1`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Alternate Number</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={alternateNumber}
                    onChangeText={setAlternateNumber}
                    placeholder="Enter alternate number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Address Details Section */}
              <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-150`}>
                <Text style={tw`text-indigo-600 font-bold text-xs uppercase tracking-wider mb-3`}>Address Details</Text>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Business Address</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter business address"
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Street</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={street}
                    onChangeText={setStreet}
                    placeholder="Enter street"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>City</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Enter city"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>State</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={state}
                    onChangeText={setState}
                    placeholder="Enter state"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Country</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Enter country"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Postal Code</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="Enter postal code"
                    keyboardType="numeric"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>PAN Number</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={panNo}
                    onChangeText={setPanNo}
                    placeholder="Enter PAN number"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Company Registration No</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={companyRegNo}
                    onChangeText={setCompanyRegNo}
                    placeholder="Enter registration number"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={tw`mb-1`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Business License Link/Path</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={businessLicense}
                    onChangeText={setBusinessLicense}
                    placeholder="Enter license file path or URL"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Bank Information Section */}
              <View style={tw`bg-gray-50 rounded-2xl p-4 mb-2 border border-gray-150`}>
                <Text style={tw`text-indigo-600 font-bold text-xs uppercase tracking-wider mb-3`}>Bank Information</Text>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Account Holder Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={accountHolderName}
                    onChangeText={setAccountHolderName}
                    placeholder="Enter account holder name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Bank Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Enter bank name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Branch Name</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={bankBranch}
                    onChangeText={setBankBranch}
                    placeholder="Enter branch name"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Bank Branch Street</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={bankStreet}
                    onChangeText={setBankStreet}
                    placeholder="Enter bank branch street"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Bank Branch City</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={bankCity}
                    onChangeText={setBankCity}
                    placeholder="Enter bank branch city"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>Account Number</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={accountNo}
                    onChangeText={setAccountNo}
                    placeholder="Enter account number"
                    keyboardType="numeric"
                  />
                </View>

                <View style={tw`mb-3`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>IFSC Code</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={ifscCode}
                    onChangeText={setIfscCode}
                    placeholder="Enter IFSC code"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={tw`mb-1`}>
                  <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>SWIFT Code</Text>
                  <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 font-semibold`}
                    value={swiftCode}
                    onChangeText={setSwiftCode}
                    placeholder="Enter SWIFT code"
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Action Feedback & Save Button */}
            {isSavedFeedback && (
              <View style={[tw`flex-row items-center justify-center py-2.5 mb-3 rounded-xl`, {backgroundColor: '#ECFDF5'}]}>
                <Check size={16} color="#059669" />
                <Text style={tw`text-emerald-800 text-xs font-bold ml-1.5`}>Settings saved successfully!</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSaveSettings}
              disabled={savingSettings}
              style={[tw`py-3.5 rounded-2xl items-center justify-center`, {backgroundColor: '#4F46E5'}, savingSettings && tw`opacity-70`]}>
              {savingSettings ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={tw`text-white font-bold text-base`}>Save Business Profile Info</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isThemeModalVisible}
        onRequestClose={() => setIsThemeModalVisible(false)}>
        <View style={[tw`flex-1 justify-center items-center px-6`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
          <View style={[tw`rounded-3xl p-6 w-full max-w-sm`, isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`]}>
            <Text style={[tw`font-extrabold text-lg mb-4`, isDark ? tw`text-white` : tw`text-gray-900`]}>Select Theme</Text>
            
            {(['light', 'dark', 'system'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  if (setThemeMode) setThemeMode(mode);
                  sessionManager.saveThemePreference(mode).catch(() => {});
                  setIsThemeModalVisible(false);
                }}
                style={[tw`flex-row items-center justify-between py-3.5`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-100`]}>
                <Text style={[tw`font-semibold text-sm capitalize`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                  {mode === 'system' ? 'System Default' : `${mode} Mode`}
                </Text>
                <View style={[
                  tw`w-5 h-5 rounded-full border-2 items-center justify-center`,
                  themeMode === mode
                    ? (isDark ? tw`border-indigo-400` : tw`border-indigo-600`)
                    : (isDark ? tw`border-zinc-650` : tw`border-gray-300`)
                ]}>
                  {themeMode === mode && (
                    <View style={[
                      tw`w-2.5 h-2.5 rounded-full`,
                      isDark ? tw`bg-indigo-400` : tw`bg-indigo-600`
                    ]} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setIsThemeModalVisible(false)}
              style={[tw`py-3 mt-5 rounded-2xl items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
              <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
