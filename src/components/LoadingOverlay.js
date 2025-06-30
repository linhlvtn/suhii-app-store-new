import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';

const COLORS = {
    primary: '#121212', // Màu chính của ứng dụng bạn
    white: '#FFFFFF',
    black: '#121212',
    secondary: '#555',
    lightGray: '#F5F5F5',
};

const DOT_COUNT = 8; // Số lượng chấm trong vòng tròn
const DOT_SIZE = 6; // Kích thước của mỗi chấm
const CONTAINER_SIZE = 50; // Kích thước tổng thể của vùng chứa animation

const LoadingOverlay = ({ isVisible, message = "Đang tải dữ liệu..." }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const dotAnims = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))).current;

    useEffect(() => {
        if (isVisible) {
            // Animation xoay cho toàn bộ vòng tròn
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000, // Thời gian cho một vòng quay
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // Animation pulsate cho từng chấm
            dotAnims.forEach((anim, index) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 600, // Thời gian scale up
                            easing: Easing.ease,
                            delay: index * 100, // Độ trễ giữa các chấm
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 600, // Thời gian scale down
                            easing: Easing.ease,
                            useNativeDriver: true,
                        }),
                        Animated.delay(DOT_COUNT * 100 - index * 100) // Đảm bảo chu kỳ animation được lặp lại mượt mà
                    ])
                ).start();
            });
        } else {
            rotateAnim.stopAnimation();
            dotAnims.forEach(anim => anim.stopAnimation());
            rotateAnim.setValue(0); // Reset animation khi ẩn
            dotAnims.forEach(anim => anim.setValue(0)); // Reset animation khi ẩn
        }
    }, [isVisible, rotateAnim, dotAnims]);

    if (!isVisible) {
        return null;
    }

    const interpolateRotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const dots = Array.from({ length: DOT_COUNT }).map((_, index) => {
        const angle = (360 / DOT_COUNT) * index;
        const radius = CONTAINER_SIZE / 2 - DOT_SIZE / 2 - 5; // Bán kính vòng tròn chấm, trừ đi kích thước chấm và padding nhỏ
        const translateX = radius * Math.cos(angle * (Math.PI / 180));
        const translateY = radius * Math.sin(angle * (Math.PI / 180));

        const scale = dotAnims[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1.4, 1], // Pulsate: scale từ 1 lên 1.4 rồi về 1
        });

        const opacity = dotAnims[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.7, 1, 0.7], // Mờ hơn khi nhỏ, rõ hơn khi lớn
        });

        return (
            <Animated.View
                key={index}
                style={[
                    styles.dot,
                    {
                        transform: [
                            { translateX: translateX },
                            { translateY: translateY },
                            { scale: scale },
                        ],
                        opacity: opacity,
                        backgroundColor: COLORS.primary, // Màu của chấm
                    },
                ]}
            />
        );
    });

    return (
        <Modal transparent={true} animationType="fade" visible={isVisible} statusBarTranslucent={true}>
            <View style={styles.modalBackground}>
                <View style={styles.activityWrapper}>
                    <Animated.View style={[styles.dotsContainer, { transform: [{ rotate: interpolateRotation }] }]}>
                        {dots}
                    </Animated.View>
                    <Text style={styles.loadingText}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Nền mờ tối full màn hình
    },
    activityWrapper: {
        // Không còn nền trắng cho activityWrapper, chỉ chứa animation và text
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 150,
    },
    dotsContainer: {
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        position: 'absolute',
    },
    loadingText: {
        color: COLORS.white, // Text màu trắng để nổi bật trên nền tối
        marginTop: 20, // Tăng khoảng cách từ animation
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default LoadingOverlay;