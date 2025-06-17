// src/screens/NotificationScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#555',
    white: '#FFFFFF',
    lightGray: '#f0f2f5',
    unread: 'rgba(0, 123, 255, 0.08)',
};

const NotificationScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth(); // Lấy thông tin người dùng từ context

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sử dụng useFocusEffect để lắng nghe và đánh dấu đã đọc khi vào màn hình
    useFocusEffect(
        useCallback(() => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            
            // Tạo truy vấn để lấy thông báo của người dùng, sắp xếp mới nhất lên trên
            const q = query(
                collection(db, "notifications"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );

            // onSnapshot sẽ tự động lắng nghe thay đổi theo thời gian thực
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedNotifications = [];
                querySnapshot.forEach((doc) => {
                    fetchedNotifications.push({ id: doc.id, ...doc.data() });
                });
                setNotifications(fetchedNotifications);
                setLoading(false);

                // Sau khi đã tải, tự động đánh dấu các thông báo này là đã đọc
                markNotificationsAsRead(fetchedNotifications);
            }, (error) => {
                console.error("Lỗi khi lắng nghe thông báo:", error);
                setLoading(false);
            });

            // Hủy lắng nghe khi rời khỏi màn hình để tránh rò rỉ bộ nhớ
            return () => unsubscribe();

        }, [user])
    );
    
    // Hàm để đánh dấu các thông báo là đã đọc
    const markNotificationsAsRead = async (notificationsToMark) => {
        if (!notificationsToMark || notificationsToMark.length === 0) return;

        const unreadNotifications = notificationsToMark.filter(n => !n.read);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifications.forEach(notification => {
            const docRef = doc(db, "notifications", notification.id);
            batch.update(docRef, { read: true });
        });

        try {
            await batch.commit();
            console.log("Đã đánh dấu các thông báo là đã đọc.");
        } catch (error) {
            console.error("Lỗi khi đánh dấu đã đọc:", error);
        }
    };


    const renderItem = ({ item }) => (
        <View style={[styles.notificationItem, !item.read && styles.unreadItem]}>
            <View style={styles.iconContainer}>
                <Ionicons 
                    name={!item.read ? "notifications" : "notifications-outline"} 
                    size={24} 
                    color={!item.read ? COLORS.primary : COLORS.secondary} 
                />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title || 'Thông báo'}</Text>
                <Text style={styles.body}>{item.body || '...'}</Text>
                <Text style={styles.timestamp}>
                    {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString('vi-VN') : ''}
                </Text>
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

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }}/>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>
                        </View>
                    }
                />
            )}
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
        flexGrow: 1,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: COLORS.secondary,
    }
});

export default NotificationScreen;