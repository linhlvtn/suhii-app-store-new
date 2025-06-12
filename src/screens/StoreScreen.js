import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl, Image, TouchableOpacity, Alert, Modal, Platform, TouchableWithoutFeedback } from 'react-native';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Cấu hình ngôn ngữ tiếng Việt cho Lịch
LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  monthNamesShort: ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'],
  dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay'
};
LocaleConfig.defaultLocale = 'vi';

// --- Hằng số màu sắc và Hàm trợ giúp ---
const COLORS = { 
    black: '#121212', 
    white: '#FFFFFF', 
    gray: '#888888', 
    lightGray: '#F5F5F5', 
    primary: '#007bff' 
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


const StoreScreen = () => {
    // --- State cho dữ liệu và bộ lọc ---
    const [rawReports, setRawReports] = useState([]);
    const [sections, setSections] = useState([]);
    const [filter, setFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(null);
    
    // --- State để quản lý Modal Lịch ---
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    
    // --- State cho các UI khác ---
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    
    const navigation = useNavigation();

    // --- Xử lý và gom nhóm dữ liệu ---
    useEffect(() => {
        const processAndGroupReports = () => {
            const grouped = rawReports.reduce((acc, report) => {
                if (report.createdAt && report.createdAt.toDate) {
                    const reportDateStr = report.createdAt.toDate().toISOString().split('T')[0];
                    const displayDate = getFormattedDate(report.createdAt.toDate());
                    if (!acc[reportDateStr]) {
                        acc[reportDateStr] = { title: displayDate, rawDate: report.createdAt.toDate(), totalRevenue: 0, data: [] };
                    }
                    acc[reportDateStr].data.push(report);
                    acc[reportDateStr].totalRevenue += report.price;
                }
                return acc;
            }, {});

            const sortedSections = Object.values(grouped).sort((a, b) => b.rawDate - a.rawDate);
            setSections(sortedSections);
        };
        processAndGroupReports();
    }, [rawReports]);

    // --- Tải dữ liệu từ Firestore ---
    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            const currentUser = auth.currentUser;
            let queries = [orderBy('createdAt', 'desc')];

            if (filter === 'mine' && currentUser) {
                queries.push(where('userId', '==', currentUser.uid));
            }
            
            if (selectedDate) {
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                queries.push(where('createdAt', '>=', startOfDay));
                queries.push(where('createdAt', '<=', endOfDay));
            }

            const q = query(reportsRef, ...queries);
            const snapshots = await getDocs(q);
            const fetchedReports = snapshots.docs.map(d => ({ id: d.id, ...d.data() }));
            setRawReports(fetchedReports);

        } catch (error) {
            console.error("Lỗi khi tải báo cáo:", error);
            Alert.alert("Lỗi tải dữ liệu", "Đã có lỗi xảy ra. Có thể bạn cần tạo chỉ mục (index) trong Firestore cho bộ lọc này.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, selectedDate]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    // --- Các hàm xử lý sự kiện ---
    const onDayPress = (day) => {
        const newDate = new Date(day.timestamp);
        // Chỉnh lại múi giờ cho đúng
        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
        setSelectedDate(newDate);
        setDatePickerVisible(false);
    };

    const clearDateFilter = (e) => {
        e.stopPropagation();
        setSelectedDate(null);
    };
    
    const openImagePreview = (url) => { setSelectedImageUrl(url); setImageModalVisible(true); };
    const closeImagePreview = () => { setImageModalVisible(false); setSelectedImageUrl(null); };
    
    const handleDelete = (reportId) => {
        Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa?",
            [{ text: "Hủy" }, { text: "Đồng ý", onPress: async () => {
                try {
                    await deleteDoc(doc(db, 'reports', reportId));
                    fetchReports();
                } catch (error) { Alert.alert("Lỗi", "Không thể xóa báo cáo."); }
            }, style: 'destructive' }]
        );
    };
    const handleEdit = (reportId) => { navigation.navigate('EditReport', { reportId }); };

    // --- Các hàm render ---
    const renderItem = ({ item }) => {
        const isOwner = item.userId === auth.currentUser?.uid;
        const paymentIcon = item.paymentMethod === 'Tiền mặt' ? 'cash-outline' : 'card-outline';
        const displayServices = Array.isArray(item.services) ? item.services.join(', ') : (item.service || '');

        return (
            <View style={styles.itemContainer}>
                <TouchableOpacity onPress={() => item.imageUrl && openImagePreview(item.imageUrl)}>
                    <Image source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/default-image.png')} style={styles.itemImage} />
                </TouchableOpacity>
                <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                        <Text style={styles.serviceText} numberOfLines={2}>{displayServices}</Text>
                        {isOwner && (
                            <Menu>
                                <MenuTrigger><Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray} /></MenuTrigger>
                                <MenuOptions customStyles={menuOptionsStyles}>
                                    <MenuOption onSelect={() => handleEdit(item.id)} text='Chỉnh sửa' />
                                    <View style={styles.divider} />
                                    <MenuOption onSelect={() => handleDelete(item.id)}><Text style={{ color: 'red' }}>Xóa</Text></MenuOption>
                                </MenuOptions>
                            </Menu>
                        )}
                    </View>
                    <Text style={styles.priceText}>{item.price.toLocaleString('vi-VN')} VNĐ</Text>
                    <View style={styles.infoRow}><Ionicons name={paymentIcon} size={16} color={COLORS.gray} /><Text style={styles.infoText}>{item.paymentMethod}</Text></View>
                    <View style={styles.infoRow}><Ionicons name="person-outline" size={16} color={COLORS.gray} /><Text style={styles.infoText}>{item.employeeName}</Text></View>
                    {item.note ? (
                        <View style={styles.infoRow}>
                            <Ionicons name="document-text-outline" size={16} color={COLORS.gray} />
                            <Text style={styles.infoText} numberOfLines={1}>{item.note}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title, totalRevenue } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <Text style={styles.sectionRevenueText}>{totalRevenue.toLocaleString('vi-VN')} VNĐ</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.filterBar}>
                <View style={styles.filterSegment}>
                    <TouchableOpacity onPress={() => setFilter('all')} style={[styles.segmentButton, filter === 'all' && styles.segmentButtonActive]}><Ionicons name="people-outline" size={20} color={filter === 'all' ? COLORS.white : COLORS.black} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setFilter('mine')} style={[styles.segmentButton, filter === 'mine' && styles.segmentButtonActive]}><Ionicons name="person-outline" size={20} color={filter === 'mine' ? COLORS.white : COLORS.black} /></TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisible(true)}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                    <Text style={styles.datePickerText}>{getFormattedDate(selectedDate) || 'Tất cả ngày'}</Text>
                    {selectedDate && (
                        <TouchableOpacity onPress={clearDateFilter} style={styles.clearDateButton}>
                            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </View>
            
            <Modal
                transparent={true}
                animationType="fade"
                visible={isDatePickerVisible}
                onRequestClose={() => setDatePickerVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
                    <View style={styles.datePickerBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.datePickerContent}>
                                <Calendar
                                    current={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
                                    onDayPress={onDayPress}
                                    markedDates={{
                                        [selectedDate ? selectedDate.toISOString().split('T')[0] : '']: {selected: true, disableTouchEvent: true, selectedColor: COLORS.primary}
                                    }}
                                    theme={{
                                        backgroundColor: COLORS.white,
                                        calendarBackground: COLORS.white,
                                        textSectionTitleColor: '#b6c1cd',
                                        selectedDayBackgroundColor: COLORS.primary,
                                        selectedDayTextColor: '#ffffff',
                                        todayTextColor: COLORS.primary,
                                        dayTextColor: COLORS.black,
                                        textDisabledColor: '#d9e1e8',
                                        arrowColor: COLORS.primary,
                                        monthTextColor: COLORS.black,
                                        textDayFontWeight: '300',
                                        textMonthFontWeight: 'bold',
                                        textDayHeaderFontWeight: '300',
                                        textDayFontSize: 16,
                                        textMonthFontSize: 16,
                                        textDayHeaderFontSize: 14
                                    }}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
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
    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, backgroundColor: COLORS.lightGray, borderBottomWidth: 1, borderBottomColor: '#e0e0e0',},
    filterSegment: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 20, },
    segmentButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, },
    segmentButtonActive: { backgroundColor: COLORS.black, },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',},
    datePickerText: { marginLeft: 8, color: COLORS.black, fontWeight: '500', fontSize: 15 },
    clearDateButton: { marginLeft: 10, },
    datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20,},
    datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,},
    listContainer: { paddingHorizontal: 10, paddingBottom: 80 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.lightGray, paddingHorizontal: 15,  marginHorizontal: -10 },
    sectionHeaderText: { fontWeight: 'bold', fontSize: 16 },
    sectionRevenueText: { fontWeight: '600', color: COLORS.gray },
    itemContainer: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
    itemImage: { width: 100, height: 100, borderRadius: 10 },
    itemContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    serviceText: { fontSize: 16, fontWeight: 'bold', color: COLORS.black, flex: 1, marginRight: 5 },
    priceText: { fontSize: 15, fontWeight: '600', color: COLORS.black, marginVertical: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    infoText: { marginLeft: 8, fontSize: 13, color: COLORS.gray, flexShrink: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, },
    emptyText: { textAlign: 'center', color: COLORS.gray, fontSize: 16 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
    modalCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
    fullscreenImage: { width: '100%', height: '80%' },
    divider: { height: 1, backgroundColor: COLORS.lightGray },
});

const menuOptionsStyles = { optionsContainer: { borderRadius: 10, padding: 5, marginTop: 25 } };

export default StoreScreen;