// src/screens/Statistics/components/StatsChart.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const COLORS = { primary: '#1a1a1a', secondary: '#555', white: '#FFFFFF' };

const StatsChart = ({ data }) => {
    const isDataValid = data && data.labels && data.labels.length > 0 && data.datasets[0].data.some(d => d > 0);

    return (
        <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Biểu đồ Doanh thu (triệu VNĐ)</Text>
            {isDataValid ? (
                <BarChart
                    data={data}
                    width={Dimensions.get('window').width - 70}
                    height={230}
                    yAxisSuffix=""
                    fromZero={true}
                    chartConfig={{
                        backgroundColor: COLORS.white,
                        backgroundGradientFrom: COLORS.white,
                        backgroundGradientTo: COLORS.white,
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
                        barPercentage: 0.7,
                    }}
                    style={{ borderRadius: 16, paddingRight: 35 }}
                    verticalLabelRotation={-30}
                    showBarTops={false}
                />
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
        marginTop: 30,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        alignSelf: 'flex-start',
    },
    noDataContainer: {
        height: 230,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        color: COLORS.secondary,
        fontSize: 14,
    },
});

export default StatsChart;