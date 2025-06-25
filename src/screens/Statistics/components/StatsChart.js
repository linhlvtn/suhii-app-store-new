// src/screens/Statistics/components/StatsChart.js
import React, { useRef, useEffect } from 'react'; // Import useRef và useEffect
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const COLORS = { primary: '#1a1a1a', secondary: '#555', white: '#FFFFFF' };

const StatsChart = ({ data, chartType = 'bar', title }) => {
    const isDataValid = data && data.labels && data.labels.length > 0 && data.datasets[0].data.some(d => d > 0);
    const chartWidth = Dimensions.get('window').width - 40;

    const dynamicChartWidth = data.labels.length > 7 ? data.labels.length * 50 : chartWidth;

    // Tạo một ref cho ScrollView
    const scrollViewRef = useRef(null);

    // useEffect để tự động cuộn đến cuối khi dữ liệu thay đổi và biểu đồ được hiển thị
    useEffect(() => {
        if (scrollViewRef.current && isDataValid && chartType === 'line') {
            // Chỉ cuộn nếu là LineChart (vì BarChart thường không cần cuộn)
            // Và có dữ liệu hợp lệ
            // Đặt timeout nhỏ để đảm bảo biểu đồ đã render xong trước khi cuộn
            setTimeout(() => {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }, 100); // Có thể điều chỉnh thời gian delay này nếu cần
        }
    }, [data, chartType, isDataValid]); // Re-run effect khi data hoặc chartType thay đổi


    const chartConfig = {
        backgroundColor: COLORS.white,
        backgroundGradientFrom: COLORS.white,
        backgroundGradientTo: COLORS.white,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
        barPercentage: 0.7,
        fromZero: true,
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: COLORS.primary
        }
    };

    return (
        <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>{title || "Biểu đồ Doanh thu (triệu ₫)"}</Text>
            {isDataValid ? (
                <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    style={{ width: chartWidth }}
                    ref={scrollViewRef} // Gán ref vào ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} // Đảm bảo nội dung luôn ở cuối nếu đủ chỗ
                >
                    {chartType === 'bar' ? (
                        <BarChart
                            data={data}
                            width={dynamicChartWidth}
                            height={230}
                            yAxisSuffix="₫"
                            chartConfig={chartConfig}
                            style={styles.chartStyle}
                            verticalLabelRotation={-30}
                            showBarTops={false}
                        />
                    ) : (
                        <LineChart
                            data={data}
                            width={dynamicChartWidth}
                            height={230}
                            yAxisSuffix="₫"
                            chartConfig={chartConfig}
                            style={styles.chartStyle}
                            bezier
                            verticalLabelRotation={-30}
                            fromZero={true}
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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 15,
        alignSelf: 'flex-start',
        paddingHorizontal: 15,
    },
    chartStyle: {
        borderRadius: 16,
        paddingRight: 35,
    },
    noDataContainer: {
        height: 230,
        justifyContent: 'center',
        alignItems: 'center',
        width: Dimensions.get('window').width - 40,
    },
    noDataText: {
        color: COLORS.secondary,
        fontSize: 14,
    },
});

export default StatsChart;