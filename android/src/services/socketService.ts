import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { getToken, getVendorUser, fetchOrders, fetchBookings, fetchApplications, getWorkingSocketUrl } from './apiService';
import { soundNotificationService } from './soundNotificationService';
import { SOCKET_URL_ANDROID, SOCKET_URL_IOS } from './env';
import { VendorActivityNotification } from '../components/NotificationBanner';

type OrderCallback = (order: any) => void;
type StatusCallback = (event: any) => void;
type NotificationCallback = (notification: VendorActivityNotification) => void;

class VendorSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private newOrderListeners: Set<OrderCallback> = new Set();
  private bookingListeners: Set<OrderCallback> = new Set();
  private jobListeners: Set<OrderCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private notificationListeners: Set<NotificationCallback> = new Set();
  private processedOrderIds: Set<string> = new Set();
  private activeToken: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialSeeded: boolean = false;

  /**
   * Determine primary socket server URL
   * Connects to ecosystem realtime server
   */
  private getSocketUrl(): string {
    return getWorkingSocketUrl();
  }

  /**
   * Seed existing orders on startup so history never triggers popups
   */
  seedInitialOrders(orders: any[]) {
    if (Array.isArray(orders)) {
      orders.forEach((o) => {
        const id = (o._id || o.id || o.order_number || o.applicationId || '').toString();
        if (id) {
          this.processedOrderIds.add(id);
        }
        if (o.order_number) {
          this.processedOrderIds.add(o.order_number.toString());
        }
      });
      this.isInitialSeeded = true;
    }
  }

  /**
   * Helper to check if an item/order belongs to the authenticated vendor
   */
  private isOrderForCurrentVendor(order: any, targetVendorId?: string): boolean {
    const currentUser = getVendorUser();
    if (!currentUser) return true; // Fail open if user state not ready

    const vendorIds: string[] = [];
    if (currentUser._id) vendorIds.push(currentUser._id.toString());
    if (currentUser.id) vendorIds.push(currentUser.id.toString());
    if (currentUser.vendorId) vendorIds.push(currentUser.vendorId.toString());
    if (currentUser.primaryBusinessId) vendorIds.push(currentUser.primaryBusinessId.toString());
    if (currentUser.registrationId) vendorIds.push(currentUser.registrationId.toString());

    if (Array.isArray(currentUser.businesses)) {
      currentUser.businesses.forEach((b: any) => {
        if (typeof b === 'string') {
          vendorIds.push(b);
        } else if (b && typeof b === 'object') {
          if (b._id) vendorIds.push(b._id.toString());
          if (b.id) vendorIds.push(b.id.toString());
        }
      });
    }

    const orderVid = (
      order.vendorId ||
      order.vendor_id ||
      order.businessId ||
      targetVendorId ||
      ''
    ).toString();

    // If order has no vendor specified, allow it; otherwise ensure match
    if (!orderVid) return true;
    return vendorIds.some((v) => v.toLowerCase() === orderVid.toLowerCase());
  }

  /**
   * Parse raw order/booking/job object into a uniform VendorActivityNotification
   */
  public parseActivityNotification(rawItem: any): VendorActivityNotification | null {
    if (!rawItem) return null;
    const raw = rawItem.rawOrder || rawItem;

    const id = (raw.order_number || raw.id || raw._id || raw.applicationId || 'ORD').toString();
    const catStr = String(raw.category || '').toLowerCase();
    const typeStr = String(raw.type || '').toLowerCase();
    const orderNumStr = String(raw.order_number || raw.id || '').toUpperCase();

    // 1. Detect Job Application
    const isJob = Boolean(
      catStr === 'jobs' ||
      catStr === 'job' ||
      typeStr === 'job' ||
      typeStr === 'jobs' ||
      orderNumStr.startsWith('JOB') ||
      raw.jobTitle ||
      raw.candidateResume ||
      raw.candidateEducation ||
      raw.experience ||
      raw.applicationId
    );

    if (isJob) {
      const candidateName = raw.candidateName || raw.customer_name || raw.memberName || 'Candidate';
      const jobTitle =
        raw.jobTitle ||
        (raw.items && raw.items[0]?.name) ||
        raw.product_details ||
        'Job Opening';
      const appDate = raw.applicationDate || raw.createdAt ? new Date(raw.applicationDate || raw.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
      const status = raw.status || 'Application Submitted';

      return {
        id,
        category: 'Job',
        title: 'New Job Application',
        customerName: candidateName,
        itemName: jobTitle,
        dateTime: appDate,
        status,
        segment: 'Jobs',
        raw,
        receivedAt: Date.now(),
      };
    }

    // 2. Detect Service Booking
    const isServiceBooking = Boolean(
      catStr === 'services' ||
      catStr === 'stay' ||
      catStr === 'travel' ||
      typeStr === 'services' ||
      typeStr === 'stay' ||
      typeStr === 'travel' ||
      typeStr === 'booking' ||
      typeStr === 'appointment' ||
      orderNumStr.startsWith('BKG') ||
      raw.serviceName ||
      raw.appointmentDate ||
      raw.appointment_slot ||
      raw.boardingPoint ||
      raw.boarding_point ||
      raw.checkInDate ||
      raw.bus_name
    );

    if (isServiceBooking) {
      const travelers = Array.isArray(raw.travelers) ? raw.travelers : [];
      const primaryPassenger = travelers[0]?.name || raw.customer_name || raw.memberName || 'Customer';
      const serviceName =
        raw.serviceName ||
        raw.bus_name ||
        (raw.items && raw.items.map((i: any) => i.name).join(', ')) ||
        raw.product_details ||
        'Service Booking';

      const bookingDate =
        raw.appointment_slot ||
        (raw.appointmentDate ? `${raw.appointmentDate} ${raw.appointmentTimeSlot || ''}` : null) ||
        (raw.createdAt ? new Date(raw.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now');

      const status = raw.status || 'Pending';

      return {
        id,
        category: 'Booking',
        title: 'New Service Booking',
        customerName: primaryPassenger,
        itemName: serviceName,
        dateTime: bookingDate,
        status,
        amount: raw.finalAmount || raw.amount ? `₹${raw.finalAmount || raw.amount}` : undefined,
        segment: 'Bookings',
        raw,
        receivedAt: Date.now(),
      };
    }

    // 4. Default: Product Order
    const customerName = raw.customer_name || raw.memberName || 'Customer';
    const items = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : [];
    const productName = items.length > 0
      ? items.map((i: any) => i.name).join(', ')
      : (raw.product_details || 'Product Order');

    const totalQty = items.length > 0
      ? items.reduce((acc: number, curr: any) => acc + (Number(curr.quantity || curr.qty || 1)), 0)
      : (raw.quantity || 1);

    const orderDate = raw.createdAt
      ? new Date(raw.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      : 'Just now';

    const status = raw.status || 'Placed';
    const finalAmount = raw.finalAmount || raw.totalAmount || raw.amount || 0;

    return {
      id,
      category: 'Order',
      title: 'New Product Order',
      customerName,
      itemName: productName,
      quantity: totalQty,
      amount: `₹${finalAmount}`,
      dateTime: orderDate,
      status,
      segment: 'Orders',
      raw,
      receivedAt: Date.now(),
    };
  }

  /**
   * Process any newly arrived item and notify UI if not yet seen
   */
  private processNewItem(rawItem: any, targetVendorId?: string): boolean {
    if (!rawItem) return false;
    const orderId = (rawItem._id || rawItem.id || rawItem.order_number || rawItem.applicationId || '').toString();
    const orderNumber = (rawItem.order_number || '').toString();

    console.log(`📥 [processNewItem] Checking item: orderId="${orderId}", orderNumber="${orderNumber}", targetVid="${targetVendorId}"`);

    if (!orderId && !orderNumber) {
      console.log('⚠️ [processNewItem] No id or orderNumber found, skipping');
      return false;
    }

    // Deduplication check
    if (
      (orderId && this.processedOrderIds.has(orderId)) ||
      (orderNumber && this.processedOrderIds.has(orderNumber))
    ) {
      console.log(`⏩ [processNewItem] Skipped duplicate: ${orderId || orderNumber}`);
      return false; // Already handled
    }

    // Authorization check
    if (!this.isOrderForCurrentVendor(rawItem, targetVendorId)) {
      console.log(`⛔ [processNewItem] Scoped to another vendor, ignoring: ${rawItem.vendor_id || rawItem.vendorId}`);
      return false; // Scoped to another vendor
    }

    // Record in deduplication set
    if (orderId) this.processedOrderIds.add(orderId);
    if (orderNumber) this.processedOrderIds.add(orderNumber);

    // Format notification
    const notification = this.parseActivityNotification(rawItem);
    if (!notification) {
      console.log('⚠️ [processNewItem] Failed to parse notification format');
      return false;
    }

    if (notification.id) {
      this.processedOrderIds.add(notification.id);
    }

    console.log(`🔔 [VendorSocketService] New ${notification.category} Alert: ${notification.id} - ${notification.itemName}, listeners: ${this.notificationListeners.size}`);

    // Trigger native system tray notification and dispatch to screen data listeners
    if (notification.category === 'Booking') {
      soundNotificationService.showBookingNotification(rawItem, true);
      this.bookingListeners.forEach(cb => {
        try { cb(rawItem); } catch (e) { console.error('Booking listener err:', e); }
      });
    } else if (notification.category === 'Job') {
      soundNotificationService.showSystemNotification({
        title: 'New Candidate Application',
        message: `${notification.customerName || 'Candidate'} applied for ${notification.itemName}`,
        targetId: notification.id,
        category: 'Jobs',
        segment: 'jobs',
        playSound: true,
      });
      this.jobListeners.forEach(cb => {
        try { cb(rawItem); } catch (e) { console.error('Job listener err:', e); }
      });
    } else {
      soundNotificationService.showNewOrderNotification(rawItem);
      this.newOrderListeners.forEach(cb => {
        try { cb(rawItem); } catch (e) { console.error('Order listener err:', e); }
      });
    }

    // Notify Banner / Toast Listeners (Primary Real-Time Notification System)
    this.notificationListeners.forEach((callback) => {
      try {
        console.log('🚀 [socketService] Invoking notification callback for:', notification.id);
        callback(notification);
      } catch (err) {
        console.error('[VendorSocketService] Notification callback error:', err);
      }
    });

    return true;
  }

  /**
   * Periodic background check as resilient fallback across Orders, Bookings & Applications
   */
  private startBackgroundSync() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Seed on first run if not already done
    if (!this.isInitialSeeded) {
      Promise.allSettled([fetchOrders(), fetchBookings(), fetchApplications()])
        .then(([ordRes, bkgRes, appRes]) => {
          const allItems: any[] = [];
          if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value)) allItems.push(...ordRes.value);
          if (bkgRes.status === 'fulfilled' && Array.isArray(bkgRes.value)) allItems.push(...bkgRes.value);
          if (appRes.status === 'fulfilled' && Array.isArray(appRes.value)) allItems.push(...appRes.value);
          if (allItems.length > 0) {
            this.seedInitialOrders(allItems);
          }
        })
        .catch(() => {});
    }

    this.pollInterval = setInterval(async () => {
      try {
        const [ordRes, bkgRes, appRes] = await Promise.allSettled([
          fetchOrders(),
          fetchBookings(),
          fetchApplications()
        ]);

        const allLatest: any[] = [];
        if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value)) allLatest.push(...ordRes.value);
        if (bkgRes.status === 'fulfilled' && Array.isArray(bkgRes.value)) allLatest.push(...bkgRes.value);
        if (appRes.status === 'fulfilled' && Array.isArray(appRes.value)) allLatest.push(...appRes.value);

        if (allLatest.length > 0) {
          if (!this.isInitialSeeded) {
            this.seedInitialOrders(allLatest);
            return;
          }

          // Check for any item not yet processed
          for (const item of allLatest) {
            const oid = (item._id || item.id || item.order_number || item.applicationId || '').toString();
            const onum = (item.order_number || '').toString();
            if ((oid && !this.processedOrderIds.has(oid)) || (onum && !this.processedOrderIds.has(onum))) {
              this.processNewItem(item);
            }
          }
        }
      } catch (e) {
        // Silent error on background poll
      }
    }, 4500);
  }

  /**
   * Connect socket and attach real-time event listeners
   */
  connect(overrideToken?: string | null) {
    const token = overrideToken || getToken();

    // Start background sync fallback immediately
    this.startBackgroundSync();

    if (this.socket && this.socket.connected && this.activeToken === token) {
      return;
    }

    this.activeToken = token || null;

    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (e) {}
      this.socket = null;
    }

    const socketUrl = this.getSocketUrl();
    const user = getVendorUser();
    const vendorId = user?.vendorId || user?._id || user?.id || 'ven-fic-2026-v002';

    console.log(`🔌 [VendorSocketService] Initializing socket connection for vendor: ${vendorId} to ${socketUrl}`);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: token || undefined, userId: vendorId, role: 'vendor' },
      query: { token: token || undefined, userId: vendorId, role: 'vendor' },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.onAny((event: string, ...args: any[]) => {
      console.log(`🔥 [socket onAny: ${event}]`, JSON.stringify(args?.[0] || {}).slice(0, 160));
    });

    this.socket.on('registered', (data: any) => {
      console.log('✅ [VendorSocketService] Server registration response:', JSON.stringify(data));
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('⚡ [VendorSocketService] Real-time socket connected, socket ID:', this.socket?.id);

      // Register identity on socket server
      if (this.socket) {
        this.socket.emit('register', {
          userId: vendorId,
          role: 'vendor',
          token: token || undefined,
        });

        // Join vendor and business specific rooms
        this.socket.emit('subscribe_topic', `vendor:${vendorId}`);
        this.socket.emit('subscribe_topic', `business:${vendorId}`);
        this.socket.emit('join', `vendor:${vendorId}`);
        this.socket.emit('join', vendorId);
        this.socket.emit('join', `business:${vendorId}`);

        if (Array.isArray(user?.businesses)) {
          user.businesses.forEach((b: any) => {
            const bid = b?._id || b?.id || (typeof b === 'string' ? b : null);
            if (bid && this.socket) {
              this.socket.emit('subscribe_topic', `vendor:${bid}`);
              this.socket.emit('subscribe_topic', `business:${bid}`);
              this.socket.emit('join', `vendor:${bid}`);
              this.socket.emit('join', bid);
            }
          });
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('🔌 [VendorSocketService] Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ [VendorSocketService] Connection error:', error.message);
    });

    // 1. Structured Real-time Ecosystem Events
    this.socket.on('realtime_event', (eventData: any) => {
      this.handleIncomingSocketPacket(eventData);
    });

    // 2. Direct Named Event Handlers
    const orderEvents = [
      'order:created',
      'ORDER_CREATED',
      'order_created',
      'booking:created',
      'BOOKING_CREATED',
      'new_booking',
      'new_reservation',
      'application:created',
      'APPLICATION_CREATED',
      'new_order',
      'new_order_received',
      'new_order_placed',
    ];

    orderEvents.forEach((evName) => {
      this.socket?.on(evName, (data: any) => {
        console.log(`🎯 [VendorSocketService] Event handler matched: ${evName}`);
        const item = data?.data || data?.order || data;
        const targetVid = data?.target?.vendorId || data?.target?.userId;
        this.processNewItem(item, targetVid);
      });
    });

    // 3. Status Changed Handler
    this.socket.on('ORDER_STATUS_CHANGED', (statusData: any) => {
      this.handleStatusEvent(statusData);
    });
    this.socket.on('order:status_changed', (statusData: any) => {
      this.handleStatusEvent(statusData);
    });
    this.socket.on('order_status_updated', (statusData: any) => {
      this.handleStatusEvent(statusData);
    });

    // 4. Payment Events Handler
    const paymentEvents = [
      'payment:received',
      'PAYMENT_RECEIVED',
      'payment:completed',
      'PAYMENT_COMPLETED',
      'settlement:processed',
    ];
    paymentEvents.forEach((evName) => {
      this.socket?.on(evName, (data: any) => {
        const payment = data?.data || data?.payment || data;
        soundNotificationService.showPaymentNotification(payment);
      });
    });
  }

  /**
   * Handle incoming structured packet from realtime_event
   */
  private handleIncomingSocketPacket(packet: any) {
    if (!packet) return;
    const evName = String(packet.event || '').toUpperCase();
    const action = String(packet.action || '').toLowerCase();
    const entity = String(packet.entity || '').toLowerCase();

    if (
      evName.includes('CREATED') ||
      action === 'created' ||
      entity === 'order' ||
      entity === 'booking' ||
      entity === 'job'
    ) {
      const item = packet.data || packet.order;
      const targetVid = packet.target?.vendorId || packet.target?.userId;
      this.processNewItem(item, targetVid);
    } else if (evName.includes('STATUS') || action === 'status_changed') {
      this.handleStatusEvent(packet);
    } else if (evName.includes('PAYMENT') || entity === 'payment') {
      const payment = packet.data || packet.payment || packet;
      soundNotificationService.showPaymentNotification(payment);
    }
  }

  /**
   * Handle status updates
   */
  private handleStatusEvent(statusData: any) {
    const raw = statusData?.data || statusData?.order || statusData;
    const status = raw?.status || raw?.orderStatus || 'Updated';
    if (raw) {
      soundNotificationService.showOrderStatusNotification(raw, status);
    }

    this.statusListeners.forEach((callback) => {
      try {
        callback(statusData);
      } catch (e) {
        console.error('[VendorSocketService] Status listener error:', e);
      }
    });
  }

  /**
   * Mark an order/booking/job as handled
   */
  markOrderHandled(orderId: string) {
    if (orderId) {
      this.processedOrderIds.add(orderId.toString());
      soundNotificationService.stopNewOrderSound();
    }
  }

  /**
   * Subscribe to standardized in-app floating notifications
   */
  onNotificationReceived(callback: NotificationCallback): () => void {
    console.log('➕ [socketService] Adding notification listener, previous count:', this.notificationListeners.size);
    this.notificationListeners.add(callback);
    return () => {
      console.log('➖ [socketService] Removing notification listener, remaining:', this.notificationListeners.size - 1);
      this.notificationListeners.delete(callback);
    };
  }

  /**
   * Subscribe to new order alert events (HomeScreen compatibility)
   */
  onNewOrder(callback: OrderCallback): () => void {
    this.newOrderListeners.add(callback);
    return () => {
      this.newOrderListeners.delete(callback);
    };
  }

  /**
   * Subscribe to new booking alert events (Stay, Services, Travel)
   */
  onNewBooking(callback: OrderCallback): () => void {
    this.bookingListeners.add(callback);
    return () => {
      this.bookingListeners.delete(callback);
    };
  }

  /**
   * Subscribe to new candidate job application events
   */
  onNewApplication(callback: OrderCallback): () => void {
    this.jobListeners.add(callback);
    return () => {
      this.jobListeners.delete(callback);
    };
  }

  /**
   * Subscribe to status change events
   */
  onOrderStatusChanged(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Disconnect cleanly
   */
  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (e) {}
      this.socket = null;
    }
    this.isConnected = false;
    soundNotificationService.stopNewOrderSound();
  }
}

export const socketService = new VendorSocketService();
