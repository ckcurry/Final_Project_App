import { FC, useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Project = {
  name: string;
  milestones: string[];
};

const Projects: FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [milestones, setMilestones] = useState<string[]>(['']);
  const [status, setStatus] = useState('');
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({});
  const [showPostPrompt, setShowPostPrompt] = useState(false);
  const [footstones, setFootstones] = useState<Record<string, { name: string; plans?: string[]; updates?: string[] }[]>>({});
  const [openMilestone, setOpenMilestone] = useState<Record<string, boolean>>({});

  const loadProjects = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('home-projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned: Project[] = parsed
            .map((p) => {
              if (p && typeof p === 'object' && typeof p.name === 'string' && Array.isArray(p.milestones)) {
                return {
                  name: p.name,
                  milestones: p.milestones.filter((m: unknown) => typeof m === 'string'),
                };
              }
              return null;
            })
            .filter((p): p is Project => !!p);
          setProjects(cleaned);
        }
      }
    } catch {
      setStatus('Could not load projects.');
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const loadFootstones = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-footstones');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const cleaned: Record<string, { name: string; plans?: string[]; updates?: string[] }[]> = {};
            Object.entries(parsed).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                const arr = value
                  .map((v) => {
                    if (!v || typeof v !== 'object' || typeof (v as any).name !== 'string') return null;
                    return {
                      name: (v as any).name,
                      plans: Array.isArray((v as any).plans) ? (v as any).plans.filter((u: unknown) => typeof u === 'string') : [],
                      updates: Array.isArray((v as any).updates) ? (v as any).updates.filter((u: unknown) => typeof u === 'string') : [],
                    };
                  })
                  .filter(Boolean) as { name: string; plans?: string[]; updates?: string[] }[];
                cleaned[key] = arr;
              }
            });
            setFootstones(cleaned);
          }
        }
      } catch {
        // ignore
      }
    };
    loadFootstones();
    const sub = DeviceEventEmitter.addListener('footstones-updated', loadFootstones);
    return () => sub.remove();
  }, []);

  const persist = useCallback(
    async (next: Project[]) => {
      try {
        await AsyncStorage.setItem('home-projects', JSON.stringify(next));
        setProjects(next);
        setStatus('Saved.');
      } catch {
        setStatus('Save failed. Try again.');
      }
    },
    [],
  );

  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, '']);
  };

  const handleUpdateMilestone = (text: string, idx: number) => {
    setMilestones((prev) => {
      const next = [...prev];
      next[idx] = text;
      return next;
    });
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const cleanedMilestones = milestones.map((m) => m.trim()).filter(Boolean);
    if (!trimmedName) {
      setStatus('Enter a project name.');
      return;
    }
    const next: Project[] = [...projects, { name: trimmedName, milestones: cleanedMilestones }];
    persist(next);
    setName('');
    setMilestones(['']);
    setShowForm(false);
    if (cleanedMilestones.length > 0) {
      setShowPostPrompt(true);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.buttonText}>Make a Project</Text>
      </TouchableOpacity>
      <Text style={styles.cardLabel}>Projects</Text>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Project name"
            placeholderTextColor="#6B7280"
            style={[styles.input, styles.singleLine]}
          />
          <View style={styles.milestoneHeader}>
            <Text style={styles.fieldLabel}>Milestones</Text>
            <TouchableOpacity style={[styles.chip]} onPress={handleAddMilestone}>
              <Text style={styles.chipText}>+ Add Milestone</Text>
            </TouchableOpacity>
          </View>
          {milestones.map((milestone, idx) => (
            <View key={`milestone-${idx}`} style={styles.milestoneRow}>
              <TextInput
                value={milestone}
                onChangeText={(text) => handleUpdateMilestone(text, idx)}
                placeholder={`Milestone ${idx + 1}`}
                placeholderTextColor="#6B7280"
                style={[styles.input, styles.singleLine, styles.flex1]}
              />
              {milestones.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveMilestone(idx)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={[styles.row, styles.saveRow]}>
            <TouchableOpacity style={[styles.button, styles.primary, styles.largeButton]} onPress={handleSave}>
              <Text style={styles.buttonText}>Save Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showForm && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {projects.length === 0 ? (
            <Text style={styles.empty}>No projects yet.</Text>
          ) : (
            projects.map((project, idx) => {
              const isOpen = Boolean(openProjects[idx]);
              return (
                <TouchableOpacity
                  key={`${project.name}-${idx}`}
                  style={styles.projectCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    setOpenProjects((prev) => ({
                      ...prev,
                      [idx]: !prev[idx],
                    }))
                  }
                >
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.milestoneCount}>
                      {project.milestones.length} milestone{project.milestones.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {isOpen ? (
                    project.milestones.length === 0 ? (
                      <Text style={styles.empty}>No milestones yet.</Text>
                    ) : (
                      project.milestones.map((m, i) => {
                        const key = `${idx}-${i}`;
                        const isMilestoneOpen = Boolean(openMilestone[key]);
                        const list = Array.isArray(footstones[key]) ? footstones[key] : [];
                        return (
                          <View key={`${project.name}-m-${i}`} style={styles.milestoneBlock}>
                            <TouchableOpacity
                              style={styles.milestoneButton}
                              onPress={() =>
                                setOpenMilestone((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }))
                              }
                            >
                              <Text style={styles.milestoneButtonText}>{m}</Text>
                            </TouchableOpacity>
                            {isMilestoneOpen && (
                              <View style={styles.footstoneList}>
                                {list.length === 0 ? (
                                  <Text style={styles.tapHint}>No footstones yet.</Text>
                                ) : (
                                  list.map((f, fi) => {
                                    const label = typeof f?.name === 'string' ? f.name : 'Footstone';
                                    const plansCount = Array.isArray(f?.plans) ? f.plans.length : 0;
                                    const updatesCount = Array.isArray(f?.updates) ? f.updates.length : 0;
                                    return (
                                      <View key={`${key}-f-${fi}`} style={styles.footstoneMetaRow}>
                                        <Text style={styles.footstoneText}>• {label}</Text>
                                        <Text style={styles.footstoneMeta}>
                                          {plansCount} plan{plansCount === 1 ? '' : 's'} · {updatesCount} update{updatesCount === 1 ? '' : 's'}
                                        </Text>
                                      </View>
                                    );
                                  })
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )
                  ) : (
                    <Text style={styles.tapHint}>Tap to view milestones</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Modal
        visible={showPostPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardLabel}>Next steps</Text>
            <Text style={styles.status}>Milestone added. What would you like to do?</Text>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => setShowPostPrompt(false)}>
              <Text style={styles.buttonText}>Watch Last Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setShowPostPrompt(false)}>
              <Text style={[styles.buttonText, styles.secondaryText]}>Add Today&apos;s Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setShowPostPrompt(false)}>
              <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    gap: 8,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    gap: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveRow: {
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'center',
  },
  singleLine: {
    minHeight: undefined,
  },
  flex1: {
    flex: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#0F5132',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#111827',
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remove: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  list: {
    marginTop: 12,
    maxHeight: 280,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  milestoneBlock: {
    width: '100%',
  },
  projectCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  milestoneText: {
    color: '#4B5563',
    fontSize: 14,
  },
  milestoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: 6,
  },
  milestoneButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  footstoneList: {
    marginTop: 6,
    gap: 4,
  },
  footstoneText: {
    color: '#4B5563',
    fontSize: 13,
  },
  footstoneMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footstoneMeta: {
    color: '#6B7280',
    fontSize: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneCount: {
    color: '#6B7280',
    fontSize: 13,
  },
  tapHint: {
    color: '#6B7280',
    fontSize: 13,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  status: {
    marginTop: 8,
    color: '#4B5563',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
});

export default Projects;
