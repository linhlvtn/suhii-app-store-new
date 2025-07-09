// src/screens/Statistics/components/SummaryCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// ĐÃ LOẠI BỎ: import { LineChart } from 'react-native-chart-kit';
// ĐÃ LOẠI BỎ: import { Path } from 'react-native-svg';
// ĐÃ LOẠI BỎ: import * as shape from 'd3-shape';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#6c757d',
    white: '#FFFFFF',
    success: '#28a745',
    danger: '#dc3545',
    lightGray: '#f8f9fa',
    darkGray: '#343a40',
    successLight: '#e6ffe6',
    dangerLight: '#ffe6e6',
};

const formatCurrency = (amount) => {
    let formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

    return formattedAmount.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim();
};

const SummaryCard = ({ title, totalRevenue, totalReports, change, value, icon, color, type, chartData, customCardWidth, isDailyReport }) => {
    const isIncrease = change > 0;
    const changeColor = isIncrease ? COLORS.success : (change < 0 ? COLORS.danger : COLORS.secondary);
    const changeBgColor = isIncrease ? COLORS.successLight : (change < 0 ? COLORS.dangerLight : COLORS.lightGray);
    const changeIconName = isIncrease ? 'caret-up' : (change < 0 ? 'caret-down' : 'remove');
    const changeText = `${Math.abs(change)}%`;

    let displayValue;
    let displayIcon = icon || "wallet-outline";
    let displayColor = color || COLORS.primary;

    if (type === 'storeClients') {
        displayValue = value;
        displayIcon = icon || "people-outline";
        displayColor = color || '#3498db';
    } else if (type === 'actualRevenue') {
        displayValue = value.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim();
        displayIcon = icon || "cash-outline";
        displayColor = color || COLORS.success;
    }
    else { // Default type, used for 'Tổng doanh thu cá nhân'
        displayValue = formatCurrency(totalRevenue);
        displayIcon = icon || "cash-outline";
        displayColor = color || COLORS.primary;
    }

    // ĐÃ LOẠI BỎ: Dữ liệu và cấu hình cho sparkline (LineChart)
    // const dataForSparkline = chartData && chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data.length > 0
    //     ? {
    //         labels: chartData.labels || [],
    //         datasets: [{ data: chartData.datasets[0].data }]
    //       }
    //     : { labels: [], datasets: [{ data: [0, 1, 0.5, 2, 1.5, 3] }] };
    //
    // const sparklineChartConfig = {
    //     backgroundColor: COLORS.white,
    //     backgroundGradientFrom: COLORS.white,
    //     backgroundGradientTo: COLORS.white,
    //     decimalPlaces: 1,
    //     color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
    //     labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
    //     fillShadowGradient: displayColor,
    //     fillShadowGradientOpacity: 0.2,
    //     strokeWidth: 2,
    //     propsForDots: {
    //         r: "0",
    //     },
    //     propsForBackgroundLines: {
    //         strokeDasharray: "",
    //         strokeWidth: 0
    //     },
    //     propsForLabels: {
    //         display: 'none'
    //     },
    //     color: (opacity = 1) => displayColor,
    // };

    return (
        <View style={[styles.card, { width: customCardWidth || '100%' }]}>
            {/* Header cho tiêu đề và LƯỢT KHÁCH */}
            <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitleNew}>{title}</Text>
                {totalReports !== undefined && (
                    <Text style={styles.totalCustomersBadge}>
                        Tổng lượt khách: {totalReports}
                    </Text>
                )}
            </View>

            {/* Icon chỉ báo xu hướng */}
            {change !== undefined && (
                <View style={styles.trendIndicator}>
                    <Ionicons name={changeIconName} size={16} color={changeColor} />
                    <View style={[styles.trendDot, { backgroundColor: changeColor }]} />
                </View>
            )}

            {/* Giá trị chính */}
            <Text style={styles.cardValueNew}>{displayValue}</Text>

            {/* Thẻ phần trăm thay đổi */}
            {change !== undefined && (
                <View style={[styles.changeBadge, { backgroundColor: changeBgColor }]}>
                    <Text style={[styles.changeTextNew, { color: changeColor }]}>
                        {changeText} vs kỳ trước
                    </Text>
                </View>
            )}

            {/* ĐÃ LOẠI BỎ: Phần render Sparkline (LineChart) */}
            {/* {!isDailyReport && dataForSparkline.datasets[0].data.length > 1 && (
                <LineChart
                    data={dataForSparkline}
                    width={styles.sparklineChart.width}
                    height={styles.sparklineChart.height}
                    chartConfig={sparklineChartConfig}
                    bezier
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    fromZero={true}
                    style={styles.sparklineChart}
                />
            )} */}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        boxSizing: 'border-box',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    cardTitleNew: {
        fontSize: 14,
        color: COLORS.secondary,
        fontWeight: '500',
    },
    totalCustomersBadge: { // New style for the badge
        fontSize: 11, // Smaller font size for a badge
        color: COLORS.white,
        backgroundColor: COLORS.primary, // Black background
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12, // Rounded corners for badge effect
        fontWeight: 'bold', // Make it bold
        overflow: 'hidden', // Ensure content stays within border radius
    },
    trendIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    trendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 5,
    },
    cardValueNew: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    changeBadge: {
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
    },
    changeTextNew: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    // ĐÃ LOẠI BỎ: sparklineChart style
    // sparklineChart: {
    //     height: 40,
    //     width: '100%',
    //     marginTop: 10,
    //     alignSelf: 'center',
    // }
});

export default SummaryCard;