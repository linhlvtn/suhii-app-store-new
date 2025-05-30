// src/screens/StoreScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'; // Import TouchableOpacity
import { useNavigation } from '@react-navigation/native'; // Hook để lấy đối tượng navigation

const StoreScreen = () => {
  const navigation = useNavigation(); // Sử dụng hook useNavigation

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab Cửa hàng</Text>
      <Text>Đây sẽ là nơi hiển thị danh sách báo cáo.</Text>

      {/* Nút nổi bật để tạo báo cáo mới */}
      <TouchableOpacity
        style={styles.createReportButton}
        onPress={() => navigation.navigate('CreateReport')} // Điều hướng đến màn hình CreateReport
      >
        <Text style={styles.createReportButtonText}>+ Tạo Báo cáo Mới</Text>
      </TouchableOpacity>

      {/* Đây sẽ là nơi hiển thị danh sách các bài báo cáo */}
      <View style={styles.reportListPlaceholder}>
          <Text style={{color: '#666'}}>Danh sách báo cáo sẽ hiển thị ở đây...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Đặt nội dung từ trên xuống
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  createReportButton: {
    backgroundColor: '#007bff', // Màu xanh lam
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    // Để nút nổi bật ở cuối màn hình
    position: 'absolute', // Cho phép định vị tương đối với parent
    bottom: 30,
    alignSelf: 'center', // Căn giữa theo chiều ngang
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8, // Android shadow
  },
  createReportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportListPlaceholder: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
});

export default StoreScreen;