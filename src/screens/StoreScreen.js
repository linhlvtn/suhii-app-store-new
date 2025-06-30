import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, RefreshControl, Image, TouchableOpacity, Alert, Modal, Platform, TouchableWithoutFeedback } from 'react-native'; // Xóa ActivityIndicator
import { collection, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { SwipeListView, SwipeRow } from 'react-native-swipe-list-view';

import LoadingOverlay from '../components/LoadingOverlay'; // <-- Đảm bảo import LoadingOverlay

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
    overtime: '#6a0dad' 
};

const getFormattedDate = (date) => { 
    if (!date) return null; 
    const today = new Date(); 
    today.setHours(0,0,0,0); 
    const yesterday = new Date(today); 
    yesterday.setDate(yesterday.getDate() - 1); 
    
    const dateToCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateToCompare.getTime() === today.getTime()) return 'Hôm nay'; 
    if (dateToCompare.getTime() === yesterday.getTime()) return 'Hôm qua'; 
    const day = String(date.getDate()).padStart(2, '0'); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = date.getFullYear(); 
    return `${day}/${month}/${year}`; 
};

const toYYYYMMDD = (date) => { 
    if (!date) return ''; 
    const year = date.getFullYear(); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0'); 
    return `${year}-${month}-${day}`; 
};

const HeaderLogo = () => (
    <Image 
        source={require('../../assets/logo.png')} 
        style={styles.headerLogo} 
        resizeMode="contain" 
    />
);

const HeaderLogoutButton = () => { 
    const handleSignOut = () => { 
        Alert.alert(
            "Xác nhận Đăng xuất", 
            "Bạn có chắc muốn đăng xuất?", 
            [
                { text: "Hủy" }, 
                { 
                    text: "Đăng xuất", 
                    onPress: () => auth.signOut(), 
                    style: "destructive" 
                }
            ]
        ); 
    }; 
    return (
        <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={28} color={COLORS.black} />
        </TouchableOpacity>
    ); 
};

