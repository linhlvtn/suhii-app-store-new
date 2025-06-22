// src/screens/Statistics/components/SummaryCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    success: '#28a745',
    danger: '#D32F2F',
    warning: '#f39c12',
};

const SummaryCard = ({
    totalRevenue,
    totalReports,
    title,
    value,
    description,
    type
}) => {
    // Card "Doanh thu thực nhận"
    if (type === 'actualRevenue') {
        return (
            <View style={[styles.card, styles.customCard]}>
                <Text style={styles.customCardTitle}>{title}</Text>
                <Text style={[styles.customCardValue, styles.actualRevenueValue]}>
                    {value || '0 VNĐ'}
                </Text>
                {description && <Text style={styles.customCardDescription}>{description}</Text>}
            </View>
        );
    }

    // Card tổng quan mặc định (đã loại bỏ trạng thái báo cáo)
    return (
        <View style={styles.card}>
            {/* Row 1: Tổng doanh thu */}
            <View style={styles.row}>
                <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
                <View style={styles.stats}>
                    <Text style={styles.statLabel}>{title || 'Tổng doanh thu cá nhân'}</Text>
                    <Text style={styles.statValue}>{(totalRevenue || 0).toLocaleString('vi-VN')} VNĐ</Text>
                </View>
            </View>
            {/* Row 2: Tổng số báo cáo tham gia */}
            <View style={styles.row}>
                <Ionicons name="receipt-outline" size={24} color={COLORS.primary} />
                <View style={styles.stats}>
                    <Text style={styles.statLabel}>Tổng số báo cáo tham gia</Text>
                    <Text style={styles.statValue}>{(totalReports || 0)} báo cáo</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    stats: {
        marginLeft: 15,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.secondary,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    customCard: {
        alignItems: 'center',
        paddingVertical: 25,
    },
    customCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    customCardValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    actualRevenueValue: {
        color: COLORS.danger,
    },
    customCardDescription: {
        fontSize: 14,
        color: COLORS.secondary,
        marginTop: 5,
        textAlign: 'center',
    },
});

export default SummaryCard;