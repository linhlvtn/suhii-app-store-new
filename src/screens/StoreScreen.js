// src/screens/StoreScreen.js (Code đã được cập nhật)

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Ionicons } from '@expo/vector-icons'; // <-- 1. IMPORT ICON

const PAGE_SIZE = 10;

export default function StoreScreen() {
  const [reports, setReports] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isListEnd, setIsListEnd] = useState(false);

  const fetchReports = async (isRefresh = false) => {
    if (loadingMore) return;
    if (isRefresh) {
      setRefreshing(true);
    } else if (reports.length > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let q = query(
        collection(db, "reports"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (!isRefresh && lastVisible) {
        q = query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }

      const documentSnapshots = await getDocs(q);
      const newReports = documentSnapshots.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (documentSnapshots.empty || newReports.length < PAGE_SIZE) {
        setIsListEnd(true);
      }

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setReports(isRefresh ? newReports : [...reports, ...newReports]);

    } catch (error) {
      console.error("Lỗi tải báo cáo: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = useCallback(() => {
    setIsListEnd(false);
    setLastVisible(null);
    fetchReports(true);
  }, []);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  };

  // --- 2. CẬP NHẬT HÀM RENDERITEM ---
  const renderItem = ({ item }) => (
    <View style={styles.reportCard}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.reportImage} />
      )}
      <View style={styles.reportContent}>
        <Text style={styles.serviceText}>
          Dịch vụ: <Text style={styles.boldText}>{item.service}</Text>
        </Text>
        <Text style={styles.priceText}>
          Giá tiền:{" "}
          <Text style={styles.boldText}>
            {item.price.toLocaleString("vi-VN")} VNĐ
          </Text>
        </Text>
        {item.note && <Text style={styles.noteText}>Ghi chú: {item.note}</Text>}
        <View style={styles.footer}>
            {/* THAY THẾ TEXT BẰNG ICON VÀ TEXT */}
            <View style={styles.userContainer}>
                <Ionicons name="person-outline" size={14} color="#555" style={{ marginRight: 5 }} />
                <Text style={styles.userText}>
                    {item.employeeName || item.userName || 'Không rõ'}
                </Text>
            </View>
            <Text style={styles.dateText}>
                {item.createdAt?.toDate().toLocaleDateString("vi-VN")}
            </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <FlatList
      data={reports}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      onEndReached={() => !isListEnd && fetchReports()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.centerContainer}>
            <Text>Chưa có báo cáo nào.</Text>
        </View>
      }
    />
  );
}

// --- 3. CẬP NHẬT STYLES ---
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100,
  },
  reportCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  reportImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  reportContent: {
    padding: 15,
  },
  serviceText: {
    fontSize: 16,
    color: '#333',
  },
  priceText: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      paddingTop: 10,
  },
  // Style mới cho container chứa icon và text
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
      fontSize: 14,
      color: '#555',
      fontWeight: 'bold', // Làm cho tên đậm hơn một chút
  },
  dateText: {
    fontSize: 12,
    color: "#888",
  },
});