// src/screens/Statistics/index.js

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebaseConfig';

// --- IMPORT CÁC COMPONENT CON ---
import TimeFilterSegment from './components/TimeFilterSegment';
import SummaryCard from './components/SummaryCard';
import StatsChart from './components/StatsChart';
import RankItem from './components/RankItem';

// --- THEME COLORS ---
const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    success: '#28a745',
    danger: '#D32F2F',
};

// --- HELPER FUNCTIONS ---
const getDateRange = (period, customDate = null) => {
    // Xử lý cho ngày tùy chỉnh
    if (period === 'custom' && customDate) {
        let startDate = new Date(customDate);
        startDate.setHours(0, 0, 0, 0);
        let endDate = new Date(customDate);
        endDate.setHours(23, 59, 59, 999);
        return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
    }

    const now = new Date();
    let startDate, endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    switch (period) {
        case 'today':
            startDate = new Date(new Date().setHours(0, 0, 0, 0));
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(new Date().setDate(diff));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(new Date().setHours(0, 0, 0, 0));
    }
    return { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) };
};

const getDynamicTitle = (period, date) => {
    if (period === 'custom' && date) {
        return `Ngày ${date.toLocaleDateString('vi-VN')}`;
    }
    const now = new Date();
    switch (period) {
        case 'today': return `Hôm nay, ${now.toLocaleDateString('vi-VN')}`;
        case 'week':
            const startOfWeek = getDateRange('week').startDate.toDate();
            const endOfWeek = getDateRange('week').endDate.toDate();
            return `Tuần này (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1})`;
        case 'month': return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
        case 'year': return `Năm ${now.getFullYear()}`;
        default: return 'Tổng quan';
    }
}

