/**
 * @format
 */

import { AppRegistry, LogBox, NativeModules, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreAllLogs(true);

// Top-level FCM Background Message Handler (runs when app is in background or closed/terminated)
try {
  const messaging = require('@react-native-firebase/messaging').default;
  if (messaging) {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('🔔 [index.js] FCM Background/Closed Message Received:', remoteMessage);
      if (remoteMessage) {
        const title =
          remoteMessage.notification?.title ||
          remoteMessage.data?.title ||
          'New Vendor Notification';

        const message =
          remoteMessage.notification?.body ||
          remoteMessage.data?.message ||
          remoteMessage.data?.body ||
          'You have a new transaction update.';

        const targetId =
          remoteMessage.data?.targetId ||
          remoteMessage.data?.orderId ||
          remoteMessage.data?.id ||
          '';

        const category =
          remoteMessage.data?.category ||
          remoteMessage.data?.type ||
          'Orders';

        const segment =
          remoteMessage.data?.segment ||
          (category.toLowerCase().includes('job') ? 'Jobs' :
           (category.toLowerCase().includes('service') || category.toLowerCase().includes('stay') || category.toLowerCase().includes('travel') || category.toLowerCase().includes('booking') ? 'Bookings' : 'Orders'));

        const { OrderAlertModule } = NativeModules;
        if (OrderAlertModule && typeof OrderAlertModule.showSystemNotification === 'function') {
          OrderAlertModule.showSystemNotification(
            title,
            message,
            targetId,
            category,
            segment
          );
        }
      }
    });
  }
} catch (e) {
  console.warn('[index.js] FCM Messaging background handler fallback:', e?.message || e);
}

AppRegistry.registerComponent(appName, () => App);
