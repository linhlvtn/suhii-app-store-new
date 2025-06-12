// src/firebaseConfig.js

import { initializeApp } from 'firebase/app';
// SỬA: Import cả getAuth và initializeAuth
import { getAuth, initializeAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
    // Thông tin cấu hình của bạn
    apiKey: "AIzaSyDGfe3AO839u9-2Esm4xBu9_vR_guS5qHo",
    authDomain: "suhii-ef849.firebaseapp.com",
    projectId: "suhii-ef849",
    storageBucket: "suhii-ef849.appspot.com", // Sửa lại tên bucket cho đúng chuẩn
    messagingSenderId: "444753173579",
    appId: "1:444753173579:web:2db658f708e93bafe181ce"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Hàm khởi tạo Auth an toàn
const initializeFirebaseAuth = () => {
    // Nếu là môi trường web, dùng getAuth đơn giản
    if (Platform.OS === 'web') {
        return getAuth(app);
    } else {
        // Nếu là mobile, dùng initializeAuth với persistence để lưu đăng nhập
        try {
            // Dynamic import để tránh lỗi race condition với Hermes engine
            const { getReactNativePersistence } = require('firebase/auth/react-native');
            const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
            
            return initializeAuth(app, {
                persistence: getReactNativePersistence(ReactNativeAsyncStorage)
            });
        } catch (error) {
            console.warn('Không thể khởi tạo auth với persistence, quay về mặc định:', error.message);
            // Nếu có lỗi, fallback về getAuth không lưu trữ
            return getAuth(app);
        }
    }
};

// Khởi tạo auth và db
const auth = initializeFirebaseAuth();
const db = getFirestore(app);

// Export để các file khác có thể sử dụng
export { auth, db, app };