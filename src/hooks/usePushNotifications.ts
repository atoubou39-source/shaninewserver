import { useEffect } from 'react';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const usePushNotifications = () => {
  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (Capacitor.getPlatform() === 'web') {
      return;
    }

    const registerPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();
    };

    const addListeners = async () => {
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        
        // Save token to Firestore if user is logged in
        const user = auth.currentUser;
        if (user) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              fcmToken: token.value,
              lastTokenUpdate: new Date().toISOString(),
              platform: Capacitor.getPlatform()
            }, { merge: true });
            console.log('FCM Token saved to Firestore for user:', user.uid);
          } catch (err) {
            console.error('Error saving FCM token:', err);
          }
        }
      });

      await PushNotifications.addListener('registrationError', (err: any) => {
        console.error('Registration error: ' + err.error);
      });

      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push received: ' + JSON.stringify(notification));
          // You can show an alert or update UI here
        },
      );

      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
          // Handle navigation if user clicks on notification
        },
      );
    };

    registerPush();
    addListeners();

    // Clean up listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
};
