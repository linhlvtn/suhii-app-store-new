import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform } from 'react-native';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebaseConfig';

// --- IMPORT CÁC COMPONENT CON ---
import TimeFilterSegment from './components/TimeFilterSegment';
import SummaryCard from './components/SummaryCard';
import StatsChart from './components/StatsChart';
import RankItem from './components/RankItem';
import ServicePieChart from './components/ServicePieChart';

// --- CẤU HÌNH TIẾNG VIỆT CHO LỊCH ---
LocaleConfig.locales['vi'] = {
  monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
  dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],
  dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
  today: 'Hôm nay'
};
LocaleConfig.defaultLocale = 'vi';

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
    const [activeFilter, setActiveFilter] = useState('today');
    const [loading, setLoading] = useState(true);
    const [dynamicTitle, setDynamicTitle] = useState('Đang tải...');

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [customDate, setCustomDate] = useState(new Date());    

    const [summaryData, setSummaryData] = useState({ 
        totalRevenue: 0, 
        revenueChange: 0, 
        totalClients: 0, 
        clientsChange: 0 
    });
    const [chartData, setChartData] = useState({ 
        labels: [], 
        datasets: [{ data: [] }] 
    });
    const [leaderboard, setLeaderboard] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);

    const fetchStatisticsData = useCallback(async () => {
        setLoading(true);

        const fetchAllEmployeesFromReports = async () => {
            try {
                const reportsSnapshot = await getDocs(collection(db, "reports"));
                if (reportsSnapshot.empty) return [];
                const employeeNames = new Set();
                reportsSnapshot.docs.forEach(doc => {
                    const employeeName = doc.data().employeeName;
                    if (employeeName && employeeName.trim()) {
                        employeeNames.add(employeeName.trim());
                    }
                });
                return Array.from(employeeNames).map(name => ({ id: name, name: name }));
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
                const q = query(
                    collection(db, "reports"), 
                    where("createdAt", ">=", range.startDate), 
                    where("createdAt", "<=", range.endDate)
                );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (e) { 
                console.error("Lỗi khi lấy báo cáo:", e);
                return []; 
            }
        };

        try {
            const [allEmployees, currentReports, previousReports] = await Promise.all([
                fetchAllEmployeesFromReports(),
                getReportsInRange(currentRange),
                getReportsInRange(previousRange)
            ]);
            
            // Tính toán doanh thu và số khách
            const currentRevenue = currentReports.reduce((sum, report) => {
                const price = parseFloat(report.price) || 0;
                return sum + price;
            }, 0);
            
            const currentClients = currentReports.length;
            
            const previousRevenue = previousReports.reduce((sum, report) => {
                const price = parseFloat(report.price) || 0;
                return sum + price;
            }, 0);
            
            const previousClients = previousReports.length;
            
            // Tính phần trăm thay đổi
            const revenueChange = previousRevenue > 0 
                ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
                : (currentRevenue > 0 ? 100 : 0);
                
            const clientsChange = previousClients > 0 
                ? ((currentClients - previousClients) / previousClients) * 100 
                : (currentClients > 0 ? 100 : 0);
            
            setSummaryData({ 
                totalRevenue: currentRevenue, 
                revenueChange: parseFloat(revenueChange.toFixed(1)), 
                totalClients: currentClients, 
                clientsChange: parseFloat(clientsChange.toFixed(1)) 
            });

            // Tính toán hiệu suất nhân viên
            const performanceMap = new Map();
            allEmployees.forEach(emp => {
                performanceMap.set(emp.name, { 
                    revenue: 0, 
                    clients: 0, 
                    name: emp.name 
                });
            });
            
            currentReports.forEach(report => {
                const name = (report.employeeName && report.employeeName.trim()) || 'Không rõ';
                if (performanceMap.has(name)) {
                    const currentPerf = performanceMap.get(name);
                    const price = parseFloat(report.price) || 0;
                    currentPerf.revenue += price;
                    currentPerf.clients += 1;
                } else if (name !== 'Không rõ') {
                    // Thêm nhân viên mới nếu chưa có trong danh sách
                    performanceMap.set(name, {
                        revenue: parseFloat(report.price) || 0,
                        clients: 1,
                        name: name
                    });
                }
            });
            
            setLeaderboard(Array.from(performanceMap.values())
                .sort((a, b) => b.revenue - a.revenue));

            const serviceCounts = currentReports.reduce((acc, report) => {
                const serviceName = report.service || 'Không xác định';
                acc[serviceName] = (acc[serviceName] || 0) + 1;
                return acc;
                }, {});
                const pieColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
                const pieData = Object.keys(serviceCounts).map((service, index) => ({
                    name: service,
                    population: serviceCounts[service],
                    color: pieColors[index % pieColors.length],
                    legendFontColor: '#7F7F7F',
                    legendFontSize: 15,
            }));


            // Tạo dữ liệu biểu đồ
            let labels = [], data = [];
            if (['today', 'week', 'custom'].includes(activeFilter)) {
                labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                data = Array(7).fill(0);
                
                const dateForWeekChart = (activeFilter === 'custom' || activeFilter === 'today') 
                    ? customDate 
                    : new Date();
                
                const startOfWeek = new Date(dateForWeekChart);
                const dayOfWeekForCalc = startOfWeek.getDay();
                const diff = startOfWeek.getDate() - dayOfWeekForCalc + (dayOfWeekForCalc === 0 ? -6 : 1);
                startOfWeek.setDate(diff);
                const rangeForWeekChart = getDateRange('week', startOfWeek);

                const reportsForWeekChart = await getReportsInRange(rangeForWeekChart);

                reportsForWeekChart.forEach(report => {
                    if (report.createdAt && report.createdAt.toDate) {
                        const dayIndex = report.createdAt.toDate().getDay();
                        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                        const price = parseFloat(report.price) || 0;
                        data[adjustedIndex] += price / 1000000; // Chuyển đổi sang triệu
                    }
                });
            }

            setPieChartData(pieData);
            setChartData({ labels, datasets: [{ data }] });
            setDynamicTitle(getDynamicTitle(activeFilter, customDate));

        } catch (error) {
            console.error("Lỗi nghiêm trọng trong fetchStatisticsData:", error);
            Alert.alert("Lỗi", "Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
            
            // Set default values in case of error
            setSummaryData({ totalRevenue: 0, revenueChange: 0, totalClients: 0, clientsChange: 0 });
            setChartData({ labels: [], datasets: [{ data: [] }] });
            setLeaderboard([]);
            setDynamicTitle('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [activeFilter, customDate]);

    useEffect(() => {
        fetchStatisticsData();
    }, [fetchStatisticsData]);

    const onDayPress = (day) => {
        // SỬA LỖI NGÀY BỊ LÙNG: Sử dụng trực tiếp dateString thay vì timestamp
        const selectedDate = new Date(day.dateString + 'T00:00:00.000');
        setCustomDate(selectedDate);
        setActiveFilter('custom');
        setDatePickerVisible(false);
    };
    
    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        if(filter !== 'custom') {
            setCustomDate(new Date());
        }
    }

    // Format selected date for calendar
    const getSelectedDateString = () => {
        const year = customDate.getFullYear();
        const month = String(customDate.getMonth() + 1).padStart(2, '0');
        const day = String(customDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <View style={styles.container}>
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
                                    current={getSelectedDateString()}
                                    onDayPress={onDayPress}
                                    markedDates={{
                                        [getSelectedDateString()]: {
                                            selected: true, 
                                            disableTouchEvent: true, 
                                            selectedColor: COLORS.primary
                                        }
                                    }}
                                    theme={{
                                        backgroundColor: COLORS.white,
                                        calendarBackground: COLORS.white,
                                        textSectionTitleColor: '#b6c1cd',
                                        selectedDayBackgroundColor: COLORS.primary,
                                        selectedDayTextColor: '#ffffff',
                                        todayTextColor: COLORS.primary,
                                        dayTextColor: COLORS.primary,
                                        arrowColor: COLORS.primary,
                                        monthTextColor: COLORS.primary,
                                        textDayFontWeight: '300',
                                        textMonthFontWeight: 'bold',
                                        textDayHeaderFontWeight: '300',
                                    }}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>Tổng quan</Text>
                        <Text style={styles.headerTitle}>
                            {loading ? 'Đang tải...' : (dynamicTitle || 'Tổng quan')}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.calendarButton} 
                        onPress={() => setDatePickerVisible(true)}
                    >
                        <Ionicons name="calendar-outline" size={26} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            
                <TimeFilterSegment 
                    activeFilter={activeFilter} 
                    onFilterChange={handleFilterChange} 
                />

                {loading ? ( 
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View> 
                ) : (
                    <>
                        <SummaryCard 
                            title="Tổng Doanh Thu" 
                            value={`${(summaryData.totalRevenue || 0).toLocaleString('vi-VN')} đ`} 
                            change={summaryData.revenueChange || 0} 
                            icon="cash-outline" 
                            color={COLORS.primary} 
                        />
                        <SummaryCard 
                            title="Tổng Lượt Khách" 
                            value={(summaryData.totalClients || 0).toString()} 
                            change={summaryData.clientsChange || 0} 
                            icon="people-outline" 
                            color="#3498db" 
                        />
                        <StatsChart data={chartData} />

                        <ServicePieChart data={pieChartData} />
                        
                        <View style={styles.leaderboardContainer}>
                            <Text style={styles.sectionTitle}>Hiệu suất Nhân viên</Text>
                            {leaderboard && leaderboard.length > 0 ? (
                                leaderboard.map((item, index) => (
                                    <RankItem 
                                        key={`${item.name}-${index}-${item.revenue}`} 
                                        item={item} 
                                        index={index} 
                                    />
                                ))
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <Text style={styles.noDataText}>
                                        Không có dữ liệu nhân viên.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightGray,
    },
    scrollView: {
        flex: 1,
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
    datePickerBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    datePickerContent: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        padding: 5,
        width: '100%',
        maxWidth: 350,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});

export default StatisticsScreen;