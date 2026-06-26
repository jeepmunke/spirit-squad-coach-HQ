import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Plus, X, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { ratingColor, ratingInfo } from '@/constants/skills';
import { calcAthleteStats } from '@/lib/helpers';
import ScreenShell from '@/components/ScreenShell';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  jumps: 'Jumps',
  tumbling: 'Tumbling',
  stunting: 'Stunting',
  dance: 'Dance',
  motions: 'Motions',
};

const MAX_COMPARE = 3;

// ─── Category dot ─────────────────────────────────────────────────────────────

function CatDot({ label, avg, T }: { label: string; avg: string | null; T: ThemeColors }) {
  const num = avg !== null ? parseFloat(avg) : null;
  const color = num !== null ? ratingColor(num) : T.muted;
  return (
    <View style={styles.catDotWrap}>
      <View style={[styles.catDot, { backgroundColor: color }]} />
      <Text style={[styles.catDotLabel, { color: T.muted }]}>{label}</Text>
      <Text style={[styles.catDotAvg, { color }]}>{avg ?? '—'}</Text>
    </View>
  );
}

// ─── Skill chip ───────────────────────────────────────────────────────────────

function SkillChip({ skill, ratingKey, T }: { skill: string; ratingKey: string; T: ThemeColors }) {
  const info = ratingInfo(ratingKey);
  const color = ratingColor(info.numeric);
  return (
    <View style={[styles.skillChip, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color: T.primary }]}>{skill}</Text>
    </View>
  );
}

// ─── Athlete card ─────────────────────────────────────────────────────────────

