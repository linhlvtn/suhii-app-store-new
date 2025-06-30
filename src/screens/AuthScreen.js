// src/screens/AuthScreen.js

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import { useState, useRef, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient'; // npm install expo-linear-gradient

const { width, height } = Dimensions.get('window');

// Floating Avatar Component
const FloatingAvatar = ({ avatar, style, animationDelay = 0 }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 8000,
                    useNativeDriver: true,
                })
            ).start();
        };

        const timer = setTimeout(startAnimation, animationDelay);
        return () => clearTimeout(timer);
    }, [floatAnim, rotateAnim, animationDelay]);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20],
    });

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View
            style={[
                styles.floatingAvatar,
                style,
                {
                    transform: [
                        { translateY },
                        { rotate },
                    ],
                },
            ]}
        >
            <Text style={styles.avatarText}>{avatar}</Text>
        </Animated.View>
    );
};

const AuthScreen = () => {
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Animation values
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        // Initial animation
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Animate form transition
    const animateFormTransition = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

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
            const userCredential = await createUserWithEmailAndPassword(auth, emailForFirebase, password);
            const user = userCredential.user;

            if (user) {
                await updateProfile(user, {
                    displayName: employeeName.trim(),
                });

                await setDoc(doc(db, 'users', user.uid), {
                    displayName: employeeName.trim(),
                    email: user.email,
                    role: 'employee',
                    createdAt: new Date(),
                });

                Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
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

    const handleSignIn = async () => {
        if (!phoneNumber || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu.');
            return;
        }

        const emailForFirebase = `${phoneNumber}@suhii.app`;
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, emailForFirebase, password);
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

    const toggleAuthMode = () => {
        animateFormTransition();
        setTimeout(() => {
            setIsSignUp(!isSignUp);
            setPassword('');
            setPhoneNumber('');
            setEmployeeName('');
        }, 150);
    };

    const slideY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
    });

    return (
        <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.container}
        >
            {/* Floating Avatars */}
            <FloatingAvatar
                avatar="👨‍💼"
                style={styles.avatar1}
                animationDelay={0}
            />
            <FloatingAvatar
                avatar="👩‍💻"
                style={styles.avatar2}
                animationDelay={1000}
            />
            <FloatingAvatar
                avatar="👨‍🔧"
                style={styles.avatar3}
                animationDelay={2000}
            />

            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />

            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.formContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideY },
                                { scale: scaleAnim },
                            ],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.welcomeText}>
                            {isSignUp ? "Tạo tài khoản mới" : "Suhii Nail Room"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isSignUp 
                                ? "Đăng ký để bắt đầu hành trình của bạn"
                                : "Hệ thống quản lý cửa hàng"
                            }
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContent}>
                        {isSignUp && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Tên nhân viên</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập tên của bạn"
                                    placeholderTextColor="#9a9a9a"
                                    value={employeeName}
                                    onChangeText={setEmployeeName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Số điện thoại</Text>
                            <View style={styles.phoneInputContainer}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>🇻🇳 +84</Text>
                                </View>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="Nhập số điện thoại"
                                    placeholderTextColor="#9a9a9a"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Mật khẩu</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Nhập mật khẩu"
                                    placeholderTextColor="#9a9a9a"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeIcon}>
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* {!isSignUp && (
                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>
                                    Quên mật khẩu?
                                </Text>
                            </TouchableOpacity>
                        )} */}

                        <TouchableOpacity
                            style={[styles.mainButton, loading && styles.mainButtonDisabled]}
                            onPress={isSignUp ? handleSignUp : handleSignIn}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.mainButtonText}>
                                    {isSignUp ? 'Đăng ký' : 'Đăng nhập'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* <View style={styles.switchContainer}>
                            <Text style={styles.switchText}>
                                {isSignUp
                                    ? 'Đã có tài khoản? '
                                    : 'Chưa có tài khoản? '}
                            </Text>
                            <TouchableOpacity onPress={toggleAuthMode}>
                                <Text style={styles.switchButtonText}>
                                    {isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}
                                </Text>
                            </TouchableOpacity>
                        </View> */}
                    </View>
                </Animated.View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    formContainer: {
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        borderRadius: 24,
        padding: 24,
        marginTop: 60,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#a0a0a0',
        textAlign: 'center',
        lineHeight: 22,
    },
    formContent: {
        gap: 20,
    },
    inputContainer: {
        marginBottom: 4,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e0e0e0',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(60, 60, 80, 0.8)',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(60, 60, 80, 0.8)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
    },
    countryCode: {
        backgroundColor: 'rgba(80, 80, 100, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 16,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
    },
    countryCodeText: {
        fontSize: 16,
        color: '#ffffff',
    },
    phoneInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
    },
    passwordContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(60, 60, 80, 0.8)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
    },
    eyeButton: {
        padding: 16,
    },
    eyeIcon: {
        fontSize: 20,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: -8,
    },
    forgotPasswordText: {
        color: '#64b5f6',
        fontSize: 14,
        fontWeight: '500',
    },
    mainButton: {
        backgroundColor: '#373a65',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#373a65',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    mainButtonDisabled: {
        backgroundColor: '#606060',
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    switchText: {
        color: '#a0a0a0',
        fontSize: 14,
    },
    switchButtonText: {
        color: '#64b5f6',
        fontSize: 14,
        fontWeight: '600',
    },
    // Floating Avatars
    floatingAvatar: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
    },
    avatar1: {
        top: height * 0.15,
        left: width * 0.1,
    },
    avatar2: {
        top: height * 0.25,
        right: width * 0.15,
    },
    avatar3: {
        top: height * 0.35,
        left: width * 0.05,
    },
    avatarText: {
        fontSize: 24,
    },
    // Decorative Elements
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        top: -50,
        right: -50,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        bottom: -75,
        left: -75,
    },
    decorativeCircle3: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        top: height * 0.4,
        right: -20,
    },
});

export default AuthScreen;