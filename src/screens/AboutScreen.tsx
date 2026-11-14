import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GlassCard, SectionHeader, LanguageToggleButton } from '../components/ui';
import { APP_NAME, APP_VERSION } from '../appInfo';
import { useTranslation } from '../i18n';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface FeatureItem {
  icon: IconName;
  title: string;
  desc: string;
  accent: string;
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { lang, t, setLanguage } = useTranslation();

  const features: FeatureItem[] = [
    {
      icon: 'time',
      title: t.about.f1Title,
      desc: t.about.f1Desc,
      accent: Colors.primary,
    },
    {
      icon: 'notifications',
      title: t.about.f2Title,
      desc: t.about.f2Desc,
      accent: Colors.accentGreen,
    },
    {
      icon: 'infinite',
      title: t.about.f3Title,
      desc: t.about.f3Desc,
      accent: Colors.accentOrange,
    },
    {
      icon: 'shield-checkmark',
      title: t.about.f4Title,
      desc: t.about.f4Desc,
      accent: Colors.accent,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 24) + Spacing.sm,
            paddingBottom: Math.max(insets.bottom, 16) + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Language Toggle Bar ── */}
        <View style={styles.topBar}>
          <LanguageToggleButton />
        </View>

        {/* ── App Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>{t.common.version(APP_VERSION)}</Text>
          </View>
          <Text style={styles.heroTagline}>
            {t.about.heroTagline}
          </Text>
        </View>

        {/* ── Language Switcher Card ── */}
        <SectionHeader title={t.about.langSectionTitle} subtitle={t.about.langSectionSub} />
        <GlassCard style={styles.card}>
          <View style={styles.langSwitchRow}>
            <TouchableOpacity
              onPress={() => setLanguage('vi')}
              activeOpacity={0.8}
              style={[styles.langOptionBtn, lang === 'vi' && styles.langOptionBtnActive]}
            >
              <Text style={styles.langFlag}>🇻🇳</Text>
              <Text style={[styles.langOptionText, lang === 'vi' && styles.langOptionTextActive]}>
                Tiếng Việt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('en')}
              activeOpacity={0.8}
              style={[styles.langOptionBtn, lang === 'en' && styles.langOptionBtnActive]}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text style={[styles.langOptionText, lang === 'en' && styles.langOptionTextActive]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Tổng quát & Thông tin chung ── */}
        <SectionHeader title={t.about.generalTitle} subtitle={t.about.generalSub} />
        <GlassCard style={styles.card}>
          <Text style={styles.paragraph}>
            <Text style={styles.boldText}>{APP_NAME}</Text>
            {t.about.generalP1Rest}
          </Text>
          <Text style={[styles.paragraph, { marginTop: Spacing.sm }]}>
            {t.about.generalP2}
          </Text>
        </GlassCard>

        {/* ── Tính năng nổi bật ── */}
        <SectionHeader title={t.about.featuresTitle} subtitle={t.about.featuresSub} />
        <GlassCard style={styles.card}>
          {features.map((item, index) => (
            <View
              key={item.icon}
              style={[styles.featureItem, index > 0 && styles.featureBorder]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: `${item.accent}20` }]}>
                <Ionicons name={item.icon} size={20} color={item.accent} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* ── Người lên ý tưởng & Thực hiện ── */}
        <SectionHeader title={t.about.teamTitle} subtitle={t.about.teamSub} />
        <GlassCard style={styles.card}>
          <View style={styles.devRow}>
            <View style={styles.avatarPqt}>
              <Text style={styles.avatarText}>P</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.devName}>pqt123</Text>
              <Text style={styles.devRole}>{t.about.pqtRole}</Text>
            </View>
          </View>

          <View style={styles.devDivider} />

          <View style={styles.devRow}>
            <View style={styles.avatarGemini}>
              <Ionicons name="sparkles" size={18} color="#00F5D4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.devName}>Gemini 4 Argon</Text>
              <Text style={styles.devRole}>{t.about.geminiRole}</Text>
            </View>
          </View>
        </GlassCard>

        {/* ── Footer ── */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>
            {t.about.footerText}
          </Text>
          <Text style={styles.footerHighlight}>
            pqt123  ✕  Gemini 4 Argon
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    ...Typography.h1,
    fontSize: 26,
    marginTop: Spacing.md,
    letterSpacing: 0.5,
  },
  versionBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(108, 99, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  versionText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  heroTagline: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  langSwitchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  langOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langOptionBtnActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderColor: Colors.primary,
  },
  langFlag: {
    fontSize: 16,
  },
  langOptionText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  langOptionTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  paragraph: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  boldText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm + 2,
  },
  featureBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 14.5,
  },
  featureDesc: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
    fontSize: 12.5,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  avatarPqt: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF7B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    shadowColor: '#FF7B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarGemini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1B4B',
    borderWidth: 1.5,
    borderColor: '#00F5D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  devName: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  devRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  devDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: Spacing.sm + 2,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 12,
  },
  footerHighlight: {
    color: Colors.primaryLight,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 1.5,
  },
});
