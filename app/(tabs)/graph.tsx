import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { useAppStore, numericRating } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { SKILL_LIBRARY, ratingColor } from '@/constants/skills';
import ScreenShell from '@/components/ScreenShell';

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_H = 200;
const CHART_PAD_L = 36;
const CHART_PAD_R = 14;
const CHART_PAD_T = 12;
const CHART_PAD_B = 28;
const Y_LABELS = [3, 2, 1, 0];

const LINE_COLORS = [
  '#5B9BD5', '#E8A33D', '#4CAF7D', '#C26B7A', '#9B7FD4', '#4ABFC4',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abbreviateSeason(s: string): string {
  const ABBREV: Record<string, string> = {
    spring: 'Spr', fall: 'Fall', summer: 'Sum', winter: 'Win',
  };
  const lower = s.toLowerCase();
  for (const [name, abbrev] of Object.entries(ABBREV)) {
    if (lower.includes(name)) {
      const yr = s.match(/\d{4}/)?.[0];
      return yr ? `${abbrev} '${yr.slice(2)}` : abbrev;
    }
  }
  // Fallback: first 7 chars
  return s.slice(0, 7);
}

function seasonAvgForAthlete(
  athleteId: number,
  evalLog: any[],
  naSkills: Record<number, Record<string, boolean>>,
  seasonName: string,
  allSeasons: string[],
): number | null {
  const seasonIdx = allSeasons.indexOf(seasonName);
  let sum = 0, count = 0;
  Object.entries(SKILL_LIBRARY).forEach(([cat, skills]) => {
    (skills as readonly string[]).forEach((skill) => {
      const naKey = `${cat}|${skill}`;
      if (naSkills[athleteId]?.[naKey]) return;
      const entries = evalLog
        .filter((e) =>
          e.athleteId === athleteId &&
          e.category === cat &&
          e.skill === skill &&
          allSeasons.indexOf(e.season) <= seasonIdx,
        )
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      if (entries.length) {
        const num = numericRating(entries[0].rating);
        if (num !== null) { sum += num; count++; }
      }
    });
  });
  return count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
}

// ─── SVG line chart ───────────────────────────────────────────────────────────

interface Series {
  label: string;
  color: string;
  points: Array<{ x: number; y: number; season: string; avg: number | null }>;
  dashed?: boolean;
}

function LineChart({ series, seasons, T, width }: { series: Series[]; seasons: string[]; T: ThemeColors; width: number }) {
  const chartW = width - CHART_PAD_L - CHART_PAD_R;
  const chartH = CHART_H - CHART_PAD_T - CHART_PAD_B;
  const n = seasons.length;

  const xPos = (i: number) => CHART_PAD_L + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v: number) => CHART_PAD_T + chartH - (v / 3) * chartH;

  return (
    <Svg width={width} height={CHART_H}>
      {/* Grid lines */}
      {Y_LABELS.map((y) => (
        <React.Fragment key={y}>
          <Line
            x1={CHART_PAD_L}
            y1={yPos(y)}
            x2={width - CHART_PAD_R}
            y2={yPos(y)}
            stroke={T.border}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <SvgText x={CHART_PAD_L - 4} y={yPos(y) + 4} textAnchor="end" fontSize={9} fill={T.muted}>
            {y}
          </SvgText>
        </React.Fragment>
      ))}

      {/* X axis season labels */}
      {seasons.map((s, i) => (
        <SvgText key={s} x={xPos(i)} y={CHART_H - 6} textAnchor="middle" fontSize={9} fill={T.muted}>
          {abbreviateSeason(s)}
        </SvgText>
      ))}

      {/* Axes */}
      <Line x1={CHART_PAD_L} y1={CHART_PAD_T} x2={CHART_PAD_L} y2={CHART_H - CHART_PAD_B} stroke={T.border} strokeWidth={1} />
      <Line x1={CHART_PAD_L} y1={CHART_H - CHART_PAD_B} x2={width - CHART_PAD_R} y2={CHART_H - CHART_PAD_B} stroke={T.border} strokeWidth={1} />

      {/* Data series */}
      {series.map((s) => {
        const validPoints = s.points.filter((p) => p.avg !== null);
        if (validPoints.length === 0) return null;
        const polyPoints = validPoints.map((p) => `${xPos(seasons.indexOf(p.season))},${yPos(p.avg!)}`).join(' ');
        return (
          <React.Fragment key={s.label}>
            <Polyline
              points={polyPoints}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? '5 3' : undefined}
              strokeOpacity={s.dashed ? 0.6 : 1}
            />
            {validPoints.map((p) => (
              <Circle
                key={p.season}
                cx={xPos(seasons.indexOf(p.season))}
                cy={yPos(p.avg!)}
                r={s.dashed ? 2 : 3.5}
                fill={s.color}
                stroke={T.card}
                strokeWidth={s.dashed ? 0 : 1.5}
              />
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GraphScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const athletes = useAppStore((s) => s.athletes);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const evalLog = useAppStore((s) => s.evalLog);
  const naSkills = useAppStore((s) => s.naSkills);
  const seasons = useAppStore((s) => s.seasons);
  const isPro = useAppStore((s) => s.isPro);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));

  // Season limit: free = last 2, pro = last 4
  const visibleSeasons = useMemo(
    () => (isPro ? seasons.slice(-4) : seasons.slice(-2)),
    [isPro, seasons],
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(teamAthletes.slice(0, 3).map((a) => a.id)),
  );
  const [showTeamAvg, setShowTeamAvg] = useState(true);

  const screenWidth = Dimensions.get('window').width - 28;

  // ── Build series ────────────────────────────────────────────────────────────

  const athleteSeries: Series[] = useMemo(() =>
    teamAthletes
      .filter((a) => selectedIds.has(a.id))
      .map((a, i) => ({
        label: a.name,
        color: LINE_COLORS[i % LINE_COLORS.length],
        points: visibleSeasons.map((s) => ({
          x: visibleSeasons.indexOf(s),
          y: 0,
          season: s,
          avg: seasonAvgForAthlete(a.id, evalLog, naSkills, s, seasons),
        })),
      })),
    [teamAthletes, selectedIds, visibleSeasons, seasons, evalLog, naSkills],
  );

  const teamAvgSeries: Series | null = useMemo(() => {
    if (!showTeamAvg || teamAthletes.length === 0) return null;
    return {
      label: 'Team Avg',
      color: T.muted,
      dashed: true,
      points: visibleSeasons.map((s) => {
        const avgs = teamAthletes
          .map((a) => seasonAvgForAthlete(a.id, evalLog, naSkills, s, seasons))
          .filter((v): v is number => v !== null);
        const avg = avgs.length ? parseFloat((avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2)) : null;
        return { x: visibleSeasons.indexOf(s), y: 0, season: s, avg };
      }),
    };
  }, [teamAthletes, showTeamAvg, visibleSeasons, seasons, evalLog, naSkills, T.muted]);

  const allSeries = [...athleteSeries, ...(teamAvgSeries ? [teamAvgSeries] : [])];

  const toggleAthlete = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  if (visibleSeasons.length < 2) {
    return (
      <ScreenShell>
        <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.emptyTitle, { color: T.primary }]}>Not enough seasons</Text>
          <Text style={[styles.emptyBody, { color: T.muted }]}>
            Add at least 2 seasons in Settings and log evaluations to see progress over time.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      {/* Chart */}
      <View style={[styles.chartCard, { backgroundColor: T.card, borderColor: T.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
          <Text style={[styles.chartTitle, { color: T.primary }]}>Skill Rating Progress</Text>
          {!isPro && seasons.length > 2 && (
            <Text style={[styles.chartSub, { color: T.accent }]}>Last 2 seasons · Pro unlocks 4</Text>
          )}
        </View>
        <Text style={[styles.chartSub, { color: T.muted }]}>Average across all skills · 0–3 scale</Text>
        <LineChart series={allSeries} seasons={visibleSeasons} T={T} width={screenWidth - 26} />
      </View>

      {/* Legend + toggles */}
      <View style={[styles.legendCard, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[styles.legendTitle, { color: T.primary }]}>Athletes</Text>
        <View style={styles.legendItems}>
          {teamAthletes.map((a, i) => {
            const color = LINE_COLORS[i % LINE_COLORS.length];
            const isSelected = selectedIds.has(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.legendItem,
                  { borderColor: isSelected ? color : T.border, backgroundColor: isSelected ? `${color}18` : T.bg },
                ]}
                onPress={() => toggleAthlete(a.id)}
              >
                <View style={[styles.legendDot, { backgroundColor: isSelected ? color : T.border }]} />
                <Text style={[styles.legendLabel, { color: isSelected ? color : T.muted }]}>{a.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.legendItem,
            {
              marginTop: 8,
              borderColor: showTeamAvg ? T.muted : T.border,
              backgroundColor: showTeamAvg ? `${T.muted}18` : T.bg,
            },
          ]}
          onPress={() => setShowTeamAvg((v) => !v)}
        >
          <View style={[styles.legendDotDashed, { borderColor: showTeamAvg ? T.muted : T.border }]} />
          <Text style={[styles.legendLabel, { color: showTeamAvg ? T.muted : T.border }]}>Team Average (dashed)</Text>
        </TouchableOpacity>
      </View>

      {/* Per-athlete season table (Pro) */}
      {isPro ? (
        <View style={[styles.tableCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.tableTitle, { color: T.primary }]}>Season Averages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Header row */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableHeaderCell, styles.nameCell, { color: T.muted }]}>Athlete</Text>
                {visibleSeasons.map((s) => (
                  <Text key={s} style={[styles.tableHeaderCell, { color: T.muted }]}>
                    {abbreviateSeason(s)}
                  </Text>
                ))}
              </View>
              {/* Data rows */}
              {teamAthletes.map((a, i) => (
                <View key={a.id} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: T.bg }]}>
                  <Text style={[styles.tableCell, styles.nameCell, { color: T.primary }]}>{a.name}</Text>
                  {visibleSeasons.map((s) => {
                    const avg = seasonAvgForAthlete(a.id, evalLog, naSkills, s, seasons);
                    const color = avg !== null ? ratingColor(avg) : T.muted;
                    return (
                      <Text key={s} style={[styles.tableCell, { color }]}>
                        {avg ?? '—'}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44` }]}>
          <Text style={[styles.proBannerText, { color: T.accent }]}>
            🔒 Pro: Up to 4 seasons of history · season averages table · filter by category
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 11 },
  chartTitle: { fontWeight: '800', fontSize: 14, marginBottom: 1 },
  chartSub: { fontSize: 10, marginBottom: 10 },

  legendCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 11 },
  legendTitle: { fontWeight: '700', fontSize: 13, marginBottom: 8 },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotDashed: { width: 10, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  legendLabel: { fontSize: 11, fontWeight: '700' },

  tableCard: { borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 11 },
  tableTitle: { fontWeight: '700', fontSize: 13, marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6 },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, width: 60, textAlign: 'center' },
  tableCell: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'center' },
  nameCell: { width: 110, textAlign: 'left' },

  proBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { fontWeight: '800', fontSize: 15 },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
