// src/screens/AuthScreen.js

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
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
} from 'react-native';
import { auth } from '../../firebaseConfig'; // Import `auth` từ file cấu hình Firebase của bạn

const AuthScreen = () => {
  // eslint-disable-next-line no-unused-vars
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true); // true = Đăng ký, false = Đăng nhập
  const [loading, setLoading] = useState(false); // Trạng thái loading khi xử lý
  const [phoneNumber, setPhoneNumber] = useState(''); // Thêm state cho số điện thoại

  // Hàm xử lý đăng ký tài khoản
  const handleSignUp = async () => {
    // Firebase yêu cầu định dạng email để đăng ký.
    // Chúng ta sẽ dùng số điện thoại làm "tên đăng nhập" và ghép với một domain giả.
    // Ví dụ: 0987654321@suhii.app
    if (!phoneNumber || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    const emailForFirebase = `${phoneNumber}@suhii.app`; // Tạo email giả từ số điện thoại
    setLoading(true);
    try {
      // Tạo tài khoản mới với email và mật khẩu
      await createUserWithEmailAndPassword(auth, emailForFirebase, password);
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setIsSignUp(false); // Chuyển sang chế độ đăng nhập sau khi đăng ký thành công
    } catch (error) {
      let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Số điện thoại này đã được sử dụng. Vui lòng đăng nhập hoặc dùng số khác.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Số điện thoại không hợp lệ.';
      }
      Alert.alert('Lỗi đăng ký', errorMessage + ` (Mã lỗi: ${error.code})`);
      console.error('Lỗi đăng ký:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý đăng nhập
  const handleSignIn = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    const emailForFirebase = `${phoneNumber}@suhii.app`; // Tạo email giả từ số điện thoại
    setLoading(true);
    try {
      // Đăng nhập với email và mật khẩu
      await signInWithEmailAndPassword(auth, emailForFirebase, password);
      Alert.alert('Thành công', 'Đăng nhập thành công!');
      // Ở đây, bạn sẽ điều hướng người dùng đến màn hình chính của ứng dụng
      // (Chúng ta sẽ làm điều này ở bước tiếp theo với React Navigation)
      setEmail('');
      setPassword('');
      setPhoneNumber('');
    } catch (error) {
      let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại số điện thoại và mật khẩu.';
      if (error.code === 'auth/invalid-credential') {
         errorMessage = 'Số điện thoại hoặc mật khẩu không đúng.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tài khoản của bạn đã bị vô hiệu hóa.';
      }
      Alert.alert('Lỗi đăng nhập', errorMessage + ` (Mã lỗi: ${error.code})`);
      console.error('Lỗi đăng nhập:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Số điện thoại (dùng làm tên đăng nhập)"
        keyboardType="phone-pad" // Bàn phím số điện thoại
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu (ít nhất 6 ký tự)"
        secureTextEntry // Ẩn mật khẩu
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={isSignUp ? handleSignUp : handleSignIn}
        disabled={loading} // Vô hiệu hóa nút khi đang xử lý
      >
        {loading ? (
          <ActivityIndicator color="#fff" /> // Hiển thị vòng quay loading
        ) : (
          <Text style={styles.buttonText}>
            {isSignUp ? 'Đăng ký' : 'Đăng nhập'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.switchButtonText}>
          {isSignUp
            ? 'Bạn đã có tài khoản? Đăng nhập'
            : 'Bạn chưa có tài khoản? Đăng ký'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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