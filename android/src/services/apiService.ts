import { Platform } from 'react-native';
import { API_URL_ANDROID, API_URL_IOS } from './env';
import { BusinessItem, CategoryKey } from '../../../App';
import { sessionManager } from './sessionManager';

declare var global: any;

const BASE_URL = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;

const getGlobalToken = (): string | null => {
  return (global as any).jwtToken || null;
};

const setGlobalToken = (token: string | null) => {
  (global as any).jwtToken = token;
};

let persistentVendorUser: any = null;

const getGlobalUser = (): any => {
  return persistentVendorUser || (global as any).currentVendorUser || null;
};

const setGlobalUser = (user: any) => {
  persistentVendorUser = user;
  (global as any).currentVendorUser = user;
};

const getGlobalActiveBusinessId = (): string | null => {
  return (global as any).activeBusinessId || null;
};

const setGlobalActiveBusinessId = (id: string | null) => {
  (global as any).activeBusinessId = id;
};

export const normalizeCategory = (raw?: string): CategoryKey => {
  if (!raw) return 'Products';
  const s = String(raw).trim().toLowerCase();

  // 1. Direct standard key matches
  if (s === 'products' || s === 'product') return 'Products';
  if (s === 'services' || s === 'service') return 'Services';
  if (s === 'food' || s === 'restaurant' || s === 'dining') return 'Food';
  if (s === 'daily needs' || s === 'dailyneeds' || s === 'daily_needs' || s === 'grocery') return 'Daily Needs';
  if (s === 'stay' || s === 'hotel' || s === 'hotels') return 'Stay';
  if (s === 'travel' || s === 'bus' || s === 'travels') return 'Travel';
  if (s === 'jobs' || s === 'job') return 'Jobs';

  // 2. High-specificity matches based on backend completeTaxonomy
  // Stay (Hotels, Resorts, Viila/Villa, Homestays, Service Apartments, PG, Lodge, Room)
  if (
    s.includes('stay') || s.includes('hotel') || s.includes('resort') ||
    s.includes('viila') || s.includes('villa') || s.includes('homestay') ||
    s.includes('apartment') || s.includes('room') || s.includes('lodge') ||
    s.includes('hostel') || s.includes('glamping') || s.includes('camping')
  ) {
    return 'Stay';
  }

  // Food (Cuisines, Dishes, Restaurants, Cafes, Biryani, Naan, Meals)
  if (
    s.includes('food') || s.includes('restaurant') || s.includes('cafe') ||
    s.includes('south indian') || s.includes('north indian') || s.includes('biryani') ||
    s.includes('biriyani') || s.includes('fast food') || s.includes('dosa') ||
    s.includes('idly') || s.includes('idli') || s.includes('naan') ||
    s.includes('roti') || s.includes('meals') || s.includes('dish') ||
    s.includes('cuisine') || s.includes('bakery') || s.includes('beverage') ||
    s.includes('catering') || s.includes('thali') || s.includes('paneer') ||
    s.includes('chinese') || s.includes('italian') || s.includes('tandoori')
  ) {
    return 'Food';
  }

  // Daily Needs (Grocery, Vegetables, Fruits, Dairy, Pharmacy, Essentials)
  if (
    s.includes('daily needs') || s.includes('grocery') || s.includes('vegetable') ||
    s.includes('vegtable') || s.includes('fruit') || s.includes('dairy') ||
    s.includes('milk') || s.includes('pharmacy') || s.includes('medicine') ||
    s.includes('staple') || s.includes('household') || s.includes('personal care') ||
    s.includes('baby care') || s.includes('drinking water') || s.includes('snacks')
  ) {
    return 'Daily Needs';
  }

  // Travel (Buses, Flights, Trains, Cabs, Rentals, Tours, Packages)
  if (
    s.includes('travel') || s.includes('bus') || s.includes('flight') ||
    s.includes('train') || s.includes('cab') || s.includes('taxi') ||
    s.includes('tour') || s.includes('rental') || s.includes('visa') ||
    s.includes('passport') || s.includes('cruise') || s.includes('package')
  ) {
    return 'Travel';
  }

  // Jobs (Employment, Vacancy, Placement, Recruitment, Hiring)
  if (
    s.includes('job') || s.includes('employment') || s.includes('recruitment') ||
    s.includes('career') || s.includes('vacancy') || s.includes('hiring') ||
    s.includes('resume') || s.includes('interview') || s.includes('internship')
  ) {
    return 'Jobs';
  }

  // Services (Home Services, Healthcare, Electrician, Plumber, Salon, Repair)
  if (
    s.includes('service') || s.includes('electrician') || s.includes('plumber') ||
    s.includes('carpenter') || s.includes('painter') || s.includes('cleaning') ||
    s.includes('repair') || s.includes('cctv') || s.includes('pest control') ||
    s.includes('healthcare') || s.includes('hospital') || s.includes('doctor') ||
    s.includes('clinic') || s.includes('legal') || s.includes('education') ||
    s.includes('salon') || s.includes('spa') || s.includes('digital')
  ) {
    return 'Services';
  }

  // Products (Electronics, IT, Appliances, Furniture, Fashion, Beauty)
  if (
    s.includes('product') || s.includes('electronic') || s.includes('furniture') ||
    s.includes('appliance') || s.includes('fashion') || s.includes('mobile') ||
    s.includes('laptop') || s.includes('clothing') || s.includes('store') ||
    s.includes('dress') || s.includes('beauty') || s.includes('gadget')
  ) {
    return 'Products';
  }

  return 'Products';
};

export const setToken = (token: string | null) => {
  setGlobalToken(token);
  if (!token) {
    setGlobalActiveBusinessId(null);
    setGlobalUser(null);
    clearApiCache();
  }
};

export const getToken = () => getGlobalToken();

export const setVendorUser = (user: any) => {
  if (user && user.businesses && user.businesses.length > 0) {
    const existingActiveId = getGlobalActiveBusinessId();
    const activeBiz = user.businesses.find((b: any) => b && (b._id === existingActiveId || b.id === existingActiveId))
      || user.businesses.find((b: any) => b && (b._id === user.primaryBusinessId || b.id === user.primaryBusinessId))
      || user.businesses[0];

    const activeId = activeBiz ? (activeBiz._id || activeBiz.id) : null;
    setGlobalActiveBusinessId(activeId);
    if (activeBiz) {
      user.vendorType = activeBiz.vendorType;
      user.category = activeBiz.category;
      user.subcategory = activeBiz.subcategory;
      user.baseVendorType = activeBiz.baseVendorType;
      user.businessName = activeBiz.businessName;
      user.logo = activeBiz.logo;
      user.businessLicense = activeBiz.businessLicense;
      user.businessImages = activeBiz.businessImages;
    }
  } else if (!user) {
    setGlobalActiveBusinessId(null);
  }
  setGlobalUser(user);
};

export const getVendorUser = () => {
  return getGlobalUser();
};

