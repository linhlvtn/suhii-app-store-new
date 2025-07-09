// src/screens/EmployeeStatisticsScreen.js

import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform, FlatList, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import TimeFilterSegment from './Statistics/components/TimeFilterSegment';
import SummaryCard from './Statistics/components/SummaryCard';
import StatsChart from './Statistics/components/StatsChart';
import ServicePieChart from './Statistics/components/ServicePieChart';

import moment from 'moment';
import 'moment/locale/vi'; 
moment.locale('vi');

LocaleConfig.locales['vi'] = { monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'], dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'], dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'], today: 'Hôm nay' };
LocaleConfig.defaultLocale = 'vi';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    success: '#28a745',
    danger: '#D32F2F',
    black: '#1a1a1a',
    pending: '#f39c12',
    approved: '#28a745',
    rejected: '#D32F2F',
};

const getDateRange = (period, baseDate = null) => { 
    const date = baseDate ? new Date(baseDate) : new Date(); 
    let startDate, endDate;

    switch (period) {
        case 'today':
        case 'custom':
            startDate = new Date(date);
            endDate = new Date(date);
            break;
        case 'week':
            const dayOfWeek = date.getDay(); 
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
            startDate = new Date(date.setDate(diff));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); 
            break;
        case 'month':
            startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); 
            break;
        case 'year':
            startDate = new Date(date.getFullYear(), 0, 1);
            endDate = new Date(date.getFullYear(), 11, 31); 
            break;
        default: 
            startDate = new Date(date);
            endDate = new Date(date);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
};

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
                const startOfWeek = getDateRange('week', date).startDate.toDate(); 
                const endOfWeek = getDateRange('week', date).endDate.toDate(); 
                return `Tuần (${moment(startOfWeek).format('DD/MM')} - ${moment(endOfWeek).format('DD/MM')})`;
            }
            case 'month':
                return `Tháng ${moment(date).format('MM,YYYY')}`; 
            case 'year':
                return `Năm ${moment(date).format('YYYY')}`; 
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
        let loopDate = new Date(currentDate);
        while (loopDate.getMonth() === currentDate.getMonth() && loopDate <= endDate) {
            data[getFormattedDateKey(loopDate, 'month')] = 0;
            loopDate.setDate(loopDate.getDate() + 1);
        }
    } else if (period === 'year') {
        for (let i = 0; i < 12; i++) {
            let monthDate = new Date(currentDate.getFullYear(), i, 1);
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
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // totalRevenue và totalReports nằm trong summaryData, không phải state riêng
    const [actualRevenue, setActualRevenue] = useState(0);
    const [summaryData, setSummaryData] = useState({ totalRevenue: 0, totalReports: 0 }); 

    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [pieChartData, setPieChartData] = useState([]);
    const [employeeRankings, setEmployeeRankings] = useState([]); // Giữ lại nếu có thể dùng cho tương lai
    const [personalChartData, setPersonalChartData] = useState({ labels: [], datasets: [{ data: [] }] });


    const handleBackButtonPress = () => {
        if (userRole === 'admin' && route.params?.employeeId) {
            navigation.goBack();
        } else {
            navigation.navigate('MainTabs', { screen: 'Trang chủ' });
        }
    };

    const fetchEmployeeStatsData = useCallback(async (period, date) => {
        if (!employeeId) {
            console.warn("Employee ID not found, skipping data fetch.");
            return;
        }

        const { startDate, endDate } = getDateRange(period, date);

        try {
            const q = query(
                collection(db, "reports"),
                where("participantIds", "array-contains", employeeId),
                where("createdAt", ">=", startDate),
                where("createdAt", "<=", endDate),
                orderBy("createdAt", "asc")
            );
            
            const timeoutPromise = new Promise((resolve, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error("Firebase query timed out after 15 seconds. This might indicate a missing index or a very large dataset."));
                }, 15000); 
            });

            const querySnapshot = await Promise.race([
                getDocs(q),
                timeoutPromise
            ]);

            if (!querySnapshot || !querySnapshot.docs) {
                console.error("Invalid querySnapshot received or timeout occurred:", querySnapshot);
                throw new Error("Invalid data received from Firebase query or query timed out.");
            }

            const fetchedReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() }));

            if (!Array.isArray(fetchedReports)) {
                console.error("fetchedReports is not an array:", fetchedReports);
                throw new Error("Fetched reports data is corrupted: not an array.");
            }

            let currentTotalRevenue = 0;
            let currentCalculatedActualRevenue = 0;
            const dailyRevenueForChart = initializeDailyData(startDate.toDate(), endDate.toDate(), period); 
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

                    const dateKey = getFormattedDateKey(report.createdAt, period); 
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
            console.error("Lỗi khi tải hóa đơn thống kê cá nhân (trong fetchEmployeeStatsData):", error);
            Alert.alert("Lỗi", `Không thể tải dữ liệu thống kê cá nhân: ${error.message || error}`);
            throw error; 
        } finally {
            setLoading(false);
        }
    }, [employeeId, users]); 

    const loadStats = useCallback(async (period, date) => {
        setLoading(true);
        try {
            await fetchEmployeeStatsData(period, date);
        } catch (error) {
            console.error("loadStats: Error during data loading:", error);
        } finally {
            setLoading(false);
        }
    }, [fetchEmployeeStatsData]);

    useEffect(() => {
        if (authUser && (userRole === 'employee' || employeeId)) {
            loadStats(selectedPeriod, selectedDate);
        }
    }, [loadStats, authUser, employeeId, userRole, selectedPeriod, selectedDate]); 

    const onDayPress = (day) => {
        setDatePickerVisible(false); 
        const selectedMoment = moment(day.dateString);
        let newDate;

        if (selectedPeriod === 'week') {
            newDate = selectedMoment.startOf('isoWeek').toDate(); 
        } else { 
            newDate = selectedMoment.toDate();
        }
        setSelectedDate(newDate);
    };

    const onMonthChange = (monthValue) => {
        setDatePickerVisible(false); 
        const newDate = new Date(selectedDate.getFullYear(), monthValue - 1, 1); 
        setSelectedDate(newDate);
    };

    const onYearChange = (yearValue) => {
        setDatePickerVisible(false); 
        const newDate = new Date(yearValue, selectedDate.getMonth(), 1); 
        setSelectedDate(newDate);
    };

    const handleFilterChange = useCallback((period) => {
        setSelectedPeriod(period);
        if (period !== 'custom') {
            setSelectedDate(new Date()); 
        }
    }, []);

    const getSelectedDateString = () => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayMoment = useMemo(() => moment(), []); // <-- Đã thêm định nghĩa todayMoment
    const minDateForCalendar = useMemo(() => todayMoment.clone().subtract(30, 'days').format('YYYY-MM-DD'), [todayMoment]); // <-- Đã sửa
    const maxDateForCalendar = useMemo(() => todayMoment.format('YYYY-MM-DD'), [todayMoment]); // <-- Đã sửa

    const years = useMemo(() => { 
        return Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    }, []);

    const renderReportItem = useCallback(({ item }) => {
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
                 const personalShareAmount = reportPrice / numParticipants; 

                 if (item.isOvertime) {
                     actualPerReport = reportPrice * overtimeRate;
                 } else {
                     actualPerReport = personalShareAmount * commissionRate; 
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
                            <Ionicons name={statusInfo.icon} size={13} color={statusInfo.color} />
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
                        
                        {actualReceivedRevenueText && userRole === 'admin' ? (
                            <View style={styles.reportInfoRow}>
                                <Ionicons name="cash" size={16} color={COLORS.success} />
                                <Text style={styles.reportActualRevenueText}>
                                    {actualReceivedRevenueText}
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
    }, [employeeId, userRole]); 

    return (
        <View style={styles.container}>
            <Modal transparent={true} animationType="fade" visible={isDatePickerVisible} onRequestClose={() => setDatePickerVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
                    <View style={styles.datePickerBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.datePickerContent}>
                                {selectedPeriod === 'custom' || selectedPeriod === 'today' || selectedPeriod === 'week' ? (
                                    <Calendar
                                        current={moment(selectedDate).format('YYYY-MM-DD')} 
                                        onDayPress={onDayPress}
                                        markedDates={{
                                            [moment(selectedDate).format('YYYY-MM-DD')]: { 
                                                selected: true,
                                                disableTouchEvent: true,
                                                selectedColor: COLORS.primary
                                            }
                                        }}
                                        minDate={minDateForCalendar} 
                                        maxDate={maxDateForCalendar} 
                                    />
                                ) : selectedPeriod === 'month' ? (
                                    <View>
                                        <Text style={styles.pickerTitle}>Chọn tháng</Text>
                                        <Picker
                                            selectedValue={selectedDate.getMonth() + 1} 
                                            onValueChange={(itemValue) => onMonthChange(itemValue)}
                                            style={styles.picker}
                                            itemStyle={styles.pickerItem}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                                <Picker.Item key={month} label={`Tháng ${month}`} value={month} />
                                            ))}
                                        </Picker>
                                    </View>
                                ) : selectedPeriod === 'year' ? (
                                    <View>
                                        <Text style={styles.pickerTitle}>Chọn năm</Text>
                                        <Picker
                                            selectedValue={selectedDate.getFullYear()}
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
                <TimeFilterSegment 
                    activeFilter={selectedPeriod} 
                    onFilterChange={handleFilterChange} 
                    loading={loading}
                />
                
                {loading ? (
                    <View style={styles.simpleLoadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.simpleLoadingText}>Đang tải dữ liệu...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.summaryCardWrapper}>
                            <SummaryCard
                                title="Doanh thu cá nhân"
                                totalRevenue={summaryData.totalRevenue}
                                totalReports={summaryData.totalReports} 
                                type="employeeSummary"
                            />
                        </View>

                        {userRole === 'admin' && (
                            <View style={styles.summaryCardWrapper}>
                                <SummaryCard
                                    title="Doanh thu thực nhận"
                                    value={`${actualRevenue.toLocaleString('vi-VN')}₫`}
                                    description="Dự kiến hoa hồng + thưởng ngoài giờ"
                                    type="actualRevenue"
                                />
                            </View>
                        )}

                        {/* ẨN BIỂU ĐỒ DOANH THU NẾU LÀ NGÀY HOẶC TUẦN */}
                        {(selectedPeriod === 'month' || selectedPeriod === 'year') && (
                            <StatsChart
                                data={personalChartData}
                                title="Biểu đồ Doanh thu cá nhân"
                                style={styles.chartCardMargin}
                                chartType={selectedPeriod === 'month' || selectedPeriod === 'year' ? 'line' : 'bar'}
                            />
                        )}

                        <ServicePieChart 
                            data={pieChartData}
                            title="Tỷ lệ Dịch vụ đã thực hiện"
                            style={styles.chartCardMargin}
                        />

                        {reports.length > 0 ? (
                            <View style={styles.reportsListSection}>
                                <Text style={styles.reportsListTitle}>Danh sách hóa đơn trong kỳ</Text>
                                <FlatList
                                    data={reports}
                                    keyExtractor={item => item.id}
                                    renderItem={renderReportItem}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={styles.reportSeparator} />}
                                    initialNumToRender={10} 
                                    maxToRenderPerBatch={5} 
                                    updateCellsBatchingPeriod={100} 
                                    removeClippedSubviews={true} 
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
    simpleLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 200, 
        marginTop: 50,
    },
    simpleLoadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.secondary,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    picker: {
        width: '100%',
        height: 200, 
    },
    pickerItem: {
        fontSize: 16,
        height: 200, 
        color: COLORS.black,
    },
});

export default EmployeeStatisticsScreen;