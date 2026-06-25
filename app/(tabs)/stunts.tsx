import { Text } from 'react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import ScreenShell from '@/components/ScreenShell';

export default function StuntsScreen() {
  const T = resolveTheme(useAppStore((s) => s.themeKey), useAppStore((s) => s.customTheme));
  return <ScreenShell><Text style={{ color: T.primary, fontWeight: '700', fontSize: 16 }}>Stunts — coming soon</Text></ScreenShell>;
}