export const getActiveBusinessId = () => getGlobalActiveBusinessId();
export const setActiveBusinessId = (id: string | null) => {
  setGlobalActiveBusinessId(id);
  const user = getGlobalUser();
  if (user && user.businesses && id) {
    const activeBiz = user.businesses.find((b: any) => b && (b._id === id || b.id === id));
    if (activeBiz) {
      user.vendorType = activeBiz.vendorType;
      user.category = activeBiz.category;
      user.subcategory = activeBiz.subcategory;
      user.baseVendorType = activeBiz.baseVendorType;
      user.businessName = activeBiz.businessName;
      user.logo = activeBiz.logo;
      user.businessLicense = activeBiz.businessLicense;
      user.businessImages = activeBiz.businessImages;
      setGlobalUser(user);
    }
  }
};

let cachedWorkingBaseUrl: string | null = null;

declare var __DEV__: boolean;

export const getCandidateBaseUrls = (): string[] => {
  const list: string[] = [];
  if (cachedWorkingBaseUrl) {
    list.push(cachedWorkingBaseUrl);
  }

  // 1. Authoritative production backend URL (always primary)
  const primaryUrl = BASE_URL || 'https://vendor.ficapp.in/api';
  list.push(primaryUrl);
  list.push('https://vendor.ficapp.in/api');

  // 2. Development & local fallback URLs ONLY in development mode (__DEV__)
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  if (isDev) {
    if (Platform.OS === 'android') {
      list.push('http://10.0.2.2:8002/api');
      list.push('http://127.0.0.1:8002/api');
    } else {
      list.push('http://localhost:8002/api');
      list.push('http://127.0.0.1:8002/api');
    }
  }

  return Array.from(new Set(list));
};

export const getWorkingSocketUrl = (): string => {
  if (cachedWorkingBaseUrl) {
    const url = cachedWorkingBaseUrl.replace(/\/api\/?$/, '');
    if (url.includes('vendor.ficapp.in')) {
      return 'https://api.ficapp.in';
    }
    return url;
  }
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  if (isDev) {
    return Platform.OS === 'android' ? 'http://10.0.2.2:8002' : 'http://localhost:8002';
  }
  return 'https://api.ficapp.in';
};

// In-flight request deduplication and client response cache
const inFlightRequests = new Map<string, Promise<any>>();
const apiCache = new Map<string, { data: any; expiry: number }>();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds for read-only GET endpoints

export const clearApiCache = (pattern?: string) => {
  if (!pattern) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  }
};

const apiRequest = async (endpoint: string, options: any = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const token = getGlobalToken();
  const activeBusinessId = options.headers?.['x-business-id'] || getGlobalActiveBusinessId();
  const user = getGlobalUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(activeBusinessId ? { 'x-business-id': activeBusinessId } : {}),
    ...(user?.email ? { 'x-vendor-email': user.email } : {}),
    ...(options.headers || {}),
  };

  // Check read cache for GET requests with strict vendor isolation
  const userId = user?._id || user?.id || 'anon';
  const cacheKey = `${method}:${endpoint}:${headers['x-business-id'] || 'default'}:${userId}`;
  if (method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // In-flight request deduplication: return existing promise if identical request is pending
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const executeRequest = async () => {
    let lastError: any = null;
    const candidates = getCandidateBaseUrls();

    // Try candidate URLs to handle physical device, adb reverse, and remote backend
    for (const baseUrl of candidates) {
      const requestTimeoutMs = options.timeout || 15000;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), requestTimeoutMs) : null;
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
          ...(controller ? { signal: controller.signal } : {}),
        });
        if (timeoutId) clearTimeout(timeoutId);

        cachedWorkingBaseUrl = baseUrl;
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (data && typeof data === 'object') {
            return data;
          }
          throw new Error(data?.message || `Request failed with status ${response.status}`);
        }

        // Cache successful GET responses
        if (method === 'GET' && data) {
          apiCache.set(cacheKey, { data, expiry: Date.now() + DEFAULT_CACHE_TTL });
        } else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          // Invalidate cache on mutations
          if (endpoint.includes('/products')) {
            clearApiCache('/vendor/products');
            clearApiCache('/vendor/analytics');
          } else if (endpoint.includes('/orders') || endpoint.includes('/bookings')) {
            clearApiCache('/vendor/orders');
            clearApiCache('/vendor/bookings');
            clearApiCache('/vendor/analytics');
          } else if (endpoint.includes('/profile')) {
            clearApiCache('/vendor/profile');
          }
        }

        return data;
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        if (cachedWorkingBaseUrl === baseUrl) {
          cachedWorkingBaseUrl = null; // Invalidate broken cached URL to allow remaining candidates
        }
        lastError = err;
      }
    }

    if (lastError?.name === 'AbortError' || lastError?.message === 'Aborted') {
      throw new Error('Server response timed out. Please check your network connection.');
    }
    const lastMsg = String(lastError?.message || '');
    if (
      lastMsg.toLowerCase().includes('network request failed') ||
      lastMsg.toLowerCase().includes('failed to fetch')
    ) {
      throw new Error('Unable to connect to backend server. Please verify your internet connection or check that the backend service is running.');
    }
    throw lastError || new Error('Network connection error');
  };

  if (method === 'GET') {
    const requestPromise = executeRequest().finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return executeRequest();
};

/**
 * Upload a local image file or base64 data to the shared backend (/api/vendor/upload).
 * Supports multipart/form-data upload with field 'image'.
 */
