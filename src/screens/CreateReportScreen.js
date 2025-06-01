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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';

const CLOUDINARY_CLOUD_NAME = 'dq802xggt'; // CLOUD NAME CỦA BẠN
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset'; // Tên preset bạn đã tạo

const CreateReportScreen = ({ navigation }) => {
  const [price, setPrice] = useState(''); // Giá tiền định dạng chuỗi
  const [rawPrice, setRawPrice] = useState(''); // Giá tiền gốc (số) để lưu vào DB
  const [service, setService] = useState('Nail');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hàm định dạng số tiền thành chuỗi có dấu chấm
  const formatCurrency = (num) => {
    if (!num) return '';
    // Loại bỏ tất cả ký tự không phải số
    let cleanNum = num.toString().replace(/[^0-9]/g, '');
    // Định dạng thành chuỗi có dấu chấm
    return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Hàm xử lý thay đổi text input cho giá tiền
  const handlePriceChange = (text) => {
    // Lưu giá trị gốc (chỉ số)
    const numericValue = text.replace(/[^0-9]/g, '');
    setRawPrice(numericValue);

    // Lưu giá trị đã định dạng để hiển thị
    setPrice(formatCurrency(numericValue));
  };

  // Hàm chọn ảnh từ thư viện hoặc chụp ảnh
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

  // Hàm chụp ảnh từ camera
  const takePhoto = async () => {
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

  // Hàm tải ảnh lên Cloudinary
// Hàm tải ảnh lên Cloudinary
const uploadImageToCloudinary = async (uri) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      Alert.alert('Lỗi cấu hình Cloudinary', 'Vui lòng điền CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET trong CreateReportScreen.js');
      return null;
  }

  const formData = new FormData();

  // Kiểm tra nếu URI là một data URI (thường gặp trên web)
  if (uri.startsWith('data:')) {
    // Chuyển đổi data URI thành Blob
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, 'report_image.jpg'); // Append Blob trực tiếp với tên file
    } catch (error) {
      console.error('Lỗi chuyển đổi data URI sang Blob:', error);
      Alert.alert('Lỗi ảnh', 'Không thể xử lý ảnh cho phiên bản web. Vui lòng thử lại.');
      return null;
    }
  } else {
    // Đối với các URI thông thường (thường là mobile, hoặc URL từ xa)
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg', // Có thể cần thay đổi type nếu ảnh là PNG/khác
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
    return response.data.secure_url; // Trả về URL của ảnh đã tải lên
  } catch (error) {
    console.error('Lỗi tải ảnh lên Cloudinary:', error.response ? error.response.data : error.message);
    Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.');
    return null;
  }
};

  // Hàm xử lý khi gửi báo cáo
  const handleSubmitReport = async () => {
    // Sử dụng rawPrice (số) để kiểm tra và lưu
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
        price: numericPrice, // LƯU GIÁ TRỊ SỐ VÀO FIRESTORE
        service: service,
        note: note,
        paymentMethod: paymentMethod,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Thành công', 'Báo cáo đã được tạo thành công!');
      // Reset form
      setPrice('');
      setRawPrice(''); // Reset rawPrice
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Tạo Báo cáo Mới</Text>

      <TextInput
        style={styles.input}
        placeholder="Giá tiền (VNĐ)"
        keyboardType="numeric"
        value={price} // HIỂN THỊ GIÁ TRỊ ĐÃ ĐỊNH DẠNG
        onChangeText={handlePriceChange} // SỬ DỤNG HÀM MỚI
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Dịch vụ:</Text>
        <Picker
          selectedValue={service}
          onValueChange={(itemValue) => setService(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Nail" value="Nail" />
          <Picker.Item label="Mi" value="Mi" />
          <Picker.Item label="Gội đầu" value="Gội đầu" />
          <Picker.Item label="Khác" value="Khác" />
        </Picker>
      </View>

      <TextInput
        style={[styles.input, styles.noteInput]}
        placeholder="Ghi chú (tùy chọn)"
        multiline
        numberOfLines={4}
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Hình thức thanh toán:</Text>
        <Picker
          selectedValue={paymentMethod}
          onValueChange={(itemValue) => setPaymentMethod(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Tiền mặt" value="Tiền mặt" />
          <Picker.Item label="Chuyển khoản" value="Chuyển khoản" />
        </Picker>
      </View>

      <View style={styles.imagePickerButtons}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>Chọn ảnh từ thư viện</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
          <Text style={styles.imageButtonText}>Chụp ảnh</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.pickedImage} />
      )}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitReport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Tạo Báo cáo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  imageButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    resizeMode: 'contain',
    backgroundColor: '#e9e9e9',
  },
  submitButton: {
    width: '100%',
    padding: 18,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateReportScreen;