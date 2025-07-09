// src/screens/Statistics/components/ServicePieChart.js

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// --- THEME COLORS ---
const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
};

// Component Biểu đồ tròn
const ServicePieChart = ({ data }) => {
    // Kiểm tra xem có dữ liệu hợp lệ để hiển thị không
    const isDataValid = data && Array.isArray(data) && data.length > 0;

    // Tính tổng số lượng để tính phần trăm
    const totalPopulation = isDataValid ? data.reduce((sum, item) => sum + item.population, 0) : 0;

    // Chuyển đổi dữ liệu cho react-native-gifted-charts
    const chartData = isDataValid ? data.map((item) => ({
        value: item.population,
        color: item.color,
        text: item.name,
        // Thêm các thuộc tính khác nếu cần
    })) : [];

    return (
        <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Tỉ lệ Dịch vụ</Text>
            {isDataValid ? (
                <View style={styles.contentWrapper}>
                    {/* Cột 1: Biểu đồ */}
                    <View style={styles.chartWrapper}>
                        <PieChart
                            data={chartData}
                            radius={70}
                            innerRadius={0}
                            strokeColor={COLORS.white}
                            strokeWidth={2}
                            showText={false}
                            showValuesAsLabels={false}
                            showGradient={false}
                            textColor={COLORS.primary}
                            textSize={10}
                            focusOnPress={true}
                            toggleFocusOnPress={false}
                            isAnimated={true}
                            animationDuration={800}
                            // Tùy chỉnh thêm
                            donut={false}
                            sectionAutoFocus={false}
                        />
                    </View>

                    {/* Cột 2: Chú thích tùy chỉnh */}
                    <View style={styles.legendWrapper}>
                        {data.map((item) => {
                            const percentage = totalPopulation > 0 
                                ? ((item.population / totalPopulation) * 100).toFixed(1) 
                                : 0;

                            return (
                                <View key={item.name} style={styles.legendItem}>
                                    <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                                    <View style={styles.legendTextContainer}>
                                        <Text style={styles.legendServiceName}>{item.name}</Text>
                                        <Text style={styles.legendServiceDetails}>
                                            {`${item.population} lượt (${percentage}%)`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Không có dữ liệu dịch vụ.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    chartCard: {
        marginHorizontal: 20,
        marginTop: 30,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
    },
    contentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    chartWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 150, // Cố định chiều rộng cho biểu đồ
        height: 150,
    },
    legendWrapper: {
        flex: 1, // Chiếm phần không gian còn lại
        marginLeft: 15,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    legendColorBox: {
        width: 10,
        height: 10,
        borderRadius: 7,
        marginRight: 10,
    },
    legendTextContainer: {
        flex: 1, // Cho phép text xuống dòng
    },
    legendServiceName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    legendServiceDetails: {
        fontSize: 12,
        color: COLORS.secondary,
    },
    noDataContainer: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        color: COLORS.secondary,
        fontSize: 14,
    },
});

export default ServicePieChart;