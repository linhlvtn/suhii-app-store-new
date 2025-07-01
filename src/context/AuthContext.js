// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, onSnapshot } from 'firebase/firestore'; 
import { auth, db } from '../../firebaseConfig';
import { Alert } from 'react-native'; // Import Alert để hiển thị thông báo lỗi quyền truy cập

// Tạo Context
export const AuthContext = createContext();

// Tạo Provider - "Nhà cung cấp" dữ liệu
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [users, setUsers] = useState([]); 

    // useEffect để theo dõi trạng thái xác thực người dùng (login/logout)
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
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
                // Nếu không có người dùng (đã đăng xuất), reset vai trò và xóa danh sách users
                setUserRole(null);
                setUsers([]); // Xóa danh sách users khi không có người dùng
            }
            
            if (initializing) {
                setInitializing(false);
            }
        });

        return unsubscribeAuth; // Hủy đăng ký lắng nghe xác thực khi component unmount
    }, [initializing]); 

    // useEffect MỚI để tải danh sách tất cả người dùng CHỈ KHI CÓ USER ĐĂNG NHẬP
    useEffect(() => {
        let unsubscribeUsers;
        if (user) { // Chỉ tải danh sách người dùng nếu user đã được xác thực (không phải null)
            console.log("✅ [AuthContext] User authenticated, subscribing to all users...");
            unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                const fetchedUsers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(fetchedUsers);
                console.log("✅ [AuthContext] Đã tải danh sách người dùng:", fetchedUsers.length, "người.");
            }, (error) => {
                console.error("Lỗi khi tải danh sách người dùng trong AuthContext (onSnapshot):", error);
                // Hiển thị thông báo lỗi quyền truy cập cho người dùng
                Alert.alert("Lỗi quyền truy cập", "Không thể tải danh sách người dùng. Vui lòng kiểm tra quy tắc bảo mật Firebase của bạn.");
                setUsers([]); // Đặt lại users là mảng rỗng khi có lỗi
            });
        } else {
            console.log("🚫 [AuthContext] No user authenticated, not subscribing to all users.");
            // setUsers([]) đã được gọi trong useEffect trên nếu user là null.
        }

        // Cleanup function cho useEffect này
        return () => {
            if (unsubscribeUsers) {
                console.log("🔄 [AuthContext] Unsubscribing from users collection.");
                unsubscribeUsers(); // Hủy đăng ký lắng nghe người dùng
            }
        };
    }, [user]); // Dependency on 'user' state: useEffect này sẽ chạy lại khi trạng thái 'user' thay đổi


    return (
        <AuthContext.Provider value={{ user, userRole, initializing, users }}> 
            {children}
        </AuthContext.Provider>
    );
};

// Hook tùy chỉnh để sử dụng Context dễ dàng hơn
export const useAuth = () => {
    return useContext(AuthContext);
};