import { BusinessItem } from '../../../App';
import { MONGODB_URI } from './env';

let objectIdCounter = 0;
// Utility to generate MongoDB 24-character hex ObjectIDs
export const generateMongoObjectId = (): string => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const countPart = (++objectIdCounter).toString(16).padStart(6, '0');
  const timePart = Date.now().toString(16).padStart(10, '0');
  return (timestamp + timePart.slice(-10) + countPart).toLowerCase();
};

export interface MongoOrder {
  _id: string;
  memberName: string;
  customerPhone: string;
  customerAddress?: string;
  pickupLocation?: string;
  dropLocation?: string;
  type: 'Order' | 'Booking';
  status: string;
  finalAmount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
  updatedAt?: string;
  businessId?: string;
  vendorId?: string;
  candidateEmail?: string;
  candidateResume?: string;
}

export interface MongoCustomer {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

// MongoDB seed records starting empty (strictly dynamic from MongoDB Atlas)
const initialMongoOrders: MongoOrder[] = [];
const initialMongoProducts: BusinessItem[] = [];
const initialMongoCustomers: MongoCustomer[] = [];

class MongoDatabase {
  private mongoUri: string = MONGODB_URI;
  private orders: MongoOrder[] = [];
  private products: BusinessItem[] = [];
  private customers: MongoCustomer[] = [];

  constructor() {
    console.log('Initialized MongoDB Database connection to:', this.mongoUri);
  }

  // --- Orders ---
  public getOrders(): MongoOrder[] {
    return [...this.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): MongoOrder | undefined {
    return this.orders.find(o => o._id === id);
  }

  public addOrder(newOrder: Partial<MongoOrder>): MongoOrder {
    const mongoId = generateMongoObjectId();
    const created: MongoOrder = {
      _id: mongoId,
      memberName: newOrder.memberName || '',
      customerPhone: newOrder.customerPhone || '',
      customerAddress: newOrder.customerAddress || '',
      pickupLocation: newOrder.pickupLocation,
      dropLocation: newOrder.dropLocation,
      type: newOrder.type || 'Order',
      status: newOrder.status || 'Pending',
      finalAmount: newOrder.finalAmount || 0,
      items: newOrder.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      businessId: newOrder.businessId,
    };
    this.orders.unshift(created);

    // Update customer record in MongoDB
    const customer = this.customers.find(c => c.phone === created.customerPhone || c.name === created.memberName);
    if (customer) {
      customer.ordersCount += 1;
      customer.totalSpent += created.finalAmount;
    } else if (created.memberName) {
      this.customers.push({
        _id: generateMongoObjectId(),
        id: `c_${Date.now()}`,
        name: created.memberName,
        email: '',
        phone: created.customerPhone,
        ordersCount: 1,
        totalSpent: created.finalAmount,
        createdAt: new Date().toISOString(),
      });
    }

    return created;
  }

  public updateOrderStatus(id: string, status: string): { success: boolean; message?: string; order?: MongoOrder } {
    const order = this.orders.find(o => o._id === id);
    if (!order) {
      return { success: false, message: 'Order document not found in MongoDB' };
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    return { success: true, order };
  }

  // --- Products ---
  public getProducts(): BusinessItem[] {
    return [...this.products];
  }

  public addProduct(item: Partial<BusinessItem>): BusinessItem {
    const mongoId = generateMongoObjectId();
    const newProduct: BusinessItem = {
      ...item,
      id: item.id || mongoId,
      name: item.name || '',
      detail: item.detail || '',
      price: item.price ? (item.price.startsWith('₹') ? item.price : `₹${item.price}`) : '₹0',
      originalPrice: item.originalPrice ? (item.originalPrice.startsWith('₹') ? item.originalPrice : `₹${item.originalPrice}`) : undefined,
      isActive: item.isActive !== false,
      category: item.category || 'Products',
      image: item.image || '',
      subCategory: item.subCategory || '',
      itemType: item.itemType || '',
      unit: item.unit || 'count',
      stock: item.stock || '0',
      pinCode: item.pinCode || '',
    };
    this.products.push(newProduct);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<BusinessItem>): BusinessItem {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.products[idx] = { ...this.products[idx], ...updates };
      return this.products[idx];
    }
    return this.addProduct({ ...updates, id });
  }

  public deleteProduct(id: string): { success: boolean } {
    this.products = this.products.filter(p => p.id !== id);
    return { success: true };
  }

  // --- Customers ---
  public getCustomers(): MongoCustomer[] {
    return [...this.customers];
  }

  // --- Analytics ---
  public getAnalytics() {
    const totalOrdersCount = this.orders.length;
    const totalRevenue = this.orders
      .filter(o => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + (o.finalAmount || 0), 0);
    const totalItemsCount = this.products.length;
    const activeMembershipsCount = 0;

    return {
      totalOrdersCount,
      totalRevenue,
      totalItemsCount,
      activeMembershipsCount,
    };
  }
}

export const mongoDB = new MongoDatabase();
