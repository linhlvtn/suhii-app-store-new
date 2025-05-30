import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from './firebaseConfig'; // Import `auth`

import AuthStack from './src/navigation/AuthStack'; // Import AuthStack
import AppStack from './src/navigation/AppStack'; // Đảm bảo dòng này không bị ghi chú và được viết đúng

export default function App() {
  const [user, setUser] = useState(null); // Lưu trữ thông tin người dùng đã đăng nhập

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // Cập nhật state `user` khi có người dùng đăng nhập/đăng xuất
    });

    return unsubscribe;
  }, []); // Chạy một lần khi component mount

  return (
    <NavigationContainer>
      {user ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}