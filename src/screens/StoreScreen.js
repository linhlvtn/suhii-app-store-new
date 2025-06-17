import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl, Image, TouchableOpacity, Alert, Modal, Platform, TouchableWithoutFeedback } from 'react-native';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';

// Cấu hình ngôn ngữ tiếng Việt cho Lịch
LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  monthNamesShort: ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'],
  dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay'
};
LocaleConfig.defaultLocale = 'vi';

const COLORS = { 
    black: '#121212', 
    white: '#FFFFFF', 
    gray: '#888888', 
    lightGray: '#F5F5F5', 
    primary: '#007bff',
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
};

const getFormattedDate = (date) => {
    if (!date) return null;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};


// --- CÁC COMPONENT CON CHO HEADER (DI CHUYỂN VÀO ĐÂY) ---
const HeaderLogo = () => (
    <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
);

const NotificationButton = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setHasUnread(!querySnapshot.empty);
        });
        return () => unsubscribe();
    }, [user]);

    return (
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Notification')}>
            <Ionicons name="notifications-outline" size={28} color={COLORS.black} />
            {hasUnread && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
    );
};

const HeaderLogoutButton = () => {
    const handleSignOut = () => {
        Alert.alert("Xác nhận Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
            { text: "Hủy", style: "cancel" },
            { text: "Đăng xuất", onPress: () => auth.signOut(), style: "destructive" }
        ]);
    };
    return (
        <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={28} color={COLORS.black} />
        </TouchableOpacity>
    );
};
// --- KẾT THÚC COMPONENT CON CHO HEADER ---


