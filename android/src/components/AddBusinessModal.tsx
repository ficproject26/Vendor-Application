import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import tw from 'twrnc';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Shield,
  Info,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  createBusiness,
  uploadImageToServer,
  fetchMainCategories,
  isValidIndianPincode,
  normalizeCategory,
} from '../services/apiService';

// Document requirements schema per category (Admin Main Categories)
interface CategoryDocRule {
  key: string;
  label: string;
  required: boolean;
  numberPlaceholder?: string;
}

const CATEGORY_DOC_CONFIG: Record<string, CategoryDocRule[]> = {
  Food: [
    { key: 'fssai_license', label: 'Food Safety License (FSSAI)', required: true, numberPlaceholder: 'e.g. 10012345678901' },
  ],
  Restaurant: [
    { key: 'fssai_license', label: 'Food Safety License (FSSAI)', required: true, numberPlaceholder: 'e.g. 10012345678901' },
  ],
  'Daily Needs': [
    { key: 'fssai_license', label: 'Food Safety License (if applicable)', required: false, numberPlaceholder: 'e.g. 10012345678901' },
    { key: 'trade_license', label: 'Trade / Shop License', required: false, numberPlaceholder: 'e.g. TR-987654' },
  ],
  Grocery: [
    { key: 'fssai_license', label: 'Food Safety License (if applicable)', required: false, numberPlaceholder: 'e.g. 10012345678901' },
    { key: 'trade_license', label: 'Trade / Shop License', required: false, numberPlaceholder: 'e.g. TR-987654' },
  ],
  Electronics: [
    { key: 'bis_certificate', label: 'BIS / CRS Registration Certificate', required: true, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade / Shop License', required: false, numberPlaceholder: 'e.g. TRD-45678' },
  ],
  Electronic: [
    { key: 'bis_certificate', label: 'BIS / CRS Registration Certificate', required: true, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade / Shop License', required: false, numberPlaceholder: 'e.g. TRD-45678' },
  ],
  Product: [
    { key: 'bis_certificate', label: 'BIS / CRS / Product Certificate', required: false, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade License', required: false, numberPlaceholder: 'e.g. TRD-45678' },
  ],
  Products: [
    { key: 'bis_certificate', label: 'BIS / CRS / Product Certificate', required: false, numberPlaceholder: 'e.g. BIS-REG-1234' },
    { key: 'trade_license', label: 'Trade License', required: false, numberPlaceholder: 'e.g. TRD-45678' },
  ],
  Travel: [
    { key: 'vehicle_rc', label: 'Vehicle Registration Certificate (RC)', required: true, numberPlaceholder: 'e.g. TN29AB1234' },
    { key: 'vehicle_fitness', label: 'Vehicle Fitness Certificate', required: true, numberPlaceholder: 'e.g. FC-987654' },
    { key: 'transport_permit', label: 'Transport / Route Permit', required: true, numberPlaceholder: 'e.g. PERMIT-4567' },
  ],
  Stay: [
    { key: 'fire_noc', label: 'Fire Safety NOC', required: false, numberPlaceholder: 'e.g. NOC-2026-FIRE' },
    { key: 'property_reg', label: 'Property / Hotel Registration', required: false, numberPlaceholder: 'e.g. STAY-REG-9876' },
  ],
  Jobs: [
    { key: 'company_reg', label: 'Company Registration / Incorporation Certificate', required: true, numberPlaceholder: 'e.g. CIN / REG-12345' },
    { key: 'labour_license', label: 'Labour / Contract License', required: false, numberPlaceholder: 'e.g. LAB-56789' },
  ],
  Job: [
    { key: 'company_reg', label: 'Company Registration / Incorporation Certificate', required: true, numberPlaceholder: 'e.g. CIN / REG-12345' },
    { key: 'labour_license', label: 'Labour / Contract License', required: false, numberPlaceholder: 'e.g. LAB-56789' },
  ],
  Services: [
    { key: 'service_cert', label: 'Service / Professional Certification', required: false, numberPlaceholder: 'e.g. CERT-SERVICE-12' },
  ],
  Service: [
    { key: 'service_cert', label: 'Service / Professional Certification', required: false, numberPlaceholder: 'e.g. CERT-SERVICE-12' },
  ],
};

const getCategoryDocRules = (category: string): CategoryDocRule[] => {
  if (!category) return [];
  if (CATEGORY_DOC_CONFIG[category]) return CATEGORY_DOC_CONFIG[category];
  const singular = category.endsWith('s') && !['Daily Needs'].includes(category)
    ? category.slice(0, -1)
    : category;
  if (CATEGORY_DOC_CONFIG[singular]) return CATEGORY_DOC_CONFIG[singular];
  const plural = category + 's';
  if (CATEGORY_DOC_CONFIG[plural]) return CATEGORY_DOC_CONFIG[plural];
  return CATEGORY_DOC_CONFIG.Products || [];
};

// Admin Main Categories default fallback
const DEFAULT_ADMIN_CATEGORIES = [
  'Products',
  'Services',
  'Food',
  'Daily Needs',
  'Stay',
  'Travel',
  'Jobs',
  'Electronics',
];

// Normalization & Validation utilities (exact website match)
const normalizeName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/^\s+/, '')
    .replace(/\s+$/, '')
    .replace(/\s+/g, ' ')
    .replace(/(?:^|\s|[-.'])\p{L}/gu, (char) => char.toUpperCase());
};

const normalizeIndianMobile = (mobile: string): string => {
  if (!mobile || typeof mobile !== 'string') return '';
  let clean = mobile.trim();
  if (clean.startsWith('+91')) {
    clean = clean.slice(3).trim();
  } else if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.slice(2).trim();
  }
  return clean.replace(/\D/g, '').slice(0, 10);
};

const validateIndianMobile = (mobile: string, fieldLabel = 'Mobile Number', required = true): string => {
  if (!mobile || !String(mobile).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  let clean = normalizeIndianMobile(mobile);
  if (/[^\d]/.test(clean)) {
    return `${fieldLabel} must contain numeric digits only`;
  }
  if (clean.length !== 10) {
    return `${fieldLabel} must be exactly 10 digits`;
  }
  if (!/^[6-9]/.test(clean)) {
    return `${fieldLabel} must start with 6, 7, 8, or 9`;
  }
  return '';
};

const normalizePAN = (pan: string): string => {
  if (!pan || typeof pan !== 'string') return '';
  return pan.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
};

const validatePAN = (pan: string, fieldLabel = 'PAN Card Number', required = true): string => {
  if (!pan || !String(pan).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = normalizePAN(pan);
  if (clean.length !== 10) {
    return `${fieldLabel} must be exactly 10 characters`;
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
    return 'Enter a valid 10-character PAN number (e.g. ABCDE1234F)';
  }
  return '';
};

const normalizeAadhaar = (aadhaar: string): string => {
  if (!aadhaar || typeof aadhaar !== 'string') return '';
  return aadhaar.replace(/\D/g, '').slice(0, 12);
};

const validateAadhaar = (aadhaar: string, fieldLabel = 'Aadhaar Number', required = true): string => {
  if (!aadhaar || !String(aadhaar).trim()) {
    if (required) return `${fieldLabel} is required`;
    return '';
  }
  const clean = normalizeAadhaar(aadhaar);
  if (clean.length !== 12) {
    return `${fieldLabel} must be exactly 12 numeric digits`;
  }
  return '';
};

export interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess?: (resData: any) => void;
  isDark?: boolean;
}

export default function AddBusinessModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  isDark = false,
}: AddBusinessModalProps) {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    assignedAdmin?: any;
    businessName: string;
    pincode: string;
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const selectedCategoryRef = useRef<string>('');

  const [adminCategories, setAdminCategories] = useState<string[]>(DEFAULT_ADMIN_CATEGORIES);

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    vendorType: '',
    category: '',
    doorNo: '',
    village: '',
    taluk: '',
    district: '',
    state: 'Tamil Nadu',
    pincode: '',
    phone: '',
    panNo: '',
    panDoc: '',
    panDocName: '',
    aadhaarNo: '',
    aadhaarDoc: '',
    aadhaarDocName: '',
    gstNumber: '',
    gstDoc: '',
    gstDocName: '',
    categoryDocs: {} as Record<string, {
      docNumber: string;
      docUrl: string;
      fileName: string;
      label: string;
      required: boolean;
    }>,
  });

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFormError('');
  };

  // Fetch admin-added main categories dynamically from backend
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const fetched = await fetchMainCategories();
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          const merged = [...fetched];
          DEFAULT_ADMIN_CATEGORIES.forEach((c) => {
            if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) {
              merged.push(c);
            }
          });
          setAdminCategories(merged);
        }
      } catch (err) {
        console.warn('Failed to fetch admin categories, using defaults:', err);
      }
    };
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset form when modal opens
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep(1);
      setFormError('');
      setFieldErrors({});
      setSuccessInfo(null);
      setSelectedCategory('');
      selectedCategoryRef.current = '';
      setFormData({
        businessName: '',
        vendorType: '',
        category: '',
        doorNo: '',
        village: '',
        taluk: '',
        district: '',
        state: 'Tamil Nadu',
        pincode: '',
        phone: user?.phone || user?.mobileNumber || user?.telephone || '',
        panNo: user?.panNo || '',
        panDoc: user?.panDoc || '',
        panDocName: user?.panDoc ? 'Existing PAN Doc' : '',
        aadhaarNo: user?.aadhaarNo || '',
        aadhaarDoc: user?.aadhaarDoc || '',
        aadhaarDocName: user?.aadhaarDoc ? 'Existing Aadhaar Doc' : '',
        gstNumber: user?.gstNumber || '',
        gstDoc: user?.gstDoc || '',
        gstDocName: user?.gstDoc ? 'Existing GST Doc' : '',
        categoryDocs: {},
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, user]);

  // Keep vendorType synchronized with selectedCategory
  useEffect(() => {
    const active = selectedCategory || selectedCategoryRef.current;
    if (active && (!formData.vendorType || formData.vendorType !== active)) {
      setFormData((prev) => ({
        ...prev,
        vendorType: active,
        category: active,
      }));
    }
  }, [selectedCategory, formData.vendorType]);

  // Category change handler
  const handleCategoryChange = (selectedType: string) => {
    if (!selectedType) return;
    setSelectedCategory(selectedType);
    selectedCategoryRef.current = selectedType;
    const docRules = getCategoryDocRules(selectedType);

    setFormData((prev) => {
      const isSameCategory = (prev.vendorType || '').toLowerCase() === selectedType.toLowerCase();
      const nextDocs: Record<string, any> = {};
      docRules.forEach((rule) => {
        const existing: any = isSameCategory ? (prev.categoryDocs?.[rule.key] || {}) : {};
        nextDocs[rule.key] = {
          docNumber: existing.docNumber || '',
          docUrl: existing.docUrl || '',
          fileName: existing.fileName || '',
          label: rule.label,
          required: rule.required,
        };
      });

      return {
        ...prev,
        vendorType: selectedType,
        category: selectedType,
        categoryDocs: nextDocs,
      };
    });

    setFieldErrors({});
    setFormError('');
  };

  // Build a map of category -> status for all existing vendor registrations
  const registeredCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!user) return map;
    const REJECTED_STATUSES = ['rejected', 'pincode rejected', 'kyc rejected'];

    const registerEntry = (type: string, status: string) => {
      if (!type) return;
      const cleanType = String(type).trim();
      const cleanStatus = status || 'Active';
      if (!REJECTED_STATUSES.includes(String(cleanStatus).toLowerCase())) {
        map[cleanType] = cleanStatus;
        map[cleanType.toLowerCase()] = cleanStatus;
      }
    };

    const primaryType = user.vendorType || user.category;
    if (primaryType) registerEntry(primaryType, user.status);

    if (user.businesses && Array.isArray(user.businesses)) {
      user.businesses.forEach((b: any) => {
        const bType = b.vendorType || b.category;
        if (bType) registerEntry(bType, b.status);
      });
    }
    return map;
  }, [user]);

  const isCategoryRegistered = (type: string) => {
    if (!type) return false;
    const t = String(type).trim();
    const tLower = t.toLowerCase();
    const singular = tLower.endsWith('s') && !['daily needs'].includes(tLower) ? tLower.slice(0, -1) : tLower;
    const plural = tLower.endsWith('s') ? tLower : tLower + 's';
    return Boolean(
      registeredCategoryMap[t] ||
      registeredCategoryMap[tLower] ||
      registeredCategoryMap[singular] ||
      registeredCategoryMap[plural]
    );
  };

  const getCategoryStatus = (type: string) => {
    if (!type) return null;
    const t = String(type).trim();
    const tLower = t.toLowerCase();
    const singular = tLower.endsWith('s') && !['daily needs'].includes(tLower) ? tLower.slice(0, -1) : tLower;
    const plural = tLower.endsWith('s') ? tLower : tLower + 's';
    return (
      registeredCategoryMap[t] ||
      registeredCategoryMap[tLower] ||
      registeredCategoryMap[singular] ||
      registeredCategoryMap[plural] ||
      null
    );
  };

  const getRegisteredStatusLabel = (rawStatus: string | null) => {
    if (!rawStatus) return 'Registered';
    const s = String(rawStatus).toLowerCase();
    if (s.includes('pending pincode') || s === 'pending_approval') return 'Pending Review';
    if (s.includes('kyc') || s === 'under_verification') return 'KYC Review';
    if (s.includes('changes required')) return 'Changes Required';
    if (s === 'active' || s === 'approved') return 'Active';
    if (s.includes('pending')) return 'Pending';
    return 'Registered';
  };

  // Image / Document Picker with Android permissions
  const handlePickDocument = (fieldName: string, docLabel: string) => {
    Alert.alert(
      'Upload Document',
      `Choose source for ${docLabel}`,
      [
        {
          text: 'Take Photo (Camera)',
          onPress: () => performImageSelection(fieldName, 'camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => performImageSelection(fieldName, 'library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const performImageSelection = async (fieldName: string, source: 'camera' | 'library') => {
    try {
      if (Platform.OS === 'android') {
        if (source === 'camera') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
            title: 'Camera Permission Required',
            message: 'App requires access to camera to take photos of documents.',
            buttonPositive: 'OK',
          });
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Camera permission is required to capture documents.');
            return;
          }
        } else {
          const androidVer = Number(Platform.Version);
          let perm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          if (androidVer >= 33 && (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES) {
            perm = (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES;
          }
          await PermissionsAndroid.request(perm, {
            title: 'Photo Library Permission',
            message: 'App requires access to gallery to select document images.',
            buttonPositive: 'OK',
          });
        }
      }

      const options: any = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
        saveToPhotos: false,
      };

      const result = source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const localUri = asset.uri || '';
      const mimeType = asset.type || 'image/jpeg';
      const base64 = asset.base64 || '';
      const fileName = asset.fileName || `document_${Date.now()}.jpg`;

      setUploadingField(fieldName);
      setFormError('');

      try {
        const uploadedUrl = await uploadImageToServer(
          { base64, localUri, mimeType },
          mimeType
        );

        if (uploadedUrl && !uploadedUrl.startsWith('file://')) {
          if (['panDoc', 'aadhaarDoc', 'gstDoc'].includes(fieldName)) {
            setFormData((prev) => ({
              ...prev,
              [fieldName]: uploadedUrl,
              [`${fieldName}Name`]: fileName,
            }));
            clearFieldError(fieldName);
          } else {
            // Dynamic category doc
            setFormData((prev) => ({
              ...prev,
              categoryDocs: {
                ...prev.categoryDocs,
                [fieldName]: {
                  ...(prev.categoryDocs[fieldName] || {}),
                  docUrl: uploadedUrl,
                  fileName: fileName,
                },
              },
            }));
            clearFieldError(`${fieldName}_file`);
            clearFieldError(fieldName);
          }
          setFormError('');
        } else {
          setFormError('Failed to upload document to server. Please try again.');
        }
      } catch (err: any) {
        console.warn('Document upload error:', err);
        setFormError(err?.message || 'Document upload failed. Please try again.');
      } finally {
        setUploadingField(null);
      }
    } catch (err: any) {
      console.warn('File selection error:', err);
      Alert.alert('Error', 'Could not open file picker on this device.');
      setUploadingField(null);
    }
  };

  // Step Validation (exact website match)
  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const active = selectedCategory || formData.vendorType || selectedCategoryRef.current;
      if (!active) {
        setFormError('Please select a Business Category');
        return false;
      }
      if (!formData.vendorType) {
        setFormData((prev) => ({ ...prev, vendorType: active, category: active }));
      }
      setFieldErrors({});
      return true;
    }

    if (currentStep === 2) {
      if (!formData.doorNo.trim()) {
        newErrors.doorNo = 'Door Number / Building Number is required';
      }
      if (!formData.village.trim()) {
        newErrors.village = 'Village / Locality is required';
      }
      if (!formData.taluk.trim()) {
        newErrors.taluk = 'Taluk is required';
      }
      if (!formData.district.trim()) {
        newErrors.district = 'District is required';
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required';
      }
      if (!formData.pincode || !/^\d{6}$/.test(formData.pincode.trim())) {
        newErrors.pincode = 'Please enter a valid 6-digit Pincode (e.g. 636112)';
      }
      const phoneErr = validateIndianMobile(formData.phone, 'Phone Number');
      if (phoneErr) {
        newErrors.phone = phoneErr;
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setFormError(Object.values(newErrors)[0]);
        return false;
      }
      setFieldErrors({});
      return true;
    }

    if (currentStep === 3) {
      const panErr = validatePAN(formData.panNo, 'PAN Card Number');
      if (panErr) {
        newErrors.panNo = panErr;
      }
      if (!formData.panDoc) {
        newErrors.panDoc = 'PAN Card Document is required. Please upload a copy.';
      }
      const aadhaarErr = validateAadhaar(formData.aadhaarNo, 'Aadhaar Number');
      if (aadhaarErr) {
        newErrors.aadhaarNo = aadhaarErr;
      }
      if (!formData.aadhaarDoc) {
        newErrors.aadhaarDoc = 'Aadhaar Document is required. Please upload a copy.';
      }
      if (formData.gstNumber.trim() && !formData.gstDoc) {
        newErrors.gstDoc = 'Please upload the GST Certificate if GST Number is provided';
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setFormError(Object.values(newErrors)[0]);
        return false;
      }
      setFieldErrors({});
      return true;
    }

    if (currentStep === 4) {
      const activeCat = selectedCategory || formData.vendorType || selectedCategoryRef.current;
      const docRules = getCategoryDocRules(activeCat);
      for (const rule of docRules) {
        const docItem = formData.categoryDocs[rule.key];
        const is14DigitDoc = /fssai|insurance/i.test(rule.key || rule.label || '');
        const isFitnessDoc = /fitness/i.test(rule.key || rule.label || '');
        const isPermitDoc = /permit/i.test(rule.key || rule.label || '');
        const isPropertyIdDoc = /property_id|^property id/i.test(rule.key || rule.label || '');

        const rawDocNum = (docItem?.docNumber || '').trim();
        const hasDocUrl = Boolean(docItem?.docUrl && String(docItem.docUrl).trim());

        if (rawDocNum) {
          if (is14DigitDoc && rawDocNum.replace(/\D/g, '').length > 14) {
            newErrors[`${rule.key}_number`] = `${rule.label} cannot exceed 14 digits.`;
          } else if (isFitnessDoc && (rawDocNum.length < 15 || rawDocNum.length > 16 || !/^[A-Za-z0-9-]+$/.test(rawDocNum))) {
            newErrors[`${rule.key}_number`] = 'Vehicle Fitness Certificate number must be between 15 and 16 characters.';
          } else if (isPermitDoc && (rawDocNum.length < 13 || rawDocNum.length > 16 || !/^[A-Za-z0-9/-]+$/.test(rawDocNum))) {
            newErrors[`${rule.key}_number`] = 'Transport / Route Permit number must be between 13 and 16 characters.';
          } else if (isPropertyIdDoc && !/^\d{13}$/.test(rawDocNum)) {
            newErrors[`${rule.key}_number`] = 'Property ID must be exactly 13 numeric digits.';
          }
        }

        if (rule.required) {
          if (!rawDocNum) {
            newErrors[`${rule.key}_number`] = `${rule.label} Number is required.`;
          }
          if (!hasDocUrl) {
            newErrors[`${rule.key}_file`] = `${rule.label} Document upload is required.`;
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setFormError(Object.values(newErrors)[0]);
        return false;
      }
      setFieldErrors({});
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const handlePrev = () => {
    setFormError('');
    setFieldErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  // Submit Business Request
  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const chosenCategory = selectedCategory || formData.vendorType || selectedCategoryRef.current;

      const categoryDocsMap: Record<string, any> = {};
      const categoryDocuments = Object.entries(formData.categoryDocs || {})
        .filter(([_, doc]: [string, any]) => doc && (doc.docUrl || doc.docNumber))
        .map(([key, doc]: [string, any]) => {
          categoryDocsMap[key] = doc;
          if (key === 'company_reg') {
            categoryDocsMap.companyRegDoc = doc.docUrl;
            categoryDocsMap.companyRegNo = doc.docNumber;
          }
          if (key === 'vehicle_rc') {
            categoryDocsMap.rcDoc = doc.docUrl;
            categoryDocsMap.rcNo = doc.docNumber;
          }
          if (key === 'vehicle_fitness') {
            categoryDocsMap.fitnessDoc = doc.docUrl;
            categoryDocsMap.fitnessNo = doc.docNumber;
          }
          if (key === 'transport_permit') {
            categoryDocsMap.permitDoc = doc.docUrl;
            categoryDocsMap.permitNo = doc.docNumber;
          }
          if (key === 'fssai_license' || key === 'food_safety') {
            categoryDocsMap.foodSafetyDoc = doc.docUrl;
            categoryDocsMap.foodSafetyLicenseNo = doc.docNumber;
          }
          if (key === 'bis_certificate' || key === 'bisDoc') {
            categoryDocsMap.bisDoc = doc.docUrl;
            categoryDocsMap.bisNo = doc.docNumber;
            categoryDocsMap.bisCertificateNo = doc.docNumber;
          }
          return {
            type: key,
            label: doc.label || key,
            docNumber: doc.docNumber || '',
            docUrl: doc.docUrl || '',
            status: 'Pending',
          };
        });

      const payload = {
        businessName: normalizeName(formData.businessName.trim()) || chosenCategory,
        vendorType: chosenCategory,
        category: chosenCategory,
        doorNo: formData.doorNo.trim(),
        village: formData.village.trim(),
        taluk: formData.taluk.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        phone: normalizeIndianMobile(formData.phone),
        panNo: normalizePAN(formData.panNo),
        panDoc: formData.panDoc,
        aadhaarNo: normalizeAadhaar(formData.aadhaarNo),
        aadhaarDoc: formData.aadhaarDoc,
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        gstDoc: formData.gstDoc,
        bisDoc: formData.categoryDocs?.bis_certificate?.docUrl || '',
        bisNo: formData.categoryDocs?.bis_certificate?.docNumber || '',
        bisCertificateNo: formData.categoryDocs?.bis_certificate?.docNumber || '',
        categoryDocuments,
        categoryDocs: categoryDocsMap,
      };

      const res = await createBusiness(payload);

      if (res && res.success) {
        setSuccessInfo({
          message: res.message || 'Business registration request submitted successfully!',
          assignedAdmin: res.assignedAdmin || null,
          businessName: payload.businessName,
          pincode: payload.pincode,
        });

        if (typeof onSuccess === 'function') {
          onSuccess(res);
        }
      } else {
        setFormError(res?.message || 'Failed to submit business request');
      }
    } catch (err: any) {
      console.error('Submit business error:', err);
      setFormError(err?.message || 'Failed to submit business request. Please verify connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryEmojis: Record<string, string> = {
    Products: '📦',
    Services: '🛠️',
    Food: '🍔',
    'Daily Needs': '🛒',
    Stay: '🏨',
    Travel: '🚗',
    Jobs: '💼',
    Electronics: '⚡',
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <View
          style={[
            tw`rounded-t-3xl px-5 pt-5 pb-6 max-h-[94%]`,
            isDark ? tw`bg-zinc-900` : tw`bg-white`,
          ]}
        >
          {/* Modal Header */}
          <View style={tw`flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={[tw`text-lg font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                + Add Business (Territory Request)
              </Text>
              <Text style={[tw`text-[11px] font-semibold mt-0.5`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Territory-Verified Business Registration Workflow
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center`,
                isDark ? tw`bg-zinc-800` : tw`bg-gray-100`,
              ]}
            >
              <X size={18} color={isDark ? '#A1A1AA' : '#4B5563'} />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          {!successInfo && (
            <View style={tw`flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-zinc-800`}>
              {[
                { num: 1, label: 'Category' },
                { num: 2, label: 'Address' },
                { num: 3, label: 'Identity' },
                { num: 4, label: 'Documents' },
                { num: 5, label: 'Review' },
              ].map((st) => {
                const isActive = step === st.num;
                const isPassed = step > st.num;
                return (
                  <View key={st.num} style={tw`items-center flex-1`}>
                    <View
                      style={[
                        tw`w-7 h-7 rounded-full items-center justify-center mb-1`,
                        isActive
                          ? { backgroundColor: '#4F46E5' }
                          : isPassed
                          ? { backgroundColor: '#10B981' }
                          : isDark
                          ? tw`bg-zinc-800`
                          : tw`bg-gray-200`,
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-xs font-bold`,
                          isActive || isPassed ? tw`text-white` : isDark ? tw`text-zinc-400` : tw`text-gray-600`,
                        ]}
                      >
                        {isPassed ? '✓' : st.num}
                      </Text>
                    </View>
                    <Text
                      style={[
                        tw`text-[10px] font-bold`,
                        isActive
                          ? tw`text-indigo-600`
                          : isPassed
                          ? tw`text-emerald-600`
                          : isDark
                          ? tw`text-zinc-500`
                          : tw`text-gray-400`,
                      ]}
                    >
                      {st.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Global Form Error Banner */}
          {formError ? (
            <View style={[tw`mt-3 p-3 rounded-xl flex-row items-center`, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <AlertCircle size={16} color="#EF4444" style={tw`mr-2 shrink-0`} />
              <Text style={tw`text-xs font-semibold text-rose-600 flex-1`}>{formError}</Text>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* SUCCESS SCREEN */}
          {/* ========================================================= */}
          {successInfo ? (
            <ScrollView showsVerticalScrollIndicator={false} style={tw`my-4`}>
              <View style={tw`py-6 items-center text-center`}>
                <View
                  style={[
                    tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
                    { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: '#10B981' },
                  ]}
                >
                  <CheckCircle2 size={36} color="#10B981" />
                </View>

                <Text style={[tw`text-lg font-extrabold text-center mb-1`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                  Business Registration Submitted!
                </Text>
                <Text style={[tw`text-xs text-center mb-4 px-2`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  {successInfo.message}
                </Text>

                <View
                  style={[
                    tw`w-full p-4 rounded-2xl mb-5`,
                    isDark ? tw`bg-amber-950/30 border border-amber-800/40` : tw`bg-amber-50 border border-amber-200`,
                  ]}
                >
                  <View style={tw`flex-row items-center mb-2`}>
                    <Info size={16} color="#D97706" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs font-bold text-amber-700`}>Territory Verification Process</Text>
                  </View>
                  <Text style={[tw`text-[11px] mb-1.5 leading-relaxed`, isDark ? tw`text-amber-200` : tw`text-amber-900`]}>
                    1. <Text style={tw`font-bold`}>Pincode Admin Review:</Text> Assigned to the local territory admin for Pincode {successInfo.pincode}
                    {successInfo.assignedAdmin?.name ? ` (${successInfo.assignedAdmin.name})` : ''}.
                  </Text>
                  <Text style={[tw`text-[11px] mb-1.5 leading-relaxed`, isDark ? tw`text-amber-200` : tw`text-amber-900`]}>
                    2. <Text style={tw`font-bold`}>KYC Verification:</Text> Territory Admin and central KYC team will verify submitted PAN, Aadhaar, and category certificates.
                  </Text>
                  <Text style={[tw`text-[11px] leading-relaxed`, isDark ? tw`text-amber-200` : tw`text-amber-900`]}>
                    3. <Text style={tw`font-bold`}>Status:</Text> Outlet will remain in "Pending Pincode Admin Review" until approvals are granted.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    tw`w-full py-3.5 rounded-2xl items-center justify-center`,
                    { backgroundColor: '#4F46E5' },
                  ]}
                >
                  <Text style={tw`text-white font-bold text-sm`}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={tw`my-3`}>
              {/* ========================================================= */}
              {/* STEP 1: BUSINESS CATEGORY SELECTION */}
              {/* ========================================================= */}
              {step === 1 && (
                <View style={tw`space-y-4`}>
                  <View>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Business Category <Text style={tw`text-rose-500`}>*</Text>
                    </Text>
                    <Text style={[tw`text-[11px] mb-3`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>
                      Select the category for your new business outlet. Registered categories are shown as disabled.
                    </Text>

                    {/* Category Cards Grid */}
                    <View style={tw`flex-row flex-wrap justify-between`}>
                      {adminCategories.map((type) => {
                        const isRegistered = isCategoryRegistered(type);
                        const rawStatus = isRegistered ? getCategoryStatus(type) : null;
                        const regStatus = isRegistered ? getRegisteredStatusLabel(rawStatus) : null;
                        const effectiveSelected = selectedCategory || formData.vendorType || selectedCategoryRef.current;
                        const isSelected = Boolean(
                          effectiveSelected && (
                            effectiveSelected.toLowerCase() === type.toLowerCase() ||
                            effectiveSelected === type
                          )
                        );
                        const emoji = categoryEmojis[type] || '🏢';

                        return (
                          <TouchableOpacity
                            key={type}
                            disabled={isRegistered}
                            onPress={() => handleCategoryChange(type)}
                            activeOpacity={0.7}
                            style={[
                              tw`w-[48%] p-3.5 rounded-2xl mb-3 border items-center justify-center relative`,
                              isRegistered
                                ? isDark
                                  ? tw`border-zinc-800 bg-zinc-950/60 opacity-50`
                                  : tw`border-gray-200 bg-gray-100/70 opacity-50`
                                : isSelected
                                ? { borderColor: '#4F46E5', backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : 'rgba(79,70,229,0.08)', borderWidth: 2 }
                                : isDark
                                ? tw`border-zinc-800 bg-zinc-950`
                                : tw`border-gray-200 bg-white`,
                            ]}
                          >
                            <Text style={tw`text-2xl mb-1`}>{emoji}</Text>
                            <Text
                              style={[
                                tw`text-xs font-bold text-center`,
                                isRegistered
                                  ? tw`text-gray-400`
                                  : isSelected
                                  ? tw`text-indigo-600 font-extrabold`
                                  : isDark
                                  ? tw`text-white`
                                  : tw`text-gray-800`,
                              ]}
                            >
                              {type}
                            </Text>

                            {/* Registered Status Badge */}
                            {isRegistered && (
                              <View style={[tw`absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full`, { backgroundColor: '#059669' }]}>
                                <Text style={tw`text-[8px] font-black text-white uppercase`}>
                                  {regStatus}
                                </Text>
                              </View>
                            )}

                            {/* Selected Badge */}
                            {isSelected && !isRegistered && (
                              <View style={[tw`absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full`, { backgroundColor: '#4F46E5' }]}>
                                <Text style={tw`text-[9px] font-black text-white`}>✓ Selected</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {Object.keys(registeredCategoryMap).length > 0 && (
                      <View style={[tw`p-3 rounded-xl mb-3`, isDark ? tw`bg-amber-950/20 border border-amber-900/30` : tw`bg-amber-50 border border-amber-200`]}>
                        <Text style={[tw`text-[11px] leading-relaxed`, isDark ? tw`text-amber-300` : tw`text-amber-800`]}>
                          <Text style={tw`font-bold`}>Note: </Text>
                          Greyed-out categories are already registered under your account in an active or pending review state.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Business Name (Optional) */}
                  <View style={tw`mt-2`}>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-2`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Business / Outlet Name (Optional)
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        isDark ? tw`bg-zinc-950 border-zinc-700 text-white` : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={formData.businessName}
                      onChangeText={(val) => setFormData({ ...formData, businessName: val })}
                      placeholder="Enter Business Name (defaults to main business)"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* STEP 2: SEPARATE ADDRESS FIELDS */}
              {/* ========================================================= */}
              {step === 2 && (
                <View style={tw`space-y-3.5`}>
                  <View style={[tw`p-3 rounded-xl mb-1 flex-row items-center`, isDark ? tw`bg-blue-950/30 border border-blue-900/40` : tw`bg-blue-50 border border-blue-200`]}>
                    <Info size={16} color="#3B82F6" style={tw`mr-2 shrink-0`} />
                    <Text style={[tw`text-[11px] flex-1 leading-relaxed`, isDark ? tw`text-blue-300` : tw`text-blue-800`]}>
                      <Text style={tw`font-bold`}>Territory Notice: </Text>
                      The Pincode provided below will automatically determine the responsible Pincode Admin territory.
                    </Text>
                  </View>

                  {/* Door / Building No */}
                  <View>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Door No / Building No <Text style={tw`text-rose-500`}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        fieldErrors.doorNo
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`bg-zinc-950 border-zinc-700 text-white`
                          : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={formData.doorNo}
                      onChangeText={(val) => {
                        setFormData({ ...formData, doorNo: val });
                        clearFieldError('doorNo');
                      }}
                      placeholder="e.g. 12/4, Shop #3"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                    {fieldErrors.doorNo ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.doorNo}</Text>
                    ) : null}
                  </View>

                  {/* Village / Locality */}
                  <View>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Village / Locality <Text style={tw`text-rose-500`}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        fieldErrors.village
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`bg-zinc-950 border-zinc-700 text-white`
                          : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={formData.village}
                      onChangeText={(val) => {
                        setFormData({ ...formData, village: val });
                        clearFieldError('village');
                      }}
                      placeholder="e.g. Kaveripattinam, Main Bazaar"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                    {fieldErrors.village ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.village}</Text>
                    ) : null}
                  </View>

                  {/* Taluk & District */}
                  <View style={tw`flex-row justify-between`}>
                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        Taluk <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                          fieldErrors.taluk
                            ? tw`border-rose-500 bg-rose-50/10`
                            : isDark
                            ? tw`bg-zinc-950 border-zinc-700 text-white`
                            : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={formData.taluk}
                        onChangeText={(val) => {
                          setFormData({ ...formData, taluk: val });
                          clearFieldError('taluk');
                        }}
                        placeholder="e.g. Krishnagiri"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                      {fieldErrors.taluk ? (
                        <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.taluk}</Text>
                      ) : null}
                    </View>

                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        District <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                          fieldErrors.district
                            ? tw`border-rose-500 bg-rose-50/10`
                            : isDark
                            ? tw`bg-zinc-950 border-zinc-700 text-white`
                            : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={formData.district}
                        onChangeText={(val) => {
                          setFormData({ ...formData, district: val });
                          clearFieldError('district');
                        }}
                        placeholder="e.g. Krishnagiri"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                      {fieldErrors.district ? (
                        <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.district}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* State & Pincode */}
                  <View style={tw`flex-row justify-between`}>
                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        State <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                          fieldErrors.state
                            ? tw`border-rose-500 bg-rose-50/10`
                            : isDark
                            ? tw`bg-zinc-950 border-zinc-700 text-white`
                            : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={formData.state}
                        onChangeText={(val) => {
                          setFormData({ ...formData, state: val });
                          clearFieldError('state');
                        }}
                        placeholder="e.g. Tamil Nadu"
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                      {fieldErrors.state ? (
                        <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.state}</Text>
                      ) : null}
                    </View>

                    <View style={tw`w-[48%]`}>
                      <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        Pincode <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          tw`border rounded-xl px-4 py-3 text-sm font-mono font-semibold`,
                          fieldErrors.pincode
                            ? tw`border-rose-500 bg-rose-50/10`
                            : isDark
                            ? tw`bg-zinc-950 border-zinc-700 text-white`
                            : tw`bg-gray-50 border-gray-200 text-gray-800`,
                        ]}
                        value={formData.pincode}
                        onChangeText={(val) => {
                          setFormData({ ...formData, pincode: val.replace(/\D/g, '').slice(0, 6) });
                          clearFieldError('pincode');
                        }}
                        placeholder="e.g. 636112"
                        keyboardType="numeric"
                        maxLength={6}
                        placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                      />
                      {fieldErrors.pincode ? (
                        <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.pincode}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Business Phone Number */}
                  <View>
                    <Text style={[tw`font-bold text-xs uppercase tracking-wider mb-1.5`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                      Business Phone Number <Text style={tw`text-rose-500`}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-3 text-sm font-semibold`,
                        fieldErrors.phone
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`bg-zinc-950 border-zinc-700 text-white`
                          : tw`bg-gray-50 border-gray-200 text-gray-800`,
                      ]}
                      value={formData.phone}
                      onChangeText={(val) => {
                        setFormData({ ...formData, phone: val.replace(/\D/g, '').slice(0, 10) });
                        clearFieldError('phone');
                      }}
                      placeholder="e.g. 9876543210"
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                    {fieldErrors.phone ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.phone}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* STEP 3: IDENTITY DETAILS (PAN, AADHAAR, GST) */}
              {/* ========================================================= */}
              {step === 3 && (
                <View style={tw`space-y-4`}>
                  {/* 1. PAN Card Details */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl border`,
                      isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                    ]}
                  >
                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <Text style={[tw`text-xs font-bold uppercase tracking-wider`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                        1. PAN Card Details <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      {formData.panDoc ? (
                        <View style={tw`flex-row items-center`}>
                          <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                          <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                        </View>
                      ) : (
                        <View style={tw`flex-row items-center`}>
                          <AlertTriangle size={13} color="#F59E0B" style={tw`mr-1`} />
                          <Text style={tw`text-xs font-bold text-amber-600`}>Required</Text>
                        </View>
                      )}
                    </View>

                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-2.5 text-sm font-mono font-semibold mb-2.5`,
                        fieldErrors.panNo
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`bg-zinc-900 border-zinc-700 text-white`
                          : tw`bg-white border-gray-200 text-gray-800`,
                      ]}
                      value={formData.panNo}
                      onChangeText={(val) => {
                        setFormData({ ...formData, panNo: val.toUpperCase() });
                        clearFieldError('panNo');
                      }}
                      placeholder="PAN Number (e.g. ABCDE1234F)"
                      maxLength={10}
                      autoCapitalize="characters"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                    {fieldErrors.panNo ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mb-2`}>{fieldErrors.panNo}</Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => handlePickDocument('panDoc', 'PAN Card')}
                      activeOpacity={0.7}
                      style={[
                        tw`flex-row items-center justify-center py-2.5 px-3 rounded-xl border border-dashed`,
                        fieldErrors.panDoc
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`border-zinc-700 bg-zinc-900`
                          : tw`border-gray-300 bg-white`,
                      ]}
                    >
                      {uploadingField === 'panDoc' ? (
                        <ActivityIndicator size="small" color="#4F46E5" style={tw`mr-2`} />
                      ) : (
                        <Upload size={14} color={isDark ? '#A1A1AA' : '#4B5563'} style={tw`mr-2`} />
                      )}
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        {uploadingField === 'panDoc'
                          ? 'Uploading...'
                          : formData.panDoc
                          ? `✓ ${formData.panDocName || 'PAN Uploaded'} (Replace)`
                          : 'Upload PAN (Photo / Scan)'}
                      </Text>
                    </TouchableOpacity>
                    {fieldErrors.panDoc ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.panDoc}</Text>
                    ) : null}
                  </View>

                  {/* 2. Aadhaar Details */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl border`,
                      isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                    ]}
                  >
                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <Text style={[tw`text-xs font-bold uppercase tracking-wider`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                        2. Aadhaar Details <Text style={tw`text-rose-500`}>*</Text>
                      </Text>
                      {formData.aadhaarDoc ? (
                        <View style={tw`flex-row items-center`}>
                          <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                          <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                        </View>
                      ) : (
                        <View style={tw`flex-row items-center`}>
                          <AlertTriangle size={13} color="#F59E0B" style={tw`mr-1`} />
                          <Text style={tw`text-xs font-bold text-amber-600`}>Required</Text>
                        </View>
                      )}
                    </View>

                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-2.5 text-sm font-mono font-semibold mb-2.5`,
                        fieldErrors.aadhaarNo
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`bg-zinc-900 border-zinc-700 text-white`
                          : tw`bg-white border-gray-200 text-gray-800`,
                      ]}
                      value={formData.aadhaarNo}
                      onChangeText={(val) => {
                        setFormData({ ...formData, aadhaarNo: val.replace(/\D/g, '').slice(0, 12) });
                        clearFieldError('aadhaarNo');
                      }}
                      placeholder="12-digit Aadhaar Number"
                      keyboardType="numeric"
                      maxLength={12}
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />
                    {fieldErrors.aadhaarNo ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mb-2`}>{fieldErrors.aadhaarNo}</Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => handlePickDocument('aadhaarDoc', 'Aadhaar Card')}
                      activeOpacity={0.7}
                      style={[
                        tw`flex-row items-center justify-center py-2.5 px-3 rounded-xl border border-dashed`,
                        fieldErrors.aadhaarDoc
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`border-zinc-700 bg-zinc-900`
                          : tw`border-gray-300 bg-white`,
                      ]}
                    >
                      {uploadingField === 'aadhaarDoc' ? (
                        <ActivityIndicator size="small" color="#4F46E5" style={tw`mr-2`} />
                      ) : (
                        <Upload size={14} color={isDark ? '#A1A1AA' : '#4B5563'} style={tw`mr-2`} />
                      )}
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        {uploadingField === 'aadhaarDoc'
                          ? 'Uploading...'
                          : formData.aadhaarDoc
                          ? `✓ ${formData.aadhaarDocName || 'Aadhaar Uploaded'} (Replace)`
                          : 'Upload Aadhaar (Photo / Scan)'}
                      </Text>
                    </TouchableOpacity>
                    {fieldErrors.aadhaarDoc ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.aadhaarDoc}</Text>
                    ) : null}
                  </View>

                  {/* 3. GST Details (Optional) */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl border`,
                      isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                    ]}
                  >
                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <Text style={[tw`text-xs font-bold uppercase tracking-wider`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                        3. GST Details <Text style={tw`text-[10px] text-gray-400 font-normal`}>(Optional)</Text>
                      </Text>
                      {formData.gstDoc ? (
                        <View style={tw`flex-row items-center`}>
                          <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                          <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                        </View>
                      ) : (
                        <Text style={tw`text-xs text-gray-400`}>Optional</Text>
                      )}
                    </View>

                    <TextInput
                      style={[
                        tw`border rounded-xl px-4 py-2.5 text-sm font-mono font-semibold mb-2.5`,
                        isDark ? tw`bg-zinc-900 border-zinc-700 text-white` : tw`bg-white border-gray-200 text-gray-800`,
                      ]}
                      value={formData.gstNumber}
                      onChangeText={(val) => {
                        setFormData({ ...formData, gstNumber: val.toUpperCase() });
                        clearFieldError('gstDoc');
                      }}
                      placeholder="15-digit GSTIN (Optional)"
                      maxLength={15}
                      autoCapitalize="characters"
                      placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                    />

                    <TouchableOpacity
                      onPress={() => handlePickDocument('gstDoc', 'GST Certificate')}
                      activeOpacity={0.7}
                      style={[
                        tw`flex-row items-center justify-center py-2.5 px-3 rounded-xl border border-dashed`,
                        fieldErrors.gstDoc
                          ? tw`border-rose-500 bg-rose-50/10`
                          : isDark
                          ? tw`border-zinc-700 bg-zinc-900`
                          : tw`border-gray-300 bg-white`,
                      ]}
                    >
                      {uploadingField === 'gstDoc' ? (
                        <ActivityIndicator size="small" color="#4F46E5" style={tw`mr-2`} />
                      ) : (
                        <Upload size={14} color={isDark ? '#A1A1AA' : '#4B5563'} style={tw`mr-2`} />
                      )}
                      <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                        {uploadingField === 'gstDoc'
                          ? 'Uploading...'
                          : formData.gstDoc
                          ? `✓ ${formData.gstDocName || 'GST Uploaded'} (Replace)`
                          : 'Upload GST Certificate (Optional)'}
                      </Text>
                    </TouchableOpacity>
                    {fieldErrors.gstDoc ? (
                      <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>{fieldErrors.gstDoc}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* STEP 4: CATEGORY-SPECIFIC DOCUMENTS (DYNAMIC) */}
              {/* ========================================================= */}
              {step === 4 && (
                <View style={tw`space-y-4`}>
                  <View style={tw`flex-row items-center mb-1`}>
                    <Text style={[tw`text-xs font-bold uppercase tracking-wider`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                      Required Documents for Category:
                    </Text>
                    <Text style={tw`text-xs font-extrabold text-indigo-600 ml-1.5`}>
                      {selectedCategory || formData.vendorType}
                    </Text>
                  </View>

                  {(() => {
                    const activeCat = selectedCategory || formData.vendorType || selectedCategoryRef.current;
                    const docRules = getCategoryDocRules(activeCat);

                    if (!docRules || docRules.length === 0) {
                      return (
                        <View style={[tw`p-6 rounded-2xl border border-dashed text-center items-center justify-center`, isDark ? tw`border-zinc-800` : tw`border-gray-200`]}>
                          <Text style={[tw`text-xs text-center leading-relaxed`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                            No specialized regulatory certificates are mandatory for this category. Standard identity documents (PAN & Aadhaar) will be used for KYC.
                          </Text>
                        </View>
                      );
                    }

                    return docRules.map((rule) => {
                      const docState = formData.categoryDocs[rule.key] || {
                        docNumber: '',
                        docUrl: '',
                        fileName: '',
                        label: rule.label,
                        required: rule.required,
                      };

                      const is14DigitDoc = /fssai|insurance/i.test(rule.key || rule.label || '');
                      const isFitnessDoc = /fitness/i.test(rule.key || rule.label || '');
                      const isPermitDoc = /permit/i.test(rule.key || rule.label || '');
                      const isPropertyIdDoc = /property_id|^property id/i.test(rule.key || rule.label || '');

                      let maxL: number | undefined = undefined;
                      let placeholder = rule.numberPlaceholder || 'Certificate / License Number';

                      if (isFitnessDoc) {
                        maxL = 16;
                        placeholder = 'e.g. FC-987654321012 (15-16 chars)';
                      } else if (isPermitDoc) {
                        maxL = 16;
                        placeholder = 'e.g. PERMIT-1234567 (13-16 chars)';
                      } else if (isPropertyIdDoc) {
                        maxL = 13;
                        placeholder = '13-digit number (e.g. 1234567890123)';
                      } else if (is14DigitDoc) {
                        maxL = 14;
                        placeholder = '14-digit number (e.g. 10012345678901)';
                      }

                      return (
                        <View
                          key={rule.key}
                          style={[
                            tw`p-4 rounded-2xl border`,
                            isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                          ]}
                        >
                          <View style={tw`flex-row justify-between items-center mb-3`}>
                            <Text style={[tw`text-xs font-bold flex-1 mr-2`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                              {rule.label} {rule.required && <Text style={tw`text-rose-500`}>*</Text>}
                            </Text>
                            {docState.docUrl ? (
                              <View style={tw`flex-row items-center`}>
                                <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                                <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                              </View>
                            ) : rule.required ? (
                              <View style={tw`flex-row items-center`}>
                                <AlertTriangle size={13} color="#F59E0B" style={tw`mr-1`} />
                                <Text style={tw`text-xs font-bold text-amber-600`}>Required</Text>
                              </View>
                            ) : (
                              <Text style={tw`text-xs text-gray-400`}>Optional</Text>
                            )}
                          </View>

                          <TextInput
                            style={[
                              tw`border rounded-xl px-4 py-2.5 text-sm font-semibold mb-2.5`,
                              fieldErrors[`${rule.key}_number`]
                                ? tw`border-rose-500 bg-rose-50/10`
                                : isDark
                                ? tw`bg-zinc-900 border-zinc-700 text-white`
                                : tw`bg-white border-gray-200 text-gray-800`,
                            ]}
                            value={docState.docNumber || ''}
                            maxLength={maxL}
                            onChangeText={(val) => {
                              let clean = val;
                              if (isFitnessDoc) {
                                clean = clean.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16).toUpperCase();
                              } else if (isPermitDoc) {
                                clean = clean.replace(/[^a-zA-Z0-9/-]/g, '').slice(0, 16).toUpperCase();
                              } else if (isPropertyIdDoc) {
                                clean = clean.replace(/\D/g, '').slice(0, 13);
                              } else if (is14DigitDoc) {
                                clean = clean.replace(/\D/g, '').slice(0, 14);
                              }
                              setFormData((prev) => ({
                                ...prev,
                                categoryDocs: {
                                  ...prev.categoryDocs,
                                  [rule.key]: {
                                    ...(prev.categoryDocs[rule.key] || {}),
                                    docNumber: clean,
                                    label: rule.label,
                                    required: rule.required,
                                  },
                                },
                              }));
                              clearFieldError(`${rule.key}_number`);
                            }}
                            placeholder={placeholder}
                            placeholderTextColor={isDark ? '#52525b' : '#9CA3AF'}
                          />
                          {fieldErrors[`${rule.key}_number`] ? (
                            <Text style={tw`text-[11px] font-semibold text-rose-500 mb-2`}>
                              {fieldErrors[`${rule.key}_number`]}
                            </Text>
                          ) : null}

                          <TouchableOpacity
                            onPress={() => handlePickDocument(rule.key, rule.label)}
                            activeOpacity={0.7}
                            style={[
                              tw`flex-row items-center justify-center py-2.5 px-3 rounded-xl border border-dashed`,
                              fieldErrors[`${rule.key}_file`]
                                ? tw`border-rose-500 bg-rose-50/10`
                                : isDark
                                ? tw`border-zinc-700 bg-zinc-900`
                                : tw`border-gray-300 bg-white`,
                            ]}
                          >
                            {uploadingField === rule.key ? (
                              <ActivityIndicator size="small" color="#4F46E5" style={tw`mr-2`} />
                            ) : (
                              <Upload size={14} color={isDark ? '#A1A1AA' : '#4B5563'} style={tw`mr-2`} />
                            )}
                            <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>
                              {uploadingField === rule.key
                                ? 'Uploading...'
                                : docState.docUrl
                                ? `✓ ${docState.fileName || 'Document Uploaded'} (Replace)`
                                : 'Upload Document (Photo / Scan)'}
                            </Text>
                          </TouchableOpacity>
                          {fieldErrors[`${rule.key}_file`] ? (
                            <Text style={tw`text-[11px] font-semibold text-rose-500 mt-1`}>
                              {fieldErrors[`${rule.key}_file`]}
                            </Text>
                          ) : null}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              {/* ========================================================= */}
              {/* STEP 5: REVIEW & SUBMIT */}
              {/* ========================================================= */}
              {step === 5 && (
                <View style={tw`space-y-4`}>
                  {/* Territory Notice Banner */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl`,
                      isDark ? tw`bg-amber-950/30 border border-amber-800/40` : tw`bg-amber-50 border border-amber-200`,
                    ]}
                  >
                    <View style={tw`flex-row items-center mb-2`}>
                      <Shield size={16} color="#D97706" style={tw`mr-1.5`} />
                      <Text style={tw`text-xs font-bold text-amber-700`}>
                        Territory Administration & Verification Workflow
                      </Text>
                    </View>
                    <Text style={[tw`text-[11px] leading-relaxed`, isDark ? tw`text-amber-200` : tw`text-amber-900`]}>
                      Your business will be registered under Pincode <Text style={tw`font-bold`}>{formData.pincode}</Text>. The request will be routed directly to the responsible <Text style={tw`font-bold`}>Pincode Admin</Text> for physical & document verification, then forwarded to the central <Text style={tw`font-bold`}>KYC Team</Text> for final publishing.
                    </Text>
                  </View>

                  {/* Summary of Information */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl border`,
                      isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                    ]}
                  >
                    <Text style={[tw`text-xs font-bold mb-3`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                      Summary of Submitted Information
                    </Text>
                    <View style={tw`space-y-2`}>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Category:</Text>
                        <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {selectedCategory || formData.vendorType}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Outlet Name:</Text>
                        <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {formData.businessName || selectedCategory || formData.vendorType}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Pincode:</Text>
                        <Text style={[tw`text-[11px] font-mono font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {formData.pincode}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Taluk / District:</Text>
                        <Text style={[tw`text-[11px] font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {formData.taluk}, {formData.district}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>PAN Number:</Text>
                        <Text style={[tw`text-[11px] font-mono font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {formData.panNo}
                        </Text>
                      </View>
                      <View style={tw`flex-row justify-between`}>
                        <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>Aadhaar Number:</Text>
                        <Text style={[tw`text-[11px] font-mono font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                          {formData.aadhaarNo}
                        </Text>
                      </View>
                      {formData.gstNumber ? (
                        <View style={tw`flex-row justify-between`}>
                          <Text style={[tw`text-[11px] font-semibold`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>GSTIN:</Text>
                          <Text style={[tw`text-[11px] font-mono font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                            {formData.gstNumber}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Documents Verification Review */}
                  <View
                    style={[
                      tw`p-4 rounded-2xl border`,
                      isDark ? tw`bg-zinc-950 border-zinc-800` : tw`bg-gray-50 border-gray-200`,
                    ]}
                  >
                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <Text style={[tw`text-xs font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                        Uploaded Documents Review
                      </Text>
                      <Text style={[tw`text-[10px]`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                        KYC Checklist
                      </Text>
                    </View>

                    <View style={tw`space-y-2`}>
                      {/* PAN Doc */}
                      <View style={[tw`flex-row items-center justify-between p-2.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`]}>
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>PAN Card Document</Text>
                        {formData.panDoc ? (
                          <View style={tw`flex-row items-center`}>
                            <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                          </View>
                        ) : (
                          <View style={tw`flex-row items-center`}>
                            <AlertTriangle size={13} color="#EF4444" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-rose-500`}>Required</Text>
                          </View>
                        )}
                      </View>

                      {/* Aadhaar Doc */}
                      <View style={[tw`flex-row items-center justify-between p-2.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`]}>
                        <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>Aadhaar Document</Text>
                        {formData.aadhaarDoc ? (
                          <View style={tw`flex-row items-center`}>
                            <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                          </View>
                        ) : (
                          <View style={tw`flex-row items-center`}>
                            <AlertTriangle size={13} color="#EF4444" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-rose-500`}>Required</Text>
                          </View>
                        )}
                      </View>

                      {/* GST Doc (Optional) */}
                      {formData.gstNumber ? (
                        <View style={[tw`flex-row items-center justify-between p-2.5 rounded-xl border`, isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`]}>
                          <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>GST Certificate</Text>
                          {formData.gstDoc ? (
                            <View style={tw`flex-row items-center`}>
                              <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                              <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                            </View>
                          ) : (
                            <Text style={tw`text-xs text-gray-400`}>Optional</Text>
                          )}
                        </View>
                      ) : null}

                      {/* Category Documents */}
                      {(() => {
                        const activeCat = selectedCategory || formData.vendorType || selectedCategoryRef.current;
                        const docRules = getCategoryDocRules(activeCat);
                        if (!docRules || docRules.length === 0) return null;
                        return docRules.map((rule) => {
                          const docState = formData.categoryDocs[rule.key] || {};
                          const isUploaded = Boolean(docState.docUrl);
                          return (
                            <View
                              key={rule.key}
                              style={[
                                tw`flex-row items-center justify-between p-2.5 rounded-xl border`,
                                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`,
                              ]}
                            >
                              <View style={tw`flex-1 mr-2`}>
                                <Text style={[tw`text-xs font-semibold`, isDark ? tw`text-zinc-200` : tw`text-gray-800`]}>
                                  {rule.label}
                                </Text>
                                {docState.docNumber ? (
                                  <Text style={[tw`text-[10px] font-mono`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                                    ({docState.docNumber})
                                  </Text>
                                ) : null}
                              </View>
                              {isUploaded ? (
                                <View style={tw`flex-row items-center`}>
                                  <CheckCircle2 size={13} color="#10B981" style={tw`mr-1`} />
                                  <Text style={tw`text-xs font-bold text-emerald-600`}>Uploaded</Text>
                                </View>
                              ) : rule.required ? (
                                <View style={tw`flex-row items-center`}>
                                  <AlertTriangle size={13} color="#EF4444" style={tw`mr-1`} />
                                  <Text style={tw`text-xs font-bold text-rose-500`}>Required</Text>
                                </View>
                              ) : (
                                <Text style={tw`text-xs text-gray-400`}>Optional</Text>
                              )}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Navigation Buttons (when not successInfo) */}
          {!successInfo && (
            <View style={tw`flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800`}>
              {step > 1 ? (
                <TouchableOpacity
                  onPress={handlePrev}
                  activeOpacity={0.7}
                  style={[
                    tw`px-4 py-3 rounded-xl border flex-row items-center`,
                    isDark ? tw`border-zinc-700 bg-zinc-800` : tw`border-gray-300 bg-gray-100`,
                  ]}
                >
                  <ChevronLeft size={16} color={isDark ? '#E4E4E7' : '#374151'} style={tw`mr-1`} />
                  <Text style={[tw`text-xs font-bold`, isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>Previous</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              {step < 5 ? (
                <TouchableOpacity
                  onPress={handleNext}
                  activeOpacity={0.7}
                  style={[
                    tw`px-6 py-3 rounded-xl flex-row items-center`,
                    { backgroundColor: '#4F46E5' },
                  ]}
                >
                  <Text style={tw`text-white text-xs font-bold mr-1`}>Next</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.7}
                  style={[
                    tw`px-6 py-3 rounded-xl flex-row items-center`,
                    { backgroundColor: '#10B981', opacity: submitting ? 0.7 : 1 },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={tw`mr-2`} />
                  ) : (
                    <CheckCircle2 size={16} color="#FFFFFF" style={tw`mr-2`} />
                  )}
                  <Text style={tw`text-white text-xs font-extrabold`}>
                    {submitting ? 'Submitting Request...' : 'Submit Business Request'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
