// functions/index.js (Ví dụ cơ bản)

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 1. Cập nhật vai trò người dùng
exports.updateUserRole = functions.https.onCall(async (data, context) => {
  // Chỉ cho phép admin thực hiện
  if (context.auth.token.role !== "admin") {
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
    await admin.auth().setCustomUserClaims(uid, { role: role });

    // Cập nhật vai trò trong Firestore (cho mục đích dễ query)
    await db.collection("users").doc(uid).update({ role: role });

    // Tùy chọn: Lấy lại thông tin user để cập nhật lại displayName nếu muốn
    const userRecord = await admin.auth().getUser(uid);

    return {
      success: true,
      message: `Vai trò của người dùng ${uid} đã được cập nhật thành ${role}.`,
      displayName: userRecord.displayName, // Trả về displayName để cập nhật trên UI
    };
  } catch (error) {
    console.error("Lỗi cập nhật vai trò:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Không thể cập nhật vai trò: ${error.message}`
    );
  }
});

// 2. Xóa người dùng và dữ liệu liên quan
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Chỉ cho phép admin thực hiện và không được tự xóa chính mình
  if (context.auth.token.role !== "admin" || context.auth.uid === data.uid) {
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
    // Xóa tài khoản người dùng khỏi Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Xóa tài liệu người dùng khỏi Firestore
    await db.collection("users").doc(uid).delete();

    // Tùy chọn: Xóa tất cả báo cáo của người dùng này
    const userReportsRef = db.collection("reports").where("userId", "==", uid);
    const snapshot = await userReportsRef.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { success: true, message: `Người dùng ${uid} đã được xóa thành công.` };
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Không thể xóa người dùng: ${error.message}`
    );
  }
});

// 3. Sao lưu Firestore (Chỉ có trên gói Blaze và cần cấu hình Google Cloud Storage)
// Hướng dẫn chi tiết: https://firebase.google.com/docs/firestore/manage-data/export-import
// Hàm này thường được kích hoạt bằng lịch trình (Cloud Scheduler) hoặc HTTP request từ Admin Panel
exports.backupFirestore = functions.https.onCall(async (data, context) => {
  // Chỉ cho phép admin thực hiện
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Chỉ admin mới có thể sao lưu dữ liệu."
    );
  }

  const projectId = process.env.GCLOUD_PROJECT;
  const bucketName = "gs://YOUR_BACKUP_BUCKET_NAME"; // Thay thế bằng tên Cloud Storage bucket của bạn

  if (!bucketName) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Vui lòng cấu hình Cloud Storage bucket cho backup."
    );
  }

  const client = new admin.firestore.v1.FirestoreAdminClient();
  const databaseName = client.databasePath(projectId, "(default)");

  try {
    const responses = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: bucketName,
      // collectionIds: [], // Để trống để backup tất cả các collection
    });
    const operation = responses[0];
    console.log(`Bắt đầu hoạt động sao lưu: ${operation.name}`);
    return { success: true, message: "Quá trình sao lưu đã được bắt đầu." };
  } catch (error) {
    console.error("Lỗi khi bắt đầu sao lưu Firestore:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Không thể bắt đầu sao lưu: ${error.message}`
    );
  }
});

// 4. Xóa toàn bộ dữ liệu Firestore (CỰC KỲ NGUY HIỂM)
// Hàm này không nên được gọi thường xuyên và cần bảo mật cực cao
exports.deleteAllFirestoreData = functions.https.onCall(async (data, context) => {
    // Chỉ cho phép admin thực hiện
    if (context.auth.token.role !== "admin") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Chỉ admin mới có thể xóa toàn bộ dữ liệu."
        );
    }

    const collectionsToDelete = ['users', 'reports', 'notifications']; // Thêm tất cả các collection của bạn vào đây

    try {
        for (const collectionName of collectionsToDelete) {
            const collectionRef = db.collection(collectionName);
            const snapshot = await collectionRef.limit(100).get(); // Xóa từng đợt 100 docs
            while (snapshot.size > 0) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                // Lấy các tài liệu tiếp theo
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                snapshot = await collectionRef.startAfter(lastDoc).limit(100).get();
            }
            console.log(`Đã xóa collection: ${collectionName}`);
        }
        return { success: true, message: "Đã xóa toàn bộ dữ liệu Firestore thành công." };
    } catch (error) {
        console.error("Lỗi khi xóa toàn bộ dữ liệu Firestore:", error);
        throw new functions.https.HttpsError(
            "internal",
            `Không thể xóa toàn bộ dữ liệu: ${error.message}`
        );
    }
});