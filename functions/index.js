// // // functions/index.js

// // functions/index.js

// const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
// const { getFirestore, Timestamp } = require("firebase-admin/firestore");
// const { initializeApp } = require("firebase-admin/app");
// const logger = require("firebase-functions/logger");

// // Khởi tạo Firebase Admin
// initializeApp();

// /**
//  * Tạo một bản ghi thông báo trong collection 'notifications'
//  * cho tất cả người dùng có vai trò 'admin'.
//  * Kích hoạt khi có báo cáo mới được tạo.
//  */
// exports.createAdminNotificationOnNewReport = onDocumentCreated("reports/{reportId}", async (event) => {
//   logger.info("Triggered: New report created, ID:", event.params.reportId);

//   const newReport = event.data.data();

//   // Chỉ tạo thông báo nếu báo cáo đang ở trạng thái "chờ duyệt"
//   if (newReport.status !== "pending") {
//     logger.info("Báo cáo không ở trạng thái 'pending', bỏ qua.");
//     return null;
//   }

//   const employeeName = newReport.employeeName || "Một nhân viên";
//   const db = getFirestore();

//   try {
//     // Tìm tất cả các admin
//     const adminQuery = db.collection("users").where("role", "==", "admin");
//     const adminSnapshot = await adminQuery.get();

//     if (adminSnapshot.empty) {
//       logger.info("Không tìm thấy tài khoản admin nào để tạo thông báo.");
//       return null;
//     }

//     // Tạo một batch để ghi nhiều document cùng lúc cho hiệu quả
//     const batch = db.batch();
//     const notificationPayload = {
//         title: "Báo cáo mới cần duyệt",
//         body: `${employeeName} vừa tạo một báo cáo mới.`,
//         createdAt: Timestamp.now(),
//         read: false,
//     };

//     adminSnapshot.forEach((adminDoc) => {
//         const adminId = adminDoc.id;
//         const notificationRef = db.collection("notifications").doc(); // Tạo một ID ngẫu nhiên
//         batch.set(notificationRef, {
//             ...notificationPayload,
//             userId: adminId, // Gán thông báo cho admin này
//         });
//     });

//     // Thực thi batch write
//     await batch.commit();
//     logger.info(`Đã tạo ${adminSnapshot.size} thông báo cho admin.`);

//   } catch (error) {
//     logger.error("Lỗi khi tạo thông báo cho admin:", error);
//   }

//   return null;
// });


// /**
//  * Tạo một bản ghi thông báo cho nhân viên khi báo cáo của họ được cập nhật.
//  * Kích hoạt khi trạng thái báo cáo thay đổi.
//  */
// exports.createEmployeeNotificationOnUpdate = onDocumentUpdated("reports/{reportId}", async (event) => {
//     logger.info("Triggered: Report updated, ID:", event.params.reportId);

//     const dataAfter = event.data.after.data();
//     const dataBefore = event.data.before.data();

//     // Chỉ tạo thông báo nếu 'status' thay đổi từ 'pending'
//     if (dataBefore.status !== 'pending' || dataAfter.status === dataBefore.status) {
//         logger.info("Trạng thái không thay đổi từ 'pending', bỏ qua.");
//         return null;
//     }

//     const userId = dataAfter.userId;
//     if (!userId) {
//         logger.error("Không có userId trong báo cáo.");
//         return null;
//     }

//     try {
//         const statusText = dataAfter.status === 'approved' ? 'được duyệt' : 'bị từ chối';
//         const serviceName = dataAfter.service || "chưa có tên";

//         const notificationPayload = {
//             userId: userId,
//             title: "Báo cáo đã được xử lý",
//             body: `Báo cáo cho dịch vụ "${serviceName}" của bạn đã ${statusText}.`,
//             createdAt: Timestamp.now(),
//             read: false,
//         };

//         await getFirestore().collection("notifications").add(notificationPayload);
//         logger.info(`Đã tạo thông báo cho nhân viên ${userId}`);

//     } catch (error) {
//         logger.error("Lỗi khi tạo thông báo cho nhân viên:", error);
//     }

//     return null;
// });

// // const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
// // const { getFirestore } = require("firebase-admin/firestore");
// // const { initializeApp } = require("firebase-admin/app");
// // const { getMessaging } = require("firebase-admin/messaging");
// // const logger = require("firebase-functions/logger");

