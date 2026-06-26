import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Star, BarChart2, Trophy, UserCog, Settings, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import ScreenShell from '@/components/ScreenShell';

const MORE_ITEMS = [
  {
    title: 'Snapshot',
    subtitle: 'Athlete progress at a glance',
    route: '/(tabs)/snapshot',
    Icon: Star,
    color: '#9B7FD4',
  },
  {
    title: 'Graph',
    subtitle: 'Skill rating trends over time',
    route: '/(tabs)/graph',
    Icon: BarChart2,
    color: '#5B9BD5',
  },
  {
    title: 'Score',
    subtitle: 'Competition scorecards & rubrics',
    route: '/(tabs)/scorecard',
    Icon: Trophy,
    color: '#E8A33D',
  },
  {
    title: 'Staff',
    subtitle: 'Coaching staff & contacts',
    route: '/(tabs)/coaches',
    Icon: UserCog,
    color: '#4CAF7D',
  },
  {
    title: 'Settings',
    subtitle: 'Teams, seasons, themes & more',
    route: '/(tabs)/settings',
    Icon: Settings,
    color: '#D9667A',
  },
];

export default function MoreScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  return (
    <ScreenShell>
      <Text style={[styles.heading, { color: T.primary }]}>More</Text>
      <Text style={[styles.subheading, { color: T.muted }]}>Additional screens & tools</Text>

      {/* 2-column grid for first 4 items */}
      <View style={styles.grid}>
        {MORE_ITEMS.slice(0, 4).map(({ title, subtitle, route, Icon, color }) => (
          <TouchableOpacity
            key={route}
            style={[styles.gridCard, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={() => router.navigate(route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
              <Icon size={24} color={color} strokeWidth={2} />
            </View>
            <Text style={[styles.gridTitle, { color: T.primary }]}>{title}</Text>
            <Text style={[styles.gridSub, { color: T.muted }]} numberOfLines={2}>{subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings as a full-width row */}
      {MORE_ITEMS.slice(4).map(({ title, subtitle, route, Icon, color }) => (
        <TouchableOpacity
          key={route}
          style={[styles.rowCard, { backgroundColor: T.card, borderColor: T.border }]}
          onPress={() => router.navigate(route as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.rowIconWrap, { backgroundColor: `${color}18` }]}>
            <Icon size={20} color={color} strokeWidth={2} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: T.primary }]}>{title}</Text>
            <Text style={[styles.rowSub, { color: T.muted }]}>{subtitle}</Text>
          </View>
          <ChevronRight size={16} color={T.muted} />
        </TouchableOpacity>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  subheading: { fontSize: 12, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  gridCard: {
    width: '47.5%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gridTitle: { fontSize: 14, fontWeight: '800' },
  gridSub: { fontSize: 11, lineHeight: 16 },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 12,
    marginBottom: 8,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowSub: { fontSize: 11, marginTop: 1 },
});
