import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Plus, X, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme, COLOR_THEMES, ThemeColors } from '@/constants/theme';
import { ATTENDANCE_PRESETS } from '@/constants/skills';
import ScreenShell from '@/components/ScreenShell';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, children, T,
}: { title: string; children: React.ReactNode; T: ThemeColors }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.sectionTitle, { color: T.primary }]}>{title}</Text>
        {open ? <ChevronUp size={16} color={T.muted} /> : <ChevronDown size={16} color={T.muted} />}
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

// ─── Labeled row ─────────────────────────────────────────────────────────────

function LabelRow({ label, T, children }: { label: string; T: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.rowLabel, { color: T.muted }]}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const teams = useAppStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);
  const isPro = useAppStore((s) => s.isPro);
  const coaches = useAppStore((s) => s.coaches);
  const customThresholds = useAppStore((s) => s.customThresholds);
  const ratingDisplayMode = useAppStore((s) => s.ratingDisplayMode);

  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomTheme = useAppStore((s) => s.setCustomTheme);
  const togglePro = useAppStore((s) => s.togglePro);
  const addTeam = useAppStore((s) => s.addTeam);
  const updateTeam = useAppStore((s) => s.updateTeam);
  const removeTeam = useAppStore((s) => s.removeTeam);
  const addSeason = useAppStore((s) => s.addSeason);
  const removeSeason = useAppStore((s) => s.removeSeason);
  const setSeason = useAppStore((s) => s.setSeason);
  const addCoach = useAppStore((s) => s.addCoach);
  const removeCoach = useAppStore((s) => s.removeCoach);
  const setCustomThresholds = useAppStore((s) => s.setCustomThresholds);
  const setRatingDisplayMode = useAppStore((s) => s.setRatingDisplayMode);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  // ── Local state ────────────────────────────────────────────────────────────
  const [teamName, setTeamName] = useState(activeTeam?.name ?? '');
  const [teamLevel, setTeamLevel] = useState(activeTeam?.level ?? '');
  const [newTeamName, setNewTeamName] = useState('');
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newSeason, setNewSeason] = useState('');
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachRole, setNewCoachRole] = useState('');
  const [customHex, setCustomHex] = useState({
    primary: customTheme?.primary ?? '',
    accent: customTheme?.accent ?? '',
    bg: customTheme?.bg ?? '',
    card: customTheme?.card ?? '',
    border: customTheme?.border ?? '',
    muted: customTheme?.muted ?? '',
  });
  const [thresholds, setThresholds] = useState({
    yellowAbsences: String(customThresholds.yellowAbsences),
    redAbsences: String(customThresholds.redAbsences),
    yellowPct: String(customThresholds.yellowPct),
    redPct: String(customThresholds.redPct),
  });

  // ── Team info save ─────────────────────────────────────────────────────────

  const saveTeamInfo = () => {
    if (!teamName.trim()) return;
    updateTeam(activeTeamId, { name: teamName.trim(), level: teamLevel.trim() });
  };

  // ── Attendance thresholds ──────────────────────────────────────────────────

  const saveThresholds = () => {
    const t = {
      yellowAbsences: parseInt(thresholds.yellowAbsences, 10) || ATTENDANCE_PRESETS.yellowAbsences,
      redAbsences: parseInt(thresholds.redAbsences, 10) || ATTENDANCE_PRESETS.redAbsences,
      yellowPct: parseInt(thresholds.yellowPct, 10) || ATTENDANCE_PRESETS.yellowPct,
      redPct: parseInt(thresholds.redPct, 10) || ATTENDANCE_PRESETS.redPct,
    };
    setCustomThresholds(t);
    Alert.alert('Saved', 'Attendance thresholds updated.');
  };

  // ── Custom color theme save ────────────────────────────────────────────────

  const saveCustomColors = () => {
    const hexRe = /^#[0-9A-Fa-f]{6}$/;
    const vals = Object.values(customHex);
    if (vals.some((v) => v && !hexRe.test(v))) {
      Alert.alert('Invalid color', 'Colors must be 6-digit hex codes (e.g. #1A2B3C).');
      return;
    }
    setCustomTheme(customHex);
    setTheme('custom');
  };

  return (
    <ScreenShell>
      {/* Pro toggle */}
      <View style={[styles.proRow, { backgroundColor: T.card, borderColor: T.border }]}>
        <View>
          <Text style={[styles.proLabel, { color: T.primary }]}>{isPro ? '✨ Pro Active' : 'Free Plan'}</Text>
          <Text style={[styles.proSub, { color: T.muted }]}>{isPro ? 'All features unlocked' : 'Upgrade for full access'}</Text>
        </View>
        <Switch
          value={isPro}
          onValueChange={togglePro}
          trackColor={{ false: T.border, true: T.accent }}
          thumbColor="#fff"
        />
      </View>

      {/* Team info */}
      <Section title="Team Info" T={T}>
        <LabelRow label="Name" T={T}>
          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            onBlur={saveTeamInfo}
            placeholder="Team name"
            placeholderTextColor={T.muted}
            style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
        </LabelRow>
        <LabelRow label="Level" T={T}>
          <TextInput
            value={teamLevel}
            onChangeText={setTeamLevel}
            onBlur={saveTeamInfo}
            placeholder="e.g. Level 3"
            placeholderTextColor={T.muted}
            style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
        </LabelRow>

        <View style={[styles.divider, { backgroundColor: T.border }]} />

        <Text style={[styles.subLabel, { color: T.muted }]}>All Teams</Text>
        {teams.map((team) => (
          <View key={team.id} style={styles.listRow}>
            <Text style={[styles.listRowText, { color: T.primary }]}>{team.name}{team.level ? ` — ${team.level}` : ''}</Text>
            {team.id !== activeTeamId && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Remove team?', `"${team.name}" and all its data will be deleted.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeTeam(team.id) },
                  ])
                }
              >
                <X size={14} color="#C4A2AE" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        {showAddTeam && (
          <View style={styles.addRow}>
            <TextInput
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder="New team name"
              placeholderTextColor={T.muted}
              style={[styles.textInput, { flex: 1, borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
            />
            <TouchableOpacity
              style={[styles.smBtn, { backgroundColor: T.primary }]}
              onPress={() => { if (newTeamName.trim()) { addTeam(newTeamName.trim()); setNewTeamName(''); setShowAddTeam(false); } }}
            >
              <Check size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: T.border }]}
          onPress={() => setShowAddTeam((v) => !v)}
        >
          <Plus size={12} color={T.muted} />
          <Text style={[styles.outlineBtnText, { color: T.muted }]}>Add Team</Text>
        </TouchableOpacity>
      </Section>

      {/* Seasons */}
      <Section title="Seasons" T={T}>
        <Text style={[styles.subLabel, { color: T.muted }]}>Active Season</Text>
        <View style={[styles.pickerWrap, { borderColor: T.border, backgroundColor: T.bg, marginBottom: 10 }]}>
          <Picker
            selectedValue={season}
            onValueChange={(v) => setSeason(v as string)}
            style={{ color: T.primary }}
            dropdownIconColor={T.muted}
          >
            {seasons.map((s) => <Picker.Item key={s} label={s} value={s} />)}
          </Picker>
        </View>

        <Text style={[styles.subLabel, { color: T.muted }]}>All Seasons</Text>
        {seasons.map((s) => (
          <View key={s} style={styles.listRow}>
            <Text style={[styles.listRowText, { color: T.primary }]}>{s}</Text>
            {seasons.length > 1 && (
              <TouchableOpacity onPress={() =>
                Alert.alert('Remove season?', `All evaluation data for "${s}" will be lost.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeSeason(s) },
                ])
              }>
                <X size={14} color="#C4A2AE" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={styles.addRow}>
          <TextInput
            value={newSeason}
            onChangeText={setNewSeason}
            placeholder="e.g. 2025-2026"
            placeholderTextColor={T.muted}
            style={[styles.textInput, { flex: 1, borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
          <TouchableOpacity
            style={[styles.smBtn, { backgroundColor: T.primary }]}
            onPress={() => { if (newSeason.trim()) { addSeason(newSeason.trim()); setNewSeason(''); } }}
          >
            <Plus size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </Section>

      {/* Color themes */}
      <Section title="Color Theme" T={T}>
        <View style={styles.themeGrid}>
          {COLOR_THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={[
                styles.themeChip,
                {
                  backgroundColor: theme.card,
                  borderColor: themeKey === theme.key ? theme.accent : theme.border,
                  borderWidth: themeKey === theme.key ? 2 : 1,
                },
              ]}
              onPress={() => setTheme(theme.key)}
            >
              <View style={[styles.themeAccentDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.themeChipLabel, { color: theme.primary }]}>{theme.label}</Text>
              {themeKey === theme.key && <Check size={11} color={theme.accent} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Pro: custom colors */}
        {isPro ? (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.subLabel, { color: T.muted }]}>Custom Colors (hex)</Text>
            {(Object.keys(customHex) as Array<keyof typeof customHex>).map((key) => (
              <LabelRow key={key} label={key} T={T}>
                <TextInput
                  value={customHex[key]}
                  onChangeText={(v) => setCustomHex((prev) => ({ ...prev, [key]: v }))}
                  placeholder="#1A2B3C"
                  placeholderTextColor={T.muted}
                  autoCapitalize="characters"
                  maxLength={7}
                  style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
                />
              </LabelRow>
            ))}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: T.primary }]} onPress={saveCustomColors}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Apply Custom Theme</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44`, marginTop: 10 }]}>
            <Text style={[styles.proBannerText, { color: T.accent }]}>🔒 Pro: Custom hex color scheme</Text>
          </View>
        )}
      </Section>

      {/* Rating display */}
      <Section title="Rating Display" T={T}>
        {(['color', 'number', 'both'] as const).map((mode) => {
          const labels = { color: 'Color Dot Only', number: 'Label + Dot', both: 'Both (full)' };
          const isSelected = ratingDisplayMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.radioRow,
                { borderColor: isSelected ? T.accent : T.border, backgroundColor: isSelected ? `${T.accent}14` : 'transparent' },
              ]}
              onPress={() => setRatingDisplayMode(mode)}
            >
              <View style={[styles.radioDot, { borderColor: isSelected ? T.accent : T.border }]}>
                {isSelected && <View style={[styles.radioInner, { backgroundColor: T.accent }]} />}
              </View>
              <Text style={[styles.radioLabel, { color: T.primary }]}>{labels[mode]}</Text>
              {!isPro && mode !== 'color' && (
                <Text style={[styles.proTag, { color: T.accent }]}>Pro</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Section>

      {/* Attendance thresholds */}
      <Section title="Attendance Alerts" T={T}>
        <Text style={[styles.thresholdHint, { color: T.muted }]}>
          Alert is triggered when absences ≥ threshold OR attendance % ≤ threshold.
        </Text>

        {[
          { key: 'yellowAbsences', label: 'Yellow — absences', placeholder: String(ATTENDANCE_PRESETS.yellowAbsences) },
          { key: 'redAbsences', label: 'Red — absences', placeholder: String(ATTENDANCE_PRESETS.redAbsences) },
          { key: 'yellowPct', label: 'Yellow — attend. %', placeholder: String(ATTENDANCE_PRESETS.yellowPct) },
          { key: 'redPct', label: 'Red — attend. %', placeholder: String(ATTENDANCE_PRESETS.redPct) },
        ].map(({ key, label, placeholder }) => (
          <LabelRow key={key} label={label} T={T}>
            <TextInput
              value={thresholds[key as keyof typeof thresholds]}
              onChangeText={(v) => setThresholds((prev) => ({ ...prev, [key]: v }))}
              placeholder={placeholder}
              placeholderTextColor={T.muted}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
              editable={isPro}
            />
          </LabelRow>
        ))}

        {isPro ? (
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: T.primary }]} onPress={saveThresholds}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save Thresholds</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44`, marginTop: 8 }]}>
            <Text style={[styles.proBannerText, { color: T.accent }]}>🔒 Pro: Custom attendance alert thresholds</Text>
          </View>
        )}
      </Section>

      {/* Coaches */}
      <Section title="Coaches" T={T}>
        {coaches.map((c) => (
          <View key={c.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listRowText, { color: T.primary }]}>{c.name}</Text>
              {c.role ? <Text style={[styles.coachRole, { color: T.muted }]}>{c.role}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => removeCoach(c.id)}>
              <X size={14} color="#C4A2AE" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ gap: 6, marginTop: 6 }}>
          <TextInput
            value={newCoachName}
            onChangeText={setNewCoachName}
            placeholder="Name"
            placeholderTextColor={T.muted}
            style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
          <TextInput
            value={newCoachRole}
            onChangeText={setNewCoachRole}
            placeholder="Role (optional)"
            placeholderTextColor={T.muted}
            style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: T.primary }]}
            onPress={() => {
              if (!newCoachName.trim()) return;
              addCoach({ name: newCoachName.trim(), role: newCoachRole.trim() });
              setNewCoachName('');
              setNewCoachRole('');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add Coach</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* App info */}
      <View style={[styles.appInfo, { borderColor: T.border }]}>
        <Text style={[styles.appInfoText, { color: T.muted }]}>InSync Athletics · v1.0.0</Text>
        <Text style={[styles.appInfoText, { color: T.muted }]}>All data stored locally on device</Text>
      </View>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  proRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 11 },
  proLabel: { fontWeight: '800', fontSize: 14 },
  proSub: { fontSize: 11, marginTop: 1 },

  section: { borderWidth: 1, borderRadius: 12, marginBottom: 11, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13 },
  sectionTitle: { fontWeight: '700', fontSize: 14 },
  sectionBody: { paddingHorizontal: 13, paddingBottom: 13, gap: 7 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, width: 80, flexShrink: 0 },

  textInput: { borderWidth: 1, borderRadius: 8, padding: 9, fontSize: 13 },
  pickerWrap: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },

  divider: { height: 1, marginVertical: 4 },
  subLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  listRowText: { fontSize: 13, fontWeight: '600' },
  coachRole: { fontSize: 10, marginTop: 1 },

  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  smBtn: { borderRadius: 7, padding: 9 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingVertical: 8, marginTop: 2 },
  outlineBtnText: { fontWeight: '700', fontSize: 12 },

  saveBtn: { borderRadius: 8, padding: 10, alignItems: 'center' },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  themeAccentDot: { width: 9, height: 9, borderRadius: 5 },
  themeChipLabel: { fontSize: 11, fontWeight: '700' },

  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  radioLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  proTag: { fontSize: 10, fontWeight: '800' },

  thresholdHint: { fontSize: 11, marginBottom: 4 },

  proBanner: { borderWidth: 1, borderRadius: 10, padding: 11 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  appInfo: { borderTopWidth: 1, paddingTop: 14, paddingBottom: 4, alignItems: 'center', gap: 3 },
  appInfoText: { fontSize: 11 },
});
