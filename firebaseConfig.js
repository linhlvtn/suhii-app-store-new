// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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

// Khởi tạo Auth dựa trên platform
let auth;

// Thêm delay cho mobile để đảm bảo Hermes engine sẵn sàng
const initializeFirebaseAuth = () => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  } else {
    try {
      // Dynamic import để tránh lỗi với Hermes
      const { getReactNativePersistence } = require('firebase/auth/react-native');
      const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      return initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
    } catch (error) {
      console.warn('Failed to initialize auth with persistence:', error.message);
      // Fallback về getAuth
      return getAuth(app);
    }
  }
};

// Khởi tạo auth với timeout cho mobile
if (Platform.OS === 'web') {
  auth = initializeFirebaseAuth();
} else {
  // Delay initialization cho mobile
  setTimeout(() => {
    if (!auth) {
      auth = initializeFirebaseAuth();
    }
  }, 100);
  
  // Tạo placeholder auth object
  auth = initializeFirebaseAuth();
}

// Khởi tạo Firestore
const db = getFirestore(app);

export { auth, db, app };