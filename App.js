// App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { MenuProvider } from 'react-native-popup-menu';

// --- IMPORT CONTEXT ---
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// --- IMPORT CÁC THÀNH PHẦN KHÁC ---
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';

// --- COMPONENT CON ĐỂ QUẢN LÝ ĐIỀU HƯỚNG ---
const AppNavigator = () => {
  // Sử dụng hook để lấy trạng thái từ "bộ nhớ toàn cục"
  const { user, initializing } = useAuth();

  // Hiển thị vòng quay loading trong khi đang xác thực người dùng
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Sau khi xác thực xong, quyết định hiển thị màn hình nào
  return (
    <>
      <StatusBar barStyle="dark-content" />
      {user ? <AppStack /> : <AuthStack />}
    </>
  );
}


// --- COMPONENT GỐC CỦA ỨNG DỤNG ---
export default function App() {
  return (
    // Bọc toàn bộ ứng dụng bằng AuthProvider và MenuProvider
    <AuthProvider>
      <MenuProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MenuProvider>
    </AuthProvider>
  );
}



// // App.js

// import React, { useState, useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { ActivityIndicator, View, Platform, Alert, StatusBar } from 'react-native';
// import { onAuthStateChanged } from 'firebase/auth';
// import { doc, setDoc } from 'firebase/firestore';
// import * as Notifications from 'expo-notifications';
// import Constants from 'expo-constants';

// import { auth, db } from './firebaseConfig';
// import AuthStack from './src/navigation/AuthStack';
// import AppStack from './src/navigation/AppStack';
// import { MenuProvider } from 'react-native-popup-menu';

// // Cấu hình cách thông báo hiển thị khi ứng dụng đang mở
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

// // --- HÀM ĐĂNG KÝ NHẬN THÔNG BÁO ---
// async function registerForPushNotificationsAsync() {
//   let token;

//   if (Platform.OS === 'android') {
//     await Notifications.setNotificationChannelAsync('default', {
//       name: 'default',
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: '#FF231F7C',
//     });
//   }

//   const { status: existingStatus } = await Notifications.getPermissionsAsync();
//   let finalStatus = existingStatus;

//   if (existingStatus !== 'granted') {
//     const { status } = await Notifications.requestPermissionsAsync();
//     finalStatus = status;
//   }

//   if (finalStatus !== 'granted') {
//     Alert.alert('Thông báo', 'Bạn đã từ chối quyền nhận thông báo.');
//     return;
//   }
  
//   // Lấy Expo Push Token
//   try {
//     const projectId = Constants.expoConfig?.extra?.eas?.projectId;
//     if (!projectId) {
//       throw new Error('Project ID not found. Make sure you are logged in to EAS CLI.');
//     }
//     token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
//   } catch (e) {
//     console.error("Lỗi khi lấy push token:", e);
//     Alert.alert("Lỗi Token", "Không thể lấy mã thông báo đẩy. Vui lòng đảm bảo bạn đã đăng nhập vào EAS CLI và cấu hình dự án đúng cách.");
//   }

//   return token;
// }


// export default function App() {
//   const [user, setUser] = useState(null);
//   const [initializing, setInitializing] = useState(true);

//   useEffect(() => {
//     // Listener theo dõi trạng thái đăng nhập
//     const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
//       setUser(authenticatedUser);
//       if (initializing) {
//         setInitializing(false);
//       }

//       // Nếu người dùng vừa đăng nhập thành công
//       if (authenticatedUser) {
//         // Đăng ký nhận thông báo và lấy token
//         const token = await registerForPushNotificationsAsync();
//         if (token) {
//           // Lưu token vào Firestore
//           const userRef = doc(db, 'users', authenticatedUser.uid);
//           await setDoc(userRef, { pushToken: token }, { merge: true });
//           console.log("Đã lưu push token:", token);
//         }
//       }
//     });

//     // Cleanup subscription on unmount
//     return unsubscribe;
//   }, [initializing]);

//   if (initializing) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <MenuProvider>
//       <NavigationContainer>
//         <StatusBar barStyle="dark-content" />
//         {user ? <AppStack /> : <AuthStack />}
//       </NavigationContainer>
//     </MenuProvider>
//   );
// }