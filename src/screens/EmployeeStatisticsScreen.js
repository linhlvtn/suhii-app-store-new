// src/screens/EmployeeStatisticsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform, FlatList, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
// import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/vi'; // Import tiếng Việt
moment.locale('vi');

// Import các component thống kê
import SummaryCard from '../screens/Statistics/components/SummaryCard';
import TimeFilterSegment from '../screens/Statistics/components/TimeFilterSegment';
import StatsChart from '../screens/Statistics/components/StatsChart';
import ServicePieChart from '../screens/Statistics/components/ServicePieChart';
import RankItem from '../screens/Statistics/components/RankItem';
import LoadingOverlay from '../components/LoadingOverlay'; // <-- Đảm bảo import LoadingOverlay

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
    let startDate, endDate;

    if (period === 'custom' && customDate) {
        startDate = new Date(customDate);
        endDate = new Date(customDate);
    } else {
        switch (period) {
            case 'today':
                startDate = new Date(now);
                endDate = new Date(now);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lấy thứ Hai đầu tuần
                startDate = new Date(now.setDate(diff));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Kết thúc Chủ Nhật
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Ngày cuối cùng của tháng hiện tại
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31); // Ngày cuối cùng của năm hiện tại
                break;
            default: // Mặc định là hôm nay nếu không nhận dạng được period
                startDate = new Date(now);
                endDate = new Date(now);
        }
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
};

const getDynamicTitle = (period, date) => {
    const now = new Date();
    const titleText = (() => {
        if (period === 'custom' && date) {
            return `Ngày ${date.toLocaleDateString('vi-VN')}`;
        }
        switch (period) {
            case 'today':
                return `Hôm nay, ${now.toLocaleDateString('vi-VN')}`;
            case 'week': {
                const startOfWeek = getDateRange('week').startDate.toDate();
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                return `Tuần này (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1})`;
            }
            case 'month':
                return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
            case 'year':
                return `Năm ${now.getFullYear()}`;
            default:
                return 'Tổng quan';
        }
    })();
    return titleText;
};

const getFormattedDateKey = (date, period) => {
    switch (period) {
        case 'today':
        case 'custom':
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        case 'week':
            return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
        case 'month':
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        case 'year':
            return date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
        default:
            return date.toLocaleDateString('vi-VN');
    }
};

