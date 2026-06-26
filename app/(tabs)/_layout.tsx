import { Tabs } from 'expo-router';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import { Users, ClipboardCheck, Target, UsersRound, MoreHorizontal } from 'lucide-react-native';

export default function TabLayout() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: T.card, borderTopColor: T.border },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen name="roster"      options={{ title: 'Roster',  tabBarIcon: ({ color }) => <Users size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="attendance"  options={{ title: 'Attend',  tabBarIcon: ({ color }) => <ClipboardCheck size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="evaluations" options={{ title: 'Skills',  tabBarIcon: ({ color }) => <Target size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="stunts"      options={{ title: 'Stunts',  tabBarIcon: ({ color }) => <UsersRound size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="more"        options={{ title: 'More',    tabBarIcon: ({ color }) => <MoreHorizontal size={18} color={color} strokeWidth={2.2} /> }} />

      {/* ── Hidden tabs (accessible via More menu) ── */}
      <Tabs.Screen name="snapshot"    options={{ href: null }} />
      <Tabs.Screen name="graph"       options={{ href: null }} />
      <Tabs.Screen name="scorecard"   options={{ href: null }} />
      <Tabs.Screen name="coaches"     options={{ href: null }} />
      <Tabs.Screen name="settings"    options={{ href: null }} />
    </Tabs>
  );
}
