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
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// --- COMPONENT RADIOBUTTON ---
const RadioButton = ({ options, selectedOption, onSelect }) => {
  return (
    <View>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={styles.radioButtonContainer}
          onPress={() => onSelect(option.value)}
        >
          <View style={[styles.radioCircle, { borderColor: selectedOption === option.value ? '#007bff' : '#e0e0e0' }]}>
            {selectedOption === option.value && <View style={styles.selectedRb} />}
          </View>
          <Text style={styles.radioButtonText}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// --- CÁC HẰNG SỐ VÀ LỰA CHỌN ---
const CLOUDINARY_CLOUD_NAME = 'dq802xggt';
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset';

const SERVICE_OPTIONS = [
  { label: 'Nail', value: 'Nail' },
  { label: 'Mi', value: 'Mi' },
  { label: 'Gội đầu', value: 'Gội đầu' },
  { label: 'Khác', value: 'Khác' },
];

const PAYMENT_OPTIONS = [
  { label: 'Tiền mặt', value: 'Tiền mặt' },
  { label: 'Chuyển khoản', value: 'Chuyển khoản' },
];

const CreateReportScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // --- STATE MANAGEMENT ---
  const [price, setPrice] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [serviceType, setServiceType] = useState(SERVICE_OPTIONS[0].value); // Sử dụng state mới
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].value); // Sử dụng state mới
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false); // State cho Modal Loading

  // --- CÁC HÀM XỬ LÝ (GIỮ NGUYÊN LOGIC GỐC) ---
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

  // =================================================================
  // LOGIC XỬ LÝ HÌNH ẢNH (GIỮ NGUYÊN 100% TỪ CODE GỐC CỦA BẠN)
  // =================================================================
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
    // ... (Toàn bộ hàm này được giữ nguyên y hệt code gốc của bạn)
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        Alert.alert('Lỗi cấu hình Cloudinary', 'Vui lòng điền CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET trong CreateReportScreen.js');
        return null;
    }
    const formData = new FormData();
    if (uri.startsWith('data:') && Platform.OS === 'web') {
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

  // --- HÀM TỐI ƯU HÓA LỰA CHỌN NGUỒN ẢNH ---
  const handleImagePick = () => {
    Alert.alert("Thêm hình ảnh", "Chọn nguồn ảnh của bạn", [
      { text: "Thư viện", onPress: pickImage },
      { text: "Camera", onPress: takePhoto },
      { text: "Hủy", style: "cancel" }
    ]);
  }

  const handleSubmitReport = async () => {
    const numericPrice = parseFloat(rawPrice);
    if (!rawPrice || !serviceType || !paymentMethod || !imageUri) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ giá tiền, chọn dịch vụ, hình thức thanh toán và hình ảnh.');
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
        setLoading(false); // Nhớ tắt loading nếu có lỗi
        return;
      }
      const imageUrl = await uploadImageToCloudinary(imageUri);
      if (!imageUrl) {
        setLoading(false);
        return;
      }

      // --- CẬP NHẬT LOGIC LƯU DỮ LIỆU ---
      await addDoc(collection(db, 'reports'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        // THAY THẾ userName BẰNG employeeName
        employeeName: currentUser.displayName || currentUser.email.split('@')[0], // Lấy displayName, nếu không có thì fallback về email
        price: numericPrice,
        service: serviceType,
        note: note,
        paymentMethod: paymentMethod,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Thành công', 'Báo cáo đã được tạo thành công!');
      // ... (Phần reset state giữ nguyên)
      setPrice('');
      setRawPrice('');
      setServiceType(SERVICE_OPTIONS[0].value);
      setNote('');
      setPaymentMethod(PAYMENT_OPTIONS[0].value);
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
      <StatusBar style="dark" />

      {/* --- MODAL LOADING TOÀN MÀN HÌNH --- */}
      <Modal transparent={true} animationType="fade" visible={loading}>
        <View style={styles.modalBackground}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      </Modal>

      {/* HEADER TÙY CHỈNH ĐÃ ĐƯỢC XÓA BỎ */}
      {/* Hãy dùng header của React Navigation trong AppStack.js */}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* --- Thẻ Giá tiền --- */}
        <View style={styles.card}>
          <Text style={styles.label}>Giá tiền (VNĐ)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 150.000"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={price}
            onChangeText={handlePriceChange}
          />
        </View>

        {/* --- Thẻ Dịch vụ (Sử dụng RadioButton) --- */}
        <View style={styles.card}>
            <Text style={styles.label}>Dịch vụ</Text>
            <RadioButton
                options={SERVICE_OPTIONS}
                selectedOption={serviceType}
                onSelect={setServiceType}
            />
        </View>

        {/* --- Thẻ Ghi chú --- */}
        <View style={styles.card}>
            <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Ghi chú về dịch vụ hoặc khách hàng..."
              placeholderTextColor="#999"
              multiline
              value={note}
              onChangeText={setNote}
            />
        </View>

        {/* --- Thẻ Thanh toán (Sử dụng RadioButton) --- */}
        <View style={styles.card}>
            <Text style={styles.label}>Hình thức thanh toán</Text>
            <RadioButton
                options={PAYMENT_OPTIONS}
                selectedOption={paymentMethod}
                onSelect={setPaymentMethod}
            />
        </View>

        {/* --- Thẻ Hình ảnh --- */}
        <View style={styles.card}>
            <Text style={styles.label}>Hình ảnh kết quả</Text>
            {imageUri ? (
                <View style={styles.pickedImageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.pickedImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                    <Ionicons name="close-circle" size={32} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                    <Ionicons name="camera-outline" size={32} color="#007bff" />
                    <Text style={styles.imagePickerText}>Thêm hình ảnh</Text>
                </TouchableOpacity>
            )}
        </View>
      </ScrollView>

      {/* --- NÚT SUBMIT CỐ ĐỊNH Ở FOOTER --- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Tạo Báo cáo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =================================================================
// STYLESHEET (Đã được làm mới hoàn toàn)
// =================================================================
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 100, // Khoảng trống cho footer
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fcfcfc',
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioCircle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedRb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007bff',
  },
  radioButtonText: {
    fontSize: 16,
    color: '#333',
  },
  imagePicker: {
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 123, 255, 0.05)'
  },
  imagePickerText: {
    marginTop: 10,
    color: '#007bff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pickedImageContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  footer: {
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, // An toàn hơn cho iPhone
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#28a745',
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 15,
    fontSize: 16,
  }
});

export default CreateReportScreen;