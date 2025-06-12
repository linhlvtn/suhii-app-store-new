// src/navigation/AppStack.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// MỚI: Import hook useNavigation
import { useNavigation } from '@react-navigation/native';
import { MenuProvider } from 'react-native-popup-menu';
import { auth } from '../../firebaseConfig';

// Import các màn hình
import StoreScreen from '../screens/StoreScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import StatisticsScreen from '../screens/Statistics'; 
import EditReportScreen from '../screens/EditReportScreen';

const COLORS = {
    black: '#121212',
    white: '#FFFFFF',
    gray: '#A9A9A9',
    lightGray: '#F5F5F5',
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
    <TouchableOpacity
        style={styles.customButtonContainer}
        onPress={onPress}
    >
        <View style={styles.customButtonView}>
            {children}
        </View>
    </TouchableOpacity>
);

const TabNavigator = () => {
    // SỬA: Lấy đối tượng navigation bằng hook useNavigation
    const navigation = useNavigation();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarShowLabel: true,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.black,
                tabBarInactiveTintColor: COLORS.gray,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 5,
                },
                headerShown: false,
            }}
        >
            <Tab.Screen 
                name="Store" 
                component={StoreScreen} 
                options={{
                    tabBarLabel: 'Trang chủ',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    )
                }} 
            />
            <Tab.Screen
                name="CreateReportTab"
                component={CreateReportScreen}
                options={{
                    tabBarLabel: () => null,
                    tabBarButton: (props) => (
                        <CustomTabBarButton 
                            {...props} 
                            // SỬA: Gọi navigation từ hook, không phải từ props
                            onPress={() => navigation.navigate('CreateReport')}
                        />
                    ),
                    tabBarIcon: () => (
                        <Ionicons name="add" size={33} color={COLORS.white} style={styles.createButtonIcon} />
                    ),
                }}
            />
            <Tab.Screen 
                name="Statistics" 
                component={StatisticsScreen} 
                options={{
                    tabBarLabel: 'Thống kê',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart-outline" size={size} color={color} />
                    )
                }} 
            />
        </Tab.Navigator>
    );
}

const AppStack = () => {
    const handleLogout = () => {
        Alert.alert( "Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?",
            [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", onPress: () => auth.signOut(), style: 'destructive' }
            ]
        )
    };

    return (
        <MenuProvider>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: COLORS.white },
                    headerTintColor: COLORS.black,
                    headerTitleAlign: 'center',
                    headerShadowVisible: false,
                    headerTitle: () => (
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                        />
                    ),
                    headerRight: () => (
                        <TouchableOpacity onPress={handleLogout} style={styles.headerIconContainer}>
                            <Ionicons name="log-out-outline" size={28} color={COLORS.black} />
                        </TouchableOpacity>
                    ),
                }}
            >
                <Stack.Screen name="MainTabs" component={TabNavigator} />
                <Stack.Screen 
                    name="EditReport" 
                    component={EditReportScreen} 
                    options={{ 
                        title: 'Chỉnh Sửa Báo Cáo',
                        headerTitle: 'Chỉnh Sửa Báo Cáo',
                        headerRight: null,
                    }} 
                />
                <Stack.Screen 
                    name="CreateReport" 
                    component={CreateReportScreen} 
                    options={{ 
                        title: 'Tạo Báo Cáo Mới',
                        headerTitle: 'Tạo Báo Cáo Mới',
                        headerRight: null,
                    }} 
                />
            </Stack.Navigator>
        </MenuProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderRadius: 0,
        height: 65,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        paddingBottom: 5,
    },
    customButtonContainer: {
        top: -25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customButtonView: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: COLORS.black,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    },
    headerLogo: {
        width: 100,
        height: 40,
    },
    createButtonIcon: {
      position: 'relative',
      top: -3,
      left: -1
    },
    // SỬA: Áp dụng style bạn cung cấp
    headerIconContainer: {
        marginRight: 10,
        width: 40,
        height: 40,
        padding: 5,
        // Căn giữa icon bên trong
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AppStack;