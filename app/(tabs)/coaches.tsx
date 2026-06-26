import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet,
  Modal, Linking, Alert,
} from 'react-native';
import { Plus, Pencil, Trash2, Phone, Mail, ChevronDown, ChevronUp, X, Shield, AlertCircle } from 'lucide-react-native';
import { useAppStore } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import ScreenShell from '@/components/ScreenShell';
import type { Coach, CoachPermission, CoachTeamAssignment, EmergencyContact } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ['Head Coach', 'Assistant Coach', 'Volunteer', 'Choreographer', 'Strength Coach'];
const PERMISSION_LABELS: Record<CoachPermission, string> = {
  admin: 'Admin – full access',
  editor: 'Editor – add & edit',
  viewer: 'Viewer – read only',
};
const PERMISSION_COLORS: Record<CoachPermission, string> = {
  admin: '#D9667A',
  editor: '#E8A33D',
  viewer: '#5B9BD5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initForm(coach?: Coach): Partial<Coach> {
  return {
    name: coach?.name ?? '',
    role: coach?.role ?? 'Assistant Coach',
    email: coach?.email ?? '',
    phone: coach?.phone ?? '',
    permissions: coach?.permissions ?? 'viewer',
    teamAssignments: coach?.teamAssignments ?? [],
    emergencyContacts: coach?.emergencyContacts ?? [],
  };
}

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Partner', 'Friend', 'Other'];

// ─── Small components ─────────────────────────────────────────────────────────

