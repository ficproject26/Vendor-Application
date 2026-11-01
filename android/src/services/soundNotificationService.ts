import { NativeModules, NativeEventEmitter, Vibration, Platform, PermissionsAndroid } from 'react-native';

const { OrderAlertModule } = NativeModules;
const eventEmitter = (OrderAlertModule && typeof OrderAlertModule.addListener === 'function')
  ? new NativeEventEmitter(OrderAlertModule)
  : (OrderAlertModule ? new NativeEventEmitter(OrderAlertModule as any) : null);

export interface SystemNotificationPayload {
  title: string;
  message: string;
  targetId: string;
  category?: string;
  segment?: string;
  playSound?: boolean;
}

export interface NotificationTapEvent {
  targetId: string;
  orderId?: string;
  category: string;
  segment: string;
}

class SoundNotificationService {
  private isSoundPlaying: boolean = false;
  private lastSoundPlayedAt: number = 0;
  private recentNotificationKeys: Map<string, number> = new Map();

  constructor() {
    // Proactively initialize channels on native side
    if (OrderAlertModule && typeof OrderAlertModule.initializeChannels === 'function') {
      try {
        OrderAlertModule.initializeChannels();
      } catch (e) {}
    }
  }

  /**
   * Play incoming order sound & trigger vibration pattern (guarded against duplicate rings)
   */
  playNewOrderSound() {
    try {
      const now = Date.now();
      if (now - this.lastSoundPlayedAt < 2200) {
        return; // Guard against overlapping duplicate rings within 2.2s
      }
      this.lastSoundPlayedAt = now;
      this.isSoundPlaying = true;

      if (OrderAlertModule && typeof OrderAlertModule.playAlertSound === 'function') {
        OrderAlertModule.playAlertSound();
      } else {
        Vibration.vibrate([0, 400, 200, 400]);
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] Sound play warning:', e?.message);
    }
  }

  /**
   * Stop active order sound
   */
  stopNewOrderSound() {
    try {
      this.isSoundPlaying = false;
      this.lastSoundPlayedAt = 0;
      Vibration.cancel();
      if (OrderAlertModule && typeof OrderAlertModule.stopAlertSound === 'function') {
        OrderAlertModule.stopAlertSound();
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] Sound stop warning:', e?.message);
    }
  }

  /**
   * Show a native Android system notification in device notification tray
   */
  showSystemNotification(payload: SystemNotificationPayload) {
    try {
      const {
        title,
        message,
        targetId,
        category = 'Orders',
        segment = 'Orders',
        playSound = true,
      } = payload;

      // Deduplication guard against rapid duplicates within 3 seconds
      const dedupeKey = `${title}_${targetId}_${category}`;
      const now = Date.now();
      const lastSent = this.recentNotificationKeys.get(dedupeKey) || 0;
      if (now - lastSent < 3000) {
        return;
      }
      this.recentNotificationKeys.set(dedupeKey, now);

      // Clean old deduplication entries
      if (this.recentNotificationKeys.size > 50) {
        const cutoff = now - 30000;
        this.recentNotificationKeys.forEach((time, key) => {
          if (time < cutoff) this.recentNotificationKeys.delete(key);
        });
      }

      if (playSound) {
        this.playNewOrderSound();
      }

      if (OrderAlertModule && typeof OrderAlertModule.showSystemNotification === 'function') {
        OrderAlertModule.showSystemNotification(title, message, targetId, category, segment);
      } else if (OrderAlertModule && typeof OrderAlertModule.showNotification === 'function') {
        OrderAlertModule.showNotification(title, message, targetId);
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] Notification show warning:', e?.message);
    }
  }

  /**
   * Show incoming order notification in system notification tray
   */
  showNewOrderNotification(order: any) {
    if (!order) return;
    const orderNumber = order.order_number || order.orderNumber || order.id || order._id || 'Order';
    const rawCat = String(order.category || order.type || '').toLowerCase();
    const detailStr = String(order.product_details || (order.items && order.items[0]?.name) || '').toLowerCase();

    let categoryLabel = 'Product';
    if (['food', 'foods', 'restaurant', 'dining'].includes(rawCat) || /food|restaurant|biryani|chicken|pizza|burger|meal|dish/i.test(detailStr)) {
      categoryLabel = 'Food';
    } else if (['daily needs', 'daily need', 'grocery', 'pharmacy', 'snacks'].includes(rawCat) || /daily|grocer|milk|vegetable|fruit/i.test(detailStr)) {
      categoryLabel = 'Daily Needs';
    }

    const customerName = order.memberName || order.customer_name || order.customerName || 'Customer';
    const numAmount = order.finalAmount ?? order.totalAmount ?? order.amount ?? 0;
    const cleanAmount = typeof numAmount === 'number' ? numAmount : (Number(String(numAmount).replace(/[^\d.-]/g, '')) || 0);
    const amountStr = `₹${cleanAmount.toLocaleString('en-IN')}`;

    let itemsStr = 'Item';
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsStr = order.items.map((i: any) => `${i.quantity || 1}x ${i.name || i.title}`).join(', ');
    } else if (order.product_details) {
      itemsStr = `${order.quantity || 1}x ${order.product_details}`;
    }

    let locStr = '';
    if (order.tableNumber || order.table_number) {
      locStr = ` • Dine-in Table #${order.tableNumber || order.table_number}`;
    } else if (order.roomNumber || order.room_number) {
      locStr = ` • Room #${order.roomNumber || order.room_number}`;
    } else {
      const addr = order.customerAddress || order.deliveryAddress || order.customer_address || order.shippingAddress;
      if (typeof addr === 'string' && addr.trim() && addr !== '[object Object]') {
        locStr = ` • ${addr.trim().slice(0, 30)}`;
      } else if (addr && typeof addr === 'object') {
        const cityOrArea = addr.area || addr.city || addr.street;
        if (cityOrArea) locStr = ` • ${cityOrArea}`;
      }
    }

    const title = `New ${categoryLabel} Order #${orderNumber} (${amountStr})`;
    const message = `${customerName}: ${itemsStr}${locStr}`;
    const orderId = (order.order_number || order.orderNumber || order._id || order.id || orderNumber).toString();

    this.showSystemNotification({
      title,
      message,
      targetId: orderId,
      category: 'Orders',
      segment: 'Orders',
      playSound: true,
    });
  }

  /**
   * Show booking notification in system notification tray
   */
  showBookingNotification(booking: any, isNew: boolean = true) {
    if (!booking) return;
    const bookingId = (booking._id || booking.id || booking.order_number || '').toString();
    const serviceName = booking.serviceName || booking.title || booking.hotelName || booking.bus_name || (booking.items && booking.items[0]?.name) || 'Booking';
    const customerName = booking.customerName || booking.customer_name || booking.memberName || 'Customer';

    const rawCat = String(booking.category || booking.bookingCategory || '').toLowerCase();
    const rawType = String(booking.type || '').toLowerCase();

    let badgeType = 'Service Booking';
    if (Boolean(booking.vehicleNumber || booking.vehicleType || booking.boardingPoint || booking.bus_name || booking.busName || booking.travelDate) ||
        ['travel', 'travels'].includes(rawCat) || ['travel', 'travels'].includes(rawType)) {
      badgeType = 'Travel Booking';
    } else if (Boolean(booking.roomNumber || booking.roomName || booking.staySchedule || booking.hotelName) ||
               ['stay', 'hotel', 'resort'].includes(rawCat) || ['stay', 'hotel', 'resort'].includes(rawType)) {
      badgeType = 'Stay Booking';
    }

    const title = isNew ? `New ${badgeType}: ${serviceName}` : `${badgeType} Updated: ${serviceName}`;
    const message = `${customerName} booked ${serviceName} • Status: ${booking.status || 'Confirmed'}`;

    this.showSystemNotification({
      title,
      message,
      targetId: bookingId,
      category: 'Bookings',
      segment: 'Bookings',
      playSound: true,
    });
  }

  /**
   * Show job application notification in system notification tray
   */
  showJobApplicationNotification(job: any, isNew: boolean = true) {
    if (!job) return;
    const applicationId = (job._id || job.id || job.applicationId || job.order_number || '').toString();
    const jobTitle = job.jobTitle || (job.items && job.items[0]?.name) || job.product_details || 'Job Opening';
    const candidateName = job.candidateName || job.customer_name || job.memberName || 'Candidate';
    const status = job.status || 'Application Received';

    const title = isNew ? `New Job Application: ${jobTitle}` : `Job Application Status: ${jobTitle}`;
    const message = `${candidateName} applied for ${jobTitle} • Status: ${status}`;

    this.showSystemNotification({
      title,
      message,
      targetId: applicationId,
      category: 'Jobs',
      segment: 'Jobs',
      playSound: true,
    });
  }

  /**
   * Show order/booking/job status update in system notification tray
   */
  showOrderStatusNotification(order: any, status: string, previousStatus?: string) {
    if (!order) return;
    const orderNumber = order.order_number || order.orderNumber || order.id || order._id || 'TXN';
    const catStr = String(order.category || order.type || '').toLowerCase();
    const isJob = catStr.includes('job') || Boolean(order.jobTitle || order.candidateResume || order.applicationId);
    const isBooking = !isJob && (
      catStr.includes('service') || catStr.includes('stay') || catStr.includes('travel') ||
      catStr.includes('booking') || catStr.includes('appointment') ||
      Boolean(order.appointmentDate || order.checkInDate || order.travelDate || order.serviceName || order.bus_name)
    );

    const categoryLabel = isJob ? 'Job Application' : (isBooking ? 'Booking' : 'Order');
    const segment = isJob ? 'Jobs' : (isBooking ? 'Bookings' : 'Orders');
    const category = isJob ? 'Jobs' : (isBooking ? 'Bookings' : 'Orders');

    const itemName = order.itemName || order.product_details || (order.items && order.items[0]?.name) || order.serviceName || order.bus_name || order.jobTitle || 'Item';
    const statusTransition = previousStatus && previousStatus !== status ? `${previousStatus} → ${status}` : status;

    const title = `${categoryLabel} Status Updated`;
    const message = `${itemName} (#${orderNumber}): ${statusTransition}`;
    const orderId = (order.order_number || order.orderNumber || order._id || order.id || orderNumber).toString();

    this.showSystemNotification({
      title,
      message,
      targetId: orderId,
      category,
      segment,
      playSound: true,
    });
  }

  /**
   * Show payment confirmation notification in system notification tray
   */
  showPaymentNotification(payment: any) {
    if (!payment) return;
    const paymentId = (payment._id || payment.id || payment.paymentId || '').toString();
    const amount = payment.amount || payment.total || 0;
    const title = 'Payment Received';
    const message = `₹${amount} verified and credited to your account.`;

    this.showSystemNotification({
      title,
      message,
      targetId: paymentId,
      category: 'Payments',
      segment: 'Payments',
      playSound: true,
    });
  }

  /**
   * Get notification intent payload if app was opened via notification tap
   */
  async getInitialNotification(): Promise<NotificationTapEvent | null> {
    try {
      if (OrderAlertModule && typeof OrderAlertModule.getInitialNotification === 'function') {
        const data = await OrderAlertModule.getInitialNotification();
        return data || null;
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] getInitialNotification error:', e?.message);
    }
    return null;
  }

  /**
   * Start native background keep-alive service to receive orders while minimized
   */
  startKeepAliveService() {
    try {
      if (OrderAlertModule && typeof OrderAlertModule.startKeepAliveService === 'function') {
        OrderAlertModule.startKeepAliveService();
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] startKeepAliveService notice:', e?.message);
    }
  }

  /**
   * Stop native background keep-alive service
   */
  stopKeepAliveService() {
    try {
      if (OrderAlertModule && typeof OrderAlertModule.stopKeepAliveService === 'function') {
        OrderAlertModule.stopKeepAliveService();
      }
    } catch (e: any) {
      console.warn('[SoundNotificationService] stopKeepAliveService notice:', e?.message);
    }
  }

  /**
   * Listen for notification tap events while app is running
   */
  onNotificationTapped(listener: (event: NotificationTapEvent) => void): () => void {
    if (!eventEmitter) return () => {};
    const subscription = eventEmitter.addListener('onNotificationTapped', listener);
    return () => {
      subscription.remove();
    };
  }
}

export const soundNotificationService = new SoundNotificationService();
