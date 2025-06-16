// src/screens/CreateReportScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// --- MỚI: COMPONENT CHECKBOX ---
const Checkbox = ({ label, value, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={() => onSelect(value)}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT RADIOBUTTON (vẫn giữ lại để dùng cho Thanh toán) ---
const RadioButton = ({ options, selectedOption, onSelect }) => {
    // ... (code component RadioButton giữ nguyên)
    return (
        <View>
          {options.map((option) => (
            <TouchableOpacity key={option.value} style={styles.radioButtonContainer} onPress={() => onSelect(option.value)}>
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
    { label: 'Nail', value: 'Nail' }, { label: 'Mi', value: 'Mi' },
    { label: 'Gội đầu', value: 'Gội đầu' }, { label: 'Khác', value: 'Khác' },
];
const PAYMENT_OPTIONS = [
    { label: 'Tiền mặt', value: 'Tiền mặt' }, { label: 'Chuyển khoản', value: 'Chuyển khoản' },
];

const CreateReportScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    // --- STATE MANAGEMENT ---
    const [price, setPrice] = useState('');
    const [rawPrice, setRawPrice] = useState('');
    // SỬA: Chuyển từ serviceType (string) sang selectedServices (array)
    const [selectedServices, setSelectedServices] = useState([]);
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].value);
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);

    // MỚI: Hàm xử lý cho Checkbox
    const handleServiceSelection = (value) => {
        setSelectedServices((prevSelected) => {
            // Nếu dịch vụ đã được chọn, bỏ chọn nó
            if (prevSelected.includes(value)) {
                return prevSelected.filter((service) => service !== value);
            }
            // Nếu chưa được chọn, thêm nó vào mảng
            else {
                return [...prevSelected, value];
            }
        });
    };
    
    // ... (Các hàm formatCurrency, handlePriceChange, xử lý ảnh không thay đổi)
    const formatCurrency = (num) => { if (!num) return ''; let cleanNum = num.toString().replace(/[^0-9]/g, ''); return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    const handlePriceChange = (text) => { const numericValue = text.replace(/[^0-9]/g, ''); setRawPrice(numericValue); setPrice(formatCurrency(numericValue)); };
    const pickImage = async () => { let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!result.canceled) { setImageUri(result.assets[0].uri); } };
    const takePhoto = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') { Alert.alert('Quyền truy cập Camera bị từ chối'); return; } let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!result.canceled) { setImageUri(result.assets[0].uri); } };
    const uploadImageToCloudinary = async (uri) => { if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) { Alert.alert('Lỗi cấu hình Cloudinary'); return null; } const formData = new FormData(); formData.append('file', { uri: uri, type: 'image/jpeg', name: 'report_image.jpg' }); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); try { const response = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return response.data.secure_url; } catch (error) { console.error('Lỗi tải ảnh:', error); Alert.alert('Lỗi tải ảnh'); return null; } };
    const handleImagePick = () => { Alert.alert("Thêm hình ảnh", "Chọn nguồn ảnh", [{ text: "Thư viện", onPress: pickImage }, { text: "Camera", onPress: takePhoto }, { text: "Hủy", style: "cancel" }]); }

   const handleSubmitReport = async () => {
        const numericPrice = parseFloat(rawPrice);

        // SỬA LỖI TẠI ĐÂY:
        // 1. Kiểm tra xem mảng `selectedServices` có rỗng không, thay vì biến `service`.
        // 2. Thay đổi thông báo lỗi cho phù hợp.
        if (!rawPrice || selectedServices.length === 0 || !paymentMethod) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ giá tiền, chọn ít nhất một dịch vụ và hình thức thanh toán.');
            return;
        }

        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Lỗi', 'Giá tiền không hợp lệ.');
            return;
        }
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo báo cáo.');
                setLoading(false);
                return;
            }

            let imageUrl = '';
            if (imageUri) {
                imageUrl = await uploadImageToCloudinary(imageUri);
                if (!imageUrl) {
                    setLoading(false);
                    return;
                }
            }
            
            // SỬA LỖI TẠI ĐÂY:
            // Đổi tên trường từ `service` thành `services` (nếu bạn muốn lưu mảng)
            // hoặc dùng `join` để lưu thành chuỗi cho đồng bộ với màn hình StoreScreen.
            // Tôi đề xuất dùng join() để giữ cấu trúc đơn giản.
            await addDoc(collection(db, 'reports'), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                employeeName: currentUser.displayName || currentUser.email.split('@')[0],
                price: numericPrice,
                service: selectedServices.join(', '), // Lưu mảng các dịch vụ thành một chuỗi
                note: note,
                paymentMethod: paymentMethod,
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
                status: 'pending',
            });

            Alert.alert('Thành công', 'Báo cáo đã được gửi và đang chờ duyệt!');
            
            // SỬA LỖI TẠI ĐÂY: Reset mảng `selectedServices` về rỗng
            setPrice(''); 
            setRawPrice(''); 
            setSelectedServices([]);
            setNote('');
            setPaymentMethod(PAYMENT_OPTIONS[0].value); 
            setImageUri(null);
            
            navigation.goBack();
        } catch (error) { 
            console.error('Lỗi khi gửi báo cáo:', error); 
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo báo cáo.'); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <View style={[styles.fullScreenContainer, { paddingTop: insets.top }]}>
            {/* --- MODAL LOADING TOÀN MÀN HÌNH --- */}
            <Modal transparent={true} animationType="fade" visible={loading}>
              <View style={styles.modalBackground}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>Đang xử lý...</Text>
              </View>
            </Modal>

            <StatusBar style="dark" />
            <Modal transparent={true} animationType="fade" visible={loading}>
                {/* ... (modal loading giữ nguyên) ... */}
            </Modal>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                {/* ... (Card Giá tiền giữ nguyên) ... */}
                <View style={styles.card}>
                    <Text style={styles.label}>Giá tiền (VNĐ)</Text>
                    <TextInput style={styles.input} placeholder="Ví dụ: 150.000" placeholderTextColor="#999" keyboardType="numeric" value={price} onChangeText={handlePriceChange}/>
                </View>
                {/* --- SỬA: Thẻ Dịch vụ (Sử dụng Checkbox) --- */}
                <View style={styles.card}>
                    <Text style={styles.label}>Dịch vụ (chọn một hoặc nhiều)</Text>
                    {SERVICE_OPTIONS.map((option) => (
                        <Checkbox
                            key={option.value}
                            label={option.label}
                            value={option.value}
                            isSelected={selectedServices.includes(option.value)}
                            onSelect={handleServiceSelection}
                        />
                    ))}
                </View>

                {/* ... (Các card còn lại giữ nguyên) ... */}
                <View style={styles.card}>
                    <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
                    <TextInput style={[styles.input, styles.noteInput]} placeholder="Ghi chú về dịch vụ hoặc khách hàng..." placeholderTextColor="#999" multiline value={note} onChangeText={setNote}/>
                </View>
                <View style={styles.card}>
                    <Text style={styles.label}>Hình thức thanh toán</Text>
                    <RadioButton options={PAYMENT_OPTIONS} selectedOption={paymentMethod} onSelect={setPaymentMethod}/>
                </View>
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
            <View style={styles.footer}>
                <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmitReport} disabled={loading}>
                    <Text style={styles.submitButtonText}>Tạo Báo cáo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// SỬA: Bổ sung style cho Checkbox
