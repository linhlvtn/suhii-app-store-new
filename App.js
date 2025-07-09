// App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StatusBar, StyleSheet, Text } from 'react-native';
import { MenuProvider } from 'react-native-popup-menu';
// Thêm import cho GestureHandlerRootView
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 

// --- IMPORT CONTEXT ---
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// --- IMPORT CÁC THÀNH PHẦN KHÁC ---\
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';

// --- COMPONENT CON ĐỂ QUẢN LÝ ĐIỀU HƯỚNG ---
const AppNavigator = () => {
  const { user, initializing } = useAuth(); 

  if (initializing) { 
    return (
      <View style={styles.lottieLoadingContainer}>
        {/* <LottieView
          source={require('./assets/loading.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        /> */}
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

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
    // Bọc toàn bộ nội dung của ứng dụng trong GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}> 
      <AuthProvider>
        <MenuProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </MenuProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
    lottieLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    lottieAnimation: {
        width: 150,
        height: 150,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    }
});