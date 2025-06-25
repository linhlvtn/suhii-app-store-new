import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-svg-charts';
import { Path } from 'react-native-svg';
import * as shape from 'd3-shape';

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
    // Sử dụng 'vi-VN' và 'VND' để đảm bảo định dạng số đúng của Việt Nam
    // Sau đó thay thế ký hiệu '₫' nếu nó tự động thêm vào
    let formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

    // Ký hiệu mặc định của VND trong Intl.NumberFormat có thể là "₫" hoặc "VNĐ" tùy môi trường/thiết bị.
    // Chúng ta sẽ thay thế nó bằng "₫" một cách nhất quán.
    return formattedAmount.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim(); // Đảm bảo chỉ có ₫ và không có khoảng trắng thừa
};

// Thêm customCardWidth và isDailyReport vào props
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
        // Đối với actualRevenue, giá trị đã là chuỗi định dạng (vd: "1.234.567 VNĐ")
        // Chỉ cần thay thế "VNĐ" bằng "₫" nếu có.
        displayValue = value.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim(); // Đảm bảo thay thế đúng
        displayIcon = icon || "cash-outline";
        displayColor = color || COLORS.success;
    }
    else {
        displayValue = formatCurrency(totalRevenue);
        displayIcon = icon || "cash-outline";
        displayColor = color || COLORS.primary;
    }

    const defaultSparklineData = [0, 1, 0.5, 2, 1.5, 3];
    const dataForSparkline = chartData && chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data.length > 0
        ? chartData.datasets[0].data
        : defaultSparklineData;

    const SparklinePath = ({ line }) => (
        <Path
            key={'path'}
            d={line}
            stroke={changeColor}
            fill={'none'}
            strokeWidth={2}
        />
    );

    return (
        // Áp dụng customCardWidth hoặc mặc định là 48%
        <View style={[styles.card, { width: customCardWidth || '48%' }]}>
            {/* Icon chỉ báo xu hướng */}
            {change !== undefined && (
                <View style={styles.trendIndicator}>
                    <Ionicons name={changeIconName} size={16} color={changeColor} />
                    <View style={[styles.trendDot, { backgroundColor: changeColor }]} />
                </View>
            )}

            {/* Tiêu đề */}
            <Text style={styles.cardTitleNew}>{title}</Text>

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

            {/* Sparkline - Chỉ hiển thị nếu KHÔNG phải báo cáo ngày (isDailyReport là false) và có đủ dữ liệu */}
            {!isDailyReport && dataForSparkline.length > 1 && (
                <LineChart
                    style={styles.sparklineChart}
                    data={dataForSparkline}
                    contentInset={{ top: 5, bottom: 5, left: 0, right: 0 }}
                    curve={shape.curveNatural}
                    svg={{ stroke: displayColor, strokeWidth: 2 }} // Sử dụng displayColor cho sparkline
                    renderDot={() => null}
                    showGrid={false}
                >
                    <SparklinePath />
                </LineChart>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 15,
        // marginHorizontal: 20, // Đã loại bỏ marginHorizontal ở đây để customCardWidth hoạt động đúng
        marginBottom: 10,
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        boxSizing: 'border-box',
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
    cardTitleNew: {
        fontSize: 14,
        color: COLORS.secondary,
        marginBottom: 5,
        fontWeight: '500',
    },
    cardValueNew: {
        fontSize: 24,
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
    sparklineChart: {
        height: 40,
        width: '100%',
        marginTop: 10,
        alignSelf: 'center',
    }
});

export default SummaryCard;