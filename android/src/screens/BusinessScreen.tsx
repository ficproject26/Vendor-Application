import React, { useState, useEffect } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { getVendorUser, setVendorUser, fetchProfile, fetchProducts, createProduct, updateProduct, deleteProduct, createBusiness, getActiveBusinessId, setActiveBusinessId, fetchAllBusinessesProducts, updateProfile, uploadImageToServer, normalizeCategory, fetchCategoryHierarchy, fetchMainCategories, applyListingOffer, removeListingOffer, formatImageUrl } from '../services/apiService';
import { sessionManager } from '../services/sessionManager';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Image,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  Search,
  Plus,
  Package,
  Scissors,
  UtensilsCrossed,
  Compass,
  Hotel,
  Briefcase,
  Edit3,
  MoreVertical,
  IndianRupee,
  Box,
  X,
  ArrowLeft,
  Heart,
  Camera,
  MapPin,
  Tag,
  ChevronDown,
  Trash,
  Phone,
  Store,
  Image as LucideImage,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { BusinessItem, CategoryKey } from '../../../App';

const getCategoryUnitLabel = (cat: CategoryKey) => {
  switch (cat) {
    case 'Food': return 'Dish';
    case 'Services': return 'Service';
    case 'Jobs': return 'Job';
    case 'Travel': return 'Vehicle';
    case 'Stay': return 'Room';
    case 'Daily Needs': return 'Product';
    default: return 'Product';
  }
};

const categoriesConfig = [
  { key: 'Services' as CategoryKey, label: 'Services', unit: 'Service', icon: Scissors, color: '#16A34A', bgColor: '#F0FDF4' },
  { key: 'Products' as CategoryKey, label: 'Products', unit: 'Item', icon: Package, color: '#4F46E5', bgColor: '#EEF2FF' },
  { key: 'Daily Needs' as CategoryKey, label: 'Daily Needs', unit: 'Item', icon: Heart, color: '#DB2777', bgColor: '#FCE7F3' },
  { key: 'Food' as CategoryKey, label: 'Food', unit: 'Item', icon: UtensilsCrossed, color: '#DC2626', bgColor: '#FEF2F2' },
  { key: 'Stay' as CategoryKey, label: 'Stay', unit: 'Room', icon: Hotel, color: '#7C3AED', bgColor: '#F5F3FF' },
  { key: 'Travel' as CategoryKey, label: 'Travel', unit: 'Package', icon: Compass, color: '#2563EB', bgColor: '#EFF6FF' },
  { key: 'Jobs' as CategoryKey, label: 'Jobs', unit: 'Job', icon: Briefcase, color: '#EA580C', bgColor: '#FFF7ED' },
];

// Default empty images per category
const categoryImages: Record<CategoryKey, string> = {
  Products: '',
  Services: '',
  Food: '',
  Travel: '',
  Stay: '',
  Jobs: '',
  'Daily Needs': '',
};

const travelBadgeOptions = [
  'Top Rated Bus',
  'Luxury Sleeper',
  'Day Express',
  'Government Certified',
  'Super Fast',
  'Popular Route',
  'Fastest Door-to-Door',
];

const quantityUnitOptions = [
  'count',
  'milligram (mg)',
  'gram (g)',
  'kg',
  'litre',
  'ml',
  'piece',
  'dozen',
  'pack',
  'box',
];

const jobTypeOptions = [
  'Full-time',
  'Part-time',
  'Remote',
  'Internship',
  'Hybrid',
];

// Default Baseline Taxonomy Map (Synchronized with Super Admin MongoDB schema)
const hierarchyMap: Record<CategoryKey, Record<string, string[]>> = {
  'Services': {
    'Healthcare': ['Clinics', 'Diagnostic Centers', 'Pharmacies', 'Dental Care', 'Eye Care', 'Physiotherapy'],
    'Home Services': ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Interior Design', 'Home Cleaning', 'AC Repair', 'CCTV Installation'],
    'Digital': ['Website Development', 'Mobile App Development', 'UI/UX Design', 'Digital Marketing', 'Graphic Design'],
    'Business': ['Company Formation', 'GST Registration', 'Payroll Management', 'HR Solutions', 'Consulting'],
    'Legal': ['Legal Consultation', 'Property Registration', 'Agreement Drafting', 'Notary Services'],
    'Education': ['Schools', 'Colleges', 'Online Courses', 'Skill Development', 'Competitive Exam Coaching'],
    'Events': ['Wedding Planning', 'Birthday Events', 'Corporate Events', 'Photography', 'Videography', 'Catering'],
  },
  'Products': {
    'Electronics': ['Mobiles', 'Smartphones', 'Tablets', 'Laptops', 'Smart Watches', 'Headphones', 'Cameras', 'Printers'],
    'Furniture': ['Sofas', 'Dining Tables', 'Beds', 'Mattresses', 'Wardrobes', 'Office Chairs', 'Study Tables'],
    'Fashion': ['Men - Shirts', 'Men - T-Shirts', 'Men - Jeans', 'Men - Footwear', 'Women - Sarees', 'Women - Kurtis', 'Women - Dresses', 'Kids - Clothing'],
    'Home Appliances': ['Refrigerators', 'Washing Machines', 'Air Conditioners', 'Televisions', 'Microwave Ovens', 'Water Purifiers'],
    'IT & Office': ['Monitors', 'Keyboards', 'Mouse', 'Routers', 'Storage Devices', 'Office Printers'],
    'Beauty': ['Skincare', 'Haircare', 'Cosmetics', 'Perfumes', 'Grooming Products', 'Wellness Products'],
  },
  'Daily Needs': {
    'Grocery': ['Staples', 'Rice', 'Wheat', 'Flour', 'Pulses', 'Dal', 'Cooking Oil', 'Spices', 'Snacks'],
    'Vegetables': ['Fresh Vegetables', 'Onion', 'Tomato', 'Potato', 'Carrot', 'Green Vegetables', 'Chilli'],
    'Fruits': ['Fresh Fruits', 'Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Pomegranate'],
    'Dairy': ['Milk', 'Curd', 'Butter', 'Ghee', 'Cheese', 'Paneer', 'Yogurt'],
    'Household Essentials': ['Cleaning Products', 'Floor Cleaner', 'Dishwash Liquid', 'Detergent', 'Dustbins'],
    'Personal Care': ['Bath & Body', 'Soap', 'Shampoo', 'Toothpaste', 'Face Wash', 'Hair Oil', 'Deodorants'],
    'Pharmacy': ['Medicines', 'OTC Medicines', 'Pain Relief', 'Cold & Cough', 'First Aid Kit'],
  },
  'Food': {
    'South Indian': ['Idli', 'Idly', 'Dosa', 'South Indian Meals', 'Uttapam', 'Pongal', 'Vada', 'Biryani'],
    'North Indian': ['Naan', 'Dal Makhani', 'Paneer Dishes', 'Roti', 'Tandoori Items', 'Thali Meals'],
    'Restaurants': ['Fine Dining', 'Family Restaurants', 'Casual Dining', 'Buffet Restaurants'],
    'Fast Food': ['Burgers', 'Pizza', 'Sandwiches', 'French Fries', 'Wraps', 'Fried Chicken'],
    'Biryani': ['Chicken Biryani', 'Mutton Biryani', 'Veg Biryani', 'Dum Biryani', 'Fried Rice'],
    'Bakery': ['Cakes', 'Pastries', 'Cookies', 'Buns', 'Brownies', 'Ice Cream'],
    'Beverages': ['Tea', 'Coffee', 'Fresh Juice', 'Smoothies', 'Milkshakes'],
  },
  'Stay': {
    'Viila': ['Luxury Villa', 'Private Pool Villa', 'Heritage Villa', 'Beach Villa', 'Hill View Villa'],
    'Resort': ['Beach Resort', 'Hill Station Resort', 'Family Resort', 'Luxury Resort', 'Eco Resort'],
    'Hotels': ['Budget Hotels', 'Business Hotels', 'Premium Hotels', 'Luxury Hotels', '5-Star Hotels'],
    'Homestays': ['Family Homestays', 'Village Homestays', 'Farm Stays', 'Heritage Homestays'],
    'Service Apartments': ['Daily Rental', 'Weekly Rental', 'Monthly Rental', 'Corporate Apartments'],
  },
  'Travel': {
    'Bus': ['AC Sleeper', 'Volvo Multi-Axle', 'Non-AC Sleeper', 'AC Seater', 'Electric Bus'],
    'Bus Booking': ['Government Buses', 'Private Buses', 'Sleeper Buses', 'AC Buses', 'Luxury Coaches'],
    'Cab Services': ['Local Taxi', 'Airport Transfer', 'Outstation Cabs', 'Luxury Cars', 'Self-Drive Cars'],
    'Flight Booking': ['Domestic Flights', 'International Flights', 'One-Way Flights', 'Round Trip'],
    'Tour Packages': ['Domestic Tours', 'International Tours', 'Weekend Trips', 'Family Packages'],
    'Car Rental': ['Self Drive Cars', 'Monthly Rental', 'Corporate Rental'],
  },
  'Jobs': {
    'IT': ['Software Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Mobile App Developer', 'UI/UX Designer', 'DevOps Engineer', 'Data Analyst'],
    'Non-IT': ['Admin Executive', 'Office Assistant', 'Data Entry Operator', 'Operations Executive', 'Customer Service Executive', 'Sales Executive', 'HR Executive'],
    'Healthcare': ['Staff Nurse', 'Pharmacist', 'Lab Technician', 'Medical Officer', 'Duty Doctor'],
    'Education': ['School Teacher', 'College Professor', 'Subject Tutor', 'Trainer', 'Curriculum Developer'],
    'Delivery & Field': ['Delivery Executive', 'Warehouse Associate', 'Field Agent', 'Driver'],
  }
};

interface DropdownSelectorProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  isDark: boolean;
  placeholder?: string;
  disabledOptions?: string[];
  getOptionLabel?: (opt: string) => string;
}