const StoreScreen = () => {
    const { user, userRole, initializing } = useAuth();
    const [rawReports, setRawReports] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [hasPendingReports, setHasPendingReports] = useState(false);
    const navigation = useNavigation();

    const fetchReports = useCallback(async () => {
        // Đảm bảo luôn trả về một hàm, kể cả khi userRole chưa có
        if (!userRole) { 
            setLoading(false); // Tắt loading nếu không có userRole để tránh bị kẹt
            return () => {}; // Trả về hàm rỗng để không gây lỗi undefined
        } 
        setLoading(true); 
        try { 
            const reportsRef = collection(db, 'reports'); 
            let queries = [orderBy('createdAt', 'desc')]; 
            if (userRole === 'employee' && user) { 
                queries.push(where('participantIds', 'array-contains', user.uid)); 
            } else if (userRole === 'admin' && statusFilter !== 'all') { 
                queries.push(where('status', '==', statusFilter)); 
            } 
            if (selectedDate) { 
                const startOfDay = new Date(selectedDate); 
                startOfDay.setHours(0, 0, 0, 0); 
                const endOfDay = new Date(selectedDate); 
                endOfDay.setHours(23, 59, 59, 999); 
                queries.push(where('createdAt', '>=', startOfDay), where('createdAt', '<=', endOfDay)); 
            } 
            const q = query(reportsRef, ...queries); 
            const unsubscribe = onSnapshot(q, (querySnapshot) => { 
                setRawReports(querySnapshot.docs.map(d => ({ key: d.id, ...d.data() })));
                setLoading(false); 
            }, (error) => {
                console.error("Lỗi khi lắng nghe hóa đơn:", error); 
                if (error.code === 'failed-precondition') { 
                    Alert.alert("Lỗi Cấu Hình", "Cơ sở dữ liệu của bạn thiếu chỉ mục cần thiết. Vui lòng kiểm tra console Firebase để tạo chỉ mục cho: reports collection, status, createdAt, participantIds."); 
                } 
                setLoading(false);
            });
            return unsubscribe; 
        } catch (error) { 
            console.error("Lỗi khi tải hóa đơn:", error); 
            setLoading(false); 
            return () => {}; 
        } 
    }, [user, userRole, statusFilter, selectedDate]);
    
    useEffect(() => { 
        if (userRole !== 'admin') return; 
        const q = query(collection(db, "reports"), where("status", "==", "pending")); 
        const unsubscribe = onSnapshot(q, (snapshot) => { 
            setHasPendingReports(!snapshot.empty); 
        }); 
        return () => unsubscribe(); 
    }, [userRole]);

    useFocusEffect(useCallback(() => { 
        let unsubscribeFunc; 
        const setupListener = async () => {
            if (userRole) {
                // Đảm bảo await fetchReports() để nhận hàm unsubscribe thực sự
                // hoặc hàm rỗng từ fetchReports
                unsubscribeFunc = await fetchReports(); 
            } else {
                // Nếu không có userRole, đảm bảo unsubscribeFunc là một hàm rỗng
                unsubscribeFunc = () => {};
            }
        };
        setupListener();

        return () => {
            if (typeof unsubscribeFunc === 'function') {
                unsubscribeFunc(); 
            } else {
                console.warn("unsubscribeFunc không phải là một hàm hoặc chưa được gán:", unsubscribeFunc);
            }
        };
    }, [userRole, fetchReports])); 

    useEffect(() => { 
        const grouped = rawReports.reduce((acc, report) => { 
            if (report.createdAt?.toDate) { 
                const groupKey = report.createdAt.toDate().toDateString(); 
                if (!acc[groupKey]) acc[groupKey] = { 
                    title: getFormattedDate(report.createdAt.toDate()), 
                    data: [] 
                }; 
                acc[groupKey].data.push(report); 
            } 
            return acc; 
        }, {}); 
        const sortedSections = Object.entries(grouped).map(([key, value]) => ({ 
            title: value.title, 
            rawDate: new Date(key), 
            data: value.data, 
        })).sort((a, b) => b.rawDate - a.rawDate); 
        setSections(sortedSections); 
    }, [rawReports]);
    
    const handleUpdateStatus = async (reportId, newStatus) => { 
        Alert.alert(
            'Xác nhận', 
            `Bạn có chắc muốn ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} hóa đơn này?`, 
            [
                { text: "Hủy" }, 
                { 
                    text: "Đồng ý", 
                    onPress: async () => { 
                        try { 
                            await updateDoc(doc(db, 'reports', reportId), { status: newStatus }); 
                        } catch (error) { 
                            Alert.alert("Lỗi", "Không thể cập nhật."); 
                        } 
                    }, 
                    style: newStatus === 'rejected' ? 'destructive' : 'default' 
                }
            ]
        ); 
    };

    const handleBulkUpdate = async (newStatus) => { 
        const pendingReports = rawReports.filter(r => r.status === 'pending'); 
        if (pendingReports.length === 0) { 
            Alert.alert("Thông báo", "Không có hóa đơn nào đang ở trạng thái 'Chờ duyệt'."); 
            return; 
        } 
        const actionText = newStatus === 'approved' ? 'duyệt' : 'từ chối'; 
        const reportCount = pendingReports.length; 
        Alert.alert( 
            `Xác nhận ${actionText} tất cả`, 
            `Bạn có chắc muốn ${actionText} ${reportCount} hóa đơn đang chờ?`, 
            [ 
                { text: "Hủy", style: "cancel" }, 
                { 
                    text: `Đồng ý (${reportCount})`, 
                    onPress: async () => { 
                        setLoading(true); 
                        const batch = writeBatch(db); 
                        pendingReports.forEach(report => { 
                            const reportRef = doc(db, 'reports', report.key); 
                            batch.update(reportRef, { status: newStatus }); 
                        }); 
                        try { 
                            await batch.commit(); 
                            Alert.alert("Thành công", `Đã ${actionText} thành công ${reportCount} hóa đơn.`); 
                        } catch (error) { 
                            console.error("Lỗi khi cập nhật hàng loạt: ", error); 
                            Alert.alert("Lỗi", "Không thể cập nhật tất cả hóa đơn."); 
                        } finally { 
                            // onSnapshot sẽ tự động cập nhật UI, không cần fetchReports lại
                        } 
                    }, 
                    style: newStatus === 'rejected' ? 'destructive' : 'default' 
                } 
            ] 
        ); 
    };

    const handleDelete = (reportId) => { 
        Alert.alert(
            "Xác nhận xóa", 
            "Bạn có chắc muốn xóa hóa đơn này vĩnh viễn?", 
            [
                { text: "Hủy" }, 
                { 
                    text: "Xóa", 
                    onPress: async () => { 
                        try { 
                            await deleteDoc(doc(db, 'reports', reportId)); 
                        } catch (error) { 
                            Alert.alert("Lỗi", "Không thể xóa hóa đơn."); 
                        } 
                    }, 
                    style: 'destructive' 
                }
            ]
        ); 
    };

    const handleEdit = (item) => navigation.navigate('EditReport', { reportId: item.key });
    
    const onDayPress = (day) => { 
        const newDate = new Date(day.dateString); 
        setSelectedDate(newDate); 
        setDatePickerVisible(false); 
    };
    
    const clearDateFilter = () => setSelectedDate(null);
    
    const openImagePreview = (url) => { 
        setSelectedImageUrl(url); 
        setImageModalVisible(true); 
    };
    
    const closeImagePreview = () => { 
        setImageModalVisible(false); 
        setSelectedImageUrl(null); 
    };

    const renderItem = ({ item }) => {
        const statusMap = { 
            approved: { icon: 'checkmark-circle', color: COLORS.approved }, 
            pending: { icon: 'time-outline', color: COLORS.pending }, 
            rejected: { icon: 'close-circle', color: COLORS.rejected } 
        };
        const statusInfo = statusMap[item.status] || { icon: 'help-circle', color: COLORS.gray };
        
        const canEdit = userRole === 'admin' ? item.status === 'pending' : (userRole === 'employee' && item.userId === user?.uid && item.status === 'pending');
        const canDelete = userRole === 'admin' || (userRole === 'employee' && item.userId === user?.uid && item.status === 'pending');
        
        const numberOfParticipants = (item.participantIds && Array.isArray(item.participantIds) && item.participantIds.length > 0) ? item.participantIds.length : 1;
        
        const originalPrice = item.price || 0;
        const sharedPrice = numberOfParticipants > 0 ? originalPrice / numberOfParticipants : originalPrice;

        const commissionRate = item.commissionRate !== undefined ? item.commissionRate : 0.10; 
        const overtimeRate = item.overtimeRate !== undefined ? item.overtimeRate : 0.30;   

        let actualReceivedRevenueText = null;
        if (item.status === 'approved' && user?.uid) { 
            let actualPerReport = 0;
            if (item.userId === user.uid || item.partnerId === user.uid) {
                if (item.isOvertime) {
                    actualPerReport = sharedPrice * overtimeRate; 
                } else {
                    actualPerReport = sharedPrice * commissionRate; 
                }
            } else if (userRole === 'admin') { 
                if (item.isOvertime) {
                    actualPerReport = originalPrice * overtimeRate; 
                } else {
                    actualPerReport = originalPrice * commissionRate; 
                }
            }

            if (actualPerReport > 0) {
                actualReceivedRevenueText = actualPerReport.toLocaleString('vi-VN');
            }
        }

        const displayOvertimeRate = item.overtimeRate !== undefined ? (item.overtimeRate * 100).toFixed(0) : '30'; 

        return (
            <SwipeRow 
                rightOpenValue={-85} 
                disableRightSwipe={!canDelete}
                key={item.key}
            >
                {/* Hidden Item */}
                <View style={styles.rowBack}>
                    <TouchableOpacity 
                        style={styles.backRightBtn} 
                        onPress={() => handleDelete(item.key)}
                        disabled={!canDelete}
                    >
                        <Ionicons name="trash-outline" size={28} color={COLORS.white} />
                        <Text style={styles.backTextWhite}>Xóa</Text>
                    </TouchableOpacity>
                </View>

                {/* Visible Item */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        if (canEdit) {
                            handleEdit(item);
                        } else if (item.imageUrl) {
                            openImagePreview(item.imageUrl);
                        }
                    }}
                    disabled={!canEdit && !item.imageUrl}
                >
                    <View style={styles.itemContainer}>
                        <View> 
                            <Image 
                                source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/default-image.png')} 
                                style={styles.itemImage} 
                            />
                            <View style={styles.statusIconOnImage}>
                                <Ionicons name={statusInfo.icon} size={26} color={statusInfo.color} />
                            </View>
                        </View>
                        <View style={styles.itemContent}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.serviceText} numberOfLines={2}>
                                    {item.service || ''}
                                </Text>
                                {userRole === 'employee' && (canEdit || canDelete) && ( 
                                    <Menu>
                                        <MenuTrigger style={styles.menuTrigger}>
                                            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray} />
                                        </MenuTrigger>
                                        <MenuOptions customStyles={menuOptionsStyles}>
                                            {canEdit && (
                                                <MenuOption onSelect={() => handleEdit(item)}>
                                                    <Text>Chỉnh sửa</Text>
                                                </MenuOption>
                                            )}
                                            {canEdit && canDelete && (
                                                <View style={styles.divider} />
                                            )}
                                            {canDelete && (
                                                <MenuOption onSelect={() => handleDelete(item.key)}>
                                                    <Text style={{ color: 'red' }}>Xóa</Text>
                                                </MenuOption>
                                            )}
                                        </MenuOptions>
                                    </Menu>
                                )}
                                {userRole === 'admin' && (canEdit || canDelete) && (
                                    <Menu>
                                        <MenuTrigger style={styles.menuTrigger}>
                                            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray} />
                                        </MenuTrigger>
                                        <MenuOptions customStyles={menuOptionsStyles}>
                                            {canEdit && ( 
                                                <MenuOption onSelect={() => handleEdit(item)}>
                                                    <Text>Chỉnh sửa</Text>
                                                </MenuOption>
                                            )}
                                            {canDelete && ( 
                                                <MenuOption onSelect={() => handleDelete(item.key)}>
                                                    <Text style={{ color: 'red' }}>Xóa</Text>
                                                </MenuOption>
                                            )}
                                        </MenuOptions>
                                    </Menu>
                                )}
                            </View>
                            <View style={styles.priceContainer}>
                                <Text style={styles.sharedPriceText}>
                                    {(item.price || 0).toLocaleString('vi-VN')}₫
                                </Text>
                                {item.isOvertime && (
                                    <Text style={styles.overtimeText}>{`(+${displayOvertimeRate}%)`}</Text>
                                )}
                            </View>
                            
                            {actualReceivedRevenueText && item.status === 'approved' ? (
                                <View style={styles.infoRow}>
                                    <Ionicons name="cash" size={16} color={COLORS.approved} />
                                    <Text style={styles.infoText}>Thực nhận: {actualReceivedRevenueText}₫</Text>
                                </View>
                            ) : null}

                            <View style={styles.infoRow}>
                                <Ionicons name="people-outline" size={16} color={COLORS.gray} />
                                <Text style={styles.infoText}>
                                    {item.employeeName}{item.partnerName && ` & ${item.partnerName}`}
                                </Text>
                            </View>
                            {item.note && typeof item.note === 'string' && item.note.trim() !== '' && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="document-text-outline" size={16} color={COLORS.gray} />
                                    <Text style={styles.infoText} numberOfLines={1}>
                                        {item.note}
                                    </Text>
                                </View>
                            )}
                            {userRole === 'admin' && item.status === 'pending' && (
                                <View style={styles.adminActions}>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.rejectButton]} 
                                        onPress={() => handleUpdateStatus(item.key, 'rejected')}
                                    >
                                        <Ionicons name="close" size={18} color={COLORS.white} />
                                        <Text style={styles.actionButtonText}>Từ chối</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.approveButton]} 
                                        onPress={() => handleUpdateStatus(item.key, 'approved')}
                                    >
                                        <Ionicons name="checkmark" size={18} color={COLORS.white} />
                                        <Text style={styles.actionButtonText}>Duyệt</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </SwipeRow>
        );
    };

    const renderSectionHeader = ({ section }) => {
        const totalSectionRevenue = section.data.reduce((sum, item) => {
            if (item.status === 'approved') {
                return sum + (item.price || 0); 
            }
            return sum;
        }, 0);

        return (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <Text style={styles.sectionRevenueText}>
                    Doanh thu: {totalSectionRevenue.toLocaleString('vi-VN')}₫
                </Text>
            </View>
        );
    };

    // Loại bỏ khối if (initializing) và ActivityIndicator trực tiếp ở đây
    // LoadingOverlay sẽ xử lý việc này
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 100 }} />
                <HeaderLogo />
                <View style={styles.headerRightContainer}>
                    <HeaderLogoutButton />
                </View>
            </View>
            
            {userRole === 'admin' && (
                <>
                    <View style={styles.filterBar}>
                        <View style={styles.filterSegment}>
                            <TouchableOpacity 
                                onPress={() => setStatusFilter('all')} 
                                style={[styles.segmentButton, statusFilter === 'all' && styles.segmentButtonActive]}
                            >
                                <Text style={[styles.segmentText, statusFilter === 'all' && styles.segmentTextActive]}>
                                    Tất cả
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setStatusFilter('pending')} 
                                style={[styles.segmentButton, statusFilter === 'pending' && styles.segmentButtonActive]}
                            >
                                <View style={styles.filterButtonContent}>
                                    <Text style={[styles.segmentText, statusFilter === 'pending' && styles.segmentTextActive]}>
                                        Chờ duyệt
                                    </Text>
                                    {hasPendingReports && <View style={styles.notificationDot} />}
                                </View>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                            style={styles.datePickerButton} 
                            onPress={() => setDatePickerVisible(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                            <Text style={styles.datePickerText}>
                                {getFormattedDate(selectedDate) || 'Tất cả ngày'}
                            </Text>
                            {selectedDate && (
                                <TouchableOpacity onPress={clearDateFilter} style={styles.clearDateButton}>
                                    <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </View>
                    
                    {statusFilter === 'pending' && rawReports.some(r => r.status === 'pending') && (
                        <View style={styles.bulkActionContainer}>
                            <TouchableOpacity 
                                style={[styles.bulkActionButton, styles.bulkRejectButton]} 
                                onPress={() => handleBulkUpdate('rejected')}
                            >
                                <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
                                <Text style={styles.bulkActionButtonText}>Từ chối tất cả</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.bulkActionButton, styles.bulkApproveButton]} 
                                onPress={() => handleBulkUpdate('approved')}
                            >
                                <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.white} />
                                <Text style={styles.bulkActionButtonText}>Duyệt tất cả</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
            
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
                                    onDayPress={onDayPress} 
                                    markedDates={{ 
                                        [toYYYYMMDD(selectedDate)]: {
                                            selected: true, 
                                            disableTouchEvent: true, 
                                            selectedColor: COLORS.primary
                                        } 
                                    }} 
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            
            {/* Sử dụng LoadingOverlay cho cả initializing và loading */}
            <LoadingOverlay isVisible={initializing || loading} message={initializing ? "Đang khởi tạo ứng dụng..." : "Đang tải hóa đơn..."} />

            {/* Chỉ hiển thị SwipeListView khi không loading và không initializing */}
            {!initializing && !loading && (
                <SwipeListView
                    useSectionList
                    sections={sections}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl 
                            refreshing={loading} 
                            onRefresh={fetchReports} 
                            colors={[COLORS.black]} 
                            tintColor={COLORS.black} 
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Không có hóa đơn nào.</Text>
                        </View>
                    }
                    stickySectionHeadersEnabled
                />
            )}
            
            <Modal 
                visible={isImageModalVisible} 
                transparent={true} 
                onRequestClose={closeImagePreview}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity 
                        style={styles.modalCloseButton} 
                        onPress={closeImagePreview}
                    >
                        <Ionicons name="close-circle" size={40} color="white" />
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: selectedImageUrl }} 
                        style={styles.fullscreenImage} 
                        resizeMode="contain" 
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    // fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' }, // Đã xóa/comment do sử dụng LoadingOverlay
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerLogo: { width: 100, height: 40 },
    headerRightContainer: { flexDirection: 'row', alignItems: 'center', width: 100, justifyContent: 'flex-end' },
    headerButton: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, backgroundColor: COLORS.lightGray, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    filterSegment: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 8 },
    segmentButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    segmentButtonActive: { backgroundColor: COLORS.black },
    segmentText: { color: COLORS.black, fontWeight: '600' },
    segmentTextActive: { color: COLORS.white },
    filterButtonContent: { flexDirection: 'row', alignItems: 'center' },
    notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.rejected, marginLeft: 6 },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    datePickerText: { marginLeft: 8, color: COLORS.black, fontWeight: '500', fontSize: 15 },
    clearDateButton: { marginLeft: 10 },
    datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
    datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350 },
    listContainer: { paddingBottom: 80, backgroundColor: COLORS.white },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: '#f7f7f7', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    sectionHeaderText: { fontWeight: 'bold', fontSize: 16 },
    sectionRevenueText: { fontWeight: '600', color: COLORS.gray },
    itemContainer: { flexDirection: 'row', backgroundColor: COLORS.white, paddingVertical: 12, paddingLeft: 12, paddingRight: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    itemImage: { width: 90, height: 90, borderRadius: 10, backgroundColor: COLORS.lightGray },
    itemContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, },
    serviceText: { fontSize: 16, fontWeight: 'bold', color: COLORS.black, flex: 1, marginRight: 5 },
    priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, },
    priceText: { fontSize: 16, fontWeight: '600', color: COLORS.rejected },
    sharedPriceText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: COLORS.rejected, 
    },
    originalPriceNote: { 
        fontSize: 12, 
        color: COLORS.secondary, 
        marginTop: 2, 
    },
    overtimeText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    infoText: { marginLeft: 8, fontSize: 13, color: COLORS.gray, flexShrink: 1 },
    statusIconOnImage: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 13, padding: 1, },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { textAlign: 'center', color: COLORS.gray, fontSize: 16 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
    modalCloseButton: { position: 'absolute', top: 50, right: 20, zIndex: 1 },
    fullscreenImage: { width: '100%', height: '80%' },
    rowBack: { alignItems: 'center', backgroundColor: COLORS.rejected, flex: 1, flexDirection: 'row', justifyContent: 'flex-end', },
    backRightBtn: { alignItems: 'center', bottom: 0, justifyContent: 'center', position: 'absolute', top: 0, width: 85, },
    backTextWhite: { color: '#FFF', fontWeight: 'bold' },
    menuTrigger: { padding: 5, },
    divider: { height: 1, backgroundColor: COLORS.lightGray },
    adminActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginLeft: 10 },
    actionButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
    rejectButton: { backgroundColor: COLORS.rejected },
    approveButton: { backgroundColor: COLORS.approved },
    bulkActionContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 10, backgroundColor: '#fff8e1', borderBottomWidth: 1, borderBottomColor: '#ffecb3', },
    bulkActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 5, },
    bulkRejectButton: { backgroundColor: COLORS.rejected },
    bulkApproveButton: { backgroundColor: COLORS.approved },
    bulkActionButtonText: { color: COLORS.white, fontWeight: 'bold', marginLeft: 8, fontSize: 14, },
});
const menuOptionsStyles = { optionsContainer: { borderRadius: 10, padding: 5, marginTop: 25 } };

export default StoreScreen;