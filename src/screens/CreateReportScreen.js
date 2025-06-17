// src/screens/CreateReportScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Modal, ActivityIndicator, Platform, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore'; // Đã sửa lỗi import
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// --- Hằng số màu sắc và Hàm trợ giúp (GIỮ NGUYÊN) ---
const COLORS = { 
    black: '#121212', 
    white: '#FFFFFF', 
    gray: '#888888', 
    lightGray: '#F5F5F5', 
    primary: '#121212',
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
};

// --- CÁC COMPONENT CON (Checkbox, RadioButton - Không đổi) ---
const Checkbox = ({ label, value, isSelected, onSelect }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={() => onSelect(value)}>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
);
const RadioButton = ({ options, selectedOption, onSelect }) => (
    <View>{options.map(option => (<TouchableOpacity key={option.value} style={styles.radioButtonContainer} onPress={() => onSelect(option.value)}><View style={[styles.radioCircle, { borderColor: selectedOption === option.value ? '#121212' : '#e0e0e0' }]}>{selectedOption === option.value && <View style={styles.selectedRb} />}</View><Text style={styles.radioButtonText}>{option.label}</Text></TouchableOpacity>))}</View>
);

// --- CÁC HẰNG SỐ VÀ LỰA CHỌN (Không đổi) ---
const CLOUDINARY_CLOUD_NAME = 'dq802xggt';
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset';
const SERVICE_OPTIONS = [{ label: 'Nail', value: 'Nail' }, { label: 'Mi', value: 'Mi' },{ label: 'Gội đầu', value: 'Gội đầu' }, { label: 'Khác', value: 'Khác' }];
const PAYMENT_OPTIONS = [{ label: 'Tiền mặt', value: 'Tiền mặt' }, { label: 'Chuyển khoản', value: 'Chuyển khoản' }];

const CreateReportScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [price, setPrice] = useState('');
    const [rawPrice, setRawPrice] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].value);
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [isPickerModalVisible, setPickerModalVisible] = useState(false);
    const [tempPartner, setTempPartner] = useState(null);

    useEffect(() => {
        const fetchAllUsers = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef); // Lấy tất cả user
                const querySnapshot = await getDocs(q);
                
                const userList = [];
                querySnapshot.forEach((doc) => {
                    if (doc.id !== currentUser.uid) { // Loại trừ chính mình
                        userList.push({ id: doc.id, ...doc.data() });
                    }
                });
                setEmployees(userList);
            } catch (error) {
                console.error("Lỗi khi tải danh sách người dùng:", error);
                Alert.alert("Lỗi", "Không thể tải danh sách người dùng.");
            }
        };
        fetchAllUsers();
    }, []);

    // --- CÁC HÀM XỬ LÝ (Không có thay đổi lớn) ---
    const handleServiceSelection = (value) => { setSelectedServices((prev) => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]); };
    const formatCurrency = (num) => { if (!num) return ''; let cleanNum = num.toString().replace(/[^0-9]/g, ''); return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    const handlePriceChange = (text) => { const numericValue = text.replace(/[^0-9]/g, ''); setRawPrice(numericValue); setPrice(formatCurrency(numericValue)); };
    const handleImagePick = () => { Alert.alert("Thêm hình ảnh", "Chọn nguồn ảnh", [{ text: "Thư viện", onPress: pickImage }, { text: "Camera", onPress: takePhoto }, { text: "Hủy", style: "cancel" }]); };
    const pickImage = async () => { let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!result.canceled) { setImageUri(result.assets[0].uri); } };
    const takePhoto = async () => { const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') { Alert.alert('Quyền truy cập Camera bị từ chối'); return; } let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 }); if (!result.canceled) { setImageUri(result.assets[0].uri); } };
    const uploadImageToCloudinary = async (uri) => { const formData = new FormData(); formData.append('file', { uri: uri, type: 'image/jpeg', name: 'report_image.jpg' }); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); try { const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return res.data.secure_url; } catch (error) { console.error('Lỗi tải ảnh:', error); Alert.alert('Lỗi tải ảnh'); return null; } };

    const handleSubmitReport = async () => {
        const numericPrice = parseFloat(rawPrice);
        if (!rawPrice || selectedServices.length === 0 || !paymentMethod) { Alert.alert('Lỗi', 'Vui lòng điền đủ giá tiền, dịch vụ và hình thức thanh toán.'); return; }
        if (isNaN(numericPrice) || numericPrice <= 0) { Alert.alert('Lỗi', 'Giá tiền không hợp lệ.'); return; }
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) { throw new Error("Người dùng chưa đăng nhập."); }
            let imageUrl = '';
            if (imageUri) { imageUrl = await uploadImageToCloudinary(imageUri); if (!imageUrl) { setLoading(false); return; } }
            
            const reportData = { userId: currentUser.uid, userEmail: currentUser.email, employeeName: currentUser.displayName || currentUser.email.split('@')[0], price: numericPrice, service: selectedServices.join(', '), note: note, paymentMethod: paymentMethod, imageUrl: imageUrl, createdAt: serverTimestamp(), status: 'pending', participantIds: [currentUser.uid] };
            if (selectedPartner) { const partner = employees.find(e => e.id === selectedPartner); if (partner) { reportData.partnerId = partner.id; reportData.partnerName = partner.displayName || partner.email.split('@')[0]; reportData.participantIds.push(partner.id); } }
            
            await addDoc(collection(db, 'reports'), reportData);
            Alert.alert('Thành công', 'Báo cáo đã được gửi và đang chờ duyệt!');
            
            setPrice(''); setRawPrice(''); setSelectedServices([]); setNote(''); setPaymentMethod(PAYMENT_OPTIONS[0].value); setImageUri(null); setSelectedPartner(null);
            navigation.goBack();
        } catch (error) { console.error('Lỗi khi gửi báo cáo:', error); Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo báo cáo.'); } finally { setLoading(false); }
    };

    const openPickerModal = () => { setTempPartner(selectedPartner); setPickerModalVisible(true); };
    const confirmSelection = () => { setSelectedPartner(tempPartner); setPickerModalVisible(false); };

    const partnerName = selectedPartner ? (employees.find(e => e.id === selectedPartner)?.displayName || 'Không rõ') : '-- Không chọn --';

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar style="dark" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo Báo Cáo Mới</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <Modal transparent={true} animationType="fade" visible={loading}>
              <View style={styles.modalBackground}><ActivityIndicator size="large" color="#ffffff" /><Text style={styles.loadingText}>Đang xử lý...</Text></View>
            </Modal>

            <Modal transparent={true} visible={isPickerModalVisible} animationType="slide" onRequestClose={() => setPickerModalVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setPickerModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Chọn người làm cùng</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker 
                                        selectedValue={tempPartner} 
                                        onValueChange={(itemValue) => setTempPartner(itemValue)}
                                        // THAY ĐỔI TẠI ĐÂY: Thêm itemStyle để đổi màu chữ
                                        itemStyle={styles.pickerItemText}
                                    >
                                        <Picker.Item label="-- Không chọn --" value={null} />
                                        {employees.map(employee => (<Picker.Item key={employee.id} label={employee.displayName || employee.email} value={employee.id} />))}
                                    </Picker>
                                </View>
                                <TouchableOpacity style={styles.modalDoneButton} onPress={confirmSelection}>
                                    <Text style={styles.modalDoneButtonText}>Chọn</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                <View style={styles.card}><Text style={styles.label}>Giá tiền (VNĐ)</Text><TextInput style={styles.input} placeholder="Ví dụ: 150.000" keyboardType="numeric" value={price} onChangeText={handlePriceChange}/></View>
                <View style={styles.card}><Text style={styles.label}>Dịch vụ (chọn một hoặc nhiều)</Text>{SERVICE_OPTIONS.map(o => (<Checkbox key={o.value} {...o} isSelected={selectedServices.includes(o.value)} onSelect={handleServiceSelection}/>))}</View>
                
                <View style={styles.card}>
                    <Text style={styles.label}>Người làm cùng (tùy chọn)</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={openPickerModal}>
                        <Text style={styles.pickerButtonText}>{partnerName}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}><Text style={styles.label}>Ghi chú (tùy chọn)</Text><TextInput style={[styles.input, styles.noteInput]} placeholder="Ghi chú về dịch vụ, khách hàng..." multiline value={note} onChangeText={setNote}/></View>
                <View style={styles.card}><Text style={styles.label}>Hình thức thanh toán</Text><RadioButton options={PAYMENT_OPTIONS} selectedOption={paymentMethod} onSelect={setPaymentMethod}/></View>
                <View style={styles.card}>
                    <Text style={styles.label}>Hình ảnh kết quả</Text>
                    {imageUri ? (<View style={styles.pickedImageContainer}><Image source={{ uri: imageUri }} style={styles.pickedImage} /><TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}><Ionicons name="close-circle" size={32} color="#D32F2F" /></TouchableOpacity></View>) 
                    : (<TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}><Ionicons name="camera-outline" size={32} color="#121212" /><Text style={styles.imagePickerText}>Thêm hình ảnh</Text></TouchableOpacity>)}
                </View>
            </ScrollView>

            <View style={styles.footer}><TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmitReport} disabled={loading}><Text style={styles.submitButtonText}>Tạo Báo cáo</Text></TouchableOpacity></View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, paddingHorizontal: 15, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    backButton: { padding: 5, marginRight: 10 },
    headerRightPlaceholder: { width: 48 },
    scrollView: { flex: 1 },
    contentContainer: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    label: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: '600' },
    input: { width: '100%', paddingVertical: Platform.OS === 'ios' ? 14 : 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fcfcfc', fontSize: 16, color: '#333' },
    noteInput: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
    footer: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e0e0e0' },
    submitButton: { width: '100%', padding: 16, backgroundColor: '#000', borderRadius: 10, alignItems: 'center' },
    submitButtonDisabled: { backgroundColor: '#ddd' },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    loadingText: { color: '#ffffff', marginTop: 15, fontSize: 16 },
    // Checkbox & Radio
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxSelected: { backgroundColor: '#121212', borderColor: '#121212' },
    checkboxLabel: { fontSize: 16, color: '#333' },
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    radioCircle: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    selectedRb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#121212' },
    radioButtonText: { fontSize: 16, color: '#333' },
    // Image
    imagePicker: { height: 150, borderRadius: 10, borderWidth: 2, borderColor: '#121212', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 123, 255, 0.05)' },
    imagePickerText: { marginTop: 10, color: '#121212', fontSize: 15, fontWeight: 'bold' },
    pickedImageContainer: { position: 'relative', borderRadius: 10, overflow: 'hidden' },
    pickedImage: { width: '100%', height: 220, resizeMode: 'cover' },
    removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 16 },
    // Styles cho Picker Button
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Platform.OS === 'ios' ? 14 : 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fcfcfc' },
    pickerButtonText: { fontSize: 16, color: '#333' },
    // Styles cho Modal Picker
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    pickerWrapper: { backgroundColor: '#f0f2f5', borderRadius: 10, marginBottom: 20, ...Platform.select({ ios: { height: 200, justifyContent: 'center' } }) },
    modalDoneButton: { backgroundColor: '#121212', borderRadius: 10, padding: 15, alignItems: 'center' },
    modalDoneButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    
    // --- STYLE MỚI CHO CHỮ CỦA PICKER ---
    pickerItemText: {
        color: '#000', // Đảm bảo chữ luôn có màu đen
        fontSize: 18, // Tăng kích thước chữ cho dễ đọc hơn
    }
});

export default CreateReportScreen;