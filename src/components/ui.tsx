import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

// ─── Glass Card ──────────────────────────────────────────────────────────────
export function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  variant = 'filled',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: 'filled' | 'outlined' | 'ghost';
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        style={[
          styles.btn,
          variant === 'filled' && styles.btnFilled,
          variant === 'outlined' && styles.btnOutlined,
          variant === 'ghost' && styles.btnGhost,
          disabled && styles.btnDisabled,
          style,
        ]}
      >
        {icon && <View style={styles.btnIcon}>{icon}</View>}
        <Text
          style={[
            styles.btnLabel,
            variant === 'outlined' && { color: Colors.primary },
            variant === 'ghost' && { color: Colors.textSecondary },
            disabled && { color: Colors.textDisabled },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
export function ToggleSwitch({
  value,
  onToggle,
  activeColor = Colors.primary,
}: {
  value: boolean;
  onToggle: () => void;
  activeColor?: string;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, activeColor],
  });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Time Badge ───────────────────────────────────────────────────────────────
export function TimeBadge({ hour, minute }: { hour: number; minute: number }) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return (
    <View style={styles.timeBadge}>
      <Text style={styles.timeBadgeText}>{h}:{m}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={Typography.label}>{title.toUpperCase()}</Text>
        {subtitle && <Text style={[Typography.bodySmall, { marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

// ─── Pulse Dot (scheduler active indicator) ───────────────────────────────────
export function PulseDot({ color = Colors.success }: { color?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.pulseDotContainer}>
      <Animated.View
        style={[
          styles.pulseDotRing,
          { borderColor: color, transform: [{ scale: pulse }] },
        ]}
      />
      <View style={[styles.pulseDotCore, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={[Typography.h3, { textAlign: 'center', marginTop: Spacing.sm }]}>{title}</Text>
      <Text style={[Typography.bodySmall, { textAlign: 'center', marginTop: Spacing.xs }]}>
        {subtitle}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    minHeight: 48,
  },
  btnFilled: {
    backgroundColor: Colors.primary,
  },
  btnOutlined: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  btnGhost: {
    backgroundColor: Colors.glass,
  },
  btnDisabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  btnLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  btnIcon: {
    marginRight: Spacing.xs,
  },
  // Toggle
  track: {
    width: 48,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  // Time badge
  timeBadge: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  timeBadgeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  // Pulse dot
  pulseDotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    opacity: 0.4,
  },
  pulseDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
  },
});
