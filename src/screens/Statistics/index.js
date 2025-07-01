// src/screens/Statistics/index.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform, Image } from 'react-native';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment'; // Import moment
import 'moment/locale/vi'; // Import tiếng Việt
moment.locale('vi');

import TimeFilterSegment from './components/TimeFilterSegment';
import SummaryCard from './components/SummaryCard';
import StatsChart from './components/StatsChart';
import RankItem from './components/RankItem';
import ServicePieChart from './components/ServicePieChart';
import LoadingOverlay from '../../components/LoadingOverlay'; // Ensure LoadingOverlay is imported
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { Colors } from 'react-native/Libraries/NewAppScreen';

LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay'
};
LocaleConfig.defaultLocale = 'vi';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    success: '#28a745',
    danger: '#D32F2F',
    black: '#1a1a1a',
};

// Cập nhật hàm getDateRange để nhận baseDate và tính toán linh hoạt
const getDateRange = (period, baseDate = null) => {
    const date = baseDate ? new Date(baseDate) : new Date(); // Sử dụng baseDate nếu có, nếu không thì dùng ngày hiện tại
    let startDate, endDate;

    switch (period) {
        case 'today':
        case 'custom':
            startDate = new Date(date);
            endDate = new Date(date);
            break;
        case 'week':
            // Lấy ngày đầu tuần (Thứ Hai) của tuần chứa baseDate
            const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Điều chỉnh để Thứ Hai là ngày đầu tuần
            startDate = new Date(date.setDate(diff));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Kết thúc Chủ Nhật
            break;
        case 'month':
            startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Ngày cuối cùng của tháng
            break;
        case 'year':
            startDate = new Date(date.getFullYear(), 0, 1);
            endDate = new Date(date.getFullYear(), 11, 31); // Ngày cuối cùng của năm
            break;
        default: // Mặc định là hôm nay
            startDate = new Date(); // Dùng ngày hiện tại nếu không rõ period
            endDate = new Date();
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
};

    // Cập nhật getDynamicTitle để hiển thị đúng theo period và customDate
    const getDynamicTitle = (period, date) => {
        const now = new Date();
        const titleText = (() => {
            if (period === 'custom' && date) {
                return `Ngày ${moment(date).format('DD/MM/YYYY')}`;
            }
            switch (period) {
                case 'today':
                    return `Hôm nay, ${moment(now).format('DD/MM/YYYY')}`;
                case 'week': {
                    const startOfWeek = getDateRange('week', date).startDate.toDate(); // Sử dụng 'date' làm baseDate
                    const endOfWeek = getDateRange('week', date).endDate.toDate();     // Sử dụng 'date' làm baseDate
                    return `Tuần (${moment(startOfWeek).format('DD/MM')} - ${moment(endOfWeek).format('DD/MM')})`;
                }
                case 'month':
                    return `Tháng ${moment(date).format('MM, YYYY')}`; // Sử dụng 'date' để lấy tháng và năm
                case 'year':
                    return `Năm ${moment(date).format('YYYY')}`;       // Sử dụng 'date' để lấy năm
                default:
                    return 'Tổng quan';
            }
        })();
        return titleText;
    };

const AdminStatisticsDashboard = () => {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState('today');
    const [loading, setLoading] = useState(true);
    const [dynamicTitle, setDynamicTitle] = useState('');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [customDate, setCustomDate] = useState(new Date()); // Sử dụng customDate làm baseDate cho việc lọc

    const [adminPersonalSummary, setAdminPersonalSummary] = useState({ totalRevenue: 0, totalReports: 0 });
    const [storeSummary, setStoreSummary] = useState({ totalRevenue: 0, revenueChange: 0, totalClients: 0, clientsChange: 0 });
    
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [clientChartData, setClientChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [personalChartData, setPersonalChartData] = useState({ labels: [], datasets: [{ data: [] }] });

    const [leaderboard, setLeaderboard] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);
    const navigation = useNavigation();

    // Memoize components để tránh re-render không cần thiết
    const HeaderLogo = useMemo(() => (
        <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
    ), []);

    const HeaderLogoutButton = useMemo(() => {
        const handleSignOut = () => { 
            Alert.alert(
                "Xác nhận Đăng xuất", 
                "Bạn có chắc muốn đăng xuất?", 
                [
                    { text: "Hủy" }, 
                    { text: "Đăng xuất", onPress: () => auth.signOut(), style: "destructive" }
                ]
            ); 
        };
        return (
            <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
                <Ionicons name="log-out-outline" size={28} color={COLORS.black} />
            </TouchableOpacity>
        );
    }, []);

    // Memoize formatted date key để tránh tính toán lại không cần thiết
    const getFormattedDateKey = useCallback((date, period) => {
        switch (period) {
            case 'today':
            case 'custom':
                return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            case 'week':
                return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
            case 'month':
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            case 'year':
                return date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
            default:
                return date.toLocaleDateString('vi-VN');
        }
    }, []);
    
    // Memoize initialize daily data để tránh tính toán lại
    const initializeDailyData = useCallback((startDate, endDate, period) => {
        const data = {};
        let currentDate = new Date(startDate);
        currentDate.setHours(0,0,0,0);

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
    }, [getFormattedDateKey]);

    // Hàm fetchStatisticsDataContent chỉ lấy và xử lý dữ liệu, không quản lý loading state
    const fetchStatisticsDataContent = useCallback(async (period, date) => {
        if (!user?.uid) return;

        const currentRange = getDateRange(period, date);
        const diff = currentRange.endDate.toDate().getTime() - currentRange.startDate.toDate().getTime();
        const prevEndDate = new Date(currentRange.startDate.toDate().getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - diff);
        const previousRange = { startDate: Timestamp.fromDate(prevStartDate), endDate: Timestamp.fromDate(prevEndDate) };

        const getReportsInRange = async (range, userId = null) => {
            try {
                let qRef = collection(db, "reports");
                let conditions = [
                    where("status", "==", "approved"), 
                    where("createdAt", ">=", range.startDate), 
                    where("createdAt", "<=", range.endDate)
                ];
                
                if (userId) {
                    conditions.push(where("participantIds", "array-contains", userId));
                }

                const q = query(qRef, ...conditions, orderBy("createdAt", "asc"));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(), 
                    createdAt: doc.data().createdAt.toDate() 
                }));
            } catch (e) {
                console.error("Lỗi khi lấy hóa đơn đã duyệt:", e);
                if (e.code === 'failed-precondition') {
                    Alert.alert(
                        "Lỗi Cấu Hình", 
                        "Cơ sở dữ liệu của bạn thiếu chỉ mục cần thiết. Vui lòng kiểm tra console Firebase để tạo chỉ mục cho: reports collection, status, createdAt, participantIds."
                    );
                }
                throw e; // Re-throw to be caught by the caller
            }
        };

        try {
            const [currentStoreReports, previousStoreReports] = await Promise.all([
                getReportsInRange(currentRange),
                getReportsInRange(previousRange)
            ]);

            const currentAdminReports = await getReportsInRange(currentRange, user.uid);

            processData(currentStoreReports, previousStoreReports, currentRange.startDate.toDate(), currentRange.endDate.toDate(), period);
            processAdminPersonalData(currentAdminReports);
            processAdminPersonalDataForChart(currentAdminReports, currentRange.startDate.toDate(), currentRange.endDate.toDate(), period);
            setDynamicTitle(getDynamicTitle(period, date)); // Cập nhật dynamicTitle ở đây
        } catch (error) {
            console.error("Lỗi fetchStatisticsDataContent:", error);
            throw error;
        }
    }, [user?.uid, initializeDailyData, processData, processAdminPersonalData, processAdminPersonalDataForChart]);

    // Hàm loadStats để quản lý trạng thái loading
    const loadStats = useCallback(async (period, date) => {
        setLoading(true);
        try {
            await fetchStatisticsDataContent(period, date);
        } catch (error) {
            // Lỗi đã được xử lý trong fetchStatisticsDataContent
        } finally {
            setLoading(false);
        }
    }, [fetchStatisticsDataContent]);


    // useFocusEffect để tải dữ liệu khi màn hình được focus
    useFocusEffect(useCallback(() => { 
        loadStats(activeFilter, customDate); 
    }, [loadStats, activeFilter, customDate])); // Thêm activeFilter và customDate vào dependencies

    // Hàm xử lý chọn ngày từ Calendar (cho chế độ 'day' và 'week')
    const onDayPress = useCallback((day) => { 
        setDatePickerVisible(false); // Đóng picker ngay lập tức
        const selectedMoment = moment(day.dateString);
        let newDate;

        if (activeFilter === 'week') {
            newDate = selectedMoment.startOf('isoWeek').toDate(); // Lấy Thứ Hai đầu tuần (ISO week starts on Monday)
        } else { // 'custom' hoặc 'today'
            newDate = selectedMoment.toDate();
        }
        setCustomDate(newDate); // Cập nhật customDate
        setActiveFilter('custom'); // Đặt lại về custom khi chọn ngày cụ thể
    }, [activeFilter]); // activeFilter là dependency vì nó ảnh hưởng đến logic

    // Hàm xử lý chọn tháng từ Picker
    const onMonthChange = useCallback((monthValue) => {
        setDatePickerVisible(false); // Đóng picker ngay lập tức
        const newDate = new Date(customDate.getFullYear(), monthValue - 1, 1); // Đặt về ngày 1 của tháng được chọn
        setCustomDate(newDate);
        // Không cần setActiveFilter('month') ở đây vì nó đã được đặt trước đó khi mở picker
    }, [customDate]); // customDate là dependency vì nó được dùng để lấy năm hiện tại

    // Hàm xử lý chọn năm từ Picker
    const onYearChange = useCallback((yearValue) => {
        setDatePickerVisible(false); // Đóng picker ngay lập tức
        const newDate = new Date(yearValue, customDate.getMonth(), 1); // Đặt về tháng hiện tại, ngày 1 của năm được chọn
        setCustomDate(newDate);
        // Không cần setActiveFilter('year') ở đây vì nó đã được đặt trước đó khi mở picker
    }, [customDate]); // customDate là dependency vì nó được dùng để lấy tháng hiện tại

    // Cập nhật handleFilterChange để reset customDate khi chuyển tab
    const handleFilterChange = useCallback((filter) => { 
        setActiveFilter(filter); 
        // Khi chuyển tab, đặt lại customDate về ngày hiện tại để phù hợp với chế độ lọc
        // Việc này cũng sẽ kích hoạt lại loadStats thông qua useEffect
        setCustomDate(new Date()); 
    }, []);

    // Tính toán minDate và maxDate cho Calendar (chỉ áp dụng cho chế độ 'custom'/'today')
    const today = moment().format('YYYY-MM-DD');
    const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');

    const years = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i); // Lấy 5 năm gần đây
    }, []);

    const processAdminPersonalData = useCallback((reports) => {
        let totalRevenue = 0;
        let totalReports = 0;
    
        reports.forEach(report => {
            if (report.status === 'approved') {
                const numParticipants = (report.participantIds && Array.isArray(report.participantIds) && report.participantIds.length > 0) ? report.participantIds.length : 1;
                const revenuePerThisAdmin = (report.userId === user?.uid || report.partnerId === user?.uid) ? (report.price || 0) / numParticipants : 0;
                
                totalRevenue += revenuePerThisAdmin;
                totalReports += 1;
            }
        });
        setAdminPersonalSummary({ totalRevenue, totalReports });
    }, [user?.uid]);

    const processAdminPersonalDataForChart = useCallback((reports, startDate, endDate, period) => {
        const dailyData = initializeDailyData(startDate, endDate, period);
    
        reports.forEach(report => {
            const numParticipants = (report.participantIds && Array.isArray(report.participantIds) && report.participantIds.length > 0) ? report.participantIds.length : 1;
            const revenuePerThisAdmin = (report.userId === user?.uid || report.partnerId === user?.uid) ? (report.price || 0) / numParticipants : 0;
    
            let dateKey = getFormattedDateKey(report.createdAt, period);
            if (dailyData[dateKey] !== undefined) {
                dailyData[dateKey] += revenuePerThisAdmin / 1000000;
            }
        });
    
        setPersonalChartData({
            labels: Object.keys(dailyData),
            datasets: [{ data: Object.values(dailyData) }]
        });
    }, [user?.uid, initializeDailyData, getFormattedDateKey]);

    const processData = useCallback((currentReports, previousReports, startDate, endDate, period) => {
        // Overall Store Statistics
        const currentStoreRevenue = currentReports.reduce((sum, report) => sum + (report.price || 0), 0);
        const currentStoreClients = new Set(currentReports.map(report => report.id)).size;
        const previousStoreRevenue = previousReports.reduce((sum, report) => sum + (report.price || 0), 0);
        const previousStoreClients = new Set(previousReports.map(report => report.id)).size;

        const revenueChange = previousStoreRevenue > 0 ? ((currentStoreRevenue - previousStoreRevenue) / previousStoreRevenue) * 100 : (currentStoreRevenue > 0 ? 100 : 0);
        const clientsChange = previousStoreClients > 0 ? ((currentStoreClients - previousStoreClients) / previousStoreClients) * 100 : (currentStoreClients > 0 ? 100 : 0);
        setStoreSummary({ 
            totalRevenue: currentStoreRevenue, 
            revenueChange: parseFloat(revenueChange.toFixed(1)), 
            totalClients: currentStoreClients, 
            clientsChange: parseFloat(clientsChange.toFixed(1)) 
        });
    
        // Chart Data (Daily Revenue for the store)
        const dailyRevenue = initializeDailyData(startDate, endDate, period);
        currentReports.forEach(report => {
            let dateKey = getFormattedDateKey(report.createdAt, period);
            if (dailyRevenue[dateKey] !== undefined) {
                dailyRevenue[dateKey] += (report.price || 0) / 1000000;
            }
        });
        setChartData({ labels: Object.keys(dailyRevenue), datasets: [{ data: Object.values(dailyRevenue) }] });

        // Client Chart Data
        const dailyClients = initializeDailyData(startDate, endDate, period);
        currentReports.forEach(report => {
            let dateKey = getFormattedDateKey(report.createdAt, period);
            if (dailyClients[dateKey] !== undefined) {
                dailyClients[dateKey] += 1;
            }
        });
        setClientChartData({ labels: Object.keys(dailyClients), datasets: [{ data: Object.values(dailyClients) }] });

        // Leaderboard (Employee Performance)
        const employeeData = currentReports.reduce((acc, report) => {
            const { employeeName, userId, price, partnerId, partnerName, participantIds } = report;
            const numParticipants = (participantIds && Array.isArray(participantIds) && participantIds.length > 0) ? participantIds.length : 1;
            const revenueShare = (price || 0) / numParticipants;

            // Kiểm tra và thêm userId vào acc
            if (userId) {
                if (!acc[userId]) acc[userId] = { id: userId, name: employeeName || 'Không rõ', revenue: 0, clients: 0 };
                acc[userId].revenue += revenueShare;
                acc[userId].clients += 1; // Clients based on reports this employee was involved in
            }
            // Kiểm tra và thêm partnerId vào acc (nếu khác userId)
            if (partnerId && partnerId !== userId) {
                if (!acc[partnerId]) acc[partnerId] = { id: partnerId, name: partnerName || 'Không rõ', revenue: 0, clients: 0 };
                acc[partnerId].revenue += revenueShare;
                // Client count for partner is not directly available from this report's structure
            }
            return acc;
        }, {});
        setLeaderboard(Array.from(Object.values(employeeData)).sort((a, b) => b.revenue - a.revenue));
    
        // Service Pie Chart Data
        const serviceCounts = currentReports.reduce((acc, report) => {
            const serviceNames = (report.service || 'Không xác định').split(',').map(s => s.trim());
            serviceNames.forEach(serviceName => { acc[serviceName] = (acc[serviceName] || 0) + 1; });
            return acc;
        }, {});
        const pieColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
        const pieData = Object.keys(serviceCounts).map((service, index) => ({
            name: service,
            population: serviceCounts[service],
            color: pieColors[index % pieColors.length],
            legendFontColor: COLORS.secondary,
            legendFontSize: 15
        }));
        setPieChartData(pieData);
    }, [initializeDailyData, getFormattedDateKey, user?.uid]); // Add user?.uid to processData dependencies


    
    const getSelectedDateString = useCallback(() => { 
        const year = customDate.getFullYear(); 
        const month = String(customDate.getMonth() + 1).padStart(2, '0'); 
        const day = String(customDate.getDate()).padStart(2, '0'); 
        return `${year}-${month}-${day}`; 
    }, [customDate]);
    
    const handleRankItemPress = useCallback((item) => { 
        navigation.navigate('EmployeeStatistics', { 
            employeeId: item.id, 
            employeeName: item.name 
        }); 
    }, [navigation]);

    // Memoize để tránh re-render các component con không cần thiết
    const isDailyReport = useMemo(() => 
        activeFilter === 'today' || activeFilter === 'custom', 
        [activeFilter]
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 100 }} />
                {HeaderLogo}
                <View style={styles.headerRightContainer}>
                    {HeaderLogoutButton}
                </View>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.subHeader}>
                    <Text style={styles.headerLabel}>Tổng quan</Text>
                    <TouchableOpacity style={styles.titleTouchable} onPress={() => setDatePickerVisible(true)}>
                        <Text style={styles.headerTitle}>
                            {loading ? 'Đang tải...' : (dynamicTitle || 'Tổng quan')}
                        </Text>
                        <Ionicons name="calendar-outline" size={24} color={COLORS.primary} style={{ marginLeft: 8 }}/>
                    </TouchableOpacity>
                </View>
                <TimeFilterSegment activeFilter={activeFilter} onFilterChange={handleFilterChange} />
                {/* Sử dụng LoadingOverlay */}
                <LoadingOverlay isVisible={loading} message="Đang tải dữ liệu..." />

                {/* Chỉ hiển thị nội dung khi không loading */}
                {!loading && (
                    <>
                        {/* Thẻ thống kê tổng quát của CỬA HÀNG */}
                        <Text style={styles.sectionHeading}>Thống kê tổng cửa hàng</Text>
                        <View style={styles.summaryCardsRow}>
                            <SummaryCard
                                title="Tổng Doanh thu"
                                totalRevenue={storeSummary.totalRevenue}
                                change={storeSummary.revenueChange}
                                type="storeSummary"
                                chartData={chartData}
                                isDailyReport={isDailyReport}
                            />
                            <SummaryCard
                                title="Tổng Lượt khách"
                                value={storeSummary.totalClients.toString()}
                                change={storeSummary.clientsChange}
                                icon="people-outline"
                                color="#3498db"
                                type="storeClients"
                                chartData={clientChartData}
                                isDailyReport={isDailyReport}
                            />
                        </View>

                        {/* Biểu đồ Doanh thu của CỬA HÀNG (StatsChart lớn) */}
                        <StatsChart
                            data={chartData}
                            title="Biểu đồ Doanh thu toàn cửa hàng" // Đổi VNĐ sang ₫
                            style={styles.chartCard}
                            // Truyền chartType dựa trên activeFilter
                            chartType={activeFilter === 'today' || activeFilter === 'week' || activeFilter === 'custom' ? 'bar' : 'line'}
                        />
                        <ServicePieChart 
                            data={pieChartData} 
                            title="Tỉ lệ Dịch vụ toàn cửa hàng" 
                            style={styles.chartCard} 
                        />

                        {/* Thẻ thống kê CÁ NHÂN CỦA ADMIN */}
                        {adminPersonalSummary.totalReports > 0 && (
                            <>
                                <Text style={styles.sectionHeading}>Thống kê cá nhân của Admin</Text>
                                <View style={styles.summaryCardsRow}>
                                    <SummaryCard
                                        title="Doanh thu cá nhân của bạn"
                                        totalRevenue={adminPersonalSummary.totalRevenue}
                                        totalReports={adminPersonalSummary.totalReports}
                                        chartData={personalChartData}
                                        isDailyReport={isDailyReport}
                                        customCardWidth="100%"
                                    />
                                </View>
                            </>
                        )}

                        <View style={styles.leaderboardContainer}>
                            <Text style={styles.sectionTitle}>Hiệu suất Nhân viên</Text>
                            {leaderboard && leaderboard.length > 0 ? (
                                leaderboard.map((item, index) => (
                                    <TouchableOpacity key={item.id || index} onPress={() => handleRankItemPress(item)}>
                                        <RankItem item={item} index={index} />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <Text style={styles.noDataText}>Không có dữ liệu nhân viên.</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
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
                                {activeFilter === 'custom' || activeFilter === 'today' || activeFilter === 'week' ? (
                                    <Calendar
                                        current={moment(customDate).format('YYYY-MM-DD')} // Luôn hiển thị tháng của customDate
                                        onDayPress={onDayPress}
                                        markedDates={{
                                            [moment(customDate).format('YYYY-MM-DD')]: { // Đánh dấu ngày được chọn
                                                selected: true,
                                                disableTouchEvent: true,
                                                selectedColor: COLORS.primary
                                            }
                                        }}
                                        minDate={activeFilter === 'custom' || activeFilter === 'today' ? thirtyDaysAgo : undefined} // Chỉ giới hạn ngày cho chế độ ngày
                                        maxDate={activeFilter === 'custom' || activeFilter === 'today' ? today : undefined}      // Chỉ giới hạn ngày cho chế độ ngày
                                    />
                                ) : activeFilter === 'month' ? (
                                    <View>
                                        <Text style={styles.pickerTitle}>Chọn tháng</Text>
                                        <Picker
                                            selectedValue={customDate.getMonth() + 1} // Month is 0-indexed in JS Date
                                            onValueChange={(itemValue) => onMonthChange(itemValue)}
                                            style={styles.picker}
                                            itemStyle={styles.pickerItem}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                                <Picker.Item key={month} label={`Tháng ${month}`} value={month} />
                                            ))}
                                        </Picker>
                                    </View>
                                ) : activeFilter === 'year' ? (
                                    <View>
                                        <Text style={styles.pickerTitle}>Chọn năm</Text>
                                        <Picker
                                            selectedValue={customDate.getFullYear()}
                                            onValueChange={(itemValue) => onYearChange(itemValue)}
                                            style={styles.picker}
                                            itemStyle={styles.pickerItem}
                                        >
                                            {years.map((year) => (
                                                <Picker.Item key={year} label={`Năm ${year}`} value={year} />
                                            ))}
                                        </Picker>
                                    </View>
                                ) : null}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const StatisticsScreen = () => {
    const { user, userRole, initializing } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
        if (!initializing && userRole === 'employee' && user) {
            navigation.replace('EmployeeStatistics', {
                employeeId: user.uid,
                employeeName: user.displayName || user.email.split('@')[0],
            });
        }
    }, [initializing, userRole, user, navigation]);

    if (initializing || userRole === 'employee') {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }
    
    if (userRole === 'admin') {
        return <AdminStatisticsDashboard />;
    }

    return (
        <View style={styles.container}>
            <Text>Vai trò người dùng không hợp lệ.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightGray, },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 10, paddingHorizontal: 15, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#e9ecef', },
    headerLogo: { width: 100, height: 40, },
    headerRightContainer: { flexDirection: 'row', alignItems: 'center', width: 100, justifyContent: 'flex-end', },
    headerButton: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', },
    scrollView: { flex: 1, },
    scrollContent: { paddingBottom: 120, },
    subHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, },
    headerLabel: { fontSize: 18, color: COLORS.secondary, marginBottom: 4, },
    titleTouchable: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, },
    
    // Style mới cho hàng chứa 2 SummaryCard
    summaryCardsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20, // Khoảng cách lề đồng nhất
        marginBottom: 0,
        // Đảm bảo không có margin Horizontal bên trong SummaryCard
    },

    leaderboardContainer: {
        marginTop: 25, // Giảm khoảng cách để đồng nhất
        marginHorizontal: 20, // Khoảng cách lề đồng nhất
        backgroundColor: COLORS.white, // Thêm nền trắng cho leaderboard
        borderRadius: 12, // Bo góc cho leaderboard
        paddingVertical: 15, // Padding bên trong
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        paddingHorizontal: 15, // Đảm bảo padding cho title bên trong leaderboardContainer
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 15,
        marginBottom: 15,
        paddingHorizontal: 20 // Khoảng cách lề đồng nhất
    },
    noDataContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginHorizontal: 20, // Giữ lại nếu muốn noDataContainer có lề riêng
    },
    noDataText: { color: COLORS.secondary, },
    datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, },
    datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    
    // Style cho StatsChart và ServicePieChart để đồng nhất lề
    chartCard: {
        marginHorizontal: 20, // Khoảng cách lề đồng nhất
        marginBottom: 15,
    },

    lottieContainer: { // Style mới cho container của lottie
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 350, // Chiều cao cố định để lottie hiển thị tốt trong không gian loading
        backgroundColor: COLORS.lightGray,
    },
    lottieSpinner: { // Style cho animation lottie
        width: 150,
        height: 150,
    },
    loadingText: { // Style cho text loading
        marginTop: 0,
        fontSize: 16,
        color: COLORS.secondary,
    },
    pickerTitle: { // Style cho tiêu đề của picker
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    picker: { // Style cho picker container
        width: '100%',
        height: 200, 
    },
    pickerItem: { // Style cho từng item trong picker
        fontSize: 16,
        height: 200,
        color: Colors.black, 
    },
});

export default StatisticsScreen;