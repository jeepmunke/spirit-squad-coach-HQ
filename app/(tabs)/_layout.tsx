import { Tabs } from 'expo-router';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import { Users, ClipboardCheck, Target, UsersRound, Star, BarChart2, Settings } from 'lucide-react-native';

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
      <Tabs.Screen name="roster"      options={{ title: 'Roster',     tabBarIcon: ({ color }) => <Users size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="attendance"  options={{ title: 'Attendance', tabBarIcon: ({ color }) => <ClipboardCheck size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="evaluations" options={{ title: 'Skills',     tabBarIcon: ({ color }) => <Target size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="stunts"      options={{ title: 'Stunts',     tabBarIcon: ({ color }) => <UsersRound size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="snapshot"    options={{ title: 'Snapshot',   tabBarIcon: ({ color }) => <Star size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="graph"       options={{ title: 'Graph',      tabBarIcon: ({ color }) => <BarChart2 size={18} color={color} strokeWidth={2.2} /> }} />
      <Tabs.Screen name="settings"    options={{ title: 'Settings',   tabBarIcon: ({ color }) => <Settings size={18} color={color} strokeWidth={2.2} /> }} />
    </Tabs>
  );
}
