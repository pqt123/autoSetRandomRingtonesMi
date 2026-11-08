import React, { useState } from 'react';
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  copyTextToClipboard,
  SecurityVerificationReport,
} from '../../modules/expo-ringtone';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

interface SecurityGateScreenProps {
  report: SecurityVerificationReport;
}

function getReasonDescription(statusCode: number): string {
  switch (statusCode) {
    case 2:
      return 'Ứng dụng chỉ được phép hoạt động trên thiết bị Xiaomi chính hãng đã đăng ký bảo mật.';
    case 3:
    case 4:
      return 'Phát hiện tệp cài đặt APK đã bị can thiệp hoặc chữ ký số không hợp lệ. Toàn bộ tính năng đã bị vô hiệu hóa.';
    case 5:
      return 'Phát hiện công cụ dịch ngược / can thiệp tiến trình trái phép. Ứng dụng đã tự động khóa bảo vệ.';
    case 1:
    default:
      return 'Thiết bị Xiaomi này chưa nằm trong danh sách cấp phép sử dụng ứng dụng. Toàn bộ tính năng đã bị khóa.';
  }
}

export default function SecurityGateScreen({ report }: SecurityGateScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (!report.deviceId) return;
    const ok = copyTextToClipboard(report.deviceId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <View style={styles.shieldCircle}>
        <Ionicons name="lock-closed" size={44} color={Colors.error} />
      </View>

      <Text style={styles.title}>Thiết bị bị khóa truy cập</Text>
      <Text style={styles.subtitle}>{getReasonDescription(report.statusCode)}</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thiết bị</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {report.deviceModel || 'Không xác định'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.idSection}>
          <Text style={styles.infoLabel}>Mã định danh thiết bị</Text>
          <View style={styles.idBoxRow}>
            <Text selectable style={styles.deviceIdText} numberOfLines={1}>
              {report.deviceId || 'N/A'}
            </Text>
            {report.statusCode === 1 && Boolean(report.deviceId) && (
              <TouchableOpacity
                onPress={handleCopyId}
                activeOpacity={0.75}
                style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.copyBtnText}>{copied ? 'Đã chép' : 'Sao chép'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => BackHandler.exitApp()}
        activeOpacity={0.8}
        style={styles.exitButton}
      >
        <Text style={styles.exitButtonText}>Đóng ứng dụng</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  shieldCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255, 101, 132, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 101, 132, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  idSection: {
    gap: Spacing.xs + 2,
  },
  idBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E0E1B',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  deviceIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accentGreen,
    letterSpacing: 0.8,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  copyBtnSuccess: {
    backgroundColor: Colors.accentGreen,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exitButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 101, 132, 0.16)',
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  exitButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '700',
  },
});

