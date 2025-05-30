// FirebaseProvider.js
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDGfe3AO839u9-2Esm4xBu9_vR_guS5qHo",
  authDomain: "suhii-ef849.firebaseapp.com",
  projectId: "suhii-ef849",
  storageBucket: "suhii-ef849.firebasestorage.app",
  messagingSenderId: "444753173579",
  appId: "1:444753173579:web:2db658f708e93bafe181ce"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const FirebaseProvider = ({ children }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseAuth, setFirebaseAuth] = useState(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        let auth;
        
        if (Platform.OS === 'web') {
          auth = getAuth(app);
          setFirebaseAuth(auth);
          setIsFirebaseReady(true);
        } else {
          // Đợi một chút để Hermes engine sẵn sàng
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            const { getReactNativePersistence } = require('firebase/auth/react-native');
            const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
            
            auth = initializeAuth(app, {
              persistence: getReactNativePersistence(ReactNativeAsyncStorage)
            });
          } catch (error) {
            console.warn('Persistence initialization failed, using default auth:', error);
            auth = getAuth(app);
          }
          
          setFirebaseAuth(auth);
          setIsFirebaseReady(true);
        }
      } catch (error) {
        console.error('Firebase initialization error:', error);
        // Fallback
        const auth = getAuth(app);
        setFirebaseAuth(auth);
        setIsFirebaseReady(true);
      }
    };

    initializeFirebase();
  }, []);

  if (!isFirebaseReady) {
    return null; // Hoặc loading component
  }

  return children;
};

// Export auth và db sau khi đã khởi tạo
export const getFirebaseAuth = () => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  
  try {
    const { getReactNativePersistence } = require('firebase/auth/react-native');
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (error) {
    return getAuth(app);
  }
};

export { db, app };