// // // Khởi tạo Firebase Admin
// // initializeApp();

// // /**
// //  * Gửi thông báo cho Admin khi có báo cáo mới.
// //  * Kích hoạt khi một document mới được tạo trong collection 'reports'.
// //  */
// // exports.notifyAdminOnNewReport = onDocumentCreated("reports/{reportId}", async (event) => {
// //   logger.info("Function triggered by new report, ID:", event.params.reportId);

// //   const newReport = event.data.data();
// //   const employeeName = newReport.employeeName || "Một nhân viên";

// //   if (newReport.status !== "pending") {
// //     logger.info("Báo cáo không ở trạng thái 'pending', bỏ qua.", { status: newReport.status });
// //     return null;
// //   }

// //   try {
// //     const db = getFirestore();
// //     const usersRef = db.collection("users");
// //     const adminQuery = usersRef.where("role", "==", "admin");
// //     const adminQuerySnapshot = await adminQuery.get();

// //     if (adminQuerySnapshot.empty) {
// //       logger.info("Không tìm thấy tài khoản admin.");
// //       return null;
// //     }

// //     const tokens = [];
// //     adminQuerySnapshot.forEach((doc) => {
// //       if (doc.data().pushToken) {
// //         tokens.push(doc.data().pushToken);
// //       }
// //     });

// //     if (tokens.length === 0) {
// //       logger.info("Không có admin nào có push token.");
// //       return null;
// //     }

// //     const payload = {
// //       notification: {
// //         title: "Báo cáo mới cần duyệt!",
// //         body: `${employeeName} vừa tạo một báo cáo mới. Hãy kiểm tra.`,
// //         sound: "default",
// //       },
// //     };

// //     logger.info(`Gửi thông báo đến ${tokens.length} admin.`);
// //     await getMessaging().sendToDevice(tokens, payload);

// //   } catch (error) {
// //     logger.error("Lỗi khi gửi thông báo cho admin:", error);
// //   }

// //   return null;
// // });


// // /**
// //  * Gửi thông báo cho Nhân viên khi báo cáo của họ được cập nhật.
// //  * Kích hoạt khi một document trong 'reports' được cập nhật.
// //  */
// // exports.notifyEmployeeOnReportUpdate = onDocumentUpdated("reports/{reportId}", async (event) => {
// //     logger.info("Function triggered by report update, ID:", event.params.reportId);

// //     const dataAfter = event.data.after.data();
// //     const dataBefore = event.data.before.data();

// //     // Chỉ gửi thông báo nếu trường 'status' thực sự thay đổi và không còn là 'pending'
// //     if (dataAfter.status === dataBefore.status || dataAfter.status === 'pending') {
// //         logger.info("Trạng thái không thay đổi hoặc vẫn đang chờ, không gửi thông báo.", {
// //             before: dataBefore.status,
// //             after: dataAfter.status
// //         });
// //         return null;
// //     }

// //     const userId = dataAfter.userId;
// //     if (!userId) {
// //         logger.error("Không có userId trong báo cáo, không thể gửi thông báo.");
// //         return null;
// //     }

// //     try {
// //         // Lấy thông tin của nhân viên đã tạo báo cáo
// //         const db = getFirestore();
// //         const userDoc = await db.collection("users").doc(userId).get();

// //         if (!userDoc.exists) {
// //             logger.warn("Không tìm thấy document của user:", userId);
// //             return null;
// //         }

// //         const pushToken = userDoc.data().pushToken;
// //         if (!pushToken) {
// //             logger.info("Nhân viên này không có push token.");
// //             return null;
// //         }

// //         // Tạo nội dung thông báo dựa trên trạng thái mới
// //         const statusText = dataAfter.status === 'approved' ? 'được duyệt' : 'bị từ chối';
// //         const payload = {
// //             notification: {
// //                 title: "Trạng thái báo cáo đã thay đổi",
// //                 body: `Báo cáo của bạn cho dịch vụ "${dataAfter.service || ''}" đã ${statusText}.`,
// //                 sound: "default",
// //             },
// //         };

// //         logger.info(`Gửi thông báo đến nhân viên ${userId}`);
// //         await getMessaging().sendToDevice([pushToken], payload);

// //     } catch (error) {
// //         logger.error("Lỗi khi gửi thông báo cho nhân viên:", error);
// //     }

// //     return null;
// // });