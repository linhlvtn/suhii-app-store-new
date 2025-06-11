// src/navigation/AppStack.js (Code đã được cập nhật hoàn toàn)

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Alert, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import StoreScreen from '../screens/StoreScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import StatisticsScreen from '../screens/StatisticsScreen';

import { auth } from '../../firebaseConfig';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// --- Nút Tạo Báo Cáo Tùy Chỉnh (Floating Action Button) ---
// Đảm bảo các style này sẽ căn giữa icon một cách hoàn hảo
const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.customButtonContainer}
    onPress={onPress}
  >
    <View style={styles.customButton}>
      {children}
    </View>
  </TouchableOpacity>
);

// --- Component Header Logo ---
const HeaderLogo = () => (
  <Image
    source={require('../../assets/icon.png')} // <<== GIỮ NGUYÊN ĐƯỜNG DẪN LOGO
    style={styles.logo}
    resizeMode="contain"
  />
);

// --- Component Header Nút Đăng xuất (ĐÃ CẬP NHẬT) ---
const HeaderLogoutButton = () => {
  const handleSignOut = () => {
    Alert.alert(
      "Xác nhận Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          onPress: () => auth.signOut(),
          style: "destructive"
        }
      ]
    )
  };

  return (
    // Style đã được cập nhật để có kích thước rõ ràng và căn giữa icon
    <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
      <Ionicons name="log-out-outline" size={28} color="#333" />
    </TouchableOpacity>
  );
};

// --- Stack cho Tab "Cửa hàng" ---
function StoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StoreHome"
        component={StoreScreen}
        options={{
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerRight: () => <HeaderLogoutButton />,
          headerLeft: () => <View style={{ width: 50 }} />, // Tăng khoảng trống để căn giữa tốt hơn
        }}
      />
      <Stack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{
          title: "Tạo Báo Cáo Mới",
          headerTitleAlign: "center",
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

// --- Component Rỗng cho Tab ở giữa ---
const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: 'white' }} />;

// --- Cấu trúc Tab Navigator chính (ĐÃ CẬP NHẬT) ---
export default function AppStack() {
  const navigation = useNavigation();

  return (
    <Tab.Navigator
      // --- CẬP NHẬT screenOptions ---
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: ((route) => {
          // Lấy tên của màn hình đang được focus trong Stack
          const routeName = getFocusedRouteNameFromRoute(route) ?? '';
          // Nếu là màn hình CreateReport, ẩn thanh tab đi
          if (routeName === 'CreateReport') {
            return { display: 'none' };
          }
          // Ngược lại, hiển thị bình thường
          return styles.tabBar;
        })(route),
      })}
    >
      <Tab.Screen
        name="Cửa hàng Tab"
        component={StoreStack}
        options={{
          // Thêm nhãn cho tab
          tabBarLabel: 'Trang chủ',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={focused ? '#007bff' : '#777'} />
          ),
        }}
      />
      <Tab.Screen
        name="Tạo Báo Cáo"
        component={EmptyScreen}
        options={{
          tabBarLabel: '', // Không cần nhãn cho nút ở giữa
          tabBarIcon: () => (
            <Ionicons name="add" size={35} color="#fff" />
          ),
          tabBarButton: (props) => (
            <CustomTabBarButton {...props} onPress={() => navigation.navigate('CreateReport')} />
          ),
        }}
      />
      <Tab.Screen
        name="Thống kê"
        component={StatisticsScreen}
        options={{
          // Thêm nhãn cho tab
          tabBarLabel: 'Thống kê',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={26} color={focused ? '#007bff' : '#777'} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- StyleSheet (ĐÃ CẬP NHẬT) ---
const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    height: 70,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  // --- Style cho nhãn của tab ---
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    marginBottom: 5,
  },
  customButtonContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  logo: {
    width: 100,
    height: 40,
  },
  // --- Style cho nút đăng xuất, đảm bảo có kích thước và căn giữa ---
  logoutButton: {
    marginRight: 10,
    width: 40, // Đặt kích thước rõ ràng
    height: 40, // Đặt kích thước rõ ràng
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20, // Bo tròn để vùng bấm tốt hơn
  },
});