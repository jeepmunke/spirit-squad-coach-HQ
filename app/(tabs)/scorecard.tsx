import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet,
  Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Plus, Trash2, Trophy, ChevronDown, X, Calendar, ClipboardList, Settings2 } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { BUILT_IN_RUBRICS, BuiltInRubric } from '@/constants/rubrics';
import ScreenShell from '@/components/ScreenShell';
import type { CompetitionScore, CustomRubric, RubricCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatChange(val: number): { text: string; color: string } {
  if (val > 0) return { text: `+${val.toFixed(1)}`, color: '#4CAF7D' };
  if (val < 0) return { text: val.toFixed(1), color: '#D9667A' };
  return { text: '±0.0', color: '#888' };
}

function calcTotal(scores: Record<string, number>, categories: RubricCategory[]): number {
  let total = 0;
  for (const cat of categories) {
    if (cat.subcategories?.length) {
      for (const sub of cat.subcategories) {
        total += scores[sub.id] ?? 0;
      }
    } else {
      total += scores[cat.id] ?? 0;
    }
  }
  return total;
}

function avgScores(list: CompetitionScore[]): number | null {
  if (!list.length) return null;
  return list.reduce((s, c) => s + c.totalScore, 0) / list.length;
}

// ─── Stat / Change chips ──────────────────────────────────────────────────────

const chip = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center', flex: 1 },
  label: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  val: { fontSize: 14, fontWeight: '700', marginTop: 2 },
});

function StatChip({ label, value, T }: { label: string; value: number | null; T: ThemeColors }) {
  return (
    <View style={[chip.wrap, { borderColor: T.border }]}>
      <Text style={[chip.label, { color: T.muted }]}>{label}</Text>
      <Text style={[chip.val, { color: value !== null ? T.primary : T.muted }]}>
        {value !== null ? value.toFixed(1) : '—'}
      </Text>
    </View>
  );
}

