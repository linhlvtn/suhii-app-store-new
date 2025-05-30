// src/screens/StatisticsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StatisticsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab Thống kê</Text>
      <Text>Đây sẽ là nơi hiển thị doanh thu, số lượng khách, biểu đồ và bộ lọc.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
});

export default StatisticsScreen;