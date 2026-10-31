import React, {useState, useEffect} from 'react';
import { getVendorUser, updateProfile, fetchProfile } from '../services/apiService';
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

  const [storeOpen, setStoreOpen] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Modal Visibility States
  const [isMembershipVisible, setIsMembershipVisible] = useState(false);
  const [isBusinessSettingsVisible, setIsBusinessSettingsVisible] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  // Membership Tier State & Config
  const [selectedTier, setSelectedTier] = useState<'Silver' | 'Gold' | 'Diamond'>(purchasedTier);

  React.useEffect(() => {
    setSelectedTier(purchasedTier);
  }, [purchasedTier]);

  // Card Flip Animation State
  const [isFlipped, setIsFlipped] = useState(false);
  const scaleXAnim = React.useRef(new Animated.Value(1)).current;

  const handleFlipCard = () => {
    Animated.timing(scaleXAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(prev => !prev);
      Animated.timing(scaleXAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const tierConfig = {
    Silver: {
      bgColor: '#4B5563',
      glow1: '#9CA3AF',
      glow2: '#D1D5DB',
      badge: 'SILVER',
      id: 'MEM-8829-SLV',
      level: 'SILVER PARTNER',
      benefits: [
        {
          title: '5% Platform Commission',
          description: 'Keep 95% of your earnings on every order',
          icon: Percent,
          iconColor: '#16A34A',
          iconBg: '#F0FDF4',
        },
        {
          title: 'Standard Store Listing',
          description: 'Appear in local searches within your area',
          icon: Award,
          iconColor: '#4F46E5',
          iconBg: '#EEF2FF',
        },
        {
          title: 'Basic Analytics',
          description: 'Track daily visitor counts and page views',
          icon: Sparkles,
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
        },
      ],
    },
    Gold: {
      bgColor: '#B45309',
      glow1: '#F59E0B',
      glow2: '#FBBF24',
      badge: 'GOLD',
      id: 'MEM-8829-GLD',
      level: 'GOLD PARTNER',
      benefits: [
        {
          title: '2% Platform Commission',
          description: 'Keep 98% of your earnings on every order',
          icon: Percent,
          iconColor: '#16A34A',
          iconBg: '#F0FDF4',
        },
        {
          title: 'Priority Store Listing',
          description: 'Appear higher in local searches',
          icon: Award,
          iconColor: '#4F46E5',
          iconBg: '#EEF2FF',
        },
        {
          title: 'Standard Analytics',
          description: 'Track daily visitor and session trends',
          icon: Sparkles,
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
        },
      ],
    },
    Diamond: {
      bgColor: '#1E1B4B',
      glow1: '#6366F1',
      glow2: '#A855F7',
      badge: 'DIAMOND',
      id: 'MEM-8829-DMD',
      level: 'PREMIUM PARTNER',
      benefits: [
        {
          title: '0% Platform Commission',
          description: 'Keep 100% of your earnings on every order',
          icon: Percent,
          iconColor: '#16A34A',
          iconBg: '#F0FDF4',
        },
        {
          title: 'Priority Store Listing',
          description: 'Appear first in local buyer searches',
          icon: Award,
          iconColor: '#4F46E5',
          iconBg: '#EEF2FF',
        },
        {
          title: 'Advanced Analytics',
          description: 'Get detailed insights about visitor behavior',
          icon: Sparkles,
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
        },
      ],
    },
  };

  const tierRanks = {
    Silver: 1,
    Gold: 2,
    Diamond: 3,
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
                <Sparkles size={10} color="#4F46E5" />
                <Text style={tw`text-indigo-600 text-xs font-bold ml-0.5`}>Pro</Text>
              </View>
            </View>
            <Text style={[tw`text-xs mt-0.5 font-semibold`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>{currentUser?.businessName ? `${currentUser.businessName} • Vendor` : 'Vendor'}</Text>
            <View style={tw`flex-row items-center mt-1`}>
              <MapPin size={12} color="#6B7280" />
              <Text style={[tw`text-xs ml-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>{currentUser?.address || currentUser?.city || 'No address provided'}</Text>
            </View>

            {/* Verification Badges */}
            <View style={tw`flex-row items-center mt-1.5`}>
              <View style={[
                tw`px-2 py-0.5 rounded-md flex-row items-center mr-2`,
                currentUser?.isApproved ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' }
              ]}>
                {currentUser?.isApproved ? (
                  <CheckCircle2 size={10} color="#059669" />
                ) : (
                  <Clock size={10} color="#D97706" />
                )}
                <Text style={[
                  tw`text-[10px] font-bold ml-1`,
                  currentUser?.isApproved ? tw`text-emerald-700` : tw`text-amber-700`
                ]}>
                  {currentUser?.isApproved ? 'Verified Vendor' : 'Approval Pending'}
                </Text>
              </View>

              <View style={[
                tw`px-2 py-0.5 rounded-md flex-row items-center`,
                currentUser?.kycStatus === 'Verified' ? { backgroundColor: '#EEF2FF' } : { backgroundColor: '#F3F4F6' }
              ]}>
                <Shield size={10} color="#4F46E5" />
                <Text style={tw`text-indigo-700 text-[10px] font-bold ml-1`}>
                  {currentUser?.kycStatus ? `KYC: ${currentUser.kycStatus}` : 'KYC: Pending'}
                </Text>
              </View>
            </View>
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
                  <View style={[
                    tw`px-2 py-0.5 rounded-full flex-row items-center`,
                    biz.isApproved ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' }
                  ]}>
                    <Text style={[
                      tw`text-[10px] font-bold`,
                      biz.isApproved ? tw`text-emerald-700` : tw`text-amber-700`
                    ]}>
                      {biz.isApproved ? 'Approved' : 'Pending Approval'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Store Settings Section */}
        <Text style={tw`text-gray-400 text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`}>Store Status</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-400`]}>Toggle to temporarily close shop</Text>
              </View>
            </View>
            <Switch
              value={storeOpen}
              onValueChange={setStoreOpen}
              trackColor={{false: '#E5E7EB', true: '#BFDBFE'}}
              thumbColor={storeOpen ? '#2563EB' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Business & Membership Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Business & Operations</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Direct tickets with Super Admin</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Fleet riders and delivery agents</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>View customer profiles & purchase history</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Membership Card */}
          <TouchableOpacity 
            onPress={() => setIsMembershipVisible(true)}
            activeOpacity={0.7}
            style={[tw`flex-row items-center justify-between p-4`, isDark ? tw`border-b border-zinc-800` : tw`border-b border-gray-50`]}>
            <View style={tw`flex-row items-center`}>
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : {backgroundColor: '#FFF7ED'}]}>
                <CreditCard size={20} color="#EA580C" />
              </View>
              <View>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`font-bold text-sm`, isDark ? tw`text-white` : tw`text-gray-900`]}>Membership Card</Text>
                  <View style={[tw`ml-2 px-1.5 py-0.5 rounded-full`, {backgroundColor: '#FEF3C7'}]}>
                    <Text style={tw`text-amber-800 text-[8px] font-black`}>PRO</Text>
                  </View>
                </View>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>View your Pro membership & benefits</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Manage services, products & catalog</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Timings, delivery, payments & rules</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* General Settings Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Settings</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>Manage logo, contact, info</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>Change password and login pin</Text>
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
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-500`]}>
                  Current: {themeMode === 'system' ? 'System Default' : themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-2.5 ml-1`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Support</Text>
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

      {/* Membership Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMembershipVisible}
        onRequestClose={() => setIsMembershipVisible(false)}>
        <View style={[tw`flex-1 justify-end`, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
          <View style={tw`bg-white rounded-t-3xl px-5 pt-6 pb-8 max-h-[85%]`}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>Membership Card</Text>
              <TouchableOpacity
                onPress={() => setIsMembershipVisible(false)}
                style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}>
                <X size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Membership Tier Selector */}
            {(() => {
              const safeSelectedTier: 'Silver' | 'Gold' | 'Diamond' = (selectedTier === 'Gold' || selectedTier === 'Diamond') ? selectedTier : 'Silver';
              const safePurchasedTier: 'Silver' | 'Gold' | 'Diamond' = (purchasedTier === 'Gold' || purchasedTier === 'Diamond') ? purchasedTier : 'Silver';
              const currentTier = tierConfig[safeSelectedTier] || tierConfig.Silver;
              return (
                <>
            <View style={tw`flex-row bg-gray-100 p-1 rounded-xl mb-5`}>
              {(['Silver', 'Gold', 'Diamond'] as const)
                .filter(tier => (tierRanks[tier] || 1) >= (tierRanks[safePurchasedTier] || 1))
                .map(tier => (
                  <TouchableOpacity
                    key={tier}
                    onPress={() => {
                      setSelectedTier(tier);
                      setIsFlipped(false);
                    }}
                    style={[
                      tw`flex-1 py-1.5 rounded-lg items-center`,
                      safeSelectedTier === tier ? tw`bg-white shadow-sm` : {},
                    ]}>
                    <Text
                      style={[
                        tw`text-xs font-bold`,
                        safeSelectedTier === tier ? tw`text-indigo-600` : tw`text-gray-500`,
                      ]}>
                      {tier === safePurchasedTier ? `${tier} (Active)` : tier}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {/* Glowing Card with Flip Function */}
            <Animated.View style={[
              tw`rounded-3xl mb-6 overflow-hidden relative shadow-lg`,
              {
                height: 195,
                transform: [{ scaleX: scaleXAnim }],
              }
            ]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleFlipCard}
                style={[tw`w-full h-full p-6 justify-between`, { backgroundColor: currentTier.bgColor }]}
              >
                {/* Glow effects */}
                <View style={[tw`absolute -right-10 -top-10 w-44 h-44 rounded-full opacity-20`, { backgroundColor: currentTier.glow1 }]} />
                <View style={[tw`absolute -left-10 -bottom-10 w-36 h-36 rounded-full opacity-10`, { backgroundColor: currentTier.glow2 }]} />

                {!isFlipped ? (
                  /* FRONT OF CARD */
                  <>
                    {/* Card Header */}
                    <View style={tw`flex-row justify-between items-start`}>
                      <View>
                        <Text style={tw`text-white font-black text-lg tracking-wider`}>{(currentUser?.businessName || currentUser?.name || 'VENDOR STORE').toUpperCase()}</Text>
                        <Text style={tw`text-indigo-200 text-xs font-semibold mt-0.5`}>{currentTier.level}</Text>
                      </View>
                      <View style={[tw`px-3 py-1 rounded-full flex-row items-center`, {backgroundColor: 'rgba(255,255,255,0.15)'}]}>
                        <Award size={14} color="#F59E0B" />
                        <Text style={tw`text-white text-xs font-bold ml-1`}>{currentTier.badge}</Text>
                      </View>
                    </View>

                    {/* Card Body */}
                    <View>
                      <Text style={tw`text-indigo-300 text-[10px] font-bold tracking-widest uppercase`}>Membership ID</Text>
                      <Text style={tw`text-white font-mono text-lg tracking-widest mt-0.5`}>{`MEM-${currentUser?._id ? currentUser._id.slice(-6).toUpperCase() : 'VND001'}-${selectedTier.toUpperCase()}`}</Text>
                    </View>

                    {/* Card Footer */}
                    <View style={tw`flex-row justify-between items-end`}>
                      <View>
                        <Text style={tw`text-indigo-300 text-[9px] font-semibold uppercase`}>Member Since</Text>
                        <Text style={tw`text-white text-xs font-bold`}>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'}</Text>
                      </View>
                      <View style={tw`items-end`}>
                        <View style={tw`bg-white p-1 rounded-lg flex-row items-center mb-1`}>
                          {/* Barcode Graphic */}
                          <View style={tw`w-20 h-5 flex-row justify-between items-center`}>
                            <View style={tw`w-[2px] h-4 bg-gray-900`} />
                            <View style={tw`w-[3px] h-4 bg-gray-900`} />
                            <View style={tw`w-[1px] h-4 bg-gray-900`} />
                            <View style={tw`w-[4px] h-4 bg-gray-900`} />
                            <View style={tw`w-[1px] h-4 bg-gray-900`} />
                            <View style={tw`w-[3px] h-4 bg-gray-900`} />
                            <View style={tw`w-[2px] h-4 bg-gray-900`} />
                            <View style={tw`w-[1px] h-4 bg-gray-900`} />
                            <View style={tw`w-[2px] h-4 bg-gray-900`} />
                          </View>
                        </View>
                        <Text style={[tw`text-[8px] text-indigo-200 font-semibold`, {opacity: 0.8}]}>Tap to flip ↺</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  /* BACK OF CARD */
                  <>
                    {/* Magnetic Stripe */}
                    <View style={[tw`w-full h-8 bg-zinc-950 absolute left-0`, {top: 24}]} />

                    {/* Card Back Content */}
                    <View style={tw`mt-10 flex-row justify-between items-center`}>
                      <View style={tw`flex-row items-center`}>
                        {/* Signature Strip */}
                        <View style={[tw`h-8 bg-zinc-100 rounded justify-center px-3`, {width: 140}]}>
                          <Text style={[tw`text-zinc-800 text-xs italic font-bold`, {fontFamily: 'serif'}]}>{currentUser?.businessName || currentUser?.name || 'Authorized Partner'}</Text>
                        </View>
                        {/* CVV */}
                        <View style={tw`ml-3 bg-zinc-800 px-2 py-1.5 rounded`}>
                          <Text style={tw`text-[10px] text-zinc-400 font-bold`}>CVV {currentUser?._id ? currentUser._id.slice(-3).toUpperCase() : '001'}</Text>
                        </View>
                      </View>
                      {/* Badge seal */}
                      <View style={[tw`w-10 h-10 rounded-full border border-white border-dashed items-center justify-center opacity-30`]}>
                        <Award size={18} color="#FFFFFF" />
                      </View>
                    </View>

                    {/* Terms / Disclaimer */}
                    <View style={tw`mt-3 flex-row justify-between items-end`}>
                      <View style={tw`flex-1 mr-4`}>
                        <Text style={[tw`text-[8px] text-zinc-350 leading-tight`, {opacity: 0.7}]}>
                          This card remains property of Partner Network. Use is subject to vendor portal terms.
                        </Text>
                        <Text style={[tw`text-[8px] text-zinc-300 font-bold mt-1`, {opacity: 0.8}]}>
                          Support: 1800-PARTNER
                        </Text>
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={[tw`text-[8px] text-indigo-200 font-semibold`, {opacity: 0.8}]}>Tap to flip ↺</Text>
                      </View>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Exclusive Tier Benefits */}
            <Text style={tw`text-gray-900 font-bold text-base mb-3`}>Exclusive {safeSelectedTier} Benefits</Text>
            
            <View style={tw`mb-6`}>
              {(currentTier.benefits || []).map((benefit, index) => {
                const BenefitIcon = benefit.icon;
                return (
                  <View key={index} style={tw`flex-row items-center mb-3`}>
                    <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, {backgroundColor: benefit.iconBg}]}>
                      <BenefitIcon size={16} color={benefit.iconColor} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-gray-900 font-semibold text-sm`}>{benefit.title}</Text>
                      <Text style={tw`text-gray-400 text-xs mt-0.5`}>{benefit.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
                </>
              );
            })()}

            {/* Buttons */}
            {selectedTier === purchasedTier ? (
              <View
                style={[tw`py-3.5 rounded-2xl items-center justify-center flex-row mb-2 bg-green-50 border border-green-200`]}>
                <Check size={18} color="#16A34A" style={tw`mr-1.5`} />
                <Text style={tw`text-green-700 font-bold text-base`}>Active Plan</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Upgrade Membership',
                    `Would you like to upgrade from ${purchasedTier} to ${selectedTier} Partner?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Upgrade Now',
                        onPress: () => {
                          setPurchasedTier(selectedTier);
                          Alert.alert('Congratulations 🎉', `You are now a ${selectedTier.toUpperCase()} Partner!`);
                        }
                      }
                    ]
                  );
                }}
                style={[tw`py-3.5 rounded-2xl items-center justify-center mb-2`, {backgroundColor: '#4F46E5'}]}>
                <Text style={tw`text-white font-bold text-base`}>Upgrade to {selectedTier} Partner</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setIsMembershipVisible(false)}
              style={[tw`py-3 rounded-2xl items-center justify-center border border-gray-200 bg-gray-50`]}>
              <Text style={tw`text-gray-500 font-bold text-sm`}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
