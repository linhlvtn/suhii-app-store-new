// src/navigation/AppStack.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StoreScreen from '../screens/StoreScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import CreateReportScreen from '../screens/CreateReportScreen';

const Tab = createBottomTabNavigator();
const StoreStack = createNativeStackNavigator();

const StoreStackScreen = () => {
  return (
    <StoreStack.Navigator screenOptions={{ headerShown: false }}>
      <StoreStack.Screen name="StoreDashboard" component={StoreScreen} />
      <StoreStack.Screen name="CreateReport" component={CreateReportScreen} />
    </StoreStack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Cửa hàng') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Thống kê') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Cửa hàng"
        component={StoreStackScreen}
        options={{
          title: 'Cửa hàng',
        }}
      />

      <Tab.Screen
        name="Thống kê"
        component={StatisticsScreen}
        options={{
          title: 'Thống kê',
        }}
      />
    </Tab.Navigator>
  );
};

export default AppStack;