function ChangeChip({ label, value, T }: { label: string; value: number | null; T: ThemeColors }) {
  if (value === null) return (
    <View style={[chip.wrap, { borderColor: T.border }]}>
      <Text style={[chip.label, { color: T.muted }]}>{label}</Text>
      <Text style={[chip.val, { color: T.muted }]}>—</Text>
    </View>
  );
  const { text, color } = formatChange(value);
  return (
    <View style={[chip.wrap, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
      <Text style={[chip.label, { color }]}>{label}</Text>
      <Text style={[chip.val, { color, fontWeight: '800' }]}>{text}</Text>
    </View>
  );
}

// ─── Score Entry Form ─────────────────────────────────────────────────────────

function ScoreForm({
  categories, scores, onChange, T,
}: {
  categories: RubricCategory[];
  scores: Record<string, number>;
  onChange: (id: string, val: number) => void;
  T: ThemeColors;
}) {
  return (
    <View style={{ gap: 10 }}>
      {categories.map((cat) => {
        const catTotal = cat.subcategories?.length
          ? cat.subcategories.reduce((s, sub) => s + (scores[sub.id] ?? 0), 0)
          : (scores[cat.id] ?? 0);
        const pct = Math.min(100, (catTotal / cat.maxPoints) * 100);

        return (
          <View key={cat.id} style={[sf.catCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={sf.catHeader}>
              <Text style={[sf.catName, { color: T.primary }]}>{cat.name}</Text>
              <View style={sf.catScorePill}>
                <Text style={[sf.catScore, { color: catTotal > 0 ? T.primary : T.muted }]}>
                  {catTotal.toFixed(1)}
                </Text>
                <Text style={[sf.catMax, { color: T.muted }]}>/{cat.maxPoints}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={[sf.bar, { backgroundColor: T.bg }]}>
              <View style={[sf.barFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? '#4CAF7D' : pct >= 50 ? T.accent : '#D9667A' }]} />
            </View>

            {/* Inputs */}
            {cat.subcategories?.length ? (
              <View style={{ gap: 7, marginTop: 8 }}>
                {cat.subcategories.map((sub) => (
                  <View key={sub.id} style={sf.subRow}>
                    <Text style={[sf.subName, { color: T.muted }]}>{sub.name}</Text>
                    <View style={sf.inputWrap}>
                      <TextInput
                        style={[sf.input, { color: T.primary, borderColor: scores[sub.id] ? T.primary : T.border, backgroundColor: T.bg }]}
                        value={scores[sub.id] !== undefined ? String(scores[sub.id]) : ''}
                        onChangeText={(v) => {
                          const n = parseFloat(v);
                          if (v === '' || v === '.') onChange(sub.id, 0);
                          else if (!isNaN(n)) onChange(sub.id, Math.min(sub.maxPoints, Math.max(0, n)));
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={T.muted}
                      />
                      <Text style={[sf.maxLabel, { color: T.muted }]}>/{sub.maxPoints}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[sf.subRow, { marginTop: 8 }]}>
                <Text style={[sf.subName, { color: T.muted }]}>Score</Text>
                <View style={sf.inputWrap}>
                  <TextInput
                    style={[sf.input, { color: T.primary, borderColor: scores[cat.id] ? T.primary : T.border, backgroundColor: T.bg }]}
                    value={scores[cat.id] !== undefined ? String(scores[cat.id]) : ''}
                    onChangeText={(v) => {
                      const n = parseFloat(v);
                      if (v === '' || v === '.') onChange(cat.id, 0);
                      else if (!isNaN(n)) onChange(cat.id, Math.min(cat.maxPoints, Math.max(0, n)));
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={T.muted}
                  />
                  <Text style={[sf.maxLabel, { color: T.muted }]}>/{cat.maxPoints}</Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const sf = StyleSheet.create({
  catCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catName: { fontWeight: '700', fontSize: 13, flex: 1 },
  catScorePill: { flexDirection: 'row', alignItems: 'baseline' },
  catScore: { fontSize: 15, fontWeight: '800' },
  catMax: { fontSize: 11, fontWeight: '600' },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subName: { fontSize: 12, flex: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { borderWidth: 1, borderRadius: 7, width: 58, textAlign: 'center', fontSize: 14, fontWeight: '700', paddingVertical: 5 },
  maxLabel: { fontSize: 11, fontWeight: '600', minWidth: 28 },
});

// ─── Custom Rubric Builder (Pro) ──────────────────────────────────────────────

function CustomRubricBuilder({
  visible, onSave, onClose, T,
}: {
  visible: boolean;
  onSave: (r: Omit<CustomRubric, 'id'>) => void;
  onClose: () => void;
  T: ThemeColors;
}) {
  const [name, setName] = useState('');
  const [cats, setCats] = useState<Array<{ name: string; maxPoints: string }>>([
    { name: '', maxPoints: '20' },
  ]);

  const total = cats.reduce((s, c) => s + (parseFloat(c.maxPoints) || 0), 0);

  const addCat = () => setCats((p) => [...p, { name: '', maxPoints: '10' }]);
  const removeCat = (i: number) => setCats((p) => p.filter((_, j) => j !== i));
  const updateCat = (i: number, key: 'name' | 'maxPoints', val: string) =>
    setCats((p) => p.map((c, j) => j === i ? { ...c, [key]: val } : c));

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const validCats = cats.filter((c) => c.name.trim());
    if (!validCats.length) { Alert.alert('Add at least one category'); return; }
    onSave({
      name: name.trim(),
      totalPoints: total,
      categories: validCats.map((c, i) => ({
        id: `custom_cat_${i}`,
        name: c.name.trim(),
        maxPoints: parseFloat(c.maxPoints) || 10,
      })),
    });
    setName('');
    setCats([{ name: '', maxPoints: '20' }]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={crb.overlay}>
        <View style={[crb.sheet, { backgroundColor: T.card }]}>
          <View style={crb.header}>
            <Text style={[crb.title, { color: T.primary }]}>Custom Rubric</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[crb.label, { color: T.muted }]}>RUBRIC NAME</Text>
            <TextInput
              style={[crb.input, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. My Custom Rubric"
              placeholderTextColor={T.muted}
            />

            <Text style={[crb.label, { color: T.muted }]}>CATEGORIES</Text>
            {cats.map((cat, i) => (
              <View key={i} style={crb.catRow}>
                <TextInput
                  style={[crb.catInput, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
                  value={cat.name}
                  onChangeText={(v) => updateCat(i, 'name', v)}
                  placeholder={`Category ${i + 1}`}
                  placeholderTextColor={T.muted}
                />
                <TextInput
                  style={[crb.pointsInput, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
                  value={cat.maxPoints}
                  onChangeText={(v) => updateCat(i, 'maxPoints', v)}
                  keyboardType="numeric"
                  placeholder="pts"
                  placeholderTextColor={T.muted}
                />
                <TouchableOpacity onPress={() => removeCat(i)} style={crb.deleteBtn}>
                  <X size={13} color="#D9667A" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[crb.addCatBtn, { borderColor: T.border }]} onPress={addCat}>
              <Plus size={13} color={T.muted} />
              <Text style={[crb.addCatText, { color: T.muted }]}>Add Category</Text>
            </TouchableOpacity>

            <View style={[crb.totalRow, { borderColor: T.border }]}>
              <Text style={[crb.totalLabel, { color: T.muted }]}>Total Points</Text>
              <Text style={[crb.totalVal, { color: T.primary }]}>{total}</Text>
            </View>

            <TouchableOpacity style={[crb.saveBtn, { backgroundColor: T.primary }]} onPress={handleSave}>
              <Text style={crb.saveBtnText}>Create Rubric</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const crb = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 4 },
  catRow: { flexDirection: 'row', gap: 7, marginBottom: 7, alignItems: 'center' },
  catInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 9, fontSize: 13 },
  pointsInput: { width: 60, borderWidth: 1, borderRadius: 8, padding: 9, fontSize: 13, textAlign: 'center' },
  deleteBtn: { padding: 6 },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 9, marginBottom: 12 },
  addCatText: { fontSize: 12, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginBottom: 14 },
  totalLabel: { fontSize: 13, fontWeight: '700' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  saveBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

// ─── Score History Card ───────────────────────────────────────────────────────

function ScoreCard({
  score, allSeasonScores, prevSeasonAvg, onDelete, T,
}: {
  score: CompetitionScore;
  allSeasonScores: CompetitionScore[];
  prevSeasonAvg: number | null;
  onDelete: () => void;
  T: ThemeColors;
}) {
  const sorted = [...allSeasonScores].sort((a, b) => a.date.localeCompare(b.date));
  const myIdx = sorted.findIndex((s) => s.id === score.id);
  const prevScore = myIdx > 0 ? sorted[myIdx - 1] : null;
  const seasonAvg = avgScores(allSeasonScores);
  const compChange = prevScore ? score.totalScore - prevScore.totalScore : null;
  const seasonChange = prevSeasonAvg !== null && seasonAvg !== null ? seasonAvg - prevSeasonAvg : null;

  const rubricName = BUILT_IN_RUBRICS.find((r) => r.id === score.rubricId)?.shortName ?? score.rubricId;

  return (
    <View style={[sc.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={sc.top}>
        <View style={{ flex: 1 }}>
          <Text style={[sc.compName, { color: T.primary }]}>{score.competitionName}</Text>
          <View style={sc.meta}>
            <Calendar size={11} color={T.muted} />
            <Text style={[sc.metaText, { color: T.muted }]}>{score.date}</Text>
            <View style={[sc.rubricBadge, { borderColor: T.border }]}>
              <Text style={[sc.rubricText, { color: T.muted }]}>{rubricName}</Text>
            </View>
          </View>
        </View>
        <View style={sc.scoreBlock}>
          <Text style={[sc.totalScore, { color: T.primary }]}>{score.totalScore.toFixed(1)}</Text>
          <Text style={[sc.totalMax, { color: T.muted }]}>pts</Text>
        </View>
        <TouchableOpacity style={sc.deleteBtn} onPress={onDelete}>
          <Trash2 size={14} color="#D9667A" />
        </TouchableOpacity>
      </View>

      {/* Change row */}
      <View style={sc.changeRow}>
        <ChangeChip label="Comp Change" value={compChange} T={T} />
        <StatChip label="Season Avg" value={seasonAvg} T={T} />
        <ChangeChip label="Season Δ" value={seasonChange} T={T} />
      </View>

      {score.notes ? (
        <Text style={[sc.notes, { color: T.muted }]}>{score.notes}</Text>
      ) : null}
    </View>
  );
}

const sc = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  compName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11 },
  rubricBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  rubricText: { fontSize: 10, fontWeight: '700' },
  scoreBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginRight: 10 },
  totalScore: { fontSize: 24, fontWeight: '900' },
  totalMax: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  changeRow: { flexDirection: 'row', gap: 7 },
  notes: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type TabId = 'entry' | 'history';

export default function ScorecardScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const isPro = useAppStore((s) => s.isPro);
  const season = useAppStore((s) => s.season);
  const seasons = useAppStore((s) => s.seasons);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const teams = useAppStore((s) => s.teams);
  const competitionScores = useAppStore((s) => s.competitionScores);
  const addCompetitionScore = useAppStore((s) => s.addCompetitionScore);
  const removeCompetitionScore = useAppStore((s) => s.removeCompetitionScore);
  const customRubrics = useAppStore((s) => s.customRubrics);
  const addCustomRubric = useAppStore((s) => s.addCustomRubric);
  const removeCustomRubric = useAppStore((s) => s.removeCustomRubric);

  const [tab, setTab] = useState<TabId>('entry');
  const [rubricId, setRubricId] = useState<string>(BUILT_IN_RUBRICS[0].id);
  const [compName, setCompName] = useState('');
  const [compDate, setCompDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showRubricPicker, setShowRubricPicker] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  // Resolve active rubric categories
  const activeRubric: BuiltInRubric | CustomRubric | undefined = useMemo(() => {
    const builtin = BUILT_IN_RUBRICS.find((r) => r.id === rubricId);
    if (builtin) return builtin;
    return customRubrics.find((r) => r.id === rubricId);
  }, [rubricId, customRubrics]);

  const categories = activeRubric?.categories ?? [];
  const maxTotal = activeRubric?.totalPoints ?? 100;
  const grandTotal = calcTotal(scores, categories);

  const handleScoreChange = useCallback((id: string, val: number) => {
    setScores((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleSave = () => {
    if (!compName.trim()) { Alert.alert('Competition name required'); return; }
    addCompetitionScore({
      teamId: activeTeamId,
      season,
      competitionName: compName.trim(),
      date: compDate,
      rubricId,
      scores,
      totalScore: grandTotal,
      notes: notes.trim(),
    });
    setCompName('');
    setCompDate(today());
    setNotes('');
    setScores({});
    setTab('history');
    Alert.alert('Score saved!');
  };

  // Scores for current team+season
  const teamSeasonScores = useMemo(() =>
    competitionScores
      .filter((s) => s.teamId === activeTeamId && s.season === season)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [competitionScores, activeTeamId, season],
  );

  // Previous season avg
  const prevSeason = seasons[seasons.indexOf(season) - 1];
  const prevSeasonAvg = useMemo(() => {
    if (!prevSeason) return null;
    const prev = competitionScores.filter((s) => s.teamId === activeTeamId && s.season === prevSeason);
    return avgScores(prev);
  }, [competitionScores, activeTeamId, prevSeason]);

  const teamName = teams.find((t) => t.id === activeTeamId)?.name ?? 'Team';

  return (
    <ScreenShell>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: T.primary }]}>Competition Scores</Text>
          <Text style={[styles.pageSub, { color: T.muted }]}>{teamName} · {season}</Text>
        </View>
        <Trophy size={22} color={T.accent} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: T.card, borderColor: T.border }]}>
        {([['entry', 'Enter Score', ClipboardList], ['history', 'History', Trophy]] as const).map(([id, label, Icon]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && { backgroundColor: T.primary }]}
            onPress={() => setTab(id)}
          >
            <Icon size={13} color={tab === id ? '#fff' : T.muted} />
            <Text style={[styles.tabText, { color: tab === id ? '#fff' : T.muted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'entry' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Competition info */}
          <View style={[styles.infoCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.fieldLabel, { color: T.muted }]}>COMPETITION NAME</Text>
            <TextInput
              style={[styles.textInput, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
              value={compName}
              onChangeText={setCompName}
              placeholder="e.g. Regional Showcase"
              placeholderTextColor={T.muted}
            />
            <Text style={[styles.fieldLabel, { color: T.muted }]}>DATE</Text>
            <TextInput
              style={[styles.textInput, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
              value={compDate}
              onChangeText={setCompDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={T.muted}
            />
          </View>

          {/* Rubric selector */}
          <View style={[styles.rubricCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={styles.rubricHeader}>
              <Text style={[styles.rubricLabel, { color: T.muted }]}>SCORING RUBRIC</Text>
              {isPro && (
                <TouchableOpacity style={styles.customRubricBtn} onPress={() => setShowCustomBuilder(true)}>
                  <Settings2 size={12} color={T.accent} />
                  <Text style={[styles.customRubricText, { color: T.accent }]}>Custom</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.rubricPicker, { borderColor: T.border, backgroundColor: T.bg }]}
              onPress={() => setShowRubricPicker(true)}
            >
              <Text style={[styles.rubricPickerText, { color: T.primary }]} numberOfLines={1}>
                {activeRubric?.name ?? 'Select rubric'}
              </Text>
              <ChevronDown size={14} color={T.muted} />
            </TouchableOpacity>

            <Modal visible={showRubricPicker} transparent animationType="fade" onRequestClose={() => setShowRubricPicker(false)}>
              <TouchableOpacity style={styles.rpOverlay} onPress={() => setShowRubricPicker(false)}>
                <View style={[styles.rpSheet, { backgroundColor: T.card }]}>
                  <Text style={[styles.rpTitle, { color: T.muted }]}>Select Rubric</Text>

                  <Text style={[styles.rpSection, { color: T.muted }]}>BUILT-IN RUBRICS</Text>
                  {BUILT_IN_RUBRICS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.rpItem, rubricId === r.id && { backgroundColor: `${T.primary}12` }]}
                      onPress={() => { setRubricId(r.id); setScores({}); setShowRubricPicker(false); }}
                    >
                      <View>
                        <Text style={[styles.rpItemName, { color: T.primary, fontWeight: rubricId === r.id ? '800' : '600' }]}>{r.name}</Text>
                        <Text style={[styles.rpItemSub, { color: T.muted }]}>{r.organization} · {r.totalPoints} pts</Text>
                      </View>
                      {rubricId === r.id && <Text style={{ color: '#4CAF7D', fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  ))}

                  {customRubrics.length > 0 && (
                    <>
                      <Text style={[styles.rpSection, { color: T.muted }]}>CUSTOM RUBRICS</Text>
                      {customRubrics.map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          style={[styles.rpItem, rubricId === r.id && { backgroundColor: `${T.primary}12` }]}
                          onPress={() => { setRubricId(r.id); setScores({}); setShowRubricPicker(false); }}
                        >
                          <View>
                            <Text style={[styles.rpItemName, { color: T.accent, fontWeight: rubricId === r.id ? '800' : '600' }]}>{r.name}</Text>
                            <Text style={[styles.rpItemSub, { color: T.muted }]}>Custom · {r.totalPoints} pts</Text>
                          </View>
                          <View style={styles.rpItemActions}>
                            {rubricId === r.id && <Text style={{ color: '#4CAF7D', fontSize: 16 }}>✓</Text>}
                            <TouchableOpacity
                              onPress={() => Alert.alert('Delete Rubric', `Delete "${r.name}"?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => { removeCustomRubric(r.id); if (rubricId === r.id) setRubricId(BUILT_IN_RUBRICS[0].id); } },
                              ])}
                            >
                              <Trash2 size={13} color="#D9667A" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  {!isPro && (
                    <View style={[styles.proBanner, { backgroundColor: `${T.accent}15`, borderColor: `${T.accent}40` }]}>
                      <Text style={[styles.proBannerText, { color: T.accent }]}>🔒 Pro: Create custom scoring rubrics</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* Score form */}
          {categories.length > 0 && (
            <ScoreForm categories={categories} scores={scores} onChange={handleScoreChange} T={T} />
          )}

          {/* Notes */}
          <View style={[styles.notesCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.fieldLabel, { color: T.muted }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.textArea, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Deductions, judge feedback, observations..."
              placeholderTextColor={T.muted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Total + Save */}
          <View style={[styles.totalBar, { backgroundColor: T.primary }]}>
            <View>
              <Text style={styles.totalLabel}>TOTAL SCORE</Text>
              <Text style={styles.totalValue}>
                {grandTotal.toFixed(1)}
                <Text style={styles.totalMax}> / {maxTotal}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: T.accent }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveBtnText, { color: T.primary }]}>Save Score</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === 'history' && (
        <>
          {teamSeasonScores.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Trophy size={28} color={T.border} />
              <Text style={[styles.emptyTitle, { color: T.primary }]}>No scores yet</Text>
              <Text style={[styles.emptySub, { color: T.muted }]}>
                Enter your first competition score using the "Enter Score" tab.
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: T.primary }]} onPress={() => setTab('entry')}>
                <Text style={styles.emptyBtnText}>Enter Score</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Season summary */}
              <View style={[styles.summaryCard, { backgroundColor: T.card, borderColor: T.border }]}>
                <Text style={[styles.summaryTitle, { color: T.primary }]}>Season Summary</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryVal, { color: T.primary }]}>{teamSeasonScores.length}</Text>
                    <Text style={[styles.summaryLabel, { color: T.muted }]}>competitions</Text>
                  </View>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryVal, { color: T.primary }]}>
                      {avgScores(teamSeasonScores)?.toFixed(1) ?? '—'}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: T.muted }]}>season avg</Text>
                  </View>
                  <View style={styles.summaryStat}>
                    {(() => {
                      const cur = avgScores(teamSeasonScores);
                      const change = cur !== null && prevSeasonAvg !== null ? cur - prevSeasonAvg : null;
                      if (change === null) return (
                        <>
                          <Text style={[styles.summaryVal, { color: T.muted }]}>—</Text>
                          <Text style={[styles.summaryLabel, { color: T.muted }]}>vs last season</Text>
                        </>
                      );
                      const { text, color } = formatChange(change);
                      return (
                        <>
                          <Text style={[styles.summaryVal, { color }]}>{text}</Text>
                          <Text style={[styles.summaryLabel, { color: T.muted }]}>vs last season</Text>
                        </>
                      );
                    })()}
                  </View>
                </View>
              </View>

              {[...teamSeasonScores].reverse().map((score) => (
                <ScoreCard
                  key={score.id}
                  score={score}
                  allSeasonScores={teamSeasonScores}
                  prevSeasonAvg={prevSeasonAvg}
                  onDelete={() => Alert.alert(
                    'Delete Score',
                    `Remove score for "${score.competitionName}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeCompetitionScore(score.id) },
                    ],
                  )}
                  T={T}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* Custom rubric builder (Pro) */}
      <CustomRubricBuilder
        visible={showCustomBuilder}
        onSave={(r) => { addCustomRubric(r); }}
        onClose={() => setShowCustomBuilder(false)}
        T={T}
      />
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 17, fontWeight: '800' },
  pageSub: { fontSize: 11, marginTop: 1 },

  tabBar: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: '700' },

  infoCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 10 },
  fieldLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 2 },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 70, textAlignVertical: 'top' },

  rubricCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 10 },
  rubricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rubricLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  customRubricBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customRubricText: { fontSize: 11, fontWeight: '700' },
  rubricPicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
  rubricPickerText: { flex: 1, fontSize: 14, fontWeight: '700' },
  rpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  rpSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  rpTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 },
  rpSection: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  rpItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 6 },
  rpItemName: { fontSize: 14 },
  rpItemSub: { fontSize: 11, marginTop: 1 },
  rpItemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  notesCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 10 },

  totalBar: { borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  totalValue: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  totalMax: { fontSize: 14, fontWeight: '600' },
  saveBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  saveBtnText: { fontWeight: '800', fontSize: 14 },

  summaryCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 12 },
  summaryTitle: { fontWeight: '700', fontSize: 13, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontWeight: '800', fontSize: 15 },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  proBanner: { borderWidth: 1, borderRadius: 10, padding: 11, marginTop: 10 },
  proBannerText: { fontSize: 13, fontWeight: '700' },
});