// --- MAIN COMPONENT ---
const StatisticsScreen = () => {
    // --- STATE MANAGEMENT ---
    const [activeFilter, setActiveFilter] = useState('today'); // <-- THAY ĐỔI MẶC ĐỊNH SANG 'TODAY'
    const [loading, setLoading] = useState(true);
    const [dynamicTitle, setDynamicTitle] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());

    const [summaryData, setSummaryData] = useState({ totalRevenue: 0, revenueChange: 0, totalClients: 0, clientsChange: 0 });
    const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
    const [leaderboard, setLeaderboard] = useState([]);


    const fetchStatisticsData = useCallback(async () => {
        setLoading(true);

        const fetchAllEmployeesFromReports = async () => {
            try {
                const reportsSnapshot = await getDocs(collection(db, "reports"));
                if (reportsSnapshot.empty) return [];
                const employeeNames = new Set(reportsSnapshot.docs.map(doc => doc.data().employeeName));
                return Array.from(employeeNames).filter(name => name).map(name => ({ id: name, name: name }));
            } catch (e) {
                 console.error("Lỗi khi xây dựng danh sách nhân viên từ báo cáo: ", e);
                 return [];
            }
        };

        const currentRange = getDateRange(activeFilter, customDate);
        const diff = currentRange.endDate.toDate().getTime() - currentRange.startDate.toDate().getTime();
        const prevEndDate = new Date(currentRange.startDate.toDate().getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - diff);
        const previousRange = { startDate: Timestamp.fromDate(prevStartDate), endDate: Timestamp.fromDate(prevEndDate) };

        const getReportsInRange = async (range) => {
            try {
                const q = query(collection(db, "reports"), where("createdAt", ">=", range.startDate), where("createdAt", "<=", range.endDate));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => doc.data());
            } catch (e) { return []; }
        };

        try {
            const [allEmployees, currentReports, previousReports] = await Promise.all([
                fetchAllEmployeesFromReports(),
                getReportsInRange(currentRange),
                getReportsInRange(previousRange)
            ]);
            
            // --- TÍNH TOÁN DỮ LIỆU ---
            const currentRevenue = currentReports.reduce((sum, report) => sum + (report.price || 0), 0);
            const currentClients = currentReports.length;
            const previousRevenue = previousReports.reduce((sum, report) => sum + (report.price || 0), 0);
            const previousClients = previousReports.length;
            const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : (currentRevenue > 0 ? 100 : 0);
            const clientsChange = previousClients > 0 ? ((currentClients - previousClients) / previousClients) * 100 : (currentClients > 0 ? 100 : 0);
            
            setSummaryData({ totalRevenue: currentRevenue, revenueChange: parseFloat(revenueChange.toFixed(1)), totalClients: currentClients, clientsChange: parseFloat(clientsChange.toFixed(1)) });

            const performanceMap = new Map();
            allEmployees.forEach(emp => {
                performanceMap.set(emp.name, { revenue: 0, clients: 0, name: emp.name });
            });
            currentReports.forEach(report => {
                const name = report.employeeName || 'Không rõ';
                if (performanceMap.has(name)) {
                    const currentPerf = performanceMap.get(name);
                    currentPerf.revenue += (report.price || 0);
                    currentPerf.clients += 1;
                }
            });
            setLeaderboard(Array.from(performanceMap.values()).sort((a, b) => b.revenue - a.revenue));

            let labels = [], data = [];
            // Logic biểu đồ cho "Hôm nay" và "Ngày tùy chỉnh" sẽ hiển thị theo tuần của ngày đó
            if (['today', 'week', 'custom'].includes(activeFilter)) {
                labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                data = Array(7).fill(0);
                const rangeForWeekChart = getDateRange('week', activeFilter === 'custom' ? customDate : new Date());
                const reportsForWeekChart = await getReportsInRange(rangeForWeekChart);
                
                reportsForWeekChart.forEach(report => {
                    const dayIndex = report.createdAt.toDate().getDay();
                    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                    data[adjustedIndex] += (report.price || 0) / 1000000;
                });
            }
            // Thêm logic cho tháng, năm nếu cần
            setChartData({ labels, datasets: [{ data }] });
            setDynamicTitle(getDynamicTitle(activeFilter, customDate));

        } catch (error) {
            console.error("Lỗi nghiêm trọng trong fetchStatisticsData:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [activeFilter, customDate]);

    useEffect(() => {
        fetchStatisticsData();
    }, [fetchStatisticsData]);


    // --- HÀM XỬ LÝ LỊCH (ĐÃ CẬP NHẬT) ---
    const onDateSelected = (event, selectedDate) => {
        // Luôn phải ẩn DatePicker đi sau khi tương tác
        setShowDatePicker(false);

        // Chỉ xử lý nếu người dùng thực sự chọn một ngày (không phải bấm 'Cancel' trên Android)
        if (event.type === 'set' && selectedDate) {
            setCustomDate(selectedDate);
            setActiveFilter('custom'); // Chuyển sang chế độ xem ngày tùy chỉnh
        }
    };
    
    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        // Khi chọn lại filter mặc định, reset customDate về ngày hiện tại
        if(filter !== 'custom') {
            setCustomDate(new Date());
        }
    }

    return (
        <View style={{flex: 1, backgroundColor: COLORS.lightGray}}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>Tổng quan</Text>
                        <Text style={styles.headerTitle}>{loading ? 'Đang tải...' : dynamicTitle}</Text>
                    </View>
                    <TouchableOpacity style={styles.calendarButton} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={26} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            
                <TimeFilterSegment activeFilter={activeFilter} onFilterChange={handleFilterChange} />

                {loading ? ( 
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View> 
                ) : (
                    <>
                        <SummaryCard title="Tổng Doanh Thu" value={`${summaryData.totalRevenue.toLocaleString('vi-VN')} đ`} change={summaryData.revenueChange} icon="cash-outline" color={COLORS.primary} />
                        <SummaryCard title="Tổng Lượt Khách" value={summaryData.totalClients.toString()} change={summaryData.clientsChange} icon="people-outline" color="#3498db" />
                        <StatsChart data={chartData} />
                        <View style={styles.leaderboardContainer}>
                            <Text style={styles.sectionTitle}>Hiệu suất Nhân viên</Text>
                            {leaderboard.length > 0 ? leaderboard.map((item, index) => (
                               <RankItem key={`${item.name}-${index}`} item={item} index={index} />
                            )) : (
                                 <View style={styles.noDataContainer}><Text style={styles.noDataText}>Không có dữ liệu nhân viên.</Text></View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Component DatePicker sẽ hiển thị dạng modal */}
            {showDatePicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={customDate}
                    mode={'date'}
                    is24Hour={true}
                    display="default"
                    onChange={onDateSelected}
                    maximumDate={new Date()}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightGray,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    calendarButton: {
        padding: 8,
    },
    headerLabel: {
        fontSize: 18,
        color: COLORS.secondary,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    loadingContainer: {
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leaderboardContainer: {
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    noDataContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        marginHorizontal: 20,
    },
    noDataText: {
        color: COLORS.secondary,
    },
});

export default StatisticsScreen;