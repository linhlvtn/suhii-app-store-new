// src/screens/EmployeeStatisticsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

import TimeFilterSegment from './Statistics/components/TimeFilterSegment';
import SummaryCard from './Statistics/components/SummaryCard';
import StatsChart from './Statistics/components/StatsChart';
import ServicePieChart from './Statistics/components/ServicePieChart';

LocaleConfig.locales['vi'] = { monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'], dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'], dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'], today: 'Hôm nay' };
LocaleConfig.defaultLocale = 'vi';

const COLORS = { primary: '#1a1a1a', secondary: '#555', white: '#FFFFFF', lightGray: '#f0f2f5', success: '#28a745', danger: '#D32F2F', black: '#1a1a1a' };

const getDateRange = (period, customDate = null) => { const now = new Date(); let startDate, endDate = new Date(now); if (period === 'custom' && customDate) { startDate = new Date(customDate); endDate = new Date(customDate); } else { switch (period) { case 'today': startDate = new Date(now); break; case 'week': const dayOfWeek = now.getDay(); const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); startDate = new Date(now.setDate(diff)); break; case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break; case 'year': startDate = new Date(now.getFullYear(), 0, 1); break; default: startDate = new Date(now); } } startDate.setHours(0, 0, 0, 0); endDate.setHours(23, 59, 59, 999); return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) }; };
const getDynamicTitle = (period, date) => { if (period === 'custom' && date) return `Ngày ${date.toLocaleDateString('vi-VN')}`; const now = new Date(); switch (period) { case 'today': return `Hôm nay, ${now.toLocaleDateString('vi-VN')}`; case 'week': const startOfWeek = getDateRange('week').startDate.toDate(); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 6); return `Tuần này (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1})`; case 'month': return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`; case 'year': return `Năm ${now.getFullYear()}`; default: return 'Tổng quan'; } };

const EmployeeStatisticsScreen = () => {
    const { userRole } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();
    const { employeeId, employeeName } = route.params || {};

    const [activeFilter, setActiveFilter] = useState('today');
    const [loading, setLoading] = useState(true);
    const [dynamicTitle, setDynamicTitle] = useState('Đang tải...');
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());

    const [summaryData, setSummaryData] = useState({ totalRevenue: 0, revenueChange: 0, totalClients: 0, clientsChange: 0 });
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [pieChartData, setPieChartData] = useState([]);

    const handleBackButtonPress = () => {
        // Nếu người dùng là admin, họ đến từ màn hình xếp hạng, nên goBack() là đúng
        if (userRole === 'admin') {
            navigation.goBack();
        } else {
            // Nếu là nhân viên, điều hướng đến màn hình `MainTabs` và chỉ định tab 'Trang chủ'
            navigation.navigate('MainTabs', { screen: 'Trang chủ' });
        }
    };

    const fetchEmployeeStats = useCallback(async () => {
        if (!employeeId) { setLoading(false); return; }
        setLoading(true);

        const getReportsInRangeForEmployee = async (range) => {
            try {
                const q = query( collection(db, "reports"), where("participantIds", "array-contains", employeeId), where("status", "==", "approved"), where("createdAt", ">=", range.startDate), where("createdAt", "<=", range.endDate), orderBy("createdAt", "asc") );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => doc.data());
            } catch (e) { console.error("Lỗi khi lấy báo cáo của nhân viên:", e); if (e.code === 'failed-precondition' || e.code === 'permission-denied') { Alert.alert("Lỗi Tải Dữ Liệu", `Không thể tải thống kê. Vui lòng đảm bảo bạn đã tạo chỉ mục và sửa lại quy tắc bảo mật trên Firestore. Lỗi: ${e.message}`); } return []; }
        };
        
        const currentRange = getDateRange(activeFilter, customDate);
        const diff = currentRange.endDate.toDate().getTime() - currentRange.startDate.toDate().getTime();
        const prevEndDate = new Date(currentRange.startDate.toDate().getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - diff);
        const previousRange = { startDate: Timestamp.fromDate(prevStartDate), endDate: Timestamp.fromDate(prevEndDate) };

        try {
            const [currentReports, previousReports] = await Promise.all([ getReportsInRangeForEmployee(currentRange), getReportsInRangeForEmployee(previousRange) ]);
            const calculatePersonalRevenue = (reports) => reports.reduce((sum, report) => { const revenueShare = report.partnerId ? (report.price || 0) / 2 : (report.price || 0); return sum + revenueShare; }, 0);
            const currentRevenue = calculatePersonalRevenue(currentReports);
            const currentClients = currentReports.length;
            const previousRevenue = calculatePersonalRevenue(previousReports);
            const previousClients = previousReports.length;
            const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : (currentRevenue > 0 ? 100 : 0);
            const clientsChange = previousClients > 0 ? ((currentClients - previousClients) / previousClients) * 100 : (currentClients > 0 ? 100 : 0);
            setSummaryData({ totalRevenue: currentRevenue, revenueChange: parseFloat(revenueChange.toFixed(1)), totalClients: currentClients, clientsChange: parseFloat(clientsChange.toFixed(1)) });
            
            const dailyRevenue = {};
            for (let d = new Date(currentRange.startDate.toDate()); d <= currentRange.endDate.toDate(); d.setDate(d.getDate() + 1)) { const dateKey = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); dailyRevenue[dateKey] = 0; }
            currentReports.forEach(report => { const dateKey = report.createdAt.toDate().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); const revenueShare = report.partnerId ? (report.price || 0) / 2 : (report.price || 0); if (dailyRevenue[dateKey] !== undefined) { dailyRevenue[dateKey] += revenueShare; } });
            setChartData({ labels: Object.keys(dailyRevenue), datasets: [{ data: Object.values(dailyRevenue) }] });
            
            const serviceCounts = currentReports.reduce((acc, report) => { const serviceNames = (report.service || 'Không xác định').split(',').map(s => s.trim()); serviceNames.forEach(serviceName => { acc[serviceName] = (acc[serviceName] || 0) + 1; }); return acc; }, {});
            const pieColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
            const pieData = Object.keys(serviceCounts).map((service, index) => ({ name: service, population: serviceCounts[service], color: pieColors[index % pieColors.length], legendFontColor: '#7F7F7F', legendFontSize: 15, }));
            setPieChartData(pieData);
            setDynamicTitle(getDynamicTitle(activeFilter, customDate));
        } catch (error) { console.error("Lỗi fetchEmployeeStats:", error); } finally { setLoading(false); }
    }, [activeFilter, customDate, employeeId]);

    useEffect(() => { fetchEmployeeStats(); }, [fetchEmployeeStats]);

    const onDayPress = (day) => { const newDate = new Date(day.dateString + 'T00:00:00'); setDatePickerVisible(false); setCustomDate(newDate); setActiveFilter('custom'); };
    const handleFilterChange = (filter) => { setActiveFilter(filter); if (filter !== 'custom') { setCustomDate(new Date()); } };
    const getSelectedDateString = () => { const year = customDate.getFullYear(); const month = String(customDate.getMonth() + 1).padStart(2, '0'); const day = String(customDate.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };

    return (
        <View style={styles.container}>
             <Modal transparent={true} animationType="fade" visible={isDatePickerVisible} onRequestClose={() => setDatePickerVisible(false)}><TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}><View style={styles.datePickerBackdrop}><TouchableWithoutFeedback><View style={styles.datePickerContent}>
                <Calendar current={getSelectedDateString()} onDayPress={onDayPress} markedDates={{ [getSelectedDateString()]: {selected: true, disableTouchEvent: true, selectedColor: COLORS.primary} }} />
             </View></TouchableWithoutFeedback></View></TouchableWithoutFeedback></Modal>
            <View style={styles.header}>
            <TouchableOpacity onPress={handleBackButtonPress} style={styles.backButton}>
                <Ionicons name="arrow-back-outline" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerLabel}>Thống kê của</Text><Text style={styles.headerTitle} numberOfLines={1}>{employeeName || 'Nhân viên'}</Text></View><View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                 <View style={styles.subHeader}><TouchableOpacity style={styles.titleTouchable} onPress={() => setDatePickerVisible(true)}><Text style={styles.subHeaderTitle}>{loading ? 'Đang tải...' : (dynamicTitle || 'Tổng quan')}</Text><Ionicons name="calendar-outline" size={22} color={COLORS.secondary} style={{ marginLeft: 8 }}/></TouchableOpacity></View>
                 <TimeFilterSegment activeFilter={activeFilter} onFilterChange={handleFilterChange} />
                 {loading ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>) : ( <>
                        <SummaryCard title="Doanh thu thực nhận" value={`${(summaryData.totalRevenue || 0).toLocaleString('vi-VN')} đ`} change={summaryData.revenueChange || 0} icon="cash-outline" color={COLORS.primary} />
                        <SummaryCard title="Số báo cáo tham gia" value={(summaryData.totalClients || 0).toString()} change={summaryData.clientsChange || 0} icon="people-outline" color="#3498db" />
                        <StatsChart data={chartData} title="Biểu đồ doanh thu" />
                        <ServicePieChart data={pieChartData} />
                     </>)}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.lightGray, }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', }, backButton: { padding: 5, width: 40, }, headerTitleContainer: { alignItems: 'center', flex: 1, marginHorizontal: 10, }, headerLabel: { fontSize: 14, color: COLORS.secondary, }, headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, }, scrollContent: { paddingBottom: 20, }, subHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, }, titleTouchable: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', }, subHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.secondary, }, loadingContainer: { height: 400, justifyContent: 'center', alignItems: 'center', }, datePickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, }, datePickerContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 5, width: '100%', maxWidth: 350, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, }, });

export default EmployeeStatisticsScreen;