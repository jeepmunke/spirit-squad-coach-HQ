import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Linking, Switch, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import {
  ChevronDown, ChevronUp, ChevronLeft, X, Plus, Upload,
  Info, Camera, Mail, Phone, AlertTriangle, Pencil, Trash2,
} from 'lucide-react-native';
import { useAppStore, currentRating, numericRating } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { ratingColor, SKILL_LIBRARY, ATTENDANCE_PRESETS } from '@/constants/skills';
import ScreenShell from '@/components/ScreenShell';
import type { Athlete, Parent, AttendanceMap, ScheduleEvent, EvalLogEntry } from '@/types';

// ─── Validation & formatting helpers ─────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

interface AttendanceStats {
  total: number; present: number; absent: number; excused: number;
  pct: number; weightedPct: number;
}

function attendanceStats(
  athleteId: number,
  attendance: AttendanceMap,
  scheduleEvents: ScheduleEvent[],
): AttendanceStats {
  const scheduledDates = new Set(scheduleEvents.map((e) => e.date));
  const relevantDates = Object.keys(attendance).filter((d) => scheduledDates.has(d));
  let present = 0, absent = 0, excused = 0, weightedTotal = 0, weightedPresent = 0;
  relevantDates.forEach((d) => {
    const s = (attendance[d] ?? {})[athleteId] ?? 'present';
    const event = scheduleEvents.find((e) => e.date === d);
    const weight = event?.priority ?? 1;
    if (s === 'present') { present++; weightedPresent += weight; }
    else if (s === 'absent') absent++;
    else excused++;
    weightedTotal += weight;
  });
  const total = relevantDates.length;
  return {
    total, present, absent, excused,
    pct: total ? Math.round((present / total) * 100) : 100,
    weightedPct: weightedTotal ? Math.round((weightedPresent / weightedTotal) * 100) : 100,
  };
}

function getAttendanceAlert(
  stats: AttendanceStats,
  thresholds: typeof ATTENDANCE_PRESETS,
): 'red' | 'yellow' | 'green' {
  if (stats.absent >= thresholds.redAbsences || stats.pct <= thresholds.redPct) return 'red';
  if (stats.absent >= thresholds.yellowAbsences || stats.pct <= thresholds.yellowPct) return 'yellow';
  return 'green';
}

function calcAthleteStats(
  athleteId: number,
  evalLog: EvalLogEntry[],
  naSkills: Record<number, Record<string, boolean>>,
  seasonIdx: number,
  seasons: string[],
) {
  const results: Record<string, {
    skills: Array<{ skill: string; rating: string; isNA: boolean; numeric: number | null }>;
    avg: string | null;
  }> = {};
  Object.entries(SKILL_LIBRARY).forEach(([cat, skills]) => {
    let catSum = 0, catCount = 0;
    const skillResults: Array<{ skill: string; rating: string; isNA: boolean; numeric: number | null }> = [];
    (skills as readonly string[]).forEach((skill) => {
      const naKey = `${cat}|${skill}`;
      const isNA = !!(naSkills[athleteId]?.[naKey]);
      const rating = currentRating(evalLog, { athleteId, category: cat, skill, upToSeasonIdx: seasonIdx }, seasons);
      const num = isNA ? null : numericRating(rating);
      skillResults.push({ skill, rating, isNA, numeric: num });
      if (!isNA && num !== null) { catSum += num; catCount++; }
    });
    results[cat] = { skills: skillResults, avg: catCount ? (catSum / catCount).toFixed(2) : null };
  });
  return results;
}

const alertColor = (level: 'red' | 'yellow' | 'green') =>
  level === 'red' ? '#D9667A' : level === 'yellow' ? '#E8A33D' : '#4CAF7D';

// ─── Athlete form state ───────────────────────────────────────────────────────

interface AthleteFormData {
  name: string; grade: string; position: string;
  email: string; phone: string;
  isYouth: boolean;
  parents: Parent[];
  emergencyName: string; emergencyPhone: string;
}

const EMPTY_FORM: AthleteFormData = {
  name: '', grade: '', position: '',
  email: '', phone: '',
  isYouth: false,
  parents: [],
  emergencyName: '', emergencyPhone: '',
};

