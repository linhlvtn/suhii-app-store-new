// src/screens/Statistics/components/TimeFilterSegment.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const COLORS = { primary: '#1a1a1a', secondary: '#555', white: '#FFFFFF' };

const TimeFilterSegment = ({ activeFilter, onFilterChange }) => {
    const filters = [
        { key: 'today', label: 'Ngày' }, { key: 'week', label: 'Tuần' },
        { key: 'month', label: 'Tháng' }, { key: 'year', label: 'Năm' },
    ];
    return (
        <View style={styles.filterSegmentContainer}>
            {filters.map(filter => (
                <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterSegmentButton, activeFilter === filter.key && styles.activeFilterSegment]}
                    onPress={() => onFilterChange(filter.key)}
                >
                    <Text style={[styles.filterSegmentText, activeFilter === filter.key && styles.activeFilterSegmentText]}>
                        {filter.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    filterSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#e9ecef',
        borderRadius: 10,
        marginHorizontal: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    filterSegmentButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeFilterSegment: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    filterSegmentText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.secondary,
    },
    activeFilterSegmentText: {
        color: COLORS.white,
    },
});

export default TimeFilterSegment;