function DropdownSelector({
  label,
  value,
  options,
  onSelect,
  isDark,
  placeholder = 'Select option',
  disabledOptions = [],
  getOptionLabel,
}: DropdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayHeaderValue = value ? (getOptionLabel ? getOptionLabel(value) : value) : placeholder;

  return (
    <View style={tw`mb-4.5`}>
      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        style={[
          tw`border rounded-xl px-4 py-3 flex-row items-center justify-between`,
          isDark ? tw`bg-zinc-950 border-zinc-700` : tw`bg-gray-50 border-gray-200`,
        ]}>
        <Text style={[tw`text-sm font-semibold`, value ? (isDark ? tw`text-white` : tw`text-gray-800`) : tw`text-gray-400`]} numberOfLines={1}>
          {displayHeaderValue}
        </Text>
        <ChevronDown size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
          style={[tw`flex-1 justify-center items-center px-6`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[tw`w-full rounded-2xl p-5 max-h-[70%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <Text style={[tw`text-lg font-bold flex-1 mr-3`, isDark ? tw`text-white` : tw`text-gray-900`]}>Select {label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={[tw`w-8 h-8 rounded-full items-center justify-center mt-0.5`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isDisabled = disabledOptions.includes(opt);
                const itemLabel = getOptionLabel ? getOptionLabel(opt) : opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    disabled={isDisabled}
                    onPress={() => {
                      if (!isDisabled) {
                        onSelect(opt);
                        setIsOpen(false);
                      }
                    }}
                    style={[
                      tw`py-3.5 px-4 rounded-xl mb-1.5 flex-row justify-between items-center`,
                      isDisabled
                        ? (isDark ? tw`bg-zinc-950/60 opacity-40` : tw`bg-gray-150/70 opacity-50`)
                        : opt === value
                          ? (isDark ? tw`bg-zinc-850` : tw`bg-indigo-50`)
                          : tw`bg-transparent`
                    ]}>
                    <Text style={[
                      tw`text-sm font-semibold`,
                      isDisabled
                        ? (isDark ? tw`text-zinc-550` : tw`text-gray-400`)
                        : opt === value
                          ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                          : (isDark ? tw`text-zinc-300` : tw`text-gray-700`)
                    ]}>
                      {itemLabel}
                    </Text>
                    {opt === value && !isDisabled && (
                      <View style={[tw`w-2 h-2 rounded-full`, { backgroundColor: '#4F46E5' }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export const formatSalaryToLPA = (val: string): string => {
  if (!val || !val.trim()) return '';
  let s = val.trim().replace(/^₹\s*/, '');
  if (/lpa/i.test(s)) {
    return s.replace(/\s*lpa/i, ' LPA').trim();
  }
  const num = parseFloat(s);
  if (!isNaN(num)) {
    if (num <= 150) {
      return `${num} LPA`;
    }
    const inLacs = num / 100000;
    const cleanLacs = Number.isInteger(inLacs) ? inLacs.toString() : inLacs.toFixed(1);
    return `${cleanLacs} LPA`;
  }
  return s;
};

// In-memory module cache for dynamic category hierarchy (0ms retrieval)
const hierarchyCache: Record<string, Record<string, string[]>> = {};

export default function BusinessScreen({
  items = [],
  currentUser: propUser,
  setItems,
  isDark = false,
  routeParams,
  clearRouteParams,
}: {
  items: BusinessItem[];
  currentUser?: any;
  setItems: React.Dispatch<React.SetStateAction<BusinessItem[]>>;
  isDark?: boolean;
  routeParams?: { category?: CategoryKey; autoOpenModal?: 'business' | 'item' };
  clearRouteParams?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [vendorUser, setVendorUserLocal] = useState<any>(propUser || getVendorUser());
  const currentUser = propUser || vendorUser || getVendorUser();

  useEffect(() => {
    if (propUser) {
      setVendorUserLocal(propUser);
    } else {
      setVendorUserLocal(getVendorUser());
    }
  }, [propUser]);

  const syncVendorUser = (user: any) => {
    setVendorUser(user);
    setVendorUserLocal(user ? { ...user } : null);
  };

  const defaultCategory = (currentUser?.vendorType || 'Products') as CategoryKey;
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(defaultCategory);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  // Dynamic Category Hierarchy state populated from Super Admin & MongoDB Atlas
  const [dynamicHierarchy, setDynamicHierarchy] = useState<Record<string, Record<string, string[]>>>(hierarchyCache);
  const [togglingItemIds, setTogglingItemIds] = useState<Set<string>>(new Set());

  const getHierarchyForCat = (cat?: string | null): Record<string, string[]> => {
    const key = (cat || selectedCategory || activeCategory || 'Products') as CategoryKey;
    if (dynamicHierarchy[key] && Object.keys(dynamicHierarchy[key]).length > 0) {
      return dynamicHierarchy[key];
    }
    if (hierarchyCache[key] && Object.keys(hierarchyCache[key]).length > 0) {
      return hierarchyCache[key];
    }
    return hierarchyMap[key] || hierarchyMap['Products'] || {};
  };

  const loadDynamicHierarchy = async (cat?: string | null) => {
    const target = cat || selectedCategory || activeCategory || 'Products';
    if (hierarchyCache[target] && Object.keys(hierarchyCache[target]).length > 0) {
      setDynamicHierarchy(prev => ({ ...prev, [target]: hierarchyCache[target] }));
      return;
    }
    try {
      const live = await fetchCategoryHierarchy(target);
      if (live && Object.keys(live).length > 0) {
        hierarchyCache[target] = live;
        setDynamicHierarchy(prev => ({ ...prev, [target]: live }));
      }
    } catch (err) {
      console.warn(`[BusinessScreen] Failed to load dynamic category hierarchy for ${target}:`, err);
    }
  };

  useEffect(() => {
    const cat = selectedCategory || activeCategory || 'Products';
    loadDynamicHierarchy(cat);
  }, [selectedCategory, activeCategory]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BusinessItem | null>(null);
  const [modalType, setModalType] = useState<'business' | 'item'>('business');

  // States for new item form
  const [newItemName, setNewItemName] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizPinCode, setBizPinCode] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [newItemDetail, setNewItemDetail] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemOriginalPrice, setNewItemOriginalPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<CategoryKey>(defaultCategory);
  const [newItemSubCategory, setNewItemSubCategory] = useState('');
  const [newItemItemType, setNewItemItemType] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('count');
  const [newItemStock, setNewItemStock] = useState('10');
  const [newItemPinCode, setNewItemPinCode] = useState('');
  const [newItemIsActive, setNewItemIsActive] = useState(true);
  const [newItemFoodType, setNewItemFoodType] = useState<'Veg' | 'Non-Veg'>('Veg');

  // Offer Management State
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [selectedOfferItem, setSelectedOfferItem] = useState<BusinessItem | null>(null);
  const [offerTitle, setOfferTitle] = useState('Special Offer');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerDiscountType, setOfferDiscountType] = useState<'percentage' | 'fixed' | 'promotional'>('percentage');
  const [offerDiscountValue, setOfferDiscountValue] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerStartTime, setOfferStartTime] = useState('09:00');
  const [offerEndTime, setOfferEndTime] = useState('21:00');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  const getOfferBasePrice = (item: BusinessItem | null): number => {
    if (!item) return 0;
    if (item.offer?.originalPrice && item.offer.originalPrice > 0) {
      return item.offer.originalPrice;
    }
    const orig = item.originalPrice ? Number(String(item.originalPrice).replace(/[^\d]/g, '')) : 0;
    if (orig > 0) return orig;
    return Number(String(item.price).replace(/[^\d]/g, '')) || 0;
  };

  const calculateOfferFinalPrice = (
    basePrice: number,
    discountType: 'percentage' | 'fixed' | 'promotional',
    valStr: string
  ): { finalPrice: number; discountAmount: number; isValid: boolean; error?: string } => {
    const val = parseFloat(valStr) || 0;
    if (val <= 0) {
      return { finalPrice: basePrice, discountAmount: 0, isValid: false, error: 'Enter a discount value greater than 0' };
    }

    if (discountType === 'percentage') {
      if (val > 100) {
        return { finalPrice: 0, discountAmount: basePrice, isValid: false, error: 'Percentage discount cannot exceed 100%' };
      }
      const discountAmount = Math.round((basePrice * val) / 100);
      const finalPrice = Math.max(0, basePrice - discountAmount);
      return { finalPrice, discountAmount, isValid: true };
    } else {
      if (val >= basePrice) {
        return { finalPrice: 0, discountAmount: basePrice, isValid: false, error: 'Discount cannot be equal to or greater than base price' };
      }
      const finalPrice = Math.max(0, basePrice - val);
      return { finalPrice, discountAmount: val, isValid: true };
    }
  };
  const [chosenImage, setChosenImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Amenities & Bus Route States
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [boardingPoint, setBoardingPoint] = useState('');
  const [boardingTime, setBoardingTime] = useState('');
  const [additionalBoardingPoints, setAdditionalBoardingPoints] = useState<{ point: string; time: string }[]>([]);
  const [dropPoint, setDropPoint] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [additionalDropPoints, setAdditionalDropPoints] = useState<{ point: string; time: string }[]>([]);
  const [totalDistance, setTotalDistance] = useState('');
  const [busSchedule, setBusSchedule] = useState('');
  const [routeStops, setRouteStops] = useState<{ stopName: string; time: string }[]>([]);
  // Travel Specific States for Customer App Sync
  const [travelOperator, setTravelOperator] = useState('');
  const [travelFromCity, setTravelFromCity] = useState('');
  const [travelToCity, setTravelToCity] = useState('');
  const [travelDuration, setTravelDuration] = useState('');
  const [travelBadge, setTravelBadge] = useState('Top Rated Bus');
  const [vehicleNumber, setVehicleNumber] = useState('');
  // Stay Room & Hotel States
  const [hotelName, setHotelName] = useState('');
  const [stayCity, setStayCity] = useState('');
  const [stayAddress, setStayAddress] = useState('');
  const [roomClass, setRoomClass] = useState('Deluxe Room');
  const [bedType, setBedType] = useState('1 King Bed');
  const [numberOfGuests, setNumberOfGuests] = useState('2 Guests');
  const [roomSize, setRoomSize] = useState('280 sq.ft');
  const [roomView, setRoomView] = useState('City View');
  const [checkInTime, setCheckInTime] = useState('12:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('11:00 AM');
  const [stayStarRating, setStayStarRating] = useState<number>(4);
  const [freeCancellation, setFreeCancellation] = useState(true);
  const [freeBreakfast, setFreeBreakfast] = useState(true);
  const [coupleFriendly, setCoupleFriendly] = useState(true);
  const [payAtHotel, setPayAtHotel] = useState(true);

  // Stay Constants & Quick Presets
  const stayCityPresets = ['Bangalore', 'Ooty', 'Goa', 'Chennai', 'Kodaikanal', 'Mysore', 'Coimbatore', 'Jaipur'];
  const roomClassOptions = ['Standard', 'Deluxe Room', 'Executive Room', 'Luxury Suite', 'Family Room', 'Villa / Cottage'];
  const bedTypeOptions = ['1 King Bed', '1 Queen Bed', '2 Single Beds', 'Double Bed'];
  const roomViewOptions = ['City View', 'Garden View', 'Mountain / Hill View', 'Pool View', 'Sea View'];
  const stayStarOptions = [3, 4, 5];

  const stayAmenityOptions = [
    'Free Wi-Fi',
    'AC',
    'Swimming Pool',
    'Free Breakfast',
    'TV',
    'Geyser / Hot Water',
    'Electric Kettle',
    'Free Parking',
    'Room Service',
    'Power Backup',
    'Elevator / Lift',
    'Housekeeping',
    'Restaurant',
    'Balcony',
    'Gym',
    'Spa',
  ];
  // Job Specific States
  const [jobType, setJobType] = useState('Full-time');
  const [jobLocation, setJobLocation] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [salaryPackage, setSalaryPackage] = useState('');
  const [skillsRequirement, setSkillsRequirement] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [keyResponsibilities, setKeyResponsibilities] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [applicationTips, setApplicationTips] = useState('');
  const [qualificationRequired, setQualificationRequired] = useState('');
  const [linkedProfileUrl, setLinkedProfileUrl] = useState('');
  const [jobContactNumber, setJobContactNumber] = useState('');
  const [jobMailId, setJobMailId] = useState('');
  const [jobVacancies, setJobVacancies] = useState('10');
  const [jobPinCode, setJobPinCode] = useState('');
  const [jobCompanyName, setJobCompanyName] = useState('');
  const [jobCompanyWebsite, setJobCompanyWebsite] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // Additional Boarding Points Handlers
  const handleAddBoardingPoint = () => {
    setAdditionalBoardingPoints(prev => [...prev, { point: '', time: '' }]);
  };

  const handleUpdateBoardingPoint = (index: number, field: 'point' | 'time', val: string) => {
    setAdditionalBoardingPoints(prev => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleRemoveBoardingPoint = (index: number) => {
    setAdditionalBoardingPoints(prev => prev.filter((_, i) => i !== index));
  };

  // Additional Drop Points Handlers
  const handleAddDropPoint = () => {
    setAdditionalDropPoints(prev => [...prev, { point: '', time: '' }]);
  };

  const handleUpdateDropPoint = (index: number, field: 'point' | 'time', val: string) => {
    setAdditionalDropPoints(prev => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleRemoveDropPoint = (index: number) => {
    setAdditionalDropPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddStop = () => {
    setRouteStops(prev => [...prev, { stopName: '', time: '' }]);
  };

  const handleUpdateStop = (index: number, field: 'stopName' | 'time', val: string) => {
    setRouteStops(prev => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleRemoveStop = (index: number) => {
    setRouteStops(prev => prev.filter((_, i) => i !== index));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeBizId, setActiveBizId] = useState<string | null>(getActiveBusinessId());
  const [businessViewTab, setBusinessViewTab] = useState<'overview' | 'items'>('overview');

  const businesses = currentUser?.businesses || [];

  const handleSelectBusiness = (biz: any) => {
    const bizId = biz._id || biz.id;
    setActiveBusinessId(bizId);
    setActiveBizId(bizId);
    const cat = normalizeCategory(biz.vendorType || biz.category || biz.baseVendorType);
    setSelectedCategory(cat);
    setActiveCategory(cat);
    setBusinessViewTab('overview');
  };

  useEffect(() => {
    let isMounted = true;
    const loadItems = async () => {
      if (!items || items.length === 0) {
        setLoading(true);
      }
      try {
        const profRes = await fetchProfile();
        if (profRes && profRes.user && isMounted) {
          syncVendorUser(profRes.user);
        }
        const fetched = await fetchAllBusinessesProducts();
        if (isMounted && Array.isArray(fetched)) {
          setItems(fetched);
          const vendorId = currentUser?._id || currentUser?.id || 'default';
          sessionManager.saveVendorCache(vendorId, 'catalog_items', fetched);
        }
      } catch (err: any) {
        console.warn("Failed to load catalog items:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadItems();
    return () => {
      isMounted = false;
    };
  }, [activeBizId]);

  // Local BackHandler for BusinessScreen: dismiss overlays/modals and navigate between tabs
  useEffect(() => {
    const onBackPress = () => {
      if (isUploadModalVisible) {
        setIsUploadModalVisible(false);
        return true;
      }
      if (isOfferModalVisible) {
        setIsOfferModalVisible(false);
        return true;
      }
      if (isAddModalVisible) {
        handleCloseModal();
        return true;
      }
      if (businessViewTab === 'items') {
        setBusinessViewTab('overview');
        return true;
      }
      return false; // Let parent App.tsx handle history popping
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [isUploadModalVisible, isOfferModalVisible, isAddModalVisible, businessViewTab]);

  useEffect(() => {
    if (routeParams) {
      if (routeParams.category) {
        setActiveCategory(routeParams.category);
        setSelectedCategory(routeParams.category);

        // Auto-switch active business if the user has a business registered under this category
        const matchingBiz = currentUser?.businesses?.find((b: any) => 
          normalizeCategory(b.vendorType || b.category || b.baseVendorType) === routeParams.category
        );
        if (matchingBiz && (matchingBiz._id || matchingBiz.id) !== getActiveBusinessId()) {
          const bId = matchingBiz._id || matchingBiz.id;
          setActiveBusinessId(bId);
          setActiveBizId(bId);
        }
      }
      if (routeParams.autoOpenModal === 'item') {
        // Open add item modal
        setModalType('item');
        const targetCat = (routeParams.category || selectedCategory || 'Products') as CategoryKey;
        setNewItemCategory(targetCat);
        loadDynamicHierarchy(targetCat);
        const catHierarchy = getHierarchyForCat(targetCat);
        const subCategories = Object.keys(catHierarchy);
        if (subCategories && subCategories.length > 0) {
          const defaultSub = subCategories[0];
          setNewItemSubCategory(defaultSub);
          const types = catHierarchy[defaultSub] || [];
          setNewItemItemType(types && types.length > 0 ? types[0] : '');
        } else {
          setNewItemSubCategory('');
          setNewItemItemType('');
        }
        setIsAddModalVisible(true);
      } else if (routeParams.autoOpenModal === 'business') {
        // Open add business modal
        setModalType('business');
        const targetCat = (routeParams.category || selectedCategory || 'Products') as CategoryKey;
        setNewItemCategory(targetCat);
        loadDynamicHierarchy(targetCat);
        const catHierarchy = getHierarchyForCat(targetCat);
        const subCategories = Object.keys(catHierarchy);
        if (subCategories && subCategories.length > 0) {
          const defaultSub = subCategories[0];
          setNewItemSubCategory(defaultSub);
          const types = catHierarchy[defaultSub] || [];
          setNewItemItemType(types && types.length > 0 ? types[0] : '');
        } else {
          setNewItemSubCategory('');
          setNewItemItemType('');
        }
        setIsAddModalVisible(true);
      }
      if (clearRouteParams) {
        clearRouteParams();
      }
    }
  }, [routeParams]);

  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  const isJobItem = (i: BusinessItem) =>
    i.category === 'Jobs' ||
    (i as any).mainCategory === 'Jobs' ||
    Boolean(i.jobType) ||
    Boolean(i.salaryPackage) ||
    Boolean(i.vacancies);

  const categories = categoriesConfig.map(cat => ({
    ...cat,
    count: safeItems.filter(i => {
      if (!i) return false;
      if (cat.key === 'Jobs') return isJobItem(i);
      const iCat = normalizeCategory(i.category || (i as any).mainCategory || '');
      return iCat === cat.key && !isJobItem(i);
    }).length,
  }));

  const filteredItems = safeItems
    .filter(i => {
      if (!i) return false;

      // 1. Scoped to the active business outlet if one is selected
      if (activeBizId) {
        const itemBizId = (i.businessId || i.vendorId || '').toString();
        if (itemBizId) {
          if (itemBizId !== String(activeBizId)) return false;
        } else {
          // Fallback if item has no businessId/vendorId: match category
          const iCat = normalizeCategory(i.category || (i as any).mainCategory || '');
          if (activeCategory === 'Jobs') {
            if (!isJobItem(i)) return false;
          } else {
            if (iCat !== activeCategory || isJobItem(i)) return false;
          }
        }
      } else {
        // Fallback if no specific business selected: match active category
        if (activeCategory === 'Jobs') {
          if (!isJobItem(i)) return false;
        } else {
          const iCat = normalizeCategory(i.category || (i as any).mainCategory || '');
          if (iCat !== activeCategory || isJobItem(i)) return false;
        }
      }

      return true;
    })
    .filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = String(i.name || '').toLowerCase();
      const detail = String(i.detail || '').toLowerCase();
      const subCat = String(i.subCategory || '').toLowerCase();
      const itType = String(i.itemType || '').toLowerCase();
      return (
        name.includes(q) ||
        detail.includes(q) ||
        subCat.includes(q) ||
        itType.includes(q)
      );
    });

  const openOfferModal = (item: BusinessItem) => {
    setSelectedOfferItem(item);
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    if (item.offer && item.offer.isActive) {
      setOfferTitle(item.offer.title || 'Special Offer');
      setOfferDescription(item.offer.description || '');
      setOfferDiscountType(item.offer.discountType || 'percentage');
      setOfferDiscountValue(String(item.offer.discountValue || ''));
      setOfferStartDate(item.offer.startDate || todayStr);
      setOfferEndDate(item.offer.endDate || nextWeek);
      setOfferStartTime(item.offer.startTime || '09:00');
      setOfferEndTime(item.offer.endTime || '21:00');
    } else {
      setOfferTitle('Special Offer');
      setOfferDescription('');
      setOfferDiscountType('percentage');
      setOfferDiscountValue('');
      setOfferStartDate(todayStr);
      setOfferEndDate(nextWeek);
      setOfferStartTime('09:00');
      setOfferEndTime('21:00');
    }
    setIsOfferModalVisible(true);
  };

  const handleSaveOffer = async () => {
    if (!selectedOfferItem) return;
    const title = offerTitle.trim();
    if (!title) {
      Alert.alert('Required Field', 'Please enter an Offer Title (e.g. Special Offer, Diwali Mega Sale).');
      return;
    }

    const basePrice = getOfferBasePrice(selectedOfferItem);
    const { finalPrice, isValid, error } = calculateOfferFinalPrice(
      basePrice,
      offerDiscountType,
      offerDiscountValue
    );

    if (!isValid) {
      Alert.alert('Invalid Discount', error || 'Please enter a valid discount amount.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (offerStartDate && offerStartDate < todayStr) {
      Alert.alert('Invalid Date', 'Offer start date cannot be in the past.');
      return;
    }
    if (offerEndDate && offerEndDate < (offerStartDate || todayStr)) {
      Alert.alert('Invalid Date', 'Offer end date cannot be earlier than start date.');
      return;
    }

    setOfferSubmitting(true);
    try {
      const offerPayload = {
        title,
        description: offerDescription.trim(),
        discountType: offerDiscountType,
        discountValue: parseFloat(offerDiscountValue),
        originalPrice: basePrice,
        offerPrice: finalPrice,
        startDate: offerStartDate || todayStr,
        endDate: offerEndDate || todayStr,
        startTime: offerStartTime || '09:00',
        endTime: offerEndTime || '21:00',
        isActive: true,
      };

      const updated = await applyListingOffer(selectedOfferItem.id, selectedOfferItem, offerPayload);
      setItems(prev => prev.map(i => i.id === selectedOfferItem.id ? updated : i));
      setIsOfferModalVisible(false);
      Alert.alert('Offer Applied', `Offer "${title}" applied successfully! Discounted price is ₹${finalPrice}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to apply offer.');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleRemoveOffer = async () => {
    if (!selectedOfferItem) return;
    Alert.alert(
      'Remove Offer',
      'Are you sure you want to remove this offer and restore the original price?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setOfferSubmitting(true);
            try {
              const updated = await removeListingOffer(selectedOfferItem.id, selectedOfferItem);
              setItems(prev => prev.map(i => i.id === selectedOfferItem.id ? updated : i));
              setIsOfferModalVisible(false);
              Alert.alert('Offer Removed', 'Promotional offer removed and original price restored.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove offer.');
            } finally {
              setOfferSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const toggleItem = async (id: string) => {
    if (togglingItemIds.has(id)) return;
    setTogglingItemIds(prev => new Set(prev).add(id));
    const item = items.find(i => i.id === id);
    if (!item) {
      setTogglingItemIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    try {
      const updatedItem = { ...item, isActive: !item.isActive };
      await updateProduct(id, updatedItem);
      setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update item status.');
    } finally {
      setTogglingItemIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCategoryChange = (newCat: CategoryKey) => {
    setNewItemCategory(newCat);
    loadDynamicHierarchy(newCat);
    const catHierarchy = getHierarchyForCat(newCat);
    const subCategories = Object.keys(catHierarchy);
    if (subCategories && subCategories.length > 0) {
      const defaultSub = subCategories[0];
      setNewItemSubCategory(defaultSub);
      const types = catHierarchy[defaultSub] || [];
      if (types && types.length > 0) {
        setNewItemItemType(types[0]);
      } else {
        setNewItemItemType('');
      }
    } else {
      setNewItemSubCategory('');
      setNewItemItemType('');
    }
  };

  const handleSubCategoryChange = (newSub: string) => {
    setNewItemSubCategory(newSub);
    const catHierarchy = getHierarchyForCat(newItemCategory);
    const types = catHierarchy[newSub] || [];
    if (types && types.length > 0) {
      setNewItemItemType(types[0]);
    } else {
      setNewItemItemType('');
    }
  };

  const resetAllItemFormStates = () => {
    setNewItemName('');
    setBizAddress('');
    setBizPinCode('');
    setBizPhone('');
    setNewItemDetail('');
    setNewItemPrice('');
    setNewItemOriginalPrice('');
    setNewItemSubCategory('');
    setNewItemItemType('');
    setNewItemUnit('count');
    setNewItemStock('10');
    setNewItemPinCode('');
    setNewItemIsActive(true);
    setNewItemFoodType('Veg');
    setChosenImage(null);
    setUploadedImageUrl(null);
    setIsEditing(false);
    setEditingItemId(null);
    setEditingItem(null);
    setSelectedAmenities([]);
    setHotelName('');
    setStayCity('');
    setStayAddress('');
    setRoomClass('Deluxe Room');
    setBedType('1 King Bed');
    setNumberOfGuests('2 Guests');
    setRoomSize('280 sq.ft');
    setRoomView('City View');
    setCheckInTime('12:00 PM');
    setCheckOutTime('11:00 AM');
    setStayStarRating(4);
    setFreeCancellation(true);
    setFreeBreakfast(true);
    setCoupleFriendly(true);
    setPayAtHotel(true);
    setBoardingPoint('');
    setBoardingTime('');
    setAdditionalBoardingPoints([]);
    setDropPoint('');
    setArrivalTime('');
    setAdditionalDropPoints([]);
    setTotalDistance('');
    setBusSchedule('');
    setRouteStops([]);
    // Reset Travel Specific states
    setTravelOperator('');
    setTravelFromCity('');
    setTravelToCity('');
    setTravelDuration('');
    setTravelBadge('Top Rated Bus');
    setVehicleNumber('');
    // Reset Job-specific states
    setJobType('Full-time');
    setJobLocation('');
    setExperienceRequired('');
    setSalaryPackage('');
    setSkillsRequirement('');
    setJobDescription('');
    setKeyResponsibilities('');
    setDeadlineDate('');
    setApplicationTips('');
    setQualificationRequired('');
    setLinkedProfileUrl('');
    setJobCompanyName('');
    setJobCompanyWebsite('');
    setJobContactNumber('');
    setJobMailId('');
    setJobVacancies('10');
    setJobPinCode('');
    setIsDatePickerVisible(false);
  };

  const handleAddItem = async () => {
    if (loading) return;
    if (!newItemName.trim()) {
      Alert.alert('Required', modalType === 'business' ? 'Please enter a business name' : `Please enter a ${getCategoryUnitLabel(newItemCategory).toLowerCase()} name`);
      return;
    }
    setLoading(true);
    try {
      if (modalType === 'business') {
        const businessNameInput = newItemName.trim();
        const cleanPhone = bizPhone.replace(/[^0-9]/g, '');

        if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
          Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
          setLoading(false);
          return;
        }

        // Prevent duplicate business for same category or name
        const existingCategoryBiz = currentUser?.businesses?.find(
          (b: any) => b.vendorType === newItemCategory
        );
        const existingNameBiz = currentUser?.businesses?.find(
          (b: any) => businessNameInput && b.businessName?.toLowerCase() === businessNameInput.toLowerCase()
        );

        if (existingCategoryBiz) {
          Alert.alert(
            'Business Already Exists',
            `You have already added a business under the "${newItemCategory}" category (${existingCategoryBiz.businessName || 'Existing Business'}). You cannot add duplicate businesses for the same category.`
          );
          setLoading(false);
          return;
        }

        if (existingNameBiz) {
          Alert.alert(
            'Business Already Exists',
            `A business with the name "${existingNameBiz.businessName}" already exists in your account.`
          );
          setLoading(false);
          return;
        }

        const payload = {
          businessName: businessNameInput || newItemCategory,
          vendorType: newItemCategory,
          category: newItemCategory,
          subcategory: newItemSubCategory || 'General',
        };

        let updatedUser = getVendorUser() || { businesses: [] };
        let newId = 'biz_' + Date.now();
        let apiSuccess = false;

        try {
          const res = await createBusiness(payload);
          if (res && res.success) {
            apiSuccess = true;
            updatedUser = res.user || getVendorUser();
            newId = res.newBusinessId || (updatedUser.businesses && updatedUser.businesses[updatedUser.businesses.length - 1]?._id) || newId;
          }
        } catch (apiErr) {
          // Backend API unreachable / offline mode fallback
        }

        // Newly added business outlet requires Sub Admin approval
        const newBiz = {
          _id: newId,
          businessName: payload.businessName,
          vendorType: payload.vendorType,
          category: payload.category,
          subcategory: payload.subcategory,
          status: 'Pending Pincode Admin Review',
          approvalStatus: 'Pending',
          isApproved: false,
          isActive: false,
          logo: '',
        };
        if (!updatedUser.businesses) updatedUser.businesses = [];

        const existingIdx = updatedUser.businesses.findIndex((b: any) => (b._id || b.id) === newId || (b.businessName === payload.businessName && b.vendorType === payload.vendorType));
        if (existingIdx === -1) {
          updatedUser.businesses.push(newBiz);
        } else {
          updatedUser.businesses[existingIdx] = { ...updatedUser.businesses[existingIdx], ...newBiz };
        }

        syncVendorUser(updatedUser);
        setSelectedCategory(null);

        Alert.alert(
          'Business Outlet Request Submitted',
          `Your application to add "${payload.businessName}" (${payload.vendorType}) has been submitted for Sub Admin review.\n\nOnce approved and verified, this outlet will be activated for managing catalog items and receiving orders.`
        );
      } else {
        if (isUploading) {
          Alert.alert('Uploading Photo', 'Please wait while the photo finishes uploading...');
          return;
        }

        const isJob = newItemCategory === 'Jobs';

        // Future date validation for jobs (Issue 10 fix: robust date comparison avoiding ASCII string ordering bug)
        if (isJob && deadlineDate && deadlineDate.trim()) {
          const cleanDeadline = deadlineDate.trim();
          let deadlineTs: number = NaN;
          if (cleanDeadline.includes('/')) {
            const parts = cleanDeadline.split('/').map(Number);
            if (parts.length === 3) {
              // Format MM/DD/YYYY
              deadlineTs = new Date(parts[2], parts[0] - 1, parts[1], 23, 59, 59, 999).getTime();
            }
          } else if (cleanDeadline.includes('-')) {
            const parts = cleanDeadline.split('-').map(Number);
            if (parts.length === 3) {
              if (parts[0] > 1000) {
                // YYYY-MM-DD
                deadlineTs = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
              } else {
                // DD-MM-YYYY
                deadlineTs = new Date(parts[2], parts[1] - 1, parts[0], 23, 59, 59, 999).getTime();
              }
            }
          } else {
            deadlineTs = new Date(cleanDeadline).getTime();
          }

          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
          if (!isNaN(deadlineTs) && deadlineTs < todayStart) {
            Alert.alert('Invalid Deadline Date', 'Job application deadline cannot be in the past.');
            setLoading(false);
            return;
          }
        }

        const formattedSalary = isJob ? formatSalaryToLPA(salaryPackage) : '';
        const finalPrice = isJob
          ? (formattedSalary ? (formattedSalary.startsWith('₹') ? formattedSalary : `₹${formattedSalary}`) : (newItemPrice.startsWith('₹') ? newItemPrice : `₹${newItemPrice || '0'}`))
          : (newItemPrice.startsWith('₹') ? newItemPrice : `₹${newItemPrice || '0'}`);
        const finalDetail = isJob
          ? (jobDescription.trim() || newItemDetail.trim() || '')
          : (newItemDetail.trim() || '');
        const finalPinCode = isJob ? (jobPinCode.trim() || newItemPinCode.trim() || '') : (newItemPinCode.trim() || '');
        const finalStock = isJob ? (jobVacancies.trim() || newItemStock.trim() || '0') : (newItemStock.trim() || '0');
        const finalOriginalPrice = newItemOriginalPrice.trim()
          ? (newItemOriginalPrice.startsWith('₹') ? newItemOriginalPrice : `₹${newItemOriginalPrice}`)
          : undefined;

        let imageToSave = uploadedImageUrl || chosenImage;
        if (imageToSave && (imageToSave.startsWith('file://') || imageToSave.startsWith('content://'))) {
          imageToSave = uploadedImageUrl || '';
        }

        const currentEditingItem = editingItem || items.find(i => i.id === editingItemId);

        const itemPayload: Partial<BusinessItem> = {
          name: newItemName.trim(),
          detail: finalDetail,
          price: finalPrice,
          originalPrice: isJob ? undefined : finalOriginalPrice,
          isActive: newItemIsActive,
          category: newItemCategory,
          image: isJob ? '' : (imageToSave || ''),
          subCategory: newItemSubCategory || 'General',
          itemType: newItemItemType || '',
          foodType: newItemCategory === 'Food' ? newItemFoodType : undefined,
          unit: newItemUnit.trim() || 'count',
          stock: finalStock,
          pinCode: finalPinCode,
          // Category-specific fields
          selectedAmenities,
          amenities: selectedAmenities,
          roomClass,
          numberOfGuests,
          // Stay specific fields for Customer App sync
          hotelName: newItemCategory === 'Stay' ? (hotelName.trim() || currentUser?.businessName || newItemName.trim()) : undefined,
          stayCity: newItemCategory === 'Stay' ? (stayCity.trim() || '') : undefined,
          locationCity: newItemCategory === 'Stay' ? (stayCity.trim() || '') : undefined,
          stayAddress: newItemCategory === 'Stay' ? (stayAddress.trim() || stayCity.trim() || '') : undefined,
          location: newItemCategory === 'Stay' ? (stayAddress.trim() || stayCity.trim() || '') : undefined,
          bedType: newItemCategory === 'Stay' ? bedType : undefined,
          roomSize: newItemCategory === 'Stay' ? roomSize : undefined,
          roomView: newItemCategory === 'Stay' ? roomView : undefined,
          checkInTime: newItemCategory === 'Stay' ? checkInTime : undefined,
          checkOutTime: newItemCategory === 'Stay' ? checkOutTime : undefined,
          starRating: newItemCategory === 'Stay' ? stayStarRating : undefined,
          propertyType: newItemCategory === 'Stay' ? (newItemSubCategory.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').trim() || 'Hotels') : undefined,
          childCategory: newItemItemType || '',
          freeCancellation: newItemCategory === 'Stay' ? freeCancellation : undefined,
          freeBreakfast: newItemCategory === 'Stay' ? freeBreakfast : undefined,
          coupleFriendly: newItemCategory === 'Stay' ? coupleFriendly : undefined,
          payAtHotel: newItemCategory === 'Stay' ? payAtHotel : undefined,
          deliveryTime: newItemCategory === 'Stay' ? (freeCancellation ? 'Free cancellation' : 'Standard cancellation') : undefined,
          boardingPoint,
          boardingTime,
          additionalBoardingPoints,
          boardingPoints: [
            boardingPoint ? `${boardingPoint}${boardingTime ? ` (${boardingTime})` : ''}` : '',
            ...additionalBoardingPoints.map(b => b.point ? `${b.point}${b.time ? ` (${b.time})` : ''}` : '')
          ].filter(Boolean),
          dropPoint,
          arrivalTime,
          additionalDropPoints,
          dropPoints: [
            dropPoint ? `${dropPoint}${arrivalTime ? ` (${arrivalTime})` : ''}` : '',
            ...additionalDropPoints.map(d => d.point ? `${d.point}${d.time ? ` (${d.time})` : ''}` : '')
          ].filter(Boolean),
          droppingPoints: [
            dropPoint ? `${dropPoint}${arrivalTime ? ` (${arrivalTime})` : ''}` : '',
            ...additionalDropPoints.map(d => d.point ? `${d.point}${d.time ? ` (${d.time})` : ''}` : '')
          ].filter(Boolean),
          totalDistance,
          busSchedule: busSchedule || travelDuration,
          routeStops,
          // Travel specific fields for Customer App sync
          operator: travelOperator.trim() || currentUser?.businessName || currentUser?.name || 'Verified Travels',
          operatorName: travelOperator.trim() || currentUser?.businessName || currentUser?.name || 'Verified Travels',
          from: travelFromCity.trim() || (boardingPoint ? boardingPoint.split('(')[0]?.trim() : 'Bangalore'),
          to: travelToCity.trim() || (dropPoint ? dropPoint.split('(')[0]?.trim() : 'Chennai'),
          origin: travelFromCity.trim() || (boardingPoint ? boardingPoint.split('(')[0]?.trim() : 'Bangalore'),
          destination: travelToCity.trim() || (dropPoint ? dropPoint.split('(')[0]?.trim() : 'Chennai'),
          departureTime: boardingTime.trim() || '21:30',
          duration: travelDuration.trim() || busSchedule.trim() || '8h 00m',
          badge: travelBadge || 'Top Rated Bus',
          seatsLeft: finalStock ? Number(finalStock) : 12,
          vehicleNumber: newItemCategory === 'Travel' ? vehicleNumber.trim() : undefined,
          vehicleRegNo: newItemCategory === 'Travel' ? vehicleNumber.trim() : undefined,
          busNumber: newItemCategory === 'Travel' ? vehicleNumber.trim() : undefined,
          // Job-specific fields
          jobType: isJob ? (jobType || 'Full-time') : undefined,
          jobLocation: isJob ? (jobLocation.trim() || 'Bangalore / Remote') : undefined,
          experienceRequired: isJob ? (experienceRequired.trim() || '2-5 Years / Fresher') : undefined,
          salaryPackage: isJob ? (formattedSalary || '5.5 LPA') : undefined,
          skillsRequirement: isJob ? (skillsRequirement.trim() || 'React, Node.js, JavaScript') : undefined,
          jobDescription: isJob ? finalDetail : undefined,
          keyResponsibilities: isJob ? (keyResponsibilities.trim() || undefined) : undefined,
          deadlineDate: isJob ? deadlineDate.trim() : undefined,
          applicationTips: isJob ? applicationTips.trim() : undefined,
          qualificationRequired: isJob ? qualificationRequired.trim() : undefined,
          linkedProfileUrl: isJob ? linkedProfileUrl.trim() : undefined,
          companyName: isJob ? jobCompanyName.trim() : undefined,
          companyWebsite: isJob ? jobCompanyWebsite.trim() : undefined,
          contactNumber: isJob ? jobContactNumber.trim() : undefined,
          mailId: isJob ? jobMailId.trim() : undefined,
          vacancies: isJob ? finalStock : undefined,
          jobID: isJob ? (currentEditingItem?.jobID || (editingItemId ? `JOB-${String(editingItemId).slice(-6)}` : '')) : undefined,
        };

        if (isEditing && editingItemId) {
          try {
            const updatedItem = await updateProduct(editingItemId, itemPayload);
            const finalImage = isJob ? '' : (chosenImage || updatedItem.image);
            setItems(prev => prev.map(i => i.id === editingItemId ? { ...itemPayload, ...updatedItem, image: finalImage } : i));
            Alert.alert('Success', isJob ? 'Job updated successfully!' : 'Item updated successfully!');
          } catch (apiErr: any) {
            console.error('Backend updateProduct error:', apiErr);
            const errMsg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to update item on server.';
            Alert.alert('Update Failed', errMsg);
            setLoading(false);
            return;
          }
        } else {
          try {
            const savedItem = await createProduct(itemPayload);
            const finalImage = isJob ? '' : (chosenImage || savedItem.image);
            setItems(prev => [...prev, { ...savedItem, image: finalImage, jobID: itemPayload.jobID || savedItem.jobID }]);
            Alert.alert('Success', isJob ? 'Job created successfully!' : 'Item saved successfully!');
          } catch (apiErr: any) {
            console.error('Backend createProduct error:', apiErr);
            const errMsg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to save item on server.';
            Alert.alert('Submission Failed', errMsg);
            setLoading(false);
            return;
          }
        }
      }

      // Reset all form states
      resetAllItemFormStates();
      setIsAddModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add business or item.');
    } finally {
      setLoading(false);
    }
  };

  const openAddBusinessModal = () => {
    setModalType('business');
    setNewItemName('');
    setBizAddress('');
    setBizPinCode('');
    setBizPhone('');
    const registered = (currentUser?.businesses || []).map((b: any) => 
      normalizeCategory(b?.vendorType || b?.category || b?.baseVendorType)
    );
    const availableCat = categoriesConfig.find(c => !registered.includes(c.key))?.key || selectedCategory || 'Products';
    setNewItemCategory(availableCat);
    loadDynamicHierarchy(availableCat);
    const catHierarchy = getHierarchyForCat(availableCat);
    const subCategories = Object.keys(catHierarchy);
    if (subCategories && subCategories.length > 0) {
      const defaultSub = subCategories[0];
      setNewItemSubCategory(defaultSub);
      const types = catHierarchy[defaultSub];
      setNewItemItemType(types && types.length > 0 ? types[0] : '');
    } else {
      setNewItemSubCategory('');
      setNewItemItemType('');
    }
    setIsAddModalVisible(true);
  };

  const openEditBusinessModal = (biz: any) => {
    setModalType('business');
    setIsEditing(true);
    setEditingItemId(biz._id);
    setNewItemName(biz.businessName || '');
    setNewItemCategory(biz.vendorType as CategoryKey);
    loadDynamicHierarchy(biz.vendorType);
    setBizAddress(biz.address || '');
    setBizPinCode(biz.pinCode || '');
    setBizPhone(biz.phone || '');
    setIsAddModalVisible(true);
  };

  const openAddItemModal = () => {
    const currentBiz = (activeBizId ? businesses.find((b: any) => (b._id || b.id) === activeBizId) : null) || businesses.find((b: any) => normalizeCategory(b.vendorType || b.category || b.baseVendorType) === selectedCategory) || businesses[0];
    const bStat = String(currentBiz?.status || '').toLowerCase().trim();
    const bApp = String(currentBiz?.approvalStatus || '').toLowerCase().trim();
    const isPending = currentBiz?.isApproved === false ||
      ['pending', 'pending approval', 'pending_approval', 'pending pincode admin review', 'under_verification', 'suspended', 'rejected'].includes(bStat) ||
      ['pending', 'pending approval', 'under_verification', 'rejected'].includes(bApp) ||
      currentBiz?.isActive === false;
    if (isPending) {
      Alert.alert(
        'Outlet Pending Review',
        'This business outlet is currently awaiting Admin approval or is suspended. Adding items will be available once the outlet is approved.'
      );
      return;
    }
    resetAllItemFormStates();
    setModalType('item');
    const defaultCat = selectedCategory || 'Products';
    setNewItemCategory(defaultCat);
    loadDynamicHierarchy(defaultCat);
    const catHierarchy = getHierarchyForCat(defaultCat);
    const subCategories = Object.keys(catHierarchy);
    if (subCategories && subCategories.length > 0) {
      const defaultSub = subCategories[0];
      setNewItemSubCategory(defaultSub);
      const types = catHierarchy[defaultSub];
      setNewItemItemType(types && types.length > 0 ? types[0] : '');
    } else {
      setNewItemSubCategory('');
      setNewItemItemType('');
    }
    setIsAddModalVisible(true);
  };

  const openEditItemModal = (item: BusinessItem) => {
    setModalType('item');
    setIsEditing(true);
    setEditingItem(item);
    setEditingItemId(item.id);

    setNewItemName(item.name || '');
    setNewItemDetail(item.detail || '');
    setNewItemPrice(item.price ? String(item.price).replace(/[^\d]/g, '') : '');
    setNewItemOriginalPrice(item.originalPrice ? String(item.originalPrice).replace(/[^\d]/g, '') : '');

    setNewItemCategory(item.category);
    setNewItemSubCategory(item.subCategory || 'General');
    setNewItemItemType(item.itemType || '');
    setNewItemUnit(item.unit || 'count');
    setNewItemStock(item.stock || '10');
    setNewItemPinCode(item.pinCode || '');
    setNewItemIsActive(item.isActive);
    setNewItemFoodType((item.foodType === 'Non-Veg' || item.itemType === 'Non-Veg') ? 'Non-Veg' : 'Veg');
    setChosenImage(item.image || null);
    setUploadedImageUrl(item.image || null);

    // Populate category-specific fields
    setSelectedAmenities(item.selectedAmenities || item.amenities || []);
    setHotelName(item.hotelName || item.businessName || '');
    setStayCity(item.stayCity || item.locationCity || item.city || '');
    setStayAddress(item.stayAddress || item.location || '');
    setRoomClass(item.roomClass || 'Deluxe Room');
    setBedType(item.bedType || '1 King Bed');
    setNumberOfGuests(item.numberOfGuests || item.guestCapacity || '2 Guests');
    setRoomSize(item.roomSize || '280 sq.ft');
    setRoomView(item.roomView || 'City View');
    setCheckInTime(item.checkInTime || '12:00 PM');
    setCheckOutTime(item.checkOutTime || '11:00 AM');
    setStayStarRating(item.starRating || 4);
    setFreeCancellation(item.freeCancellation !== undefined ? item.freeCancellation : true);
    setFreeBreakfast(item.freeBreakfast !== undefined ? item.freeBreakfast : (item.amenities?.includes('Free Breakfast') || false));
    setCoupleFriendly(item.coupleFriendly !== undefined ? item.coupleFriendly : true);
    setPayAtHotel(item.payAtHotel !== undefined ? item.payAtHotel : true);
    setBoardingPoint(item.boardingPoint || (item.boardingPoints && item.boardingPoints[0]) || '');
    setBoardingTime(item.boardingTime || '');
    setAdditionalBoardingPoints(
      item.additionalBoardingPoints ||
      (item.boardingPoints && item.boardingPoints.length > 1
        ? item.boardingPoints.slice(1).map((p: any) => typeof p === 'string' ? { point: p, time: '' } : p)
        : [])
    );
    setDropPoint(item.dropPoint || (item.dropPoints && item.dropPoints[0]) || (item.droppingPoints && item.droppingPoints[0]) || '');
    setArrivalTime(item.arrivalTime || '');
    setAdditionalDropPoints(
      item.additionalDropPoints ||
      (item.dropPoints && item.dropPoints.length > 1
        ? item.dropPoints.slice(1).map((p: any) => typeof p === 'string' ? { point: p, time: '' } : p)
        : item.droppingPoints && item.droppingPoints.length > 1
        ? item.droppingPoints.slice(1).map((p: any) => typeof p === 'string' ? { point: p, time: '' } : p)
        : [])
    );
    setTotalDistance(item.totalDistance || '');
    setBusSchedule(item.busSchedule || '');
    setRouteStops(item.routeStops || []);
    // Populate Travel-specific fields
    setTravelOperator(item.operator || item.operatorName || '');
    setTravelFromCity(item.from || item.origin || (item.boardingPoint ? item.boardingPoint.split('(')[0]?.trim() : ''));
    setTravelToCity(item.to || item.destination || (item.dropPoint ? item.dropPoint.split('(')[0]?.trim() : ''));
    setTravelDuration(item.duration || item.busSchedule || '');
    setTravelBadge(item.badge || 'Top Rated Bus');
    setVehicleNumber(item.vehicleNumber || item.vehicleRegNo || item.busNumber || '');

    // Populate Job-specific fields
    if (item.category === 'Jobs') {
      setJobType(item.jobType || 'Full-time');
      setJobLocation(item.jobLocation || '');
      setExperienceRequired(item.experienceRequired || item.experienceLevel || '');
      const rawSalary = item.salaryPackage || (item.price ? item.price.replace(/^₹\s*/, '') : '');
      setSalaryPackage(rawSalary || '5.5 LPA');
      setSkillsRequirement(item.skillsRequirement || '');
      setJobDescription(item.jobDescription || item.detail || '');
      setKeyResponsibilities(item.keyResponsibilities || (item as any).responsibilities || '');
      setDeadlineDate(item.deadlineDate || '');
      setApplicationTips(item.applicationTips || '');
      setQualificationRequired(item.qualificationRequired || item.qualification || '');
      setLinkedProfileUrl(item.linkedProfileUrl || '');
      setJobCompanyName(item.companyName || (item as any).brand || (item as any).vendorName || '');
      setJobCompanyWebsite(item.companyWebsite || '');
      setJobContactNumber(item.contactNumber || '');
      setJobMailId(item.mailId || '');
      setJobVacancies(item.vacancies || item.stock || '10');
      setJobPinCode(item.pinCode || '');
    }

    setIsAddModalVisible(true);
  };

  const handleCloseModal = () => {
    resetAllItemFormStates();
    setIsAddModalVisible(false);
  };

  const handleDeleteBusiness = async (bizId: string, bizName: string) => {
    Alert.alert(
      'Delete Business',
      `Are you sure you want to delete "${bizName}"? All associated data under this business will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const user = getVendorUser() || {};
              const currentBusinesses = user.businesses || [];
              const updatedBusinesses = currentBusinesses.filter((b: any) => b._id !== bizId && b.businessName !== bizName);

              const updatedUser = {
                ...user,
                businesses: updatedBusinesses,
              };

              if (getActiveBusinessId() === bizId) {
                const nextBizId = updatedBusinesses.length > 0 ? updatedBusinesses[0]._id : null;
                setActiveBusinessId(nextBizId);
                setActiveBizId(nextBizId);
              }

              syncVendorUser(updatedUser);

              try {
                await updateProfile({ businesses: updatedBusinesses });
              } catch (err) {
                console.warn('Backend updateProfile error on delete business:', err);
              }

              Alert.alert('Success', `Business "${bizName}" deleted successfully!`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete business.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteItem = async (id: string) => {
    if (loading) return;
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this catalog item permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              try {
                await deleteProduct(id);
              } catch (apiErr) {
                console.warn('Backend deleteProduct error, removing locally:', apiErr);
              }
              setItems(prev => prev.filter(i => i.id !== id));
              Alert.alert('Success', 'Item deleted from catalog successfully!');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete item.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const showItemActions = (item: BusinessItem) => {
    Alert.alert(
      item.name,
      'Choose an action for this catalog item:',
      [
        {
          text: item.isActive ? 'Mark as Unavailable' : 'Mark as Available',
          onPress: () => toggleItem(item.id),
        },
        {
          text: 'Delete Item',
          style: 'destructive',
          onPress: () => handleDeleteItem(item.id),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const simulateChooseFile = () => {
    setIsUploadModalVisible(true);
  };



  const handleTakePhoto = async () => {
    setIsUploadModalVisible(false);
    try {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission Required',
              message: 'App requires access to camera to take photos for your products and business.',
              buttonNeutral: 'Ask Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Camera permission denied');
            Alert.alert('Camera Permission Required', 'Camera permission is required to take photo.');
            return;
          }
        } catch (permErr) {
          console.warn('Permission error:', permErr);
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: true,
        saveToPhotos: true,
      });

      if (result.didCancel) {
        console.log('User cancelled camera photo capture');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localUri = asset.uri || '';
        const mimeType = asset.type || 'image/jpeg';
        const base64 = asset.base64 || '';

        // Show local preview immediately
        if (localUri) setChosenImage(localUri);

        // Upload to server to get public URL
        setIsUploading(true);
        setUploadProgress(25);

        const progressInterval = setInterval(() => {
          setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
        }, 120);

        try {
          const publicUrl = await uploadImageToServer({ base64, localUri, mimeType }, mimeType);
          clearInterval(progressInterval);
          setUploadProgress(100);
          if (publicUrl && !publicUrl.startsWith('file://') && !publicUrl.startsWith('content://')) {
            setUploadedImageUrl(publicUrl);
          }
          await new Promise(resolve => setTimeout(() => resolve(null), 200));
        } catch (uploadErr) {
          clearInterval(progressInterval);
          console.warn('[handleTakePhoto] Image upload error:', uploadErr);
        } finally {
          clearInterval(progressInterval);
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.warn('Camera selection error: ', error);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const handleChooseFromLibrary = async () => {
    setIsUploadModalVisible(false);
    try {
      if (Platform.OS === 'android') {
        try {
          const androidVer = Number(Platform.Version);
          let perm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          if (androidVer >= 33 && (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES) {
            perm = (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES;
          }
          await PermissionsAndroid.request(perm, {
            title: 'Photo Library Permission',
            message: 'App requires access to gallery to select product photos.',
            buttonPositive: 'OK',
          });
        } catch (permErr) {
          console.warn('Gallery permission error:', permErr);
        }
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 1,
        includeBase64: true,
      });

      if (result.didCancel) {
        console.log('User cancelled image library selection');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const localUri = asset.uri || '';
        const mimeType = asset.type || 'image/jpeg';
        const base64 = asset.base64 || '';

        // Show local preview immediately
        if (localUri) setChosenImage(localUri);

        // Upload to server to get public URL
        setIsUploading(true);
        setUploadProgress(25);

        const progressInterval = setInterval(() => {
          setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
        }, 120);

        try {
          const publicUrl = await uploadImageToServer({ base64, localUri, mimeType }, mimeType);
          clearInterval(progressInterval);
          setUploadProgress(100);
          if (publicUrl && !publicUrl.startsWith('file://') && !publicUrl.startsWith('content://')) {
            setUploadedImageUrl(publicUrl);
          }
          await new Promise(resolve => setTimeout(() => resolve(null), 200));
        } catch (uploadErr) {
          clearInterval(progressInterval);
          console.warn('[handleChooseFromLibrary] Image upload error:', uploadErr);
        } finally {
          clearInterval(progressInterval);
          setIsUploading(false);
        }
      } else if (result.errorMessage) {
        console.warn('Image picker error:', result.errorMessage);
      }
    } catch (error) {
      console.warn('Gallery selection error: ', error);
      Alert.alert(
        'Gallery Access Required',
        'Please grant photo gallery permission in Android settings to pick custom photos.'
      );
    }
  };


  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#18181b' : '#FFFFFF'} />

      {selectedCategory === null ? (
        /* Categories Directory Dashboard */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[tw`px-5 pb-6`, { paddingTop: insets.top + 16 }]}>
          <View style={tw`mb-6`}>
            <Text style={[tw`text-3xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>My Business</Text>
            <Text style={[tw`text-sm mt-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Select a business type to view and manage your items
            </Text>
          </View>

          {/* Add Business Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openAddBusinessModal}
            style={[
              tw`rounded-2xl py-4 px-5 mb-5 flex-row items-center justify-center`,
              {
                backgroundColor: '#4F46E5',
                shadowColor: '#4F46E5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
              },
            ]}>
            <Plus size={20} color="#FFFFFF" />
            <Text style={tw`text-white font-bold text-base ml-2`}>Add Business</Text>
          </TouchableOpacity>

          {/* List of Registered Businesses */}
          {businesses.length > 0 ? (
            <View style={tw`space-y-4`}>
              {businesses.map((biz: any) => {
                const normCat = normalizeCategory(biz.vendorType || biz.category || biz.baseVendorType);
                const catConf = categoriesConfig.find(c => c.key === normCat) || categoriesConfig[0];
                const IconComp = catConf.icon;
                const bizId = String(biz._id || biz.id || '');
                const outletItemCount = (items || []).filter((it: any) => {
                  if (!it) return false;
                  const itCat = normalizeCategory(it.category || it.type);
                  if (bizId && (it.businessId === bizId || it.vendorId === bizId)) return true;
                  if (itCat === normCat && (!it.businessId || it.vendorId === currentUser?._id)) return true;
                  return false;
                }).length;

                return (
                  <TouchableOpacity
                    key={biz._id || biz.id}
                    activeOpacity={0.85}
                    onPress={() => handleSelectBusiness(biz)}
                    style={[
                      tw`w-full rounded-3xl p-5 mb-4 border justify-between`,
                      {
                        backgroundColor: isDark ? '#18181b' : '#FFFFFF',
                        borderColor: isDark ? '#27272a' : '#E5E7EB',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 8,
                        elevation: 2,
                      },
                    ]}>
                    {/* Top Row: Category Pill Badge + Item Count Badge + Approval Status Badge (Left) & Category Icon Box (Right) */}
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <View style={tw`flex-row items-center flex-wrap gap-1.5`}>
                        <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: isDark ? '#422006' : '#FEF9C3' }]}>
                          <Text style={[tw`text-[10px] font-extrabold uppercase tracking-wider`, { color: isDark ? '#FDE047' : '#854D0E' }]}>
                            {catConf.label}
                          </Text>
                        </View>
                        <View style={[tw`px-2.5 py-0.5 rounded-full`, isDark ? tw`bg-indigo-950/70 border border-indigo-800` : tw`bg-indigo-50 border border-indigo-200`]}>
                          <Text style={[tw`text-[10px] font-black tracking-wide`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>
                            {outletItemCount} {catConf.unit || 'Item'}{outletItemCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        {(() => {
                          const bStat = String(biz.status || '').toLowerCase().trim();
                          const bApp = String(biz.approvalStatus || '').toLowerCase().trim();
                          const isPend = biz.isApproved === false ||
                            ['pending', 'pending approval', 'pending_approval', 'pending pincode admin review', 'under_verification', 'suspended', 'rejected'].includes(bStat) ||
                            ['pending', 'pending approval', 'under_verification', 'rejected'].includes(bApp) ||
                            biz.isActive === false;
                          if (!isPend) return null;
                          const isSuspended = bStat === 'suspended' || bStat === 'rejected';
                          return (
                            <View style={[tw`px-2.5 py-0.5 rounded-full`, isSuspended ? tw`bg-rose-100 border border-rose-300` : tw`bg-amber-100 border border-amber-300`]}>
                              <Text style={[tw`text-[10px] font-bold`, isSuspended ? tw`text-rose-800` : tw`text-amber-800`]}>
                                {isSuspended ? '✕ Suspended' : '⏳ Pending Review'}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>

                      {/* Top Right Icon Box */}
                      <View
                        style={[
                          tw`w-10 h-10 rounded-2xl items-center justify-center`,
                          { backgroundColor: isDark ? '#27272a' : '#F3F4F6' },
                        ]}>
                        <IconComp size={20} color={catConf.color} />
                      </View>
                    </View>

                    {/* Business Name */}
                    <Text style={[tw`font-extrabold text-xl mb-2`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                      {biz.businessName || biz.vendorType}
                    </Text>

                    {/* Details Section */}
                    <View style={tw`space-y-1 mb-3`}>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                        Category: <Text style={isDark ? tw`text-zinc-200 font-bold` : tw`text-gray-800 font-bold`}>{biz.category || biz.vendorType}</Text>
                      </Text>
                      {biz.address ? (
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                          Address: <Text style={isDark ? tw`text-zinc-200 font-bold` : tw`text-gray-800 font-bold`}>{biz.address}</Text>
                        </Text>
                      ) : null}
                      {(biz.pincode || biz.pinCode) ? (
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                          Pincode: <Text style={isDark ? tw`text-zinc-200 font-bold` : tw`text-gray-800 font-bold`}>{biz.pincode || biz.pinCode}</Text>
                        </Text>
                      ) : null}
                      {(biz.phone || currentUser?.mobileNumber) ? (
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]} numberOfLines={1}>
                          Phone: <Text style={isDark ? tw`text-zinc-200 font-bold` : tw`text-gray-800 font-bold`}>{biz.phone || currentUser?.mobileNumber}</Text>
                        </Text>
                      ) : null}
                    </View>

                    {/* Bottom Row: Actions */}
                    <View style={[tw`flex-row items-center justify-end pt-3 border-t gap-2.5`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                      {/* Edit Button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openEditBusinessModal(biz);
                        }}
                        activeOpacity={0.7}
                        style={[
                          tw`flex-row items-center justify-center px-3.5 py-1.5 rounded-xl`,
                          { backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF' },
                        ]}>
                        <Edit3 size={14} color="#4F46E5" style={tw`mr-1.5`} />
                        <Text style={tw`text-indigo-600 font-bold text-xs`}>Edit</Text>
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteBusiness(biz._id || biz.id, biz.businessName || biz.vendorType);
                        }}
                        activeOpacity={0.7}
                        style={[
                          tw`flex-row items-center justify-center px-3.5 py-1.5 rounded-xl`,
                          { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEF2F2' },
                        ]}>
                        <Trash size={14} color="#EF4444" style={tw`mr-1.5`} />
                        <Text style={tw`text-rose-600 font-bold text-xs`}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={tw`items-center justify-center py-16`}>
              <Package size={56} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={[tw`font-bold text-base mt-4`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>No businesses yet</Text>
              <Text style={[tw`text-xs mt-1`, isDark ? tw`text-zinc-600` : tw`text-gray-400`]}>Tap "Add Business" to get started</Text>
            </View>
          )}
        </ScrollView>
      ) : (() => {
        const selectedBiz = (activeBizId ? businesses.find((b: any) => (b._id || b.id) === activeBizId) : null) || businesses.find((b: any) => normalizeCategory(b.vendorType || b.category || b.baseVendorType) === selectedCategory) || businesses[0];
        return (
        /* Category Items View */
        <>
          {/* Header */}
          <View
            style={[
              isDark ? tw`bg-zinc-900 border-b border-zinc-800` : tw`bg-white`,
              tw`px-5 pb-3`,
              { paddingTop: insets.top + 12 },
              {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}>
            {searchVisible ? (
              <View style={tw`flex-row items-center justify-between`}>
                <View style={[tw`flex-row items-center flex-1 mr-3 px-3 py-1.5 rounded-xl`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                  <Search size={18} color={isDark ? '#A1A1AA' : '#6B7280'} style={tw`mr-2`} />
                  <TextInput
                    autoFocus
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search items..."
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    style={[tw`flex-1 text-sm p-0 m-0 font-medium`, isDark ? tw`text-white` : tw`text-gray-900`]}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={tw`p-1`}>
                      <X size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSearchVisible(false);
                    setSearchQuery('');
                  }}
                  style={tw`py-1`}>
                  <Text style={tw`text-indigo-600 font-bold text-xs`}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center flex-1 mr-2`}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory(null);
                      setActiveBizId(null);
                    }}
                    style={[tw`mr-3 p-1.5 rounded-full`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                    <ArrowLeft size={20} color={isDark ? '#E4E4E7' : '#1F2937'} />
                  </TouchableOpacity>
                  <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                    {selectedBiz?.businessName || selectedCategory}
                  </Text>
                </View>
                <View style={tw`flex-row items-center`}>
                  <TouchableOpacity onPress={() => setSearchVisible(true)} style={tw`p-2 mr-1`} activeOpacity={0.7}>
                    <Search size={22} color={isDark ? '#A1A1AA' : '#6B7280'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const bStat = String(selectedBiz?.status || '').toLowerCase().trim();
                      const bApp = String(selectedBiz?.approvalStatus || '').toLowerCase().trim();
                      const isPending = selectedBiz?.isApproved === false ||
                        ['pending', 'pending approval', 'pending_approval', 'pending pincode admin review', 'under_verification', 'suspended', 'rejected'].includes(bStat) ||
                        ['pending', 'pending approval', 'under_verification', 'rejected'].includes(bApp) ||
                        selectedBiz?.isActive === false;
                      if (isPending) {
                        Alert.alert(
                          'Outlet Pending Review',
                          'This business outlet is currently awaiting Admin approval or is suspended. Adding items will be available once the outlet is approved.'
                        );
                        return;
                      }
                      openAddItemModal();
                    }}
                    activeOpacity={0.7}
                    style={[
                      tw`flex-row items-center px-4 py-2 rounded-full`,
                      { backgroundColor: '#4F46E5' },
                    ]}>
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={tw`text-white font-semibold text-sm ml-1`}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Pending Outlet Alert Banner */}
            {(() => {
              const bStat = String(selectedBiz?.status || '').toLowerCase().trim();
              const bApp = String(selectedBiz?.approvalStatus || '').toLowerCase().trim();
              const isPend = selectedBiz?.isApproved === false ||
                ['pending', 'pending approval', 'pending_approval', 'pending pincode admin review', 'under_verification', 'suspended', 'rejected'].includes(bStat) ||
                ['pending', 'pending approval', 'under_verification', 'rejected'].includes(bApp) ||
                selectedBiz?.isActive === false;
              if (!isPend) return null;
              const isSuspended = bStat === 'suspended' || bStat === 'rejected';
              return (
                <View style={[tw`mt-2.5 p-2.5 rounded-xl flex-row items-center`, isSuspended ? { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1 } : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1 }]}>
                  <Text style={[tw`font-bold text-xs flex-1`, isSuspended ? tw`text-rose-900` : tw`text-amber-900`]}>
                    {isSuspended ? '✕ This outlet is suspended or rejected. Catalog items and orders are restricted.' : '⏳ This outlet is awaiting Admin review. Adding catalog items and receiving orders are restricted until verified.'}
                  </Text>
                </View>
              );
            })()}

            {/* Sub-Tabs Bar: Overview & Items */}
            <View style={tw`flex-row mt-3 bg-gray-100 p-1 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
              <TouchableOpacity
                onPress={() => setBusinessViewTab('overview')}
                style={[
                  tw`flex-1 py-2 items-center rounded-xl`,
                  businessViewTab === 'overview'
                    ? (isDark ? tw`bg-zinc-900 shadow-sm` : tw`bg-white shadow-sm`)
                    : tw`bg-transparent`,
                ]}>
                <Text
                  style={[
                    tw`font-bold text-xs`,
                    businessViewTab === 'overview'
                      ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                      : (isDark ? tw`text-zinc-400` : tw`text-gray-500`),
                  ]}>
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBusinessViewTab('items')}
                style={[
                  tw`flex-1 py-2 items-center rounded-xl`,
                  businessViewTab === 'items'
                    ? (isDark ? tw`bg-zinc-900 shadow-sm` : tw`bg-white shadow-sm`)
                    : tw`bg-transparent`,
                ]}>
                <Text
                  style={[
                    tw`font-bold text-xs`,
                    businessViewTab === 'items'
                      ? (isDark ? tw`text-white` : tw`text-indigo-600`)
                      : (isDark ? tw`text-zinc-400` : tw`text-gray-500`),
                  ]}>
                  Items ({filteredItems.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View Tab Body */}
          {businessViewTab === 'overview' ? (
            /* OVERVIEW TAB CONTENT */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-4 pb-6`}>
              {/* Business Main Header Card */}
              <View
                style={[
                  tw`rounded-3xl p-5 mb-4 border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}>
                <View style={tw`flex-row items-center mb-4`}>
                  <View
                    style={[
                      tw`w-12 h-12 rounded-2xl items-center justify-center mr-3.5`,
                      { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
                    ]}>
                    <Store size={24} color="#4F46E5" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-lg font-extrabold`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                      {selectedBiz?.businessName || selectedCategory}
                    </Text>
                    <View style={tw`flex-row items-center mt-1 flex-wrap gap-1.5`}>
                      <View style={[tw`px-2.5 py-0.5 rounded-full`, { backgroundColor: isDark ? '#166534' : '#DCFCE7' }]}>
                        <Text style={[tw`text-[10px] font-extrabold uppercase tracking-wider`, { color: isDark ? '#86EFAC' : '#15803D' }]}>
                          Active
                        </Text>
                      </View>
                      <View style={[tw`px-2.5 py-0.5 rounded-full`, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                        <Text style={[tw`text-[10px] font-bold`, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                          {selectedBiz?.vendorType || selectedCategory}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Overview Details Section */}
                <View style={[tw`pt-4 border-t space-y-3.5`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
                  <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    Business Details
                  </Text>

                  {/* Category */}
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <Tag size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Category</Text>
                      <Text style={[tw`text-sm font-semibold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {selectedBiz?.vendorType || selectedCategory}
                      </Text>
                    </View>
                  </View>

                  {/* Address */}
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <MapPin size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Address</Text>
                      <Text style={[tw`text-sm font-semibold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {selectedBiz?.address || currentUser?.address || 'Not specified'}
                      </Text>
                    </View>
                  </View>

                  {/* Pincode */}
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <MapPin size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Pincode</Text>
                      <Text style={[tw`text-sm font-semibold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {selectedBiz?.pincode || selectedBiz?.pinCode || currentUser?.postalCode || 'Not specified'}
                      </Text>
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-8 h-8 rounded-xl items-center justify-center mr-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                      <Phone size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Phone</Text>
                      <Text style={[tw`text-sm font-semibold mt-0.5`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {selectedBiz?.phone || currentUser?.mobileNumber || 'Not provided'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Performance & Catalog Summary Card */}
              <View
                style={[
                  tw`rounded-3xl p-5 mb-4 border`,
                  isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-100`,
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}>
                <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                  Items Overview
                </Text>
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`items-center flex-1`}>
                    <Text style={[tw`text-2xl font-black`, isDark ? tw`text-white` : tw`text-gray-900`]}>{filteredItems.length}</Text>
                    <Text style={[tw`text-xs mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Total</Text>
                  </View>
                  <View style={[tw`w-px h-8`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
                  <View style={tw`items-center flex-1`}>
                    <Text style={[tw`text-2xl font-black text-emerald-600`]}>{filteredItems.filter(i => i.isActive).length}</Text>
                    <Text style={[tw`text-xs mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Active</Text>
                  </View>
                  <View style={[tw`w-px h-8`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
                  <View style={tw`items-center flex-1`}>
                    <Text style={[tw`text-2xl font-black text-rose-500`]}>{filteredItems.filter(i => !i.isActive).length}</Text>
                    <Text style={[tw`text-xs mt-1 font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Inactive</Text>
                  </View>
                </View>

                {/* Manage Items Button */}
                <TouchableOpacity
                  onPress={() => setBusinessViewTab('items')}
                  style={[tw`mt-5 py-3 rounded-2xl flex-row items-center justify-center`, { backgroundColor: '#4F46E5' }]}>
                  <Package size={18} color="#FFFFFF" style={tw`mr-2`} />
                  <Text style={tw`text-white font-bold text-sm`}>Manage Items</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* ITEMS TAB CONTENT */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`px-5 pt-4 pb-6`}>
              {/* Summary */}
              <View
                style={[
                  tw`rounded-2xl p-4 mb-4 flex-row`,
                  isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
                  {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    elevation: 1,
                  },
                ]}>
                <View style={tw`flex-1 items-center`}>
                  <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mb-1.5`, { backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF' }]}>
                    <Box size={20} color="#4F46E5" />
                  </View>
                  <Text style={[tw`font-bold text-lg`, isDark ? tw`text-white` : tw`text-gray-900`]}>{filteredItems.length}</Text>
                  <Text style={[tw`text-xs`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Total</Text>
                </View>
                <View style={[tw`w-px mx-2`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]} />
                <View style={tw`flex-1 items-center`}>
                  <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mb-1.5`, { backgroundColor: isDark ? '#052e16' : '#F0FDF4' }]}>
                    <Package size={20} color="#16A34A" />
                  </View>
                  <Text style={[tw`font-bold text-lg`, isDark ? tw`text-white` : tw`text-gray-900`]}>{filteredItems.filter(i => i.isActive).length}</Text>
                  <Text style={[tw`text-xs`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Active</Text>
                </View>
                <View style={[tw`w-px mx-2`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]} />
                <View style={tw`flex-1 items-center`}>
                  <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mb-1.5`, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2' }]}>
                    <Package size={20} color="#DC2626" />
                  </View>
                  <Text style={[tw`font-bold text-lg`, isDark ? tw`text-white` : tw`text-gray-900`]}>{filteredItems.filter(i => !i.isActive).length}</Text>
                  <Text style={[tw`text-xs`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>Inactive</Text>
                </View>
              </View>

              {/* Item Cards – Order-style layout */}
              {filteredItems.length === 0 ? (
                <View style={tw`items-center justify-center py-10`}>
                  <Package size={48} color="#9CA3AF" strokeWidth={1.5} />
                  <Text style={[tw`font-semibold text-sm mt-3`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>No items in this category</Text>
                  <TouchableOpacity
                    onPress={openAddItemModal}
                    style={[tw`mt-4 px-4 py-2 rounded-xl`, isDark ? tw`bg-indigo-950` : tw`bg-indigo-50`]}>
                    <Text style={tw`text-indigo-600 font-bold text-xs`}>Add your first item</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    style={[
                      tw`rounded-2xl p-4 mb-3 flex-row items-center`,
                      isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`,
                      {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 8,
                        elevation: 2,
                      },
                      !item.isActive && { opacity: 0.55 },
                    ]}>
                    {/* Product/Service Image (Hidden for Jobs) */}
                    {!(item.category === 'Jobs' || selectedCategory === 'Jobs') && (
                      <Image
                        source={{ uri: formatImageUrl(item.image) || categoryImages[item.category as CategoryKey] || categoryImages['Products'] }}
                        style={[tw`w-22 h-22 rounded-2xl mr-4 border`, isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-100 border-gray-200`]}
                        resizeMode="cover"
                      />
                    )}

                    {/* Card Details */}
                    <View style={tw`flex-1`}>
                      <View style={tw`flex-row items-center mb-1 flex-wrap`}>
                        {/* Food Veg / Non-Veg Indicator */}
                        {(item.category === 'Food' || item.foodType) && (
                          <View style={[tw`w-3.5 h-3.5 border items-center justify-center rounded-sm mr-1.5`, item.foodType === 'Non-Veg' ? tw`border-red-600` : tw`border-emerald-600`]}>
                            <View style={[tw`w-1.5 h-1.5 rounded-full`, item.foodType === 'Non-Veg' ? tw`bg-red-600` : tw`bg-emerald-600`]} />
                          </View>
                        )}
                        <View style={[tw`px-2 py-0.5 rounded-md mr-1.5 bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                          <Text style={[tw`text-[10px] font-bold text-indigo-600`, isDark && tw`text-indigo-300`]}>
                            {item.subCategory || 'General'}
                          </Text>
                        </View>
                        {item.itemType ? (
                          <View style={[tw`px-2 py-0.5 rounded-md bg-purple-50 mr-1.5`, isDark && tw`bg-purple-950`]}>
                            <Text style={[tw`text-[10px] font-bold text-purple-600`, isDark && tw`text-purple-300`]}>
                              {item.itemType}
                            </Text>
                          </View>
                        ) : null}
                        {((item.category === 'Jobs' || (item.category as string) === 'Job' || selectedCategory === 'Jobs') && item.jobID) ? (
                          <View style={[tw`px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200`, isDark && tw`bg-amber-950/60 border-amber-800`]}>
                            <Text style={[tw`text-[10px] font-extrabold text-amber-700`, isDark && tw`text-amber-300`]}>
                              ID: {item.jobID || (item.id ? `JOB-${String(item.id).replace(/[^\d]/g, '').slice(-5) || '10482'}` : 'JOB-10482')}
                            </Text>
                          </View>
                        ) : null}
                        {(item.category === 'Travel' || selectedCategory === 'Travel') && item.badge ? (
                          <View style={[tw`px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 mr-1.5`, isDark && tw`bg-amber-950/60 border-amber-700`]}>
                            <Text style={[tw`text-[10px] font-extrabold text-amber-600`, isDark && tw`text-amber-300`]}>
                              {item.badge}
                            </Text>
                          </View>
                        ) : null}
                        {/* Active Offer Pill */}
                        {item.offer && item.offer.isActive ? (
                          <View style={[tw`px-2 py-0.5 rounded-md bg-amber-500 mr-1.5 flex-row items-center`]}>
                            <Tag size={10} color="#FFFFFF" style={tw`mr-1`} />
                            <Text style={tw`text-[10px] font-black text-white`}>
                              {item.offer.discountType === 'percentage' ? `${item.offer.discountValue}% OFF` : (item.offer.title || 'SPECIAL OFFER')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[tw`font-bold text-base leading-tight`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        {item.name}
                      </Text>
                      {(item.category === 'Jobs' || (item.category as string) === 'Job' || selectedCategory === 'Jobs') && item.companyName ? (
                        <Text style={[tw`text-xs font-bold mt-0.5`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]} numberOfLines={1}>
                          {item.companyName}
                        </Text>
                      ) : null}
                      {(item.category === 'Travel' || selectedCategory === 'Travel') && (item.operator || item.operatorName) ? (
                        <Text style={[tw`text-xs font-bold mt-0.5`, isDark ? tw`text-amber-400` : tw`text-amber-600`]} numberOfLines={1}>
                          By {item.operator || item.operatorName}
                        </Text>
                      ) : null}
                      {(item.category === 'Travel' || selectedCategory === 'Travel') && (item.vehicleNumber || item.vehicleRegNo || item.busNumber) ? (
                        <View style={[tw`px-2 py-0.5 rounded-md bg-amber-100/70 border border-amber-300 self-start mt-1 flex-row items-center`, isDark && tw`bg-amber-950/60 border-amber-700`]}>
                          <Text style={[tw`text-[10px] font-extrabold text-amber-800`, isDark && tw`text-amber-300`]}>
                            🚍 Reg: {item.vehicleNumber || item.vehicleRegNo || item.busNumber}
                          </Text>
                        </View>
                      ) : null}
                      {(item.category === 'Travel' || selectedCategory === 'Travel') ? (
                        <View style={tw`mt-1.5`}>
                          <View style={[tw`px-2 py-1 rounded-lg self-start mb-1 flex-row items-center`, isDark ? tw`bg-zinc-800` : tw`bg-amber-50 border border-amber-200`]}>
                            <Text style={[tw`text-xs font-bold`, isDark ? tw`text-amber-300` : tw`text-amber-800`]}>
                              {item.from || 'Bangalore'} ➔ {item.to || 'Chennai'}
                            </Text>
                          </View>
                          <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            ⏰ {item.departureTime || item.boardingTime || '21:30'} ➔ {item.arrivalTime || '05:30'} • {item.duration || item.busSchedule || '8h 00m'}
                          </Text>
                        </View>
                      ) : (item.category === 'Jobs' || (item.category as string) === 'Job' || selectedCategory === 'Jobs') ? (
                        <View style={tw`mt-1.5`}>
                          <View style={tw`flex-row flex-wrap items-center gap-1.5 mb-1`}>
                            {item.jobType ? (
                              <View style={[tw`px-2 py-0.5 rounded-md bg-indigo-50`, isDark && tw`bg-indigo-950`]}>
                                <Text style={[tw`text-[10px] font-bold text-indigo-600`, isDark && tw`text-indigo-300`]}>{item.jobType}</Text>
                              </View>
                            ) : null}
                            {item.experienceRequired ? (
                              <View style={[tw`px-2 py-0.5 rounded-md bg-emerald-50`, isDark && tw`bg-emerald-950`]}>
                                <Text style={[tw`text-[10px] font-bold text-emerald-700`, isDark && tw`text-emerald-300`]}>Exp: {item.experienceRequired}</Text>
                              </View>
                            ) : null}
                            {item.jobLocation ? (
                              <View style={[tw`px-2 py-0.5 rounded-md bg-zinc-100`, isDark && tw`bg-zinc-800`]}>
                                <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-zinc-300` : tw`text-zinc-700`]}>📍 {item.jobLocation}</Text>
                              </View>
                            ) : null}
                          </View>
                          {item.skillsRequirement ? (
                            <Text style={[tw`text-[11px] font-medium mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]} numberOfLines={1}>
                              Skills: {item.skillsRequirement}
                            </Text>
                          ) : null}
                          {item.deadlineDate ? (
                            <Text style={[tw`text-[10px] font-bold`, isDark ? tw`text-amber-400` : tw`text-amber-700`]}>
                              📅 Apply by: {item.deadlineDate}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={[tw`text-xs mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]} numberOfLines={2}>
                          {item.detail}
                        </Text>
                      )}

                      {/* Extra Info (Stock, Pincode) */}
                      <View style={tw`flex-row items-center mt-2 flex-wrap gap-x-2.5 gap-y-1`}>
                        {!['Services', 'Stay', 'Jobs'].includes(item.category || selectedCategory || '') && (
                          <View style={tw`flex-row items-center`}>
                            <Package size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                            <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              {item.stock || item.seatsLeft || '10'} {(item.category === 'Travel' || selectedCategory === 'Travel') ? 'seats capacity' : (item.unit || 'count')}
                            </Text>
                          </View>
                        )}
                        {item.pinCode ? (
                          <View style={tw`flex-row items-center`}>
                            <MapPin size={11} color={isDark ? '#71717A' : '#9CA3AF'} style={tw`mr-1`} />
                            <Text style={[tw`text-[10px] font-medium`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              {item.pinCode}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={tw`flex-row items-center gap-1.5 mt-1.5`}>
                        <Text style={[tw`font-black text-sm`, item.offer?.isActive ? tw`text-amber-600` : (isDark ? tw`text-white` : tw`text-gray-900`)]}>
                          {typeof (item as any).price === 'number' ? `₹${(item as any).price.toLocaleString('en-IN')}` : (String((item as any).price || '₹0').startsWith('₹') ? (item as any).price : `₹${(item as any).price || '0'}`)}
                        </Text>
                        {((item as any).originalPrice || item.offer?.originalPrice) ? (
                          <Text style={[tw`text-[10px] line-through text-gray-400 font-semibold`, isDark && tw`text-zinc-500`]}>
                            {typeof ((item as any).originalPrice || item.offer?.originalPrice) === 'number'
                              ? `₹${Number((item as any).originalPrice || item.offer?.originalPrice).toLocaleString('en-IN')}`
                              : (String((item as any).originalPrice || item.offer?.originalPrice).startsWith('₹') ? ((item as any).originalPrice || item.offer?.originalPrice) : `₹${(item as any).originalPrice || item.offer?.originalPrice}`)}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Right Side: Switch + Actions */}
                    <View style={tw`items-center ml-2`}>
                      <View
                        style={[
                          tw`px-2.5 py-1 rounded-xl mb-3`,
                          { backgroundColor: item.isActive ? (isDark ? '#052e16' : '#F0FDF4') : (isDark ? '#450a0a' : '#FEF2F2') },
                        ]}>
                        <Text
                          style={[
                            tw`text-[10px] font-bold`,
                            { color: item.isActive ? '#16A34A' : '#DC2626' },
                          ]}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>

                      {/* Card Action Buttons: Edit, Offer, Delete */}
                      <View style={tw`flex-row items-center gap-1.5`}>
                        <TouchableOpacity
                          onPress={() => openEditItemModal(item)}
                          style={[tw`p-2 rounded-xl`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                          <Edit3 size={15} color={isDark ? '#A1A1AA' : '#4B5563'} />
                        </TouchableOpacity>

                        {!['Jobs'].includes(item.category || selectedCategory || '') && (
                          <TouchableOpacity
                            onPress={() => openOfferModal(item)}
                            style={[
                              tw`px-2.5 py-1.5 rounded-xl flex-row items-center`,
                              item.offer?.isActive
                                ? (isDark ? tw`bg-amber-950/80 border border-amber-600` : tw`bg-amber-100 border border-amber-300`)
                                : (isDark ? tw`bg-zinc-800` : tw`bg-gray-100`),
                            ]}>
                            <Tag size={13} color={item.offer?.isActive ? '#D97706' : (isDark ? '#A1A1AA' : '#4B5563')} style={tw`mr-1`} />
                            <Text
                              style={[
                                tw`text-[11px] font-bold`,
                                item.offer?.isActive
                                  ? tw`text-amber-600`
                                  : (isDark ? tw`text-zinc-300` : tw`text-gray-700`),
                              ]}>
                              Offer
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Delete Item',
                              `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteItem(item.id) },
                              ]
                            );
                          }}
                          style={[tw`p-2 rounded-xl`, isDark ? tw`bg-red-950/40` : tw`bg-red-50`]}>
                          <Trash size={15} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </>
        );
      })()}

      {isAddModalVisible && (
        <View style={[tw`absolute inset-0 justify-end`, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, elevation: 1000 }]}>
          <View style={[tw`rounded-t-3xl px-5 pt-5 pb-8 max-h-[92%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <Text style={[tw`text-xl font-bold flex-1 mr-3`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {modalType === 'business'
                  ? 'Add Business'
                  : newItemCategory === 'Jobs'
                  ? (isEditing ? 'Edit Job' : 'Add New Job')
                  : (isEditing ? `Edit ${getCategoryUnitLabel(newItemCategory)}` : `Add ${getCategoryUnitLabel(newItemCategory)}`)}
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[tw`w-8 h-8 rounded-full items-center justify-center mt-0.5`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
              {modalType === 'business' ? (
                <>
                  {/* BUSINESS NAME (OPTIONAL) */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      BUSINESS NAME (OPTIONAL)
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={newItemName}
                      onChangeText={setNewItemName}
                      placeholder="Enter Business Name (defaults to main business)"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* PRODUCT OR SERVICE OR ETC */}
                  <DropdownSelector
                    label="PRODUCT OR SERVICE OR ETC"
                    value={newItemCategory}
                    options={categoriesConfig.map(cat => cat.key)}
                    disabledOptions={currentUser?.businesses?.map((b: any) => b.vendorType) || []}
                    getOptionLabel={(catKey) => {
                      const isReg = currentUser?.businesses?.some((b: any) => b.vendorType === catKey);
                      return isReg ? `${catKey} (Already Registered)` : catKey;
                    }}
                    onSelect={(val) => handleCategoryChange(val as CategoryKey)}
                    isDark={isDark}
                    placeholder="Select Product or Service or etc"
                  />

                  {/* ADDRESS */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      ADDRESS
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={bizAddress}
                      onChangeText={setBizAddress}
                      placeholder="Enter Street / Shop / Area Address"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* PINCODE & PHONE NUMBER */}
                  <View style={tw`flex-row justify-between mb-4.5`}>
                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        PINCODE
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={bizPinCode}
                        onChangeText={(val) => setBizPinCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="e.g. 636112"
                        keyboardType="numeric"
                        maxLength={6}
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                    </View>

                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        PHONE NUMBER
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={bizPhone}
                        onChangeText={(val) => setBizPhone(val.replace(/[^0-9]/g, '').slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                </>
              ) : newItemCategory === 'Jobs' ? (
                <>
                  {/* ========================================================================= */}
                  {/* JOBS FORM (Matches Screenshots 1, 2, 3, 4)                                */}
                  {/* ========================================================================= */}

                  {/* 1. JOB NAME */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      JOB NAME
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={newItemName}
                      onChangeText={setNewItemName}
                      placeholder="e.g. Full Stack Developer"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 2. JOB CATEGORY (keeps existing category) */}
                  <DropdownSelector
                    label="JOB CATEGORY"
                    value={newItemSubCategory}
                    options={Object.keys(getHierarchyForCat('Jobs'))}
                    onSelect={handleSubCategoryChange}
                    isDark={isDark}
                    placeholder="-- Select Category --"
                  />

                  {/* 3. CHILD CATEGORY (keeps existing child category) */}
                  <DropdownSelector
                    label="CHILD CATEGORY"
                    value={newItemItemType}
                    options={(getHierarchyForCat('Jobs')[newItemSubCategory]) || []}
                    onSelect={setNewItemItemType}
                    isDark={isDark}
                    placeholder={newItemSubCategory ? "-- Select Child Category --" : "-- Select Category First --"}
                  />

                  {/* 4. JOB TYPE */}
                  <DropdownSelector
                    label="JOB TYPE"
                    value={jobType}
                    options={jobTypeOptions}
                    onSelect={setJobType}
                    isDark={isDark}
                    placeholder="Full-time"
                  />

                  {/* 5. JOB LOCATION */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      JOB LOCATION
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobLocation}
                      onChangeText={setJobLocation}
                      placeholder="e.g. Bangalore / Remote"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 6. EXPERIENCE REQUIRED */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      EXPERIENCE REQUIRED
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={experienceRequired}
                      onChangeText={setExperienceRequired}
                      placeholder="e.g. 2-5 Years / Fresher"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 7. SALARY / PACKAGE (LPA) */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      SALARY / PACKAGE (LPA)
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={salaryPackage}
                      onChangeText={setSalaryPackage}
                      placeholder="e.g. 5.5 LPA or 5.5LPA"
                      keyboardType="default"
                      autoCapitalize="characters"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 8. SKILLS REQUIREMENT */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      SKILLS REQUIREMENT
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={skillsRequirement}
                      onChangeText={setSkillsRequirement}
                      placeholder="e.g. React, Node.js, JavaScript"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 9. JOB DESCRIPTION */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      JOB DESCRIPTION
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        { minHeight: 70, textAlignVertical: 'top' },
                      ]}
                      multiline
                      value={jobDescription}
                      onChangeText={setJobDescription}
                      placeholder="Describe the job roles, responsibilities..."
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 9b. KEY RESPONSIBILITIES */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      KEY RESPONSIBILITIES
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        { minHeight: 75, textAlignVertical: 'top' },
                      ]}
                      multiline
                      value={keyResponsibilities}
                      onChangeText={setKeyResponsibilities}
                      placeholder="Enter key responsibilities (e.g. one per line)..."
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 10. DEADLINE DATE */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      DEADLINE DATE
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsDatePickerVisible(true)}
                      style={[
                        tw`border rounded-xl px-4 py-3 flex-row items-center justify-between`,
                        isDark ? tw`bg-zinc-950 border-zinc-700` : tw`bg-gray-50 border-gray-200`,
                      ]}>
                      <TextInput
                        style={[
                          tw`text-sm font-semibold flex-1 p-0`,
                          isDark ? tw`text-white` : tw`text-gray-800`,
                        ]}
                        value={deadlineDate}
                        onChangeText={setDeadlineDate}
                        placeholder="mm/dd/yyyy"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                      <TouchableOpacity
                        onPress={() => setIsDatePickerVisible(true)}
                        style={tw`pl-2`}>
                        <Calendar size={18} color={isDark ? '#A1A1AA' : '#6B7280'} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>

                  {/* 11. APPLICATION TIPS */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      APPLICATION TIPS
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        { minHeight: 60, textAlignVertical: 'top' },
                      ]}
                      multiline
                      value={applicationTips}
                      onChangeText={setApplicationTips}
                      placeholder="e.g. Attach portfolio link and highlight React projects"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 12. QUALIFICATION REQUIRED */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      QUALIFICATION REQUIRED
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={qualificationRequired}
                      onChangeText={setQualificationRequired}
                      placeholder="e.g. B.E. / B.Tech / MCA"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 13. LINKED PROFILE (URL) */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      LINKED PROFILE (URL)
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={linkedProfileUrl}
                      onChangeText={setLinkedProfileUrl}
                      placeholder="e.g. https://linkedin.com/company/connect"
                      keyboardType="url"
                      autoCapitalize="none"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 13a. COMPANY NAME */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      COMPANY NAME
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobCompanyName}
                      onChangeText={setJobCompanyName}
                      placeholder="e.g. Acme Technologies"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 13b. COMPANY WEBSITE */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      COMPANY WEBSITE
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobCompanyWebsite}
                      onChangeText={setJobCompanyWebsite}
                      placeholder="e.g. https://www.acme.com"
                      keyboardType="url"
                      autoCapitalize="none"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 14. CONTACT NUMBER */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      CONTACT NUMBER
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobContactNumber}
                      onChangeText={setJobContactNumber}
                      placeholder="e.g. +91 9999999999"
                      keyboardType="phone-pad"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 15. MAIL ID */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      MAIL ID
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobMailId}
                      onChangeText={setJobMailId}
                      placeholder="e.g. careers@connect.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 16. VACANCIES / OPENINGS */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      VACANCIES / OPENINGS
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobVacancies}
                      onChangeText={setJobVacancies}
                      placeholder="10"
                      keyboardType="numeric"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 17. PIN CODE */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      PIN CODE
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={jobPinCode}
                      onChangeText={(val) => setJobPinCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="e.g. 600001"
                      keyboardType="numeric"
                      maxLength={6}
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* 18. AVAILABILITY STATUS (as in vendor app) */}
                  <View style={[tw`flex-row items-center justify-between p-3 rounded-xl mb-5`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
                    <View>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>AVAILABILITY STATUS</Text>
                      <Text style={[tw`text-xs font-semibold mt-0.5`, newItemIsActive ? tw`text-green-600` : tw`text-red-500`]}>
                        {newItemIsActive ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                    <Switch
                      value={newItemIsActive}
                      onValueChange={setNewItemIsActive}
                      trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                      thumbColor={newItemIsActive ? '#4F46E5' : '#9CA3AF'}
                    />
                  </View>
                </>
              ) : (
                <>
                  {/* Product / Service / Room / Vehicle Name */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {newItemCategory === 'Stay' ? 'ROOM NUMBER / NAME' : newItemCategory === 'Travel' ? 'BUS / VEHICLE NAME' : `${getCategoryUnitLabel(newItemCategory)} Name`}
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={newItemName}
                      onChangeText={setNewItemName}
                      placeholder={newItemCategory === 'Stay' ? 'e.g. Deluxe Room' : newItemCategory === 'Travel' ? 'e.g. Multi-Axle Volvo AC Sleeper (2+1)' : `e.g. ${newItemCategory === 'Services' ? 'Hair Spa Treatment' : newItemCategory === 'Food' ? 'Cheese Burger' : 'New Product Item'}`}
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* Food Veg / Non-Veg Classification (Strictly for Food) */}
                  {newItemCategory === 'Food' && (
                    <View style={tw`mb-4.5`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        FOOD CLASSIFICATION <Text style={tw`text-red-500`}>*</Text>
                      </Text>
                      <View style={tw`flex-row gap-3`}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setNewItemFoodType('Veg')}
                          style={[
                            tw`flex-1 flex-row items-center justify-center p-3 rounded-xl border`,
                            newItemFoodType === 'Veg'
                              ? (isDark ? tw`bg-emerald-950/60 border-emerald-500` : tw`bg-emerald-50 border-emerald-600`)
                              : (isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-white border-gray-200`),
                          ]}>
                          <View style={[tw`w-4 h-4 border border-emerald-600 items-center justify-center rounded-sm mr-2`]}>
                            <View style={tw`w-2 h-2 rounded-full bg-emerald-600`} />
                          </View>
                          <Text style={[tw`font-bold text-sm`, newItemFoodType === 'Veg' ? tw`text-emerald-600` : (isDark ? tw`text-zinc-400` : tw`text-gray-700`)]}>
                            Pure Veg
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setNewItemFoodType('Non-Veg')}
                          style={[
                            tw`flex-1 flex-row items-center justify-center p-3 rounded-xl border`,
                            newItemFoodType === 'Non-Veg'
                              ? (isDark ? tw`bg-red-950/60 border-red-500` : tw`bg-red-50 border-red-600`)
                              : (isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-white border-gray-200`),
                          ]}>
                          <View style={[tw`w-4 h-4 border border-red-600 items-center justify-center rounded-sm mr-2`]}>
                            <View style={tw`w-2 h-2 rounded-full bg-red-600`} />
                          </View>
                          <Text style={[tw`font-bold text-sm`, newItemFoodType === 'Non-Veg' ? tw`text-red-600` : (isDark ? tw`text-zinc-400` : tw`text-gray-700`)]}>
                            Non-Veg
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* HOTEL NAME & CITY & ADDRESS (Strictly for Stay) */}
                  {newItemCategory === 'Stay' && (
                    <>
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          HOTEL / PROPERTY NAME
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={hotelName}
                          onChangeText={setHotelName}
                          placeholder="e.g. Grand Palace Hotel & Resort"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                      </View>

                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          CITY / DESTINATION
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold mb-2`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={stayCity}
                          onChangeText={setStayCity}
                          placeholder="e.g. Bangalore, Ooty, Goa, Chennai"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mt-1`}>
                          {stayCityPresets.map(c => {
                            const isSelected = stayCity.toLowerCase() === c.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={c}
                                onPress={() => setStayCity(c)}
                                style={[
                                  tw`px-3 py-1.5 rounded-full mr-2 border`,
                                  isSelected
                                    ? tw`bg-indigo-600 border-indigo-600`
                                    : isDark
                                      ? tw`bg-zinc-900 border-zinc-700`
                                      : tw`bg-white border-gray-300`,
                                ]}>
                                <Text style={[tw`text-xs font-semibold`, isSelected ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                  {c}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          PROPERTY ADDRESS & AREA / LANDMARK
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={stayAddress}
                          onChangeText={setStayAddress}
                          placeholder="e.g. Near Charring Cross, Club Road, Ooty"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                      </View>
                    </>
                  )}

                  {/* BUS OPERATOR / TRAVEL AGENCY (Strictly for Travel) */}
                  {newItemCategory === 'Travel' && (
                    <>
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          OPERATOR / TRAVEL AGENCY NAME
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={travelOperator}
                          onChangeText={setTravelOperator}
                          placeholder="e.g. VRL Travels, KSRTC Airavat, IntrCity SmartBus"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                      </View>

                      {/* VEHICLE REGISTRATION NUMBER (Strictly for Travel) */}
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          VEHICLE REGISTRATION NUMBER
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={vehicleNumber}
                          onChangeText={setVehicleNumber}
                          placeholder="e.g. TN 09 AB 1234 / KA 01 F 5678"
                          autoCapitalize="characters"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                      </View>
                    </>
                  )}

                  {/* Brief Description */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Brief Description</Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        { minHeight: 60, textAlignVertical: 'top' },
                      ]}
                      multiline
                      value={newItemDetail}
                      onChangeText={setNewItemDetail}
                      placeholder={newItemCategory === 'Travel' ? 'Individual TV, clean blankets, charging point, water bottle & live GPS tracking' : 'Provide key details, conditions, specs...'}
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* Price */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {newItemCategory === 'Stay' ? 'ROOM RATE PER NIGHT (₹)' : newItemCategory === 'Travel' ? 'TICKET FARE / SEAT PRICE (₹)' : 'Price (₹)'}
                    </Text>
                    <View style={tw`flex-row items-center relative`}>
                      <Text style={[tw`absolute left-4 font-bold text-sm z-10`, isDark ? tw`text-white` : tw`text-gray-800`]}>₹</Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl pl-8 pr-4 py-3 text-sm font-bold flex-1`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={newItemPrice.replace('₹', '')}
                        onChangeText={setNewItemPrice}
                        placeholder={newItemCategory === 'Travel' ? 'e.g. 950' : 'e.g. 299'}
                        keyboardType="numeric"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                    </View>
                  </View>

                  {/* Original Price */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {newItemCategory === 'Travel' ? 'ORIGINAL FARE / MRP (₹)' : 'ORIGINAL PRICE (₹)'}
                    </Text>
                    <View style={tw`flex-row items-center relative`}>
                      <Text style={[tw`absolute left-4 font-bold text-sm z-10`, isDark ? tw`text-white` : tw`text-gray-800`]}>₹</Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl pl-8 pr-4 py-3 text-sm font-bold flex-1`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={newItemOriginalPrice.replace('₹', '')}
                        onChangeText={setNewItemOriginalPrice}
                        placeholder={newItemCategory === 'Travel' ? 'e.g. 1200' : 'e.g. 399'}
                        keyboardType="numeric"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                    </View>
                  </View>

                  {/* Category Dropdown Selector */}
                  <DropdownSelector
                    label="Category"
                    value={newItemSubCategory}
                    options={Object.keys(getHierarchyForCat(newItemCategory))}
                    onSelect={handleSubCategoryChange}
                    isDark={isDark}
                    placeholder="Select Category"
                  />

                  {/* Child Category Dropdown Selector */}
                  <DropdownSelector
                    label="Child Category"
                    value={newItemItemType}
                    options={getHierarchyForCat(newItemCategory)[newItemSubCategory] || []}
                    onSelect={setNewItemItemType}
                    isDark={isDark}
                    placeholder="Select Child Category"
                  />

                  {/* SERVICE BADGE / HIGHLIGHT (for Travel) */}
                  {newItemCategory === 'Travel' && (
                    <View style={tw`mb-4.5`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        HIGHLIGHT BADGE
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row`}>
                        {travelBadgeOptions.map(bOpt => {
                          const isSel = travelBadge === bOpt;
                          return (
                            <TouchableOpacity
                              key={bOpt}
                              onPress={() => setTravelBadge(bOpt)}
                              activeOpacity={0.7}
                              style={[
                                tw`px-3 py-1.5 rounded-xl mr-2 border`,
                                isSel
                                  ? tw`bg-amber-500 border-amber-500`
                                  : isDark
                                    ? tw`bg-zinc-900 border-zinc-800`
                                    : tw`bg-gray-100 border-gray-200`,
                              ]}>
                              <Text style={[tw`text-xs font-bold`, isSel ? tw`text-zinc-950` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                {bOpt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* ROOM CLASS, BED TYPE, GUESTS, SPECIFICATIONS, POLICIES & AMENITIES (for Stay category) */}
                  {newItemCategory === 'Stay' && (
                    <>
                      {/* Room Class / Type */}
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          ROOM CLASS / TYPE
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold mb-2`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={roomClass}
                          onChangeText={setRoomClass}
                          placeholder="e.g. Deluxe Room"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row mt-1`}>
                          {roomClassOptions.map(cls => {
                            const isSelected = roomClass.toLowerCase() === cls.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={cls}
                                onPress={() => setRoomClass(cls)}
                                style={[
                                  tw`px-3 py-1.5 rounded-full mr-2 border`,
                                  isSelected
                                    ? tw`bg-indigo-600 border-indigo-600`
                                    : isDark
                                      ? tw`bg-zinc-900 border-zinc-700`
                                      : tw`bg-white border-gray-300`,
                                ]}>
                                <Text style={[tw`text-xs font-semibold`, isSelected ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                  {cls}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Bedding Type & Guest Capacity */}
                      <View style={tw`flex-row justify-between mb-4.5`}>
                        <View style={tw`w-[48%]`}>
                          <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            BED TYPE
                          </Text>
                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-3 text-sm font-semibold mb-2`,
                              isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                            ]}
                            value={bedType}
                            onChangeText={setBedType}
                            placeholder="e.g. 1 King Bed"
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                        </View>

                        <View style={tw`w-[48%]`}>
                          <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            MAX GUESTS
                          </Text>
                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-3 text-sm font-semibold mb-2`,
                              isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                            ]}
                            value={numberOfGuests}
                            onChangeText={setNumberOfGuests}
                            placeholder="e.g. 2 Guests"
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                        </View>
                      </View>

                      {/* Bed Type Quick Chips */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row -mt-2 mb-4`}>
                        {bedTypeOptions.map(bt => {
                          const isSelected = bedType.toLowerCase() === bt.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={bt}
                              onPress={() => setBedType(bt)}
                              style={[
                                tw`px-3 py-1.5 rounded-full mr-2 border`,
                                isSelected
                                  ? tw`bg-indigo-600 border-indigo-600`
                                  : isDark
                                    ? tw`bg-zinc-900 border-zinc-700`
                                    : tw`bg-white border-gray-300`,
                              ]}>
                              <Text style={[tw`text-xs font-semibold`, isSelected ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                {bt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* Room Size & Room View */}
                      <View style={tw`flex-row justify-between mb-4.5`}>
                        <View style={tw`w-[48%]`}>
                          <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            ROOM SIZE
                          </Text>
                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                              isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                            ]}
                            value={roomSize}
                            onChangeText={setRoomSize}
                            placeholder="e.g. 280 sq.ft"
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                        </View>

                        <View style={tw`w-[48%]`}>
                          <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            ROOM VIEW
                          </Text>
                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                              isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                            ]}
                            value={roomView}
                            onChangeText={setRoomView}
                            placeholder="e.g. City View"
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                        </View>
                      </View>

                      {/* Room View Quick Chips */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row -mt-2 mb-4`}>
                        {roomViewOptions.map(rv => {
                          const isSelected = roomView.toLowerCase() === rv.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={rv}
                              onPress={() => setRoomView(rv)}
                              style={[
                                tw`px-3 py-1.5 rounded-full mr-2 border`,
                                isSelected
                                  ? tw`bg-indigo-600 border-indigo-600`
                                  : isDark
                                    ? tw`bg-zinc-900 border-zinc-700`
                                    : tw`bg-white border-gray-300`,
                              ]}>
                              <Text style={[tw`text-xs font-semibold`, isSelected ? tw`text-white` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                {rv}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {/* Hotel Star Rating */}
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          HOTEL STAR RATING
                        </Text>
                        <View style={tw`flex-row`}>
                          {stayStarOptions.map(star => {
                            const isSelected = stayStarRating === star;
                            return (
                              <TouchableOpacity
                                key={star}
                                onPress={() => setStayStarRating(star)}
                                style={[
                                  tw`flex-row items-center px-4 py-2.5 rounded-xl mr-3 border`,
                                  isSelected
                                    ? tw`bg-amber-500 border-amber-500`
                                    : isDark
                                      ? tw`bg-zinc-900 border-zinc-700`
                                      : tw`bg-gray-50 border-gray-200`,
                                ]}>
                                <Text style={[tw`font-bold text-xs mr-1`, isSelected ? tw`text-white` : isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>
                                  {star} Star
                                </Text>
                                <Text style={isSelected ? tw`text-white` : tw`text-amber-500`}>{'★'.repeat(star)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Stay Perks & Key Policies (Toggles) */}
                      <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`]}>
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-3.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          KEY POLICIES & PERKS
                        </Text>

                        {/* Free Cancellation Toggle */}
                        <View style={tw`flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800`}>
                          <View style={tw`flex-1 mr-3`}>
                            <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-800`]}>Free Cancellation</Text>
                            <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Guest can cancel anytime before check-in for full refund</Text>
                          </View>
                          <Switch
                            value={freeCancellation}
                            onValueChange={setFreeCancellation}
                            trackColor={{ false: isDark ? '#3f3f46' : '#d1d5db', true: '#4f46e5' }}
                            thumbColor="#ffffff"
                          />
                        </View>

                        {/* Free Breakfast Included Toggle */}
                        <View style={tw`flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800`}>
                          <View style={tw`flex-1 mr-3`}>
                            <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-800`]}>Free Breakfast Included</Text>
                            <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Complimentary buffet / continental breakfast for guests</Text>
                          </View>
                          <Switch
                            value={freeBreakfast}
                            onValueChange={setFreeBreakfast}
                            trackColor={{ false: isDark ? '#3f3f46' : '#d1d5db', true: '#10b981' }}
                            thumbColor="#ffffff"
                          />
                        </View>

                        {/* Couple Friendly Toggle */}
                        <View style={tw`flex-row justify-between items-center py-2 border-b border-gray-200 dark:border-zinc-800`}>
                          <View style={tw`flex-1 mr-3`}>
                            <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-800`]}>Couple Friendly / Local ID Accepted</Text>
                            <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Unmarried couples and local identification allowed</Text>
                          </View>
                          <Switch
                            value={coupleFriendly}
                            onValueChange={setCoupleFriendly}
                            trackColor={{ false: isDark ? '#3f3f46' : '#d1d5db', true: '#ec4899' }}
                            thumbColor="#ffffff"
                          />
                        </View>

                        {/* Pay at Hotel Toggle */}
                        <View style={tw`flex-row justify-between items-center py-2`}>
                          <View style={tw`flex-1 mr-3`}>
                            <Text style={[tw`font-bold text-xs`, isDark ? tw`text-white` : tw`text-gray-800`]}>Pay at Hotel Available</Text>
                            <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Guests can pay cash/card during check-in</Text>
                          </View>
                          <Switch
                            value={payAtHotel}
                            onValueChange={setPayAtHotel}
                            trackColor={{ false: isDark ? '#3f3f46' : '#d1d5db', true: '#6366f1' }}
                            thumbColor="#ffffff"
                          />
                        </View>
                      </View>

                      {/* Stay Available Amenities */}
                      <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`]}>
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-3.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          AVAILABLE HOTEL & ROOM AMENITIES
                        </Text>

                        <View style={tw`flex-row flex-wrap justify-between`}>
                          {stayAmenityOptions.map((amenity) => {
                            const isChecked = selectedAmenities.includes(amenity);
                            return (
                              <TouchableOpacity
                                key={amenity}
                                activeOpacity={0.7}
                                onPress={() => toggleAmenity(amenity)}
                                style={tw`w-[48%] flex-row items-center mb-3`}>
                                <View
                                  style={[
                                    tw`w-4.5 h-4.5 rounded items-center justify-center mr-2.5 border`,
                                    isChecked
                                      ? tw`bg-indigo-600 border-indigo-600`
                                      : isDark
                                        ? tw`border-zinc-700 bg-zinc-900`
                                        : tw`border-gray-300 bg-white`,
                                  ]}>
                                  {isChecked && <Text style={tw`text-white font-bold text-[10px]`}>✓</Text>}
                                </View>
                                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]} numberOfLines={1}>
                                  {amenity}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  )}

                  {/* Quantity Unit & Available Stock (Inventory for Products, Food, Daily Needs; Seats for Travel) */}
                  {!['Stay', 'Services'].includes(newItemCategory) && (
                    newItemCategory === 'Travel' ? (
                      <View style={tw`mb-4.5`}>
                        <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                          TOTAL SEATS / CAPACITY
                        </Text>
                        <TextInput
                          style={[
                            tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                            isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                          ]}
                          value={newItemStock}
                          onChangeText={setNewItemStock}
                          placeholder="e.g. 40"
                          keyboardType="numeric"
                          placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                        />
                      </View>
                    ) : (
                      <View style={tw`flex-row justify-between mb-4.5`}>
                        <View style={tw`w-[48%]`}>
                          <DropdownSelector
                            label="Quantity Unit"
                            value={newItemUnit}
                            options={quantityUnitOptions}
                            onSelect={setNewItemUnit}
                            isDark={isDark}
                            placeholder="Select Unit"
                          />
                        </View>
                        <View style={tw`w-[48%]`}>
                          <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Stock / Quantity</Text>
                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                              isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                            ]}
                            value={newItemStock}
                            onChangeText={setNewItemStock}
                            placeholder="10"
                            keyboardType="numeric"
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                        </View>
                      </View>
                    )
                  )}

                  {/* Pin Code */}
                  <View style={tw`mb-4.5`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Pin Code</Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={newItemPinCode}
                      onChangeText={setNewItemPinCode}
                      placeholder="e.g. 600001"
                      keyboardType="numeric"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>

                  {/* AVAILABLE AMENITIES & BUS ROUTE DETAILS (strictly for Travel category only) */}
                  {newItemCategory === 'Travel' && (
                    <>
                      {/* 📍 ROUTE DETAILS */}
                      <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`]}>
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-3.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          📍 ROUTE (ORIGIN ➔ DESTINATION)
                        </Text>

                        <View style={tw`flex-row justify-between mb-3`}>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              FROM CITY (ORIGIN)
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={travelFromCity}
                              onChangeText={setTravelFromCity}
                              placeholder="e.g. Bangalore"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              TO CITY (DESTINATION)
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={travelToCity}
                              onChangeText={setTravelToCity}
                              placeholder="e.g. Chennai"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                        </View>

                        {/* Popular Route Presets */}
                        <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                          QUICK ROUTE PRESETS:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
                          {[
                            { from: 'Bangalore', to: 'Chennai' },
                            { from: 'Bangalore', to: 'Hyderabad' },
                            { from: 'Bangalore', to: 'Coimbatore' },
                            { from: 'Chennai', to: 'Bangalore' },
                            { from: 'Bangalore', to: 'Goa' },
                            { from: 'Bangalore', to: 'Mysore' },
                          ].map(preset => {
                            const isSelected = travelFromCity.toLowerCase() === preset.from.toLowerCase() && travelToCity.toLowerCase() === preset.to.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={`${preset.from}-${preset.to}`}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setTravelFromCity(preset.from);
                                  setTravelToCity(preset.to);
                                }}
                                style={[
                                  tw`px-3 py-1.5 rounded-lg mr-2 border`,
                                  isSelected
                                    ? tw`bg-amber-500 border-amber-500`
                                    : isDark
                                      ? tw`bg-zinc-900 border-zinc-800`
                                      : tw`bg-gray-100 border-gray-200`,
                                ]}>
                                <Text style={[tw`text-[10px] font-bold`, isSelected ? tw`text-zinc-950` : isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                                  {preset.from} ➔ {preset.to}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {/* TIMINGS & DURATION */}
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-3`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          ⏰ TIMINGS & DURATION
                        </Text>
                        <View style={tw`flex-row justify-between mb-2`}>
                          <View style={tw`w-[31%]`}>
                            <Text style={[tw`font-bold text-[9px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              DEPARTURE
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-2.5 py-2 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={boardingTime}
                              onChangeText={setBoardingTime}
                              placeholder="21:30"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[31%]`}>
                            <Text style={[tw`font-bold text-[9px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              ARRIVAL
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-2.5 py-2 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={arrivalTime}
                              onChangeText={setArrivalTime}
                              placeholder="05:30"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[31%]`}>
                            <Text style={[tw`font-bold text-[9px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              DURATION
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-2.5 py-2 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={travelDuration}
                              onChangeText={setTravelDuration}
                              placeholder="8h 00m"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                        </View>
                      </View>

                      {/* AVAILABLE AMENITIES (Customer App Aligned) */}
                      <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`]}>
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-3.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          AVAILABLE AMENITIES
                        </Text>

                        <View style={tw`flex-row flex-wrap justify-between`}>
                          {[
                            'AC Sleeper',
                            'Live GPS',
                            'Charging Point',
                            'Blanket',
                            'Water Bottle',
                            'Free Wi-Fi',
                            'Washroom Onboard',
                            'CCTV',
                            'Emergency Button',
                            'Reading Light',
                          ].map((amenity) => {
                            const isChecked = selectedAmenities.includes(amenity);
                            return (
                              <TouchableOpacity
                                key={amenity}
                                activeOpacity={0.7}
                                onPress={() => toggleAmenity(amenity)}
                                style={tw`w-[48%] flex-row items-center mb-3`}>
                                <View
                                  style={[
                                    tw`w-4.5 h-4.5 rounded items-center justify-center mr-2.5 border`,
                                    isChecked
                                      ? tw`bg-indigo-600 border-indigo-600`
                                      : isDark
                                        ? tw`border-zinc-700 bg-zinc-900`
                                        : tw`border-gray-300 bg-white`,
                                  ]}>
                                  {isChecked && <Text style={tw`text-white font-bold text-[10px]`}>✓</Text>}
                                </View>
                                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]} numberOfLines={1}>
                                  {amenity}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* 🚌 BOARDING & DROPPING DETAILS */}
                      <View style={[tw`rounded-2xl p-4 mb-5 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`]}>
                        <Text style={[tw`font-extrabold text-xs uppercase tracking-wider mb-4 flex-row items-center`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                          🚌 BOARDING & DROPPING STOPS
                        </Text>

                        {/* Boarding Point & Time */}
                        <View style={tw`flex-row justify-between mb-3`}>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              PRIMARY BOARDING STOP
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={boardingPoint}
                              onChangeText={setBoardingPoint}
                              placeholder="e.g. Majestic Bus Station"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              PICKUP TIME
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={boardingTime}
                              onChangeText={setBoardingTime}
                              placeholder="e.g. 21:30"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                        </View>

                        {/* Dynamic Additional Boarding Points Rows */}
                        {additionalBoardingPoints.map((bp, idx) => (
                          <View key={`bp-${idx}`} style={tw`flex-row justify-between items-center mb-2.5`}>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[46%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={bp.point}
                              onChangeText={(val) => handleUpdateBoardingPoint(idx, 'point', val)}
                              placeholder={`Boarding Point ${idx + 2}`}
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[38%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={bp.time}
                              onChangeText={(val) => handleUpdateBoardingPoint(idx, 'time', val)}
                              placeholder="Time (e.g. 22:00)"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TouchableOpacity
                              onPress={() => handleRemoveBoardingPoint(idx)}
                              style={tw`p-2 rounded-lg bg-red-500/10`}>
                              <X size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}

                        {/* + Add Boarding Point Button */}
                        <TouchableOpacity
                          onPress={handleAddBoardingPoint}
                          style={tw`mb-4 py-1.5 px-3 rounded-lg border border-dashed border-indigo-400 bg-indigo-500/10 flex-row items-center justify-center self-start`}>
                          <Plus size={12} color="#6366F1" style={tw`mr-1`} />
                          <Text style={tw`text-indigo-600 font-bold text-[10px]`}>+ Add Boarding Point</Text>
                        </TouchableOpacity>

                        {/* Drop Point & Arrival Time */}
                        <View style={tw`flex-row justify-between mb-3`}>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              DROP POINT (TO)
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={dropPoint}
                              onChangeText={setDropPoint}
                              placeholder="e.g. Chennai (Koyambedu...)"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              DROP / ARRIVAL TIME
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={arrivalTime}
                              onChangeText={setArrivalTime}
                              placeholder="e.g. 06:00 AM"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                        </View>

                        {/* Dynamic Additional Drop Points Rows */}
                        {additionalDropPoints.map((dp, idx) => (
                          <View key={`dp-${idx}`} style={tw`flex-row justify-between items-center mb-2.5`}>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[46%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={dp.point}
                              onChangeText={(val) => handleUpdateDropPoint(idx, 'point', val)}
                              placeholder={`Drop Point ${idx + 2}`}
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[38%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={dp.time}
                              onChangeText={(val) => handleUpdateDropPoint(idx, 'time', val)}
                              placeholder="Time (e.g. 06:30)"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TouchableOpacity
                              onPress={() => handleRemoveDropPoint(idx)}
                              style={tw`p-2 rounded-lg bg-red-500/10`}>
                              <X size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}

                        {/* + Add Drop Point Button */}
                        <TouchableOpacity
                          onPress={handleAddDropPoint}
                          style={tw`mb-4 py-1.5 px-3 rounded-lg border border-dashed border-indigo-400 bg-indigo-500/10 flex-row items-center justify-center self-start`}>
                          <Plus size={12} color="#6366F1" style={tw`mr-1`} />
                          <Text style={tw`text-indigo-600 font-bold text-[10px]`}>+ Add Drop Point</Text>
                        </TouchableOpacity>

                        {/* Total Distance & Bus Schedule */}
                        <View style={tw`flex-row justify-between mb-4`}>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              TOTAL DISTANCE
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={totalDistance}
                              onChangeText={setTotalDistance}
                              placeholder="e.g. 350 km"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                          <View style={tw`w-[48%]`}>
                            <Text style={[tw`font-bold text-[10px] uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                              BUS TIMING / SCHEDULE
                            </Text>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={busSchedule}
                              onChangeText={setBusSchedule}
                              placeholder="e.g. 8h 30m (Daily 21:30 - ...)"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                          </View>
                        </View>

                        {/* Route Stoppings & Timings Header */}
                        <View style={tw`flex-row justify-between items-center mt-1 mb-3`}>
                          <Text style={[tw`font-bold text-[10px] uppercase tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            ROUTE STOPPINGS & TIMINGS
                          </Text>
                          <TouchableOpacity
                            onPress={handleAddStop}
                            style={tw`px-3 py-1 rounded-lg bg-indigo-600 flex-row items-center`}>
                            <Plus size={12} color="#FFFFFF" style={tw`mr-1`} />
                            <Text style={tw`text-white font-bold text-[10px]`}>+ Add Stop</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Dynamic Route Stops Rows */}
                        {routeStops.map((stop, idx) => (
                          <View key={idx} style={tw`flex-row justify-between items-center mb-2.5`}>
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[45%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={stop.stopName}
                              onChangeText={(val) => handleUpdateStop(idx, 'stopName', val)}
                              placeholder={`Stop ${idx + 1} Name`}
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TextInput
                              style={[
                                tw`border rounded-xl px-3 py-2 text-xs font-semibold w-[38%]`,
                                isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                              ]}
                              value={stop.time}
                              onChangeText={(val) => handleUpdateStop(idx, 'time', val)}
                              placeholder="Time e.g. 23:45"
                              placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                            />
                            <TouchableOpacity
                              onPress={() => handleRemoveStop(idx)}
                              style={tw`p-2 rounded-lg bg-red-500/10`}>
                              <X size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Availability Status switch */}
                  <View style={[tw`flex-row items-center justify-between p-3 rounded-xl mb-5`, isDark ? tw`bg-zinc-950` : tw`bg-gray-50`]}>
                    <View>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Availability Status</Text>
                      <Text style={[tw`text-xs font-semibold mt-0.5`, newItemIsActive ? tw`text-green-600` : tw`text-red-500`]}>
                        {newItemIsActive ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                    <Switch
                      value={newItemIsActive}
                      onValueChange={setNewItemIsActive}
                      trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                      thumbColor={newItemIsActive ? '#4F46E5' : '#9CA3AF'}
                    />
                  </View>

                  {/* Product Image / Photo */}
                  <View style={tw`mb-6`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      {newItemCategory === 'Stay' ? 'Room Photo' : newItemCategory === 'Travel' ? 'Vehicle Photo' : `${getCategoryUnitLabel(newItemCategory)} Image / Photo`}
                    </Text>

                    <View style={tw`flex-row items-center`}>
                      {isUploading ? (
                        <View style={[tw`flex-row items-center p-3 rounded-xl flex-1 border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-100 border-gray-200`]}>
                          <ActivityIndicator size="small" color="#4F46E5" style={tw`mr-3`} />
                          <View style={tw`flex-1`}>
                            <View style={tw`flex-row justify-between items-center mb-1`}>
                              <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-700`]}>Uploading Photo...</Text>
                              <Text style={[tw`text-xs font-black`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>{uploadProgress}%</Text>
                            </View>
                            <View style={[tw`h-1.5 w-full rounded-full overflow-hidden`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]}>
                              <View style={[tw`h-full rounded-full bg-indigo-650`, { width: `${uploadProgress}%` }]} />
                            </View>
                          </View>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            onPress={simulateChooseFile}
                            style={[tw`px-4 py-2.5 rounded-lg border border-gray-300 mr-3 flex-row items-center bg-gray-100`, isDark && tw`bg-zinc-800 border-zinc-700`]}>
                            <Camera size={16} color={isDark ? '#A1A1AA' : '#4B5563'} style={tw`mr-1.5`} />
                            <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-700`]}>Choose File</Text>
                          </TouchableOpacity>
                          <Text style={[tw`text-xs font-medium flex-1`, chosenImage ? tw`text-green-600` : tw`text-gray-400`]} numberOfLines={1}>
                            {chosenImage ? 'Image chosen successfully ✅' : 'No file chosen'}
                          </Text>
                        </>
                      )}
                    </View>
                    {chosenImage && !isUploading ? (
                      <Image source={{ uri: chosenImage }} style={tw`w-20 h-20 rounded-xl mt-3 bg-gray-100`} />
                    ) : null}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddItem}
              style={[
                tw`py-3.5 rounded-2xl items-center justify-center`,
                { backgroundColor: '#4F46E5' },
              ]}>
              <Text style={tw`text-white font-bold text-base`}>
                {modalType === 'business' ? 'Save Business' : (isEditing ? `Update ${getCategoryUnitLabel(newItemCategory)}` : `Save ${getCategoryUnitLabel(newItemCategory)}`)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Individual Listing Offer Creation / Edit Modal */}
      {isOfferModalVisible && selectedOfferItem && (() => {
        const basePrice = getOfferBasePrice(selectedOfferItem);
        const { finalPrice, discountAmount, isValid, error } = calculateOfferFinalPrice(
          basePrice,
          offerDiscountType,
          offerDiscountValue
        );

        return (
          <View style={[tw`absolute inset-0 justify-end`, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1500, elevation: 1500 }]}>
            <View style={[tw`rounded-t-3xl px-5 pt-5 pb-8 max-h-[92%]`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
              {/* Header */}
              <View style={tw`flex-row justify-between items-start mb-4`}>
                <View style={tw`flex-1 mr-3`}>
                  <View style={tw`flex-row items-center mb-1`}>
                    <Tag size={16} color="#4F46E5" style={tw`mr-1.5`} />
                    <Text style={[tw`text-xs font-bold uppercase tracking-wider text-indigo-600`]}>
                      Listing Promotional Offer
                    </Text>
                  </View>
                  <Text style={[tw`text-lg font-black`, isDark ? tw`text-white` : tw`text-gray-900`]} numberOfLines={1}>
                    {selectedOfferItem.name}
                  </Text>
                  <Text style={[tw`text-xs font-semibold mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    Category: {selectedOfferItem.category} • Base Price: ₹{basePrice.toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsOfferModalVisible(false)}
                  style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                  <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={tw`mb-4`}>
                {/* Offer Title (Free text) */}
                <View style={tw`mb-4`}>
                  <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    OFFER TITLE <Text style={tw`text-red-500`}>*</Text>
                  </Text>
                  <TextInput
                    value={offerTitle}
                    onChangeText={setOfferTitle}
                    placeholder="e.g. Diwali Mega Sale, Weekend Special, Flat 20% Off"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    style={[
                      tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                      isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                    ]}
                  />
                  <Text style={[tw`text-[10px] mt-1 font-medium`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                    Free-text title displayed prominently on customer cards and checkout.
                  </Text>
                </View>

                {/* Offer Description (Free text) */}
                <View style={tw`mb-4`}>
                  <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    OFFER DESCRIPTION (OPTIONAL)
                  </Text>
                  <TextInput
                    value={offerDescription}
                    onChangeText={setOfferDescription}
                    placeholder="e.g. Limited festive period discount. Valid till stock lasts."
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    multiline
                    numberOfLines={2}
                    style={[
                      tw`border rounded-xl px-4 py-2.5 text-sm font-medium`,
                      isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                    ]}
                  />
                </View>

                {/* Discount Type Selector */}
                <View style={tw`mb-4`}>
                  <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    DISCOUNT TYPE
                  </Text>
                  <View style={tw`flex-row gap-2`}>
                    {[
                      { key: 'percentage' as const, label: 'Percentage (%)', desc: 'e.g. 20% Off' },
                      { key: 'fixed' as const, label: 'Fixed (₹ Off)', desc: 'e.g. ₹100 Off' },
                      { key: 'promotional' as const, label: 'Special Promo (₹)', desc: 'Flat Discount' },
                    ].map(t => {
                      const isSelected = offerDiscountType === t.key;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          onPress={() => setOfferDiscountType(t.key)}
                          style={[
                            tw`flex-1 p-2.5 rounded-xl border items-center justify-center`,
                            isSelected
                              ? (isDark ? tw`bg-indigo-950/80 border-indigo-500` : tw`bg-indigo-50 border-indigo-600`)
                              : (isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-white border-gray-200`),
                          ]}>
                          <Text
                            style={[
                              tw`text-xs font-bold text-center`,
                              isSelected ? tw`text-indigo-600` : (isDark ? tw`text-zinc-300` : tw`text-gray-700`),
                            ]}>
                            {t.label}
                          </Text>
                          <Text style={[tw`text-[10px] mt-0.5`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                            {t.desc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Discount Value Input & Live Preview */}
                <View style={tw`mb-4`}>
                  <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    DISCOUNT VALUE ({offerDiscountType === 'percentage' ? '%' : '₹'}) <Text style={tw`text-red-500`}>*</Text>
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <TextInput
                      value={offerDiscountValue}
                      onChangeText={setOfferDiscountValue}
                      keyboardType="numeric"
                      placeholder={offerDiscountType === 'percentage' ? 'e.g. 20' : 'e.g. 150'}
                      placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-bold flex-1`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                    />
                    <View style={[tw`ml-3 px-3.5 py-3 rounded-xl border`, isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-100 border-gray-200`]}>
                      <Text style={[tw`font-black text-sm`, isDark ? tw`text-white` : tw`text-gray-800`]}>
                        {offerDiscountType === 'percentage' ? '%' : '₹'}
                      </Text>
                    </View>
                  </View>

                  {/* Real-time Dynamic Calculation Preview Card */}
                  <View style={[tw`mt-3 p-3.5 rounded-2xl border`, isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-indigo-50/50 border-indigo-100`]}>
                    <Text style={[tw`text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2`]}>
                      Live Pricing Preview
                    </Text>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Original Base Price:</Text>
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>₹{basePrice.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={[tw`text-xs`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Discount Amount:</Text>
                      <Text style={[tw`text-xs font-semibold text-rose-500`]}>- ₹{discountAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={[tw`w-full h-px my-1.5`, isDark ? tw`bg-zinc-800` : tw`bg-indigo-200`]}>
                    </View>
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={[tw`text-sm font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>Final Offer Price:</Text>
                      <Text style={[tw`text-base font-black text-emerald-600`]}>₹{finalPrice.toLocaleString('en-IN')}</Text>
                    </View>
                    {error && (
                      <Text style={tw`text-[11px] text-red-500 font-semibold mt-1.5`}>
                        ⚠️ {error}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Offer Validity Schedule */}
                <View style={tw`mb-4`}>
                  <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                    VALIDITY PERIOD (YYYY-MM-DD)
                  </Text>
                  <View style={tw`flex-row gap-2 mb-2`}>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Start Date</Text>
                      <TextInput
                        value={offerStartDate}
                        onChangeText={setOfferStartDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        style={[
                          tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>End Date</Text>
                      <TextInput
                        value={offerEndDate}
                        onChangeText={setOfferEndDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        style={[
                          tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                      />
                    </View>
                  </View>

                  <View style={tw`flex-row gap-2`}>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Start Time</Text>
                      <TextInput
                        value={offerStartTime}
                        onChangeText={setOfferStartTime}
                        placeholder="09:00"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        style={[
                          tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[11px] font-semibold mb-1`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>End Time</Text>
                      <TextInput
                        value={offerEndTime}
                        onChangeText={setOfferEndTime}
                        placeholder="21:00"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        style={[
                          tw`border rounded-xl px-3 py-2.5 text-xs font-semibold`,
                          isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={tw`flex-row gap-3 pt-2`}>
                {selectedOfferItem.offer?.isActive && (
                  <TouchableOpacity
                    onPress={handleRemoveOffer}
                    disabled={offerSubmitting}
                    style={[tw`py-3 px-4 rounded-2xl items-center justify-center border border-red-300`, isDark ? tw`bg-red-950/40` : tw`bg-red-50`]}>
                    <Text style={tw`text-red-600 font-bold text-xs`}>Remove Offer</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleSaveOffer}
                  disabled={offerSubmitting || !isValid}
                  style={[
                    tw`flex-1 py-3.5 rounded-2xl items-center justify-center`,
                    { backgroundColor: isValid && !offerSubmitting ? '#4F46E5' : '#9CA3AF' },
                  ]}>
                  {offerSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={tw`text-white font-bold text-sm`}>
                      {selectedOfferItem.offer?.isActive ? 'Update Offer' : 'Apply Offer'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Upload Options Modal */}
      {isUploadModalVisible && (
        <View style={[tw`absolute inset-0 justify-end`, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, elevation: 2000 }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsUploadModalVisible(false)}
            style={tw`absolute inset-0`}
          />
          <View style={[tw`rounded-t-3xl p-6`, isDark ? tw`bg-zinc-900` : tw`bg-white`]}>
            <Text style={[tw`text-lg font-bold text-center mb-5`, isDark ? tw`text-white` : tw`text-gray-900`]}>Upload Option</Text>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={[tw`py-4 px-5 rounded-2xl flex-row items-center mb-3`, isDark ? tw`bg-zinc-800` : tw`bg-gray-50`]}>
              <Camera size={20} color="#4F46E5" style={tw`mr-3`} />
              <Text style={[tw`text-sm font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>Take Photo (Camera)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleChooseFromLibrary}
              style={[tw`py-4 px-5 rounded-2xl flex-row items-center mb-4`, isDark ? tw`bg-zinc-800` : tw`bg-gray-50`]}>
              <LucideImage size={20} color="#16A34A" style={tw`mr-3`} />
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-bold`, isDark ? tw`text-white` : tw`text-gray-800`]}>Choose from Library (Gallery)</Text>
                <Text style={[tw`text-[11px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Select photos saved on device / emulator</Text>
              </View>
            </TouchableOpacity>



            <View style={[tw`p-3 rounded-xl mb-4 flex-row items-center`, isDark ? tw`bg-indigo-950/40 border border-indigo-900/60` : tw`bg-indigo-50 border border-indigo-100`]}>
              <Text style={tw`text-xs mr-2`}>💡</Text>
              <Text style={[tw`text-[11px] font-medium flex-1`, isDark ? tw`text-indigo-300` : tw`text-indigo-800`]}>
                Laptop files: Drag & drop any photo from your laptop onto the emulator screen, then pick from Gallery!
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsUploadModalVisible(false)}
              style={[tw`py-3.5 rounded-2xl items-center justify-center border`, isDark ? tw`border-zinc-700 bg-zinc-850` : tw`border-gray-200 bg-gray-100`]}>
              <Text style={[tw`text-sm font-bold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Calendar DatePicker Modal */}
      {isDatePickerVisible && (
        <View style={[tw`absolute inset-0 justify-center items-center p-4`, { backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 2500, elevation: 2500 }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsDatePickerVisible(false)}
            style={tw`absolute inset-0`}
          />
          <View style={[tw`w-full max-w-sm rounded-3xl p-5 shadow-2xl`, isDark ? tw`bg-zinc-900 border border-zinc-800` : tw`bg-white`]}>
            {/* Calendar Header */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <TouchableOpacity
                onPress={() => {
                  const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                  setCalendarMonth(prevMonth);
                }}
                style={[tw`w-9 h-9 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <ChevronLeft size={18} color={isDark ? '#e4e4e7' : '#374151'} />
              </TouchableOpacity>

              <Text style={[tw`text-base font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                  setCalendarMonth(nextMonth);
                }}
                style={[tw`w-9 h-9 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <ChevronRight size={18} color={isDark ? '#e4e4e7' : '#374151'} />
              </TouchableOpacity>
            </View>

            {/* Days of week */}
            <View style={tw`flex-row justify-between mb-2`}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, idx) => (
                <Text key={idx} style={[tw`text-xs font-bold text-center w-9`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Days grid */}
            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDayOfWeek = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];

              for (let i = 0; i < firstDayOfWeek; i++) {
                cells.push(null);
              }
              for (let day = 1; day <= daysInMonth; day++) {
                cells.push(day);
              }

              // Group into weeks of 7
              const weeks = [];
              for (let i = 0; i < cells.length; i += 7) {
                weeks.push(cells.slice(i, i + 7));
              }

              return (
                <View>
                  {weeks.map((week, wIdx) => (
                    <View key={wIdx} style={tw`flex-row justify-between mb-1.5`}>
                      {week.map((d, dIdx) => {
                        if (!d) {
                          return <View key={dIdx} style={tw`w-9 h-9`} />;
                        }
                        const formatted = `${String(month + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`;
                        const isSelected = deadlineDate === formatted;
                        return (
                          <TouchableOpacity
                            key={dIdx}
                            onPress={() => {
                              setDeadlineDate(formatted);
                              setIsDatePickerVisible(false);
                            }}
                            style={[
                              tw`w-9 h-9 rounded-full items-center justify-center`,
                              isSelected
                                ? { backgroundColor: '#4F46E5' }
                                : isDark
                                ? tw`bg-zinc-800/40`
                                : tw`bg-gray-50`,
                            ]}>
                            <Text
                              style={[
                                tw`text-xs font-semibold`,
                                isSelected
                                  ? tw`text-white font-bold`
                                  : isDark
                                  ? tw`text-zinc-200`
                                  : tw`text-gray-800`,
                              ]}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {Array.from({ length: 7 - week.length }).map((_, padIdx) => (
                        <View key={`pad-${padIdx}`} style={tw`w-9 h-9`} />
                      ))}
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Footer Buttons */}
            <View style={[tw`flex-row justify-between mt-4 pt-3 border-t`, isDark ? tw`border-zinc-800` : tw`border-gray-100`]}>
              <TouchableOpacity
                onPress={() => {
                  const today = new Date();
                  const formatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
                  setDeadlineDate(formatted);
                  setIsDatePickerVisible(false);
                }}
                style={[tw`px-4 py-2 rounded-xl`, isDark ? tw`bg-zinc-800` : tw`bg-indigo-50`]}>
                <Text style={[tw`text-xs font-bold`, isDark ? tw`text-indigo-400` : tw`text-indigo-600`]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsDatePickerVisible(false)}
                style={[tw`px-4 py-2 rounded-xl`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}
