// src/screens/Statistics/components/SummaryCard.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
    // Modern color palette
    primary: '#1A1D29',
    secondary: '#2A2D3A',
    accent: '#6C5CE7',
    success: '#00B894',
    warning: '#FDCB6E',
    danger: '#E17055',
    
    // Gradient colors
    gradientPurple: ['#667eea', '#764ba2'],
    gradientBlue: ['#667eea', '#3b82f6'],
    gradientGreen: ['#11998e', '#38ef7d'],
    gradientOrange: ['#ffd89b', '#19547b'],
    gradientPink: ['#f093fb', '#f5576c'],
    gradientTeal: ['#4facfe', '#00f2fe'],
    gradientDark: ['#2C3E50', '#34495E'],
    gradientDarkBlue: ['#1A1D29', '#2A2D3A'],
    gradientCharcoal: ['#2C2C54', '#40407A'],
    
    // Text colors
    textPrimary: '#1A1D29',
    textSecondary: '#6C7293',
    textLight: '#A0A3BD',
    white: '#FFFFFF',
    background: '#F8F9FA',
    
    // Shadow
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowColorDark: 'rgba(0, 0, 0, 0.15)',
};

const formatCurrency = (amount) => {
    let formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

    return formattedAmount.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim();
};

const SummaryCard = ({ 
    title, 
    totalRevenue, 
    totalReports, 
    change, 
    value, 
    icon, 
    color, 
    type, 
    chartData, 
    customCardWidth, 
    isDailyReport,
    totalItems = 1 // Số lượng card trong layout
}) => {
    const isIncrease = change > 0;
    const changeColor = isIncrease ? COLORS.success : (change < 0 ? COLORS.danger : COLORS.textSecondary);
    const changeIconName = isIncrease ? 'trending-up' : (change < 0 ? 'trending-down' : 'remove');
    const changeText = change !== undefined ? `${Math.abs(change)}%` : '';

    let displayValue;
    let displayIcon = icon || "wallet-outline";
    let gradientColors = COLORS.gradientPurple;
    let cardType = 'default';

    if (type === 'storeClients') {
        displayValue = value;
        displayIcon = icon || "people-outline";
        gradientColors = COLORS.gradientBlue;
        cardType = 'clients';
    } else if (type === 'actualRevenue') {
        displayValue = value.replace(/VNĐ/g, '₫').replace(/₫/g, '₫').trim();
        displayIcon = icon || "trending-up-outline";
        gradientColors = COLORS.gradientGreen;
        cardType = 'revenue';
    } else {
        displayValue = formatCurrency(totalRevenue);
        displayIcon = icon || "wallet-outline";
        gradientColors = COLORS.gradientCharcoal;
        cardType = 'total';
    }

    // Tính toán width dựa trên số lượng items
    let cardWidth;
    if (customCardWidth) {
        cardWidth = customCardWidth;
    } else if (totalItems === 1) {
        // 1 item: full width với margin
        cardWidth = width - 32; // 16px margin mỗi bên
    } else if (totalItems === 2) {
        // 2 items: chia đều với spacing
        cardWidth = (width - 48) / 2; // 16px margin ngoài + 16px gap giữa
    } else {
        // 3+ items: sử dụng logic cũ
        cardWidth = (width - 40) / 2 - 8;
    }

    return (
        <View style={[styles.cardWrapper, { width: cardWidth }]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCard}
            >
                {/* Background Pattern */}
                <View style={styles.backgroundPattern}>
                    <View style={styles.circle1} />
                    <View style={styles.circle2} />
                    <View style={styles.circle3} />
                </View>

                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name={displayIcon} size={24} color={COLORS.white} />
                    </View>
                    
                    {totalReports !== undefined && (
                        <View style={styles.reportsBadge}>
                            <Text style={styles.reportsBadgeText}>{totalReports} Khách</Text>
                        </View>
                    )}
                </View>

                {/* Card Title */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {title}
                </Text>

                {/* Main Value */}
                <View style={styles.valueSection}>
                    <Text style={styles.mainValue} numberOfLines={1} adjustsFontSizeToFit>
                        {displayValue}
                    </Text>
                    
                    {change !== undefined && (
                        <View style={styles.changeIndicator}>
                            <View style={[styles.changeBadge, { 
                                backgroundColor: isIncrease ? 'rgba(0, 184, 148, 0.2)' : 'rgba(225, 112, 85, 0.2)'
                            }]}>
                                <Ionicons 
                                    name={changeIconName} 
                                    size={12} 
                                    color={COLORS.white} 
                                />
                                <Text style={styles.changeText}>
                                    {changeText}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom accent line */}
                <View style={styles.accentLine} />
            </LinearGradient>

            {/* Glass effect overlay */}
            <View style={styles.glassOverlay} />
        </View>
    );
};

const styles = StyleSheet.create({
    cardWrapper: {
        marginBottom: 5,
        marginHorizontal: 7, // Tăng margin để tạo spacing đều
    },
    gradientCard: {
        borderRadius: 18,
        padding: 15,
        minHeight: 155,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: COLORS.shadowColorDark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    backgroundPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
    },
    circle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
    },
    circle2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.white,
    },
    circle3: {
        position: 'absolute',
        top: '50%',
        right: -15,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.white,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        zIndex: 2,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
    },
    reportsBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
    },
    reportsBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.white,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
        opacity: 0.9,
        lineHeight: 20,
        zIndex: 2,
        marginBottom: 5,
    },
    valueSection: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    mainValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.white,
        marginBottom: 8,
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    changeIndicator: {
        alignSelf: 'flex-start',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
    },
    changeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.white,
        marginLeft: 4,
    },
    accentLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    glassOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
});

export default SummaryCard;