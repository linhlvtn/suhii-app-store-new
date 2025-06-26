// admin_panel_web/script.js

// 1. Cấu hình Firebase
// Lấy cấu hình từ firebaseConfig.js của project React Native của bạn
// Bạn có thể mở firebaseConfig.js để copy phần này
const firebaseConfig = {
apiKey: "AIzaSyDGfe3AO839u9-2Esm4xBu9_vR_guS5qHo",
    authDomain: "suhii-ef849.firebaseapp.com",
    projectId: "suhii-ef849",
    storageBucket: "suhii-ef849.appspot.com", // Sửa lại tên bucket cho đúng chuẩn
    messagingSenderId: "444753173579",
    appId: "1:444753173579:web:2db658f708e93bafe181ce"
    // databaseURL: "https://<YOUR_DATABASE_NAME>.firebaseio.com", // Chỉ cần nếu dùng Realtime Database
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Lấy tham chiếu đến các dịch vụ Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions(); // Lấy tham chiếu đến Cloud Functions

// Kiểm tra xem functions emulator có đang chạy không (chỉ dùng khi phát triển local)
// if (location.hostname === "localhost") {
//     functions.useEmulator("localhost", 5001); // Cổng mặc định của Functions emulator
// }


// 2. Lấy tham chiếu đến các phần tử DOM
const authSection = document.getElementById('auth-section');
const adminDashboard = document.getElementById('admin-dashboard');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const authStatus = document.getElementById('auth-status');
const adminDisplayName = document.getElementById('admin-display-name');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const usersTableBody = document.querySelector('#users-table tbody');
const refreshUsersBtn = document.getElementById('refresh-users-btn');
const usersStatus = document.getElementById('users-status');
const backupDataBtn = document.getElementById('backup-data-btn');
const deleteAllDataBtn = document.getElementById('delete-all-data-btn');
const toolStatus = document.getElementById('tool-status');


// 3. Hàm hiển thị trạng thái
const showStatus = (element, message, isError = false) => {
    element.textContent = message;
    element.className = isError ? 'error' : 'success';
    if (!isError) {
        setTimeout(() => element.textContent = '', 3000); // Xóa thông báo thành công sau 3 giây
    }
};

// 4. Xử lý Đăng nhập/Đăng xuất
adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    adminLoginBtn.disabled = true;
    showStatus(authStatus, 'Đang đăng nhập...');

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.';
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Email hoặc mật khẩu không đúng.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Tài khoản của bạn đã bị vô hiệu hóa.';
        }
        showStatus(authStatus, errorMessage, true);
        console.error("Lỗi đăng nhập:", error);
    } finally {
        adminLoginBtn.disabled = false;
    }
});

adminLogoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    showAdminDashboard(false);
    showStatus(authStatus, 'Đã đăng xuất.', false);
});

// 5. Hàm hiển thị/ẩn Dashboard Admin
const showAdminDashboard = async (loggedIn) => {
    if (loggedIn) {
        authSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        adminDisplayName.textContent = auth.currentUser.email; // Hiển thị email hoặc displayName
        await loadUsers(); // Tải danh sách người dùng khi đăng nhập
    } else {
        authSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
    }
};

// 6. Theo dõi trạng thái đăng nhập Firebase
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Kiểm tra vai trò của người dùng trong Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            showAdminDashboard(true);
            showStatus(authStatus, 'Đăng nhập thành công với vai trò Admin.', false);
        } else {
            // Nếu không phải admin, đăng xuất và hiển thị lỗi
            await auth.signOut();
            showAdminDashboard(false);
            showStatus(authStatus, 'Bạn không có quyền truy cập Admin Panel.', true);
        }
    } else {
        showAdminDashboard(false);
    }
});

// 7. Tải danh sách người dùng (Chỉ Admin)
refreshUsersBtn.addEventListener('click', loadUsers); // Gắn sự kiện cho nút làm mới

