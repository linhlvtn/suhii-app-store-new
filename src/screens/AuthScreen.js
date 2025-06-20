// src/screens/AuthScreen.js

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
} from 'react-native';
import { auth, db } from '../../firebaseConfig'; // <-- Import 'db'
import { doc, setDoc } from 'firebase/firestore'; // <-- Import 'doc' và 'setDoc'

const AuthScreen = () => {
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [employeeName, setEmployeeName] = useState('');

    // Hàm xử lý đăng ký tài khoản (đã cập nhật)
    const handleSignUp = async () => {
        if (!employeeName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên nhân viên.');
            return;
        }

        if (!phoneNumber || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        const emailForFirebase = `${phoneNumber}@suhii.app`;
        setLoading(true);
        try {
            // Tạo tài khoản mới trong Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, emailForFirebase, password);
            const user = userCredential.user;

            if (user) {
                // Cập nhật tên hiển thị (displayName) cho tài khoản Auth
                await updateProfile(user, {
                    displayName: employeeName.trim(),
                });

                // Tạo một bản ghi người dùng mới trong Firestore collection 'users'
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: employeeName.trim(),
                    email: user.email, // Lưu email được tạo từ số điện thoại
                    role: 'employee', // Mặc định tất cả các tài khoản đăng ký là 'employee'
                    createdAt: new Date(), // Thêm thời gian tạo để tiện theo dõi
                });

                Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
                // Reset các trường
                setPassword('');
                setPhoneNumber('');
                setEmployeeName('');
                setIsSignUp(false);
            }
        } catch (error) {
            let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Số điện thoại này đã được sử dụng. Vui lòng đăng nhập hoặc dùng số khác.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Số điện thoại không hợp lệ.';
            }
            Alert.alert('Lỗi đăng ký', errorMessage);
            console.error('Lỗi đăng ký:', error);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý đăng nhập (GIỮ NGUYÊN)
    const handleSignIn = async () => {
        if (!phoneNumber || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu.');
            return;
        }

        const emailForFirebase = `${phoneNumber}@suhii.app`;
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, emailForFirebase, password);
            // Alert.alert('Thành công', 'Đăng nhập thành công!'); // Không cần alert khi có điều hướng tự động
            // State sẽ được reset bởi listener trong App.js
        } catch (error) {
            let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại số điện thoại và mật khẩu.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Số điện thoại hoặc mật khẩu không đúng.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'Tài khoản của bạn đã bị vô hiệu hóa.';
            }
            Alert.alert('Lỗi đăng nhập', errorMessage);
            console.error('Lỗi đăng nhập:', error);
        } finally {
            setLoading(false);
        }
    };

    // Chuyển đổi giữa Đăng nhập và Đăng ký
    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
        // Reset state khi chuyển mode
        setPassword('');
        setPhoneNumber('');
        setEmployeeName('');
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>
                {isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập'}
            </Text>

            {isSignUp && (
                <TextInput
                    style={styles.input}
                    placeholder="Tên nhân viên"
                    value={employeeName}
                    onChangeText={setEmployeeName}
                    autoCapitalize="words"
                />
            )}

            <TextInput
                style={styles.input}
                placeholder="Số điện thoại (dùng làm tên đăng nhập)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
            />
            <TextInput
                style={styles.input}
                placeholder="Mật khẩu (ít nhất 6 ký tự)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={isSignUp ? handleSignUp : handleSignIn}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>
                        {isSignUp ? 'Đăng ký' : 'Đăng nhập'}
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.switchButton}
                onPress={toggleAuthMode}
            >
                <Text style={styles.switchButtonText}>
                    {isSignUp
                        ? 'Bạn đã có tài khoản? Đăng nhập'
                        : 'Bạn chưa có tài khoản? Đăng ký'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    input: {
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    button: {
        width: '100%',
        padding: 15,
        backgroundColor: '#007bff',
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        marginTop: 20,
        padding: 10,
    },
    switchButtonText: {
        color: '#007bff',
        fontSize: 16,
    },
});

export default AuthScreen;