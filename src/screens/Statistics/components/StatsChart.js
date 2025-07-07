// src/screens/Statistics/components/StatsChart.js

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
// Thay thế imports từ react-native-chart-kit bằng react-native-gifted-charts
import { LineChart, BarChart } from 'react-native-gifted-charts'; 

const COLORS = { 
    primary: '#1a1a1a', 
    secondary: '#555', 
    white: '#FFFFFF',
    gradientStart: '#40a829', // Màu xanh lá cây đậm (ví dụ cho LineChart)
    gradientEnd: '#6ac955',   // Màu xanh lá cây nhạt hơn (ví dụ cho LineChart)
    barColor: '#1a1a1a',      // Màu cột mặc định
};

const StatsChart = ({ data, chartType = 'bar', title }) => {
    // Chuyển đổi dữ liệu từ format { labels: [...], datasets: [{ data: [...] }] }
    // sang format [{ value: Y, label: X }, ...] cho react-native-gifted-charts
    const chartData = useMemo(() => {
        if (!data || !data.labels || !data.labels.length || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
            return [];
        }
        return data.labels.map((label, index) => ({
            value: data.datasets[0].data[index], // Giá trị cho trục Y
            label: label,                       // Nhãn cho trục X
        }));
    }, [data]);

    const isDataValid = chartData.length > 0 && chartData.some(d => d.value > 0);
    const chartWidth = Dimensions.get('window').width - 40; // Chiều rộng của card

    // Tính toán chiều rộng động cho ScrollView để biểu đồ có thể cuộn ngang
    // Mỗi điểm dữ liệu sẽ chiếm một khoảng nhất định (ví dụ 60px cho cột/nhãn)
    const dynamicChartContentWidth = Math.max(chartWidth, chartData.length * 60);

    const scrollViewRef = useRef(null);

    useEffect(() => {
        // Cuộn về đầu biểu đồ khi component được hiển thị
        if (isDataValid && scrollViewRef.current) {
            const timer = setTimeout(() => {
                scrollViewRef.current.scrollTo({ x: 0, animated: true }); // SỬA ĐỔI TẠI ĐÂY: cuộn về đầu
            }, 300); 
            return () => clearTimeout(timer);
        }
    }, [isDataValid, chartData]); // Đã bỏ chartType khỏi dependencies vì chỉ cần cuộn khi data hợp lệ

    // Xác định giá trị lớn nhất cho trục Y để đảm bảo biểu đồ không bị cắt
    const maxValue = useMemo(() => {
        if (!isDataValid) return 1;
        return Math.max(...chartData.map(d => d.value)) * 1.2; // Thêm 20% khoảng trống phía trên
    }, [chartData, isDataValid]);


    return (
        <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {isDataValid ? (
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ width: dynamicChartContentWidth, paddingHorizontal: 0 }} // Đã chỉnh paddingHorizontal
                >
                    {chartType === 'line' ? (
                        <LineChart
                            data={chartData}
                            width={dynamicChartContentWidth - 30} // Điều chỉnh width để vừa với padding của LineChart
                            height={230}
                            // Cấu hình trục X
                            xAxisLabelTextStyle={{ color: COLORS.secondary, fontSize: 12 }}
                            xAxisColor={COLORS.secondary}
                            // Cấu hình trục Y
                            yAxisTextStyle={{ color: COLORS.secondary, fontSize: 12 }}
                            yAxisLabelSuffix="M₫" // Đơn vị tiền tệ
                            yAxisColor={COLORS.secondary}
                            maxValue={maxValue} // Giá trị lớn nhất trên trục Y
                            noOfSections={5} // Số lượng phần trên trục Y
                            roundToDigits={1} // Làm tròn số thập phân trên trục Y
                            
                            // Cấu hình đường biểu đồ
                            color={COLORS.gradientStart} // Màu của đường
                            thickness={3} // Độ dày của đường
                            hideRules={false} // Hiển thị đường kẻ ngang
                            rulesColor="#e0e0e0" // Màu đường kẻ ngang
                            rulesType="solid" // Kiểu đường kẻ ngang
                            startFillColor={COLORS.gradientStart} // Màu gradient bắt đầu
                            endFillColor={COLORS.gradientEnd}   // Màu gradient kết thúc
                            startOpacity={0.8}
                            endOpacity={0.3}
                            areaChart // Hiển thị khu vực dưới đường
                            
                            // Các tùy chỉnh khác
                            bezier={true} // BẬT BEZIER LUÔN CHO LINE CHART
                            pointerConfig={{
                                pointerStripUptoDataIndex: chartData.length -1,
                                activatePointersOnLongPress: true,
                                activatePointersDelay: 150,
                                pointerColor: COLORS.primary,
                                pointerStripWidth: 1,
                                pointerStripColor: COLORS.secondary,
                                pointerStripHeight: 120,
                                pointerLabelComponent: (item) => (
                                    <View style={styles.pointerLabel}>
                                        <Text style={styles.pointerLabelText}>{item[0].label}</Text>
                                        <Text style={styles.pointerLabelValue}>
                                            {(item[0].value * 1000000).toLocaleString('vi-VN')}₫
                                        </Text>
                                    </View>
                                ),
                            }}
                        />
                    ) : (
                        <BarChart
                            data={chartData}
                            width={dynamicChartContentWidth - 30} // Điều chỉnh width để vừa với padding của BarChart
                            height={230}
                            barWidth={22} // Chiều rộng của mỗi cột
                            spacing={chartData.length > 7 ? 20 : 15} // Khoảng cách giữa các cột
                            roundedTop // Bo tròn đỉnh cột
                            noOfSections={5}
                            maxValue={maxValue}
                            yAxisLabelSuffix="M₫"
                            yAxisTextStyle={{ color: COLORS.secondary, fontSize: 12 }}
                            yAxisColor={COLORS.secondary}
                            xAxisLabelTextStyle={{ color: COLORS.secondary, fontSize: 12 }}
                            xAxisColor={COLORS.secondary}
                            frontColor={COLORS.barColor} // Màu của cột
                            hideRules={false}
                            rulesColor="#e0e0e0"
                            rulesType="solid"
                            isAnimated // Kích hoạt animation khi render
                            animationDuration={800}
                        />
                    )}
                </ScrollView>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Không có dữ liệu cho biểu đồ.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    chartCard: {
        marginHorizontal: 20,
        marginTop: 15,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden', 
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        alignSelf: 'flex-start',
        paddingHorizontal: 15,
    },
    noDataContainer: {
        height: 230, 
        justifyContent: 'center',
        alignItems: 'center',
        width: Dimensions.get('window').width - 40,
    },
    noDataText: {
        color: COLORS.secondary,
        fontSize: 15,
    },
    pointerLabel: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 4,
        alignItems: 'center',
    },
    pointerLabelText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    pointerLabelValue: {
        color: COLORS.white,
        fontSize: 11,
    },
});

export default StatsChart;