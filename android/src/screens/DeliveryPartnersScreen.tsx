import React, {useState, useEffect} from 'react';
import { fetchDeliveryPartners, createDeliveryPartner, getVendorUser } from '../services/apiService';
import sessionManager from '../services/sessionManager';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import tw from 'twrnc';
import {ArrowLeft, Phone, Star, Plus, X, Upload, MapPin, Truck} from 'lucide-react-native';

type PartnerStatus = 'All' | 'Available' | 'Busy' | 'Offline';

interface Partner {
  id: string;
  name: string;
  avatar: string;
  status: 'Available' | 'Busy' | 'Offline';
  rating: number;
  phone: string;
}

interface Booking {
  id: string;
  itemName: string;
  dateTime: string;
  price: string;
  status: 'Confirmed' | 'Delivered' | 'Out for Delivery';
  image: string;
}

const initialPartners: Partner[] = [];

const initialBookings: Record<string, Booking[]> = {};

const statusFilters: PartnerStatus[] = ['All', 'Available', 'Busy', 'Offline'];

const getInitialFormState = () => ({
  // Step 1: Personal Information
  fullName: '',
  mobileNumber: '',
  emailAddress: '',
  dob: '',
  gender: 'Male' as 'Male' | 'Female' | 'Other',
  bloodGroup: 'O+',
  emergencyContact: '',
  profilePhoto: '',

  // Step 2: Address Information
  currentAddress: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  gpsLocation: '',

  // Step 3: Identity Verification (KYC)
  aadhaarNumber: '',
  panNumber: '',

  // Step 4: Driving Information
  drivingLicenseNumber: '',
  licenseExpiryDate: '',
  licenseFront: '',
  licenseBack: '',

  // Step 5: Vehicle Information
  vehicleType: 'Scooter',
  vehicleBrand: '',
  vehicleModel: '',
  registrationNumber: '',
  rcBookCopy: '',
  insuranceCopy: '',
  pucCertificate: '',

  // Step 6: Bank Information
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',

  // Step 7: Employment Information
  shiftType: 'Full-Time',
  joiningDate: '',
  zone: '',
  maxWeight: '',

  // Step 8: Delivery or Technician Role
  partnerRole: 'Delivery Partner' as 'Delivery Partner' | 'Technician Partner',

  // Step 9: Account Information
  username: '',
  password: '',

  // Step 10: Documents
  profilePhotoDoc: '',
  aadhaarDocCopy: '',
  drivingLicenseCopy: '',
  rcBookDocName: '',
  insuranceCopyDocument: '',
  panCardCopyDocument: '',
  bankProof: '',

  // Step 11: Settings & Permissions
  notificationsEnabled: true,
  gpsPermission: true,
});

// 11 Form Categories (Performance Information removed as requested)
const formCategories = [
  {id: 0, title: 'Personal Information', short: 'Personal', icon: '👤'},
  {id: 1, title: 'Address Information', short: 'Address', icon: '🏠'},
  {id: 2, title: 'Identity Verification (KYC)', short: 'KYC', icon: '🪪'},
  {id: 3, title: 'Driving Information', short: 'Driving', icon: '📄'},
  {id: 4, title: 'Vehicle Information', short: 'Vehicle', icon: '🛵'},
  {id: 5, title: 'Bank Information', short: 'Bank', icon: '🏦'},
  {id: 6, title: 'Employment Information', short: 'Employment', icon: '💼'},
  {id: 7, title: 'Delivery or Technician', short: 'Role', icon: '🛠️'},
  {id: 8, title: 'Account Information', short: 'Account', icon: '🔑'},
  {id: 9, title: 'Documents', short: 'Documents', icon: '📁'},
  {id: 10, title: 'Settings & Permissions', short: 'Settings', icon: '⚙️'},
];

