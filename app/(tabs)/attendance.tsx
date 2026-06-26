import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Check, X, Clock, Bell, Plus, Upload, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { ATTENDANCE_PRESETS, EVENT_TYPES, EVENT_TYPE_COLOR, EVENT_TYPE_ICON } from '@/constants/skills';
import { attendanceStats, getAttendanceAlert, alertColor } from '@/lib/helpers';
import ScreenShell from '@/components/ScreenShell';
import type { EventType } from '@/constants/skills';

// ─── Schedule CSV help modal ──────────────────────────────────────────────────

function ScheduleCsvHelpModal({ visible, onClose, T }: { visible: boolean; onClose: () => void; T: ThemeColors }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={help.overlay}>
        <View style={[help.card, { backgroundColor: T.card }]}>
          <View style={help.header}>
            <Text style={[help.title, { color: T.primary }]}>Schedule CSV Import Guide</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={T.muted} /></TouchableOpacity>
          </View>

          <Text style={[help.body, { color: T.muted }]}>
            <Text style={{ fontWeight: '700', color: T.primary }}>Event Name</Text> and{' '}
            <Text style={{ fontWeight: '700', color: T.primary }}>Date</Text> are required.
            All other columns are optional.
          </Text>

          <View style={[help.codeBlock, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Text style={[help.codeLabel, { color: T.accent }]}>Required columns:</Text>
            <Text style={[help.codeLine, { color: T.primary }]}>Event Name · Date (YYYY-MM-DD)</Text>
            <Text style={[help.codeLabel, { color: T.muted, marginTop: 8 }]}>Optional columns:</Text>
            <Text style={[help.codeLine, { color: T.muted }]}>Time · Type</Text>
          </View>

          <View style={[help.codeBlock, { backgroundColor: T.bg, borderColor: T.border, marginTop: 8 }]}>
            <Text style={[help.codeLabel, { color: T.accent }]}>Type values:</Text>
            {EVENT_TYPES.map((t) => (
              <Text key={t} style={[help.codeLine, { color: T.muted }]}>
                <Text style={{ color: EVENT_TYPE_COLOR[t], fontWeight: '700' }}>●</Text> {t}
              </Text>
            ))}
          </View>

          <View style={[help.codeBlock, { backgroundColor: T.bg, borderColor: T.border, marginTop: 8 }]}>
            <Text style={[help.codeLabel, { color: T.accent }]}>Example:</Text>
            <Text style={[help.codeLine, { color: T.muted }]}>Event Name,Date,Time,Type</Text>
            <Text style={[help.codeLine, { color: T.primary }]}>Morning Practice,2026-09-05,8:00 AM,Practice</Text>
            <Text style={[help.codeLine, { color: T.primary }]}>State Competition,2026-11-15,10:00 AM,Competition</Text>
          </View>

          <Text style={[help.tip, { color: T.muted }]}>
            💡 Build your schedule in Google Sheets or Excel and export as .csv
          </Text>

          <TouchableOpacity style={[help.closeBtn, { backgroundColor: T.primary }]} onPress={onClose}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const help = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 16, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  codeBlock: { borderWidth: 1, borderRadius: 8, padding: 10 },
  codeLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  codeLine: { fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
  tip: { fontSize: 12, marginTop: 10, marginBottom: 12 },
  closeBtn: { borderRadius: 8, padding: 11, alignItems: 'center' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

interface MarkedDate {
  type: EventType;
  name: string;
}

function MonthCalendar({
  selectedDate,
  onSelect,
  markedDates,
  isPro,
  T,
}: {
  selectedDate: string;
  onSelect: (d: string) => void;
  markedDates: Record<string, MarkedDate[]>;
  isPro: boolean;
  T: ThemeColors;
}) {
  const today = todayStr();
  const [vy, setVy] = useState(() => parseInt(selectedDate.slice(0, 4), 10));
  const [vm, setVm] = useState(() => parseInt(selectedDate.slice(5, 7), 10) - 1);

  const firstDow = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();

  const prevMonth = () => {
    if (vm === 0) { setVy((y) => y - 1); setVm(11); }
    else setVm((m) => m - 1);
  };
  const nextMonth = () => {
    if (vm === 11) { setVy((y) => y + 1); setVm(0); }
    else setVm((m) => m + 1);
  };
  const goToday = () => {
    const d = new Date();
    setVy(d.getFullYear());
    setVm(d.getMonth());
    onSelect(today);
  };

  // Build 6-row grid
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getTopDotColor = (events: MarkedDate[]) => {
    if (!events.length) return null;
    if (!isPro) return '#4CAF7D';
    const comp = events.find((e) => e.type === 'Competition');
    if (comp) return EVENT_TYPE_COLOR['Competition'];
    const cw = events.find((e) => e.type === 'Competition Week');
    if (cw) return EVENT_TYPE_COLOR['Competition Week'];
    const custom = events.find((e) => e.type === 'Custom');
    if (custom) return EVENT_TYPE_COLOR['Custom'];
    return EVENT_TYPE_COLOR['Practice'];
  };

  return (
    <View>
      {/* Month nav */}
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <ChevronLeft size={18} color={T.primary} />
        </TouchableOpacity>
        <Text style={[cal.monthLabel, { color: T.primary }]}>{MONTH_NAMES[vm]} {vy}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <ChevronRight size={18} color={T.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday} style={[cal.todayBtn, { borderColor: T.border }]}>
          <Text style={[cal.todayBtnText, { color: T.muted }]}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.dowRow}>
        {DOW.map((d) => (
          <Text key={d} style={[cal.dowText, { color: T.muted }]}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: cells.length / 7 }, (_, ri) => (
        <View key={ri} style={cal.weekRow}>
          {cells.slice(ri * 7, ri * 7 + 7).map((day, ci) => {
            if (!day) return <View key={ci} style={cal.cell} />;
            const dateStr = isoDate(vy, vm, day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const events = markedDates[dateStr] ?? [];
            const dotColor = getTopDotColor(events);
            const hasMultiType = isPro && new Set(events.map((e) => e.type)).size > 1;

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  cal.cell,
                  isSelected && [cal.selectedCell, { backgroundColor: T.primary }],
                  !isSelected && isToday && [cal.todayCell, { borderColor: T.accent }],
                ]}
                onPress={() => onSelect(dateStr)}
              >
                <Text style={[cal.dayNum, { color: isSelected ? '#fff' : isToday ? T.accent : T.primary }]}>
                  {day}
                </Text>
                {dotColor && (
                  <View style={cal.dotRow}>
                    <View style={[cal.dot, { backgroundColor: dotColor }]} />
                    {hasMultiType && <View style={[cal.dot, { backgroundColor: T.muted }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Free-version legend */}
      {!isPro && (
        <Text style={[cal.freeLegend, { color: T.muted }]}>
          ● Green dot = event scheduled
        </Text>
      )}

      {/* Pro legend */}
      {isPro && (
        <View style={cal.proLegend}>
          {(Object.keys(EVENT_TYPE_COLOR) as EventType[]).map((type) => (
            <View key={type} style={cal.legendItem}>
              <View style={[cal.legendDot, { backgroundColor: EVENT_TYPE_COLOR[type] }]} />
              <Text style={[cal.legendText, { color: T.muted }]}>{type}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Summary pill ─────────────────────────────────────────────────────────────

function SummaryPill({ label, value, color, T }: { label: string; value: number; color: string; T: ThemeColors }) {
  return (
    <View style={[styles.summaryPill, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: T.muted }]}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const athletes = useAppStore((s) => s.athletes);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const attendance = useAppStore((s) => s.attendance);
  const schedule = useAppStore((s) => s.schedule);
  const isPro = useAppStore((s) => s.isPro);
  const customThresholds = useAppStore((s) => s.customThresholds);
  const cycleAttendance = useAppStore((s) => s.cycleAttendance);
  const addEvent = useAppStore((s) => s.addEvent);
  const removeEvent = useAppStore((s) => s.removeEvent);
  const importScheduleEvents = useAppStore((s) => s.importScheduleEvents);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));
  const teamSchedule = schedule
    .filter((e) => e.teamId === activeTeamId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const thresholds = isPro ? customThresholds : ATTENDANCE_PRESETS;

  // Default to today always
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', date: attendanceDate, time: '', type: 'Practice' as EventType });
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Array<{ name: string; date: string; time: string; type: string }> | null>(null);
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  // Build markedDates map for calendar
  const markedDates = useMemo<Record<string, Array<{ type: EventType; name: string }>>>(() => {
    const m: Record<string, Array<{ type: EventType; name: string }>> = {};
    teamSchedule.forEach((ev) => {
      if (!m[ev.date]) m[ev.date] = [];
      m[ev.date].push({ type: ev.type, name: ev.name });
    });
    return m;
  }, [teamSchedule]);

  // Events on selected date
  const selectedDateEvents = markedDates[attendanceDate] ?? [];

  const dayAttendance = attendance[attendanceDate] ?? {};

  const summary = useMemo(() => {
    let present = 0, absent = 0, excused = 0;
    teamAthletes.forEach((a) => {
      const s = dayAttendance[a.id] ?? 'present';
      if (s === 'present') present++;
      else if (s === 'absent') absent++;
      else excused++;
    });
    return { present, absent, excused };
  }, [dayAttendance, teamAthletes]);

  const alertedAthletes = useMemo(() =>
    teamAthletes
      .map((a) => ({ athlete: a, stats: attendanceStats(a.id, attendance, teamSchedule) }))
      .filter(({ stats }) => getAttendanceAlert(stats, thresholds) !== 'green'),
    [teamAthletes, attendance, teamSchedule, thresholds],
  );

  // ── Handle select ──────────────────────────────────────────────────────────

  const handleSelectDate = (d: string) => {
    setAttendanceDate(d);
    setNewEvent((prev) => ({ ...prev, date: d }));
  };

  // ── CSV schedule import ────────────────────────────────────────────────────

  const handleScheduleCsv = async () => {
    setImportError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    let text: string;
    try { text = await FileSystem.readAsStringAsync(result.assets[0].uri); }
    catch { setImportError('Could not read file.'); return; }

    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    if (!parsed.data.length) { setImportError('No rows found.'); return; }
    const headers = Object.keys(parsed.data[0]);
    const nameKey = headers.find((h) => h.includes('name') || h.includes('event'));
    const dateKey = headers.find((h) => h.includes('date'));
    if (!nameKey || !dateKey) { setImportError('CSV needs "Event Name" and "Date" columns.'); return; }
    const timeKey = headers.find((h) => h.includes('time'));
    const typeKey = headers.find((h) => h.includes('type'));
    const rows = parsed.data
      .map((row) => ({
        name: (row[nameKey] ?? '').trim(),
        date: (row[dateKey] ?? '').trim(),
        time: timeKey ? (row[timeKey] ?? '').trim() : '',
        type: typeKey ? (row[typeKey] ?? 'Practice').trim() : 'Practice',
      }))
      .filter((r) => r.name && r.date);
    if (!rows.length) { setImportError('No valid events found.'); return; }
    setImportPreview(rows);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    importScheduleEvents(importPreview as any);
    setImportPreview(null);
  };

  // ── Status config ──────────────────────────────────────────────────────────

  const statusConfig = {
    present: { label: 'Present', color: '#4CAF7D', Icon: Check },
    absent:  { label: 'Absent',  color: '#D9667A', Icon: X },
    excused: { label: 'Excused', color: '#E8A33D', Icon: Clock },
  };

  return (
    <ScreenShell>
      <ScheduleCsvHelpModal visible={showCsvHelp} onClose={() => setShowCsvHelp(false)} T={T} />

      {/* Alert banner */}
      {alertedAthletes.length > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: '#FFF3CD', borderColor: '#E8A33D' }]}>
          <Bell size={15} color="#E8A33D" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Attendance Alerts</Text>
            {alertedAthletes.map(({ athlete, stats }) => {
              const level = getAttendanceAlert(stats, thresholds);
              const c = alertColor(level);
              return (
                <Text key={athlete.id} style={[styles.alertRow, { color: c }]}>
                  • {athlete.name}: {stats.absent} absence{stats.absent !== 1 ? 's' : ''}, {stats.pct}%
                </Text>
              );
            })}
          </View>
        </View>
      )}

      {/* Calendar */}
      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
        <Text style={[styles.sectionLabel, { color: T.muted }]}>Practice Date</Text>
        <MonthCalendar
          selectedDate={attendanceDate}
          onSelect={handleSelectDate}
          markedDates={markedDates}
          isPro={isPro}
          T={T}
        />
      </View>

      {/* Selected date event info */}
      {selectedDateEvents.length > 0 ? (
        <View style={[styles.dayEventBanner, { backgroundColor: T.card, borderColor: T.border }]}>
          {selectedDateEvents.map((ev, i) => {
            const color = EVENT_TYPE_COLOR[ev.type as EventType] ?? T.muted;
            const icon = EVENT_TYPE_ICON[ev.type as EventType] ?? '📅';
            return (
              <View key={i} style={styles.dayEventRow}>
                <Text style={{ fontSize: 13 }}>{icon}</Text>
                <Text style={[styles.dayEventName, { color: T.primary }]}>{ev.name}</Text>
                <View style={[styles.typePill, { backgroundColor: `${color}22` }]}>
                  <Text style={[styles.typePillText, { color }]}>{ev.type}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.noEventText, { color: T.muted }]}>
          No events scheduled for {attendanceDate}
        </Text>
      )}

      {/* Pro: Add event + Import buttons (always visible) */}
      {isPro && (
        <View style={styles.scheduleActions}>
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: T.border, backgroundColor: T.card }]}
            onPress={handleScheduleCsv}
          >
            <Upload size={12} color={T.primary} />
            <Text style={[styles.outlineBtnText, { color: T.primary }]}>Import CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.helpBtn, { borderColor: T.border, backgroundColor: T.card }]}
            onPress={() => setShowCsvHelp(true)}
          >
            <HelpCircle size={15} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accentBtn, { backgroundColor: T.accent }]}
            onPress={() => { setShowAddEvent((v) => !v); setNewEvent((e) => ({ ...e, date: attendanceDate })); }}
          >
            <Plus size={12} color={T.primary} />
            <Text style={[styles.accentBtnText, { color: T.primary }]}>Add Event</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Event form */}
      {isPro && showAddEvent && (
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>New Event</Text>
          <TextInput
            placeholder="Event name *"
            placeholderTextColor={T.muted}
            value={newEvent.name}
            onChangeText={(v) => setNewEvent((e) => ({ ...e, name: v }))}
            style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
          />
          <View style={styles.row2}>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={T.muted}
              value={newEvent.date}
              onChangeText={(v) => setNewEvent((e) => ({ ...e, date: v }))}
              style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary, flex: 1 }]}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              placeholder="HH:MM AM"
              placeholderTextColor={T.muted}
              value={newEvent.time}
              onChangeText={(v) => setNewEvent((e) => ({ ...e, time: v }))}
              style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary, flex: 1 }]}
            />
          </View>
          {/* Event type buttons */}
          <View style={styles.typeButtons}>
            {EVENT_TYPES.map((t) => {
              const color = EVENT_TYPE_COLOR[t];
              const isSelected = newEvent.type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, { borderColor: isSelected ? color : T.border, backgroundColor: isSelected ? `${color}22` : T.bg }]}
                  onPress={() => setNewEvent((e) => ({ ...e, type: t }))}
                >
                  <Text style={{ fontSize: 11 }}>{EVENT_TYPE_ICON[t]}</Text>
                  <Text style={[styles.typeBtnText, { color: isSelected ? color : T.muted }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: T.primary }]}
            onPress={() => {
              if (!newEvent.name || !newEvent.date) return;
              addEvent(newEvent);
              setNewEvent({ name: '', date: attendanceDate, time: '', type: 'Practice' });
              setShowAddEvent(false);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save Event</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Import feedback */}
      {importError && (
        <View style={[styles.errorBanner, { backgroundColor: '#D9667A18', borderColor: '#D9667A44' }]}>
          <Text style={{ color: '#D9667A', fontSize: 13, flex: 1 }}>{importError}</Text>
          <TouchableOpacity onPress={() => setImportError(null)}><X size={14} color="#D9667A" /></TouchableOpacity>
        </View>
      )}

      {importPreview && (
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
          <Text style={[styles.importTitle, { color: T.primary }]}>
            Import {importPreview.length} event{importPreview.length !== 1 ? 's' : ''}?
          </Text>
          <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
            {importPreview.map((e, i) => (
              <Text key={i} style={[styles.importRow, { color: T.muted }]}>
                • {e.name} — {e.date}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.importBtns}>
            <TouchableOpacity style={[styles.importBtn, { borderColor: T.border }]} onPress={() => setImportPreview(null)}>
              <Text style={{ color: T.muted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: T.primary, borderColor: T.primary }]} onPress={confirmImport}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <SummaryPill label="Present" value={summary.present} color="#4CAF7D" T={T} />
        <SummaryPill label="Absent"  value={summary.absent}  color="#D9667A" T={T} />
        <SummaryPill label="Excused" value={summary.excused} color="#E8A33D" T={T} />
      </View>

      {/* Athlete check-in list */}
      <View style={styles.athleteList}>
        {teamAthletes.map((a) => {
          const status = (dayAttendance[a.id] ?? 'present') as 'present' | 'absent' | 'excused';
          const cfg = statusConfig[status];
          const Icon = cfg.Icon;
          return (
            <TouchableOpacity
              key={a.id}
              style={[styles.athleteRow, { backgroundColor: T.card, borderColor: T.border }]}
              onPress={() => cycleAttendance(a.id, attendanceDate)}
            >
              <Text style={[styles.athleteName, { color: T.primary }]}>{a.name}</Text>
              <View style={[styles.statusPill, { backgroundColor: `${cfg.color}1A` }]}>
                <Icon size={13} color={cfg.color} />
                <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {teamAthletes.length === 0 && (
          <Text style={[styles.emptyText, { color: T.muted }]}>No athletes — add them in the Roster tab.</Text>
        )}
      </View>

      <Text style={[styles.tip, { color: T.muted }]}>Tap athlete to cycle: Present → Absent → Excused</Text>

      {/* Pro: Schedule list below */}
      {isPro && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.scheduleTitle, { color: T.primary }]}>
            Full Schedule ({teamSchedule.length} event{teamSchedule.length !== 1 ? 's' : ''})
          </Text>
          <View style={{ gap: 6, marginTop: 7 }}>
            {teamSchedule.map((ev) => {
              const color = EVENT_TYPE_COLOR[ev.type] ?? T.muted;
              const icon = EVENT_TYPE_ICON[ev.type] ?? '📅';
              const isSelected = ev.date === attendanceDate;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.eventRow,
                    { backgroundColor: T.card, borderColor: isSelected ? color : T.border, borderWidth: isSelected ? 2 : 1 },
                  ]}
                  onPress={() => handleSelectDate(ev.date)}
                >
                  <View style={[styles.eventTypeBar, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.eventRowTop}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <Text style={[styles.eventName, { color: T.primary }]}>{ev.name}</Text>
                    </View>
                    <Text style={[styles.eventSub, { color: T.muted }]}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</Text>
                  </View>
                  <View style={styles.eventRight}>
                    <View style={[styles.typePill, { backgroundColor: `${color}22` }]}>
                      <Text style={[styles.typePillText, { color }]}>{ev.type}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeEvent(ev.id)}>
                      <X size={14} color="#C4A2AE" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
            {teamSchedule.length === 0 && (
              <Text style={[styles.emptyText, { color: T.muted }]}>No events yet — use Add Event or Import CSV above.</Text>
            )}
          </View>

          {/* End of season summary */}
          {teamSchedule.length > 0 && (
            <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginTop: 12 }]}>
              <Text style={[styles.sectionLabel, { color: T.muted }]}>End of Season Summary</Text>
              <Text style={[styles.summaryMeta, { color: T.muted }]}>Total events: {teamSchedule.length}</Text>

              {teamAthletes.some((a) => {
                const att = attendanceStats(a.id, attendance, teamSchedule);
                return att.absent === 0 && att.total > 0;
              }) && (
                <View style={styles.perfectBlock}>
                  <Text style={styles.perfectTitle}>🏆 Perfect Attendance</Text>
                  {teamAthletes
                    .filter((a) => { const att = attendanceStats(a.id, attendance, teamSchedule); return att.absent === 0 && att.total > 0; })
                    .map((a) => <Text key={a.id} style={styles.perfectRow}>• {a.name}</Text>)}
                </View>
              )}

              {teamAthletes.map((a) => {
                const att = attendanceStats(a.id, attendance, teamSchedule);
                const color = att.pct >= 90 ? '#4CAF7D' : att.pct >= 75 ? '#E8A33D' : '#D9667A';
                return (
                  <View key={a.id} style={styles.summaryAthleteRow}>
                    <Text style={[styles.summaryAthleteName, { color: T.primary }]}>{a.name}</Text>
                    <Text style={[styles.summaryAthletePct, { color }]}>{att.pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {!isPro && (
        <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44` }]}>
          <Text style={[styles.proBannerText, { color: T.accent }]}>
            🔒 Pro: Add & import schedule, competition markers, custom thresholds & season summary
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}

// ─── Calendar styles ──────────────────────────────────────────────────────────

const CELL_SIZE = 42;

const cal = StyleSheet.create({
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  navBtn: { padding: 5 },
  monthLabel: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 15 },
  todayBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  todayBtnText: { fontSize: 11, fontWeight: '700' },

  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowText: { width: CELL_SIZE, textAlign: 'center', fontSize: 10, fontWeight: '700' },

  weekRow: { flexDirection: 'row', marginBottom: 2 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  selectedCell: { borderRadius: CELL_SIZE / 2 },
  todayCell: { borderRadius: CELL_SIZE / 2, borderWidth: 2 },

  dayNum: { fontSize: 13, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  freeLegend: { fontSize: 10, marginTop: 8, textAlign: 'center' },
  proLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  alertBanner: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12, alignItems: 'flex-start' },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#E8A33D', marginBottom: 3 },
  alertRow: { fontSize: 12, fontWeight: '600' },

  dayEventBanner: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, gap: 5 },
  dayEventRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dayEventName: { flex: 1, fontWeight: '700', fontSize: 13 },
  noEventText: { fontSize: 11, textAlign: 'center', marginBottom: 10 },

  scheduleActions: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  outlineBtnText: { fontWeight: '700', fontSize: 12 },
  helpBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', alignItems: 'center' },
  accentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  accentBtnText: { fontWeight: '700', fontSize: 12 },

  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 7 },
  row2: { flexDirection: 'row', gap: 7 },
  typeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  typeBtnText: { fontSize: 11, fontWeight: '700' },
  saveBtn: { borderRadius: 8, padding: 10, alignItems: 'center' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 9, marginBottom: 8 },
  importTitle: { fontWeight: '800', fontSize: 14, marginBottom: 7 },
  importRow: { fontSize: 13, marginBottom: 3 },
  importBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  importBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 9, alignItems: 'center' },

  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 11 },
  summaryPill: { flex: 1, borderWidth: 1, borderRadius: 9, padding: 8, alignItems: 'center' },
  summaryValue: { fontSize: 19, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

  athleteList: { gap: 6, marginBottom: 8 },
  athleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12 },
  athleteName: { fontWeight: '700', fontSize: 14 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  statusLabel: { fontSize: 12, fontWeight: '700' },

  tip: { fontSize: 11, textAlign: 'center', marginTop: 6, marginBottom: 10 },

  scheduleTitle: { fontSize: 14, fontWeight: '700' },
  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
  eventTypeBar: { width: 5, alignSelf: 'stretch' },
  eventRowTop: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, paddingLeft: 10, paddingRight: 4 },
  eventName: { fontWeight: '700', fontSize: 13, flex: 1 },
  eventSub: { fontSize: 11, marginTop: 1, paddingLeft: 10, paddingBottom: 10 },
  eventRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10, paddingTop: 10 },
  typePill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  typePillText: { fontSize: 11, fontWeight: '700' },

  proBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  summaryMeta: { fontSize: 13, marginBottom: 8 },
  perfectBlock: { backgroundColor: '#4CAF7D18', borderWidth: 1, borderColor: '#4CAF7D44', borderRadius: 8, padding: 8, marginBottom: 8 },
  perfectTitle: { fontSize: 12, fontWeight: '700', color: '#4CAF7D', marginBottom: 4 },
  perfectRow: { fontSize: 12, color: '#4CAF7D' },
  summaryAthleteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryAthleteName: { fontSize: 12 },
  summaryAthletePct: { fontSize: 12, fontWeight: '700' },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
