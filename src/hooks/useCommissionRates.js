// src/hooks/useCommissionRates.js

import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Đảm bảo đường dẫn đến firebaseConfig.js là đúng

export const useCommissionRates = () => {
  const [commissionRates, setCommissionRates] = useState({
    defaultRevenuePercentage: 10, // Giá trị mặc định nếu chưa tải được
    overtimePercentage: 30,      // Giá trị mặc định nếu chưa tải được
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'commission_rates');

    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCommissionRates({
            defaultRevenuePercentage: data.defaultRevenuePercentage || 10,
            overtimePercentage: data.overtimePercentage || 30,
            isLoading: false,
            error: null,
          });
        } else {
          // Nếu tài liệu không tồn tại, sử dụng mặc định và thông báo
          console.warn("Commission rates document not found in Firestore. Using default values (10%, 30%).");
          setCommissionRates({
            defaultRevenuePercentage: 10,
            overtimePercentage: 30,
            isLoading: false,
            error: null,
          });
        }
      }, 
      (error) => {
        console.error("Error fetching commission rates:", error);
        setCommissionRates(prev => ({
          ...prev,
          isLoading: false,
          error: error,
        }));
      }
    );

    // Hủy đăng ký lắng nghe khi component unmount
    return () => unsubscribe();
  }, []);

  return commissionRates;
};