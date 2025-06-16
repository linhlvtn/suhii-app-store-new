// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// Tạo Context
export const AuthContext = createContext();

// Tạo Provider - "Nhà cung cấp" dữ liệu
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            setUser(authenticatedUser);
            
            if (authenticatedUser) {
                // Nếu có người dùng, đi lấy vai trò của họ
                try {
                    const userDocRef = doc(db, 'users', authenticatedUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
                        setUserRole('admin');
                        console.log("✅ [AuthContext] Vai trò đã xác định: admin");
                    } else {
                        setUserRole('employee');
                        console.log("✅ [AuthContext] Vai trò đã xác định: employee");
                    }
                } catch (e) {
                    console.error("Lỗi khi lấy vai trò trong AuthContext:", e);
                    setUserRole('employee'); // Mặc định là employee nếu có lỗi
                }
            } else {
                // Nếu không có người dùng (đã đăng xuất), reset vai trò
                setUserRole(null);
            }
            
            if (initializing) {
                setInitializing(false);
            }
        });

        return unsubscribe;
    }, [initializing]);

    return (
        <AuthContext.Provider value={{ user, userRole, initializing }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook tùy chỉnh để sử dụng Context dễ dàng hơn
export const useAuth = () => {
    return useContext(AuthContext);
};