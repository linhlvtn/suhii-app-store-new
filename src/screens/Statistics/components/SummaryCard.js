// src/screens/Statistics/components/SummaryCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { primary: '#1a1a1a', secondary: '#555', white: '#FFFFFF', success: '#28a745', danger: '#D32F2F' };

const SummaryCard = ({ title, value, change, icon, color }) => {
    const isPositive = change >= 0;
    return (
        <View style={[styles.summaryCard, { borderColor: color }]}>
            <View style={styles.summaryCardHeader}>
                <View style={[styles.summaryIconContainer, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <View style={[styles.changeContainer, { backgroundColor: isPositive ? COLORS.success + '20' : COLORS.danger + '20' }]}>
                    <Ionicons name={isPositive ? "arrow-up" : "arrow-down"} size={14} color={isPositive ? COLORS.success : COLORS.danger} />
                    <Text style={[styles.changeText, { color: isPositive ? COLORS.success : COLORS.danger }]}>{Math.abs(change)}%</Text>
                </View>
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 20,
        borderLeftWidth: 5,
    },
    summaryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    summaryIconContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    changeText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardTitle: {
        fontSize: 16,
        color: COLORS.secondary,
        marginTop: 2,
    },
});

export default SummaryCard;