function RolePill({ role, T }: { role: string; T: ThemeColors }) {
  const isHead = role.toLowerCase().includes('head');
  const color = isHead ? T.primary : T.accent;
  return (
    <View style={[pill.wrap, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <Text style={[pill.text, { color }]}>{role}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
});

function PermBadge({ level, T }: { level: CoachPermission; T: ThemeColors }) {
  const color = PERMISSION_COLORS[level];
  return (
    <View style={[permBadge.wrap, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <Shield size={10} color={color} />
      <Text style={[permBadge.text, { color }]}>{level}</Text>
    </View>
  );
}
const permBadge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: '700' },
});

// ─── Coach Card ───────────────────────────────────────────────────────────────

function CoachCard({
  coach, T,
  onEdit, onDelete,
}: { coach: Coach; T: ThemeColors; onEdit: () => void; onDelete: () => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const currentAssignments = coach.teamAssignments;

  return (
    <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={[styles.coachName, { color: T.primary }]}>{coach.name}</Text>
          <View style={styles.badgeRow}>
            <RolePill role={coach.role} T={T} />
            <PermBadge level={coach.permissions} T={T} />
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} style={[styles.iconBtn, { backgroundColor: `${T.primary}12` }]}>
            <Pencil size={14} color={T.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { backgroundColor: '#D9667A18' }]}>
            <Trash2 size={14} color="#D9667A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact */}
      {(coach.email || coach.phone) ? (
        <View style={styles.contactRow}>
          {coach.email ? (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${coach.email}`)}>
              <Mail size={13} color={T.muted} />
              <Text style={[styles.contactText, { color: T.muted }]} numberOfLines={1}>{coach.email}</Text>
            </TouchableOpacity>
          ) : null}
          {coach.phone ? (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${coach.phone}`)}>
              <Phone size={13} color={T.muted} />
              <Text style={[styles.contactText, { color: T.muted }]}>{coach.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Emergency contacts */}
      {(coach.emergencyContacts ?? []).length > 0 && (
        <View style={[styles.emergencySection, { borderTopColor: T.border }]}>
          <View style={styles.emergencySectionHeader}>
            <AlertCircle size={11} color="#D9667A" />
            <Text style={[styles.emergencySectionLabel, { color: T.muted }]}>EMERGENCY CONTACT{(coach.emergencyContacts!.length > 1 ? 'S' : '')}</Text>
          </View>
          {coach.emergencyContacts!.map((ec, i) => (
            <View key={i} style={styles.emergencyRow}>
              <Text style={[styles.emergencyName, { color: T.primary }]}>{ec.name}</Text>
              <Text style={[styles.emergencyRel, { color: T.muted }]}>{ec.relationship}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${ec.phone}`)}>
                <Text style={[styles.emergencyPhone, { color: T.accent }]}>{ec.phone}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Team assignments */}
      {currentAssignments.length > 0 && (
        <View style={[styles.assignSection, { borderTopColor: T.border }]}>
          {currentAssignments.slice(0, showHistory ? undefined : 1).map((a, i) => (
            <View key={i} style={styles.assignRow}>
              <View style={[styles.assignDot, { backgroundColor: i === 0 ? T.accent : T.border }]} />
              <Text style={[styles.assignText, { color: i === 0 ? T.primary : T.muted }]}>
                {a.teamName} · {a.season}
              </Text>
              <Text style={[styles.assignRole, { color: T.muted }]}>{a.role}</Text>
            </View>
          ))}
          {currentAssignments.length > 1 && (
            <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory((v) => !v)}>
              {showHistory
                ? <ChevronUp size={12} color={T.muted} />
                : <ChevronDown size={12} color={T.muted} />}
              <Text style={[styles.historyToggleText, { color: T.muted }]}>
                {showHistory ? 'Hide' : `+${currentAssignments.length - 1} past`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Coach Form Modal ─────────────────────────────────────────────────────────

function CoachFormModal({
  visible, initial, teams, seasons, onSave, onClose, T,
}: {
  visible: boolean;
  initial: Partial<Coach>;
  teams: Array<{ id: number; name: string }>;
  seasons: string[];
  onSave: (data: Partial<Omit<Coach, 'id'>>) => void;
  onClose: () => void;
  T: ThemeColors;
}) {
  const [form, setForm] = useState<Partial<Coach>>(initial);
  const [showRoles, setShowRoles] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<number>(teams[0]?.id ?? 0);
  const [assignSeason, setAssignSeason] = useState(seasons[seasons.length - 1] ?? '');
  const [assignRole, setAssignRole] = useState(initial.role ?? 'Assistant Coach');

  // Emergency contact entry state
  const [ecName, setEcName] = useState('');
  const [ecRel, setEcRel] = useState('Spouse');
  const [ecPhone, setEcPhone] = useState('');
  const [ecEmail, setEcEmail] = useState('');
  const [showRelPicker, setShowRelPicker] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setForm(initial);
      setAssignRole(initial.role ?? 'Assistant Coach');
      setEcName(''); setEcRel('Spouse'); setEcPhone(''); setEcEmail('');
    }
  }, [visible]);

  const set = (key: keyof Coach, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const addAssignment = () => {
    const team = teams.find((t) => t.id === assignTeamId);
    if (!team) return;
    const existing = (form.teamAssignments ?? []).filter(
      (a) => !(a.teamId === assignTeamId && a.season === assignSeason),
    );
    const newAssignment: CoachTeamAssignment = { teamId: assignTeamId, teamName: team.name, season: assignSeason, role: assignRole };
    setForm((f) => ({ ...f, teamAssignments: [newAssignment, ...existing] }));
  };

  const removeAssignment = (idx: number) => {
    setForm((f) => ({ ...f, teamAssignments: (f.teamAssignments ?? []).filter((_, i) => i !== idx) }));
  };

  const addEmergencyContact = () => {
    if (!ecName.trim() || !ecPhone.trim()) return;
    const ec: EmergencyContact = { name: ecName.trim(), relationship: ecRel, phone: ecPhone.trim(), ...(ecEmail.trim() ? { email: ecEmail.trim() } : {}) };
    setForm((f) => ({ ...f, emergencyContacts: [...(f.emergencyContacts ?? []), ec] }));
    setEcName(''); setEcPhone(''); setEcEmail('');
  };

  const removeEmergencyContact = (idx: number) => {
    setForm((f) => ({ ...f, emergencyContacts: (f.emergencyContacts ?? []).filter((_, i) => i !== idx) }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={[modal.sheet, { backgroundColor: T.card }]}>
          <View style={modal.header}>
            <Text style={[modal.title, { color: T.primary }]}>
              {initial.name ? 'Edit Coach' : 'Add Coach'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={[modal.label, { color: T.muted }]}>NAME</Text>
            <TextInput
              style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Coach name"
              placeholderTextColor={T.muted}
            />

            {/* Role */}
            <Text style={[modal.label, { color: T.muted }]}>ROLE</Text>
            <TouchableOpacity
              style={[modal.picker, { borderColor: T.border, backgroundColor: T.bg }]}
              onPress={() => setShowRoles((v) => !v)}
            >
              <Text style={{ color: T.primary, flex: 1 }}>{form.role || 'Select role'}</Text>
              <ChevronDown size={14} color={T.muted} />
            </TouchableOpacity>
            {showRoles && (
              <View style={[modal.dropdown, { borderColor: T.border, backgroundColor: T.card }]}>
                {ROLE_OPTIONS.map((r) => (
                  <TouchableOpacity key={r} style={modal.dropItem} onPress={() => { set('role', r); setShowRoles(false); }}>
                    <Text style={[modal.dropText, { color: form.role === r ? T.accent : T.primary, fontWeight: form.role === r ? '800' : '600' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Email / Phone */}
            <View style={modal.row}>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: T.muted }]}>EMAIL</Text>
                <TextInput
                  style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
                  value={form.email}
                  onChangeText={(v) => set('email', v)}
                  placeholder="email@school.edu"
                  placeholderTextColor={T.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: T.muted }]}>PHONE</Text>
                <TextInput
                  style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.bg }]}
                  value={form.phone}
                  onChangeText={(v) => set('phone', v)}
                  placeholder="555-000-0000"
                  placeholderTextColor={T.muted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Permissions */}
            <Text style={[modal.label, { color: T.muted }]}>PERMISSIONS</Text>
            <TouchableOpacity
              style={[modal.picker, { borderColor: T.border, backgroundColor: T.bg }]}
              onPress={() => setShowPerms((v) => !v)}
            >
              <Shield size={13} color={PERMISSION_COLORS[form.permissions ?? 'viewer']} />
              <Text style={[{ flex: 1, marginLeft: 6, color: PERMISSION_COLORS[form.permissions ?? 'viewer'], fontWeight: '700' }]}>
                {PERMISSION_LABELS[form.permissions ?? 'viewer']}
              </Text>
              <ChevronDown size={14} color={T.muted} />
            </TouchableOpacity>
            {showPerms && (
              <View style={[modal.dropdown, { borderColor: T.border, backgroundColor: T.card }]}>
                {(Object.keys(PERMISSION_LABELS) as CoachPermission[]).map((p) => (
                  <TouchableOpacity key={p} style={modal.dropItem} onPress={() => { set('permissions', p); setShowPerms(false); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Shield size={12} color={PERMISSION_COLORS[p]} />
                      <Text style={[modal.dropText, { color: PERMISSION_COLORS[p], fontWeight: form.permissions === p ? '800' : '600' }]}>
                        {PERMISSION_LABELS[p]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Emergency Contact (optional) */}
            <View style={[modal.sectionHeader, { marginTop: 14 }]}>
              <AlertCircle size={12} color="#D9667A" />
              <Text style={[modal.label, { color: T.muted, marginTop: 0, marginBottom: 0 }]}>EMERGENCY CONTACT</Text>
              <Text style={[modal.optionalTag, { color: T.muted }]}>optional</Text>
            </View>
            <View style={[modal.ecBox, { borderColor: T.border, backgroundColor: T.bg }]}>
              <View style={modal.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>NAME</Text>
                  <TextInput
                    style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.card }]}
                    value={ecName}
                    onChangeText={setEcName}
                    placeholder="Full name"
                    placeholderTextColor={T.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>RELATIONSHIP</Text>
                  <TouchableOpacity
                    style={[modal.picker, { borderColor: T.border, backgroundColor: T.card, paddingVertical: 9 }]}
                    onPress={() => setShowRelPicker((v) => !v)}
                  >
                    <Text style={{ color: T.primary, flex: 1, fontSize: 13 }}>{ecRel}</Text>
                    <ChevronDown size={13} color={T.muted} />
                  </TouchableOpacity>
                  {showRelPicker && (
                    <View style={[modal.dropdown, { borderColor: T.border, backgroundColor: T.card }]}>
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <TouchableOpacity key={r} style={modal.dropItem} onPress={() => { setEcRel(r); setShowRelPicker(false); }}>
                          <Text style={[modal.dropText, { color: ecRel === r ? T.accent : T.primary, fontWeight: ecRel === r ? '800' : '600' }]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <View style={modal.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>PHONE</Text>
                  <TextInput
                    style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.card }]}
                    value={ecPhone}
                    onChangeText={setEcPhone}
                    placeholder="555-000-0000"
                    placeholderTextColor={T.muted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>EMAIL (opt.)</Text>
                  <TextInput
                    style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.card }]}
                    value={ecEmail}
                    onChangeText={setEcEmail}
                    placeholder="optional"
                    placeholderTextColor={T.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[modal.addAssignBtn, { backgroundColor: ecName.trim() && ecPhone.trim() ? '#D9667A' : T.border }]}
                onPress={addEmergencyContact}
              >
                <Plus size={13} color={ecName.trim() && ecPhone.trim() ? '#fff' : T.muted} />
                <Text style={[modal.addAssignText, { color: ecName.trim() && ecPhone.trim() ? '#fff' : T.muted }]}>Add Contact</Text>
              </TouchableOpacity>
            </View>

            {/* Added emergency contacts list */}
            {(form.emergencyContacts ?? []).length > 0 && (
              <View style={{ gap: 4, marginBottom: 10 }}>
                {(form.emergencyContacts ?? []).map((ec, i) => (
                  <View key={i} style={[modal.assignChip, { backgroundColor: '#D9667A0F', borderColor: '#D9667A30' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[modal.assignChipText, { color: '#D9667A' }]}>{ec.name} · {ec.relationship}</Text>
                      <Text style={[modal.assignChipText, { color: '#D9667A99', fontWeight: '500', fontSize: 11 }]}>{ec.phone}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeEmergencyContact(i)}>
                      <X size={12} color="#D9667A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Team assignment */}
            <Text style={[modal.label, { color: T.muted }]}>ASSIGN TO TEAM / SEASON</Text>
            <View style={[modal.assignBox, { borderColor: T.border, backgroundColor: T.bg }]}>
              <View style={modal.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>Team</Text>
                  {teams.map((t) => (
                    <TouchableOpacity key={t.id} style={[modal.miniTab, assignTeamId === t.id && { backgroundColor: `${T.primary}18` }]}
                      onPress={() => setAssignTeamId(t.id)}>
                      <Text style={[modal.miniTabText, { color: assignTeamId === t.id ? T.primary : T.muted }]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modal.sublabel, { color: T.muted }]}>Season</Text>
                  {seasons.slice().reverse().slice(0, 4).map((s) => (
                    <TouchableOpacity key={s} style={[modal.miniTab, assignSeason === s && { backgroundColor: `${T.primary}18` }]}
                      onPress={() => setAssignSeason(s)}>
                      <Text style={[modal.miniTabText, { color: assignSeason === s ? T.primary : T.muted }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[modal.assignRoleRow, { borderTopColor: T.border }]}>
                <Text style={[modal.sublabel, { color: T.muted }]}>Role on this team</Text>
                <TextInput
                  style={[modal.input, { color: T.primary, borderColor: T.border, backgroundColor: T.card }]}
                  value={assignRole}
                  onChangeText={setAssignRole}
                  placeholder="e.g. Head Coach"
                  placeholderTextColor={T.muted}
                />
              </View>
              <TouchableOpacity style={[modal.addAssignBtn, { backgroundColor: T.primary }]} onPress={addAssignment}>
                <Plus size={13} color="#fff" />
                <Text style={modal.addAssignText}>Add Assignment</Text>
              </TouchableOpacity>
            </View>

            {/* Current assignments list */}
            {(form.teamAssignments ?? []).length > 0 && (
              <View style={{ gap: 4, marginBottom: 14 }}>
                {(form.teamAssignments ?? []).map((a, i) => (
                  <View key={i} style={[modal.assignChip, { backgroundColor: `${T.primary}10`, borderColor: T.border }]}>
                    <Text style={[modal.assignChipText, { color: T.primary }]}>
                      {a.teamName} · {a.season} ({a.role})
                    </Text>
                    <TouchableOpacity onPress={() => removeAssignment(i)}>
                      <X size={12} color={T.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[modal.saveBtn, { backgroundColor: T.primary }]}
              onPress={() => { if (form.name?.trim()) onSave(form); }}
            >
              <Text style={modal.saveBtnText}>Save Coach</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5, marginTop: 12 },
  sublabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 4 },
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  dropdown: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  dropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  dropText: { fontSize: 14 },
  assignBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  assignRoleRow: { borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
  miniTab: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 3 },
  miniTabText: { fontSize: 12, fontWeight: '600' },
  addAssignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 9, marginTop: 8 },
  addAssignText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  assignChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  assignChipText: { fontSize: 12, fontWeight: '600', flex: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  optionalTag: { fontSize: 9, fontStyle: 'italic', marginLeft: 2 },
  ecBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const FREE_COACH_LIMIT = 2;

export default function CoachesScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const coaches = useAppStore((s) => s.coaches);
  const addCoach = useAppStore((s) => s.addCoach);
  const updateCoach = useAppStore((s) => s.updateCoach);
  const removeCoach = useAppStore((s) => s.removeCoach);
  const isPro = useAppStore((s) => s.isPro);
  const teams = useAppStore((s) => s.teams);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);

  const [editing, setEditing] = useState<Coach | null>(null);
  const [adding, setAdding] = useState(false);
  const [filterSeason, setFilterSeason] = useState<string | 'all'>('all');

  const atLimit = !isPro && coaches.length >= FREE_COACH_LIMIT;

  const visibleCoaches = filterSeason === 'all'
    ? coaches
    : coaches.filter((c) => c.teamAssignments.some((a) => a.season === filterSeason));

  const handleAdd = (data: Partial<Omit<Coach, 'id'>>) => {
    addCoach(data);
    setAdding(false);
  };

  const handleEdit = (data: Partial<Omit<Coach, 'id'>>) => {
    if (editing) updateCoach(editing.id, data);
    setEditing(null);
  };

  const confirmDelete = (coach: Coach) => {
    Alert.alert(
      'Remove Coach',
      `Remove ${coach.name} from your staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeCoach(coach.id) },
      ],
    );
  };

  return (
    <ScreenShell>
      {/* Header row */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: T.primary }]}>Coaching Staff</Text>
          <Text style={[styles.pageSub, { color: T.muted }]}>
            {coaches.length} coach{coaches.length !== 1 ? 'es' : ''}
            {!isPro ? `  ·  ${coaches.length}/${FREE_COACH_LIMIT} free` : '  ·  Pro unlimited'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: atLimit ? T.border : T.primary }]}
          onPress={() => {
            if (atLimit) {
              Alert.alert('Upgrade to Pro', 'Free plan allows up to 2 coaches. Upgrade to add unlimited staff members.');
              return;
            }
            setAdding(true);
          }}
        >
          <Plus size={16} color={atLimit ? T.muted : '#fff'} />
          <Text style={[styles.addBtnText, { color: atLimit ? T.muted : '#fff' }]}>Add Coach</Text>
        </TouchableOpacity>
      </View>

      {/* Season filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.filterRow}>
          {(['all', ...seasons.slice().reverse()]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, { borderColor: filterSeason === s ? T.primary : T.border, backgroundColor: filterSeason === s ? `${T.primary}12` : T.card }]}
              onPress={() => setFilterSeason(s as string)}
            >
              <Text style={[styles.filterChipText, { color: filterSeason === s ? T.primary : T.muted }]}>
                {s === 'all' ? 'All Seasons' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Free limit banner */}
      {atLimit && (
        <View style={[styles.limitBanner, { backgroundColor: `${T.accent}15`, borderColor: `${T.accent}40` }]}>
          <Text style={[styles.limitText, { color: T.accent }]}>
            🔒 Free plan: 2 coaches max. Upgrade to Pro for unlimited staff.
          </Text>
        </View>
      )}

      {/* Coach cards */}
      {visibleCoaches.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.emptyTitle, { color: T.primary }]}>No coaches yet</Text>
          <Text style={[styles.emptySub, { color: T.muted }]}>
            {filterSeason === 'all'
              ? 'Tap + Add Coach to build your staff roster.'
              : `No coaches assigned for ${filterSeason}.`}
          </Text>
        </View>
      ) : (
        <View style={styles.cardList}>
          {visibleCoaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              T={T}
              onEdit={() => setEditing(coach)}
              onDelete={() => confirmDelete(coach)}
            />
          ))}
        </View>
      )}

      {/* Permission legend */}
      <View style={[styles.legend, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[styles.legendTitle, { color: T.muted }]}>PERMISSION LEVELS</Text>
        {(Object.keys(PERMISSION_LABELS) as CoachPermission[]).map((p) => (
          <View key={p} style={styles.legendRow}>
            <Shield size={11} color={PERMISSION_COLORS[p]} />
            <Text style={[styles.legendText, { color: T.muted }]}>
              <Text style={{ fontWeight: '700', color: PERMISSION_COLORS[p] }}>{p.toUpperCase()}</Text>
              {' — '}{PERMISSION_LABELS[p].split(' – ')[1]}
            </Text>
          </View>
        ))}
      </View>

      {/* Add form */}
      <CoachFormModal
        visible={adding}
        initial={initForm()}
        teams={teams}
        seasons={seasons}
        onSave={handleAdd}
        onClose={() => setAdding(false)}
        T={T}
      />

      {/* Edit form */}
      <CoachFormModal
        visible={!!editing}
        initial={initForm(editing ?? undefined)}
        teams={teams}
        seasons={seasons}
        onSave={handleEdit}
        onClose={() => setEditing(null)}
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  addBtnText: { fontWeight: '800', fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  filterChipText: { fontSize: 11, fontWeight: '700' },

  limitBanner: { borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 12 },
  limitText: { fontSize: 13, fontWeight: '700' },

  cardList: { gap: 10, marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 13 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1, gap: 5 },
  coachName: { fontSize: 15, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  contactRow: { gap: 5, marginBottom: 8 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontSize: 12, flex: 1 },

  emergencySection: { borderTopWidth: 1, paddingTop: 8, marginTop: 6, gap: 5 },
  emergencySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  emergencySectionLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  emergencyName: { fontSize: 12, fontWeight: '700' },
  emergencyRel: { fontSize: 11 },
  emergencyPhone: { fontSize: 12, fontWeight: '600' },

  assignSection: { borderTopWidth: 1, paddingTop: 8, gap: 5 },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  assignDot: { width: 6, height: 6, borderRadius: 3 },
  assignText: { fontSize: 12, fontWeight: '600', flex: 1 },
  assignRole: { fontSize: 11 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  historyToggleText: { fontSize: 11, fontWeight: '600' },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 28, alignItems: 'center', gap: 6 },
  emptyTitle: { fontWeight: '800', fontSize: 14 },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  legend: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 6, gap: 6 },
  legendTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11 },
});
