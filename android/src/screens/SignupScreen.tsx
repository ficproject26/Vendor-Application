import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
  Image,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Store,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Shield,
  CheckSquare,
  Square,
  Briefcase,
  CreditCard,
  LayoutGrid,
  ShoppingBag,
  Clock,
  MapPin,
  Upload,
  Globe,
  Check,
  CheckCircle2,
} from 'lucide-react-native';

const businessTypes = ['Products', 'Services', 'Food', 'Daily Needs', 'Stay', 'Travel', 'Jobs'];
const operatingHoursOptions = [
  '09:00 AM - 05:00 PM',
  '09:00 AM - 06:00 PM',
  '09:00 AM - 09:00 PM',
  '10:00 AM - 07:00 PM',
  '10:00 AM - 10:00 PM',
  '24 Hours Open',
];
const gstStatuses = ['GST Registered', 'Non-GST Declared'];
const msmeStatuses = ['MSME Registered', 'Non-MSME'];

import { registerVendor, fetchMainCategories } from '../services/apiService';

interface SignupScreenProps {
  onNavigateToLogin: () => void;
  onSignup: () => void;
  isDark?: boolean;
}

export default function SignupScreen({ onNavigateToLogin, onSignup, isDark = false }: SignupScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableBusinessTypes, setAvailableBusinessTypes] = useState<string[]>(businessTypes);

  useEffect(() => {
    fetchMainCategories().then(cats => {
      if (Array.isArray(cats) && cats.length > 0) {
        setAvailableBusinessTypes(cats);
      }
    }).catch(err => {
      console.warn('[SignupScreen] fetchMainCategories error:', err);
    });
  }, []);

  const handleSignup = async () => {
    if (!declared) return;

    // Client-side validation: Password complexity matching backend rules
    if (password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
      Alert.alert(
        'Password Requirement',
        'Password must be at least 6 characters long and include at least one uppercase letter, one digit, and one special character (e.g. Pass@123).'
      );
      return;
    }

    if (!postalCode) {
      Alert.alert('Required Field', 'Please provide a valid postal code.');
      return;
    }

    setLoading(true);
    try {
      const canonicalType = productOrService === 'Product' ? 'Products' : productOrService === 'Service' ? 'Services' : productOrService;
      const defaultSubcategory = canonicalType === 'Services' ? 'Healthcare Services' : canonicalType === 'Products' ? 'Electronics' : canonicalType === 'Food' ? 'Restaurants' : canonicalType === 'Daily Needs' ? 'Grocery Delivery' : canonicalType === 'Stay' ? 'Hotels' : canonicalType === 'Travel' ? 'Flight Booking' : 'IT Jobs';
      const payload = {
        email: businessEmail.trim(),
        password,
        vendorType: canonicalType,
        category: canonicalType,
        subcategory: defaultSubcategory,
        businessName: shopName.trim(),
        agentName: agentName || 'Connect Agent',
        contactPerson: ownerName.trim(),
        name: ownerName.trim(),
        address: businessAddress,
        street: businessAddress.split(',')[0] || businessAddress,
        city: bankCity || 'City',
        state: 'Tamil Nadu',
        country: 'India',
        postalCode: postalCode.trim(),
        mobileNumber: businessPhone.replace(/[^0-9]/g, ''),
        gstStatus: gstStatus,
        panNo: panNumber.trim().toUpperCase(),
        panDoc: panDoc || '',
        aadhaarNo: aadhaarNumber.replace(/[^0-9]/g, ''),
        aadhaarDoc: aadhaarDoc || '',
        companyRegNo: companyRegNo || 'N/A',
        msmeStatus: msmeStatus,
        accountHolderName: accountHolderName,
        bankName: bankName,
        bankBranch: bankBranch,
        bankStreet: bankStreet,
        bankCity: bankCity,
        accountNo: accountNo.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        operatingHours: operatingHours,
        businessWebsite: businessWebsite || '',
        shopLogo: shopLogo || '',
        logo: shopLogo || '',
        licenseFile: licenseFile || '',
        businessLicense: licenseFile || '',
        businessImages: businessImages || [],
        businesses: JSON.stringify([{
          vendorType: canonicalType,
          category: canonicalType,
          subcategory: defaultSubcategory,
          businessName: shopName.trim(),
          status: 'Pending Pincode Admin Review',
          isApproved: false,
          isActive: false
        }])
      };

      const res = await registerVendor(payload);
      setLoading(false);
      if (res.success) {
        setRegistrationSuccess(true);
      } else {
        Alert.alert('Registration Failed', res.message || 'Error occurred during registration.');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Network Error', err.message || 'Failed to connect to backend.');
    }
  };

  // STEP 1: Business Info
  const [shopName, setShopName] = useState('');
  const [productOrService, setProductOrService] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shopLogo, setShopLogo] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [businessImages, setBusinessImages] = useState<string[]>([]);

  // STEP 2: Owner Info
  const [ownerName, setOwnerName] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [agentName, setAgentName] = useState('');
  const [coPartnerName, setCoPartnerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STEP 3: Documents
  const [panNumber, setPanNumber] = useState('');
  const [panDoc, setPanDoc] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDoc, setAadhaarDoc] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [gstStatus, setGstStatus] = useState('');
  const [msmeStatus, setMsmeStatus] = useState('');
  const [licenseFile, setLicenseFile] = useState('');

  // STEP 4: Bank Details
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankStreet, setBankStreet] = useState('');
  const [bankCity, setBankCity] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // STEP 6: Declaration
  const [declared, setDeclared] = useState(false);

  // Application Review State
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [uploadPickerTarget, setUploadPickerTarget] = useState<'logo' | 'images' | 'license' | 'panDoc' | 'aadhaarDoc' | null>(null);

  const applyTargetImage = (target: 'logo' | 'images' | 'license' | 'panDoc' | 'aadhaarDoc' | null, uri: string) => {
    if (target === 'logo') setShopLogo(uri);
    else if (target === 'license') setLicenseFile(uri);
    else if (target === 'panDoc') setPanDoc(uri);
    else if (target === 'aadhaarDoc') setAadhaarDoc(uri);
    else if (target === 'images') {
      setBusinessImages(prev => (prev.includes(uri) ? prev : [...prev, uri]).slice(0, 5));
    }
  };

  const handleChooseFromGallery = async () => {
    const target = uploadPickerTarget;
    setUploadPickerTarget(null);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: target === 'images' ? 5 : 1,
      });
      if (result.assets && result.assets.length > 0) {
        if (target === 'images') {
          const uris = result.assets.map(a => a.uri).filter(Boolean) as string[];
          setBusinessImages(uris);
        } else if (result.assets[0].uri) {
          applyTargetImage(target, result.assets[0].uri);
        }
      }
    } catch (err) {
      console.warn('Gallery error: ', err);
    }
  };

  const handleTakePhotoFromCamera = async () => {
    const target = uploadPickerTarget;
    setUploadPickerTarget(null);
    try {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission Required',
              message: 'App requires access to camera to capture photos for your business profile and document verification.',
              buttonNeutral: 'Ask Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Camera permission denied');
            return;
          }
        } catch (permErr) {
          console.warn('Permission request error:', permErr);
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
        applyTargetImage(target, result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera error: ', err);
    }
  };


  // Dropdown modals state
  const [dropdownType, setDropdownType] = useState<'type' | 'hours' | 'gst' | 'msme' | null>(null);

  // Password validation checks
  const hasMinLength = password.length >= 6;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const nextStep = () => {
    if (currentStep === 1) {
      if (!shopName || !productOrService || !businessAddress || !businessPhone || !businessEmail || !operatingHours) {
        Alert.alert('Required Fields', 'Please fill in all fields marked with *');
        return;
      }
      const cleanPhone = businessPhone.replace(/[^0-9]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessEmail.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid business email address.');
        return;
      }
    } else if (currentStep === 2) {
      if (!ownerName || !password || !confirmPassword) {
        Alert.alert('Required Fields', 'Please fill in all fields marked with *');
        return;
      }
      if (alternatePhone) {
        const cleanAlt = alternatePhone.replace(/[^0-9]/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanAlt)) {
          Alert.alert('Invalid Mobile Number', 'Alternate phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
          return;
        }
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Password and Confirm Password do not match');
        return;
      }
      if (!(hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecial)) {
        Alert.alert('Password Requirements', 'Please meet all password requirements');
        return;
      }
    } else if (currentStep === 3) {
      if (!panNumber || !aadhaarNumber || !gstStatus || !msmeStatus || !licenseFile) {
        Alert.alert('Required Fields', 'Please fill in all document fields marked with *');
        return;
      }
      const cleanPan = panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        Alert.alert('Invalid PAN Format', 'Please enter a valid Indian PAN number (e.g. ABCDE1234F).');
        return;
      }
      const cleanAadhaar = aadhaarNumber.replace(/[^0-9]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        Alert.alert('Invalid Aadhaar Number', 'Please enter a valid 12-digit Aadhaar number.');
        return;
      }
    } else if (currentStep === 4) {
      if (!accountHolderName || !bankName || !bankBranch || !bankStreet || !bankCity || !accountNo || !ifscCode) {
        Alert.alert('Required Fields', 'Please fill in all bank fields marked with *');
        return;
      }
      const cleanAcc = accountNo.replace(/[^0-9]/g, '');
      if (cleanAcc.length < 9 || cleanAcc.length > 18) {
        Alert.alert('Invalid Account Number', 'Bank account number must be between 9 and 18 digits.');
        return;
      }
      const cleanIfsc = ifscCode.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        Alert.alert('Invalid IFSC Code', 'Please enter a valid 11-character Indian IFSC code (e.g. SBIN0001234).');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleDropdownSelect = (value: string) => {
    if (dropdownType === 'type') setProductOrService(value);
    if (dropdownType === 'hours') setOperatingHours(value);
    if (dropdownType === 'gst') setGstStatus(value);
    if (dropdownType === 'msme') setMsmeStatus(value);
    setDropdownType(null);
  };

  const getDropdownItems = () => {
    if (dropdownType === 'type') return availableBusinessTypes;
    if (dropdownType === 'hours') return operatingHoursOptions;
    if (dropdownType === 'gst') return gstStatuses;
    if (dropdownType === 'msme') return msmeStatuses;
    return [];
  };

  // Steps indicator component
  const renderStepsIndicator = () => {
    const steps = [
      { num: 1, label: 'Business' },
      { num: 2, label: 'Owner' },
      { num: 3, label: 'Docs' },
      { num: 4, label: 'Bank' },
      { num: 5, label: 'Review' },
      { num: 6, label: 'Submit' },
    ];
    return (
      <View style={tw`flex-row justify-between items-center mb-6 px-1`}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <View style={tw`items-center`}>
              <View
                style={[
                  tw`w-8 h-8 rounded-full items-center justify-center border`,
                  currentStep >= s.num
                    ? [tw`border-indigo-600 bg-indigo-600`]
                    : [tw`border-gray-200 bg-white`],
                ]}>
                {currentStep > s.num ? (
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text
                    style={[
                      tw`text-xs font-bold`,
                      currentStep >= s.num ? tw`text-white` : tw`text-gray-400`,
                    ]}>
                    {s.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  tw`text-[9px] font-bold mt-1`,
                  currentStep >= s.num ? tw`text-indigo-600` : tw`text-gray-400`,
                ]}>
                {s.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[
                  tw`flex-1 h-0.5 mx-1 -mt-4`,
                  currentStep > s.num ? tw`bg-indigo-600` : tw`bg-gray-200`,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (registrationSuccess) {
    return (
      <View style={[tw`flex-1 p-6 justify-center`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
        <View style={[tw`rounded-3xl p-6 border shadow-sm`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-150`]}>
          {/* Header Icon */}
          <View style={tw`items-center mb-5`}>
            <View style={tw`w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-3`}>
              <CheckCircle2 size={36} color="#16A34A" />
            </View>
            <Text style={[tw`text-xl font-black text-center`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Application Submitted Successfully!
            </Text>
            <Text style={[tw`text-xs text-center mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Your registration has been submitted and is awaiting administrative verification
            </Text>
          </View>

          {/* Current Approval Sequence */}
          <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-amber-50/50 border-amber-200`]}>
            <View style={tw`flex-row items-center mb-3`}>
              <View style={tw`w-2 h-2 rounded-full bg-amber-500 mr-2`} />
              <Text style={tw`text-xs font-bold text-amber-800 uppercase tracking-wider`}>
                Current Status: Under Sub Admin Review
              </Text>
            </View>

            {/* Stages */}
            <View style={tw`gap-3`}>
              {/* Stage 1 */}
              <View style={tw`flex-row items-start`}>
                <View style={tw`w-5 h-5 rounded-full bg-emerald-500 items-center justify-center mr-3 mt-0.5`}>
                  <Text style={tw`text-white font-black text-[10px]`}>✓</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-xs font-bold text-emerald-700`}>1. Vendor Registration Submitted</Text>
                  <Text style={tw`text-[10px] text-gray-500`}>Application details and outlet profile created.</Text>
                </View>
              </View>

              {/* Stage 2 */}
              <View style={tw`flex-row items-start`}>
                <View style={tw`w-5 h-5 rounded-full bg-amber-500 items-center justify-center mr-3 mt-0.5`}>
                  <Text style={tw`text-white font-black text-[10px]`}>2</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-xs font-bold text-amber-800`}>2. Sub Admin Review & Approval (In Progress)</Text>
                  <Text style={tw`text-[10px] text-amber-700`}>Pincode Admin is verifying jurisdiction, address & outlet legitimacy.</Text>
                </View>
              </View>

              {/* Stage 3 */}
              <View style={tw`flex-row items-start`}>
                <View style={[tw`w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]}>
                  <Text style={[tw`font-bold text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>3</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>3. KYC Verification</Text>
                  <Text style={tw`text-[10px] text-gray-400`}>Identity team checks PAN and Aadhaar records.</Text>
                </View>
              </View>

              {/* Stage 4 */}
              <View style={tw`flex-row items-start`}>
                <View style={[tw`w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]}>
                  <Text style={[tw`font-bold text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>4</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>4. Payment & Activation</Text>
                  <Text style={tw`text-[10px] text-gray-400`}>Subscription / Onboarding fee verification.</Text>
                </View>
              </View>

              {/* Stage 5 */}
              <View style={tw`flex-row items-start`}>
                <View style={[tw`w-5 h-5 rounded-full items-center justify-center mr-3 mt-0.5`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]}>
                  <Text style={[tw`font-bold text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>5</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>5. Full Dashboard Access</Text>
                  <Text style={tw`text-[10px] text-gray-400`}>Manage listings, orders, and receive customer bookings.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action */}
          <TouchableOpacity
            onPress={onNavigateToLogin}
            style={[tw`py-3.5 rounded-2xl items-center justify-center`, { backgroundColor: '#4F46E5' }]}>
            <Text style={tw`text-white font-bold text-sm`}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Top Navbar */}
        <View
          style={[
            tw`flex-row items-center px-5 pb-3 border-b border-gray-100 bg-white`,
            { paddingTop: insets.top + 12 },
          ]}>
          <TouchableOpacity
            onPress={currentStep > 1 ? prevStep : onNavigateToLogin}
            style={tw`p-1 mr-3 rounded-full bg-gray-50`}>
            <ArrowLeft size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-gray-900`}>
            {currentStep === 5 ? 'Review Profile' : currentStep === 6 ? 'Declaration' : 'Register Vendor'}
          </Text>
        </View>

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[tw`p-5 pb-36`, { flexGrow: 1 }]}>

          {renderStepsIndicator()}

          {/* STEP 1: Business Info */}
          {currentStep === 1 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-5`}>Business Information</Text>

              {/* Business Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business / Shop Name <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Enter your business name"
                />
              </View>

              {/* Product or Service Picker */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Product or Service or etc <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setDropdownType('type')}
                  style={tw`flex-row justify-between items-center bg-gray-50 border border-gray-150 rounded-xl px-4 py-3`}>
                  <Text style={[tw`text-sm font-semibold`, productOrService ? tw`text-gray-800` : tw`text-gray-400`]}>
                    {productOrService || '-- Choose Product or Service or etc --'}
                  </Text>
                  <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Business Address */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business Address <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  placeholder="Enter complete business address"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Postal Code / PIN Code */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Postal Code / PIN Code <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <View style={tw`flex-row items-center bg-gray-50 border border-gray-150 rounded-xl px-3.5 py-3`}>
                  <MapPin size={18} color="#9CA3AF" style={tw`mr-2.5`} />
                  <TextInput
                    style={tw`flex-1 text-sm font-semibold text-gray-800 p-0 m-0`}
                    value={postalCode}
                    onChangeText={(val) => setPostalCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit Postal Code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Shop Logo */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Shop / Brand Logo <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setUploadPickerTarget('logo')}
                  style={tw`flex-row items-center bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4`}>
                  {shopLogo ? (
                    <Image source={{ uri: shopLogo }} style={tw`w-12 h-12 rounded-lg mr-3.5 bg-gray-200`} />
                  ) : (
                    <Upload size={20} color="#4F46E5" style={tw`mr-3`} />
                  )}
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold text-gray-700`}>
                      {shopLogo ? 'Logo image selected (Tap to change)' : 'No file chosen'}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-400 mt-0.5`}>PNG, JPG up to 2MB. Click to upload logo</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Phone Number */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business Phone Number <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  placeholder="Enter business phone number"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email Address */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Email Address <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={businessEmail}
                  onChangeText={setBusinessEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Website */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business Website (Optional)
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={businessWebsite}
                  onChangeText={setBusinessWebsite}
                  placeholder="Enter website URL"
                  autoCapitalize="none"
                />
              </View>

              {/* Operating Hours */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business Operating Hours <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setDropdownType('hours')}
                  style={tw`flex-row justify-between items-center bg-gray-50 border border-gray-150 rounded-xl px-4 py-3`}>
                  <Text style={[tw`text-sm font-semibold`, operatingHours ? tw`text-gray-800` : tw`text-gray-400`]}>
                    {operatingHours || 'Select operating hours'}
                  </Text>
                  <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Business Images */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Shop / Business Images (Optional)
                </Text>
                <TouchableOpacity
                  onPress={() => setUploadPickerTarget('images')}
                  style={tw`flex-row items-center bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4`}>
                  <Upload size={20} color="#4F46E5" style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold text-gray-700`}>
                      {businessImages.length > 0 ? `${businessImages.length} image(s) selected (Tap to change)` : 'No file chosen'}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-400 mt-0.5`}>PNG, JPG up to 5MB (Max 5). Upload business images</Text>
                  </View>
                </TouchableOpacity>
                {businessImages.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-3 flex-row`}>
                    {businessImages.map((uri, idx) => (
                      <Image key={idx} source={{ uri }} style={tw`w-14 h-14 rounded-lg mr-2 border border-gray-200 bg-gray-100`} />
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Next Button */}
              <TouchableOpacity
                onPress={nextStep}
                style={tw`bg-indigo-600 py-3.5 rounded-xl items-center`}>
                <Text style={tw`text-white font-bold text-base`}>Next Step</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Owner Info */}
          {currentStep === 2 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-5`}>Owner Information</Text>

              {/* Owner Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Owner / Contact Person Name <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="e.g. John Smith"
                />
              </View>

              {/* Alternate Phone */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Alternate Phone Number (Optional)
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={alternatePhone}
                  onChangeText={setAlternatePhone}
                  placeholder="Alternate contact phone number"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Agent Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Agent Name (Optional)
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={agentName}
                  onChangeText={setAgentName}
                  placeholder="e.g. Referrer Agent name"
                />
              </View>

              {/* Co-partner Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Co-partner Name (Optional)
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={coPartnerName}
                  onChangeText={setCoPartnerName}
                  placeholder="dhanush.antigraviity@gmail.com"
                />
              </View>

              {/* Password */}
              <View style={tw`mb-3`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Account Password <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <View style={tw`flex-row items-center bg-gray-50 border border-gray-150 rounded-xl px-4`}>
                  <TextInput
                    style={tw`flex-1 text-sm font-semibold text-gray-800 py-3`}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={18} color="#6B7280" /> : <EyeOff size={18} color="#6B7280" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Validation Requirements */}
              <View style={tw`bg-gray-50 rounded-xl p-3.5 mb-4`}>
                <Text style={tw`text-xs font-bold text-gray-500 mb-2`}>Password Requirements:</Text>

                {[
                  { chk: hasMinLength, txt: 'Min 6 characters' },
                  { chk: hasLowercase, txt: 'Lowercase letter' },
                  { chk: hasUppercase, txt: 'Uppercase letter' },
                  { chk: hasNumber, txt: 'Number (0-9)' },
                  { chk: hasSpecial, txt: 'Special character (e.g. @, #, $, %)' },
                ].map((req, i) => (
                  <View key={i} style={tw`flex-row items-center mb-1`}>
                    <View style={[tw`w-4 h-4 rounded-full items-center justify-center mr-2`, req.chk ? tw`bg-green-100` : tw`bg-gray-200`]}>
                      <Check size={10} color={req.chk ? '#16A34A' : '#9CA3AF'} strokeWidth={3} />
                    </View>
                    <Text style={[tw`text-[11px] font-semibold`, req.chk ? tw`text-green-700` : tw`text-gray-400`]}>{req.txt}</Text>
                  </View>
                ))}
              </View>

              {/* Confirm Password */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Confirm Password <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <View style={tw`flex-row items-center bg-gray-50 border border-gray-150 rounded-xl px-4`}>
                  <TextInput
                    style={tw`flex-1 text-sm font-semibold text-gray-800 py-3`}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <Eye size={18} color="#6B7280" /> : <EyeOff size={18} color="#6B7280" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={prevStep}
                  style={tw`flex-1 border border-gray-200 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-gray-600 font-bold text-sm`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextStep}
                  style={tw`flex-1 bg-indigo-600 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-white font-bold text-sm`}>Next Step</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: Documents */}
          {currentStep === 3 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-5`}>Documents Verification</Text>

              {/* PAN Number */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  PAN Number (10 Alphanumeric) <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={panNumber}
                  onChangeText={(val) => setPanNumber(val.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>

              {/* PAN Document Upload */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Upload PAN Card Document (Optional)
                </Text>
                <TouchableOpacity
                  onPress={() => setUploadPickerTarget('panDoc')}
                  style={tw`flex-row items-center bg-gray-50 border border-dashed border-indigo-300 rounded-xl p-3.5`}>
                  <Upload size={18} color="#4F46E5" style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold ${panDoc ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {panDoc ? `Selected: ${panDoc.length > 25 ? panDoc.substring(0, 22) + '...' : panDoc}` : 'Upload PAN Document (Tap to select)'}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-400 mt-0.5`}>PNG, JPG, PDF up to 5MB</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Owner Aadhaar Number */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Owner Aadhaar Number (12 Digits) <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={aadhaarNumber}
                  onChangeText={(val) => setAadhaarNumber(val.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 123456789012"
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>

              {/* Aadhaar Document Upload */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Upload Aadhaar Document (Optional)
                </Text>
                <TouchableOpacity
                  onPress={() => setUploadPickerTarget('aadhaarDoc')}
                  style={tw`flex-row items-center bg-gray-50 border border-dashed border-indigo-300 rounded-xl p-3.5`}>
                  <Upload size={18} color="#4F46E5" style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold ${aadhaarDoc ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {aadhaarDoc ? `Selected: ${aadhaarDoc.length > 25 ? aadhaarDoc.substring(0, 22) + '...' : aadhaarDoc}` : 'Upload Aadhaar Document (Tap to select)'}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-400 mt-0.5`}>PNG, JPG, PDF up to 5MB</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Company Registration No */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Company Registration No (Optional)
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={companyRegNo}
                  onChangeText={setCompanyRegNo}
                  placeholder="CIN or Reg Number"
                  autoCapitalize="characters"
                />
              </View>

              {/* GST Status */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  GST Status <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setDropdownType('gst')}
                  style={tw`flex-row justify-between items-center bg-gray-50 border border-gray-150 rounded-xl px-4 py-3`}>
                  <Text style={[tw`text-sm font-semibold`, gstStatus ? tw`text-gray-800` : tw`text-gray-400`]}>
                    {gstStatus}
                  </Text>
                  <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* MSME Status */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  MSME Status <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setDropdownType('msme')}
                  style={tw`flex-row justify-between items-center bg-gray-50 border border-gray-150 rounded-xl px-4 py-3`}>
                  <Text style={[tw`text-sm font-semibold`, msmeStatus ? tw`text-gray-800` : tw`text-gray-400`]}>
                    {msmeStatus}
                  </Text>
                  <ChevronDown size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Document Upload */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Business License / Document Upload <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setUploadPickerTarget('license')}
                  style={tw`flex-row items-center bg-gray-50 border border-dashed border-indigo-300 rounded-xl p-4`}>
                  <Upload size={20} color="#4F46E5" style={tw`mr-3`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-semibold ${licenseFile ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {licenseFile ? `Selected: ${licenseFile.length > 25 ? licenseFile.substring(0, 22) + '...' : licenseFile}` : 'Upload file (Tap to select)'}
                    </Text>
                    <Text style={tw`text-[10px] text-gray-400 mt-0.5`}>PNG, JPG, PDF up to 5MB. Tap to choose photo/doc</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={prevStep}
                  style={tw`flex-1 border border-gray-200 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-gray-600 font-bold text-sm`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextStep}
                  style={tw`flex-1 bg-indigo-600 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-white font-bold text-sm`}>Next Step</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: Bank Details */}
          {currentStep === 4 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-5`}>Bank Details</Text>

              {/* Account Holder Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Account Holder Name <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  placeholder="Account Holder Name"
                />
              </View>

              {/* Bank Name */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Bank Name <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Bank Name"
                />
              </View>

              {/* Bank Branch */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Bank Branch <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={bankBranch}
                  onChangeText={setBankBranch}
                  placeholder="Bank Branch Name"
                />
              </View>

              {/* Bank Street */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Bank Street <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={bankStreet}
                  onChangeText={setBankStreet}
                  placeholder="Bank Street Address"
                />
              </View>

              {/* Bank City */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Bank City <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={bankCity}
                  onChangeText={setBankCity}
                  placeholder="Bank City"
                />
              </View>

              {/* Account No */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  Account No <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={accountNo}
                  onChangeText={setAccountNo}
                  placeholder="Bank Account Number"
                  keyboardType="numeric"
                />
              </View>

              {/* IFSC code */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-gray-700 font-semibold text-xs mb-1.5`}>
                  IFSC code <Text style={tw`text-red-500`}>*</Text>
                </Text>
                <TextInput
                  style={tw`bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800`}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  placeholder="Bank IFSC Code"
                  autoCapitalize="characters"
                />
              </View>

              {/* Actions */}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={prevStep}
                  style={tw`flex-1 border border-gray-200 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-gray-600 font-bold text-sm`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextStep}
                  style={tw`flex-1 bg-indigo-600 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-white font-bold text-sm`}>Next Step</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 5: Review Details */}
          {currentStep === 5 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-5`}>Review Registration</Text>

              {/* Review Card */}
              <View style={tw`bg-gray-50 rounded-2xl p-4.5 mb-6 border border-gray-100`}>
                {/* Business Details */}
                <Text style={tw`text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2`}>Business Details</Text>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xs font-bold text-gray-800`}>Shop Name: <Text style={tw`font-semibold text-gray-600`}>{shopName}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Operating Hours: <Text style={tw`font-semibold text-gray-600`}>{operatingHours}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Product or Service or etc: <Text style={tw`font-semibold text-gray-600`}>🛠️ {productOrService}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Phone/Email: <Text style={tw`font-semibold text-gray-600`}>{businessPhone} / {businessEmail}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Website: <Text style={tw`font-semibold text-gray-600`}>{businessWebsite || 'None'}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Address: <Text style={tw`font-semibold text-gray-600`}>{businessAddress}</Text></Text>
                </View>

                {/* Owner Details */}
                <View style={tw`w-full h-px bg-gray-200 my-3`} />
                <Text style={tw`text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2`}>Owner Details</Text>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xs font-bold text-gray-800`}>Owner Name: <Text style={tw`font-semibold text-gray-600`}>{ownerName}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Alternate Phone: <Text style={tw`font-semibold text-gray-600`}>{alternatePhone || 'None'}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Agent Name: <Text style={tw`font-semibold text-gray-600`}>{agentName || 'None'}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Co-partner Name: <Text style={tw`font-semibold text-gray-600`}>{coPartnerName}</Text></Text>
                </View>

                {/* Documents */}
                <View style={tw`w-full h-px bg-gray-200 my-3`} />
                <Text style={tw`text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2`}>Documents</Text>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xs font-bold text-gray-800`}>PAN No: <Text style={tw`font-semibold text-gray-600`}>{panNumber.toUpperCase()}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>
                    Owner Aadhaar No: <Text style={tw`font-semibold text-gray-600`}>
                      {aadhaarNumber ? `XXXX-XXXX-${aadhaarNumber.slice(-4)}` : 'None'}
                    </Text>
                  </Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Company Reg No: <Text style={tw`font-semibold text-gray-600`}>{companyRegNo || 'None'}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>GST Status: <Text style={tw`font-semibold text-gray-600`}>{gstStatus}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>MSME Status: <Text style={tw`font-semibold text-gray-600`}>{msmeStatus}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>License File: <Text style={tw`font-semibold text-gray-600`}>{licenseFile ? 'Uploaded ✓' : 'None'}</Text></Text>
                </View>

                {/* Bank Details */}
                <View style={tw`w-full h-px bg-gray-200 my-3`} />
                <Text style={tw`text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2`}>Bank Details</Text>
                <View>
                  <Text style={tw`text-xs font-bold text-gray-800`}>Holder Name: <Text style={tw`font-semibold text-gray-600`}>{accountHolderName}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Bank Name/Branch: <Text style={tw`font-semibold text-gray-600`}>{bankName} ({bankBranch})</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>Account No: <Text style={tw`font-semibold text-gray-600`}>{accountNo}</Text></Text>
                  <Text style={tw`text-xs font-bold text-gray-800 mt-1`}>IFSC Code: <Text style={tw`font-semibold text-gray-600`}>{ifscCode}</Text></Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={prevStep}
                  style={tw`flex-1 border border-gray-200 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-gray-600 font-bold text-sm`}>Edit Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextStep}
                  style={tw`flex-1 bg-indigo-600 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-white font-bold text-sm`}>Next Step</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 6: Declaration and Submit */}
          {currentStep === 6 && (
            <View>
              <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Declaration Form</Text>

              <View style={tw`bg-gray-50 border border-gray-150 rounded-2xl p-5 mb-6`}>
                <Text style={tw`text-xs font-semibold text-gray-600 leading-5.5 mb-4`}>
                  1. I/We hereby declare that the particulars given above are true and correct to the best of my/our knowledge and belief.
                </Text>
                <Text style={tw`text-xs font-semibold text-gray-600 leading-5.5 mb-4`}>
                  2. I/We agree to abide by all the Terms of Service and Privacy Policy of Connect App as a registered vendor partner.
                </Text>
                <Text style={tw`text-xs font-semibold text-gray-600 leading-5.5`}>
                  3. I/We understand that any false or inaccurate representation may result in immediate suspension or cancellation of our vendor registration.
                </Text>
              </View>

              {/* Checkbox */}
              <TouchableOpacity
                onPress={() => setDeclared(!declared)}
                style={tw`flex-row items-start mb-6 px-1`}>
                {declared ? (
                  <CheckSquare size={20} color="#4F46E5" style={tw`mt-0.5`} />
                ) : (
                  <Square size={20} color="#9CA3AF" style={tw`mt-0.5`} />
                )}
                <Text style={tw`text-gray-700 text-xs font-semibold ml-2.5 flex-1 leading-5`}>
                  I agree to the declaration statement above and confirm that all details are correct.
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  onPress={prevStep}
                  style={tw`flex-1 border border-gray-200 py-3.5 rounded-xl items-center`}>
                  <Text style={tw`text-gray-600 font-bold text-sm`}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSignup}
                  disabled={!declared || loading}
                  style={[
                    tw`flex-1 py-3.5 rounded-xl items-center`,
                    declared && !loading ? tw`bg-indigo-600` : tw`bg-gray-300`,
                  ]}>
                  {loading ? (
                    <Text style={tw`text-white font-bold text-sm`}>Submitting...</Text>
                  ) : (
                    <Text style={tw`text-white font-bold text-sm`}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Modals */}
      <Modal
        visible={dropdownType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownType(null)}>
        <TouchableOpacity
          style={[tw`flex-1 justify-center px-8`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setDropdownType(null)}>
          <View style={tw`bg-white rounded-2xl max-h-96 overflow-hidden`}>
            <Text style={tw`text-gray-900 font-bold text-base px-5 pt-5 pb-3`}>
              {dropdownType === 'type' ? 'Select Business Type' :
                dropdownType === 'hours' ? 'Select Operating Hours' :
                  dropdownType === 'gst' ? 'Select GST Status' : 'Select MSME Status'}
            </Text>
            <FlatList
              data={getDropdownItems()}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleDropdownSelect(item)}
                  style={tw`px-5 py-3.5 border-t border-gray-50`}>
                  <Text style={tw`text-gray-700 text-sm font-semibold`}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Upload Choice Modal */}
      <Modal
        visible={uploadPickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadPickerTarget(null)}>
        <TouchableOpacity
          style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          activeOpacity={1}
          onPress={() => setUploadPickerTarget(null)}>
          <TouchableOpacity activeOpacity={1} style={tw`bg-white rounded-t-3xl p-6`}>
            <Text style={tw`text-gray-900 font-bold text-base mb-1`}>Upload Photo</Text>
            <Text style={tw`text-gray-500 text-xs mb-5`}>Choose how you would like to select your photo</Text>

            <TouchableOpacity
              onPress={handleChooseFromGallery}
              style={tw`flex-row items-center bg-indigo-50 p-4 rounded-2xl mb-3 border border-indigo-100`}>
              <View style={tw`w-10 h-10 rounded-xl bg-indigo-600 items-center justify-center mr-3.5`}>
                <Upload size={20} color="#FFFFFF" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-900 font-bold text-sm`}>Choose from Gallery</Text>
                <Text style={tw`text-gray-500 text-xs mt-0.5`}>Pick an image from device gallery</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhotoFromCamera}
              style={tw`flex-row items-center bg-amber-50 p-4 rounded-2xl mb-3 border border-amber-100`}>
              <View style={tw`w-10 h-10 rounded-xl bg-amber-500 items-center justify-center mr-3.5`}>
                <ShoppingBag size={20} color="#FFFFFF" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-gray-900 font-bold text-sm`}>Take Photo with Camera</Text>
                <Text style={tw`text-gray-500 text-xs mt-0.5`}>Capture photo using camera</Text>
              </View>
            </TouchableOpacity>



            <TouchableOpacity
              onPress={() => setUploadPickerTarget(null)}
              style={tw`py-3.5 bg-gray-100 rounded-xl items-center`}>
              <Text style={tw`text-gray-700 font-bold text-sm`}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
