import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Dữ liệu giả để dựng giao diện
const dummyNotifications = [
    { id: '1', title: 'Báo cáo mới cần duyệt', body: 'Nhân viên A đã tạo một báo cáo mới.', createdAt: '10:30 15/06/2025', read: false },
    { id: '2', title: 'Báo cáo đã được duyệt', body: 'Báo cáo cho dịch vụ "Nail" của bạn đã được duyệt.', createdAt: '09:00 15/06/2025', read: true },
    { id: '3', title: 'Báo cáo bị từ chối', body: 'Báo cáo cho dịch vụ "Mi" của bạn đã bị từ chối.', createdAt: '18:00 14/06/2025', read: true },
];

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    unread: 'rgba(0, 123, 255, 0.08)',
};

const NotificationScreen = () => {
    const navigation = useNavigation();

    const renderItem = ({ item }) => (
        <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
            <View style={styles.iconContainer}>
                <Ionicons name={item.read ? "notifications-outline" : "notifications"} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.timestamp}>{item.createdAt}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={28} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <FlatList
                data={dummyNotifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 15,
        paddingHorizontal: 10,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    listContainer: {
        paddingVertical: 10,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: COLORS.unread,
    },
    iconContainer: {
        marginRight: 15,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        color: COLORS.secondary,
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: COLORS.secondary,
    }
});

export default NotificationScreen;