const StoreScreen = () => {
    const { user, userRole, initializing: authInitializing } = useAuth();
    const [rawReports, setRawReports] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    
    const navigation = useNavigation();

    const fetchReports = useCallback(async () => {
        if (!userRole) return;
        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            let queries = [orderBy('createdAt', 'desc')];
            if (userRole === 'employee' && user) {
                queries.push(where('userId', '==', user.uid));
            } else if (userRole === 'admin' && statusFilter !== 'all') {
                queries.push(where('status', '==', statusFilter));
            }
            if (selectedDate) {
                const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
                queries.push(where('createdAt', '>=', startOfDay), where('createdAt', '<=', endOfDay));
            }
            const q = query(reportsRef, ...queries);
            const snapshots = await getDocs(q);
            setRawReports(snapshots.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Lỗi khi tải báo cáo:", error);
            Alert.alert("Lỗi tải dữ liệu", "Có thể bạn cần tạo chỉ mục trong Firestore.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, userRole, statusFilter, selectedDate]);

    useFocusEffect(useCallback(() => {
        if (userRole) {
            fetchReports();
        }
    }, [userRole, fetchReports]));

    useEffect(() => {
        const processAndGroupReports = () => {
            const grouped = rawReports.reduce((acc, report) => {
                if (report.createdAt?.toDate) {
                    const groupKey = report.createdAt.toDate().toDateString();
                    if (!acc[groupKey]) {
                        acc[groupKey] = { title: getFormattedDate(report.createdAt.toDate()), rawDate: report.createdAt.toDate(), totalRevenue: 0, data: [] };
                    }
                    acc[groupKey].data.push(report);
                    if (report.status === 'approved') {
                        acc[groupKey].totalRevenue += (parseFloat(report.price) || 0);
                    }
                }
                return acc;
            }, {});
            setSections(Object.values(grouped).sort((a, b) => b.rawDate - a.rawDate));
        };
        processAndGroupReports();
    }, [rawReports]);

    const onRefresh = () => { setRefreshing(true); fetchReports(); };
    const onDayPress = (day) => {
        const newDate = new Date(day.timestamp);
        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
        setSelectedDate(newDate);
        setDatePickerVisible(false);
    };
    const clearDateFilter = () => setSelectedDate(null);
    const openImagePreview = (url) => { setSelectedImageUrl(url); setImageModalVisible(true); };
    const closeImagePreview = () => { setImageModalVisible(false); setSelectedImageUrl(null); };

    const handleUpdateStatus = async (reportId, newStatus) => {
        Alert.alert(`Xác nhận`, `Bạn có chắc muốn ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} báo cáo này?`, [
            { text: "Hủy" },
            { text: "Đồng ý", onPress: async () => {
                try {
                    await updateDoc(doc(db, 'reports', reportId), { status: newStatus });
                    fetchReports();
                } catch (error) { Alert.alert("Lỗi", "Không thể cập nhật."); }
            }, style: newStatus === 'rejected' ? 'destructive' : 'default' }
        ]);
    };

    const handleDelete = (reportId) => {
        Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa báo cáo này vĩnh viễn?", [
            { text: "Hủy" },
            { text: "Xóa", onPress: async () => {
                try {
                    await deleteDoc(doc(db, 'reports', reportId));
                    fetchReports();
                } catch (error) { Alert.alert("Lỗi", "Không thể xóa báo cáo."); }
            }, style: 'destructive' }
        ]);
    };
    const handleEdit = (item) => navigation.navigate('EditReport', { reportId: item.id });

    const renderItem = ({ item }) => {
        const statusText = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };
        const statusColor = { pending: COLORS.pending, approved: COLORS.approved, rejected: COLORS.rejected };
        return (
            <View style={styles.itemContainer}>
                <TouchableOpacity onPress={() => item.imageUrl && openImagePreview(item.imageUrl)}>
                    <Image source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/default-image.png')} style={styles.itemImage} />
                </TouchableOpacity>
                <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                        <Text style={styles.serviceText} numberOfLines={2}>{item.service || ''}</Text>
                        {userRole === 'admin' && (
                            <Menu>
                                <MenuTrigger style={styles.menuTrigger}><Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray} /></MenuTrigger>
                                <MenuOptions customStyles={menuOptionsStyles}>
                                    <MenuOption onSelect={() => handleEdit(item)} text='Chỉnh sửa' />
                                    <View style={styles.divider} />
                                    <MenuOption onSelect={() => handleDelete(item.id)}><Text style={{ color: 'red' }}>Xóa</Text></MenuOption>
                                </MenuOptions>
                            </Menu>
                        )}
                    </View>
                    <Text style={styles.priceText}>{(item.price || 0).toLocaleString('vi-VN')} VNĐ</Text>
                    <View style={styles.infoRow}><Ionicons name="person-outline" size={16} color={COLORS.gray} /><Text style={styles.infoText}>{item.employeeName}</Text></View>
                    <View style={styles.infoRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || COLORS.gray }]}>
                             <Text style={styles.statusBadgeText}>{statusText[item.status] || 'Không rõ'}</Text>
                        </View>
                    </View>
                    {item.note ? <View style={styles.infoRow}><Ionicons name="document-text-outline" size={16} color={COLORS.gray} /><Text style={styles.infoText} numberOfLines={1}>{item.note}</Text></View> : null}
                    {userRole === 'admin' && item.status === 'pending' && (
                        <View style={styles.adminActions}>
                            <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.rejected}]} onPress={() => handleUpdateStatus(item.id, 'rejected')}><Ionicons name="close" size={18} color={COLORS.white} /><Text style={styles.actionButtonText}>Từ chối</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, {backgroundColor: COLORS.approved}]} onPress={() => handleUpdateStatus(item.id, 'approved')}><Ionicons name="checkmark" size={18} color={COLORS.white} /><Text style={styles.actionButtonText}>Duyệt</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title, totalRevenue } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <Text style={styles.sectionRevenueText}>Doanh thu duyệt: {(totalRevenue || 0).toLocaleString('vi-VN')} VNĐ</Text>
        </View>
    );

    if (authInitializing) {
        return <View style={styles.fullScreenLoader}><ActivityIndicator size="large" color={COLORS.black} /></View>;
    }

    return (
        <View style={styles.container}>
            {/* --- HEADER MỚI ĐƯỢC THÊM TRỰC TIẾP VÀO ĐÂY --- */}
            <View style={styles.header}>
                <View style={{ width: 100 }} />
                <HeaderLogo />
                <View style={styles.headerRightContainer}>
                    <NotificationButton />
                    <HeaderLogoutButton />
                </View>
            </View>
            
            {userRole === 'admin' && (
                <View style={styles.filterBar}>
                    <View style={styles.filterSegment}>
                        <TouchableOpacity onPress={() => setStatusFilter('all')} style={[styles.segmentButton, statusFilter === 'all' && styles.segmentButtonActive]}><Text style={[styles.segmentText, statusFilter === 'all' && styles.segmentTextActive]}>Tất cả</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setStatusFilter('pending')} style={[styles.segmentButton, statusFilter === 'pending' && styles.segmentButtonActive]}><Text style={[styles.segmentText, statusFilter === 'pending' && styles.segmentTextActive]}>Chờ duyệt</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisible(true)}>
                        <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                        <Text style={styles.datePickerText}>{getFormattedDate(selectedDate) || 'Tất cả ngày'}</Text>
                        {selectedDate && <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearDateButton}><Ionicons name="close-circle" size={20} color={COLORS.gray} /></TouchableOpacity>}
                    </TouchableOpacity>
                </View>
            )}
            
            <Modal transparent={true} animationType="fade" visible={isDatePickerVisible} onRequestClose={() => setDatePickerVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
                    <View style={styles.datePickerBackdrop}><TouchableWithoutFeedback><View style={styles.datePickerContent}>
                        <Calendar onDayPress={onDayPress} markedDates={{ [selectedDate ? selectedDate.toISOString().split('T')[0] : '']: {selected: true, disableTouchEvent: true, selectedColor: COLORS.primary} }} />
                    </View></TouchableWithoutFeedback></View>
                </TouchableWithoutFeedback>
            </Modal>
            
            {loading ? <ActivityIndicator size="large" style={{ flex: 1 }} /> : (
                 <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => item.id + index}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Không có báo cáo nào.</Text></View>}
                    stickySectionHeadersEnabled={true}
                />
            )}

            <Modal visible={isImageModalVisible} transparent={true} onRequestClose={closeImagePreview}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={closeImagePreview}><Ionicons name="close-circle" size={40} color="white" /></TouchableOpacity>
                    <Image source={{ uri: selectedImageUrl }} style={styles.fullscreenImage} resizeMode="contain" />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 10,
        paddingHorizontal: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    headerLogo: {
        width: 100,
        height: 40,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
        justifyContent: 'flex-end',
    },
    headerButton: {
        width: 45, 
        height: 45, 
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        borderWidth: 1.5,
        borderColor: COLORS.white,
    },
    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, backgroundColor: COLORS.lightGray, borderBottomWidth: 1, borderBottomColor: '#e0e0e0',},
    filterSegment: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 8, },
    segmentButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, },
    segmentButtonActive: { backgroundColor: COLORS.black, },
    segmentText: { color: COLORS.black, fontWeight: '600' },
    segmentTextActive: { color: COLORS.white },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',},
    datePickerText: { marginLeft: 8, color: COLORS.black, fontWeight: '500', fontSize: 15 },
    clearDateButton: { marginLeft: 10, },
    datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20,},
    datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350, },
    listContainer: { paddingHorizontal: 10, paddingBottom: 80 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.lightGray, paddingHorizontal: 15,  marginHorizontal: -10 },
    sectionHeaderText: { fontWeight: 'bold', fontSize: 16 },
    sectionRevenueText: { fontWeight: '600', color: COLORS.gray },
    itemContainer: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    itemImage: { width: 100, height: 100, borderRadius: 10 },
    itemContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    serviceText: { fontSize: 16, fontWeight: 'bold', color: COLORS.black, flex: 1, marginRight: 5 },
    priceText: { fontSize: 15, fontWeight: '600', color: COLORS.black, marginVertical: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    infoText: { marginLeft: 8, fontSize: 13, color: COLORS.gray, flexShrink: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    statusBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },
    menuTrigger: { padding: 5, },
    adminActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginLeft: 10 },
    actionButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, },
    emptyText: { textAlign: 'center', color: COLORS.gray, fontSize: 16 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
    modalCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
    fullscreenImage: { width: '100%', height: '80%' },
    divider: { height: 1, backgroundColor: COLORS.lightGray },
});

const menuOptionsStyles = { optionsContainer: { borderRadius: 10, padding: 5, marginTop: 25 } };

export default StoreScreen;