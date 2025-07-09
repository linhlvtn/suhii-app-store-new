// src/firebaseConfig.js

import { initializeApp } from 'firebase/app';
// Sử dụng các import tĩnh cho Firebase Auth và AsyncStorage
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; 
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Đảm bảo getStorage được import nếu bạn sử dụng Storage

const firebaseConfig = {
    // Thông tin cấu hình Firebase của bạn
    apiKey: "AIzaSyDGfe3AO839u9-2Esm4xBu9_vR_guS5qHo", // Thay thế bằng API Key thực tế của bạn
    authDomain: "suhii-ef849.firebaseapp.com",
    projectId: "suhii-ef849",
    storageBucket: "suhii-ef849.appspot.com", 
    messagingSenderId: "444753173579",
    appId: "1:444753173579:web:2db658f708e93bafe181ce"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Khởi tạo Firebase Auth với AsyncStorage để duy trì trạng thái đăng nhập
// Đây là cách được khuyến nghị cho React Native (ngoại trừ web)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Khởi tạo Firestore và Storage
const db = getFirestore(app);
const storage = getStorage(app); // Khởi tạo Storage nếu bạn sử dụng nó

// Export để các file khác có thể sử dụng
export { db, auth, storage, app };