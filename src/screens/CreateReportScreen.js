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
import { Picker } from '@react-native-picker/picker'; // Để chọn dịch vụ
import * as ImagePicker from 'expo-image-picker'; // Để chọn/chụp ảnh
import { db, auth } from '../../firebaseConfig'; // Import db và auth
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Firebase Firestore
import { getAuth } from 'firebase/auth'; // Để lấy thông tin người dùng hiện tại
import axios from 'axios'; // Để tải ảnh lên Cloudinary

const CLOUDINARY_CLOUD_NAME = 'dq802xggt'; // THAY THẾ BẰNG CLOUD NAME CỦA BẠN
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset'; // Tên preset bạn đã tạo

const CreateReportScreen = ({ navigation }) => {
  const [price, setPrice] = useState('');
  const [service, setService] = useState('Nail'); // Mặc định là Nail
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tiền mặt'); // Mặc định là Tiền mặt
  const [imageUri, setImageUri] = useState(null); // URI của ảnh đã chọn
  const [loading, setLoading] = useState(false);

  // Hàm chọn ảnh từ thư viện hoặc chụp ảnh
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Giảm chất lượng để tải lên nhanh hơn
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
  const uploadImageToCloudinary = async (uri) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        Alert.alert('Lỗi cấu hình Cloudinary', 'Vui lòng điền CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET trong CreateReportScreen.js');
        return null;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: 'image/jpeg', // Hoặc image/png tùy loại ảnh
      name: 'report_image.jpg',
    });
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
    if (!price || !service || !paymentMethod || !imageUri) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ giá tiền, chọn dịch vụ, hình thức thanh toán và chụp ảnh.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Lỗi', 'Giá tiền không hợp lệ. Vui lòng nhập số dương.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = getAuth(auth).currentUser; // Lấy thông tin người dùng hiện tại
      if (!currentUser) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo báo cáo.');
        return;
      }

      // Tải ảnh lên Cloudinary trước
      const imageUrl = await uploadImageToCloudinary(imageUri);
      if (!imageUrl) {
        setLoading(false);
        return; // Dừng lại nếu tải ảnh thất bại
      }

      // Tạo báo cáo trong Firestore
      await addDoc(collection(db, 'reports'), {
        userId: currentUser.uid,
        userEmail: currentUser.email, // Sử dụng email giả để nhận diện nhân viên
        userName: currentUser.email.split('@')[0], // Lấy số điện thoại làm tên nhân viên
        price: numericPrice,
        service: service,
        note: note,
        paymentMethod: paymentMethod,
        imageUrl: imageUrl, // URL của ảnh đã tải lên
        createdAt: serverTimestamp(), // Thời gian tạo báo cáo (tự động của Firestore)
      });

      Alert.alert('Thành công', 'Báo cáo đã được tạo thành công!');
      // Reset form
      setPrice('');
      setService('Nail');
      setNote('');
      setPaymentMethod('Tiền mặt');
      setImageUri(null);
      navigation.goBack(); // Quay lại màn hình trước đó (StoreScreen)
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
        value={price}
        onChangeText={setPrice}
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
    paddingBottom: 50, // Để có khoảng trống đủ khi cuộn
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
    textAlignVertical: 'top', // Để text bắt đầu từ trên cùng
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
    resizeMode: 'contain', // Để ảnh không bị cắt xén
    backgroundColor: '#e9e9e9',
  },
  submitButton: {
    width: '100%',
    padding: 18,
    backgroundColor: '#28a745', // Màu xanh lá cây
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