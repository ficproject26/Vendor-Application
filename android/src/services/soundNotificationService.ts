import { NativeModules, NativeEventEmitter, Vibration, Platform } from 'react-native';

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

  /**
   * Play incoming order sound & trigger vibration pattern
   */
  playNewOrderSound() {
    try {
      this.isSoundPlaying = true;
      Vibration.vibrate([0, 500, 200, 500]);

      if (OrderAlertModule && typeof OrderAlertModule.playAlertSound === 'function') {
        OrderAlertModule.playAlertSound();
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
    const orderNumber = order.order_number || order.orderNumber || order.id || 'New Order';
    const category = order.category || order.type || 'Order';
    const customerName = order.memberName || order.customer_name || 'Customer';
    const amount = order.finalAmount || order.totalAmount || 0;

    const title = `Incoming ${category} Order (${orderNumber})`;
    const message = `New order from ${customerName} • ₹${amount}`;
    const orderId = (order._id || order.id || '').toString();

    this.showSystemNotification({
      title,
      message,
      targetId: orderId,
      category: 'Orders',
      segment: 'orders',
      playSound: true,
    });
  }

  /**
   * Show order status update in system notification tray
   */
  showOrderStatusNotification(order: any, status: string) {
    if (!order) return;
    const orderNumber = order.order_number || order.orderNumber || order.id || 'Order';
    const title = `Order Status: ${status}`;
    const message = `Order ${orderNumber} has been updated to ${status}.`;
    const orderId = (order._id || order.id || '').toString();

    this.showSystemNotification({
      title,
      message,
      targetId: orderId,
      category: 'Orders',
      segment: 'orders',
      playSound: false,
    });
  }

  /**
   * Show booking notification in system notification tray
   */
  showBookingNotification(booking: any, isNew: boolean = true) {
    if (!booking) return;
    const bookingId = (booking._id || booking.id || booking.bookingNumber || '').toString();
    const serviceName = booking.serviceName || booking.title || booking.hotelName || 'Booking';
    const customerName = booking.customerName || booking.memberName || 'Customer';

    const title = isNew ? `New Booking: ${serviceName}` : `Booking Updated: ${serviceName}`;
    const message = `${customerName} booked ${serviceName} • Status: ${booking.status || 'Confirmed'}`;

    this.showSystemNotification({
      title,
      message,
      targetId: bookingId,
      category: 'Bookings',
      segment: 'bookings',
      playSound: isNew,
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
      segment: 'business',
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