async function loadUsers() {
    showStatus(usersStatus, 'Đang tải danh sách người dùng...');
    usersTableBody.innerHTML = ''; // Xóa các hàng cũ

    try {
        const snapshot = await db.collection('users').get();
        if (snapshot.empty) {
            showStatus(usersStatus, 'Không có người dùng nào.', false);
            return;
        }

        snapshot.forEach(doc => {
            const userData = doc.data();
            const row = usersTableBody.insertRow();
            row.insertCell(0).textContent = userData.displayName || 'N/A';
            row.insertCell(1).textContent = userData.email || 'N/A';

            // Dropdown cho vai trò
            const roleCell = row.insertCell(2);
            const roleSelect = document.createElement('select');
            roleSelect.innerHTML = `
                <option value="employee" ${userData.role === 'employee' ? 'selected' : ''}>Employee</option>
                <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>Admin</option>
            `;
            // Không cho phép admin tự thay đổi vai trò của mình hoặc vai trò của admin gốc
            if (doc.id === auth.currentUser.uid || userData.email === 'admin@suhii.app') { // Giả sử admin@suhii.app là admin gốc không đổi
                roleSelect.disabled = true;
            }
            roleSelect.addEventListener('change', async (e) => {
                const newRole = e.target.value;
                showStatus(usersStatus, `Đang cập nhật vai trò cho ${userData.displayName || userData.email}...`);
                try {
                    // Gọi Cloud Function để cập nhật vai trò (an toàn hơn)
                    const updateRoleFunction = functions.httpsCallable('updateUserRole'); // Tên Cloud Function
                    const result = await updateRoleFunction({ uid: doc.id, role: newRole });
                    
                    if (result.data.success) {
                        showStatus(usersStatus, `Đã cập nhật vai trò cho ${userData.displayName || userData.email} thành ${newRole}.`, false);
                        // Cập nhật lại displayName nếu cần thiết
                        if (result.data.displayName) {
                            userData.displayName = result.data.displayName; // Cập nhật lại dữ liệu local
                            row.cells[0].textContent = result.data.displayName;
                        }
                    } else {
                        showStatus(usersStatus, `Lỗi: ${result.data.error}`, true);
                    }
                } catch (error) {
                    showStatus(usersStatus, `Lỗi cập nhật vai trò: ${error.message}`, true);
                    console.error("Lỗi cập nhật vai trò:", error);
                }
            });
            roleCell.appendChild(roleSelect);

            // Nút xóa người dùng (chỉ admin có thể xóa người khác, không xóa mình)
            const actionsCell = row.insertCell(3);
            if (doc.id !== auth.currentUser.uid) { // Không cho phép tự xóa tài khoản của mình
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${userData.displayName || userData.email}?`)) {
                        showStatus(usersStatus, `Đang xóa người dùng ${userData.displayName || userData.email}...`);
                        try {
                            // Gọi Cloud Function để xóa người dùng (an toàn hơn)
                            const deleteUserFunction = functions.httpsCallable('deleteUser'); // Tên Cloud Function
                            const result = await deleteUserFunction({ uid: doc.id });

                            if (result.data.success) {
                                showStatus(usersStatus, `Đã xóa người dùng ${userData.displayName || userData.email}.`, false);
                                row.remove(); // Xóa hàng khỏi bảng
                            } else {
                                showStatus(usersStatus, `Lỗi: ${result.data.error}`, true);
                            }
                        } catch (error) {
                            showStatus(usersStatus, `Lỗi xóa người dùng: ${error.message}`, true);
                            console.error("Lỗi xóa người dùng:", error);
                        }
                    }
                });
                actionsCell.appendChild(deleteBtn);
            }
        });
        showStatus(usersStatus, 'Đã tải danh sách người dùng.', false);
    } catch (error) {
        showStatus(usersStatus, `Lỗi tải danh sách người dùng: ${error.message}`, true);
        console.error("Lỗi tải danh sách người dùng:", error);
    }
}

// 8. Xử lý nút Backup/Delete All Data
backupDataBtn.addEventListener('click', async () => {
    if (confirm("Bạn có chắc chắn muốn SAO LƯU toàn bộ dữ liệu? Quá trình này có thể mất một lúc.")) {
        showStatus(toolStatus, 'Đang sao lưu dữ liệu...', false);
        backupDataBtn.disabled = true;
        try {
            const backupFunction = functions.httpsCallable('backupFirestore'); // Tên Cloud Function
            const result = await backupFunction();

            if (result.data.success) {
                showStatus(toolStatus, 'Sao lưu dữ liệu thành công! Vui lòng kiểm tra Cloud Storage.', false);
            } else {
                showStatus(toolStatus, `Lỗi sao lưu: ${result.data.error}`, true);
            }
        } catch (error) {
            showStatus(toolStatus, `Lỗi gọi chức năng sao lưu: ${error.message}`, true);
            console.error("Lỗi sao lưu dữ liệu:", error);
        } finally {
            backupDataBtn.disabled = false;
        }
    }
});

deleteAllDataBtn.addEventListener('click', async () => {
    if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU của ứng dụng? Hành động này không thể hoàn tác!")) {
        const confirmText = prompt("Vui lòng gõ 'XOA HET DU LIEU' để xác nhận:");
        if (confirmText === "XOA HET DU LIEU") {
            showStatus(toolStatus, 'Đang xóa toàn bộ dữ liệu...', true); // Dùng màu đỏ cho hành động nguy hiểm
            deleteAllDataBtn.disabled = true;
            try {
                const deleteFunction = functions.httpsCallable('deleteAllFirestoreData'); // Tên Cloud Function
                const result = await deleteFunction();

                if (result.data.success) {
                    showStatus(toolStatus, 'Đã xóa toàn bộ dữ liệu thành công!', false);
                    await loadUsers(); // Làm mới danh sách người dùng sau khi xóa (nếu còn admin)
                } else {
                    showStatus(toolStatus, `Lỗi xóa dữ liệu: ${result.data.error}`, true);
                }
            } catch (error) {
                showStatus(toolStatus, `Lỗi gọi chức năng xóa: ${error.message}`, true);
                console.error("Lỗi xóa toàn bộ dữ liệu:", error);
            } finally {
                deleteAllDataBtn.disabled = false;
            }
        } else {
            showStatus(toolStatus, 'Xác nhận không đúng. Đã hủy xóa.', true);
        }
    }
});