function AthleteCard({
  athleteId, isCompare, T, evalLog, naSkills, seasons, seasonIdx, onExpand, expanded,
}: {
  athleteId: number;
  isCompare: boolean;
  T: ThemeColors;
  evalLog: any[];
  naSkills: Record<number, Record<string, boolean>>;
  seasons: string[];
  seasonIdx: number;
  onExpand?: () => void;
  expanded?: boolean;
}) {
  const athletes = useAppStore((s) => s.athletes);
  const athlete = athletes.find((a) => a.id === athleteId);
  const stats = useMemo(
    () => calcAthleteStats(athleteId, evalLog, naSkills, seasonIdx, seasons),
    [athleteId, evalLog, naSkills, seasonIdx, seasons],
  );

  if (!athlete) return null;

  let totalSum = 0, totalCount = 0;
  Object.values(stats).forEach(({ skills }) =>
    skills.forEach(({ numeric, isNA }) => {
      if (!isNA && numeric !== null) { totalSum += numeric; totalCount++; }
    }),
  );
  const overallAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : null;
  const overallColor = overallAvg !== null ? ratingColor(parseFloat(overallAvg)) : T.muted;

  return (
    <View style={[styles.athleteCard, { backgroundColor: T.card, borderColor: T.border }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={onExpand} disabled={!onExpand}>
        <View>
          <Text style={[styles.athleteName, { color: T.primary }]}>{athlete.name}</Text>
          <Text style={[styles.athleteMeta, { color: T.muted }]}>{athlete.grade} · {athlete.position}</Text>
        </View>
        <View style={styles.overallWrap}>
          {overallAvg !== null && (
            <>
              <Text style={[styles.overallLabel, { color: T.muted }]}>Overall</Text>
              <Text style={[styles.overallNum, { color: overallColor }]}>{overallAvg}</Text>
            </>
          )}
          {onExpand && (
            <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
              <ChevronRight size={14} color={T.muted} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.catDots}>
        {Object.entries(CAT_LABELS).map(([cat, label]) => (
          <CatDot key={cat} label={label} avg={stats[cat]?.avg ?? null} T={T} />
        ))}
      </View>

      {(expanded || isCompare) && (
        <View style={[styles.skillChips, { borderTopColor: T.border }]}>
          {Object.entries(stats).map(([cat, catStats]) => (
            <View key={cat} style={{ marginBottom: 9 }}>
              <Text style={[styles.catChipLabel, { color: T.muted }]}>{CAT_LABELS[cat] ?? cat}</Text>
              <View style={styles.chipRow}>
                {catStats.skills
                  .filter(({ isNA }) => !isNA)
                  .map(({ skill, rating }) => (
                    <SkillChip key={skill} skill={skill} ratingKey={rating} T={T} />
                  ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SnapshotScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const athletes = useAppStore((s) => s.athletes);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const evalLog = useAppStore((s) => s.evalLog);
  const naSkills = useAppStore((s) => s.naSkills);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);
  const isPro = useAppStore((s) => s.isPro);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));
  const seasonIdx = seasons.indexOf(season);

  const [mode, setMode] = useState<'all' | 'compare'>('all');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [addPickerId, setAddPickerId] = useState<number>(teamAthletes[0]?.id ?? -1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const addCompare = () => {
    if (compareIds.length >= MAX_COMPARE || compareIds.includes(addPickerId)) return;
    setCompareIds((prev) => [...prev, addPickerId]);
  };

  return (
    <ScreenShell>
      <View style={styles.modeToggle}>
        {(['all', 'compare'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, { borderColor: T.border, backgroundColor: mode === m ? T.primary : T.card }]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : T.primary }]}>
              {m === 'all' ? 'All Athletes' : 'Compare Athletes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'all' && (
        <View style={{ gap: 11 }}>
          {teamAthletes.length === 0 && (
            <Text style={[styles.emptyText, { color: T.muted }]}>No athletes — add them in the Roster tab.</Text>
          )}
          {teamAthletes.map((a) => (
            <AthleteCard
              key={a.id}
              athleteId={a.id}
              isCompare={false}
              T={T}
              evalLog={evalLog}
              naSkills={naSkills}
              seasons={seasons}
              seasonIdx={seasonIdx}
              expanded={expandedId === a.id}
              onExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
            />
          ))}
        </View>
      )}

      {mode === 'compare' && (
        <>
          {!isPro && compareIds.length === 0 && (
            <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44` }]}>
              <Text style={[styles.proBannerText, { color: T.accent }]}>
                🔒 Pro: Compare up to 3 athletes side by side
              </Text>
            </View>
          )}

          {(isPro || compareIds.length < 2) && (
            <View style={[styles.addCompareRow, { backgroundColor: T.card, borderColor: T.border }]}>
              <View style={[styles.pickerWrap, { borderColor: T.border, backgroundColor: T.bg, flex: 1 }]}>
                <Picker
                  selectedValue={addPickerId}
                  onValueChange={(v) => setAddPickerId(Number(v))}
                  style={{ color: T.primary }}
                  dropdownIconColor={T.muted}
                >
                  {teamAthletes.map((a) => <Picker.Item key={a.id} label={a.name} value={a.id} />)}
                </Picker>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: T.accent, opacity: compareIds.length >= MAX_COMPARE ? 0.4 : 1 }]}
                onPress={addCompare}
                disabled={compareIds.length >= MAX_COMPARE}
              >
                <Plus size={14} color={T.primary} />
                <Text style={[styles.addBtnText, { color: T.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {compareIds.length === 0 && (
            <Text style={[styles.emptyText, { color: T.muted }]}>Add athletes above to compare.</Text>
          )}

          <View style={{ gap: 11, marginTop: 10 }}>
            {compareIds.map((id) => (
              <View key={id} style={{ position: 'relative' }}>
                <AthleteCard
                  athleteId={id}
                  isCompare
                  T={T}
                  evalLog={evalLog}
                  naSkills={naSkills}
                  seasons={seasons}
                  seasonIdx={seasonIdx}
                />
                <TouchableOpacity
                  style={styles.removeCompare}
                  onPress={() => setCompareIds((prev) => prev.filter((x) => x !== id))}
                >
                  <X size={13} color="#C4A2AE" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {compareIds.length >= 2 && (
            <View style={[styles.legendCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[styles.legendTitle, { color: T.primary }]}>Rating Scale</Text>
              <View style={styles.legendRow}>
                {[
                  { num: 3, key: 'mastered' },
                  { num: 2, key: 'developing' },
                  { num: 1, key: 'learning' },
                  { num: 0, key: 'none' },
                ].map(({ num, key }) => {
                  const color = ratingColor(num);
                  const info = ratingInfo(key);
                  return (
                    <View key={num} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: color }]} />
                      <Text style={[styles.legendLabel, { color: T.muted }]}>{info.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modeToggle: { flexDirection: 'row', gap: 6, marginBottom: 13 },
  modeBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  modeBtnText: { fontWeight: '700', fontSize: 12 },

  athleteCard: { borderWidth: 1, borderRadius: 12, padding: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 },
  athleteName: { fontWeight: '800', fontSize: 15 },
  athleteMeta: { fontSize: 11, marginTop: 1 },
  overallWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  overallLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  overallNum: { fontSize: 17, fontWeight: '800' },

  catDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catDotWrap: { alignItems: 'center', gap: 3, minWidth: 50 },
  catDot: { width: 14, height: 14, borderRadius: 7 },
  catDotLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  catDotAvg: { fontSize: 12, fontWeight: '800' },

  skillChips: { marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  catChipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },

  pickerWrap: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  addCompareRow: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, padding: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontWeight: '700', fontSize: 12 },

  removeCompare: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#C4A2AE22', borderRadius: 10, padding: 4,
  },

  proBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  legendCard: { marginTop: 14, borderWidth: 1, borderRadius: 10, padding: 12 },
  legendTitle: { fontWeight: '700', fontSize: 12, marginBottom: 7 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11 },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
