// src/screens/EmployeeStatisticsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform, FlatList, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

import TimeFilterSegment from './Statistics/components/TimeFilterSegment';
import SummaryCard from './Statistics/components/SummaryCard';
import StatsChart from './Statistics/components/StatsChart';
import ServicePieChart from './Statistics/components/ServicePieChart';

LocaleConfig.locales['vi'] = { monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'], dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'], dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'], today: 'Hôm nay' };
LocaleConfig.defaultLocale = 'vi';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    success: '#28a745',
    danger: '#D32F2F',
    warning: '#f39c12',
    black: '#1a1a1a',
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
};

const getDateRange = (period, customDate = null) => {
    const now = new Date();
    let startDate, endDate = new Date(now);
    if (period === 'custom' && customDate) {
        startDate = new Date(customDate);
        endDate = new Date(customDate);
    } else {
        switch (period) {
            case 'today': startDate = new Date(now); break;
            case 'week':
                const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to get Monday as start of week
                startDate = new Date(now.setDate(diff));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: startDate = new Date(now);
        }
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
};

const getDynamicTitle = (period, date) => {
    if (period === 'custom' && date) return `Ngày ${date.toLocaleDateString('vi-VN')}`;
    const now = new Date();
    switch (period) {
        case 'today': return `Hôm nay, ${now.toLocaleDateString('vi-VN')}`;
        case 'week':
            const startOfWeek = getDateRange('week').startDate.toDate();
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            return `Tuần này (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1})`;
        case 'month': return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
        case 'year': return `Năm ${now.getFullYear()}`;
        default: return 'Tổng quan';
    }
};

const EmployeeStatisticsScreen = () => {
    const { userRole, user: authUser } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();
    
    const employeeId = route.params?.employeeId || authUser?.uid;
    const employeeName = route.params?.employeeName || 'Của tôi';

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const [summaryData, setSummaryData] = useState({ totalRevenue: 0, totalReports: 0 });
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [pieChartData, setPieChartData] = useState([]);
    const [actualRevenue, setActualRevenue] = useState(0);

    const handleBackButtonPress = () => {
        if (userRole === 'admin' && route.params?.employeeId) {
            navigation.goBack();
        } else {
            navigation.navigate('MainTabs', { screen: 'Trang chủ' });
        }
    };

    const fetchEmployeeStats = useCallback(async () => {
        if (!employeeId) { 
            setLoading(false); 
            return; 
        }
        setLoading(true);

        const { startDate, endDate } = getDateRange(selectedPeriod, selectedDate);

        try {
            const q = query( 
                collection(db, "reports"), 
                where("participantIds", "array-contains", employeeId), 
                where("createdAt", ">=", startDate), 
                where("createdAt", "<=", endDate), 
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            let totalRevenue = 0;
            let calculatedActualRevenue = 0;
            const dailyRevenue = {};
            const serviceCounts = {};

            let tempDate = new Date(startDate.toDate());
            while (tempDate <= endDate.toDate()) {
                const dateKey = tempDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                dailyRevenue[dateKey] = 0;
                tempDate.setDate(tempDate.getDate() + 1);
            }

            const reportsWithActualRevenue = fetchedReports.map(report => {
                const numParticipants = (report.participantIds && Array.isArray(report.participantIds) && report.participantIds.length > 0) ? report.participantIds.length : 1;
                const reportPrice = report.price || 0;

                let revenuePerThisEmployeeForDefaultStats = 0;
                if (report.userId === employeeId || report.partnerId === employeeId) {
                    revenuePerThisEmployeeForDefaultStats = reportPrice / numParticipants;
                }
                
                let currentReportActualRevenue = 0;
                if (report.status === 'approved') {
                    if (report.isOvertime && (report.userId === employeeId || report.partnerId === employeeId)) {
                        currentReportActualRevenue = reportPrice * 0.30;
                    } else {
                        currentReportActualRevenue = revenuePerThisEmployeeForDefaultStats * 0.10;
                    }
                    calculatedActualRevenue += currentReportActualRevenue;
                    
                    totalRevenue += revenuePerThisEmployeeForDefaultStats;
                    
                    if (report.createdAt && report.createdAt.toDate) {
                        const dateKey = report.createdAt.toDate().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        if (dailyRevenue[dateKey] !== undefined) {
                            dailyRevenue[dateKey] += revenuePerThisEmployeeForDefaultStats;
                        }
                    }

                    if (report.service) {
                        report.service.split(', ').forEach(service => {
                            const s = service.trim();
                            serviceCounts[s] = (serviceCounts[s] || 0) + 1;
                        });
                    }
                }
                return { ...report, actualReceivedRevenue: currentReportActualRevenue };
            });

            setReports(reportsWithActualRevenue);

            setSummaryData({
                totalRevenue: totalRevenue || 0,
                totalReports: fetchedReports.length || 0,
            });
            setActualRevenue(calculatedActualRevenue || 0);

            setChartData({
                labels: Object.keys(dailyRevenue),
                datasets: [{ data: Object.values(dailyRevenue) }],
            });

            const pieColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
            setPieChartData(Object.keys(serviceCounts).map((service, index) => ({
                name: service,
                population: serviceCounts[service] || 0,
                color: pieColors[index % pieColors.length],
                legendFontColor: COLORS.secondary,
                legendFontSize: 15,
            })));

        } catch (error) {
            console.error("Lỗi khi tải báo cáo thống kê:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu thống kê.");
        } finally {
            setLoading(false);
        }
    }, [employeeId, selectedPeriod, selectedDate, authUser?.uid]);

    useEffect(() => {
        fetchEmployeeStats();
    }, [fetchEmployeeStats]);

    const onDayPress = (day) => {
        const newDate = new Date(day.dateString + 'T00:00:00');
        setSelectedDate(newDate);
        setDatePickerVisible(false);
        setSelectedPeriod('custom');
    };

    const getSelectedDateString = () => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const renderReportItem = ({ item }) => {
        const statusMap = {
            approved: { icon: 'checkmark-circle', color: COLORS.approved },
            pending: { icon: 'time-outline', color: COLORS.pending },
            rejected: { icon: 'close-circle', color: COLORS.rejected }
        };
        const statusInfo = statusMap[item.status] || { icon: 'help-circle', color: COLORS.gray };
        
        const participants = [];
        if (item.employeeName) participants.push(item.employeeName);
        if (item.partnerName) participants.push(item.partnerName);
        const participantText = participants.length > 0 ? participants.join(' & ') : 'N/A';

        return (
            <TouchableWithoutFeedback>
                <View style={styles.reportItemContainer}>
                    {/* Phần ảnh và icon trạng thái trên ảnh */}
                    <View> 
                        <Image
                            source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/default-image.png')}
                            style={styles.reportItemImage}
                        />
                        <View style={styles.reportStatusIconOnImage}>
                            <Ionicons name={statusInfo.icon} size={26} color={statusInfo.color} />
                        </View>
                    </View>
                    
                    {/* Phần nội dung báo cáo */}
                    <View style={styles.reportItemContent}>
                        <View style={styles.reportItemHeaderInner}>
                            <Text style={styles.reportServiceText} numberOfLines={2}>
                                {item.service || 'Dịch vụ không xác định'}
                            </Text>
                        </View>
                        
                        {/* Hiển thị giá và thông tin ngoài giờ */}
                        <View style={styles.reportPriceContainer}>
                            <Text style={styles.reportPriceText}>
                                {(item.price || 0).toLocaleString('vi-VN')} VNĐ
                            </Text>
                            {item.isOvertime && (
                                <Text style={styles.reportOvertimeText}>(+30%)</Text>
                            )}
                        </View>
                        
                        {/* Dòng doanh thu thực nhận nhỏ phía dưới */}
                        {userRole === 'admin' && item.status === 'approved' && typeof item.actualReceivedRevenue === 'number' && (
                            <View style={styles.reportInfoRow}>
                                <Ionicons name="cash" size={16} color={COLORS.success} />
                                <Text style={styles.reportActualRevenueText}>
                                    Thực nhận: {(item.actualReceivedRevenue || 0).toLocaleString('vi-VN')} VNĐ
                                </Text>
                            </View>
                        )}
                        
                        {/* Thông tin người làm cùng */}
                        <View style={styles.reportInfoRow}>
                            <Ionicons name="people-outline" size={16} color={COLORS.secondary} />
                            <Text style={styles.reportInfoText}>
                                {participantText}
                            </Text>
                        </View>
                        
                        {/* Ghi chú */}
                        {item.note ? (
                            <View style={styles.reportInfoRow}>
                                <Ionicons name="document-text-outline" size={16} color={COLORS.secondary} />
                                <Text style={styles.reportInfoText} numberOfLines={1}>
                                    {item.note}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        );
    };

    return (
        <View style={styles.container}>
             <Modal transparent={true} animationType="fade" visible={isDatePickerVisible} onRequestClose={() => setDatePickerVisible(false)}>
                 <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
                     <View style={styles.datePickerBackdrop}>
                         <TouchableWithoutFeedback>
                             {/* Fix: Modal.children.only error here - ensure single child */}
                             <View style={styles.datePickerContent}>
                                <Calendar
                                    current={getSelectedDateString()}
                                    onDayPress={onDayPress}
                                    markedDates={{
                                        [getSelectedDateString()]: {
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
            <View style={styles.header}>
            <TouchableOpacity onPress={handleBackButtonPress} style={styles.backButton}>
                <Ionicons name="arrow-back-outline" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerLabel}>{userRole === 'admin' && authUser?.uid !== employeeId ? 'Thống kê nhân viên:' : 'Thống kê:'}</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>{employeeName || 'Nhân viên'}</Text>
            </View>
            <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                 <View style={styles.subHeader}>
                     <TouchableOpacity style={styles.titleTouchable} onPress={() => setDatePickerVisible(true)}>
                        <Text style={styles.subHeaderTitle}>
                            {loading ? 'Đang tải...' : (getDynamicTitle(selectedPeriod, selectedDate) || 'Tổng quan')}
                        </Text>
                        <Ionicons name="calendar-outline" size={22} color={COLORS.secondary} style={{ marginLeft: 8 }}/>
                    </TouchableOpacity>
                </View>
                 <TimeFilterSegment activeFilter={selectedPeriod} onFilterChange={setSelectedPeriod} style={styles.timeFilterSegmentMargin} />
                 {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                 ) : (
                     <>
                        <SummaryCard
                            title="Tổng doanh thu cá nhân"
                            totalRevenue={summaryData.totalRevenue}
                            totalReports={summaryData.totalReports}
                        />

                        {userRole === 'admin' && auth.currentUser?.uid !== employeeId && (
                            <SummaryCard
                                title="Doanh thu thực nhận"
                                value={`${actualRevenue.toLocaleString('vi-VN')} VNĐ`}
                                description="Dự kiến hoa hồng + thưởng ngoài giờ"
                                type="actualRevenue"
                            />
                        )}

                        <StatsChart data={chartData} title="Biểu đồ doanh thu theo cá nhân" />
                        <ServicePieChart data={pieChartData} title="Tỷ lệ dịch vụ theo cá nhân" />

                        {reports.length > 0 && (
                            <View style={styles.reportsListSection}>
                                <Text style={styles.reportsListTitle}>Danh sách báo cáo trong kỳ</Text>
                                <FlatList
                                    data={reports}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderReportItem}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={styles.reportSeparator} />}
                                    ListEmptyComponent={() => (
                                        <View style={styles.emptyReportsContainer}>
                                            <Text style={styles.emptyReportsText}>Không có báo cáo nào trong kỳ này.</Text>
                                        </View>
                                    )}
                                />
                            </View>
                        )}
                     </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightGray, },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', },
    backButton: { padding: 5, width: 40, },
    headerTitleContainer: { alignItems: 'center', flex: 1, marginHorizontal: 10, },
    headerLabel: { fontSize: 14, color: COLORS.secondary, },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, },
    scrollContent: { paddingBottom: 20, },
    subHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, },
    timeFilterSegmentMargin: { marginBottom: 15 },
    titleTouchable: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', },
    subHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.secondary, },
    loadingContainer: { height: 400, justifyContent: 'center', alignItems: 'center', },
    datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, },
    datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },

    reportsListSection: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        paddingTop: 0,
    },
    reportsListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    reportItemContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 15,
    },
    reportItemImage: {
        width: 90,
        height: 90,
        borderRadius: 10,
        backgroundColor: COLORS.lightGray,
    },
    reportStatusIconOnImage: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 13,
        padding: 1,
    },
    reportItemContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    reportItemHeaderInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    reportServiceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black,
        flex: 1,
        marginRight: 5,
    },
    reportPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    reportPriceText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.danger,
    },
    reportOvertimeText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    reportActualRevenueText: {
        fontSize: 13,
        color: COLORS.success,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    reportInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    reportInfoText: {
        marginLeft: 8,
        fontSize: 13,
        color: COLORS.secondary,
        flexShrink: 1,
    },
    reportStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 15,
        backgroundColor: COLORS.lightGray,
    },
    reportStatusText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    reportSeparator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 0,
    },
    emptyReportsContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyReportsText: {
        fontSize: 15,
        color: COLORS.secondary,
    }
});

export default EmployeeStatisticsScreen;