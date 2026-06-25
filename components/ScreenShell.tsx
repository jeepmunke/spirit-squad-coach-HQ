import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props {
  children: React.ReactNode;
  scrollable?: boolean;
}

export default function ScreenShell({ children, scrollable = true }: Props) {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const teams = useAppStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const setActiveTeamId = useAppStore((s) => s.setActiveTeamId);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);
  const currentSeason = useAppStore((s) => s.currentSeason);
  const setSeason = useAppStore((s) => s.setSeason);
  const isPro = useAppStore((s) => s.isPro);
  const setIsPro = useAppStore((s) => s.setIsPro);

  const Content = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.primary }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: T.primary }]}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Spirit Squad</Text>
            <Text style={[styles.brandSub, { color: T.accent }]}>COACH HQ</Text>
          </View>
          <View style={styles.selectors}>
            <View style={[styles.pickerWrap, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Picker
                selectedValue={activeTeamId}
                onValueChange={(v) => setActiveTeamId(Number(v))}
                style={styles.picker}
                dropdownIconColor="#fff"
                mode="dropdown"
              >
                {teams.map((t) => (
                  <Picker.Item key={t.id} label={t.name} value={t.id} color={Platform.OS === 'ios' ? T.primary : '#000'} />
                ))}
              </Picker>
            </View>
            <View style={[styles.pickerWrap, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <Picker
                selectedValue={season}
                onValueChange={setSeason}
                style={styles.picker}
                dropdownIconColor="#fff"
                mode="dropdown"
              >
                {seasons.map((s) => (
                  <Picker.Item key={s} label={s === currentSeason ? `${s} ★` : s} value={s} color={Platform.OS === 'ios' ? T.primary : '#000'} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Pro toggle */}
        <View style={styles.proRow}>
          <View>
            <Text style={[styles.proLabel, { color: isPro ? T.accent : '#fff' }]}>
              {isPro ? '⚡ Pro Mode Active' : 'Free Plan'}
            </Text>
            <Text style={styles.proSub}>
              {isPro ? 'All features unlocked' : 'Tap to preview Pro features'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.proBtn, { backgroundColor: isPro ? T.accent : 'rgba(255,255,255,0.15)' }]}
            onPress={() => setIsPro(!isPro)}
          >
            <Text style={[styles.proBtnText, { color: isPro ? T.primary : '#fff' }]}>
              {isPro ? 'Pro ✓' : 'Upgrade'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={[styles.body, { backgroundColor: T.bg }]}>
        <Content
          style={{ flex: 1 }}
          contentContainerStyle={scrollable ? { padding: 14 } : undefined}
        >
          {children}
        </Content>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  brandName: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  brandSub: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  selectors: { flexDirection: 'row', gap: 6 },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.13)',
    height: 34,
    justifyContent: 'center',
    minWidth: 100,
  },
  picker: { color: '#fff', height: 34, fontSize: 11 },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proLabel: { fontSize: 13, fontWeight: '800' },
  proSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  proBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  proBtnText: { fontWeight: '800', fontSize: 13 },
  body: { flex: 1 },
});
