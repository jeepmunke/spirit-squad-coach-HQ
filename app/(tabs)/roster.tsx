import { View, Text } from 'react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import ScreenShell from '@/components/ScreenShell';

export default function RosterScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  return (
    <ScreenShell>
      <Text style={{ color: T.primary, fontWeight: '700', fontSize: 16 }}>Roster — coming soon</Text>
    </ScreenShell>
  );
}