export const uploadImageToServer = async (
  imageInput: { base64?: string; localUri?: string; uri?: string; mimeType?: string } | string,
  optionalMimeType: string = 'image/jpeg'
): Promise<string> => {
  try {
    let localUri = '';
    let mimeType = optionalMimeType;

    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        return imageInput; // Already a remote public URL
      }
      localUri = imageInput;
    } else if (imageInput && typeof imageInput === 'object') {
      localUri = imageInput.uri || imageInput.localUri || '';
      mimeType = imageInput.mimeType || optionalMimeType;
    }

    if (!localUri) {
      return '';
    }

    const candidateUrls = getCandidateBaseUrls();
    const token = getGlobalToken();
    const activeBusinessId = getGlobalActiveBusinessId();

    const formData = new FormData();
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const filename = `upload_${Date.now()}.${ext}`;

    formData.append('image', {
      uri: localUri,
      type: mimeType,
      name: filename,
    } as any);

    for (const baseUrl of candidateUrls) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;
      try {
        const uploadRes = await fetch(`${baseUrl}/vendor/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(activeBusinessId ? { 'x-business-id': activeBusinessId } : {}),
          },
          body: formData,
          ...(controller ? { signal: controller.signal } : {}),
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.success && (data.imageUrl || data.url)) {
            let resultUrl = data.imageUrl || data.url;
            if (typeof resultUrl === 'string' && resultUrl.startsWith('/uploads/')) {
              const rootHost = baseUrl.replace(/\/api\/?$/, '');
              resultUrl = `${rootHost}${resultUrl}`;
            }
            cachedWorkingBaseUrl = baseUrl;
            return resultUrl;
          }
        }
      } catch {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    return localUri;
  } catch (err) {
    console.warn('[uploadImageToServer] Error:', err);
    return typeof imageInput === 'string' ? imageInput : ((imageInput as any)?.localUri || (imageInput as any)?.uri || '');
  }
};

const DEFAULT_FALLBACK_IMAGE = '';

export const formatImageUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean || clean.toLowerCase().startsWith('preview')) return '';

  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Cloudinary optimization & HTTPS
  if (clean.includes('res.cloudinary.com')) {
    let cUrl = clean.startsWith('http://res.cloudinary.com') ? clean.replace(/^http:\/\//, 'https://') : clean;
    if (cUrl.includes('/upload/') && !cUrl.includes('/upload/f_auto') && !cUrl.includes('/upload/q_auto') && !cUrl.includes('/upload/w_')) {
      cUrl = cUrl.replace('/upload/', '/upload/f_auto,q_auto,w_500,c_limit/');
    }
    return cUrl;
  }

  let backend = (BASE_URL || 'https://vendor.ficapp.in/api').replace(/\/api\/?$/, '');
  if (!backend || !backend.startsWith('http')) {
    backend = 'https://vendor.ficapp.in';
  }

  // If already absolute HTTP/HTTPS URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (
      clean.includes('trycloudflare.com') ||
      clean.includes(':8000') ||
      clean.includes(':8001') ||
      clean.includes('43.204.141.105') ||
      clean.includes('localhost') ||
      clean.includes('10.0.2.2')
    ) {
      return clean.replace(/^https?:\/\/[^/]+/, backend);
    }
    if (clean.includes('vendor.ficapp.in')) {
      let httpsUrl = clean.replace(/^http:\/\//, 'https://');
      if (httpsUrl.includes('vendor.ficapp.in/uploads/') && !httpsUrl.includes('vendor.ficapp.in/api/uploads/')) {
        httpsUrl = httpsUrl.replace('vendor.ficapp.in/uploads/', 'vendor.ficapp.in/api/uploads/');
      }
      return httpsUrl;
    }
    return clean;
  }

  // Relative path with /uploads/ -> map to /api/uploads/
  if (clean.includes('/uploads/')) {
    const uploadPath = clean.substring(clean.indexOf('/uploads/'));
    const apiUploadPath = uploadPath.startsWith('/api/') ? uploadPath : `/api${uploadPath}`;
    return `${backend}${apiUploadPath}`;
  }

  return clean;
};

// Map API product response to App's BusinessItem
export const mapApiProductToBusinessItem = (product: any, categoryFallback: CategoryKey = 'Products'): BusinessItem => {
  const rawExplicitCat = String(product.mainCategory || product.subNavbarCategory || product.category || categoryFallback || '').trim();
  const normalizedExplicit = normalizeCategory(rawExplicitCat);
  const isExplicitNonJob = ['Food', 'Products', 'Daily Needs', 'Stay', 'Services', 'Travel'].includes(normalizedExplicit);

  const isJob = !isExplicitNonJob && Boolean(
    normalizedExplicit === 'Jobs' ||
    product.mainCategory === 'Jobs' ||
    product.subNavbarCategory === 'Jobs' ||
    product.category === 'Jobs' ||
    categoryFallback === 'Jobs' ||
    (Boolean(product.salaryPackage || product.vacancies || product.skillsRequirement) && !product.foodType && !product.roomClass && !product.roomType)
  );
  const rawCat = isJob ? 'Jobs' : (product.mainCategory || product.subNavbarCategory || product.vendorType || product.category || categoryFallback);
  const resolvedCategory: CategoryKey = isJob ? 'Jobs' : normalizeCategory(rawCat);

  let displayPrice = '₹0';
  if (isJob) {
    if (product.salaryPackage) {
      displayPrice = String(product.salaryPackage).startsWith('₹') ? String(product.salaryPackage) : `₹${product.salaryPackage}`;
    } else if (typeof product.price === 'number' && product.price > 0) {
      if (product.price >= 10000) {
        displayPrice = `₹${(product.price / 100000).toFixed(1).replace(/\.0$/, '')} LPA`;
      } else {
        displayPrice = `₹${product.price} LPA`;
      }
    } else if (product.price) {
      displayPrice = String(product.price).startsWith('₹') ? String(product.price) : `₹${product.price}`;
    } else {
      displayPrice = '₹0';
    }
  } else {
    displayPrice = typeof product.price === 'number' ? `₹${product.price}` : (product.price ? (String(product.price).startsWith('₹') ? String(product.price) : `₹${product.price}`) : '₹0');
  }

  const salPkg = product.salaryPackage || (isJob ? displayPrice.replace(/^₹\s*/, '') : undefined);

  return {
    id: product._id || product.id,
    businessId: String(product.businessId || product.vendorId || product.vendor_id || ''),
    vendorId: String(product.vendorId || product.vendor_id || product.businessId || ''),
    name: product.name,
    detail: product.jobDescription || product.description || product.detail || '',
    price: displayPrice,
    originalPrice: product.originalPrice ? (typeof product.originalPrice === 'number' ? `₹${product.originalPrice}` : String(product.originalPrice)) : undefined,
    isActive: product.status === 'Available',
    category: resolvedCategory,
    image: (() => {
      if (resolvedCategory === 'Jobs') return '';
      const rawImg = product.imageUrl || product.image || (Array.isArray(product.images) && product.images[0]) || DEFAULT_FALLBACK_IMAGE;
      return formatImageUrl(rawImg);
    })(),
    subCategory: product.subCategory || product.subcategory || product.category || 'General',
    itemType: product.itemType || product.specialization || product.roomType || product.foodType || '',
    unit: product.unit || 'count',
    stock: String(product.stock || product.vacancies || 0),
    pinCode: product.pinCode || '',
    // Category-specific fields
    selectedAmenities: product.selectedAmenities || product.amenities || [],
    amenities: product.amenities || product.selectedAmenities || [],
    roomClass: product.roomClass || product.roomType || '',
    numberOfGuests: String(product.numberOfGuests || '0'),
    // Stay specific fields
    hotelName: product.hotelName || product.name || '',
    stayCity: product.stayCity || product.locationCity || '',
    locationCity: product.locationCity || product.stayCity || '',
    stayAddress: product.stayAddress || product.location || '',
    location: product.location || product.stayAddress || '',
    bedType: product.bedType || '',
    roomSize: product.roomSize || '',
    roomView: product.roomView || '',
    checkInTime: product.checkInTime || '',
    checkOutTime: product.checkOutTime || '',
    starRating: product.starRating,
    freeCancellation: product.freeCancellation,
    freeBreakfast: product.freeBreakfast,
    coupleFriendly: product.coupleFriendly,
    payAtHotel: product.payAtHotel,
    propertyType: product.propertyType || '',
    childCategory: product.childCategory || product.itemType || '',
    boardingPoint: product.boardingPoint || '',
    boardingTime: product.boardingTime || '',
    dropPoint: product.dropPoint || '',
    arrivalTime: product.arrivalTime || '',
    totalDistance: product.totalDistance || '',
    busSchedule: product.busSchedule || '',
    routeStops: product.routeStops || [],
    // Travel specific fields
    operator: product.operator || product.operatorName || product.vendorName || product.businessName || '',
    operatorName: product.operatorName || product.operator || product.vendorName || product.businessName || '',
    from: product.from || product.origin || '',
    to: product.to || product.destination || '',
    origin: product.origin || product.from || '',
    destination: product.destination || product.to || '',
    departureTime: product.departureTime || product.boardingTime || '',
    duration: product.duration || product.busSchedule || '',
    badge: product.badge || '',
    vehicleNumber: product.vehicleNumber || product.vehicleRegNo || product.busNumber || '',
    vehicleRegNo: product.vehicleRegNo || product.vehicleNumber || product.busNumber || '',
    busNumber: product.busNumber || product.vehicleNumber || product.vehicleRegNo || '',
    seatsLeft: product.seatsLeft ? Number(product.seatsLeft) : (product.stock ? Number(product.stock) : 0),
    foodType: product.foodType || (product.itemType === 'Veg' || product.itemType === 'Non-Veg' ? product.itemType : ''),
    preparationTime: product.preparationTime || '',
    offer: product.offer && (product.offer.title || product.offer.discountValue || product.offer.offerPrice) ? {
      title: product.offer.title || 'Special Offer',
      description: product.offer.description || '',
      discountType: product.offer.discountType || 'percentage',
      discountValue: Number(product.offer.discountValue || 0),
      originalPrice: Number(product.offer.originalPrice || product.originalPrice || 0),
      offerPrice: Number(product.offer.offerPrice || product.price || 0),
      startDate: product.offer.startDate || '',
      endDate: product.offer.endDate || '',
      startTime: product.offer.startTime || '',
      endTime: product.offer.endTime || '',
      isActive: product.offer.isActive !== false,
    } : undefined,
    // Job fields
    jobType: product.jobType || '',
    jobLocation: product.jobLocation || '',
    experienceRequired: product.experienceRequired || product.experienceLevel || '',
    salaryPackage: salPkg,
    skillsRequirement: Array.isArray(product.skillsRequirement) ? product.skillsRequirement.join(', ') : (product.skillsRequirement || ''),
    jobDescription: product.jobDescription || product.description || product.detail || '',
    deadlineDate: product.deadlineDate || '',
    applicationTips: product.applicationTips || '',
    qualificationRequired: product.qualificationRequired || product.qualification || '',
    linkedProfileUrl: product.linkedProfileUrl || '',
    companyName: isJob ? (product.companyName || product.vendorName || product.businessName || '') : undefined,
    companyWebsite: isJob ? (product.companyWebsite || '') : undefined,
    contactNumber: product.contactNumber || '',
    mailId: product.mailId || '',
    vacancies: String(product.vacancies || product.stock || '0'),
    salaryPeriod: product.salaryPeriod || '',
    experienceLevel: product.experienceLevel || product.experienceRequired || '',
    qualification: product.qualification || product.qualificationRequired || '',
    jobID: isJob ? (product.jobID || (product.id ? `JOB-${String(product.id).slice(-6)}` : '')) : undefined,
    keyResponsibilities: product.keyResponsibilities || product.responsibilities || '',
  };
};

// Map App's BusinessItem to API product payload
export const mapBusinessItemToApiProduct = (item: Partial<BusinessItem>, vendorUser: any) => {
  let priceNum = 0;
  const isJob = item.category === 'Jobs' || (item as any).vendorType === 'Jobs';
  if (isJob) {
    const salStr = item.salaryPackage || item.price || '';
    const matchLpa = String(salStr).match(/([\d.]+)\s*lpa/i);
    if (matchLpa) {
      priceNum = Math.round(parseFloat(matchLpa[1]) * 100000);
    } else {
      const parsed = parseFloat(String(salStr).replace(/[^\d.]/g, ''));
      if (!isNaN(parsed)) {
        priceNum = parsed <= 150 ? Math.round(parsed * 100000) : Math.round(parsed);
      }
    }
  } else {
    priceNum = item.price ? Number(String(item.price).replace(/[^\d]/g, '')) : 0;
  }
  const origPriceNum = item.originalPrice ? Number(String(item.originalPrice).replace(/[^\d]/g, '')) : undefined;

  const validImage = isJob
    ? ''
    : ((item.image && String(item.image).trim().length > 0)
        ? item.image
        : '');

  return {
    ...(item.businessId || item.vendorId ? { businessId: item.businessId || item.vendorId, vendorId: item.vendorId || item.businessId } : {}),
    name: item.name,
    description: item.jobDescription || item.detail,
    detail: item.jobDescription || item.detail,
    price: priceNum,
    originalPrice: origPriceNum,
    category: item.category || 'Products',
    mainCategory: item.category || 'Products',
    subNavbarCategory: item.category || 'Products',
    vendorType: item.category || 'Products',
    subCategory: item.subCategory || 'General',
    subcategory: item.subCategory || 'General',
    itemType: item.itemType || '',
    stock: item.stock ? Number(item.stock) : (item.vacancies ? Number(item.vacancies) : 0),
    unit: item.unit || 'count',
    status: (() => {
      if (item.isActive === false) {
        return ['Services', 'Travel', 'Stay'].includes(item.category || '') ? 'Unavailable' : 'Out of Stock';
      }
      if (['Services', 'Travel', 'Stay'].includes(item.category || '')) {
        return 'Available';
      }
      return Number(item.stock || 0) > 0 ? 'Available' : 'Out of Stock';
    })(),
    offer: item.offer ? {
      title: item.offer.title,
      description: item.offer.description || '',
      discountType: item.offer.discountType || 'percentage',
      discountValue: Number(item.offer.discountValue || 0),
      originalPrice: Number(item.offer.originalPrice || 0),
      offerPrice: Number(item.offer.offerPrice || 0),
      startDate: item.offer.startDate || '',
      endDate: item.offer.endDate || '',
      startTime: item.offer.startTime || '',
      endTime: item.offer.endTime || '',
      isActive: item.offer.isActive !== false,
    } : (item.offer === null ? null : undefined),
    image: validImage,
    imageUrl: validImage,
    pinCode: item.pinCode || vendorUser?.postalCode || '',
    foodType: item.category === 'Food' ? (item.foodType || 'Veg') : undefined,
    roomType: item.category === 'Stay' ? (item.roomClass || item.itemType) : undefined,
    roomClass: item.roomClass,
    numberOfGuests: item.numberOfGuests,
    selectedAmenities: item.selectedAmenities || item.amenities || [],
    amenities: item.amenities || item.selectedAmenities || [],
    // Stay specific fields for Customer App sync
    hotelName: item.hotelName || item.name,
    stayCity: item.stayCity || item.locationCity || '',
    locationCity: item.locationCity || item.stayCity || '',
    stayAddress: item.stayAddress || item.location || '',
    location: item.location || item.stayAddress || '',
    bedType: item.bedType,
    roomSize: item.roomSize,
    roomView: item.roomView,
    checkInTime: item.checkInTime || '',
    checkOutTime: item.checkOutTime || '',
    starRating: item.starRating,
    propertyType: item.propertyType,
    childCategory: item.childCategory || item.itemType,
    freeCancellation: item.freeCancellation,
    freeBreakfast: item.freeBreakfast,
    coupleFriendly: item.coupleFriendly,
    payAtHotel: item.payAtHotel,
    boardingPoint: item.boardingPoint,
    boardingTime: item.boardingTime,
    boardingPoints: item.boardingPoints && item.boardingPoints.length > 0
      ? item.boardingPoints
      : (item.boardingPoint ? [item.boardingPoint] : []),
    dropPoint: item.dropPoint,
    arrivalTime: item.arrivalTime,
    dropPoints: item.droppingPoints || item.dropPoints || (item.dropPoint ? [item.dropPoint] : []),
    droppingPoints: item.droppingPoints || item.dropPoints || (item.dropPoint ? [item.dropPoint] : []),
    totalDistance: item.totalDistance,
    busSchedule: item.busSchedule || item.duration,
    routeStops: item.routeStops,
    // Travel specific fields for Customer App sync
    from: item.from || item.origin || (typeof item.boardingPoint === 'string' ? item.boardingPoint.split('(')[0]?.trim() : ''),
    to: item.to || item.destination || (typeof item.dropPoint === 'string' ? item.dropPoint.split('(')[0]?.trim() : ''),
    origin: item.origin || item.from || (typeof item.boardingPoint === 'string' ? item.boardingPoint.split('(')[0]?.trim() : ''),
    destination: item.destination || item.to || (typeof item.dropPoint === 'string' ? item.dropPoint.split('(')[0]?.trim() : ''),
    departureTime: item.departureTime || item.boardingTime || '',
    duration: item.duration || item.busSchedule || '',
    badge: item.badge || '',
    operator: item.operator || item.operatorName || vendorUser?.businessName || vendorUser?.name || '',
    operatorName: item.operatorName || item.operator || vendorUser?.businessName || vendorUser?.name || '',
    vendorName: item.operatorName || item.operator || vendorUser?.businessName || vendorUser?.name || '',
    bus_name: item.name,
    bus_type: item.subCategory || '',
    subType: item.subCategory || '',
    seatsLeft: item.stock ? Number(item.stock) : 0,
    vehicleNumber: item.vehicleNumber || item.vehicleRegNo || item.busNumber || '',
    vehicleRegNo: item.vehicleRegNo || item.vehicleNumber || item.busNumber || '',
    busNumber: item.busNumber || item.vehicleNumber || item.vehicleRegNo || '',
    // Job fields
    jobType: item.jobType,
    jobLocation: item.jobLocation,
    experienceRequired: item.experienceRequired,
    salaryPackage: item.salaryPackage,
    skillsRequirement: item.skillsRequirement,
    jobDescription: item.jobDescription || item.detail,
    deadlineDate: item.deadlineDate,
    applicationTips: item.applicationTips,
    qualificationRequired: item.qualificationRequired,
    linkedProfileUrl: item.linkedProfileUrl,
    companyName: item.companyName,
    companyWebsite: item.companyWebsite,
    contactNumber: item.contactNumber,
    mailId: item.mailId,
    vacancies: item.vacancies || String(item.stock || '0'),
    salaryPeriod: item.salaryPeriod || (item.salaryPackage ? 'per year' : ''),
    experienceLevel: item.experienceLevel || item.experienceRequired,
    qualification: item.qualification || item.qualificationRequired,
    preparationTime: item.preparationTime,
    specialization: item.category === 'Services' ? item.itemType : undefined,
    jobID: item.jobID,
    keyResponsibilities: item.keyResponsibilities,
  };
};

// --- API Calls ---

// Auth
export const loginVendor = async (email: string, password: string, rememberMe: boolean = true) => {
  const data = await apiRequest('/auth/login-vendor', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data && data.success && data.user) {
    const u = data.user;
    const statusLower = String(u.status || u.approvalStatus || '').toLowerCase();
    const isPending = Boolean(
      data.isPendingApproval ||
      u.isApproved === false ||
      [
        'pending',
        'submitted',
        'pending_pincode_approval',
        'pincode_approved',
        'kyc_pending',
        'kyc_in_progress',
        'payment_pending',
        'pincode_rejected',
        'kyc_rejected',
        'pending pincode admin review',
      ].includes(statusLower) ||
      ['pending_pincode_approval', 'pending_kyc_approval', 'pending_payment_approval'].includes(String(u.approvalStatus || '').toLowerCase())
    );
    const isSuspended = Boolean(
      u.isSuspended ||
      u.isLocked ||
      ['suspended', 'inactive', 'terminated'].includes(statusLower) ||
      String(u.approvalStatus || '').toLowerCase() === 'suspended'
    );
    const isRejected = Boolean(
      data.isRejected ||
      u.isRejected ||
      ['rejected', 'cancelled'].includes(statusLower) ||
      String(u.approvalStatus || '').toLowerCase() === 'rejected'
    );

    if (!isPending && !isSuspended && !isRejected) {
      setToken(data.token);
      setVendorUser(data.user);
      try {
        await sessionManager.saveSession(data.token, data.user, rememberMe);
      } catch (e) {
        console.warn('[loginVendor] Failed to persist session:', e);
      }
    }
  }
  return data;
};

export const logoutVendor = async () => {
  setToken(null);
  setVendorUser(null);
  clearApiCache();
  try {
    await sessionManager.clearSession();
  } catch (e) {
    console.warn('[logoutVendor] Failed to clear session:', e);
  }
};

export const registerVendor = async (payload: any) => {
  // Pre-upload local file URIs to AWS S3 if present
  let resolvedLogo = payload.shopLogo || payload.logo || '';
  if (resolvedLogo && (resolvedLogo.startsWith('file://') || resolvedLogo.startsWith('content://'))) {
    try {
      resolvedLogo = await uploadImageToServer(resolvedLogo, 'image/jpeg');
    } catch (e) {
      console.warn('[registerVendor] Logo upload fallback:', e);
    }
  }

  let resolvedLicense = payload.licenseFile || payload.businessLicense || '';
  if (resolvedLicense && (resolvedLicense.startsWith('file://') || resolvedLicense.startsWith('content://'))) {
    try {
      resolvedLicense = await uploadImageToServer(resolvedLicense, 'application/pdf');
    } catch (e) {
      console.warn('[registerVendor] License upload fallback:', e);
    }
  }

  let resolvedImages: string[] = [];
  if (Array.isArray(payload.businessImages) && payload.businessImages.length > 0) {
    resolvedImages = await Promise.all(
      payload.businessImages.map(async (imgUri: string) => {
        if (imgUri && (imgUri.startsWith('file://') || imgUri.startsWith('content://'))) {
          try {
            return await uploadImageToServer(imgUri, 'image/jpeg');
          } catch {
            return imgUri;
          }
        }
        return imgUri;
      })
    );
  }

  const finalPayload = {
    ...payload,
    name: payload.name || payload.contactPerson,
    logo: resolvedLogo,
    shopLogo: resolvedLogo,
    businessLicense: resolvedLicense,
    licenseFile: resolvedLicense,
    businessImages: resolvedImages,
  };

  const data = await apiRequest('/auth/register-vendor', {
    method: 'POST',
    body: JSON.stringify(finalPayload),
  });
  return data;
};

// Catalog / Products
export const fetchProducts = async (): Promise<BusinessItem[]> => {
  const data = await apiRequest('/vendor/products?type=all', {
    method: 'GET',
  });
  const category = normalizeCategory(getVendorUser()?.vendorType || 'Products');
  if (data && data.data) {
    return (data.data || []).map((prod: any) => mapApiProductToBusinessItem(prod, category));
  }
  return [];
};

export const fetchAllBusinessesProducts = async (): Promise<BusinessItem[]> => {
  try {
    const user = getVendorUser();
    const businesses = user?.businesses || [];
    const allItems: BusinessItem[] = [];
    const seenIds = new Set<string>();

    const appendItems = (items: BusinessItem[]) => {
      for (const item of items) {
        const pid = item?.id;
        if (pid && !seenIds.has(pid)) {
          seenIds.add(pid);
          allItems.push(item);
        }
      }
    };

    // 1. Fetch products using the unified vendor-level endpoint (matches parent ID & all vendor outlets)
    try {
      const data = await apiRequest('/vendor/products?type=all', {
        method: 'GET',
      });
      if (data && data.data && Array.isArray(data.data)) {
        appendItems(
          data.data.map((prod: any) =>
            mapApiProductToBusinessItem(prod, prod.mainCategory || prod.category || prod.vendorType || 'Products')
          )
        );
      }
    } catch (err) {
      console.warn('[fetchAllBusinessesProducts] Global fetch error:', err);
    }

    // 2. Query each registered business outlet to ensure complete multi-outlet catalog coverage
    if (businesses.length > 0) {
      await Promise.all(
        businesses.map(async (biz: any) => {
          const bId = biz._id || biz.id;
          if (!bId) return;
          try {
            const res = await apiRequest('/vendor/products?type=all', {
              method: 'GET',
              headers: { 'x-business-id': bId },
            });
            if (res && res.data && Array.isArray(res.data)) {
              const bizCat = normalizeCategory(biz.vendorType || biz.category || biz.baseVendorType);
              appendItems(
                res.data.map((prod: any) =>
                  mapApiProductToBusinessItem(prod, prod.mainCategory || prod.category || prod.vendorType || bizCat)
                )
              );
            }
          } catch (err) {
            console.warn(`Failed to fetch products for business ${bId}:`, err);
          }
        })
      );
    }

    return allItems;
  } catch (err) {
    console.warn('Error fetching products from MongoDB Atlas:', err);
  }
  return [];
};

export const createProduct = async (item: Partial<BusinessItem>): Promise<BusinessItem> => {
  const user = getVendorUser();
  const payload = mapBusinessItemToApiProduct(item, user);

  // Sync x-business-id header to matching category business outlet if present
  let targetBizId = getActiveBusinessId();
  if (user?.businesses && item.category) {
    const matchingBiz = user.businesses.find((b: any) =>
      normalizeCategory(b.vendorType || b.category || b.baseVendorType) === item.category
    );
    if (matchingBiz) {
      targetBizId = matchingBiz._id || matchingBiz.id || targetBizId;
    }
  }

  const data = await apiRequest('/vendor/products', {
    method: 'POST',
    headers: targetBizId ? { 'x-business-id': targetBizId } : {},
    body: JSON.stringify(payload),
  });
  clearApiCache('/vendor/products');
  clearApiCache('/vendor/analytics');
  const category = (item.category || data?.data?.category || user?.vendorType || 'Products') as CategoryKey;
  if (data && data.data) {
    return mapApiProductToBusinessItem(data.data, category);
  }
  throw new Error('Failed to create product in MongoDB Atlas');
};

export const updateProduct = async (id: string, item: Partial<BusinessItem>): Promise<BusinessItem> => {
  const payload = mapBusinessItemToApiProduct(item, getVendorUser());
  const data = await apiRequest(`/vendor/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  clearApiCache('/vendor/products');
  clearApiCache('/vendor/analytics');
  const category = (item.category || data?.data?.category || getVendorUser()?.vendorType || 'Products') as CategoryKey;
  if (data && data.data) {
    return mapApiProductToBusinessItem(data.data, category);
  }
  throw new Error('Failed to update product in MongoDB Atlas');
};

export const deleteProduct = async (id: string) => {
  const data = await apiRequest(`/vendor/products/${id}`, {
    method: 'DELETE',
  });
  clearApiCache('/vendor/products');
  clearApiCache('/vendor/analytics');
  return data;
};

export const applyListingOffer = async (
  productId: string,
  existingItem: BusinessItem,
  offerData: NonNullable<BusinessItem['offer']>
): Promise<BusinessItem> => {
  return await updateProduct(productId, {
    ...existingItem,
    price: `₹${offerData.offerPrice}`,
    originalPrice: `₹${offerData.originalPrice}`,
    offer: offerData,
  });
};

export const removeListingOffer = async (
  productId: string,
  existingItem: BusinessItem
): Promise<BusinessItem> => {
  const restoredBasePrice = existingItem.offer?.originalPrice || existingItem.originalPrice || existingItem.price;
  const numBase = typeof restoredBasePrice === 'number'
    ? restoredBasePrice
    : Number(String(restoredBasePrice).replace(/[^\d]/g, '')) || 0;

  return await updateProduct(productId, {
    ...existingItem,
    price: `₹${numBase}`,
    originalPrice: undefined,
    offer: undefined,
  });
};

export interface CustomerItem {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  customerId?: string;
  customerDisplayId?: string;
  registrationId?: string;
  userRegistrationId?: string;
  memberId?: string;
  address?: string;
  avatarUrl?: string;
  ordersCount: number;
  visits?: number;
  totalSpent: number;
}

export interface CustomerPurchaseItem {
  _id: string;
  order_number?: string;
  orderNumber?: string;
  type?: string;
  category?: string;
  itemName?: string;
  items?: any[];
  amount?: number;
  finalAmount?: number;
  orderDate?: string;
  createdAt?: string;
  created_at?: string;
  appointmentDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  roomNumber?: string;
  appointmentTimeSlot?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

export const fetchCustomers = async (): Promise<CustomerItem[]> => {
  const data = await apiRequest('/vendor/customers', {
    method: 'GET',
  });
  if (data && data.data && Array.isArray(data.data)) {
    return data.data.map((c: any) => ({
      id: c._id || c.id || '',
      _id: c._id || c.id || '',
      name: c.name || 'Customer',
      email: c.email || '',
      phone: c.phone || '',
      gender: c.gender || '',
      customerId: c.customerId || '',
      customerDisplayId: c.customerDisplayId || '',
      registrationId: c.registrationId || '',
      userRegistrationId: c.userRegistrationId || '',
      memberId: c.memberId || '',
      address: c.address || '',
      avatarUrl: c.avatarUrl || '',
      ordersCount: Number(c.ordersCount || c.visits || 0),
      visits: Number(c.visits || c.ordersCount || 0),
      totalSpent: Number(c.totalSpent || 0),
    }));
  }
  return [];
};

export const fetchCustomerPurchases = async (
  customerId: string,
  query?: { email?: string; phone?: string; name?: string }
): Promise<CustomerPurchaseItem[]> => {
  const queryParams = new URLSearchParams();
  if (query?.email) queryParams.append('email', query.email);
  if (query?.phone) queryParams.append('phone', query.phone);
  if (query?.name) queryParams.append('name', query.name);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const data = await apiRequest(`/vendor/customers/${encodeURIComponent(customerId)}/purchases${qs}`, {
    method: 'GET',
  });
  if (data && data.data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
};

// Orders, Bookings & Applications
export const fetchOrders = async () => {
  const data = await apiRequest('/vendor/orders', {
    method: 'GET',
  });
  if (data && data.data) {
    return data.data;
  }
  return [];
};

export const fetchOrderById = async (id: string): Promise<any | null> => {
  if (!id) return null;
  try {
    const data = await apiRequest(`/vendor/orders/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (data && (data.data || data.order || data.booking)) {
      return data.data || data.order || data.booking;
    }
    return data || null;
  } catch (err) {
    console.warn('[apiService] fetchOrderById failed:', err);
    return null;
  }
};

export const fetchBookings = async () => {
  const data = await apiRequest('/vendor/bookings', {
    method: 'GET',
  });
  if (data && data.data) {
    return data.data;
  }
  return [];
};

export const fetchApplications = async () => {
  const data = await apiRequest('/vendor/applications', {
    method: 'GET',
  });
  if (data && data.data) {
    return data.data;
  }
  return [];
};

export const fetchVendorNotifications = async (): Promise<any[]> => {
  try {
    const data = await apiRequest('/vendor/notifications', {
      method: 'GET',
    });
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data && Array.isArray(data.notifications)) {
      return data.notifications;
    }
  } catch (e) {}
  return [];
};

export const markVendorNotificationReadApi = async (id?: string) => {
  try {
    const endpoint = id ? `/vendor/notifications/${id}/read` : '/vendor/notifications/read-all';
    await apiRequest(endpoint, {
      method: 'PUT',
    });
  } catch (e) {}
};

export const markNotificationAsRead = markVendorNotificationReadApi;

export const getOrGenerateVendorDeviceToken = async (): Promise<string> => {
  try {
    const user = getVendorUser();
    const userId = user?.vendorId || user?._id || user?.id || user?.registrationId || 'vendor';
    const cached = await sessionManager.getVendorCache(userId, 'fcm_device_token', 365 * 86400000);
    if (cached && typeof cached === 'string' && cached.length > 10) {
      return cached;
    }
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const newToken = `fcm_ven_${randomHex}`;
    await sessionManager.saveVendorCache(userId, 'fcm_device_token', newToken);
    return newToken;
  } catch {
    return `fcm_ven_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
};

export const registerDeviceToken = async (fcmToken?: string): Promise<boolean> => {
  try {
    const user = getVendorUser();
    const userId = user?.vendorId || user?._id || user?.id || user?.registrationId || 'vendor';
    const effectiveToken = (fcmToken && fcmToken.length > 10) ? fcmToken : await getOrGenerateVendorDeviceToken();
    if (!effectiveToken) return false;

    // Cache the active registered token
    await sessionManager.saveVendorCache(userId, 'fcm_device_token', effectiveToken);

    const vendorIds = [
      user?._id,
      user?.id,
      user?.vendorId,
      user?.registrationId,
      ...(user?.businesses?.map((b: any) => b._id || b.id || b.businessId) || []),
    ].filter(Boolean).map(String);

    const payload = {
      token: effectiveToken,
      platform: Platform.OS,
      deviceId: `android_vendor_${userId}`,
      userId,
      role: 'vendor',
      vendorId: user?.vendorId || user?._id || user?.id || userId,
      vendorIds,
      businessIds: user?.businesses?.map((b: any) => b._id || b.id || b.businessId) || [],
    };

    // 1. Register with primary endpoint
    try {
      await apiRequest('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (e) {}

    // 2. Also register with shared backend endpoint where FCM push service queries MongoDB
    const socketBase = getWorkingSocketUrl();
    const token = getGlobalToken();
    const targetUrls = [
      'https://api.ficapp.in/api/auth/notifications/register-token',
      `${socketBase}/api/auth/notifications/register-token`,
    ];

    for (const regUrl of Array.from(new Set(targetUrls))) {
      try {
        const resp = await fetch(regUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await resp.json().catch(() => null);
        console.log(`✅ [apiService] FCM Device token registered with backend (${regUrl}):`, data?.status || 'ok');
      } catch (sharedErr: any) {
        console.warn(`[apiService] Shared backend token registration notice (${regUrl}):`, sharedErr?.message || sharedErr);
      }
    }

    return true;
  } catch (err: any) {
    console.warn('[apiService] registerDeviceToken warning:', err?.message || err);
    return false;
  }
};

export const unregisterDeviceToken = async (fcmToken?: string): Promise<boolean> => {
  try {
    const user = getVendorUser();
    const userId = user?.vendorId || user?._id || user?.id || user?.registrationId;
    await apiRequest('/notifications/unregister-token', {
      method: 'POST',
      body: JSON.stringify({ token: fcmToken, userId }),
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const updateOrderStatus = async (
  id: string,
  status: string,
  extraData?: {
    seat?: string;
    allocated_seat?: string;
    travelers?: any[];
    bus_name?: string;
  }
) => {
  const data = await apiRequest(`/vendor/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...(extraData || {}) }),
  });
  clearApiCache('/vendor/orders');
  clearApiCache('/vendor/bookings');
  clearApiCache('/vendor/analytics');
  return data;
};

export const addLocalOrder = async (order: any) => {
  const data = await apiRequest('/vendor/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
  return data && data.data ? data.data : data;
};

// Analytics
export const fetchAnalytics = async () => {
  const data = await apiRequest('/vendor/analytics', {
    method: 'GET',
  });
  if (data && data.data) {
    return data.data;
  }
  return {
    ordersCount: 0,
    totalOrdersCount: 0,
    totalRevenue: 0,
    itemsCount: 0,
    totalItemsCount: 0,
    activeMembershipsCount: 0,
    customersCount: 0,
  };
};

// Profile
export const fetchProfile = async () => {
  const data = await apiRequest('/vendor/profile', {
    method: 'GET',
  });
  if (data && data.success) {
    setVendorUser(data.user);
    return data;
  }
  return { success: false, message: 'Failed to fetch profile' };
};

export const updateProfile = async (payload: any) => {
  const data = await apiRequest('/vendor/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (data && data.success) {
    setVendorUser(data.user);
    return data;
  }
  return data;
};

// Business Creation & Deletion
export const createBusiness = async (payload: any) => {
  const data = await apiRequest('/vendor/business', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data && data.success && data.user) {
    setVendorUser(data.user);
    return data;
  }
  return data;
};

export const deleteBusiness = async (businessId: string) => {
  const data = await apiRequest(`/vendor/business/${businessId}`, { method: 'DELETE' });
  if (data && data.user) {
    setVendorUser(data.user);
  }
  return data;
};

// Delivery Partners CRUD
export const fetchDeliveryPartners = async () => {
  const data = await apiRequest('/vendor/delivery-partners', {
    method: 'GET',
  });
  if (data && data.data) {
    return data.data;
  }
  return [];
};

export const createDeliveryPartner = async (payload: any) => {
  const data = await apiRequest('/vendor/delivery-partners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
};

export const updateDeliveryPartner = async (id: string, payload: any) => {
  const data = await apiRequest(`/vendor/delivery-partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data;
};

export const deleteDeliveryPartner = async (id: string) => {
  const data = await apiRequest(`/vendor/delivery-partners/${id}`, {
    method: 'DELETE',
  });
  return data;
};

// ==========================================
// Dynamic Category Hierarchy (Super Admin Sync)
// ==========================================

export const fetchMainCategories = async (): Promise<string[]> => {
  try {
    const data = await apiRequest('/public/categories/main', { method: 'GET' });
    if (data && data.success && Array.isArray(data.categories) && data.categories.length > 0) {
      return data.categories;
    }
  } catch (err) {
    console.warn('[apiService] fetchMainCategories fallback:', err);
  }
  return ['Products', 'Services', 'Food', 'Daily Needs', 'Stay', 'Travel', 'Jobs', 'Electronics'];
};

export const fetchCategoryHierarchy = async (mainCategory: string): Promise<Record<string, string[]>> => {
  try {
    const data = await apiRequest(`/public/categories?mainCategory=${encodeURIComponent(mainCategory)}`, { method: 'GET' });
    if (data && data.success && Array.isArray(data.subcategories)) {
      const hierarchy: Record<string, string[]> = {};
      data.subcategories.forEach((sub: any) => {
        if (!sub || !sub.name || !sub.isActive) return;
        const subName = sub.name.trim();
        const children = Array.isArray(sub.childCategories)
          ? sub.childCategories
              .filter((c: any) => c && c.isActive !== false && c.name)
              .map((c: any) => c.name.trim())
          : [];
        hierarchy[subName] = children;
      });
      if (Object.keys(hierarchy).length > 0) {
        return hierarchy;
      }
    }
  } catch (err) {
    console.warn(`[apiService] fetchCategoryHierarchy for ${mainCategory} fallback:`, err);
  }
  return {};
};

// ==========================================
// Subscriptions API
// ==========================================

export const fetchSubscriptions = async () => {
  const data = await apiRequest('/vendor/subscriptions', { method: 'GET' });
  return data;
};

export const fetchSubscriptionSummary = async (period?: string) => {
  const qs = period ? `?period=${encodeURIComponent(period)}` : '';
  const data = await apiRequest(`/vendor/subscriptions/summary${qs}`, { method: 'GET' });
  return data;
};

export const fetchSubscriptionHistory = async (period?: string) => {
  const qs = period ? `?period=${encodeURIComponent(period)}` : '';
  const data = await apiRequest(`/vendor/subscriptions/history${qs}`, { method: 'GET' });
  return data;
};

export const createSubscriptionOrder = async (payload: { businessId: string; planId?: string }) => {
  const data = await apiRequest('/vendor/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
};

export const verifySubscriptionPayment = async (payload: {
  businessId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const data = await apiRequest('/vendor/subscriptions/verify-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
};

// ==========================================
// Payments & Settlements API
// ==========================================

export const fetchSalesPayments = async (params?: { page?: number; limit?: number; status?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.status) queryParams.append('status', params.status);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const data = await apiRequest(`/vendor/payments/sales${qs}`, { method: 'GET' });
  return data;
};

export const fetchVendorSettlements = async (params?: { page?: number; limit?: number; status?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.status) queryParams.append('status', params.status);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const data = await apiRequest(`/vendor/settlements${qs}`, { method: 'GET' });
  return data;
};

// ==========================================
// Support Tickets / Queries API
// ==========================================

export const fetchVendorTickets = async () => {
  const data = await apiRequest('/vendor/tickets', { method: 'GET' });
  return data;
};

export const createVendorTicket = async (payload: {
  subject: string;
  message: string;
  category?: string;
  priority?: string;
}) => {
  const data = await apiRequest('/vendor/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
};

export const replyVendorTicket = async (ticketId: string, message: string) => {
  const data = await apiRequest(`/vendor/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return data;
};

// ==========================================
// Accepting Orders & Vendor Ratings API
// ==========================================

export const updateAcceptingOrders = async (isAccepting: boolean) => {
  const data = await apiRequest('/vendor/accepting-orders', {
    method: 'PUT',
    body: JSON.stringify({ isAcceptingOrders: isAccepting, acceptingOrders: isAccepting }),
  });
  return data;
};

export const fetchVendorRatings = async () => {
  const data = await apiRequest('/vendor/ratings', { method: 'GET' });
  return data;
};

// ==========================================
// Authoritative Indian PIN & Mobile Validation Helpers
// ==========================================

export const isValidIndianPincode = (pincode: string | number | undefined | null): boolean => {
  if (!pincode) return false;
  const pinStr = String(pincode).trim();
  // Must be exactly 6 numeric digits, starting with 1-9
  return /^[1-9][0-9]{5}$/.test(pinStr);
};

export const isValidIndianMobile = (phone: string | number | undefined | null): boolean => {
  if (!phone) return false;
  const digits = String(phone).replace(/[^0-9]/g, '');
  // Extract last 10 digits in case +91 or 0 prefix was supplied
  const last10 = digits.slice(-10);
  return last10.length === 10 && /^[6-9][0-9]{9}$/.test(last10);
};

export const sanitizeIndianPincode = (val: string): string => {
  return String(val || '').replace(/[^0-9]/g, '').slice(0, 6);
};

export const sanitizeIndianMobile = (val: string): string => {
  return String(val || '').replace(/[^0-9]/g, '').slice(0, 10);
};



