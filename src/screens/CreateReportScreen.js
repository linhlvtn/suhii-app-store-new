// src/screens/CreateReportScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform, // Để xử lý style theo nền tảng
} from 'react-native';
// Đảm bảo @react-native-picker/picker đã được cài đặt: npx expo install @react-native-picker/picker
import { Picker } from '@react-native-picker/picker';
// Đảm bảo expo-image-picker đã được cài đặt: npx expo install expo-image-picker
import * as ImagePicker from 'expo-image-picker';
// Đảm bảo axios đã được cài đặt: npm install axios
import axios from 'axios';

import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Đảm bảo react-native-safe-area-context đã cài đặt: npx expo install react-native-safe-area-context
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar'; // Để quản lý thanh trạng thái
import { Ionicons } from '@expo/vector-icons'; // Để dùng icon quay lại

const CLOUDINARY_CLOUD_NAME = 'dq802xggt'; // THAY THẾ BẰNG CLOUD NAME CỦA BẠN
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset'; // Tên preset bạn đã tạo

const CreateReportScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets(); // Dùng để xử lý vùng an toàn trên iOS
  const [price, setPrice] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [service, setService] = useState('Nail');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (num) => {
    if (!num) return '';
    let cleanNum = num.toString().replace(/[^0-9]/g, '');
    return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePriceChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setRawPrice(numericValue);
    setPrice(formatCurrency(numericValue));
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập Camera bị từ chối', 'Vui lòng cho phép ứng dụng truy cập camera để chụp ảnh.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        Alert.alert('Lỗi cấu hình Cloudinary', 'Vui lòng điền CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET trong CreateReportScreen.js');
        return null;
    }

    const formData = new FormData();

    if (uri.startsWith('data:') && Platform.OS === 'web') { // Xử lý đặc biệt cho web
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'report_image.jpg');
      } catch (error) {
        console.error('Lỗi chuyển đổi data URI sang Blob:', error);
        Alert.alert('Lỗi ảnh', 'Không thể xử lý ảnh cho phiên bản web. Vui lòng thử lại.');
        return null;
      }
    } else {
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: 'report_image.jpg',
      });
    }

    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data.secure_url;
    } catch (error) {
      console.error('Lỗi tải ảnh lên Cloudinary:', error.response ? error.response.data : error.message);
      Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.');
      return null;
    }
  };

  const handleSubmitReport = async () => {
    const numericPrice = parseFloat(rawPrice);
    if (!rawPrice || !service || !paymentMethod || !imageUri) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ giá tiền, chọn dịch vụ, hình thức thanh toán và chụp ảnh.');
      return;
    }

    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Lỗi', 'Giá tiền không hợp lệ. Vui lòng nhập số dương.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo báo cáo.');
        return;
      }

      const imageUrl = await uploadImageToCloudinary(imageUri);
      if (!imageUrl) {
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'reports'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.email.split('@')[0],
        price: numericPrice,
        service: service,
        note: note,
        paymentMethod: paymentMethod,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Thành công', 'Báo cáo đã được tạo thành công!');
      setPrice('');
      setRawPrice('');
      setService('Nail');
      setNote('');
      setPaymentMethod('Tiền mặt');
      setImageUri(null);
      navigation.goBack();
    } catch (error) {
      console.error('Lỗi khi gửi báo cáo:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.fullScreenContainer, { paddingTop: insets.top }]}>
      <StatusBar style="dark" /> {/* Để thanh trạng thái có màu tối */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Báo cáo Mới</Text>
        <View style={{width: 28}} /> {/* Giữ chỗ để căn giữa tiêu đề */}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>
        <View style={styles.formSection}>
          <Text style={styles.label}>Giá tiền (VNĐ)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 150.000"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={price}
            onChangeText={handlePriceChange}
          />

          <Text style={styles.label}>Dịch vụ</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={service}
              onValueChange={(itemValue) => setService(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Nail" value="Nail" />
              <Picker.Item label="Mi" value="Mi" />
              <Picker.Item label="Gội đầu" value="Gội đầu" />
              <Picker.Item label="Khác" value="Khác" />
            </Picker>
          </View>

          <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Ghi chú về dịch vụ hoặc khách hàng..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />

          <Text style={styles.label}>Hình thức thanh toán</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(itemValue) => setPaymentMethod(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Tiền mặt" value="Tiền mặt" />
              <Picker.Item label="Chuyển khoản" value="Chuyển khoản" />
            </Picker>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hình ảnh kết quả</Text>
        <View style={styles.imageSection}>
          <View style={styles.imagePickerButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#007bff" />
              <Text style={styles.imageButtonText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color="#007bff" />
              <Text style={styles.imageButtonText}>Chụp ảnh</Text>
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <View style={styles.pickedImageContainer}>
              <Image source={{ uri: imageUri }} style={styles.pickedImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-sharp" size={60} color="#ccc" />
              <Text style={styles.imagePlaceholderText}>Chưa có ảnh được chọn</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Tạo Báo cáo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Nền tổng thể nhẹ nhàng
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: Platform.OS === 'ios' ? 12 : 10, // Tăng padding cho iOS
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fcfcfc',
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fcfcfc',
    overflow: 'hidden', // Đảm bảo picker không tràn ra ngoài border
    // Để cố định chiều cao của Picker trên iOS
    ...Platform.select({
        ios: {
            height: 50,
            justifyContent: 'center',
        }
    })
  },
  picker: {
    width: '100%',
    // Đảm bảo Picker trên Android không có viền thừa
    ...Platform.select({
        android: {
            color: '#333',
        }
    })
  },
  pickerItem: {
    fontSize: 16, // Cỡ chữ cho Picker item
    color: '#333',
  },
  imageSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  imagePickerButtons: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  imageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#e7f0fa', // Màu nền nhẹ
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#cce0f0',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 5,
  },
  imageButtonText: {
    color: '#007bff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pickedImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Đảm bảo ảnh hiển thị đầy đủ
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    padding: 2,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#999',
    marginTop: 10,
    fontSize: 15,
  },
  submitButton: {
    width: '100%',
    padding: 18,
    backgroundColor: '#28a745',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateReportScreen;