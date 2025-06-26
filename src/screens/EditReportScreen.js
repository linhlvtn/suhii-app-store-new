// src/screens/EditReportScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Modal, ActivityIndicator, Platform, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { db, auth } from '../../firebaseConfig'; // Import auth
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs as getFirestoreDocs } from 'firebase/firestore'; // Import Firestore functions
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native'; // Import useNavigation
import { Picker } from '@react-native-picker/picker';
import LottieView from 'lottie-react-native';

// --- Hằng số màu sắc ---
// Import từ theme.js nếu có
// import { COLORS } from '../../constants/theme'; 
const COLORS = {
    black: '#121212',
    white: '#FFFFFF',
    gray: '#888888',
    lightGray: '#F5F5F5',
    primary: '#121212', // Sử dụng màu đen làm primary theo giao diện mới của bạn
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
    overtime: '#6a0dad', // Thêm màu cho trạng thái làm ngoài giờ
};

// --- CÁC COMPONENT CON (Checkbox, RadioButton) ---
const Checkbox = ({ label, value, isSelected, onSelect }) => {
    return (
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => onSelect(value)}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>{label}</Text>
        </TouchableOpacity>
    );
};

const RadioButton = ({ options, selectedOption, onSelect }) => {
    return (
        <View style={styles.radioGroup}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option.value}
                    style={styles.radioButtonContainer}
                    onPress={() => onSelect(option.value)}
                >
                    <View style={[styles.radioCircle, { borderColor: selectedOption === option.value ? COLORS.primary : '#e0e0e0' }]}>
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
    { label: 'Tiền mặt', value: 'cash' },
    { label: 'Chuyển khoản', value: 'transfer' },
];

const EditReportScreen = () => {
    const insets = useSafeAreaInsets();
    const route = useRoute();
    const navigation = useNavigation();
    const { reportId } = route.params;

    // --- STATE MANAGEMENT ---
    const [price, setPrice] = useState('');
    const [rawPrice, setRawPrice] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [originalImageUrl, setOriginalImageUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(true);

    // Trạng thái cho checkbox "Làm ngoài giờ"
    const [isOvertime, setIsOvertime] = useState(false);

    // State cho danh sách người dùng (đối tác)
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const [isPartnerPickerVisible, setPartnerPickerVisible] = useState(false);
    const [tempPartner, setTempPartner] = useState(null); // <-- KHAI BÁO tempPartner Ở ĐÂY

    // Fetch Report Data and Users on component mount
    useEffect(() => {
        const fetchReportAndUsers = async () => {
            try {
                setIsFetchingData(true);
                // Fetch Report Data
                const docRef = doc(db, 'reports', reportId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setRawPrice(String(data.price || 0));
                    setPrice(formatCurrency(String(data.price || 0)));
                    
                    if (Array.isArray(data.service)) {
                        setSelectedServices(data.service);
                    } else if (typeof data.service === 'string' && data.service.length > 0) {
                        setSelectedServices(data.service.split(', ').map(s => s.trim()));
                    } else {
                        setSelectedServices([]);
                    }
                    setNote(data.note || '');
                    setPaymentMethod(data.paymentMethod || PAYMENT_OPTIONS[0].value);
                    setImageUri(data.imageUrl || null);
                    setOriginalImageUrl(data.imageUrl || null);
                    setIsOvertime(data.isOvertime || false);
                    setSelectedPartnerId(data.partnerId || null);
                    setTempPartner(data.partnerId || null); // <-- KHỞI TẠO tempPartner VỚI GIÁ TRỊ CŨ
                } else {
                    Alert.alert("Lỗi", "Không tìm thấy báo cáo.");
                    navigation.goBack();
                    return;
                }

                // Fetch Users Data for partner picker
                const usersRef = collection(db, 'users');
                // const q = query(usersRef, where('role', '==', 'employee'));
                const q = query(usersRef);
                const querySnapshot = await getFirestoreDocs(q);
                const fetchedUsers = [];
                const currentUserId = auth.currentUser?.uid;
                querySnapshot.forEach(doc => {
                    if (doc.id !== currentUserId) {
                        fetchedUsers.push({ id: doc.id, ...doc.data() });
                    }
                });
                setUsers(fetchedUsers);

            } catch (error) {
                console.error("Lỗi khi tải báo cáo hoặc người dùng:", error);
                Alert.alert("Lỗi", "Không thể tải dữ liệu báo cáo hoặc danh sách nhân viên.");
                navigation.goBack();
            } finally {
                setIsFetchingData(false);
                setLoadingUsers(false);
            }
        };

        fetchReportAndUsers();
    }, [reportId, navigation]);


    const handlePriceChange = (text) => {
        const numericValue = text.replace(/[^0-9]/g, '');
        setRawPrice(numericValue);
        setPrice(formatCurrency(numericValue));
    };

    const toggleService = (serviceValue) => {
        setSelectedServices((prevSelected) => {
            if (prevSelected.includes(serviceValue)) {
                return prevSelected.filter((service) => service !== serviceValue);
            } else {
                return [...prevSelected, serviceValue];
            }
        });
    };

    const formatCurrency = (num) => {
        if (!num) return '';
        let cleanNum = String(num).replace(/[^0-9]/g, '');
        return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handleImagePick = () => {
        Alert.alert("Thay đổi hình ảnh", "Chọn nguồn ảnh", [{ text: "Thư viện", onPress: pickImage }, { text: "Camera", onPress: takePhoto }, { text: "Hủy", style: "cancel" }]);
    };
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
        if (uri && (uri.startsWith('http://res.cloudinary.com/') || uri.startsWith('https://res.cloudinary.com/'))) {
            return uri;
        }
        const formData = new FormData();
        formData.append('file', { uri: uri, type: 'image/jpeg', name: 'report_image.jpg' });
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data.secure_url;
        } catch (error) {
            console.error('Lỗi tải ảnh:', error);
            Alert.alert('Lỗi tải ảnh', 'Không thể tải ảnh lên. Vui lòng thử lại.');
            return null;
        }
    };

    const handleSubmit = async () => {
        const numericPrice = parseFloat(rawPrice);
        if (!rawPrice || selectedServices.length === 0 || !paymentMethod) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc.');
            return;
        }
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Lỗi', 'Giá tiền không hợp lệ.');
            return;
        }

        setUploading(true);
        let finalImageUrl = imageUri;

        if (imageUri !== originalImageUrl) {
             if (imageUri === null) {
                finalImageUrl = null;
            } else if (!imageUri.startsWith('http')) {
                finalImageUrl = await uploadImageToCloudinary(imageUri);
                if (!finalImageUrl) {
                    setUploading(false);
                    return;
                }
            }
        }
        
        try {
            const reportRef = doc(db, 'reports', reportId);

            let partnerName = null;
            if (selectedPartnerId) {
                const partner = users.find(u => u.id === selectedPartnerId);
                if (partner) {
                    partnerName = partner.displayName || partner.email.split('@')[0];
                }
            }

            const currentUser = auth.currentUser;
            let participantIds = [];
            if (currentUser) {
                participantIds.push(currentUser.uid);
            }
            if (selectedPartnerId && selectedPartnerId !== currentUser?.uid) {
                participantIds.push(selectedPartnerId);
            }


            await updateDoc(reportRef, {
                price: numericPrice,
                service: selectedServices.join(', '),
                note: note.trim(),
                paymentMethod: paymentMethod,
                imageUrl: finalImageUrl,
                updatedAt: serverTimestamp(),
                isOvertime: isOvertime,
                partnerId: selectedPartnerId || null,
                partnerName: partnerName,
                participantIds: participantIds,
            });

            Alert.alert('Thành công', 'Báo cáo đã được cập nhật!');
            navigation.goBack();
        } catch (error) {
            console.error('Lỗi khi cập nhật báo cáo:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật báo cáo.');
        } finally {
            setUploading(false);
        }
    };

    const openPartnerPickerModal = () => { setTempPartner(selectedPartnerId); setPartnerPickerVisible(true); };
    const confirmPartnerSelection = () => { setSelectedPartnerId(tempPartner); setPartnerPickerVisible(false); };

    const partnerDisplayName = selectedPartnerId ? (users.find(u => u.id === selectedPartnerId)?.displayName || 'Không rõ') : '-- Không chọn --';

    if (isFetchingData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

     if (isFetchingData || loadingUsers) { // Trong EditReportScreen
    // hoặc if (uploading) { // Trong CreateReportScreen (nếu bạn chỉ muốn lottie cho uploading)
        return (
            <View style={styles.loadingOverlayContainer}> {/* Style mới */}
                <LottieView
                    source={require('../../assets/loading.json')} // Thay đổi đường dẫn
                    autoPlay
                    loop
                    style={styles.loadingOverlayLottie}
                />
                <Text style={styles.loadingOverlayText}>Đang tải dữ liệu...</Text> {/* Hoặc "Đang xử lý..." */}
            </View>
        );
    }

    return (
        <View style={[styles.fullScreenContainer, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh Sửa Báo Cáo</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <Modal transparent={true} animationType="fade" visible={uploading}>
                <View style={styles.modalBackground}>
                    <LottieView
                        source={require('../../assets/loading.json')} // Thay đổi đường dẫn
                        autoPlay
                        loop
                        style={styles.modalLottie} // Style cho lottie trong modal
                    />
                    <Text style={styles.modalLoadingText}>Đang cập nhật...</Text>
                </View>
            </Modal>

            {/* Modal cho Picker Người làm cùng */}
            <Modal transparent={true} visible={isPartnerPickerVisible} animationType="slide" onRequestClose={() => setPartnerPickerVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setPartnerPickerVisible(false)}>
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
                                        <Picker.Item label="-- Không có người làm cùng --" value={null} />
                                        {users.map(user => (
                                            <Picker.Item key={user.id} label={user.displayName || user.email} value={user.id} />
                                        ))}
                                    </Picker>
                                </View>
                                <TouchableOpacity style={styles.modalDoneButton} onPress={confirmPartnerSelection}>
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
                        placeholder="Nhập giá tiền (VNĐ)"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={handlePriceChange}
                    />
                    <Text style={styles.currencyDisplay}>{parseFloat(rawPrice || 0).toLocaleString('vi-VN')} VNĐ</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Dịch vụ</Text>
                    <View style={styles.checkboxGroup}>
                        {SERVICE_OPTIONS.map(option => (
                            <Checkbox
                                key={option.value}
                                label={option.label}
                                value={option.value}
                                isSelected={selectedServices.includes(option.value)}
                                onSelect={toggleService}
                            />
                        ))}
                    </View>
                </View>

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
                    <Text style={styles.label}>Người làm cùng (Tùy chọn)</Text>
                    {loadingUsers ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={openPartnerPickerModal}
                        >
                            <Text style={styles.pickerButtonText}>
                                {partnerDisplayName}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Ghi chú (Tùy chọn)</Text>
                    <TextInput
                        style={[styles.input, styles.noteInput]}
                        placeholder="Thêm ghi chú về báo cáo..."
                        multiline
                        numberOfLines={4}
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
                    <Text style={styles.label}>Ảnh đính kèm (Tùy chọn)</Text>
                    {(imageUri) ? (
                        <View style={styles.pickedImageContainer}>
                            <Image source={{ uri: imageUri }} style={styles.pickedImage} />
                            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                                <Ionicons name="close-circle" size={32} color={COLORS.rejected} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
                            <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                            <Text style={styles.imagePickerText}>Chọn ảnh</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={uploading}
                >
                    <Text style={styles.submitButtonText}>Cập Nhật Báo Cáo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: { flex: 1, backgroundColor: COLORS.lightGray },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
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
    currencyDisplay: { fontSize: 16, color: COLORS.gray, textAlign: 'right', marginTop: 5, marginBottom: -5 },
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
    submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    modalBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    loadingText: { color: COLORS.white, marginTop: 15, fontSize: 16 },

    // Checkbox & Radio Styles
    checkboxGroup: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, width: '48%' },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkboxLabel: { fontSize: 16, color: '#333' },

    radioGroup: { flexDirection: 'column' },
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    radioCircle: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    selectedRb: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
    radioButtonText: { fontSize: 16, color: '#333' },

    // Image Picker Styles
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

    // Picker Modal Styles
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Platform.OS === 'ios' ? 14 : 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: '#fcfcfc' },
    pickerButtonText: { fontSize: 16, color: '#333' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    pickerWrapper: { backgroundColor: '#f0f2f5', borderRadius: 10, marginBottom: 20, ...Platform.select({ ios: { height: 200, justifyContent: 'center' } }) },
    modalDoneButton: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 15, alignItems: 'center' },
    modalDoneButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    pickerItemText: { color: COLORS.black, fontSize: 18 },

    loadingOverlayContainer: { // Style cho màn hình loading overlay toàn bộ
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray, // Màu nền của loading screen
    },
    loadingOverlayLottie: {
        width: 150, // Kích thước của animation
        height: 150,
    },
    loadingOverlayText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.secondary,
    },
    // Đối với modal loading khi submit
    modalBackground: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalLottie: { // Style cho lottie trong modal
        width: 100, // Nhỏ hơn một chút so với full screen loading
        height: 100,
    },
    modalLoadingText: { // Style cho text loading trong modal
        color: COLORS.white,
        marginTop: 15,
        fontSize: 16,
    },
});

export default EditReportScreen;