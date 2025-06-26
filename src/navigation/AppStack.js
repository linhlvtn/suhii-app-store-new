import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, StyleSheet, Image, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Import các màn hình
import StoreScreen from '../screens/StoreScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import StatisticsScreen from '../screens/Statistics'; 
import EditReportScreen from '../screens/EditReportScreen';
import EmployeeStatisticsScreen from '../screens/EmployeeStatisticsScreen';
import NotificationScreen from '../screens/NotificationScreen';

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

// --- COMPONENT RỖNG CHO NÚT GIỮA (ĐỊNH NGHĨA 1 LẦN) ---
const EmptyComponent = () => null;

function MainTabs() {
    const navigation = useNavigation();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: ((route) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? '';
                    if (['CreateReport', 'EditReport', 'EmployeeStatistics', 'Notification'].includes(routeName)) {
                        return { display: 'none' };
                    }
                    return styles.tabBar;
                })(route),
                tabBarActiveTintColor: COLORS.black,
                tabBarInactiveTintColor: COLORS.gray,
            })}
        >
            <Tab.Screen 
                name="Trang chủ" 
                component={StoreScreen} 
                options={{ 
                    tabBarIcon: ({ color, size }) => (<Ionicons name="home-outline" color={color} size={size} />),
                    tabBarLabel: ({ color }) => (<Text style={{ color, fontSize: 12 }}>Trang chủ</Text>)
                }} 
            />
            <Tab.Screen 
                name="CreateReportTab" 
                component={EmptyComponent}
                options={{
                    tabBarLabel: () => null,
                    tabBarButton: (props) => (
                        <CustomTabBarButton {...props} onPress={() => navigation.navigate('CreateReport')} />
                    ),
                    tabBarIcon: () => (<Ionicons name="add" size={32} color={COLORS.white} />)
                }}
            />
            <Tab.Screen 
                name="Thống kê" 
                component={StatisticsScreen} 
                options={{ 
                    tabBarIcon: ({ color, size }) => (<Ionicons name="stats-chart-outline" color={color} size={size} />),
                    tabBarLabel: ({ color }) => (<Text style={{ color, fontSize: 12 }}>Thống kê</Text>)
                }} 
            />
        </Tab.Navigator>
    );
}

export default function AppStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen 
                name="MainTabs" 
                component={MainTabs} 
                options={{ 
                    headerShown: false,
                }}
            />
            <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditReport" component={EditReportScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EmployeeStatistics" component={EmployeeStatisticsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notification" component={NotificationScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.white,
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
});
