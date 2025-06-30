// src/screens/CreateReportScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Modal, Platform, TouchableWithoutFeedback } from 'react-native'; // Xóa ActivityIndicator
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db, auth } from '../../firebaseConfig'; 
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../src/context/AuthContext'; 

import { useCommissionRates } from '../hooks/useCommissionRates'; 
import LoadingOverlay from '../components/LoadingOverlay'; // <-- THÊM DÒNG NÀY ĐỂ IMPORT COMPONENT MỚI

const COLORS = {
    black: '#121212',
    white: '#FFFFFF',
    gray: '#888888',
    lightGray: '#F5F5F5',
    primary: '#121212', 
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
    overtime: '#6a0dad', 
};

// --- CÁC COMPONENT CON (Checkbox, RadioButton) ---
const Checkbox = ({ label, value, isSelected, onSelect }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={() => onSelect(value)}>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
);

const RadioButton = ({ options, selectedOption, onSelect }) => (
    <View style={styles.radioGroup}>
        {options.map(option => (
            <TouchableOpacity key={option.value} style={styles.radioButtonContainer} onPress={() => onSelect(option.value)}>
                <View style={[styles.radioCircle, { borderColor: selectedOption === option.value ? COLORS.primary : '#e0e0e0' }]}>
                    {selectedOption === option.value && <View style={styles.selectedRb} />}
                </View>
                <Text style={styles.radioButtonText}>{option.label}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

// --- CÁC HẰNG SỐ VÀ LỰA CHỌN (Không đổi) ---
const CLOUDINARY_CLOUD_NAME = 'dq802xggt';
const CLOUDINARY_UPLOAD_PRESET = 'suhii_app_preset';
const SERVICE_OPTIONS = [
    { label: 'Nail', value: 'Nail' },
    { label: 'Mi', value: 'Mi' },
    { label: 'Gội đầu', value: 'Gội đầu' },
    { label: 'Khác', value: 'Khác' },
];
const PAYMENT_OPTIONS = [
    { label: 'Tiền mặt', value: 'cash' },
    { label: 'Chuyển khoản', value: 'transfer' },
];

const CreateReportScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { user, userRole } = useAuth(); 

    const [price, setPrice] = useState('');
    const [rawPrice, setRawPrice] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_OPTIONS[0].value);
    const [imageUri, setImageUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [isPickerModalVisible, setPickerModalVisible] = useState(false);
    const [tempPartner, setTempPartner] = useState(null);

    const [isOvertime, setIsOvertime] = useState(false);

    const { defaultRevenuePercentage, overtimePercentage, isLoading: ratesLoading } = useCommissionRates(); 

    useEffect(() => {
        const fetchAllUsers = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef);
                const querySnapshot = await getDocs(q);

                const userList = [];
                querySnapshot.forEach((doc) => {
                    if (doc.id !== currentUser.uid) { 
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

    // --- CÁC HÀM XỬ LÝ ---
    const handleServiceSelection = (value) => { setSelectedServices((prev) => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]); };
    const formatCurrency = (num) => { if (!num) return ''; let cleanNum = num.toString().replace(/[^0-9]/g, ''); return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    const handlePriceChange = (text) => { const numericValue = text.replace(/[^0-9]/g, ''); setRawPrice(numericValue); setPrice(formatCurrency(numericValue)); };
    const handleImagePick = () => { Alert.alert("Thêm hình ảnh", "Chọn nguồn ảnh", [{ text: "Thư viện", onPress: pickImage }, { text: "Camera", onPress: takePhoto }, { text: "Hủy", style: "cancel" }]); }; 
    const pickImage = async () => { 
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Quyền truy cập bị từ chối", "Cần quyền truy cập vào thư viện ảnh để chọn ảnh.");
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7
        });
        if (!result.canceled) { setImageUri(result.assets[0].uri); }
    };
    const takePhoto = async () => { 
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Quyền truy cập Camera bị từ chối'); return; }
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7
        });
        if (!result.canceled) { setImageUri(result.assets[0].uri); }
    };
    const uploadImageToCloudinary = async (uri) => { 
        const formData = new FormData();
        formData.append('file', { uri: uri, type: 'image/jpeg', name: 'report_image.jpg' });
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data.secure_url;
        } catch (error) {
            console.error('Lỗi tải ảnh:', error); 
            Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên. Vui lòng thử lại.'); 
            return null;
        }
    };

    const handleSubmitReport = async () => {
        const numericPrice = parseFloat(rawPrice);
        if (!rawPrice || selectedServices.length === 0 || !paymentMethod) {
            Alert.alert('Lỗi', 'Vui lòng điền đủ giá tiền, dịch vụ và hình thức thanh toán.');
            return;
        }
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Lỗi', 'Giá tiền không hợp lệ.');
            return;
        }
        if (ratesLoading) { 
            Alert.alert('Thông báo', 'Đang tải cài đặt tỷ lệ doanh thu, vui lòng thử lại sau.');
            return;
        }

        setUploading(true);
        let imageUrl = '';
        if (imageUri) {
            imageUrl = await uploadImageToCloudinary(imageUri);
            if (!imageUrl) {
                setUploading(false);
                return; 
            }
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) { throw new Error("Người dùng chưa đăng nhập."); }

            const currentEmployeeName = currentUser.displayName || currentUser.email.split('@')[0]; 

            let partnerName = null;
            if (selectedPartner) {
                const partner = employees.find(e => e.id === selectedPartner);
                if (partner) {
                    partnerName = partner.displayName || partner.email.split('@')[0];
                }
            }

            const participantIds = [currentUser.uid];
            if (selectedPartner && selectedPartner !== currentUser.uid) {
                participantIds.push(selectedPartner);
            }

            const reportStatus = userRole === 'admin' ? 'approved' : 'pending'; 

            const currentRevenuePercentage = defaultRevenuePercentage;
            const currentOvertimePercentage = overtimePercentage;

            const reportData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                employeeName: currentEmployeeName,
                price: numericPrice,
                service: selectedServices.join(', '),
                note: note.trim(),
                paymentMethod: paymentMethod,
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
                status: reportStatus,
                isOvertime: isOvertime,
                partnerId: selectedPartner || null,
                partnerName: partnerName,
                participantIds: participantIds,
                commissionRate: currentRevenuePercentage / 100, 
                overtimeRate: currentOvertimePercentage / 100, 
            };

            await addDoc(collection(db, 'reports'), reportData);
            Alert.alert('Thành công', ` đã được tạo và ${userRole === 'admin' ? 'đã duyệt' : 'gửi đi chờ duyệt'}!`); 

            setPrice('');
            setRawPrice('');
            setSelectedServices([]);
            setNote('');
            setPaymentMethod(PAYMENT_OPTIONS[0].value);
            setImageUri(null);
            setSelectedPartner(null);
            setIsOvertime(false); 
            navigation.goBack();
        } catch (error) {
            console.error('Lỗi khi gửi hóa đơn:', error); 
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo hóa đơn.'); 
        } finally {
            setUploading(false);
        }
    };

    const openPickerModal = () => { setTempPartner(selectedPartner); setPickerModalVisible(true); };
    const confirmSelection = () => { setSelectedPartner(tempPartner); setPickerModalVisible(false); };

    const partnerName = selectedPartner ? (employees.find(e => e.id === selectedPartner)?.displayName || 'Không rõ') : '-- Không chọn --';

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar style="dark" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tạo Hóa Đơn Mới</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            {/* Sử dụng LoadingOverlay cho cả ratesLoading và uploading */}
            <LoadingOverlay 
                isVisible={ratesLoading || uploading} 
                message={ratesLoading ? "Đang tải cài đặt doanh thu..." : "Đang xử lý..."} 
            />

            {/* Modal cho Picker Người làm cùng */}
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
                                        itemStyle={styles.pickerItemText}
                                    >
                                        <Picker.Item label="-- Không chọn --" value={null} />
                                        {employees.map(employee => (
                                            <Picker.Item key={employee.id} label={employee.displayName || employee.email} value={employee.id} />
                                        ))}
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
                <View style={styles.card}>
                    <Text style={styles.label}>Giá tiền (VNĐ)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: 150.000"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={handlePriceChange}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Dịch vụ (chọn một hoặc nhiều)</Text>
                    {SERVICE_OPTIONS.map(o => (
                        <Checkbox
                            key={o.value}
                            label={o.label}
                            value={o.value}
                            isSelected={selectedServices.includes(o.value)}
                            onSelect={handleServiceSelection}
                        />
                    ))}
                </View>

                {/* Checkbox "Làm ngoài giờ" */}
                <View style={styles.card}>
                    <Text style={styles.label}>Trạng thái khác</Text>
                    <Checkbox
                        label="Làm ngoài giờ"
                        value="overtime"
                        isSelected={isOvertime}
                        onSelect={() => setIsOvertime(!isOvertime)}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Người làm cùng (tùy chọn)</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={openPickerModal}>
                        <Text style={styles.pickerButtonText}>{partnerName}</Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
                    <TextInput
                        style={[styles.input, styles.noteInput]}
                        placeholder="Ghi chú về dịch vụ, khách hàng..."
                        multiline
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Hình thức thanh toán</Text>
                    <RadioButton
                        options={PAYMENT_OPTIONS}
                        selectedOption={paymentMethod}
                        onSelect={setPaymentMethod}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Hình ảnh kết quả</Text>
                    {imageUri ? (
                        <View style={styles.pickedImageContainer}>
                            <Image source={{ uri: imageUri }} style={styles.pickedImage} />
                            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                                <Ionicons name="close-circle" size={32} color={COLORS.rejected} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                            <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                            <Text style={styles.imagePickerText}>Thêm hình ảnh</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                    onPress={handleSubmitReport}
                    disabled={uploading}
                >
                    <Text style={styles.submitButtonText}>Tạo Hóa Đơn</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1, backgroundColor: COLORS.lightGray },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        paddingHorizontal: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: { padding: 5, marginRight: 10 },
    submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600'},
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
    headerRightPlaceholder: { width: 48 }, 
    scrollView: { flex: 1 },
    contentContainer: { padding: 15, paddingBottom: 100 },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    label: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: '600' },
    input: {
        width: '100%',
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#fcfcfc',
        fontSize: 16,
        color: '#333'
    },
    noteInput: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
    footer: {
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    submitButton: {
        width: '100%',
        padding: 16,
        backgroundColor: COLORS.black,
        borderRadius: 10,
        alignItems: 'center'
    },
    submitButtonDisabled: { backgroundColor: COLORS.gray }, 
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    // modalBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' }, // Sẽ được quản lý bởi LoadingOverlay
    // loadingText: { color: COLORS.white, marginTop: 15, fontSize: 16 }, // Sẽ được quản lý bởi LoadingOverlay

    checkboxGroup: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, width: '48%' }, 
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkboxLabel: { fontSize: 16, color: '#333' },

    radioGroup: { flexDirection: 'column' }, 
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    radioCircle: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    selectedRb: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary },
    radioButtonText: { fontSize: 16, color: '#333' },

    imagePicker: {
        height: 150,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.primary, 
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 123, 255, 0.05)',
        overflow: 'hidden',
    },
    imagePickerText: { marginTop: 10, color: COLORS.primary, fontSize: 15, fontWeight: 'bold' },
    pickedImageContainer: { position: 'relative', borderRadius: 10, overflow: 'hidden' },
    pickedImage: { width: '100%', height: 220, resizeMode: 'cover' },
    removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 16, padding: 2 },

    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Platform.OS === 'ios' ? 14 : 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fcfcfc' },
    pickerButtonText: { fontSize: 16, color: '#333' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    pickerWrapper: { backgroundColor: '#f0f2f5', borderRadius: 10, marginBottom: 20, ...Platform.select({ ios: { height: 200, justifyContent: 'center' } }) },
    modalDoneButton: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 15, alignItems: 'center' },
    modalDoneButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    pickerItemText: { color: COLORS.black, fontSize: 18 },

    // Xóa styles liên quan đến loading cũ
    // loadingOverlay: {
    //     flex: 1,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     backgroundColor: COLORS.lightGray, 
    // },
});

export default CreateReportScreen;