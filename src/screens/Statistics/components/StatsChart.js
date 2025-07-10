// src/screens/Statistics/components/StatsChart.js

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';

const COLORS = { 
    primary: '#1a1a1a', 
    secondary: '#555', 
    white: '#FFFFFF',
    gradientStart: '#40a829',
    gradientEnd: '#6ac955',
    barColor: '#1a1a1a',
    ruleColor: '#e0e0e0',
    pointerColor: '#1a1a1a',
};

const StatsChart = ({ data, chartType = 'bar', title }) => {
    const screenWidth = Dimensions.get('window').width;
    const chartCardWidth = screenWidth - 40;
    const chartPadding = 20;
    const chartWidth = chartCardWidth - chartPadding;

    // Chuyển đổi dữ liệu sang format của react-native-gifted-charts
    const chartData = useMemo(() => {
        if (!data?.labels?.length || !data?.datasets?.[0]?.data?.length) {
            return [];
        }
        
        return data.labels.map((label, index) => {
            // Chuyển đổi format ngày tháng từ "ngày-tháng" thành "ngày/tháng"
            const formattedLabel = label.replace(/-/g, '/');
            
            return {
                value: data.datasets[0].data[index] || 0,
                label: formattedLabel,
                // Thêm màu cho từng cột nếu cần
                frontColor: chartType === 'bar' ? COLORS.barColor : undefined,
            };
        });
    }, [data, chartType]);

    const isDataValid = chartData.length > 0 && chartData.some(d => d.value > 0);
    
    // Tính toán chiều rộng cho scroll view
    const itemWidth = chartType === 'bar' ? 50 : 60;
    const minScrollWidth = Math.max(chartWidth, chartData.length * itemWidth);
    
    const scrollViewRef = useRef(null);

    // Tự động cuộn về đầu khi có dữ liệu mới
    useEffect(() => {
        if (isDataValid && scrollViewRef.current) {
            const timer = setTimeout(() => {
                scrollViewRef.current.scrollTo({ x: 0, animated: true });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isDataValid, chartData]);

    // Tính giá trị max cho trục Y
    const maxValue = useMemo(() => {
        if (!isDataValid) return 10;
        const max = Math.max(...chartData.map(d => d.value));
        return Math.ceil(max * 1.2); // Thêm 20% buffer
    }, [chartData, isDataValid]);

    // Cấu hình chung cho cả hai loại biểu đồ - ẨN TRỤC Y
    const commonChartProps = {
        width: minScrollWidth - 20,
        height: 220,
        maxValue,
        noOfSections: 5,
        // ẨN TRỤC Y VÀ LABELS
        hideYAxisText: true,        // Ẩn text trục Y
        yAxisColor: 'transparent',  // Ẩn đường trục Y
        hideAxesAndRules: false,    // Vẫn giữ rules ngang
        xAxisLabelTextStyle: { color: COLORS.secondary, fontSize: 10 },
        xAxisColor: COLORS.secondary,
        hideRules: false,
        rulesColor: COLORS.ruleColor,
        rulesType: 'solid',
        isAnimated: true,
        animationDuration: 600,
    };

    // Render LineChart
    const renderLineChart = () => (
        <LineChart
            data={chartData}
            {...commonChartProps}
            // Cấu hình đường
            color={COLORS.gradientStart}
            thickness={2.5}
            curved={true} // Đường cong mượt
            // Cấu hình area chart
            areaChart={true}
            startFillColor={COLORS.gradientStart}
            endFillColor={COLORS.gradientEnd}
            startOpacity={0.7}
            endOpacity={0.2}
            // Cấu hình điểm dữ liệu
            hideDataPoints={false}
            dataPointsColor={COLORS.primary}
            dataPointsRadius={4}
            // Cấu hình pointer khi touch
            pointerConfig={{
                pointerStripUptoDataIndex: chartData.length - 1,
                activatePointersOnLongPress: false, // Thay đổi thành false để tap ngay
                activatePointersDelay: 50, // Giảm delay
                pointerColor: COLORS.pointerColor,
                pointerStripWidth: 2,
                pointerStripColor: COLORS.secondary,
                pointerStripHeight: 200,
                showPointerStrip: true,
                pointerStripUptoDataIndex: chartData.length - 1,
                pointerLabelComponent: (items) => {
                    const item = items[0];
                    return (
                        <View style={styles.pointerLabel}>
                            <Text style={styles.pointerLabelText}>{item.label}</Text>
                            <Text style={styles.pointerLabelValue}>
                                {(item.value * 1000000).toLocaleString('vi-VN')}₫
                            </Text>
                        </View>
                    );
                },
                // Thêm cấu hình cho pointer
                pointerVanishDelay: 3000, // Label tự động ẩn sau 3 giây
                persistPointer: false, // Không giữ pointer cố định
                stripOpacity: 0.7,
                stripColor: COLORS.secondary,
                stripWidth: 1,
            }}
        />
    );

    // Render BarChart
    const renderBarChart = () => (
        <BarChart
            data={chartData}
            {...commonChartProps}
            // Cấu hình cột
            barWidth={chartData.length > 10 ? 18 : 22}
            spacing={chartData.length > 10 ? 15 : 20}
            roundedTop={true}
            roundedBottom={false}
            frontColor={COLORS.barColor}
            // Gradient cho cột nếu muốn
            gradientColor={COLORS.gradientEnd}
            // Cấu hình label trên cột
            showValuesAsTopLabel={false}
            // Cấu hình animation
            animationDuration={800}
        />
    );

    return (
        <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {isDataValid ? (
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        width: minScrollWidth,
                        paddingHorizontal: 10,
                    }}
                    style={styles.scrollView}
                >
                    <View style={styles.chartContainer}>
                        {chartType === 'line' ? renderLineChart() : renderBarChart()}
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
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
    scrollView: {
        width: '100%',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDataContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        width: Dimensions.get('window').width - 40,
    },
    noDataText: {
        color: COLORS.secondary,
        fontSize: 15,
        textAlign: 'center',
    },
    pointerLabel: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        minWidth: 100,
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    pointerLabelText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    pointerLabelValue: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default StatsChart;