function athleteToForm(a: Athlete): AthleteFormData {
  return {
    name: a.name, grade: a.grade, position: a.position,
    email: a.email, phone: a.phone,
    isYouth: a.isYouth,
    parents: a.parents.map((p) => ({ ...p })),
    emergencyName: a.emergencyName, emergencyPhone: a.emergencyPhone,
  };
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function FieldLabel({ children, T }: { children: React.ReactNode; T: ThemeColors }) {
  return <Text style={[styles.fieldLabel, { color: T.muted }]}>{children}</Text>;
}

function ValidationMsg({ msg }: { msg: string }) {
  return <Text style={styles.validationMsg}>{msg}</Text>;
}

function ContactRow({ icon: Icon, label, href, T }: { icon: any; label: string; href: string | null; T: ThemeColors }) {
  if (!label) return null;
  return (
    <TouchableOpacity style={styles.contactRow} onPress={() => href ? Linking.openURL(href) : undefined} disabled={!href}>
      <Icon size={13} color={T.muted} />
      <Text style={[styles.contactLabel, { color: href ? T.accent : T.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ContactGroup({ title, name, children, T }: { title: string; name?: string; children: React.ReactNode; T: ThemeColors }) {
  return (
    <View style={styles.contactGroup}>
      <Text style={[styles.contactGroupTitle, { color: T.muted }]}>{title}{name ? ` · ${name}` : ''}</Text>
      {children}
    </View>
  );
}

function ProBanner({ feature, T }: { feature: string; T: ThemeColors }) {
  return (
    <View style={[styles.proBanner, { backgroundColor: `${T.accent}18`, borderColor: `${T.accent}44` }]}>
      <Text style={[styles.proBannerText, { color: T.accent }]}>🔒 Pro: {feature}</Text>
    </View>
  );
}

function MiniPill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.miniPill, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Text style={[styles.miniPillValue, { color }]}>{value}</Text>
      <Text style={[styles.miniPillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Athlete Form (Add + Edit) ────────────────────────────────────────────────

interface AthleteFormProps {
  initial: AthleteFormData;
  title: string;
  onSave: (data: AthleteFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  T: ThemeColors;
}

function AthleteForm({ initial, title, onSave, onCancel, onDelete, T }: AthleteFormProps) {
  const [form, setForm] = useState<AthleteFormData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback((patch: Partial<AthleteFormData>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const updateParent = (idx: number, patch: Partial<Parent>) => {
    const updated = form.parents.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setForm((f) => ({ ...f, parents: updated }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[`parent_${idx}_${k}`]);
      return next;
    });
  };

  const addParent = () => setForm((f) => ({ ...f, parents: [...f.parents, { name: '', email: '', phone: '' }] }));
  const removeParent = (idx: number) => setForm((f) => ({ ...f, parents: f.parents.filter((_, i) => i !== idx) }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (form.email && !isValidEmail(form.email)) e.email = 'Enter a valid email (e.g. name@domain.com).';
    form.parents.forEach((p, i) => {
      if (p.email && !isValidEmail(p.email)) e[`parent_${i}_email`] = 'Enter a valid email.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inp = (extraStyle?: object) => [styles.textInput, { backgroundColor: T.bg, borderColor: T.border, color: T.primary }, extraStyle];

  return (
    <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 12 }]}>
      <Text style={[styles.formTitle, { color: T.primary }]}>{title}</Text>

      <TextInput
        placeholder="Full name *"
        placeholderTextColor={T.muted}
        value={form.name}
        onChangeText={(v) => { set({ name: v }); setErrors((e) => ({ ...e, name: '' })); }}
        style={inp(errors.name ? { borderColor: '#D9667A' } : undefined)}
      />
      {errors.name ? <ValidationMsg msg={errors.name} /> : null}

      <View style={styles.row2}>
        <TextInput placeholder="Grade" placeholderTextColor={T.muted} value={form.grade} onChangeText={(v) => set({ grade: v })} style={inp({ flex: 1 })} />
        <TextInput placeholder="Position" placeholderTextColor={T.muted} value={form.position} onChangeText={(v) => set({ position: v })} style={inp({ flex: 1 })} />
      </View>

      <FieldLabel T={T}>Athlete Contact</FieldLabel>
      <TextInput
        placeholder="Email"
        placeholderTextColor={T.muted}
        value={form.email}
        onChangeText={(v) => { set({ email: v }); setErrors((e) => ({ ...e, email: '' })); }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={inp(errors.email ? { borderColor: '#D9667A' } : undefined)}
      />
      {errors.email ? <ValidationMsg msg={errors.email} /> : null}

      <TextInput
        placeholder="Phone — (555) 123-4567"
        placeholderTextColor={T.muted}
        value={form.phone}
        onChangeText={(v) => set({ phone: formatPhone(v) })}
        keyboardType="phone-pad"
        style={inp()}
      />

      <TouchableOpacity style={styles.youthToggle} onPress={() => {
        const next = !form.isYouth;
        setForm((f) => ({ ...f, isYouth: next, parents: next && f.parents.length === 0 ? [{ name: '', email: '', phone: '' }] : f.parents }));
      }}>
        <Switch
          value={form.isYouth}
          onValueChange={(next) => setForm((f) => ({ ...f, isYouth: next, parents: next && f.parents.length === 0 ? [{ name: '', email: '', phone: '' }] : f.parents }))}
          trackColor={{ false: T.border, true: T.accent }}
          thumbColor="#fff"
        />
        <Text style={[styles.youthLabel, { color: T.primary }]}>Minor — add parent/guardian info</Text>
      </TouchableOpacity>

      {form.isYouth && (
        <>
          {form.parents.map((p, i) => (
            <View key={i} style={[styles.parentBlock, { borderColor: T.border, backgroundColor: T.bg }]}>
              <View style={styles.parentHeader}>
                <Text style={[styles.parentTitle, { color: T.primary }]}>Parent / Guardian {form.parents.length > 1 ? i + 1 : ''}</Text>
                {form.parents.length > 1 && (
                  <TouchableOpacity onPress={() => removeParent(i)} style={styles.iconBtn}>
                    <Trash2 size={14} color="#D9667A" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput placeholder="Name" placeholderTextColor={T.muted} value={p.name} onChangeText={(v) => updateParent(i, { name: v })} style={inp()} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={T.muted}
                value={p.email}
                onChangeText={(v) => updateParent(i, { email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
                style={inp(errors[`parent_${i}_email`] ? { borderColor: '#D9667A' } : undefined)}
              />
              {errors[`parent_${i}_email`] ? <ValidationMsg msg={errors[`parent_${i}_email`]} /> : null}
              <TextInput
                placeholder="Phone — (555) 123-4567"
                placeholderTextColor={T.muted}
                value={p.phone}
                onChangeText={(v) => updateParent(i, { phone: formatPhone(v) })}
                keyboardType="phone-pad"
                style={inp()}
              />
            </View>
          ))}
          <TouchableOpacity style={[styles.addParentBtn, { borderColor: T.accent }]} onPress={addParent}>
            <Plus size={14} color={T.accent} />
            <Text style={[styles.addParentText, { color: T.accent }]}>Add Another Parent / Guardian</Text>
          </TouchableOpacity>
        </>
      )}

      <FieldLabel T={T}>Emergency Contact</FieldLabel>
      <TextInput placeholder="Name" placeholderTextColor={T.muted} value={form.emergencyName} onChangeText={(v) => set({ emergencyName: v })} style={inp()} />
      <TextInput
        placeholder="Phone — (555) 123-4567"
        placeholderTextColor={T.muted}
        value={form.emergencyPhone}
        onChangeText={(v) => set({ emergencyPhone: formatPhone(v) })}
        keyboardType="phone-pad"
        style={inp()}
      />

      <View style={styles.row2}>
        <TouchableOpacity style={[styles.formBtn, { borderColor: T.border }]} onPress={onCancel}>
          <Text style={{ color: T.muted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formBtn, { backgroundColor: T.primary, borderColor: T.primary, flex: 2 }]}
          onPress={() => { if (validate()) onSave(form); }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save Athlete</Text>
        </TouchableOpacity>
      </View>

      {onDelete && (
        <TouchableOpacity style={[styles.deleteBtn, { borderColor: '#D9667A44' }]} onPress={onDelete}>
          <Trash2 size={15} color="#D9667A" />
          <Text style={styles.deleteBtnText}>Remove Athlete from Roster</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Import confirm ───────────────────────────────────────────────────────────

function ImportConfirm({ items, onCancel, onConfirm, T }: { items: Partial<Athlete>[]; onCancel: () => void; onConfirm: () => void; T: ThemeColors }) {
  return (
    <View style={[styles.importConfirm, { backgroundColor: T.card, borderColor: T.border }]}>
      <Text style={[styles.importConfirmTitle, { color: T.primary }]}>
        Import {items.length} athlete{items.length !== 1 ? 's' : ''}?
      </Text>
      <ScrollView style={styles.importList} nestedScrollEnabled>
        {items.map((a, i) => (
          <Text key={i} style={[styles.importRow, { color: T.muted }]}>
            • {a.name}
            {[a.grade, a.position].filter(Boolean).join(' · ')
              ? <Text style={{ color: T.primary }}> — {[a.grade, a.position].filter(Boolean).join(' · ')}</Text>
              : null}
          </Text>
        ))}
      </ScrollView>
      <View style={styles.importActions}>
        <TouchableOpacity style={[styles.importBtn, { borderColor: T.border }]} onPress={onCancel}>
          <Text style={{ color: T.muted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.importBtn, { backgroundColor: T.primary, borderColor: T.primary }]} onPress={onConfirm}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Confirm Import</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── CSV Help Modal ───────────────────────────────────────────────────────────

function CsvHelpModal({ visible, onClose, T }: { visible: boolean; onClose: () => void; T: ThemeColors }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: T.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.primary }]}>CSV Roster Import Guide</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={T.muted} /></TouchableOpacity>
          </View>
          <Text style={[styles.helpBody, { color: T.muted }]}>
            Only <Text style={{ fontWeight: '700', color: T.primary }}>Name</Text> is required. All other columns are optional.
          </Text>
          <View style={[styles.codeBlock, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Text style={[styles.codeLabel, { color: T.accent }]}>Required:</Text>
            <Text style={[styles.codeLine, { color: T.primary }]}>Name</Text>
            <Text style={[styles.codeLabel, { color: T.muted, marginTop: 8 }]}>Optional:</Text>
            <Text style={[styles.codeLine, { color: T.muted }]}>Grade · Position · Email · Phone</Text>
          </View>
          <View style={[styles.codeBlock, { backgroundColor: T.bg, borderColor: T.border, marginTop: 8 }]}>
            <Text style={[styles.codeLabel, { color: T.accent }]}>Example:</Text>
            <Text style={[styles.codeLine, { color: T.muted }]}>Name,Grade,Position,Email,Phone</Text>
            <Text style={[styles.codeLine, { color: T.primary }]}>Emma Smith,10th,Flyer,emma@email.com,555-100-2000</Text>
            <Text style={[styles.codeLine, { color: T.primary }]}>Jake Torres,11th,Base,jake@email.com,555-100-3000</Text>
          </View>
          <Text style={[styles.helpTip, { color: T.muted }]}>
            💡 Export your Google Sheet or Excel roster as .csv and import directly.
          </Text>
          <TouchableOpacity style={[styles.modalClose, { backgroundColor: T.primary }]} onPress={onClose}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Cover Sheet ──────────────────────────────────────────────────────────────

function CoverSheet({ athleteId, onBack, T }: { athleteId: number; onBack: () => void; T: ThemeColors }) {
  const athletes = useAppStore((s) => s.athletes);
  const evalLog = useAppStore((s) => s.evalLog);
  const naSkills = useAppStore((s) => s.naSkills);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);
  const groups = useAppStore((s) => s.groups);
  const attendance = useAppStore((s) => s.attendance);
  const schedule = useAppStore((s) => s.schedule);
  const isPro = useAppStore((s) => s.isPro);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const updateAthletePhoto = useAppStore((s) => s.updateAthletePhoto);
  const updateAthlete = useAppStore((s) => s.updateAthlete);
  const removeAthlete = useAppStore((s) => s.removeAthlete);
  const customThresholds = useAppStore((s) => s.customThresholds);

  const [editing, setEditing] = useState(false);

  const a = athletes.find((x) => x.id === athleteId);
  const seasonIdx = seasons.indexOf(season);
  const teamSchedule = schedule.filter((e) => e.teamId === activeTeamId).sort((a, b) => a.date.localeCompare(b.date));
  const thresholds = isPro ? customThresholds : ATTENDANCE_PRESETS;

  if (!a) return null;

  if (editing) {
    return (
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <AthleteForm
          initial={athleteToForm(a)}
          title="Edit Athlete"
          onCancel={() => setEditing(false)}
          onSave={(data) => { updateAthlete(a.id, data); setEditing(false); }}
          onDelete={() => Alert.alert(
            'Remove Athlete',
            `Permanently remove ${a.name} from the roster? This cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => { removeAthlete(a.id); onBack(); } },
            ],
          )}
          T={T}
        />
      </ScrollView>
    );
  }

  const stats = calcAthleteStats(a.id, evalLog, naSkills, seasonIdx, seasons);
  const att = attendanceStats(a.id, attendance, teamSchedule);
  const alert = getAttendanceAlert(att, thresholds);
  const ac = alertColor(alert);

  const teamGroups = groups.filter((g) => g.teamId === activeTeamId);
  const stuntGroup = teamGroups.find((g) => g.slots?.some((s) => s.athleteId === a.id));
  const stuntSlot = stuntGroup?.slots?.find((s) => s.athleteId === a.id);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to set athlete photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) updateAthletePhoto(a.id, result.assets[0].uri);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <View style={styles.coverTopRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={16} color={T.muted} />
          <Text style={[styles.backBtnText, { color: T.muted }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editBtn, { borderColor: T.border }]} onPress={() => setEditing(true)}>
          <Pencil size={13} color={T.primary} />
          <Text style={[styles.editBtnText, { color: T.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, alignItems: 'center', marginBottom: 10 }]}>
        <TouchableOpacity onPress={pickPhoto}>
          {a.photo
            ? <Image source={{ uri: a.photo }} style={[styles.coverPhoto, { borderColor: T.accent }]} />
            : <View style={[styles.coverInitials, { backgroundColor: T.bg, borderColor: T.accent }]}>
                <Text style={[styles.initialsText, { color: T.muted, fontSize: 28 }]}>
                  {a.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </Text>
              </View>}
        </TouchableOpacity>
        <Text style={[styles.coverPhotoBtn, { color: T.accent }]}>{a.photo ? 'Change Photo' : 'Add Photo'}</Text>
        <Text style={[styles.coverName, { color: T.primary }]}>{a.name}</Text>
        <Text style={[styles.coverSub, { color: T.muted }]}>{a.grade}{a.position ? ` · ${a.position}` : ''}</Text>
        {stuntGroup && (
          <Text style={[styles.coverGroup, { color: T.accent }]}>{stuntGroup.name} · {stuntSlot?.label}</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
        <FieldLabel T={T}>Contact</FieldLabel>
        {(a.email || a.phone) && (
          <ContactGroup title="Athlete" T={T}>
            <ContactRow icon={Mail} label={a.email} href={a.email ? `mailto:${a.email}` : null} T={T} />
            <ContactRow icon={Phone} label={a.phone} href={a.phone ? `tel:${a.phone.replace(/\D/g, '')}` : null} T={T} />
          </ContactGroup>
        )}
        {a.isYouth && a.parents.map((p, i) => (
          <ContactGroup key={i} title="Parent / Guardian" name={p.name} T={T}>
            <ContactRow icon={Mail} label={p.email} href={p.email ? `mailto:${p.email}` : null} T={T} />
            <ContactRow icon={Phone} label={p.phone} href={p.phone ? `tel:${p.phone.replace(/\D/g, '')}` : null} T={T} />
          </ContactGroup>
        ))}
        {a.emergencyPhone && (
          <ContactGroup title="Emergency" name={a.emergencyName} T={T}>
            <ContactRow icon={Phone} label={a.emergencyPhone} href={`tel:${a.emergencyPhone.replace(/\D/g, '')}`} T={T} />
          </ContactGroup>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
        <FieldLabel T={T}>Attendance · {season}</FieldLabel>
        <View style={styles.attPills}>
          <MiniPill label="Present" value={att.present} color="#4CAF7D" />
          <MiniPill label="Absent" value={att.absent} color="#D9667A" />
          <MiniPill label="Rate" value={`${att.pct}%`} color={ac} />
        </View>
        {alert !== 'green' && (
          <View style={[styles.alertBanner, { backgroundColor: `${ac}18`, borderColor: `${ac}44` }]}>
            <AlertTriangle size={14} color={ac} />
            <Text style={[styles.alertText, { color: ac }]}>
              {alert === 'red' ? 'Attendance threshold exceeded — action required' : 'Attendance warning — approaching threshold'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
        <FieldLabel T={T}>Season Ratings · {season}</FieldLabel>
        {Object.entries(stats).map(([cat, data]) => (
          <View key={cat} style={{ marginBottom: 10 }}>
            <View style={styles.catHeader}>
              <Text style={[styles.catLabel, { color: T.primary }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              <View style={styles.catAvgRow}>
                <View style={[styles.dot10, { backgroundColor: ratingColor(Math.round(parseFloat(data.avg ?? '0'))) }]} />
                <Text style={[styles.avgLabel, { color: ratingColor(Math.round(parseFloat(data.avg ?? '0'))) }]}>Avg</Text>
              </View>
            </View>
            {data.skills.filter((s) => !s.isNA).map((s) => (
              <View key={s.skill} style={styles.skillRow}>
                <Text style={[styles.skillName, { color: T.muted }]}>{s.skill}</Text>
                <View style={[styles.dot10, { backgroundColor: ratingColor(s.numeric) }]} />
              </View>
            ))}
          </View>
        ))}
      </View>

      {!isPro && <ProBanner feature="Custom group assignments (jump group, dance group, tumble group)" T={T} />}
    </ScrollView>
  );
}

// ─── Athlete Card ─────────────────────────────────────────────────────────────

function AthleteCard({
  athlete, alertLevel, expanded, onExpand, onOpenCover, onPhoto, T,
}: {
  athlete: Athlete;
  alertLevel: 'red' | 'yellow' | 'green';
  expanded: boolean;
  onExpand: () => void;
  onOpenCover: () => void;
  onPhoto: () => void;
  T: ThemeColors;
}) {
  const ac = alertColor(alertLevel);
  const initials = athlete.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={styles.athleteRow}>
        <TouchableOpacity style={styles.athleteMain} onPress={onOpenCover}>
          <View style={styles.avatarWrap}>
            {athlete.photo
              ? <Image source={{ uri: athlete.photo }} style={[styles.avatar, { borderColor: T.border }]} />
              : <View style={[styles.avatar, { backgroundColor: T.bg, borderColor: T.border, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[styles.initialsText, { color: T.muted }]}>{initials}</Text>
                </View>}
            <View style={[styles.alertDot, { backgroundColor: ac, borderColor: T.card }]} />
          </View>
          <View>
            <Text style={[styles.athleteName, { color: T.primary }]}>{athlete.name}</Text>
            <Text style={[styles.athleteSub, { color: T.muted }]}>{athlete.grade}{athlete.position ? ` · ${athlete.position}` : ''}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.athleteActions}>
          <TouchableOpacity onPress={onPhoto} style={styles.iconBtn}><Camera size={15} color={T.muted} /></TouchableOpacity>
          <TouchableOpacity onPress={onExpand} style={styles.iconBtn}>
            {expanded ? <ChevronUp size={15} color={T.muted} /> : <ChevronDown size={15} color={T.muted} />}
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: T.bg }]}>
          {(athlete.email || athlete.phone) && (
            <ContactGroup title="Athlete" T={T}>
              <ContactRow icon={Mail} label={athlete.email} href={athlete.email ? `mailto:${athlete.email}` : null} T={T} />
              <ContactRow icon={Phone} label={athlete.phone} href={athlete.phone ? `tel:${athlete.phone.replace(/\D/g, '')}` : null} T={T} />
            </ContactGroup>
          )}
          {athlete.isYouth && athlete.parents.map((p, i) => (
            <ContactGroup key={i} title="Parent / Guardian" name={p.name} T={T}>
              <ContactRow icon={Mail} label={p.email} href={p.email ? `mailto:${p.email}` : null} T={T} />
              <ContactRow icon={Phone} label={p.phone} href={p.phone ? `tel:${p.phone.replace(/\D/g, '')}` : null} T={T} />
            </ContactGroup>
          ))}
          {(athlete.emergencyName || athlete.emergencyPhone) && (
            <ContactGroup title="Emergency" name={athlete.emergencyName} T={T}>
              <ContactRow icon={Phone} label={athlete.emergencyPhone} href={athlete.emergencyPhone ? `tel:${athlete.emergencyPhone.replace(/\D/g, '')}` : null} T={T} />
            </ContactGroup>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RosterScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const athletes = useAppStore((s) => s.athletes);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const teams = useAppStore((s) => s.teams);
  const attendance = useAppStore((s) => s.attendance);
  const schedule = useAppStore((s) => s.schedule);
  const isPro = useAppStore((s) => s.isPro);
  const customThresholds = useAppStore((s) => s.customThresholds);
  const addAthlete = useAppStore((s) => s.addAthlete);
  const updateAthletePhoto = useAppStore((s) => s.updateAthletePhoto);
  const setAthletes = useAppStore((s) => s.setAthletes);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));
  const teamSchedule = schedule.filter((e) => e.teamId === activeTeamId).sort((a, b) => a.date.localeCompare(b.date));
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const thresholds = isPro ? customThresholds : ATTENDANCE_PRESETS;

  const [coverAthleteId, setCoverAthleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<Athlete>[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCsvImport = async () => {
    setImportError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    let text: string;
    try { text = await FileSystem.readAsStringAsync(result.assets[0].uri); }
    catch { setImportError('Could not read file.'); return; }

    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    if (!parsed.data.length) { setImportError('No rows found.'); return; }
    const headers = Object.keys(parsed.data[0]);
    const nameKey = headers.find((h) => h.includes('name'));
    if (!nameKey) { setImportError('No "Name" column found.'); return; }
    const gradeKey = headers.find((h) => h.includes('grade') || h.includes('year'));
    const positionKey = headers.find((h) => h.includes('position') || h.includes('role'));
    const emailKey = headers.find((h) => h.includes('email'));
    const phoneKey = headers.find((h) => h.includes('phone'));

    const rows: Partial<Athlete>[] = parsed.data
      .map((row) => ({
        name: (row[nameKey] ?? '').trim(),
        grade: gradeKey ? (row[gradeKey] ?? '').trim() : '',
        position: positionKey ? (row[positionKey] ?? '').trim() : '',
        email: emailKey ? (row[emailKey] ?? '').trim() : '',
        phone: phoneKey ? formatPhone(row[phoneKey] ?? '') : '',
        isYouth: false, parents: [],
        emergencyName: '', emergencyPhone: '', photo: null,
      }))
      .filter((r) => r.name);

    if (!rows.length) { setImportError('No valid names found.'); return; }
    setImportPreview(rows);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const maxId = athletes.length ? Math.max(...athletes.map((a) => a.id)) : 0;
    let id = maxId + 1;
    setAthletes([...athletes, ...importPreview.map((a) => ({ ...(a as Omit<Athlete, 'id' | 'teamId'>), id: id++, teamId: activeTeamId } as Athlete))]);
    setImportPreview(null);
  };

  const pickPhoto = async (athleteId: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to set athlete photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) updateAthletePhoto(athleteId, result.assets[0].uri);
  };

  if (coverAthleteId !== null) {
    return (
      <ScreenShell scrollable={false}>
        <CoverSheet athleteId={coverAthleteId} onBack={() => setCoverAthleteId(null)} T={T} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <CsvHelpModal visible={showCsvHelp} onClose={() => setShowCsvHelp(false)} T={T} />

      <View style={styles.headerRow}>
        <Text style={[styles.listTitle, { color: T.primary }]}>
          {teamAthletes.length} Athletes · {activeTeam?.name}
        </Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity onPress={() => setShowCsvHelp(true)} style={styles.iconBtn}>
            <Info size={17} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineBtn, { backgroundColor: T.card, borderColor: T.border }]} onPress={handleCsvImport}>
            <Upload size={13} color={T.primary} />
            <Text style={[styles.outlineBtnText, { color: T.primary }]}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accentBtn, { backgroundColor: T.accent }]} onPress={() => setShowAddForm((v) => !v)}>
            <Plus size={13} color={T.primary} />
            <Text style={[styles.accentBtnText, { color: T.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.subText, { color: T.muted }]}>
        Tap athlete name to view cover sheet.{' '}
        <Text style={{ color: T.accent, fontWeight: '700' }} onPress={() => setShowCsvHelp(true)}>CSV guide →</Text>
      </Text>

      {importError && (
        <View style={[styles.errorBanner, { backgroundColor: '#D9667A18', borderColor: '#D9667A44' }]}>
          <Text style={styles.errorText}>{importError}</Text>
          <TouchableOpacity onPress={() => setImportError(null)}><X size={14} color="#D9667A" /></TouchableOpacity>
        </View>
      )}

      {importPreview && (
        <ImportConfirm items={importPreview} onCancel={() => setImportPreview(null)} onConfirm={confirmImport} T={T} />
      )}

      {showAddForm && (
        <AthleteForm
          initial={{ ...EMPTY_FORM }}
          title="Add Athlete"
          T={T}
          onCancel={() => setShowAddForm(false)}
          onSave={(data) => { addAthlete(data); setShowAddForm(false); }}
        />
      )}

      {teamAthletes.length === 0 && !showAddForm && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: T.muted }]}>No athletes yet — add or import above.</Text>
        </View>
      )}

      <View style={styles.athleteList}>
        {teamAthletes.map((a) => {
          const att = attendanceStats(a.id, attendance, teamSchedule);
          const alert = getAttendanceAlert(att, thresholds);
          return (
            <AthleteCard
              key={a.id}
              athlete={a}
              alertLevel={alert}
              expanded={expandedId === a.id}
              onExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onOpenCover={() => setCoverAthleteId(a.id)}
              onPhoto={() => pickPhoto(a.id)}
              T={T}
            />
          );
        })}
      </View>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  headerBtns: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  listTitle: { fontSize: 15, fontWeight: '700' },
  subText: { fontSize: 11, marginBottom: 11 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  outlineBtnText: { fontWeight: '700', fontSize: 12 },
  accentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  accentBtnText: { fontWeight: '700', fontSize: 12 },
  iconBtn: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  errorText: { color: '#D9667A', fontSize: 13, flex: 1 },

  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  athleteList: { gap: 8 },
  athleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  athleteMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  alertDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  initialsText: { fontSize: 14, fontWeight: '800' },
  athleteName: { fontWeight: '700', fontSize: 14 },
  athleteSub: { fontSize: 11, marginTop: 1 },
  athleteActions: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  expandedSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, gap: 8 },

  contactGroup: { marginBottom: 4 },
  contactGroupTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  contactLabel: { fontSize: 13 },

  fieldLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  validationMsg: { color: '#D9667A', fontSize: 11, marginBottom: 4, marginTop: -4 },

  formTitle: { fontWeight: '800', fontSize: 15, marginBottom: 10 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 7 },
  row2: { flexDirection: 'row', gap: 7, marginBottom: 7 },
  youthToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  youthLabel: { fontSize: 13, fontWeight: '600' },

  parentBlock: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  parentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  parentTitle: { fontSize: 12, fontWeight: '700' },
  addParentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 10, justifyContent: 'center', marginBottom: 8 },
  addParentText: { fontSize: 13, fontWeight: '700' },

  formBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },

  importConfirm: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  importConfirmTitle: { fontWeight: '800', fontSize: 14, marginBottom: 8 },
  importList: { maxHeight: 140, marginBottom: 10 },
  importRow: { fontSize: 13, marginBottom: 3 },
  importActions: { flexDirection: 'row', gap: 8 },
  importBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 9, alignItems: 'center' },

  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  proBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  proBannerText: { fontSize: 13, fontWeight: '700' },

  coverTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontWeight: '700', fontSize: 13 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { fontWeight: '700', fontSize: 12 },
  coverPhoto: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, marginBottom: 6 },
  coverInitials: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  coverPhotoBtn: { fontSize: 11, fontWeight: '700', marginBottom: 5 },
  coverName: { fontSize: 21, fontWeight: '800', marginBottom: 2 },
  coverSub: { fontSize: 13 },
  coverGroup: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  attPills: { flexDirection: 'row', gap: 7, marginBottom: 8 },
  miniPill: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  miniPillValue: { fontWeight: '800', fontSize: 16 },
  miniPillLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 8, padding: 8 },
  alertText: { fontSize: 12, fontWeight: '700', flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catLabel: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  catAvgRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot10: { width: 10, height: 10, borderRadius: 5 },
  avgLabel: { fontSize: 12, fontWeight: '700' },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  skillName: { fontSize: 12 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 8, padding: 11, marginTop: 6 },
  deleteBtnText: { color: '#D9667A', fontWeight: '700', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  helpBody: { fontSize: 13, marginBottom: 10 },
  codeBlock: { borderWidth: 1, borderRadius: 8, padding: 12 },
  codeLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  codeLine: { fontSize: 11, marginBottom: 2 },
  helpTip: { fontSize: 12, marginTop: 10 },
  modalClose: { marginTop: 14, borderRadius: 8, padding: 11, alignItems: 'center' },
});
