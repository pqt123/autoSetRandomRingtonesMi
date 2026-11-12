import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../appInfo';

const SPLASH_LOGO = require('../../assets/images/splash-icon.png');
const LAST_ANIM_STORAGE_KEY = '@autoringtone_last_splash_anim';

// Khớp chính xác kích thước imageWidth: 184 trong app.json & drawable/splashscreen_logo.png
const LOGO_SIZE = 184;
const EFFECT_COUNT = 5;

const STARBURST_COLORS = [
  '#FF7B00', // Orange (P)
  '#5CFF2E', // Neon Green (Q)
  '#00F5D4', // Mint Cyan (T)
  '#00BBF9', // Electric Blue (1)
  '#7B61FF', // Neon Purple (2)
  '#FF2A85', // Hot Pink (3)
  '#FFD166', // Warm Gold
  '#43C6AC', // Emerald Cyan
];

// Biến lưu trong bộ nhớ phiên chạy phòng trường hợp AsyncStorage phản hồi chậm
let lastPlayedEffectInMemory = -1;

async function pickRandomEffectIndex(): Promise<number> {
  let prev = lastPlayedEffectInMemory;
  try {
    const stored = await Promise.race<string | null>([
      AsyncStorage.getItem(LAST_ANIM_STORAGE_KEY),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 60)),
    ]);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed < EFFECT_COUNT) {
        prev = parsed;
      }
    }
  } catch {
    // Bỏ qua nếu đọc bộ nhớ chậm
  }

  const candidates: number[] = [];
  for (let i = 0; i < EFFECT_COUNT; i++) {
    if (i !== prev) candidates.push(i);
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
  lastPlayedEffectInMemory = chosen;
  AsyncStorage.setItem(LAST_ANIM_STORAGE_KEY, String(chosen)).catch(() => {});
  return chosen;
}

function createAnimValues() {
  return {
    overlayOpacity: new Animated.Value(1),

    // Main logo transforms (khởi điểm khớp 100% với Native Splash để không bị giật khung hình)
    logoOpacity: new Animated.Value(1),
    logoScale: new Animated.Value(1),
    logoScaleX: new Animated.Value(1),
    logoScaleY: new Animated.Value(1),
    logoX: new Animated.Value(0),
    logoY: new Animated.Value(0),
    logoRotate: new Animated.Value(0),

    // Effect 0: Neon Shockwave Rings
    ring1Scale: new Animated.Value(0.75),
    ring1Opacity: new Animated.Value(0),
    ring2Scale: new Animated.Value(0.75),
    ring2Opacity: new Animated.Value(0),
    ring3Scale: new Animated.Value(0.75),
    ring3Opacity: new Animated.Value(0),

    // Effect 1: 3D Prism Flip Halo & Specular Gleam
    haloScale: new Animated.Value(0.85),
    haloOpacity: new Animated.Value(0),
    flareOpacity: new Animated.Value(0),
    flareScaleY: new Animated.Value(0.4),

    // Effect 2: Vinyl Turntable Counter-Rotating Orbits
    orbitOpacity: new Animated.Value(0),
    orbitScale: new Animated.Value(0.85),
    orbit1Rotate: new Animated.Value(0),
    orbit2Rotate: new Animated.Value(0),

    // Effect 3: Cyberpunk RGB Glitch & Laser Scanline
    glitchGhostOpacity: new Animated.Value(0),
    glitchCyanX: new Animated.Value(0),
    glitchCyanY: new Animated.Value(0),
    glitchPinkX: new Animated.Value(0),
    glitchPinkY: new Animated.Value(0),
    scanlineY: new Animated.Value(-110),
    scanlineOpacity: new Animated.Value(0),

    // Effect 4: Elastic Gravity Bounce & 8-Ray Rainbow Starburst
    burstProgress: new Animated.Value(0),
    burstOpacity: new Animated.Value(0),
    burstScale: new Animated.Value(0.3),
    rippleScale: new Animated.Value(0.4),
    rippleOpacity: new Animated.Value(0),
  };
}

interface AnimatedSplashProps {
  onFinish: () => void;
  isAppActive?: boolean;
}

