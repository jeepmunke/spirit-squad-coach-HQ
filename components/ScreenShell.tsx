import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Users, Info, X } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme } from '@/constants/theme';

// ─── Custom selector button + bottom-sheet modal ──────────────────────────────

interface Option { label: string; value: string | number }

function SelectorDropdown({
  label, options, value, onSelect,
}: {
  label: string;
  options: Option[];
  value: string | number;
  onSelect: (v: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity style={styles.selectorBtn} onPress={() => setOpen(true)}>
        <Text style={styles.selectorText} numberOfLines={1}>
          {selected?.label ?? label}
        </Text>
        <ChevronDown size={11} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.modalOption}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
              >
                <Text style={[styles.modalOptionText, opt.value === value && styles.modalOptionTextSelected]}>
                  {opt.label}
                </Text>
                {opt.value === value && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── ScreenShell ──────────────────────────────────────────────────────────────

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
  const togglePro = useAppStore((s) => s.togglePro);
  const athletes = useAppStore((s) => s.athletes);
  const coaches = useAppStore((s) => s.coaches);

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));

  const [panelTab, setPanelTab] = useState<'roster' | 'info' | null>(null);

  const Content = scrollable ? ScrollView : View;

  const teamOptions: Option[] = teams.map((t) => ({ label: t.name, value: t.id }));
  const seasonOptions: Option[] = seasons.map((s) => ({
    label: s === currentSeason ? `${s} ★` : s,
    value: s,
  }));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.primary }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: T.primary }]}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>InSync</Text>
            <Text style={[styles.brandSub, { color: T.accent }]}>{isPro ? 'ATHLETICS PRO' : 'ATHLETICS'}</Text>
          </View>
          <View style={styles.selectors}>
            <SelectorDropdown
              label="Team"
              options={teamOptions}
              value={activeTeamId}
              onSelect={(v) => setActiveTeamId(Number(v))}
            />
            <SelectorDropdown
              label="Season"
              options={seasonOptions}
              value={season}
              onSelect={(v) => setSeason(v as string)}
            />
          </View>
        </View>

        {/* Pro toggle + panel toggles */}
        <View style={styles.subRow}>
          <View style={styles.proRow}>
            <Text style={[styles.proLabel, { color: isPro ? T.accent : 'rgba(255,255,255,0.7)' }]}>
              {isPro ? '⚡ Pro Active' : 'Free Plan'}
            </Text>
            <TouchableOpacity
              style={[styles.proBtn, { backgroundColor: isPro ? T.accent : 'rgba(255,255,255,0.15)' }]}
              onPress={togglePro}
            >
              <Text style={[styles.proBtnText, { color: isPro ? T.primary : '#fff' }]}>
                {isPro ? 'Pro ✓' : 'Upgrade'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panelBtns}>
            <TouchableOpacity
              style={[styles.panelBtn, panelTab === 'roster' && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => setPanelTab(panelTab === 'roster' ? null : 'roster')}
            >
              <Users size={13} color="#fff" />
              <Text style={styles.panelBtnText}>Roster</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.panelBtn, panelTab === 'info' && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => setPanelTab(panelTab === 'info' ? null : 'info')}
            >
              <Info size={13} color="#fff" />
              <Text style={styles.panelBtnText}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Expandable panel ── */}
        {panelTab === 'roster' && (
          <View style={[styles.panel, { borderColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {activeTeam?.name ?? 'Team'} — {teamAthletes.length} athlete{teamAthletes.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => setPanelTab(null)}>
                <X size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {teamAthletes.length === 0 ? (
                <Text style={styles.panelMuted}>No athletes — go to Roster tab to add.</Text>
              ) : teamAthletes.map((a) => (
                <View key={a.id} style={styles.athleteChip}>
                  <Text style={styles.athleteChipName}>{a.name}</Text>
                  <Text style={styles.athleteChipSub}>{a.position}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {panelTab === 'info' && (
          <View style={[styles.panel, { borderColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{activeTeam?.name ?? 'Team'}</Text>
              <TouchableOpacity onPress={() => setPanelTab(null)}>
                <X size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <View style={styles.infoGrid}>
              {activeTeam?.level ? (
                <View>
                  <Text style={styles.infoLabel}>Level</Text>
                  <Text style={styles.infoValue}>{activeTeam.level}</Text>
                </View>
              ) : null}
              {activeTeam?.division ? (
                <View>
                  <Text style={styles.infoLabel}>Division</Text>
                  <Text style={styles.infoValue}>{activeTeam.division}</Text>
                </View>
              ) : null}
              <View>
                <Text style={styles.infoLabel}>Season</Text>
                <Text style={styles.infoValue}>{season}{season === currentSeason ? ' ★' : ''}</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Athletes</Text>
                <Text style={styles.infoValue}>{teamAthletes.length}</Text>
              </View>
            </View>
            {coaches.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.infoLabel}>Coaches</Text>
                <Text style={styles.infoValue}>
                  {coaches.map((c) => c.role ? `${c.name} (${c.role})` : c.name).join(' · ')}
                </Text>
              </View>
            )}
          </View>
        )}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },

  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  brandRow: { flexDirection: 'column', alignItems: 'center' },
  brandName: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  brandSub: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center', marginTop: -1 },

  selectors: { flexDirection: 'row', gap: 6 },
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: 130,
  },
  selectorText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },

  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  proRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  proLabel: { fontSize: 11, fontWeight: '700' },
  proBtn: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  proBtnText: { fontWeight: '800', fontSize: 11 },

  panelBtns: { flexDirection: 'row', gap: 4 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  panelBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  panel: { marginTop: 8, borderTopWidth: 1, paddingTop: 9 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
  panelMuted: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  athleteChip: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 7,
  },
  athleteChipName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  athleteChipSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 1 },

  body: { flex: 1 },

  // Bottom-sheet modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#222' },
  modalOptionTextSelected: { fontWeight: '800' },
  checkMark: { fontSize: 16, fontWeight: '800', color: '#4CAF7D' },
});