const styles = StyleSheet.create({
    // ... (các style cũ giữ nguyên)
    fullScreenContainer: { flex: 1, backgroundColor: '#f0f2f5', },
    scrollView: { flex: 1, },
    contentContainer: { padding: 15, paddingBottom: 100, },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, },
    label: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: '600', },
    input: { width: '100%', paddingVertical: Platform.OS === 'ios' ? 14 : 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fcfcfc', fontSize: 16, color: '#333', },
    noteInput: { height: 100, textAlignVertical: 'top', paddingTop: 14, },
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, },
    radioCircle: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12, },
    selectedRb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007bff', },
    radioButtonText: { fontSize: 16, color: '#333', },
    imagePicker: { height: 150, borderRadius: 10, borderWidth: 2, borderColor: '#007bff', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 123, 255, 0.05)' },
    imagePickerText: { marginTop: 10, color: '#007bff', fontSize: 15, fontWeight: 'bold', },
    pickedImageContainer: { position: 'relative', borderRadius: 10, overflow: 'hidden', },
    pickedImage: { width: '100%', height: 220, resizeMode: 'cover', },
    removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 16, },
    footer: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e0e0e0', },
    submitButton: { width: '100%', padding: 16, backgroundColor: '#000', borderRadius: 10, alignItems: 'center', },
    submitButtonDisabled: { backgroundColor: '#ddd', },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', },
    modalBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', },
    loadingText: { color: '#ffffff', marginTop: 15, fontSize: 16, },
    // MỚI: Style cho checkbox
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#333',
    },
});

export default CreateReportScreen;