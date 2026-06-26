import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { ChevronLeft, History, Plus, ChevronRight, ChevronDown } from 'lucide-react-native';
import { useAppStore, currentRating } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { SKILL_LIBRARY, COMBO_SKILLS, BASE_POSITIONS, RATING_LEVELS, ratingColor, ratingInfo } from '@/constants/skills';
import ScreenShell from '@/components/ScreenShell';
import type { EvalLogEntry } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryTarget {
  label: string;
  entries: EvalLogEntry[];
}

// ─── Rating badge ─────────────────────────────────────────────────────────────

function EvalBadge({
  ratingKey, onPress, onHistory, T,
}: {
  ratingKey: string;
  onPress: () => void;
  onHistory: () => void;
  T: ThemeColors;
}) {
  const info = ratingInfo(ratingKey);
  const color = ratingColor(info.numeric);

  return (
    <View style={styles.badgeRow}>
      <TouchableOpacity onPress={onHistory} style={styles.historyBtn}>
        <History size={13} color={T.muted} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}
      >
        <View style={[styles.dot10, { backgroundColor: color }]} />
        <Text style={[styles.badgeLabel, { color }]}>{info.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Rating legend ─────────────────────────────────────────────────────────────

function RatingLegend({ T }: { T: ThemeColors }) {
  return (
    <View style={[styles.legendCard, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[styles.legendTitle, { color: T.muted }]}>Rating Scale</Text>
      <View style={styles.legendRow}>
        {RATING_LEVELS.map((r) => {
          const color = r.numeric !== null ? ratingColor(r.numeric) : '#C4C4C4';
          return (
            <View key={r.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendLabel, { color: T.muted }]}>{r.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── History view ─────────────────────────────────────────────────────────────

function HistoryView({ target, onBack, T, isPro }: { target: HistoryTarget; onBack: () => void; T: ThemeColors; isPro: boolean }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <ChevronLeft size={16} color={T.muted} />
        <Text style={[styles.backBtnText, { color: T.muted }]}>Back</Text>
      </TouchableOpacity>
      <Text style={[styles.historyTitle, { color: T.primary }]}>{target.label}</Text>
      <Text style={[styles.historySub, { color: T.muted }]}>
        {isPro ? 'Last 4 seasons' : 'Last 2 seasons (Pro unlocks 4)'}
      </Text>

      {target.entries.length === 0 ? (
        <Text style={[styles.emptyText, { color: T.muted }]}>No ratings logged yet.</Text>
      ) : (
        <View style={[styles.historyCard, { backgroundColor: T.card, borderColor: T.border }]}>
          {target.entries.map((e, i) => {
            const info = ratingInfo(e.rating);
            const color = ratingColor(info.numeric);
            const isLast = i === target.entries.length - 1;
            return (
              <View
                key={e.id}
                style={[
                  styles.historyEntry,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: T.bg, paddingBottom: 12, marginBottom: 12 },
                ]}
              >
                <View style={[styles.dot9, { backgroundColor: color, marginTop: 4 }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.historyEntryTop}>
                    <Text style={[styles.historyRating, { color }]}>{info.label}</Text>
                    <Text style={[styles.historySeason, { color: T.muted }]}>{e.season}</Text>
                  </View>
                  <Text style={[styles.historyDate, { color: T.muted }]}>{e.date}</Text>
                </View>
                {isLast && <ChevronRight size={12} color="#4CAF7D" />}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EvaluationsScreen() {
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
  const ratingDisplayMode = useAppStore((s) => s.ratingDisplayMode);
  const comboNames = useAppStore((s) => s.comboNames);
  const customSkills = useAppStore((s) => s.customSkills);
  const logRating = useAppStore((s) => s.logRating);
  const setNaSkill = useAppStore((s) => s.setNaSkill);
  const addCustomSkill = useAppStore((s) => s.addCustomSkill);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));
  const seasonIdx = seasons.indexOf(season);

  // Season limit: free = last 2, pro = last 4
  const visibleSeasons = isPro ? seasons.slice(-4) : seasons.slice(-2);

  const [selectedAthleteId, setSelectedAthleteId] = useState<number>(teamAthletes[0]?.id ?? -1);
  const [evalCategory, setEvalCategory] = useState<keyof typeof SKILL_LIBRARY>('jumps');
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [athletePickerOpen, setAthletePickerOpen] = useState(false);

  // ── Rating helpers ─────────────────────────────────────────────────────────

  const getDisplay = (athleteId: number, category: string, skill: string, position?: string) => {
    const naKey = category === 'stunting' ? `${category}|${skill}|${position}` : `${category}|${skill}`;
    if (naSkills[athleteId]?.[naKey]) return 'na';
    return currentRating(evalLog, { athleteId, category, skill, position, upToSeasonIdx: seasonIdx }, seasons);
  };

  const cycleRating = (athleteId: number, category: string, skill: string, position?: string) => {
    const naKey = category === 'stunting' ? `${category}|${skill}|${position}` : `${category}|${skill}`;
    const isNA = !!(naSkills[athleteId]?.[naKey]);
    const curRating = isNA ? 'na' : currentRating(evalLog, { athleteId, category, skill, position, upToSeasonIdx: seasonIdx }, seasons);
    const idx = RATING_LEVELS.findIndex((r) => r.key === curRating);
    const next = RATING_LEVELS[(idx + 1) % RATING_LEVELS.length];
    if (next.key === 'na') {
      setNaSkill(athleteId, naKey, true);
    } else {
      if (isNA) setNaSkill(athleteId, naKey, false);
      logRating({ athleteId, category, skill, position, rating: next.key });
    }
  };

  const getHistoryEntries = (athleteId: number, category: string, skill: string, position?: string) =>
    evalLog
      .filter((e) =>
        e.athleteId === athleteId &&
        e.category === category &&
        e.skill === skill &&
        (category !== 'stunting' || e.position === position) &&
        visibleSeasons.includes(e.season),
      )
      .sort((a, b) => a.date.localeCompare(b.date));

  const getSkillLabel = (cat: string, skill: string) => comboNames[`${cat}|${skill}`] || skill;

  // ── Skill lists ────────────────────────────────────────────────────────────

  const skillsForCat = (cat: keyof typeof SKILL_LIBRARY) => [
    ...SKILL_LIBRARY[cat],
    ...(cat !== 'stunting' ? (customSkills[cat] ?? []) : []),
  ].sort((a, b) => a.localeCompare(b));

  const selectedAthlete = teamAthletes.find((a) => a.id === selectedAthleteId);

  // ── History view ───────────────────────────────────────────────────────────

  if (historyTarget) {
    return (
      <ScreenShell scrollable={false}>
        <HistoryView target={historyTarget} onBack={() => setHistoryTarget(null)} T={T} isPro={isPro} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      {/* Rating legend — always visible */}
      <RatingLegend T={T} />

      {/* Athlete selector */}
      {teamAthletes.length === 0 ? (
        <Text style={[styles.emptyText, { color: T.muted }]}>No athletes — add them in the Roster tab.</Text>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.athleteSelector, { borderColor: T.border, backgroundColor: T.card }]}
            onPress={() => setAthletePickerOpen(true)}
          >
            <Text style={[styles.athleteSelectorText, { color: T.primary }]} numberOfLines={1}>
              {teamAthletes.find((a) => a.id === selectedAthleteId)?.name ?? 'Select Athlete'}
            </Text>
            <ChevronDown size={14} color={T.muted} />
          </TouchableOpacity>
          <Modal visible={athletePickerOpen} transparent animationType="fade" onRequestClose={() => setAthletePickerOpen(false)}>
            <TouchableOpacity style={styles.pickerOverlay} onPress={() => setAthletePickerOpen(false)}>
              <View style={[styles.pickerSheet, { backgroundColor: T.card }]}>
                <Text style={[styles.pickerTitle, { color: T.muted }]}>SELECT ATHLETE</Text>
                {teamAthletes.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.pickerItem, a.id === selectedAthleteId && { backgroundColor: `${T.primary}10` }]}
                    onPress={() => { setSelectedAthleteId(a.id); setAthletePickerOpen(false); }}
                  >
                    <Text style={[styles.pickerItemText, { color: T.primary, fontWeight: a.id === selectedAthleteId ? '800' : '600' }]}>
                      {a.name}
                    </Text>
                    {a.id === selectedAthleteId && <Text style={{ color: '#4CAF7D', fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 11 }}>
            <View style={styles.catTabs}>
              {(Object.keys(SKILL_LIBRARY) as Array<keyof typeof SKILL_LIBRARY>).sort().map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catTab,
                    { borderColor: T.border, backgroundColor: evalCategory === cat ? T.primary : T.card },
                  ]}
                  onPress={() => setEvalCategory(cat)}
                >
                  <Text style={[styles.catTabText, { color: evalCategory === cat ? '#fff' : T.primary }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Skill list */}
          {selectedAthlete && (
            <View style={styles.skillList}>
              {evalCategory !== 'stunting' && skillsForCat(evalCategory).map((skill) => {
                const rKey = getDisplay(selectedAthlete.id, evalCategory, skill);
                const isCombo = (COMBO_SKILLS[evalCategory] ?? []).includes(skill) || (customSkills[evalCategory] ?? []).includes(skill);
                return (
                  <View key={skill} style={[styles.skillCard, { backgroundColor: T.card, borderColor: T.border }]}>
                    <Text style={[styles.skillName, { color: T.primary }]}>
                      {isCombo && isPro ? getSkillLabel(evalCategory, skill) || skill : getSkillLabel(evalCategory, skill)}
                    </Text>
                    <EvalBadge
                      ratingKey={rKey}
                      T={T}
                      onPress={() => cycleRating(selectedAthlete.id, evalCategory, skill)}
                      onHistory={() => setHistoryTarget({
                        label: `${selectedAthlete.name} · ${getSkillLabel(evalCategory, skill)}`,
                        entries: getHistoryEntries(selectedAthlete.id, evalCategory, skill),
                      })}
                    />
                  </View>
                );
              })}

              {/* Pro: add custom combos/runs (only for jumps/tumbling) */}
              {(evalCategory === 'jumps' || evalCategory === 'tumbling') && (
                isPro ? (
                  <TouchableOpacity
                    style={[styles.addComboBtn, { borderColor: T.accent }]}
                    onPress={() => addCustomSkill(evalCategory)}
                  >
                    <Plus size={13} color={T.accent} />
                    <Text style={[styles.addComboText, { color: T.accent }]}>
                      Add {evalCategory === 'jumps' ? 'Jump Combo' : 'Tumble Run'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44` }]}>
                    <Text style={[styles.proBannerText, { color: T.accent }]}>
                      🔒 Pro: Unlimited {evalCategory === 'jumps' ? 'jump combos' : 'tumble runs'} · rename combos
                    </Text>
                  </View>
                )
              )}

              {/* Stunting: per-skill, per-position */}
              {evalCategory === 'stunting' && SKILL_LIBRARY.stunting.map((skill) => (
                <View key={skill} style={[styles.stuntCard, { backgroundColor: T.card, borderColor: T.border }]}>
                  <Text style={[styles.stuntSkillName, { color: T.primary }]}>{skill}</Text>
                  {BASE_POSITIONS.map((pos) => {
                    const rKey = getDisplay(selectedAthlete.id, 'stunting', skill, pos);
                    return (
                      <View key={pos} style={styles.stuntRow}>
                        <Text style={[styles.stuntPos, { color: T.muted }]}>{pos}</Text>
                        <EvalBadge
                          ratingKey={rKey}
                          T={T}
                          onPress={() => cycleRating(selectedAthlete.id, 'stunting', skill, pos)}
                          onHistory={() => setHistoryTarget({
                            label: `${selectedAthlete.name} · ${skill} (${pos})`,
                            entries: getHistoryEntries(selectedAthlete.id, 'stunting', skill, pos),
                          })}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}

              <Text style={[styles.tip, { color: T.muted }]}>
                Tap rating to cycle · Tap{' '}
                <History size={11} color={T.muted} />{' '}
                to view history · N/A excludes from scoring
              </Text>
            </View>
          )}
        </>
      )}
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  athleteSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 11, gap: 6 },
  athleteSelectorText: { flex: 1, fontSize: 15, fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  pickerTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', borderRadius: 6, paddingHorizontal: 4 },
  pickerItemText: { fontSize: 16 },

  catTabs: { flexDirection: 'row', gap: 5, marginBottom: 11 },
  catTab: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  catTabText: { fontWeight: '700', fontSize: 12 },

  skillList: { gap: 8 },
  skillCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12 },
  skillName: { fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },

  stuntCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  stuntSkillName: { fontWeight: '700', fontSize: 14, marginBottom: 7 },
  stuntRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  stuntPos: { fontSize: 13, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  historyBtn: { padding: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeLabel: { fontSize: 12, fontWeight: '700' },
  dot10: { width: 10, height: 10, borderRadius: 5 },
  dot9: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },

  addComboBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 10 },
  addComboText: { fontWeight: '700', fontSize: 12 },
  proBanner: { borderWidth: 1, borderRadius: 10, padding: 11 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  legendCard: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 11 },
  legendTitle: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontWeight: '600' },

  tip: { fontSize: 11, textAlign: 'center', marginTop: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 28 },

  // History view
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backBtnText: { fontWeight: '700', fontSize: 13 },
  historyTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  historySub: { fontSize: 11, marginBottom: 11 },
  historyCard: { borderWidth: 1, borderRadius: 12, padding: 13 },
  historyEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  historyEntryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  historyRating: { fontWeight: '700', fontSize: 13 },
  historySeason: { fontSize: 11, fontWeight: '600' },
  historyDate: { fontSize: 11, marginTop: 1 },
});
