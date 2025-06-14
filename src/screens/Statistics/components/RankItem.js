// src/screens/Statistics/components/RankItem.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // <-- IMPORT useNavigation
import { Ionicons } from '@expo/vector-icons';

const COLORS = { primary: '#1a1a1a', secondary: '#555', success: '#28a745', white: '#FFFFFF' };

const RankItem = ({ item, index }) => {
    const navigation = useNavigation(); // <-- SỬ DỤNG HOOK

    // Hàm xử lý khi bấm vào một nhân viên
    const handlePress = () => {
        // Điều hướng đến màn hình chi tiết và truyền tên nhân viên
        navigation.navigate('EmployeeStatistics', {
            employeeName: item.name,
        });
    };

    const getRankIcon = () => {
        switch(index) {
            case 0: return <Ionicons name="medal" size={28} color="#FFD700" />;
            case 1: return <Ionicons name="medal" size={28} color="#C0C0C0" />;
            case 2: return <Ionicons name="medal" size={28} color="#CD7F32" />;
            default: return <Text style={styles.rankPosition}>{index + 1}</Text>;
        }
    };

    return (
        <TouchableOpacity 
            style={styles.rankItem} 
            onPress={handlePress} // <-- THÊM SỰ KIỆN ONPRESS
            activeOpacity={0.7}
        >
            <View style={styles.rankInfo}>
                <View style={styles.rankPositionContainer}>{getRankIcon()}</View>
                <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={styles.rankStats}>
                <Text style={styles.rankRevenue}>{item.revenue.toLocaleString('vi-VN')} đ</Text>
                <Text style={styles.rankClients}>{item.clients} khách</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 10,
    },
    rankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankPositionContainer: {
        width: 35,
        alignItems: 'center',
        marginRight: 10,
    },
    rankPosition: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    rankName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
        flexShrink: 1,
    },
    rankStats: {
        alignItems: 'flex-end',
    },
    rankRevenue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.success,
    },
    rankClients: {
        fontSize: 12,
        color: COLORS.secondary,
    },
});

export default RankItem;