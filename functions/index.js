// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
// const cloudinary = require('cloudinary').v2; // Đã bỏ comment import Cloudinary
console.log('--- STARTING functions/index.js ---')
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth(); // Khởi tạo Firebase Auth Admin SDK

console.log('Firebase Admin SDK initialized.');

// Cấu hình Cloudinary đã được bỏ comment (tạm thời)
// cloudinary.config({
//   cloud_name: functions.config().cloudinary.cloud_name,
//   api_key: functions.config().cloudinary.api_key,
//   api_secret: functions.config().cloudinary.api_secret
// });

// Hàm helper getCloudinaryPublicId đã được bỏ (không còn sử dụng)
// function getCloudinaryPublicId(imageUrl) {
//   const match = imageUrl.match(/\/v\d+\/(.+)\.\w{3,4}$/);
//   return match && match[1] ? match[1] : null;
// }

// 1. Cập nhật vai trò người dùng (không thay đổi)
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // Chỉ cho phép admin thực hiện
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Chỉ admin mới có thể cập nhật vai trò."
    );
  }

  const { uid, role } = data;

  if (!uid || !role || (role !== "admin" && role !== "employee")) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UID hoặc vai trò không hợp lệ."
    );
  }

  try {
    // Cập nhật vai trò trong Custom Claims (Firebase Auth)
    await auth.setCustomUserClaims(uid, { role: role });

    // Cập nhật vai trò trong Firestore (cho mục đích dễ query)
    await db.collection("users").doc(uid).update({ role: role });

    const userRecord = await auth.getUser(uid);

    return {
      success: true,
      message: `Vai trò của người dùng ${uid} đã được cập nhật thành ${role}.`,
      displayName: userRecord.displayName,
    };
  } catch (error) {
    console.error("Lỗi cập nhật vai trò:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Không thể cập nhật vai trò: ${error.message}`
    );
  }
});

// 2. Xóa người dùng và dữ liệu liên quan (Đã loại bỏ phần Cloudinary)
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin" || context.auth.uid === data.uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Chỉ admin mới có thể xóa người dùng khác."
    );
  }

  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UID người dùng không hợp lệ."
    );
  }

  try {
    const batch = db.batch();
    // const imageUrlsToDelete = []; // Đã bỏ nếu không xóa ảnh Cloudinary

    // Xóa tất cả hóa đơn của người dùng này
    const userReportsSnapshot = await db.collection("reports").where("userId", "==", uid).get();
    userReportsSnapshot.docs.forEach((reportDoc) => {
      // if (reportData.imageUrl) { imageUrlsToDelete.push(reportData.imageUrl); } // Đã bỏ
      batch.delete(reportDoc.ref);
    });

    // Xóa tất cả thông báo của người dùng này
    const userNotificationsSnapshot = await db.collection("notifications").where("userId", "==", uid).get();
    userNotificationsSnapshot.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
    });
    
    await batch.commit();

    // Xóa hình ảnh trên Cloudinary (phần này đã bỏ)
    // for (const imageUrl of imageUrlsToDelete) { ... }

    // Xóa tài liệu người dùng khỏi Firestore
    await db.collection("users").doc(uid).delete();

    // Xóa tài khoản người dùng khỏi Firebase Authentication
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.warn(`Tài khoản Firebase Auth của user ${uid} không tồn tại hoặc đã bị xóa.`);
      } else {
        throw authError;
      }
    }
    
    return { success: true, message: `Người dùng ${uid} và dữ liệu liên quan đã được xóa thành công.` };
  } catch (error) {
    console.error("Lỗi xóa người dùng và dữ liệu liên quan:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Không thể xóa người dùng: ${error.message}`
    );
  }
});

exports.deleteReportAndImages = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ admin mới có thể xóa hóa đơn.");
  }

  const { reportId } = data;
  if (!reportId) {
    throw new functions.https.HttpsError("invalid-argument", "Thiếu ID hóa đơn.");
  }

  try {
    const reportRef = db.collection("reports").doc(reportId);
    await reportRef.delete();
    return { success: true, message: "Xóa hóa đơn thành công" };
  } catch (error) {
    console.error("Lỗi xóa hóa đơn:", error);
    throw new functions.https.HttpsError("internal", "Lỗi khi xóa hóa đơn: " + error.message);
  }
});

// 4. Sao lưu Firestore (Không thay đổi)
exports.backupFirestore = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Chỉ admin mới có thể sao lưu dữ liệu."
    );
  }

  const projectId = process.env.GCLOUD_PROJECT;
  const bucketName = "gs://suhii-ef849.appspot.com"; // Thay thế bằng tên Cloud Storage bucket của bạn (lấy từ firebaseConfig của bạn)

  if (!bucketName) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Vui lòng cấu hình Cloud Storage bucket cho backup."
    );
  }

  console.log(`Yêu cầu sao lưu Firestore đã được nhận. Project ID: ${projectId}, Bucket: ${bucketName}`);
  return { success: true, message: "Yêu cầu sao lưu Firestore đã được nhận. Vui lòng kiểm tra Google Cloud Console để xác nhận quá trình backup." };
});

// 5. Xóa toàn bộ dữ liệu Firestore (Không thay đổi, vẫn không xóa Auth/Cloudinary)
exports.deleteAllFirestoreData = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== "admin") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Chỉ admin mới có thể xóa toàn bộ dữ liệu."
        );
    }

    const collectionsToDelete = ['users', 'reports', 'notifications'];

    try {
        for (const collectionName of collectionsToDelete) {
            let queryRef = db.collection(collectionName);
            if (collectionName === 'users') {
                queryRef = queryRef.where('role', '!=', 'admin');
            }

            let snapshot = await queryRef.limit(100).get();
            let deletedCount = 0;

            while (snapshot.size > 0) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                deletedCount += snapshot.size;

                if (snapshot.docs.length > 0) {
                    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                    snapshot = await queryRef.startAfter(lastDoc).limit(100).get();
                } else {
                    snapshot = { size: 0 };
                }
            }
            console.log(`Đã xóa ${deletedCount} tài liệu từ collection: ${collectionName}`);
        }
        return { success: true, message: "Đã xóa toàn bộ dữ liệu Firestore (trừ admin) thành công." };
    } catch (error) {
        console.error("Lỗi khi xóa toàn bộ dữ liệu Firestore:", error);
        throw new functions.https.HttpsError(
            "internal",
            `Không thể xóa toàn bộ dữ liệu: ${error.message}`
        );
    }
});