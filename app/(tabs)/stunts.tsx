import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Plus, X, ChevronLeft, ChevronRight, History, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAppStore, currentGroupRating } from '@/stores/appStore';
import { resolveTheme, ThemeColors } from '@/constants/theme';
import { SKILL_LIBRARY, BASE_POSITIONS, RATING_LEVELS, ratingColor, ratingInfo } from '@/constants/skills';
import ScreenShell from '@/components/ScreenShell';
import type { GroupLogEntry } from '@/types';

// ─── History view ─────────────────────────────────────────────────────────────

interface HistoryTarget {
  label: string;
  entries: GroupLogEntry[];
}

function HistoryView({ target, onBack, T }: { target: HistoryTarget; onBack: () => void; T: ThemeColors }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <ChevronLeft size={16} color={T.muted} />
        <Text style={[styles.backBtnText, { color: T.muted }]}>Back</Text>
      </TouchableOpacity>
      <Text style={[styles.historyTitle, { color: T.primary }]}>{target.label}</Text>
      <Text style={[styles.historySub, { color: T.muted }]}>Progress over all seasons</Text>
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
                style={[styles.historyEntry, !isLast && { borderBottomWidth: 1, borderBottomColor: T.bg, paddingBottom: 12, marginBottom: 12 }]}
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

// ─── Rating badge ─────────────────────────────────────────────────────────────

function GroupBadge({
  ratingKey, onPress, onHistory, T,
}: {
  ratingKey: string; onPress: () => void; onHistory: () => void; T: ThemeColors;
}) {
  const info = ratingInfo(ratingKey);
  const color = ratingColor(info.numeric);
  return (
    <View style={styles.badgeRow}>
      <TouchableOpacity onPress={onHistory} style={styles.historyBtn}>
        <History size={13} color={T.muted} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]} onPress={onPress}>
        <View style={[styles.dot10, { backgroundColor: color }]} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StuntsScreen() {
  const themeKey = useAppStore((s) => s.themeKey);
  const customTheme = useAppStore((s) => s.customTheme);
  const T = resolveTheme(themeKey, customTheme);

  const athletes = useAppStore((s) => s.athletes);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const seasons = useAppStore((s) => s.seasons);
  const season = useAppStore((s) => s.season);
  const isPro = useAppStore((s) => s.isPro);
  const groups = useAppStore((s) => s.groups);
  const groupLog = useAppStore((s) => s.groupLog);
  const pyramids = useAppStore((s) => s.pyramids);
  const addGroup = useAppStore((s) => s.addGroup);
  const removeGroup = useAppStore((s) => s.removeGroup);
  const addSlot = useAppStore((s) => s.addSlot);
  const removeSlot = useAppStore((s) => s.removeSlot);
  const setSlotAthlete = useAppStore((s) => s.setSlotAthlete);
  const cycleGroupRating = useAppStore((s) => s.cycleGroupRating);
  const addPyramid = useAppStore((s) => s.addPyramid);
  const removePyramid = useAppStore((s) => s.removePyramid);
  const addPyramidSection = useAppStore((s) => s.addPyramidSection);
  const removePyramidSection = useAppStore((s) => s.removePyramidSection);
  const setPyramidSectionName = useAppStore((s) => s.setPyramidSectionName);
  const addPyramidLayer = useAppStore((s) => s.addPyramidLayer);
  const removePyramidLayer = useAppStore((s) => s.removePyramidLayer);
  const setPyramidLayerLabel = useAppStore((s) => s.setPyramidLayerLabel);
  const addPyramidSlot = useAppStore((s) => s.addPyramidSlot);
  const removePyramidSlot = useAppStore((s) => s.removePyramidSlot);
  const setPyramidSlotAthlete = useAppStore((s) => s.setPyramidSlotAthlete);

  const teamAthletes = athletes.filter((a) => a.teamId === activeTeamId).sort((a, b) => a.name.localeCompare(b.name));
  const teamGroups = groups.filter((g) => g.teamId === activeTeamId);
  const teamPyramids = pyramids.filter((p) => p.teamId === activeTeamId);
  const seasonIdx = seasons.indexOf(season);

  const [subTab, setSubTab] = useState<'stunts' | 'pyramids'>('stunts');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [customPosInputs, setCustomPosInputs] = useState<Record<number, string>>({});
  const [showAddPyramid, setShowAddPyramid] = useState(false);
  const [newPyramidName, setNewPyramidName] = useState('');
  const [editingPyramidId, setEditingPyramidId] = useState<number | null>(null);
  const [expandedPyramidId, setExpandedPyramidId] = useState<number | null>(null);
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [pyramidCustomPos, setPyramidCustomPos] = useState<Record<string, string>>({});

  if (historyTarget) {
    return (
      <ScreenShell scrollable={false}>
        <HistoryView target={historyTarget} onBack={() => setHistoryTarget(null)} T={T} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      {/* Sub-tabs */}
      <View style={styles.subTabs}>
        {(['stunts', 'pyramids'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.subTab, { borderColor: T.border, backgroundColor: subTab === key ? T.primary : T.card }]}
            onPress={() => setSubTab(key)}
          >
            <Text style={[styles.subTabText, { color: subTab === key ? '#fff' : T.primary }]}>
              {key === 'stunts' ? 'Stunt Groups' : 'Pyramids'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── STUNT GROUPS ── */}
      {subTab === 'stunts' && (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.listTitle, { color: T.primary }]}>
              {teamGroups.length} Stunt Group{teamGroups.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={[styles.accentBtn, { backgroundColor: T.accent }]}
              onPress={() => setShowAddGroup((v) => !v)}
            >
              <Plus size={13} color={T.primary} />
              <Text style={[styles.accentBtnText, { color: T.primary }]}>New Group</Text>
            </TouchableOpacity>
          </View>

          {showAddGroup && (
            <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
              <TextInput
                placeholder="Group name"
                placeholderTextColor={T.muted}
                value={newGroupName}
                onChangeText={setNewGroupName}
                style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: T.primary }]}
                onPress={() => {
                  if (!newGroupName.trim()) return;
                  addGroup(newGroupName.trim());
                  setNewGroupName('');
                  setShowAddGroup(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Create Group</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ gap: 10 }}>
            {teamGroups.map((g) => {
              const isEditing = editingGroupId === g.id;
              return (
                <View key={g.id} style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
                  {/* Header */}
                  <View style={styles.groupHeader}>
                    <Text style={[styles.groupName, { color: T.primary }]}>{g.name}</Text>
                    <View style={styles.groupActions}>
                      <TouchableOpacity onPress={() => setEditingGroupId(isEditing ? null : g.id)}>
                        <Text style={styles.editLink}>{isEditing ? 'Done' : 'Edit'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeGroup(g.id)}>
                        <X size={14} color="#C4A2AE" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* View mode: member chips + skill ratings */}
                  {!isEditing && (
                    <>
                      <View style={styles.memberChips}>
                        {(g.slots ?? []).length === 0 ? (
                          <Text style={[styles.noMembers, { color: T.muted }]}>No members — tap Edit.</Text>
                        ) : (
                          g.slots.map((slot) => {
                            const a = teamAthletes.find((x) => x.id === slot.athleteId);
                            return (
                              <View key={slot.slotId} style={[styles.chip, { backgroundColor: T.bg, borderColor: T.border }]}>
                                <Text style={[styles.chipText, { color: a ? T.primary : T.muted }]}>
                                  <Text style={{ fontWeight: '700' }}>{slot.label}:</Text> {a ? a.name : '—'}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* Skill ratings */}
                      <View style={[styles.skillRatings, { borderTopColor: T.bg }]}>
                        {SKILL_LIBRARY.stunting.map((skill) => {
                          const rKey = currentGroupRating(groupLog, { groupId: g.id, skill, upToSeasonIdx: seasonIdx }, seasons);
                          return (
                            <View key={skill} style={styles.skillRow}>
                              <Text style={[styles.skillLabel, { color: T.primary }]}>{skill}</Text>
                              <GroupBadge
                                ratingKey={rKey}
                                T={T}
                                onPress={() => cycleGroupRating(g.id, skill)}
                                onHistory={() => setHistoryTarget({
                                  label: `${g.name} · ${skill}`,
                                  entries: groupLog
                                    .filter((e) => e.groupId === g.id && e.skill === skill)
                                    .sort((a, b) => a.date.localeCompare(b.date)),
                                })}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Edit mode: slot assignment */}
                  {isEditing && (
                    <View style={{ marginTop: 8 }}>
                      {g.slots.map((slot) => {
                        const takenIds = new Set(g.slots.filter((s) => s.slotId !== slot.slotId && s.athleteId).map((s) => s.athleteId!));
                        const available = teamAthletes.filter((a) => !takenIds.has(a.id));
                        return (
                          <View key={slot.slotId} style={styles.slotRow}>
                            <Text style={[styles.slotLabel, { color: T.muted }]}>{slot.label}</Text>
                            <View style={[styles.slotPickerWrap, { borderColor: T.border, backgroundColor: T.bg }]}>
                              <Picker
                                selectedValue={slot.athleteId ?? ''}
                                onValueChange={(v) => setSlotAthlete(g.id, slot.slotId, v ? Number(v) : null)}
                                style={{ color: T.primary, flex: 1 }}
                                dropdownIconColor={T.muted}
                              >
                                <Picker.Item label="— None —" value="" />
                                {available.map((a) => <Picker.Item key={a.id} label={a.name} value={a.id} />)}
                              </Picker>
                            </View>
                            <TouchableOpacity onPress={() => removeSlot(g.id, slot.slotId)}>
                              <X size={14} color="#C4A2AE" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}

                      {/* Add position buttons */}
                      <Text style={[styles.addPosLabel, { color: T.muted }]}>Add position slot:</Text>
                      <View style={styles.posButtons}>
                        {BASE_POSITIONS.map((pos) => (
                          <TouchableOpacity
                            key={pos}
                            style={[styles.posBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                            onPress={() => addSlot(g.id, pos)}
                          >
                            <Text style={[styles.posBtnText, { color: T.primary }]}>+ {pos}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Pro: custom position */}
                      {isPro ? (
                        <View style={styles.customPosRow}>
                          <TextInput
                            placeholder="Custom position (e.g. Spotter)"
                            placeholderTextColor={T.muted}
                            value={customPosInputs[g.id] ?? ''}
                            onChangeText={(v) => setCustomPosInputs((prev) => ({ ...prev, [g.id]: v }))}
                            style={[styles.customPosInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
                          />
                          <TouchableOpacity
                            style={[styles.customPosAdd, { backgroundColor: T.accent }]}
                            onPress={() => {
                              const val = (customPosInputs[g.id] ?? '').trim();
                              if (val) { addSlot(g.id, val); setCustomPosInputs((p) => ({ ...p, [g.id]: '' })); }
                            }}
                          >
                            <Text style={[styles.customPosAddText, { color: T.primary }]}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={[styles.proHint, { color: T.muted }]}>🔒 Pro: custom positions</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {teamGroups.length === 0 && (
              <Text style={[styles.emptyText, { color: T.muted }]}>No stunt groups yet.</Text>
            )}
          </View>
        </>
      )}

      {/* ── PYRAMIDS ── */}
      {subTab === 'pyramids' && (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.listTitle, { color: T.primary }]}>
              {teamPyramids.length} Pyramid{teamPyramids.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={[styles.accentBtn, { backgroundColor: T.accent }]}
              onPress={() => setShowAddPyramid((v) => !v)}
            >
              <Plus size={13} color={T.primary} />
              <Text style={[styles.accentBtnText, { color: T.primary }]}>New Pyramid</Text>
            </TouchableOpacity>
          </View>

          {showAddPyramid && (
            <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 10 }]}>
              <TextInput
                placeholder="Pyramid name"
                placeholderTextColor={T.muted}
                value={newPyramidName}
                onChangeText={setNewPyramidName}
                style={[styles.textInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: T.primary }]}
                onPress={() => {
                  if (!newPyramidName.trim()) return;
                  addPyramid(newPyramidName.trim());
                  setNewPyramidName('');
                  setShowAddPyramid(false);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Create Pyramid</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ gap: 10 }}>
            {teamPyramids.map((p) => {
              const isEditing = editingPyramidId === p.id;
              const isExpanded = expandedPyramidId === p.id || isEditing;
              const sortedSections = [...p.sections].sort((a, b) => a.sectionNumber - b.sectionNumber);
              const totalLayers = Math.max(0, ...p.sections.map((s) => s.layers.length));
              const assignedIds = new Set(p.sections.flatMap((sec) => sec.layers.flatMap((l) => l.slots.filter((sl) => sl.athleteId).map((sl) => sl.athleteId!))));

              return (
                <View key={p.id} style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
                  <View style={styles.groupHeader}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setExpandedPyramidId(isExpanded && !isEditing ? null : p.id)}>
                      <Text style={[styles.groupName, { color: T.primary }]}>{p.name}</Text>
                      <Text style={[styles.pyramidMeta, { color: T.muted }]}>
                        {p.sections.length} stunt{p.sections.length !== 1 ? 's' : ''} · {totalLayers} layer{totalLayers !== 1 ? 's' : ''} high
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.groupActions}>
                      <TouchableOpacity onPress={() => {
                        if (isEditing) { setEditingPyramidId(null); } else { setEditingPyramidId(p.id); setExpandedPyramidId(p.id); }
                      }}>
                        <Text style={styles.editLink}>{isEditing ? 'Done' : 'Edit'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removePyramid(p.id)}>
                        <X size={14} color="#C4A2AE" />
                      </TouchableOpacity>
                      {!isEditing && (
                        <TouchableOpacity onPress={() => setExpandedPyramidId(isExpanded ? null : p.id)}>
                          {isExpanded ? <ChevronUp size={15} color={T.muted} /> : <ChevronDown size={15} color={T.muted} />}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Edit mode: section/layer/slot builder */}
                  {isEditing && (
                    <ScrollView horizontal style={{ marginTop: 10 }} showsHorizontalScrollIndicator>
                      <View style={styles.sectionsRow}>
                        {sortedSections.map((sec) => {
                          const sortedLayers = [...sec.layers].sort((a, b) => a.layerNumber - b.layerNumber);
                          return (
                            <View key={sec.sectionId} style={[styles.sectionCol, { backgroundColor: T.bg, borderColor: T.border }]}>
                              {/* Section header */}
                              <View style={styles.sectionHeader}>
                                <TextInput
                                  value={sec.name}
                                  onChangeText={(v) => setPyramidSectionName(p.id, sec.sectionId, v)}
                                  style={[styles.sectionNameInput, { borderColor: T.border, backgroundColor: T.card, color: T.primary }]}
                                />
                                <TouchableOpacity onPress={() => removePyramidSection(p.id, sec.sectionId)}>
                                  <X size={13} color="#C4A2AE" />
                                </TouchableOpacity>
                              </View>

                              {/* Layers */}
                              {sortedLayers.map((layer) => (
                                <View key={layer.layerId} style={[styles.layerBox, { backgroundColor: T.card, borderColor: T.border }]}>
                                  <View style={styles.layerHeader}>
                                    <Text style={[styles.layerNum, { color: T.primary }]}>Layer {layer.layerNumber}</Text>
                                    <TouchableOpacity onPress={() => removePyramidLayer(p.id, sec.sectionId, layer.layerId)}>
                                      <X size={12} color="#C4A2AE" />
                                    </TouchableOpacity>
                                  </View>
                                  <TextInput
                                    placeholder="Height (Prep, Top...)"
                                    placeholderTextColor={T.muted}
                                    value={layer.heightLabel}
                                    onChangeText={(v) => setPyramidLayerLabel(p.id, sec.sectionId, layer.layerId, v)}
                                    style={[styles.heightInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
                                  />
                                  {layer.slots.map((slot) => {
                                    const takenElsewhere = new Set([...assignedIds].filter((id) => id !== slot.athleteId));
                                    const available = teamAthletes.filter((a) => !takenElsewhere.has(a.id));
                                    return (
                                      <View key={slot.slotId} style={styles.pyramidSlotRow}>
                                        <Text style={[styles.pyramidSlotLabel, { color: T.muted }]}>{slot.label}</Text>
                                        <View style={[styles.pyramidSlotPicker, { borderColor: T.border, backgroundColor: T.bg }]}>
                                          <Picker
                                            selectedValue={slot.athleteId ?? ''}
                                            onValueChange={(v) => setPyramidSlotAthlete(p.id, sec.sectionId, layer.layerId, slot.slotId, v ? Number(v) : null)}
                                            style={{ color: T.primary }}
                                            dropdownIconColor={T.muted}
                                          >
                                            <Picker.Item label="—" value="" />
                                            {available.map((a) => <Picker.Item key={a.id} label={a.name} value={a.id} />)}
                                          </Picker>
                                        </View>
                                        <TouchableOpacity onPress={() => removePyramidSlot(p.id, sec.sectionId, layer.layerId, slot.slotId)}>
                                          <X size={11} color="#C4A2AE" />
                                        </TouchableOpacity>
                                      </View>
                                    );
                                  })}

                                  {/* Add slot buttons */}
                                  <View style={styles.miniPosButtons}>
                                    {BASE_POSITIONS.map((pos) => (
                                      <TouchableOpacity
                                        key={pos}
                                        style={[styles.miniPosBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                                        onPress={() => addPyramidSlot(p.id, sec.sectionId, layer.layerId, pos)}
                                      >
                                        <Text style={[styles.miniPosBtnText, { color: T.primary }]}>+{pos}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>

                                  {/* Pro: custom slot position */}
                                  {isPro && (
                                    <View style={styles.customPosRow}>
                                      <TextInput
                                        placeholder="Custom…"
                                        placeholderTextColor={T.muted}
                                        value={pyramidCustomPos[`${p.id}-${sec.sectionId}-${layer.layerId}`] ?? ''}
                                        onChangeText={(v) => setPyramidCustomPos((prev) => ({ ...prev, [`${p.id}-${sec.sectionId}-${layer.layerId}`]: v }))}
                                        style={[styles.customPosInput, { borderColor: T.border, backgroundColor: T.bg, color: T.primary }]}
                                      />
                                      <TouchableOpacity
                                        style={[styles.customPosAdd, { backgroundColor: T.accent }]}
                                        onPress={() => {
                                          const key = `${p.id}-${sec.sectionId}-${layer.layerId}`;
                                          const val = (pyramidCustomPos[key] ?? '').trim();
                                          if (val) { addPyramidSlot(p.id, sec.sectionId, layer.layerId, val); setPyramidCustomPos((prev) => ({ ...prev, [key]: '' })); }
                                        }}
                                      >
                                        <Text style={[styles.customPosAddText, { color: T.primary }]}>Add</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              ))}

                              <TouchableOpacity
                                style={[styles.addLayerBtn, { borderColor: T.border }]}
                                onPress={() => addPyramidLayer(p.id, sec.sectionId)}
                              >
                                <Plus size={11} color={T.muted} />
                                <Text style={[styles.addLayerText, { color: T.muted }]}>Layer</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}

                        {/* Add stunt column */}
                        <TouchableOpacity
                          style={[styles.addSectionBtn, { borderColor: T.accent }]}
                          onPress={() => addPyramidSection(p.id)}
                        >
                          <Plus size={16} color={T.accent} />
                          <Text style={[styles.addSectionText, { color: T.accent }]}>Add Stunt</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  )}

                  {/* View mode: list (top-down layers per section) */}
                  {!isEditing && isExpanded && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      {sortedSections.length === 0 ? (
                        <Text style={[styles.emptyText, { color: T.muted }]}>No stunts yet — tap Edit.</Text>
                      ) : sortedSections.map((sec) => {
                        const topDown = [...sec.layers].sort((a, b) => b.layerNumber - a.layerNumber);
                        return (
                          <View key={sec.sectionId}>
                            <Text style={[styles.sectionName, { color: T.accent }]}>{sec.name}</Text>
                            {topDown.length === 0 ? (
                              <Text style={[styles.noLayersText, { color: T.muted }]}>No layers — tap Edit.</Text>
                            ) : topDown.map((layer) => (
                              <View key={layer.layerId} style={[styles.layerListRow, { backgroundColor: T.bg }]}>
                                <Text style={[styles.layerListMeta, { color: T.primary }]}>
                                  <Text style={{ fontWeight: '800' }}>
                                    Layer {layer.layerNumber}{layer.heightLabel ? ` · ${layer.heightLabel}` : ''}:
                                  </Text>{' '}
                                  {layer.slots.length
                                    ? layer.slots.map((sl) => {
                                        const a = teamAthletes.find((x) => x.id === sl.athleteId);
                                        return `${sl.label}: ${a ? a.name : '—'}`;
                                      }).join(' · ')
                                    : <Text style={{ color: T.muted }}>No athletes assigned</Text>}
                                </Text>
                              </View>
                            ))}
                          </View>
                        );
                      })}

                      {!isPro && (
                        <Text style={[styles.proHint, { color: T.muted }]}>🔒 Pro: drag-and-drop visual builder</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {teamPyramids.length === 0 && (
              <Text style={[styles.emptyText, { color: T.muted }]}>No pyramids yet.</Text>
            )}
          </View>
        </>
      )}
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  subTabs: { flexDirection: 'row', gap: 5, marginBottom: 13 },
  subTab: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  subTabText: { fontWeight: '700', fontSize: 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  listTitle: { fontSize: 15, fontWeight: '700' },
  accentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  accentBtnText: { fontWeight: '700', fontSize: 12 },

  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 7 },
  saveBtn: { borderRadius: 8, padding: 10, alignItems: 'center' },

  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupName: { fontWeight: '700', fontSize: 15 },
  pyramidMeta: { fontSize: 11, marginTop: 1 },
  groupActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editLink: { color: '#5B9BD5', fontWeight: '700', fontSize: 12 },

  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  chip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11 },
  noMembers: { fontSize: 12 },

  skillRatings: { marginTop: 9, paddingTop: 9, borderTopWidth: 1, gap: 5 },
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillLabel: { fontSize: 13, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  historyBtn: { padding: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dot10: { width: 10, height: 10, borderRadius: 5 },
  dot9: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },

  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  slotLabel: { fontSize: 11, fontWeight: '700', width: 72, flexShrink: 0 },
  slotPickerWrap: { flex: 1, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },

  addPosLabel: { fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 5 },
  posButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  posBtn: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  posBtnText: { fontSize: 11, fontWeight: '700' },

  customPosRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  customPosInput: { flex: 1, borderWidth: 1, borderRadius: 7, padding: 7, fontSize: 12 },
  customPosAdd: { borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7 },
  customPosAddText: { fontWeight: '700', fontSize: 12 },
  proHint: { fontSize: 11, marginTop: 6 },

  // Pyramids
  sectionsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  sectionCol: { width: 170, borderWidth: 1, borderRadius: 10, padding: 9, flexShrink: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  sectionNameInput: { flex: 1, borderWidth: 1, borderRadius: 6, padding: 5, fontSize: 12, fontWeight: '800' },
  layerBox: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 6 },
  layerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  layerNum: { fontSize: 11, fontWeight: '800' },
  heightInput: { borderWidth: 1, borderRadius: 6, padding: 5, fontSize: 11, marginBottom: 6 },
  pyramidSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  pyramidSlotLabel: { fontSize: 10, fontWeight: '700', width: 50, flexShrink: 0 },
  pyramidSlotPicker: { flex: 1, borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  miniPosButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 },
  miniPosBtn: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  miniPosBtnText: { fontSize: 9, fontWeight: '700' },
  addLayerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 7, paddingVertical: 6 },
  addLayerText: { fontWeight: '700', fontSize: 11 },
  addSectionBtn: { width: 90, flexShrink: 0, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 16 },
  addSectionText: { fontWeight: '700', fontSize: 11 },

  sectionName: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  noLayersText: { fontSize: 12 },
  layerListRow: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9, marginBottom: 4 },
  layerListMeta: { fontSize: 12 },

  // History
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

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