const initializeDailyData = (startDate, endDate, period) => {
    const data = {};
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    if (period === 'today' || period === 'custom') {
        for (let i = 0; i < 24; i++) {
            let hourDate = new Date(startDate);
            hourDate.setHours(i, 0, 0, 0);
            data[getFormattedDateKey(hourDate, 'today')] = 0;
        }
    } else if (period === 'week') {
        for (let i = 0; i < 7; i++) {
            let dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + i);
            data[getFormattedDateKey(dayDate, 'week')] = 0;
        }
    } else if (period === 'month') {
        while (currentDate.getMonth() === startDate.getMonth() && currentDate <= endDate) {
            data[getFormattedDateKey(currentDate, 'month')] = 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else if (period === 'year') {
        for (let i = 0; i < 12; i++) {
            let monthDate = new Date(startDate.getFullYear(), i, 1);
            data[getFormattedDateKey(monthDate, 'year')] = 0;
        }
    }
    return data;
};


const EmployeeStatisticsScreen = () => {
    const { userRole, user: authUser, users } = useAuth(); 
    const navigation = useNavigation();
    const route = useRoute();
    
    const employeeId = route.params?.employeeId || authUser?.uid;
    const employeeName = route.params?.employeeName || (authUser?.displayName || authUser?.email?.split('@')[0]) || 'Của tôi';

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const [totalRevenue, setTotalRevenue] = useState(0);
    const [actualRevenue, setActualRevenue] = useState(0);
    const [summaryData, setSummaryData] = useState({ totalRevenue: 0, totalReports: 0 });
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [pieChartData, setPieChartData] = useState([]);
    const [employeeRankings, setEmployeeRankings] = useState([]);
    const [personalChartData, setPersonalChartData] = useState({ labels: [], datasets: [{ data: [] }] });


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
                orderBy("createdAt", "asc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() }));

            let currentTotalRevenue = 0;
            let currentCalculatedActualRevenue = 0;
            const dailyRevenueForChart = initializeDailyData(startDate.toDate(), endDate.toDate(), selectedPeriod);
            const serviceCounts = {};

            const currentUsers = users || []; 
            const employeeRevenueMap = new Map(currentUsers.map(u => [u.id, { total: 0, personal: 0, shared: 0, commission: 0, name: u.displayName || u.email.split('@')[0] }]));

            fetchedReports.forEach(report => {
                const numParticipants = (report.participantIds && Array.isArray(report.participantIds) && report.participantIds.length > 0) ? report.participantIds.length : 1;
                const reportPrice = report.price || 0;

                const commissionRate = report.commissionRate !== undefined ? report.commissionRate : 0.10; 
                const overtimeRate = report.overtimeRate !== undefined ? report.overtimeRate : 0.30;   

                let revenuePerThisEmployeeActual = 0;
                if (report.status === 'approved') {
                    // ĐÃ SỬA: Khai báo personalShareAmount ở đây để nó có sẵn
                    const personalShareAmount = reportPrice / numParticipants; 

                    if (report.isOvertime) {
                        if (report.userId === employeeId || report.partnerId === employeeId) {
                            revenuePerThisEmployeeActual = reportPrice * overtimeRate;
                        }
                    } else {
                        if (report.userId === employeeId || report.partnerId === employeeId) {
                            revenuePerThisEmployeeActual = personalShareAmount * commissionRate; 
                        }
                    }
                    currentCalculatedActualRevenue += revenuePerThisEmployeeActual; 

                    const personalRevenueShare = (report.userId === employeeId || report.partnerId === employeeId) ? reportPrice / numParticipants : 0;
                    currentTotalRevenue += personalRevenueShare; 

                    const dateKey = getFormattedDateKey(report.createdAt, selectedPeriod);
                    if (dailyRevenueForChart[dateKey] !== undefined) {
                        dailyRevenueForChart[dateKey] += personalRevenueShare / 1000000;
                    }

                    if (report.service) {
                        report.service.split(', ').forEach(service => {
                            const s = service.trim();
                            serviceCounts[s] = (serviceCounts[s] || 0) + 1;
                        });
                    }
                }

                if (report.participantIds) {
                    report.participantIds.forEach(participantId => {
                        const employeeStats = employeeRevenueMap.get(participantId);
                        if (employeeStats) {
                            const numReportParticipants = (report.participantIds && Array.isArray(report.participantIds) && report.participantIds.length > 0) ? report.participantIds.length : 1; 
                            const pricePerParticipant = (report.price || 0) / numReportParticipants;

                            employeeStats.total += (report.price || 0); 
                            if (numReportParticipants > 1) {
                                employeeStats.shared += pricePerParticipant;
                            } else {
                                employeeStats.personal += pricePerParticipant;
                            }
                            employeeStats.commission += pricePerParticipant * (report.isOvertime ? overtimeRate : commissionRate); 
                            employeeRevenueMap.set(participantId, employeeStats);
                        }
                    });
                }
            });

            setReports(fetchedReports);
            setSummaryData({
                totalRevenue: currentTotalRevenue || 0,
                totalReports: fetchedReports.filter(r => r.status === 'approved').length || 0,
            });
            setActualRevenue(currentCalculatedActualRevenue || 0); 
            setChartData({
                labels: Object.keys(dailyRevenueForChart),
                datasets: [{ data: Object.values(dailyRevenueForChart) }],
            });
            setPersonalChartData({
                labels: Object.keys(dailyRevenueForChart),
                datasets: [{ data: Object.values(dailyRevenueForChart) }]
            });

            const pieColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
            setPieChartData(Object.keys(serviceCounts).map((service, index) => ({
                name: service,
                population: serviceCounts[service] || 0,
                color: pieColors[index % pieColors.length],
                legendFontColor: COLORS.secondary,
                legendFontSize: 15,
            })));

            const sortedEmployeeRankings = Array.from(employeeRevenueMap.values())
                .sort((a, b) => b.commission - a.commission); 
            setEmployeeRankings(sortedEmployeeRankings);

        } catch (error) {
            console.error("Lỗi khi tải hóa đơn thống kê cá nhân:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu thống kê cá nhân.");
        } finally {
            setLoading(false);
        }
    }, [employeeId, selectedPeriod, selectedDate, userRole, users, authUser]);


    useEffect(() => {
        if (authUser && (userRole === 'employee' || employeeId)) {
            fetchEmployeeStats();
        }
    }, [fetchEmployeeStats, authUser, employeeId, userRole]);

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
        const statusInfo = statusMap[item.status] || { icon: 'help-circle', color: COLORS.secondary };
        
        const participants = [];
        if (item.employeeName) participants.push(item.employeeName);
        if (item.partnerName) participants.push(item.partnerName);
        const participantText = participants.length > 0 ? participants.join(' & ') : 'N/A';

        let actualReceivedRevenueText = null;
        if (item.status === 'approved') { 
             const numParticipants = (item.participantIds && Array.isArray(item.participantIds) && item.participantIds.length > 0) ? item.participantIds.length : 1;
             const reportPrice = item.price || 0;
             let actualPerReport = 0;

             const commissionRate = item.commissionRate !== undefined ? item.commissionRate : 0.10; 
             const overtimeRate = item.overtimeRate !== undefined ? item.overtimeRate : 0.30;   

             if (item.userId === employeeId || item.partnerId === employeeId) {
                // ĐÃ SỬA: Khai báo personalShareAmount ở đây để nó có sẵn
                const personalShareAmount = reportPrice / numParticipants; 

                if (item.isOvertime) {
                    actualPerReport = reportPrice * overtimeRate;
                } else {
                    actualPerReport = personalShareAmount * commissionRate; // Sử dụng biến đã khai báo
                }
             }

             if (actualPerReport > 0) {
                actualReceivedRevenueText = actualPerReport.toLocaleString('vi-VN');
             }
        }

        const formattedCreationDate = item.createdAt ? item.createdAt.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) : 'Không rõ';

        const displayOvertimeRate = item.overtimeRate !== undefined ? (item.overtimeRate * 100).toFixed(0) : '30'; 

        return (
            <TouchableWithoutFeedback>
                <View style={styles.reportItemContainer}>
                    <View> 
                        <Image
                            source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/default-image.png')}
                            style={styles.reportItemImage}
                        />
                        <View style={styles.reportStatusIconOnImage}>
                            <Ionicons name={statusInfo.icon} size={26} color={statusInfo.color} />
                        </View>
                    </View>
                    
                    <View style={styles.reportItemContent}>
                        <View style={styles.reportItemHeaderInner}>
                            <Text style={styles.reportServiceText} numberOfLines={2}>
                                {item.service || 'Dịch vụ không xác định'}
                            </Text>
                            <Text style={styles.reportDateText}>{formattedCreationDate}</Text>
                        </View>
                        
                        <View style={styles.reportPriceContainer}>
                            <Text style={styles.reportPriceText}>
                                {(item.price || 0).toLocaleString('vi-VN')}₫
                            </Text>
                            {item.isOvertime && (
                                <Text style={styles.reportOvertimeText}>{`(+${displayOvertimeRate}%)`}</Text> 
                            )}
                        </View>
                        
                        {actualReceivedRevenueText ? (
                            <View style={styles.reportInfoRow}>
                                <Ionicons name="cash" size={16} color={COLORS.success} />
                                <Text style={styles.reportActualRevenueText}>
                                    {actualReceivedRevenueText}₫
                                </Text>
                            </View>
                        ) : null}
                        
                        <View style={styles.reportInfoRow}>
                            <Ionicons name="people-outline" size={16} color={COLORS.secondary} />
                            <Text style={styles.reportInfoText}>
                                {participantText}
                            </Text>
                        </View>
                        
                        {item.note && typeof item.note === 'string' && item.note.trim() !== '' && (
                            <View style={styles.reportInfoRow}>
                                <Ionicons name="document-text-outline" size={16} color={COLORS.secondary} />
                                <Text style={styles.reportInfoText} numberOfLines={1}>
                                    {item.note}
                                </Text>
                            </View>
                        )}
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
                            {loading ? 'Đang tải...' : getDynamicTitle(selectedPeriod, selectedDate)}
                        </Text>
                        <Ionicons name="calendar-outline" size={22} color={COLORS.secondary} style={{ marginLeft: 8 }}/>
                    </TouchableOpacity>
                </View>
                <TimeFilterSegment activeFilter={selectedPeriod} onFilterChange={setSelectedPeriod} style={styles.timeFilterSegmentMargin} />
                
                {/* Sử dụng LoadingOverlay */}
                <LoadingOverlay isVisible={loading} message="Đang tải dữ liệu..." />

                {/* Chỉ hiển thị nội dung khi không loading */}
                {!loading && (
                    <>
                        <View style={styles.summaryCardWrapper}>
                            <SummaryCard
                                title="Doanh thu cá nhân"
                                totalRevenue={summaryData.totalRevenue}
                                totalReports={summaryData.totalReports} 
                                isDailyReport={selectedPeriod === 'today' || selectedPeriod === 'custom'}
                                customCardWidth="100%"
                                chartData={personalChartData}
                            />
                        </View>

                        {userRole === 'admin' && (
                            <View style={styles.summaryCardWrapper}>
                                <SummaryCard
                                    title="Doanh thu thực nhận"
                                    value={`${actualRevenue.toLocaleString('vi-VN')}₫`}
                                    description="Dự kiến hoa hồng + thưởng ngoài giờ"
                                    type="actualRevenue"
                                    customCardWidth="100%"
                                    isDailyReport={selectedPeriod === 'today' || selectedPeriod === 'custom'}
                                    chartData={personalChartData}
                                />
                            </View>
                        )}

                        <StatsChart
                            data={chartData}
                            title="Biểu đồ doanh thu theo cá nhân"
                            style={styles.chartCardMargin}
                            chartType={selectedPeriod === 'today' || selectedPeriod === 'week' || selectedPeriod === 'custom' ? 'bar' : 'line'}
                        />
                        <ServicePieChart data={pieChartData} title="Tỷ lệ dịch vụ theo cá nhân" style={styles.chartCardMargin} />

                        {employeeRankings.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Xếp hạng nhân viên (theo hoa hồng)</Text>
                                {employeeRankings.map((employee, index) => (
                                    <TouchableOpacity key={employee.id || index} onPress={() => navigation.navigate('EmployeeStatistics', { employeeId: employee.id, employeeName: employee.name })}>
                                        <RankItem item={{name: employee.name, revenue: employee.commission, clients: 0}} index={index} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}


                        {reports.length > 0 ? (
                            <View style={styles.reportsListSection}>
                                <Text style={styles.reportsListTitle}>Danh sách hóa đơn trong kỳ</Text>
                                <FlatList
                                    data={reports}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderReportItem}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={styles.reportSeparator} />}
                                />
                            </View>
                        ) : (
                            <View style={styles.emptyReportsContainer}>
                                <Text style={styles.emptyReportsText}>Không có hóa đơn nào trong kỳ này.</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightGray },
    loadingContainer: { // Sẽ được quản lý bởi LoadingOverlay
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
    },
    lottie: { // Sẽ được quản lý bởi LoadingOverlay (hoặc xóa nếu không dùng lottie)
        width: 150,
        height: 150,
    },
    loadingText: { // Sẽ được quản lý bởi LoadingOverlay
        marginTop: 10,
        fontSize: 16,
        color: COLORS.gray,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.black,
        marginVertical: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        boxSizing: 'border-box',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 10,
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingTop: Platform.OS === 'android' ? 40 : 50, 
        paddingBottom: 15, 
        paddingHorizontal: 10, 
        backgroundColor: COLORS.white, 
        borderBottomWidth: 1, 
        borderBottomColor: '#e0e0e0' 
    },
    backButton: { padding: 5, width: 40 },
    headerTitleContainer: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
    headerLabel: { fontSize: 14, color: COLORS.secondary },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    scrollContent: { paddingBottom: 20 },
    subHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    timeFilterSegmentMargin: { marginHorizontal: 20, marginBottom: 15 },
    titleTouchable: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
    subHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.secondary },
    datePickerBackdrop: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        padding: 20 
    },
    datePickerContent: { 
        backgroundColor: COLORS.white, 
        borderRadius: 15, 
        padding: 5, 
        width: '100%', 
        maxWidth: 350, 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 4, 
        elevation: 5 
    },
    summaryCardWrapper: {
        marginHorizontal: 20,
        marginBottom: 10,
    },
    reportsListSection: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        paddingTop: 15,
    },
    reportsListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        paddingHorizontal: 15,
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
    reportDateText: {
        fontSize: 13,
        color: COLORS.secondary,
        fontWeight: '500',
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
    reportSeparator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 0,
    },
    emptyReportsContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginHorizontal: 20,
        marginTop: 30,
    },
    emptyReportsText: {
        fontSize: 15,
        color: COLORS.secondary,
    },
    chartCardMargin: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    lottieContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 350,
        backgroundColor: COLORS.lightGray,
    },
    lottieSpinner: {
        width: 150,
        height: 150,
    },
    loadingText: {
        marginTop: 0, 
        fontSize: 16,
        color: COLORS.secondary, 
    },
});

export default EmployeeStatisticsScreen;