export default function AnimatedSplash({
  onFinish,
  isAppActive = true,
}: AnimatedSplashProps) {
  const [anim] = useState(createAnimValues);
  const [activeEffect, setActiveEffect] = useState<number | null>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const startedRef = useRef(false);
  const imageLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const isAppActiveRef = useRef(isAppActive);
  const activeMasterAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      activeMasterAnimRef.current?.stop();
    };
  }, []);

  const runEffectAnimation = useCallback(
    (effectIndex: number) => {
      let masterAnim: Animated.CompositeAnimation;

      switch (effectIndex) {
        // ─────────────────────────────────────────────────────────────────────
        // Hiệu ứng 1 (0): Neon Shockwave Pulse — Sóng xung kích Neon lan tỏa
        // ─────────────────────────────────────────────────────────────────────
        case 0: {
          masterAnim = Animated.sequence([
            Animated.timing(anim.logoScale, {
              toValue: 0.84,
              duration: 170,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.parallel([
              Animated.spring(anim.logoScale, {
                toValue: 1.06,
                friction: 4,
                tension: 110,
                useNativeDriver: true,
              }),
              // Sóng 1 (Tím Neon)
              Animated.sequence([
                Animated.timing(anim.ring1Opacity, {
                  toValue: 0.9,
                  duration: 80,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  Animated.timing(anim.ring1Scale, {
                    toValue: 2.25,
                    duration: 760,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.ring1Opacity, {
                    toValue: 0,
                    duration: 760,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                ]),
              ]),
              // Sóng 2 (Hồng Neon)
              Animated.sequence([
                Animated.delay(130),
                Animated.timing(anim.ring2Opacity, {
                  toValue: 0.85,
                  duration: 80,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  Animated.timing(anim.ring2Scale, {
                    toValue: 2.5,
                    duration: 760,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.ring2Opacity, {
                    toValue: 0,
                    duration: 760,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                ]),
              ]),
              // Sóng 3 (Xanh Ngọc Neon)
              Animated.sequence([
                Animated.delay(260),
                Animated.timing(anim.ring3Opacity, {
                  toValue: 0.8,
                  duration: 80,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  Animated.timing(anim.ring3Scale, {
                    toValue: 1.95,
                    duration: 680,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.ring3Opacity, {
                    toValue: 0,
                    duration: 680,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                  }),
                ]),
              ]),
            ]),
            // Phóng mượt vào màn hình chính
            Animated.parallel([
              Animated.timing(anim.logoScale, {
                toValue: 1.65,
                duration: 360,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoOpacity, {
                toValue: 0,
                duration: 320,
                useNativeDriver: true,
              }),
              Animated.timing(anim.overlayOpacity, {
                toValue: 0,
                duration: 360,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]);
          break;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Hiệu ứng 2 (1): 3D Prism Coin Flip — Lật không gian 3D & Tia sáng lóe
        // ─────────────────────────────────────────────────────────────────────
        case 1: {
          masterAnim = Animated.sequence([
            // Nhún lấy đà
            Animated.parallel([
              Animated.timing(anim.logoY, {
                toValue: 12,
                duration: 140,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleX, {
                toValue: 1.07,
                duration: 140,
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleY, {
                toValue: 0.93,
                duration: 140,
                useNativeDriver: true,
              }),
            ]),
            // Bay lên & lật 3D kép + tia sáng cắt ngang cạnh đồng xu
            Animated.parallel([
              Animated.sequence([
                Animated.timing(anim.logoY, {
                  toValue: -28,
                  duration: 380,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.spring(anim.logoY, {
                  toValue: 0,
                  friction: 5,
                  tension: 90,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.logoScaleX, {
                  toValue: 0.04,
                  duration: 190,
                  easing: Easing.in(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.logoScaleX, {
                  toValue: 1.0,
                  duration: 190,
                  easing: Easing.out(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.logoScaleX, {
                  toValue: 0.04,
                  duration: 180,
                  easing: Easing.in(Easing.sin),
                  useNativeDriver: true,
                }),
                Animated.spring(anim.logoScaleX, {
                  toValue: 1.0,
                  friction: 5,
                  tension: 110,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.logoScaleY, {
                  toValue: 1.12,
                  duration: 380,
                  useNativeDriver: true,
                }),
                Animated.spring(anim.logoScaleY, {
                  toValue: 1.0,
                  friction: 5,
                  tension: 110,
                  useNativeDriver: true,
                }),
              ]),
              Animated.sequence([
                Animated.timing(anim.logoRotate, {
                  toValue: 7,
                  duration: 240,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.logoRotate, {
                  toValue: -5,
                  duration: 240,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.logoRotate, {
                  toValue: 0,
                  duration: 240,
                  useNativeDriver: true,
                }),
              ]),
              // Hào quang xanh ngọc phía sau
              Animated.sequence([
                Animated.parallel([
                  Animated.timing(anim.haloOpacity, {
                    toValue: 0.75,
                    duration: 260,
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.haloScale, {
                    toValue: 1.45,
                    duration: 520,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                ]),
                Animated.timing(anim.haloOpacity, {
                  toValue: 0,
                  duration: 320,
                  useNativeDriver: true,
                }),
              ]),
              // Tia sáng lóe khi lật qua góc 90 độ
              Animated.sequence([
                Animated.delay(165),
                Animated.parallel([
                  Animated.timing(anim.flareOpacity, {
                    toValue: 0.95,
                    duration: 60,
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.flareScaleY, {
                    toValue: 1.15,
                    duration: 110,
                    useNativeDriver: true,
                  }),
                ]),
                Animated.timing(anim.flareOpacity, {
                  toValue: 0,
                  duration: 110,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            Animated.delay(120),
            // Bay vút lên mở vào app
            Animated.parallel([
              Animated.timing(anim.logoY, {
                toValue: -64,
                duration: 340,
                easing: Easing.in(Easing.back(1.2)),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScale, {
                toValue: 1.2,
                duration: 340,
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(anim.overlayOpacity, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
              }),
            ]),
          ]);
          break;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Hiệu ứng 3 (2): Vinyl Turntable Spin — Đĩa nhạc xoay & Quỹ đạo ngược chiều
        // ─────────────────────────────────────────────────────────────────────
        case 2: {
          masterAnim = Animated.sequence([
            // Vặn ngược đĩa lấy đà kiểu DJ
            Animated.parallel([
              Animated.timing(anim.logoRotate, {
                toValue: -24,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScale, {
                toValue: 0.92,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim.orbitOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim.orbitScale, {
                toValue: 1.05,
                duration: 240,
                useNativeDriver: true,
              }),
            ]),
            // Xoay đĩa 360 độ + 2 vòng quỹ đạo xoay ngược chiều nhau
            Animated.parallel([
              Animated.timing(anim.logoRotate, {
                toValue: 360,
                duration: 820,
                easing: Easing.out(Easing.back(1.08)),
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.logoScale, {
                  toValue: 1.14,
                  duration: 400,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.logoScale, {
                  toValue: 1.0,
                  duration: 420,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(anim.orbit1Rotate, {
                toValue: -210,
                duration: 850,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.orbit2Rotate, {
                toValue: 260,
                duration: 850,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
            Animated.delay(90),
            // Thu gọn xoáy tâm mở vào màn hình chính
            Animated.parallel([
              Animated.timing(anim.logoRotate, {
                toValue: 500,
                duration: 350,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScale, {
                toValue: 0.2,
                duration: 350,
                easing: Easing.in(Easing.back(1.4)),
                useNativeDriver: true,
              }),
              Animated.timing(anim.orbitScale, {
                toValue: 1.65,
                duration: 340,
                useNativeDriver: true,
              }),
              Animated.timing(anim.orbitOpacity, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoOpacity, {
                toValue: 0,
                duration: 310,
                useNativeDriver: true,
              }),
              Animated.timing(anim.overlayOpacity, {
                toValue: 0,
                duration: 360,
                useNativeDriver: true,
              }),
            ]),
          ]);
          break;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Hiệu ứng 4 (3): Cyberpunk RGB Glitch & Laser Scan — Nhấp nháy điện tử
        // ─────────────────────────────────────────────────────────────────────
        case 3: {
          masterAnim = Animated.sequence([
            // Mở tia laser quét dọc + tách bóng RGB
            Animated.parallel([
              // Tia laser quét từ đỉnh xuống đáy logo
              Animated.sequence([
                Animated.timing(anim.scanlineOpacity, {
                  toValue: 0.95,
                  duration: 70,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scanlineY, {
                  toValue: 110,
                  duration: 520,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scanlineOpacity, {
                  toValue: 0,
                  duration: 90,
                  useNativeDriver: true,
                }),
              ]),
              // Chuỗi rung Glitch tốc độ cao của Logo chính
              Animated.sequence([
                Animated.delay(90),
                Animated.timing(anim.logoX, { toValue: -11, duration: 55, useNativeDriver: true }),
                Animated.timing(anim.logoX, { toValue: 12, duration: 55, useNativeDriver: true }),
                Animated.timing(anim.logoX, { toValue: -7, duration: 50, useNativeDriver: true }),
                Animated.timing(anim.logoX, { toValue: 0, duration: 60, useNativeDriver: true }),
                Animated.delay(110),
                Animated.parallel([
                  Animated.timing(anim.logoScale, { toValue: 1.12, duration: 75, useNativeDriver: true }),
                  Animated.timing(anim.logoRotate, { toValue: -3.5, duration: 75, useNativeDriver: true }),
                  Animated.timing(anim.logoX, { toValue: 9, duration: 75, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(anim.logoScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
                  Animated.timing(anim.logoRotate, { toValue: 3.5, duration: 70, useNativeDriver: true }),
                  Animated.timing(anim.logoX, { toValue: -9, duration: 70, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.spring(anim.logoScale, { toValue: 1.0, friction: 5, tension: 140, useNativeDriver: true }),
                  Animated.timing(anim.logoRotate, { toValue: 0, duration: 80, useNativeDriver: true }),
                  Animated.timing(anim.logoX, { toValue: 0, duration: 80, useNativeDriver: true }),
                ]),
              ]),
              // Bóng tách kênh màu Cyan & Neon Pink hai bên
              Animated.sequence([
                Animated.delay(80),
                Animated.timing(anim.glitchGhostOpacity, { toValue: 0.62, duration: 50, useNativeDriver: true }),
                Animated.parallel([
                  Animated.timing(anim.glitchCyanX, { toValue: -18, duration: 70, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkX, { toValue: 18, duration: 70, useNativeDriver: true }),
                  Animated.timing(anim.glitchCyanY, { toValue: -4, duration: 70, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkY, { toValue: 4, duration: 70, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(anim.glitchCyanX, { toValue: 14, duration: 65, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkX, { toValue: -14, duration: 65, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(anim.glitchCyanX, { toValue: -15, duration: 90, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkX, { toValue: 15, duration: 90, useNativeDriver: true }),
                ]),
                Animated.parallel([
                  Animated.timing(anim.glitchCyanX, { toValue: 0, duration: 110, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkX, { toValue: 0, duration: 110, useNativeDriver: true }),
                  Animated.timing(anim.glitchCyanY, { toValue: 0, duration: 110, useNativeDriver: true }),
                  Animated.timing(anim.glitchPinkY, { toValue: 0, duration: 110, useNativeDriver: true }),
                  Animated.timing(anim.glitchGhostOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
                ]),
              ]),
            ]),
            Animated.delay(100),
            // Phóng xuyên không gian vào app
            Animated.parallel([
              Animated.timing(anim.logoScale, {
                toValue: 1.95,
                duration: 320,
                easing: Easing.in(Easing.exp),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoOpacity, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
              }),
              Animated.timing(anim.overlayOpacity, {
                toValue: 0,
                duration: 340,
                useNativeDriver: true,
              }),
            ]),
          ]);
          break;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Hiệu ứng 5 (4): Elastic Bounce & Rainbow Starburst — Nảy đàn hồi & Pháo sáng
        // ─────────────────────────────────────────────────────────────────────
        default: {
          masterAnim = Animated.sequence([
            // Bật tung lên cao (kéo giãn nhẹ trục dọc)
            Animated.parallel([
              Animated.timing(anim.logoY, {
                toValue: -54,
                duration: 230,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleX, {
                toValue: 0.92,
                duration: 230,
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleY, {
                toValue: 1.1,
                duration: 230,
                useNativeDriver: true,
              }),
            ]),
            // Rơi chạm sàn (nén đàn hồi Squash)
            Animated.parallel([
              Animated.timing(anim.logoY, {
                toValue: 16,
                duration: 210,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleX, {
                toValue: 1.16,
                duration: 210,
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoScaleY, {
                toValue: 0.84,
                duration: 210,
                useNativeDriver: true,
              }),
            ]),
            // Chạm sàn -> Bật nảy đàn hồi + Bung 8 tia pháo sáng cầu vồng PQT123!
            Animated.parallel([
              Animated.spring(anim.logoY, {
                toValue: 0,
                friction: 4,
                tension: 120,
                useNativeDriver: true,
              }),
              Animated.spring(anim.logoScaleX, {
                toValue: 1.0,
                friction: 4,
                tension: 120,
                useNativeDriver: true,
              }),
              Animated.spring(anim.logoScaleY, {
                toValue: 1.0,
                friction: 4,
                tension: 120,
                useNativeDriver: true,
              }),
              // Vòng gợn sóng dưới chân logo
              Animated.sequence([
                Animated.timing(anim.rippleOpacity, {
                  toValue: 0.85,
                  duration: 50,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  Animated.timing(anim.rippleScale, {
                    toValue: 1.85,
                    duration: 520,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.rippleOpacity, {
                    toValue: 0,
                    duration: 520,
                    useNativeDriver: true,
                  }),
                ]),
              ]),
              // 8 hạt sáng cầu vồng bung tỏa 360 độ
              Animated.sequence([
                Animated.parallel([
                  Animated.timing(anim.burstOpacity, {
                    toValue: 1,
                    duration: 80,
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.burstScale, {
                    toValue: 1.25,
                    duration: 240,
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.burstProgress, {
                    toValue: 1,
                    duration: 620,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                ]),
              ]),
              Animated.sequence([
                Animated.delay(260),
                Animated.parallel([
                  Animated.timing(anim.burstOpacity, {
                    toValue: 0,
                    duration: 360,
                    useNativeDriver: true,
                  }),
                  Animated.timing(anim.burstScale, {
                    toValue: 0.2,
                    duration: 360,
                    useNativeDriver: true,
                  }),
                ]),
              ]),
            ]),
            // Chuyển mượt sang màn hình chính
            Animated.parallel([
              Animated.timing(anim.logoScale, {
                toValue: 1.35,
                duration: 330,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(anim.logoOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(anim.overlayOpacity, {
                toValue: 0,
                duration: 340,
                useNativeDriver: true,
              }),
            ]),
          ]);
          break;
        }
      }

      // Cho phép thao tác xuyên qua lớp phủ trong 300ms mờ dần cuối cùng
      unlockTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setFadingOut(true);
        }
      }, 1050);

      activeMasterAnimRef.current = masterAnim;
      masterAnim.start(({ finished }) => {
        if (unlockTimerRef.current) {
          clearTimeout(unlockTimerRef.current);
          unlockTimerRef.current = null;
        }
        if (finished && mountedRef.current) {
          onFinish();
        }
      });
    },
    [anim, onFinish]
  );

  const triggerAnimationIfReady = useCallback(async () => {
    if (startedRef.current || !isAppActiveRef.current || !imageLoadedRef.current) {
      return;
    }
    startedRef.current = true;

    const chosenEffect = await pickRandomEffectIndex();
    if (!mountedRef.current) return;
    setActiveEffect(chosenEffect);

    // Ẩn ngay màn hình Splash tĩnh của Android (vì lớp phủ JS đen #000000 + logo 184dp đã đè khít 100%)
    try {
      SplashScreen.hide();
    } catch {
      SplashScreen.hideAsync().catch(() => {});
    }

    requestAnimationFrame(() => {
      if (mountedRef.current) {
        runEffectAnimation(chosenEffect);
      }
    });
  }, [runEffectAnimation]);

  const handleImageLoaded = useCallback(() => {
    imageLoadedRef.current = true;
    triggerAnimationIfReady();
  }, [triggerAnimationIfReady]);

  // Khi app đang active (lúc mới mở hoặc vừa quay lại từ đa nhiệm/màn hình khoá) -> phát ngay hiệu ứng Splash
  useEffect(() => {
    isAppActiveRef.current = isAppActive;
    if (!isAppActive) return;

    if (imageLoadedRef.current) {
      triggerAnimationIfReady();
      return;
    }

    // Fallback an toàn phòng trường hợp sự kiện onLoadEnd của ảnh cache không kích hoạt lại
    const safetyTimer = setTimeout(() => {
      imageLoadedRef.current = true;
      triggerAnimationIfReady();
    }, 150);
    return () => clearTimeout(safetyTimer);
  }, [isAppActive, triggerAnimationIfReady]);

  const logoSpin = anim.logoRotate.interpolate({
    inputRange: [-360, 0, 360, 720],
    outputRange: ['-360deg', '0deg', '360deg', '720deg'],
  });

  const orbit1Spin = anim.orbit1Rotate.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const orbit2Spin = anim.orbit2Rotate.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents={fadingOut ? 'none' : 'auto'}
      style={[styles.overlay, { opacity: anim.overlayOpacity }]}
    >
      <RNStatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      <View style={styles.centerStage}>
        {/* ── FX 0: Neon Shockwave Rings ── */}
        {activeEffect === 0 && (
          <>
            <Animated.View
              style={[
                styles.shockwaveRing,
                {
                  borderColor: '#6C63FF',
                  borderWidth: 2.5,
                  opacity: anim.ring1Opacity,
                  transform: [{ scale: anim.ring1Scale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.shockwaveRing,
                {
                  borderColor: '#FF6584',
                  borderWidth: 2,
                  opacity: anim.ring2Opacity,
                  transform: [{ scale: anim.ring2Scale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.shockwaveRing,
                {
                  borderColor: '#43C6AC',
                  borderWidth: 1.8,
                  opacity: anim.ring3Opacity,
                  transform: [{ scale: anim.ring3Scale }],
                },
              ]}
            />
          </>
        )}

        {/* ── FX 1: 3D Flip Halo Glow ── */}
        {activeEffect === 1 && (
          <Animated.View
            style={[
              styles.haloCircle,
              {
                opacity: anim.haloOpacity,
                transform: [{ scale: anim.haloScale }],
              },
            ]}
          />
        )}

        {/* ── FX 2: Vinyl Turntable Counter-Rotating Soundwave Orbits ── */}
        {activeEffect === 2 && (
          <>
            <Animated.View
              style={[
                styles.outerOrbit,
                {
                  opacity: anim.orbitOpacity,
                  transform: [{ scale: anim.orbitScale }, { rotate: orbit1Spin }],
                },
              ]}
            >
              <View style={[styles.orbitDot, styles.dotTop, { backgroundColor: '#6C63FF' }]} />
              <View style={[styles.orbitDot, styles.dotBottom, { backgroundColor: '#FF6584' }]} />
              <View style={[styles.orbitDot, styles.dotLeft, { backgroundColor: '#43C6AC' }]} />
              <View style={[styles.orbitDot, styles.dotRight, { backgroundColor: '#F7971E' }]} />
            </Animated.View>

            <Animated.View
              style={[
                styles.innerOrbit,
                {
                  opacity: anim.orbitOpacity,
                  transform: [{ scale: anim.orbitScale }, { rotate: orbit2Spin }],
                },
              ]}
            >
              <View style={[styles.orbitDotSmall, styles.dotTop, { backgroundColor: '#00F5D4' }]} />
              <View style={[styles.orbitDotSmall, styles.dotBottom, { backgroundColor: '#9D97FF' }]} />
            </Animated.View>
          </>
        )}

        {/* ── FX 3: Cyberpunk RGB Ghost Echoes (Behind Main Logo) ── */}
        {activeEffect === 3 && (
          <>
            <Animated.View
              style={[
                styles.ghostLogoWrap,
                styles.cyanGhostBorder,
                {
                  opacity: anim.glitchGhostOpacity,
                  transform: [
                    { translateX: anim.glitchCyanX },
                    { translateY: anim.glitchCyanY },
                  ],
                },
              ]}
            >
              <Image source={SPLASH_LOGO} style={styles.logo} resizeMode="contain" fadeDuration={0} />
            </Animated.View>

            <Animated.View
              style={[
                styles.ghostLogoWrap,
                styles.pinkGhostBorder,
                {
                  opacity: anim.glitchGhostOpacity,
                  transform: [
                    { translateX: anim.glitchPinkX },
                    { translateY: anim.glitchPinkY },
                  ],
                },
              ]}
            >
              <Image source={SPLASH_LOGO} style={styles.logo} resizeMode="contain" fadeDuration={0} />
            </Animated.View>
          </>
        )}

        {/* ── FX 4: Bounce Impact Ripple & 8-Ray Rainbow Starburst ── */}
        {activeEffect === 4 && (
          <>
            <Animated.View
              style={[
                styles.floorRipple,
                {
                  opacity: anim.rippleOpacity,
                  transform: [
                    { translateY: LOGO_SIZE / 2 + 10 },
                    { scaleX: anim.rippleScale },
                    { scaleY: 0.28 },
                  ],
                },
              ]}
            />
            {STARBURST_COLORS.map((color, idx) => {
              const angleRad = (idx * Math.PI * 2) / STARBURST_COLORS.length;
              const startR = LOGO_SIZE * 0.36;
              const endR = LOGO_SIZE * 0.86;
              const tx = anim.burstProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [Math.cos(angleRad) * startR, Math.cos(angleRad) * endR],
              });
              const ty = anim.burstProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [Math.sin(angleRad) * startR, Math.sin(angleRad) * endR],
              });
              return (
                <Animated.View
                  key={color}
                  style={[
                    styles.sparkDot,
                    {
                      backgroundColor: color,
                      opacity: anim.burstOpacity,
                      transform: [
                        { translateX: tx },
                        { translateY: ty },
                        { scale: anim.burstScale },
                      ],
                    },
                  ]}
                />
              );
            })}
          </>
        )}

        {/* ── Main Logo (Khớp 100% tâm và kích thước 184dp với Native Splash) ── */}
        <Animated.View
          style={{
            opacity: anim.logoOpacity,
            transform: [
              { translateX: anim.logoX },
              { translateY: anim.logoY },
              { scale: anim.logoScale },
              { scaleX: anim.logoScaleX },
              { scaleY: anim.logoScaleY },
              { rotate: logoSpin },
            ],
          }}
        >
          <Image
            source={SPLASH_LOGO}
            style={styles.logo}
            resizeMode="contain"
            fadeDuration={0}
            onLoadEnd={handleImageLoaded}
          />
        </Animated.View>

        {/* ── FX 1 Foreground: Specular Vertical Light Gleam ── */}
        {activeEffect === 1 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.specularGleam,
              {
                opacity: anim.flareOpacity,
                transform: [{ scaleY: anim.flareScaleY }],
              },
            ]}
          />
        )}

        {/* ── FX 3 Foreground: Horizontal Cyber Laser Scanline ── */}
        {activeEffect === 3 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.laserScanline,
              {
                opacity: anim.scanlineOpacity,
                transform: [{ translateY: anim.scanlineY }],
              },
            ]}
          />
        )}
      </View>

      {/* Dòng chữ version app ở dưới cùng màn hình Splash (lấy từ package.json) */}
      <Text style={styles.versionText} pointerEvents="none">
        Phiên bản {APP_VERSION}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  versionText: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12.5,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  centerStage: {
    width: LOGO_SIZE * 2,
    height: LOGO_SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  // FX 0: Shockwave
  shockwaveRing: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
  },
  // FX 1: 3D Flip Halo & Gleam
  haloCircle: {
    position: 'absolute',
    width: LOGO_SIZE + 16,
    height: LOGO_SIZE + 16,
    borderRadius: (LOGO_SIZE + 16) / 2,
    borderWidth: 2,
    borderColor: '#43C6AC',
    backgroundColor: 'rgba(67, 198, 172, 0.12)',
  },
  specularGleam: {
    position: 'absolute',
    width: 6,
    height: LOGO_SIZE + 36,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  // FX 2: Vinyl Orbits
  outerOrbit: {
    position: 'absolute',
    width: LOGO_SIZE + 56,
    height: LOGO_SIZE + 56,
    borderRadius: (LOGO_SIZE + 56) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 99, 255, 0.45)',
  },
  innerOrbit: {
    position: 'absolute',
    width: LOGO_SIZE + 24,
    height: LOGO_SIZE + 24,
    borderRadius: (LOGO_SIZE + 24) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(67, 198, 172, 0.55)',
  },
  orbitDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  orbitDotSmall: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotTop: {
    top: -5,
    alignSelf: 'center',
  },
  dotBottom: {
    bottom: -5,
    alignSelf: 'center',
  },
  dotLeft: {
    left: -5,
    top: '50%',
    marginTop: -5,
  },
  dotRight: {
    right: -5,
    top: '50%',
    marginTop: -5,
  },
  // FX 3: Cyberpunk Glitch & Scanline
  ghostLogoWrap: {
    position: 'absolute',
    width: LOGO_SIZE + 4,
    height: LOGO_SIZE + 4,
    borderRadius: (LOGO_SIZE + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyanGhostBorder: {
    borderWidth: 2,
    borderColor: '#00F5D4',
  },
  pinkGhostBorder: {
    borderWidth: 2,
    borderColor: '#FF2A85',
  },
  laserScanline: {
    position: 'absolute',
    width: LOGO_SIZE + 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00F5D4',
  },
  // FX 4: Bounce Ripple & Starburst
  floorRipple: {
    position: 'absolute',
    width: LOGO_SIZE * 0.9,
    height: LOGO_SIZE * 0.9,
    borderRadius: (LOGO_SIZE * 0.9) / 2,
    borderWidth: 2.5,
    borderColor: '#6C63FF',
  },
  sparkDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