export default function DeliveryPartnersScreen({
  onNavigate,
  onBack,
  isDark = false,
}: {
  onNavigate?: (tab: 'Home' | 'Orders' | 'Business' | 'Payments' | 'Profile') => void;
  onBack?: () => void;
  isDark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const currentUser = getVendorUser();
  const vendorId = currentUser?._id || currentUser?.id || 'default';

  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [bookings] = useState<Record<string, Booking[]>>(initialBookings);
  const [activeFilter, setActiveFilter] = useState<PartnerStatus>('All');
  
  // Modals Visibility
  const [isAddPartnerVisible, setIsAddPartnerVisible] = useState(false);
  const [selectedPartnerForBookings, setSelectedPartnerForBookings] = useState<Partner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active form section step
  const [activeFormTab, setActiveFormTab] = useState(0);

  // Wizard Form States initialized to clean empty values
  const [formState, setFormState] = useState(getInitialFormState());

  const updateForm = (key: keyof ReturnType<typeof getInitialFormState>, value: any) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const filteredPartners =
    activeFilter === 'All'
      ? partners
      : partners.filter(p => p.status === activeFilter);

  const handleCallPartner = (partner: Partner) => {
    if (partner.status === 'Offline') {
      Alert.alert('Offline', `${partner.name} is currently offline.`);
      return;
    }
    Alert.alert(
      'Call Partner',
      `Do you want to call ${partner.name} (${partner.phone})?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Call',
          onPress: () => {
            // Simulated call action
          },
        },
      ],
    );
  };

  const loadPartners = async () => {
    try {
      const data = await fetchDeliveryPartners();
      if (Array.isArray(data)) {
        const mapped = data.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          avatar: p.avatar || p.profilePhoto || '',
          status: (p.status === 'Available' || p.status === 'Busy' || p.status === 'Offline') ? p.status : 'Available',
          rating: p.rating || 0,
          phone: p.phone || p.mobileNumber || '',
        }));
        setPartners(mapped);
        sessionManager.saveVendorCache(vendorId, 'delivery_partners', mapped);
      }
    } catch (err: any) {
      console.warn('Failed to load delivery partners:', err.message);
    }
  };

  useEffect(() => {
    // 1. Instant Cache Hydration (<10ms)
    sessionManager.getVendorCache(vendorId, 'delivery_partners').then(cached => {
      if (Array.isArray(cached) && cached.length > 0) {
        setPartners(cached);
      }
    });

    // 2. Background Revalidation
    loadPartners();
  }, []);

  const handleAddPartner = async () => {
    if (isSubmitting) return;
    if (!formState.fullName.trim()) {
      setActiveFormTab(0);
      Alert.alert('Required', 'Please enter partner Full Name in Personal Information');
      return;
    }
    if (!formState.mobileNumber.trim()) {
      setActiveFormTab(0);
      Alert.alert('Required', 'Please enter Mobile Number in Personal Information');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formState.fullName.trim(),
        phone: formState.mobileNumber.trim(),
        email: formState.emailAddress.trim(),
        vehicleType: formState.vehicleType,
        vehicleNumber: formState.registrationNumber,
        status: 'Available',
        role: formState.partnerRole,
        address: formState.currentAddress,
        city: formState.city,
        pincode: formState.pincode,
      };

      const res = await createDeliveryPartner(payload);
      const created = res?.data || res;
      const newPartner: Partner = {
        id: created?._id || created?.id || (partners.length + 1).toString(),
        name: formState.fullName.trim(),
        avatar: formState.profilePhoto || '',
        status: 'Available',
        rating: 0,
        phone: formState.mobileNumber.trim(),
      };

      setPartners(prev => [...prev, newPartner]);
      
      // Reset Form & Wizard tab
      setFormState(getInitialFormState());
      setActiveFormTab(0);
      setIsAddPartnerVisible(false);

      Alert.alert('Success 🎉', `${newPartner.name} added as partner.`);
      await loadPartners();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save delivery partner to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActiveFormFields = () => {
    switch (activeFormTab) {
      case 0:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Full Name</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.fullName}
                onChangeText={v => updateForm('fullName', v)}
                placeholder="Full Name"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Mobile Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.mobileNumber}
                onChangeText={v => updateForm('mobileNumber', v)}
                placeholder="+91 Mobile Number"
                keyboardType="phone-pad"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Email Address</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.emailAddress}
                onChangeText={v => updateForm('emailAddress', v)}
                placeholder="name@example.com"
                keyboardType="email-address"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Date of Birth</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.dob}
                onChangeText={v => updateForm('dob', v)}
                placeholder="dd-mm-yyyy"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Gender</Text>
              <View style={tw`flex-row bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl`}>
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => updateForm('gender', g)}
                    style={[
                      tw`flex-1 py-2.5 rounded-lg items-center`,
                      formState.gender === g
                        ? (isDark ? tw`bg-zinc-800` : tw`bg-white shadow-sm`)
                        : tw`bg-transparent`,
                    ]}>
                    <Text style={[tw`text-xs font-bold`, formState.gender === g ? tw`text-indigo-650` : tw`text-gray-500`]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Blood Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1`}>
                {(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const).map(bg => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => updateForm('bloodGroup', bg)}
                    style={[
                      tw`mr-2 px-3 py-2 rounded-lg border`,
                      formState.bloodGroup === bg
                        ? [tw`border-indigo-600 bg-indigo-50`, isDark && tw`bg-indigo-950`]
                        : [tw`border-gray-200 bg-white`, isDark && tw`border-zinc-800 bg-zinc-950`],
                    ]}>
                    <Text style={[tw`text-xs font-bold`, formState.bloodGroup === bg ? tw`text-indigo-600` : tw`text-gray-500`]}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Emergency Contact</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.emergencyContact}
                onChangeText={v => updateForm('emergencyContact', v)}
                placeholder="+91 Contact Number"
                keyboardType="phone-pad"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 1:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Current Address</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.currentAddress}
                onChangeText={v => updateForm('currentAddress', v)}
                placeholder="House No, Street Name"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>City</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.city}
                onChangeText={v => updateForm('city', v)}
                placeholder="e.g. New Delhi"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>State</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.state}
                onChangeText={v => updateForm('state', v)}
                placeholder="e.g. Delhi"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Pincode</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.pincode}
                onChangeText={v => updateForm('pincode', v)}
                placeholder="e.g. 110001"
                keyboardType="numeric"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Landmark</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.landmark}
                onChangeText={v => updateForm('landmark', v)}
                placeholder="e.g. Near Metro Station"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>GPS Location</Text>
              <View style={[tw`flex-row items-center p-3.5 rounded-xl border border-gray-200 bg-gray-50`, isDark && tw`bg-zinc-950 border-zinc-700`]}>
                <MapPin size={18} color="#4F46E5" style={tw`mr-2`} />
                <Text style={[tw`text-xs font-mono font-semibold flex-1`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.gpsLocation}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('gpsLocation', '28.6253° N, 77.2282° E')}
                  style={[tw`px-3 py-1.5 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Text style={[tw`text-[10px] font-bold text-indigo-600`, isDark && tw`text-indigo-300`]}>Fetch GPS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Aadhaar Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.aadhaarNumber}
                onChangeText={v => updateForm('aadhaarNumber', v)}
                placeholder="e.g. 123456789012"
                keyboardType="numeric"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>PAN Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.panNumber}
                onChangeText={v => updateForm('panNumber', v)}
                placeholder="e.g. ABCDE1234F"
                autoCapitalize="characters"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 3:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Driving License Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.drivingLicenseNumber}
                onChangeText={v => updateForm('drivingLicenseNumber', v)}
                placeholder="e.g. DL-1234567890123"
                autoCapitalize="characters"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>License Expiry Date</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.licenseExpiryDate}
                onChangeText={v => updateForm('licenseExpiryDate', v)}
                placeholder="dd-mm-yyyy"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>License Front</Text>
              <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.licenseFront}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('licenseFront', 'dl_front.jpg')}
                  style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Upload size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>License Back</Text>
              <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.licenseBack}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('licenseBack', 'dl_back.jpg')}
                  style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Upload size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case 4:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Vehicle Type</Text>
              <View style={tw`flex-row bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl`}>
                {(['Bike', 'Scooter', 'Bicycle', 'Auto', 'Car'] as const).map(vType => (
                  <TouchableOpacity
                    key={vType}
                    onPress={() => updateForm('vehicleType', vType)}
                    style={[
                      tw`flex-1 py-2 rounded-lg items-center`,
                      formState.vehicleType === vType
                        ? (isDark ? tw`bg-zinc-800` : tw`bg-white shadow-sm`)
                        : tw`bg-transparent`,
                    ]}>
                    <Text style={[tw`text-[10px] font-bold`, formState.vehicleType === vType ? tw`text-indigo-650` : tw`text-gray-500`]}>{vType}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Vehicle Brand</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.vehicleBrand}
                onChangeText={v => updateForm('vehicleBrand', v)}
                placeholder="e.g. Honda"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Vehicle Model</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.vehicleModel}
                onChangeText={v => updateForm('vehicleModel', v)}
                placeholder="e.g. Activa 6G"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Registration Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.registrationNumber}
                onChangeText={v => updateForm('registrationNumber', v)}
                placeholder="e.g. DL 1CA 1234"
                autoCapitalize="characters"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>RC Book Copy</Text>
              <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.rcBookCopy}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('rcBookCopy', 'rc_book.pdf')}
                  style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Upload size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Insurance Copy</Text>
              <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.insuranceCopy}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('insuranceCopy', 'insurance.pdf')}
                  style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Upload size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>PUC Certificate</Text>
              <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>{formState.pucCertificate}</Text>
                <TouchableOpacity
                  onPress={() => updateForm('pucCertificate', 'puc_certificate.pdf')}
                  style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                  <Upload size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case 5:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Account Holder Name</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.accountHolderName}
                onChangeText={v => updateForm('accountHolderName', v)}
                placeholder="Account Holder Name"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Bank Name</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.bankName}
                onChangeText={v => updateForm('bankName', v)}
                placeholder="Bank Name"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Account Number</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.accountNumber}
                onChangeText={v => updateForm('accountNumber', v)}
                placeholder="Account Number"
                keyboardType="numeric"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>IFSC Code</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.ifscCode}
                onChangeText={v => updateForm('ifscCode', v)}
                placeholder="IFSC Code"
                autoCapitalize="characters"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>UPI ID</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.upiId}
                onChangeText={v => updateForm('upiId', v)}
                placeholder="UPI ID (e.g. name@bank)"
                autoCapitalize="none"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 6:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Shift Type</Text>
              <View style={tw`flex-row bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl`}>
                {(['Full-Time', 'Part-Time', 'Freelance'] as const).map(shift => (
                  <TouchableOpacity
                    key={shift}
                    onPress={() => updateForm('shiftType', shift)}
                    style={[
                      tw`flex-1 py-2.5 rounded-lg items-center`,
                      formState.shiftType === shift
                        ? (isDark ? tw`bg-zinc-800` : tw`bg-white shadow-sm`)
                        : tw`bg-transparent`,
                    ]}>
                    <Text style={[tw`text-xs font-bold`, formState.shiftType === shift ? tw`text-indigo-650` : tw`text-gray-500`]}>{shift}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Joining Date</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.joiningDate}
                onChangeText={v => updateForm('joiningDate', v)}
                placeholder="dd-mm-yyyy"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 7:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Partner Role Type</Text>
              <View style={tw`flex-row bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl`}>
                {(['Delivery Partner', 'Technician Partner'] as const).map(role => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => updateForm('partnerRole', role)}
                    style={[
                      tw`flex-1 py-3 rounded-lg items-center`,
                      formState.partnerRole === role
                        ? (isDark ? tw`bg-zinc-800` : tw`bg-white shadow-sm`)
                        : tw`bg-transparent`,
                    ]}>
                    <Text style={[tw`text-xs font-bold`, formState.partnerRole === role ? tw`text-indigo-650` : tw`text-gray-500`]}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Preferred Operating Zone</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.zone}
                onChangeText={v => updateForm('zone', v)}
                placeholder="e.g. South Delhi"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Maximum Load Weight (kg)</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.maxWeight}
                onChangeText={v => updateForm('maxWeight', v)}
                placeholder="e.g. 15"
                keyboardType="numeric"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 8:
        return (
          <View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Username</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.username}
                onChangeText={v => updateForm('username', v)}
                placeholder="dhanush.antigraviity@gmail.com"
                autoCapitalize="none"
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Password</Text>
              <TextInput
                style={[
                  tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                  isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                ]}
                value={formState.password}
                onChangeText={v => updateForm('password', v)}
                placeholder="Password"
                secureTextEntry
                placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      case 9:
        return (
          <View>
            {[
              { label: 'Profile Photo Document', key: 'profilePhotoDoc' },
              { label: 'Aadhaar Document Copy', key: 'aadhaarDocCopy' },
              { label: 'Driving License Copy', key: 'drivingLicenseCopy' },
              { label: 'RC Book Document', key: 'rcBookDocName' },
              { label: 'Insurance Copy Document', key: 'insuranceCopyDocument' },
              { label: 'PAN Card Copy Document', key: 'panCardCopyDocument' },
              { label: 'Bank Proof (Passbook/Cheque)', key: 'bankProof' },
            ].map(doc => (
              <View key={doc.key} style={tw`mb-4`}>
                <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>{doc.label}</Text>
                <View style={[tw`flex-row justify-between items-center p-3.5 rounded-xl border border-dashed border-gray-300`, isDark && tw`border-zinc-700`]}>
                  <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                    {formState[doc.key as keyof typeof formState] ? `✅ ${formState[doc.key as keyof typeof formState]}` : 'No file chosen'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateForm(doc.key as keyof typeof formState, `${doc.key}_uploaded.pdf`)}
                    style={[tw`px-3 py-1 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                    <Upload size={14} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      case 10:
        return (
          <View>
            <View style={tw`flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-zinc-800`}>
              <View>
                <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-white` : tw`text-gray-800`]}>Notification Settings</Text>
                <Text style={[tw`text-xs text-gray-400 mt-0.5`]}>Receive instant mobile alerts</Text>
              </View>
              <Switch
                value={formState.notificationsEnabled}
                onValueChange={v => updateForm('notificationsEnabled', v)}
                trackColor={{false: '#D1D5DB', true: '#C7D2FE'}}
                thumbColor={formState.notificationsEnabled ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
            <View style={tw`flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-zinc-800`}>
              <View>
                <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-white` : tw`text-gray-800`]}>GPS Permission</Text>
                <Text style={[tw`text-xs text-gray-400 mt-0.5`]}>Enable continuous tracking permission</Text>
              </View>
              <Switch
                value={formState.gpsPermission}
                onValueChange={v => updateForm('gpsPermission', v)}
                trackColor={{false: '#D1D5DB', true: '#C7D2FE'}}
                thumbColor={formState.gpsPermission ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#18181b' : '#FFFFFF'} />

      {/* Header */}
      <View
        style={[
          isDark ? tw`bg-zinc-900 border-b border-zinc-800` : tw`bg-white`,
          tw`px-5 pb-4`,
          {paddingTop: insets.top + 12},
          {
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              onPress={() => onBack ? onBack() : onNavigate?.('Home')}
              style={[tw`mr-3 p-1.5 rounded-full`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
              <ArrowLeft size={20} color={isDark ? '#E4E4E7' : '#1F2937'} />
            </TouchableOpacity>
            <Text style={[tw`text-2xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Delivery Partners</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsAddPartnerVisible(true)}
            activeOpacity={0.7}
            style={[
              tw`flex-row items-center px-4 py-2 rounded-full`,
              {backgroundColor: '#4F46E5'},
            ]}>
            <Plus size={16} color="#FFFFFF" />
            <Text style={tw`text-white font-semibold text-sm ml-1`}>Add Partner</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusFilters.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                tw`mr-2.5 px-5 py-2 rounded-full`,
                activeFilter === filter
                  ? {backgroundColor: '#4F46E5'}
                  : isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}>
              <Text
                style={[
                  tw`font-semibold text-sm`,
                  activeFilter === filter
                    ? tw`text-white`
                    : isDark ? tw`text-zinc-300` : tw`text-gray-600`,
                ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Partners List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pt-4 pb-6`}>
        {filteredPartners.length === 0 ? (
          <View style={tw`items-center justify-center py-16`}>
            <Truck size={44} color={isDark ? '#52525b' : '#9CA3AF'} style={tw`mb-3`} />
            <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              No Delivery Partners Found
            </Text>
            <Text style={[tw`text-xs text-center mt-1 px-8`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
              Tap "Add Partner" above to register delivery or technician partners.
            </Text>
          </View>
        ) : (
          filteredPartners.map(partner => {
            let statusColor = 'text-gray-500';
            let statusBg = isDark ? 'bg-zinc-800' : 'bg-gray-100';
            let phoneColor = isDark ? '#A1A1AA' : '#4B5563';
            let phoneBg = isDark ? '#27272A' : '#F3F4F6';

            if (partner.status === 'Available') {
              statusColor = 'text-green-600';
              statusBg = isDark ? 'bg-green-950' : 'bg-green-50';
              phoneColor = '#16A34A';
              phoneBg = isDark ? 'rgba(22,163,74,0.15)' : '#F0FDF4';
            } else if (partner.status === 'Busy') {
              statusColor = 'text-red-500';
              statusBg = isDark ? 'bg-red-950' : 'bg-red-50';
              phoneColor = '#DC2626';
              phoneBg = isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2';
            }

            const partnerBookings = bookings[partner.id] || [];

            return (
              <TouchableOpacity
                key={partner.id}
                activeOpacity={0.8}
                onPress={() => setSelectedPartnerForBookings(partner)}
                style={[
                  tw`rounded-2xl p-4 mb-3 flex-row items-center justify-between`,
                  isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
                  {
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}>
                {/* Profile Photo & Info */}
                <View style={tw`flex-row items-center flex-1`}>
                  <Image
                    source={{uri: partner.avatar}}
                    style={tw`w-12 h-12 rounded-full mr-4 bg-gray-200`}
                  />
                  <View style={tw`flex-1`}>
                    <Text style={[tw`font-bold text-base`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      {partner.name}
                    </Text>
                    
                    {/* Status & Rating Row */}
                    <View style={tw`flex-row items-center mt-1 flex-wrap gap-y-1`}>
                      <View style={[tw`px-2.5 py-0.5 rounded-full mr-2`, tw`${statusBg}`]}>
                        <Text style={[tw`text-[10px] font-bold`, tw`${statusColor}`]}>
                          {partner.status}
                        </Text>
                      </View>
                      <View style={tw`flex-row items-center mr-3.5`}>
                        <Star size={11} color="#F59E0B" fill="#F59E0B" style={tw`mr-1`} />
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                          {partner.rating}
                        </Text>
                      </View>
                      {partnerBookings.length > 0 && (
                        <View style={[tw`px-2 py-0.5 rounded bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                          <Text style={[tw`text-[9px] font-bold text-indigo-600`, isDark && tw`text-indigo-300`]}>
                            {partnerBookings.length} Booking{partnerBookings.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Call Action Button */}
                <TouchableOpacity
                  onPress={() => handleCallPartner(partner)}
                  activeOpacity={0.7}
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center ml-2`,
                    {backgroundColor: phoneBg},
                  ]}>
                  <Phone size={18} color={phoneColor} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Partner Modal with 11 Sections Wizard (Performance Info Removed) */}
      {isAddPartnerVisible && (
        <View style={[tw`absolute inset-0 justify-end`, {backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, elevation: 1000}]}>
          <TouchableOpacity activeOpacity={1} onPress={() => setIsAddPartnerVisible(false)} style={tw`absolute inset-0`} />
          <View style={[tw`rounded-t-3xl px-5 pt-5 pb-8 max-h-[90%] bg-white`, isDark && tw`bg-zinc-900`]}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <View style={tw`flex-1 mr-3`}>
                <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Add Delivery Partner</Text>
                <Text style={[tw`text-xs text-indigo-650 font-bold mt-0.5`, isDark && tw`text-indigo-300`]}>
                  Step {Math.min(activeFormTab + 1, 11)} of 11: {formCategories[activeFormTab]?.title || ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddPartnerVisible(false)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {/* Horizontal Scrollable categories tabs */}
            <View style={tw`mb-4`}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`py-1.5`}>
                {formCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setActiveFormTab(cat.id)}
                    style={[
                      tw`flex-row items-center mr-2 px-3 py-1.5 rounded-lg border`,
                      activeFormTab === cat.id
                        ? [tw`border-indigo-650 bg-indigo-50`, {borderColor: '#4F46E5'}, isDark && tw`bg-indigo-950`]
                        : [tw`border-gray-200 bg-white`, isDark && tw`border-zinc-800 bg-zinc-950`],
                    ]}>
                    <Text style={tw`text-xs mr-1`}>{cat.icon}</Text>
                    <Text
                      style={[
                        tw`text-[11px] font-bold`,
                        activeFormTab === cat.id
                          ? tw`text-indigo-650`
                          : (isDark ? tw`text-zinc-400` : tw`text-gray-500`),
                      ]}>
                      {cat.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Active Fields */}
            <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-5`}>
              {renderActiveFormFields()}
            </ScrollView>

            {/* Wizard Navigation Footer */}
            <View style={tw`flex-row justify-between items-center gap-x-2`}>
              {activeFormTab > 0 ? (
                <TouchableOpacity
                  onPress={() => setActiveFormTab(prev => prev - 1)}
                  style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`]}>
                  <Text style={[tw`font-bold text-sm`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>Back</Text>
                </TouchableOpacity>
              ) : null}

              {activeFormTab < 10 ? (
                <TouchableOpacity
                  onPress={() => setActiveFormTab(prev => prev + 1)}
                  style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center`, {backgroundColor: '#4F46E5'}]}>
                  <Text style={tw`text-white font-bold text-sm`}>Next Step</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleAddPartner}
                  style={[tw`flex-1 py-3.5 rounded-2xl items-center justify-center`, {backgroundColor: '#10B981'}]}>
                  <Text style={tw`text-white font-bold text-sm`}>Save Partner</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Bookings Modal - Matches user snapshot */}
      {selectedPartnerForBookings && (
        <View style={[tw`absolute inset-0 justify-end`, {backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, elevation: 1000}]}>
          <TouchableOpacity activeOpacity={1} onPress={() => setSelectedPartnerForBookings(null)} style={tw`absolute inset-0`} />
          <View style={[tw`rounded-t-3xl px-5 pt-5 pb-8 max-h-[85%] bg-white`, isDark && tw`bg-zinc-900`]}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <View>
                <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Assigned Bookings</Text>
                <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Active orders assigned to {selectedPartnerForBookings.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPartnerForBookings(null)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
              {(bookings[selectedPartnerForBookings.id] || []).length === 0 ? (
                <View style={tw`items-center justify-center py-12`}>
                  <Text style={[tw`text-sm font-semibold`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                    No active bookings assigned.
                  </Text>
                </View>
              ) : (
                (bookings[selectedPartnerForBookings.id] || []).map(booking => {
                  let statusBg = 'bg-green-50';
                  let statusColor = 'text-green-600';
                  if (booking.status === 'Out for Delivery') {
                    statusBg = 'bg-amber-50';
                    statusColor = 'text-amber-600';
                  } else if (booking.status === 'Delivered') {
                    statusBg = 'bg-blue-50';
                    statusColor = 'text-blue-600';
                  }

                  return (
                    <View
                      key={booking.id}
                      style={[
                        tw`rounded-2xl p-4 mb-3.5 flex-row items-center justify-between border`,
                        isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-white border-gray-100`,
                        {
                          shadowColor: '#000',
                          shadowOffset: {width: 0, height: 1},
                          shadowOpacity: 0.02,
                          shadowRadius: 4,
                          elevation: 1,
                        },
                      ]}>
                      {/* Left: Image & Details */}
                      <View style={tw`flex-row items-center flex-1 mr-3`}>
                        <Image
                          source={{uri: booking.image}}
                          style={tw`w-18 h-18 rounded-xl mr-4 bg-gray-100`}
                        />
                        <View style={tw`flex-1`}>
                          <Text style={[tw`font-extrabold text-sm tracking-tight`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                            {booking.id}
                          </Text>
                          <Text style={[tw`text-xs font-semibold text-gray-500 mt-0.5`, isDark && tw`text-zinc-400`]}>
                            {booking.itemName}
                          </Text>
                          <Text style={[tw`text-[10px] text-gray-400 mt-0.5`, isDark && tw`text-zinc-500`]}>
                            {booking.dateTime}
                          </Text>
                          <Text style={[tw`font-extrabold text-sm mt-1.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                            {booking.price}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Badge */}
                      <View style={[tw`px-3 py-1 rounded-full`, tw`${statusBg}`, isDark && tw`bg-opacity-15`]}>
                        <Text style={[tw`text-[10px] font-bold`, tw`${statusColor}`]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedPartnerForBookings(null)}
              style={[tw`py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-200 bg-gray-50`]}>
              <Text style={[tw`text-sm font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-600`]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
}
