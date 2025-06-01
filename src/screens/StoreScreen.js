// src/screens/StoreScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl, // Để kéo xuống làm mới
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // useFocusEffect để refresh khi quay lại
import { db, auth } from '../../firebaseConfig'; // Import db và auth
import { collection, query, orderBy, limit, getDocs, startAfter, where } from 'firebase/firestore'; // Firestore query

const ITEMS_PER_PAGE = 10; // Số lượng báo cáo mỗi lần tải

const StoreScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState([]);
  const [lastVisible, setLastVisible] = useState(null); // Document cuối cùng của lượt tải trước
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Trạng thái làm mới kéo xuống
  const [hasMore, setHasMore] = useState(true); // Kiểm tra còn dữ liệu để tải nữa không

  // Hàm định dạng số tiền thành chuỗi có dấu chấm
  const formatCurrency = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Hàm tải báo cáo từ Firestore
  const fetchReports = async (isRefresh = false, initialLoad = false) => {
    if (loading || (loadingMore && !isRefresh)) return; // Tránh tải kép

    if (initialLoad) {
      setLoading(true);
      setReports([]);
      setLastVisible(null);
      setHasMore(true);
    } else if (!isRefresh && !hasMore) {
      return; // Không còn dữ liệu để tải
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }

    const reportsCollectionRef = collection(db, 'reports');
    let q;

    if (isRefresh || initialLoad) {
      q = query(
        reportsCollectionRef,
        where('userId', '==', currentUser.uid), // Chỉ lấy báo cáo của nhân viên hiện tại
        orderBy('createdAt', 'desc'), // Sắp xếp theo thời gian tạo mới nhất lên đầu
        limit(ITEMS_PER_PAGE)
      );
    } else {
      setLoadingMore(true);
      q = query(
        reportsCollectionRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible), // Bắt đầu từ document cuối cùng của lượt trước
        limit(ITEMS_PER_PAGE)
      );
    }

    try {
      const documentSnapshots = await getDocs(q);
      const fetchedReports = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (isRefresh || initialLoad) {
        setReports(fetchedReports);
      } else {
        setReports(prevReports => [...prevReports, ...fetchedReports]);
      }

      if (documentSnapshots.docs.length < ITEMS_PER_PAGE) {
        setHasMore(false); // Không còn đủ dữ liệu để tải nữa
      } else {
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      }
    } catch (error) {
      console.error('Lỗi khi tải báo cáo:', error);
      Alert.alert('Lỗi', 'Không thể tải báo cáo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Sử dụng useFocusEffect để tải lại dữ liệu khi màn hình được focus (ví dụ: quay lại từ CreateReportScreen)
  useFocusEffect(
    useCallback(() => {
      fetchReports(false, true); // Tải lại hoàn toàn khi màn hình được focus
    }, [])
  );

  // Xử lý kéo xuống để làm mới
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports(true, false);
  }, []);

  // Component hiển thị mỗi item báo cáo
  const renderReportItem = ({ item }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportPrice}>{formatCurrency(item.price)} VNĐ</Text>
        <Text style={styles.reportService}>{item.service}</Text>
      </View>
      {item.note ? <Text style={styles.reportNote}>Ghi chú: {item.note}</Text> : null}
      <Text style={styles.reportPaymentMethod}>Thanh toán: {item.paymentMethod}</Text>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.reportImage} />
      )}
      <Text style={styles.reportDate}>
        Ngày: {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString('vi-VN') : 'Đang cập nhật...'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Nút nổi bật để tạo báo cáo mới - Đặt ở trên cùng hoặc một vị trí cố định */}
      <TouchableOpacity
        style={styles.createReportButtonFixed} // Đổi style để cố định
        onPress={() => navigation.navigate('CreateReport')}
      >
        <Text style={styles.createReportButtonText}>+ Tạo Báo cáo Mới</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.reportListContent}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              fetchReports(); // Tải thêm khi cuộn đến cuối
            }
          }}
          onEndReachedThreshold={0.5} // Khi còn 50% nữa là đến cuối thì bắt đầu tải
          ListEmptyComponent={
            <Text style={styles.emptyListText}>Chưa có báo cáo nào. Hãy tạo cái đầu tiên!</Text>
          }
          ListFooterComponent={() => (
            loadingMore ? <ActivityIndicator size="small" color="#007bff" style={styles.footerLoading} /> : null
          )}
          refreshControl={ // Kéo xuống để làm mới
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  createReportButtonFixed: { // Style mới cho nút nổi bật cố định
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
    marginVertical: 15, // Khoảng cách từ trên
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createReportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportListContent: {
    paddingHorizontal: 15,
    paddingBottom: 80, // Để tránh nút nổi bật che mất nội dung cuối
  },
  reportItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745', // Màu xanh lá cây cho giá tiền
  },
  reportService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007bff',
  },
  reportNote: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  reportPaymentMethod: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    resizeMode: 'cover',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  footerLoading: {
    marginVertical: 20,
  },
});

export default StoreScreen;