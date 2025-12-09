import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import Calendar from '../Calendar';
import AddTask from '../AddTask';

type Props = {
  onGoTasks?: () => void;
  onGoProjects?: () => void;
};

type Section = 'home' | 'tasks' | 'projects';
type Task = {
  name: string;
  dueDate: string;
  recurrence: string;
  category: string;
};
type Project = {
  name: string;
  milestones: string[];
};
type FootstoneEntry = {
  name: string;
  plans: string[];
  updates: string[];
};
type NoteEntry = {
  text?: string;
  voice?: string;
  timestamp: string;
};

const Home: FC<Props> = ({ onGoTasks, onGoProjects }) => {
  const [section, setSection] = useState<Section>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [activeIndices, setActiveIndices] = useState<number[]>([-1, -1, -1]);
  const [slotNoteList, setSlotNoteList] = useState<NoteEntry[][]>([[], [], []]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number>(-1);
  const [activeProjectMilestone, setActiveProjectMilestone] = useState<number>(-1);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [pendingProjectIndex, setPendingProjectIndex] = useState<number | null>(null);
  const [noteModalSlot, setNoteModalSlot] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [planVideos, setPlanVideos] = useState<Record<string, string>>({});
  const [showFootstoneModal, setShowFootstoneModal] = useState(false);
  const [footstoneDraft, setFootstoneDraft] = useState('');
  const [footstones, setFootstones] = useState<Record<string, FootstoneEntry[]>>({});
  const [projectStartedKeys, setProjectStartedKeys] = useState<Set<string>>(new Set());
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [lastPlanUri, setLastPlanUri] = useState<string | null>(null);
  const [showPlanPlayer, setShowPlanPlayer] = useState(false);
  const [planPlaybackUri, setPlanPlaybackUri] = useState<string | null>(null);
  const [recordingSessionId, setRecordingSessionId] = useState<number | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingLimitSeconds, setRecordingLimitSeconds] = useState<number>(0);
  const [abortedSessions, setAbortedSessions] = useState<Set<number>>(new Set());
  const planPlayer = useVideoPlayer(planPlaybackUri, (player) => {
    if (planPlaybackUri) {
      player.loop = false;
      player.play();
    }
  });
  

  const persistPlanVideos = useCallback(async (data: Record<string, string>) => {
    try {
      await AsyncStorage.setItem('home-plan-videos', JSON.stringify(data));
    } catch {
      // ignore
    }
  }, []);

  const persistFootstones = useCallback(async (data: Record<string, FootstoneEntry[]>) => {
    try {
      await AsyncStorage.setItem('home-footstones', JSON.stringify(data));
      setFootstones(data);
      DeviceEventEmitter.emit('footstones-updated');
    } catch {
      // ignore
    }
  }, []);

  const persistStarted = useCallback(async (keys: Set<string>) => {
    try {
      await AsyncStorage.setItem('home-project-started', JSON.stringify(Array.from(keys)));
      setProjectStartedKeys(new Set(keys));
    } catch {
      // ignore
    }
  }, []);

  const occursOnDate = useCallback((task: Task, date: Date) => {
    if (!task.dueDate) return false;
    const start = new Date(`${task.dueDate}T00:00:00`);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (Number.isNaN(start.getTime())) return false;
    const isSameOrAfter = target.getTime() >= start.getTime();
    const sameDay =
      target.getFullYear() === start.getFullYear() &&
      target.getMonth() === start.getMonth() &&
      target.getDate() === start.getDate();
    switch (task.recurrence) {
      case 'Weekly':
        return isSameOrAfter && target.getDay() === start.getDay();
      case 'Monthly':
        return isSameOrAfter && target.getDate() === start.getDate();
      case 'Daily':
        return isSameOrAfter;
      default:
        return sameDay;
    }
  }, []);

  const todaysTasks = useMemo(() => {
    const today = new Date();
    return tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => occursOnDate(task, today));
  }, [tasks, occursOnDate]);

  const loadTasks = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('home-tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned: Task[] = parsed
            .map((t) => {
              if (t && typeof t === 'object' && typeof t.name === 'string' && typeof t.dueDate === 'string') {
                return {
                  name: t.name,
                  dueDate: t.dueDate,
                  recurrence: typeof t.recurrence === 'string' ? t.recurrence : 'Once',
                  category: typeof t.category === 'string' ? t.category : 'Personal',
                };
              }
              return null;
            })
            .filter((t): t is Task => !!t);
          setTasks(cleaned);
        }
      }
    } catch {
      // ignore load errors
    } finally {
      setTasksLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const sub = DeviceEventEmitter.addListener('tasks-updated', loadTasks);
    return () => sub.remove();
  }, [loadTasks]);

  useEffect(() => {
    const loadPlanVideos = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-plan-videos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setPlanVideos(parsed);
          }
        }
      } catch {
        // ignore
      }
    };
    loadPlanVideos();
  }, []);

  useEffect(() => {
    const loadStarted = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-project-started');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setProjectStartedKeys(new Set(parsed));
          }
        }
      } catch {
        // ignore
      }
    };
    loadStarted();

    const loadFootstones = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-footstones');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const cleaned: Record<string, FootstoneEntry[]> = {};
            Object.entries(parsed).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                const entries = value
                  .map((e) => {
                    if (!e || typeof e !== 'object' || typeof e.name !== 'string') return null;
                    return {
                      name: e.name,
                      plans: Array.isArray(e.plans) ? e.plans.filter((u: unknown) => typeof u === 'string') : [],
                      updates: Array.isArray(e.updates) ? e.updates.filter((u: unknown) => typeof u === 'string') : [],
                    } as FootstoneEntry;
                  })
                  .filter(Boolean) as FootstoneEntry[];
                cleaned[key] = entries;
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

  useEffect(() => {
    const loadProjects = async () => {
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
        // ignore
      }
    };
    loadProjects();
  }, []);

  const persistActiveSlots = useCallback(async (indices: number[]) => {
    try {
      const slotMap = tasks.map((_, idx) => {
        const slotIndex = indices.indexOf(idx);
        return slotIndex >= 0 ? slotIndex : -1;
      });
      await AsyncStorage.setItem('home-task-slot-state', JSON.stringify(slotMap));
    } catch {
      // ignore
    }
  }, [tasks]);

  const saveSlotNoteList = useCallback(async (list: NoteEntry[][]) => {
    try {
      await AsyncStorage.setItem('home-task-slot-note-list', JSON.stringify(list));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const restoreSlots = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-task-slot-state');
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const next = [-1, -1, -1];
          parsed.forEach((slotIdx: unknown, taskIdx: number) => {
            if (typeof slotIdx === 'number' && slotIdx >= 0 && slotIdx < next.length) {
              if (taskIdx >= 0 && taskIdx < tasks.length) {
                next[slotIdx] = taskIdx;
              }
            }
          });
          setActiveIndices(next);
        }
      } catch {
        // ignore
      }
    };
    const restoreNotes = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-task-slot-note-list');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const normalized = [parsed[0] ?? [], parsed[1] ?? [], parsed[2] ?? []].map((arr) =>
              Array.isArray(arr)
                ? arr
                    .map((e) => {
                      if (!e || typeof e !== 'object') return null;
                      const textVal = typeof e.text === 'string' ? e.text.trim() : '';
                      const voiceVal = typeof e.voice === 'string' ? e.voice : '';
                      if (!textVal && !voiceVal) return null;
                      return {
                        text: textVal || undefined,
                        voice: voiceVal || undefined,
                        timestamp: typeof e.timestamp === 'string' ? e.timestamp : new Date().toISOString(),
                      } as NoteEntry;
                    })
                    .filter(Boolean)
                : [],
            );
            setSlotNoteList(normalized as NoteEntry[][]);
          }
        }
      } catch {
        // ignore
      }
    };
    if (tasksLoaded && tasks.length > 0) {
      restoreSlots();
      restoreNotes();
    }
  }, [tasksLoaded, tasks.length]);

  const handleTasks = () => {
    if (onGoTasks) onGoTasks();
    else setSection('tasks');
  };

  const handleProjects = () => {
    if (onGoProjects) onGoProjects();
    else setSection('projects');
  };

  const handleCalendar = () => {
    const now = new Date();
    setCalendarSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setShowAddTask(false);
    setShowCalendarModal(true);
  };

  const startRecording = useCallback(
    (limitSeconds: number) => {
      if (!cameraRef.current) return;
      const id = Date.now();
      setRecordingSessionId(id);
      setRecordingStartTime(Date.now());
      setRecordingLimitSeconds(limitSeconds);
      setAbortedSessions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setIsRecording(true);
      const key = `${activeProjectIndex}-${activeProjectMilestone}`;
      const sessionPlanMode = planMode;
      (async () => {
        try {
          const result = await cameraRef.current?.recordAsync({ maxDuration: limitSeconds });
          setIsRecording(false);
          if (result?.uri && activeProjectIndex >= 0 && activeProjectMilestone >= 0) {
            const aborted = abortedSessions.has(id);
            if (aborted) return;
            const saveToFootstone = (uri: string, field: 'plans' | 'updates') => {
              setFootstones((prev) => {
                const list = Array.isArray(prev[key]) ? [...prev[key]] : [];
                if (list.length === 0) {
                  list.push({ name: projects[activeProjectIndex].name, plans: [], updates: [] });
                }
                const last = list[list.length - 1];
                const updatedLast: FootstoneEntry = {
                  ...last,
                  plans: field === 'plans' ? [...last.plans, uri] : last.plans,
                  updates: field === 'updates' ? [...last.updates, uri] : last.updates,
                };
                const nextList = [...list.slice(0, -1), updatedLast];
                const next = { ...prev, [key]: nextList };
                persistFootstones(next);
                return next;
              });
            };
            if (sessionPlanMode) {
              setPlanVideos((prev) => {
                const next = { ...prev, [key]: result.uri };
                persistPlanVideos(next);
                return next;
              });
              saveToFootstone(result.uri, 'plans');
              setLastPlanUri(result.uri);
            } else {
              saveToFootstone(result.uri, 'updates');
            }
            setCameraVisible(false);
            setPlanMode(false);
          }
        } catch {
          setIsRecording(false);
          Alert.alert('Recording error', 'Could not record video.');
        }
      })();
    },
    [
      activeProjectIndex,
      activeProjectMilestone,
      planMode,
      abortedSessions,
      persistFootstones,
      persistPlanVideos,
      projects,
      setFootstones,
    ],
  );

  useEffect(() => {
    (async () => {
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert('Microphone permission denied', 'Enable microphone access to record voice notes.');
        } else {
          await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const openPicker = (slot: number) => {
    if (todaysTasks.length === 0) return;
    setPickerSlot(slot);
    setShowTaskPicker(true);
  };

  const clearSlot = (slot: number) => {
    setActiveIndices((prev) => {
      const next = [...prev];
      next[slot] = -1;
      persistActiveSlots(next);
      return next;
    });
    setSlotNoteList((prev) => {
      const next = [...prev];
      next[slot] = [];
      saveSlotNoteList(next);
      return next;
    });
  };

  const pickTask = (taskIndex: number) => {
    if (pickerSlot === null) return;
    if (activeIndices.some((idx, i) => i !== pickerSlot && idx === taskIndex)) return;
    setActiveIndices((prev) => {
      const next = [...prev];
      next[pickerSlot] = taskIndex;
      persistActiveSlots(next);
      return next;
    });
    setSlotNoteList((prev) => {
      const next = [...prev];
      next[pickerSlot] = [];
      saveSlotNoteList(next);
      return next;
    });
    setShowTaskPicker(false);
    setPickerSlot(null);
  };

  const finishTask = async (slot: number) => {
    const taskIndex = activeIndices[slot];
    if (taskIndex === undefined || taskIndex < 0) return;
    const nextTasks = tasks.filter((_, i) => i !== taskIndex);
    setTasks(nextTasks);
    await AsyncStorage.setItem('home-tasks', JSON.stringify(nextTasks));
    DeviceEventEmitter.emit('tasks-updated');
    setActiveIndices((prev) => {
      const next = prev.map((idx) => (idx === taskIndex ? -1 : idx));
      persistActiveSlots(next);
      return next;
    });
    setSlotNoteList((prev) => {
      const next = [...prev];
      next[slot] = [];
      saveSlotNoteList(next);
      return next;
    });
  };

  const chooseProject = (index: number) => {
    setPendingProjectIndex(index);
  };

  const persistActiveProject = useCallback(async (index: number, milestoneIndex: number) => {
    try {
      const snapshot = index >= 0 && index < projects.length ? projects[index] : null;
      await AsyncStorage.setItem('home-active-project', JSON.stringify({ index, milestoneIndex, snapshot }));
    } catch {
      // ignore
    }
  }, [projects]);

  useEffect(() => {
    const restoreProject = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-active-project');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < projects.length) {
            setActiveProjectIndex(parsed.index);
            setActiveProjectMilestone(typeof parsed.milestoneIndex === 'number' ? parsed.milestoneIndex : -1);
          } else if (parsed?.snapshot && typeof parsed.snapshot === 'object' && typeof parsed.snapshot.name === 'string') {
            const matchIdx = projects.findIndex((p) => p.name === parsed.snapshot.name);
            if (matchIdx >= 0) {
              setActiveProjectIndex(matchIdx);
              setActiveProjectMilestone(-1);
            }
          }
        }
      } catch {
        // ignore
      }
    };
    restoreProject();
  }, [projects]);

  const renderSlot = (slot: number) => {
    const taskEntry = todaysTasks.find(({ index }) => index === activeIndices[slot]);
    const task = taskEntry?.task ?? null;
    return (
      <View style={styles.slot}>
        {task ? (
          <>
            <Text style={styles.slotName}>{task.name}</Text>
            <Text style={styles.slotMeta}>{`${task.dueDate || 'No due date'} · ${task.recurrence} · ${task.category ?? 'Personal'}`}</Text>
            <View style={styles.slotActions}>
              <TouchableOpacity
                style={[styles.button, styles.primary, styles.half]}
                onPress={() => {
                  setNoteDraft('');
                  setRecordedUri(null);
                  setNoteModalSlot(slot);
                }}
              >
                <Text style={styles.buttonText}>Add Note</Text>
              </TouchableOpacity>
              {task.recurrence === 'Once' && (
                <TouchableOpacity style={[styles.button, styles.secondary, styles.half]} onPress={() => finishTask(slot)}>
                  <Text style={[styles.buttonText, styles.secondaryText]}>Finish</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.button, styles.secondary, styles.half]} onPress={() => clearSlot(slot)}>
                <Text style={[styles.buttonText, styles.secondaryText]}>Move On</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.empty}>No task selected</Text>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => openPicker(slot)}>
              <Text style={[styles.buttonText, styles.secondaryText]}>
                {todaysTasks.length === 0 ? 'No tasks today' : 'Choose task'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.activeTasks}>
        <Text style={styles.sectionHeading}>Today&apos;s Active Tasks</Text>
        {todaysTasks.length === 0 ? (
          <Text style={styles.empty}>No tasks scheduled for today.</Text>
        ) : (
          <View style={styles.slotsRow}>
            {renderSlot(0)}
            {renderSlot(1)}
            {renderSlot(2)}
          </View>
        )}
      </View>

      <View style={styles.activeTasks}>
        <Text style={styles.sectionHeading}>Active Project</Text>
        {activeProjectIndex >= 0 && activeProjectIndex < projects.length ? (
          (() => {
            const key = `${activeProjectIndex}-${activeProjectMilestone}`;
            const footstoneList = Array.isArray(footstones[key]) ? footstones[key] : [];
            const latestFootstone = footstoneList.length > 0 ? footstoneList[footstoneList.length - 1] : null;
            const displayName = latestFootstone?.name ?? projects[activeProjectIndex].name;
            const milestoneValid =
              activeProjectMilestone >= 0 && activeProjectMilestone < projects[activeProjectIndex].milestones.length;
            const isStarted = projectStartedKeys.has(key);
            return (
              <View style={styles.projectCard}>
                <View style={[styles.slotActions, styles.footstoneRow]}>
                  <Text style={[styles.slotName, { flex: 1 }]}>{displayName}</Text>
                  <TouchableOpacity
                    style={[styles.button, styles.secondary, styles.footstoneButton]}
                    onPress={() => {
                      setFootstoneDraft('');
                      setShowFootstoneModal(true);
                    }}
                    disabled={!milestoneValid}
                  >
                    <Text style={[styles.buttonText, styles.secondaryText]}>+ Footstone</Text>
                  </TouchableOpacity>
                </View>
                {projects[activeProjectIndex].milestones.length === 0 ? (
                  <Text style={styles.slotMeta}>No milestones yet.</Text>
                ) : milestoneValid ? (
                  <Text style={styles.slotMeta}>
                    Current milestone: {projects[activeProjectIndex].milestones[activeProjectMilestone]}
                  </Text>
                ) : (
                  <View style={styles.slotActions}>
                    <Text style={[styles.slotMeta, { flex: 1 }]}>No milestone selected.</Text>
                    <TouchableOpacity
                      style={[styles.button, styles.secondary, styles.half]}
                      onPress={() => setShowProjectPicker(true)}
                    >
                      <Text style={[styles.buttonText, styles.secondaryText]}>Pick Milestone</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {milestoneValid && (
                  <View style={styles.slotActions}>
                    {isStarted ? (
                      <>
                        <TouchableOpacity
                          style={[styles.button, styles.primary, styles.half]}
                          onPress={() => {
                            setPlanMode(false);
                            setShowUpdatePrompt(true);
                          }}
                        >
                          <Text style={styles.buttonText}>Update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.secondary, styles.half]}
                          onPress={() => {
                            setPlanMode(true);
                            setShowUpdatePrompt(true);
                          }}
                        >
                          <Text style={[styles.buttonText, styles.secondaryText]}>Plan</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.button, styles.primary, styles.half]}
                        onPress={() => {
                          const next = new Set(projectStartedKeys);
                          next.add(key);
                          persistStarted(next);
                          setShowStartPrompt(true);
                        }}
                      >
                        <Text style={styles.buttonText}>Start Project</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.button, styles.secondary, styles.half]}
                      onPress={() => {
                        setActiveProjectIndex(-1);
                        setActiveProjectMilestone(-1);
                        persistActiveProject(-1, -1);
                      }}
                    >
                      <Text style={[styles.buttonText, styles.secondaryText]}>Move On</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()
        ) : (
          <View style={styles.projectCard}>
            <Text style={styles.slotMeta}>No active project selected.</Text>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setShowProjectPicker(true)}>
              <Text style={[styles.buttonText, styles.secondaryText]}>Choose Project</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {section === 'home' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.accent]} onPress={handleCalendar}>
            <Text style={styles.buttonText}>Show Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleTasks}>
            <Text style={styles.buttonText}>Go to Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleProjects}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Go to Projects</Text>
          </TouchableOpacity>
        </View>
      )}

      {section === 'tasks' && (
        <>
          <Tasks />
          <TouchableOpacity style={[styles.button, styles.link]} onPress={() => setSection('home')}>
            <Text style={styles.linkText}>Back to Home</Text>
          </TouchableOpacity>
        </>
      )}

      {section === 'projects' && (
        <>
          <Projects />
          <TouchableOpacity style={[styles.button, styles.link]} onPress={() => setSection('home')}>
            <Text style={styles.linkText}>Back to Home</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCalendarModal(false);
          setShowAddTask(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!showAddTask && <Calendar onSelectDate={(iso) => setCalendarSelectedDate(iso)} />}
            {showAddTask ? (
              <AddTask initialDueDate={calendarSelectedDate ?? undefined} onClose={() => setShowAddTask(false)} />
            ) : (
              <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => setShowAddTask(true)}>
                <Text style={styles.buttonText}>Add Task</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondary, styles.closeButton]}
              onPress={() => {
                setShowCalendarModal(false);
                setShowAddTask(false);
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTaskPicker} transparent animationType="fade" onRequestClose={() => setShowTaskPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>Pick a task for slot {pickerSlot !== null ? pickerSlot + 1 : ''}</Text>
            {todaysTasks.length === 0 ? (
              <Text style={styles.empty}>No tasks scheduled for today.</Text>
            ) : (
              todaysTasks
                .filter(({ index }) => {
                  if (pickerSlot === null) return true;
                  return !activeIndices.some((idx, i) => i !== pickerSlot && idx === index);
                })
                .map(({ task, index }) => (
                  <TouchableOpacity key={`${task.name}-${index}`} style={styles.pickRow} onPress={() => pickTask(index)}>
                    <Text style={styles.slotName}>{task.name}</Text>
                    <Text style={styles.slotMeta}>
                      {task.dueDate || 'No due date'} · {task.recurrence} · {task.category ?? 'Personal'}
                    </Text>
                  </TouchableOpacity>
                ))
            )}
            <TouchableOpacity style={[styles.button, styles.secondary, styles.closeButton]} onPress={() => setShowTaskPicker(false)}>
              <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProjectPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowProjectPicker(false);
          setPendingProjectIndex(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>
              {pendingProjectIndex === null ? 'Pick an active project' : 'Pick a milestone'}
            </Text>
            {pendingProjectIndex === null ? (
              projects.length === 0 ? (
                <Text style={styles.empty}>No projects yet.</Text>
              ) : (
                projects.map((project, index) => (
                  <TouchableOpacity key={`${project.name}-${index}`} style={styles.pickRow} onPress={() => chooseProject(index)}>
                    <Text style={styles.slotName}>{project.name}</Text>
                    {project.milestones.length > 0 ? (
                      <Text style={styles.slotMeta}>{`${project.milestones.length} milestone${project.milestones.length === 1 ? '' : 's'}`}</Text>
                    ) : (
                      <Text style={styles.slotMeta}>No milestones</Text>
                    )}
                  </TouchableOpacity>
                ))
              )
            ) : projects[pendingProjectIndex].milestones.length === 0 ? (
              <Text style={styles.empty}>This project has no milestones.</Text>
            ) : (
              projects[pendingProjectIndex].milestones.map((milestone, idx) => (
                <TouchableOpacity
                  key={`${milestone}-${idx}`}
                  style={styles.pickRow}
                  onPress={() => {
                    setActiveProjectIndex(pendingProjectIndex);
                    setActiveProjectMilestone(idx);
                    persistActiveProject(pendingProjectIndex, idx);
                    const key = `${pendingProjectIndex}-${idx}`;
                    const nextStarted = new Set(projectStartedKeys);
                    if (nextStarted.has(key)) {
                      nextStarted.delete(key);
                      persistStarted(nextStarted);
                    }
                    setShowProjectPicker(false);
                    setPendingProjectIndex(null);
                  }}
                >
                  <Text style={styles.slotName}>{milestone}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondary, styles.closeButton]}
              onPress={() => {
                setShowProjectPicker(false);
                setPendingProjectIndex(null);
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={noteModalSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setNoteModalSlot(null);
          setNoteDraft('');
          setRecordedUri(null);
          if (recorderState.isRecording) {
            audioRecorder.stop().catch(() => {});
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>
              {noteModalSlot !== null ? `Add note for slot ${noteModalSlot + 1}` : 'Add note'}
            </Text>
            <View style={styles.noteInputBox}>
              <Text style={styles.noteLabel}>Note</Text>
              <TouchableOpacity activeOpacity={1} style={styles.noteInputTouchable}>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Type your note"
                  placeholderTextColor="#6B7280"
                  style={styles.noteInput}
                  multiline
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.row, styles.slotActions]}>
              <TouchableOpacity
                style={[styles.button, styles.primary, styles.half]}
                onPress={() => {
                  if (noteModalSlot === null) return;
                  const trimmed = noteDraft.trim();
                  if (!trimmed) {
                    setNoteModalSlot(null);
                    setNoteDraft('');
                    setRecordedUri(null);
                    return;
                  }
                  const entry: NoteEntry = { text: trimmed, timestamp: new Date().toISOString() };
                  setSlotNoteList((prev) => {
                    const next = [...prev];
                    const list = next[noteModalSlot] ? [...next[noteModalSlot]] : [];
                    list.push(entry);
                    next[noteModalSlot] = list;
                    saveSlotNoteList(next);
                    return next;
                  });
                  setNoteModalSlot(null);
                  setNoteDraft('');
                  setRecordedUri(null);
                }}
              >
                <Text style={styles.buttonText}>Save Note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondary, styles.half]}
                onPress={() => {
                  setNoteModalSlot(null);
                  setNoteDraft('');
                  setRecordedUri(null);
                }}
              >
                <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.noteInputBox, styles.voiceBox]}>
              <Text style={styles.noteLabel}>Voice Memo</Text>
              <View style={styles.slotActions}>
                <TouchableOpacity
                  style={[styles.button, styles.secondary, styles.half]}
                  onPress={async () => {
                    try {
                      setRecordedUri(null);
                      await audioRecorder.prepareToRecordAsync();
                      audioRecorder.record();
                    } catch {
                      Alert.alert('Recording error', 'Could not start recording.');
                    }
                  }}
                  disabled={recorderState.isRecording}
                >
                  <Text style={[styles.buttonText, styles.secondaryText]}>
                    {recorderState.isRecording ? 'Recording...' : 'Start Recording'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondary, styles.half]}
                  onPress={async () => {
                    if (!recorderState.isRecording) return;
                    try {
                      await audioRecorder.stop();
                      setRecordedUri(audioRecorder.uri ?? null);
                    } catch {
                      Alert.alert('Recording error', 'Could not stop recording.');
                    }
                  }}
                >
                  <Text style={[styles.buttonText, styles.secondaryText]}>Stop</Text>
                </TouchableOpacity>
              </View>
              {recordedUri ? <Text style={styles.slotMeta}>Voice memo ready to save.</Text> : null}
              <TouchableOpacity
                style={[styles.button, styles.primary, styles.half]}
                disabled={!recordedUri || noteModalSlot === null}
                onPress={() => {
                  if (!recordedUri || noteModalSlot === null) return;
                  const entry: NoteEntry = { voice: recordedUri, timestamp: new Date().toISOString() };
                  setSlotNoteList((prev) => {
                    const next = [...prev];
                    const list = next[noteModalSlot] ? [...next[noteModalSlot]] : [];
                    list.push(entry);
                    next[noteModalSlot] = list;
                    saveSlotNoteList(next);
                    return next;
                  });
                  setRecordedUri(null);
                  setNoteModalSlot(null);
                  setNoteDraft('');
                }}
              >
                <Text style={styles.buttonText}>Save Voice Memo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showUpdatePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpdatePrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>{planMode ? 'Create a plan' : 'Share an update'}</Text>
            <Text style={styles.slotMeta}>
              {planMode ? 'Record or describe your plan for this milestone.' : 'Record or log an update for this milestone.'}
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primary]}
              onPress={() => {
                setShowUpdatePrompt(false);
                requestCameraPermission();
                requestMicPermission();
                setCameraVisible(true);
              }}
            >
              <Text style={styles.buttonText}>{planMode ? 'Film 20 second plan' : 'Film 10 second update'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondary]}
              onPress={() => {
                setPlanMode(false);
                setShowUpdatePrompt(false);
              }}
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cameraVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCameraVisible(false);
          setPlanMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.cameraCard]}>
            <Text style={styles.sectionHeading}>{planMode ? 'Film 20 second plan' : 'Film 10 second update'}</Text>
            {!cameraPermission || !micPermission ? (
              <Text style={styles.slotMeta}>Loading camera permissions…</Text>
            ) : cameraPermission.granted && micPermission.granted ? (
              <>
                <CameraView ref={cameraRef} style={styles.cameraPreview} facing={cameraFacing} mode="video" />
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.secondary,
                      styles.half,
                      isRecording ? styles.disabledButton : null,
                    ]}
                    onPress={async () => {
                      if (isRecording) {
                        // stop current recording and restart to simulate pause/resume
                        const now = Date.now();
                        const elapsed = (now - recordingStartTime) / 1000;
                        const remaining = Math.max(1, recordingLimitSeconds - elapsed);
                        const currentId = recordingSessionId;
                        if (currentId !== null) {
                          setAbortedSessions((prev) => new Set(prev).add(currentId));
                        }
                        try {
                          await cameraRef.current?.stopRecording();
                        } catch {
                          // ignore stop errors during flip
                        }
                        setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
                        setTimeout(() => startRecording(remaining), 100);
                      } else {
                        setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
                      }
                    }}
                  >
                    <Text style={[styles.buttonText, styles.secondaryText]}>Flip Camera</Text>
                  </TouchableOpacity>
                  {isRecording ? (
                    <TouchableOpacity
                      style={[styles.button, styles.secondary, styles.half]}
                      onPress={async () => {
                        const currentId = recordingSessionId;
                        if (currentId !== null) {
                          setAbortedSessions((prev) => new Set(prev).add(currentId));
                        }
                        try {
                          await cameraRef.current?.stopRecording();
                        } catch {
                          // ignore
                        } finally {
                          setIsRecording(false);
                        }
                      }}
                    >
                      <Text style={[styles.buttonText, styles.secondaryText]}>Stop</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, styles.primary, styles.half]}
                      onPress={() => {
                        const limit = planMode ? 20 : 10;
                        startRecording(limit);
                      }}
                    >
                      <Text style={styles.buttonText}>{planMode ? 'Record 20s' : 'Record 10s'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.button, styles.primary, styles.half]}
                    onPress={() => {
                      setIsRecording(false);
                      setCameraVisible(false);
                      setPlanMode(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.slotMeta}>We need camera and microphone permission to film.</Text>
                <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => { requestCameraPermission(); requestMicPermission(); }}>
                  <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setCameraVisible(false)}>
                  <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStartPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>Project started</Text>
            <Text style={styles.slotMeta}>What would you like to do?</Text>
            <TouchableOpacity
              style={[styles.button, styles.primary]}
              onPress={() => {
                const key = `${activeProjectIndex}-${activeProjectMilestone}`;
                const list = Array.isArray(footstones[key]) ? footstones[key] : [];
                const latest = list.length > 0 ? list[list.length - 1] : null;
                const uri =
                  latest && Array.isArray(latest.plans) && latest.plans.length > 0
                    ? latest.plans[latest.plans.length - 1]
                    : null;
                if (uri) {
                  setPlanPlaybackUri(uri);
                  setShowPlanPlayer(true);
                } else {
                  Alert.alert('No plan found', 'Add a plan video first.');
                }
                setShowStartPrompt(false);
              }}
            >
              <Text style={styles.buttonText}>Watch Last Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondary]}
              onPress={() => setShowStartPrompt(false)}
            >
              <Text style={[styles.buttonText, styles.secondaryText]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFootstoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFootstoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>Add Footstone</Text>
            {(() => {
              const key = `${activeProjectIndex}-${activeProjectMilestone}`;
              const hasExisting = Array.isArray(footstones[key]) && footstones[key].length > 0;
              return hasExisting ? (
                <Text style={styles.slotMeta}>
                  Warning: adding a new footstone replaces the current one—you won&apos;t be able to go back.
                </Text>
              ) : null;
            })()}
            <TextInput
              value={footstoneDraft}
              onChangeText={setFootstoneDraft}
              placeholder="Footstone name"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.singleLine]}
              autoFocus
            />
            <View style={styles.slotActions}>
              <TouchableOpacity
                style={[styles.button, styles.primary, styles.half]}
                onPress={() => {
                  const trimmed = footstoneDraft.trim();
                  if (!trimmed || activeProjectIndex < 0 || activeProjectMilestone < 0) {
                    setShowFootstoneModal(false);
                    setFootstoneDraft('');
                    return;
                  }
                  const key = `${activeProjectIndex}-${activeProjectMilestone}`;
                  setFootstones((prev) => {
                    const next = { ...prev };
                    const list = Array.isArray(prev[key]) ? [...prev[key]] : [];
                    list.push({ name: trimmed, plans: [], updates: [] });
                    next[key] = list;
                    persistFootstones(next);
                    return next;
                  });
                  setShowFootstoneModal(false);
                  setFootstoneDraft('');
                }}
                disabled={!footstoneDraft.trim()}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondary, styles.half]}
                onPress={() => {
                  setShowFootstoneModal(false);
                  setFootstoneDraft('');
                }}
              >
                <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPlanPlayer && !!planPlaybackUri}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPlanPlayer(false);
          setPlanPlaybackUri(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionHeading}>Last Plan</Text>
            {planPlaybackUri ? (
              <VideoView
                style={styles.videoPlayer}
                player={planPlayer}
                allowsFullscreen
                allowsPictureInPicture
              />
            ) : (
              <Text style={styles.slotMeta}>No plan available.</Text>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondary, styles.closeButton]}
              onPress={() => {
                setShowPlanPlayer(false);
                setPlanPlaybackUri(null);
                try {
                  planPlayer.pause();
                } catch {
                  // ignore
                }
              }}
            >
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
    marginTop: 24,
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
  actions: {
    flexDirection: 'column',
    gap: 12,
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
  accent: {
    backgroundColor: '#2563EB',
  },
  link: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#111827',
  },
  disabledButton: {
    opacity: 0.5,
  },
  linkText: {
    color: '#0F5132',
    fontWeight: '600',
  },
  activeTasks: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  slotsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  slot: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  slotName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  slotMeta: {
    fontSize: 13,
    color: '#4B5563',
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  slotActions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 8,
  },
  projectCard: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  half: {
    flex: 1,
  },
  pickRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    gap: 2,
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
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  closeButton: {
    marginTop: 8,
  },
  cameraCard: {
    maxWidth: 520,
  },
  cameraPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  noteInputBox: {
    gap: 6,
  },
  voiceBox: {
    marginTop: 12,
  },
  noteInputTouchable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
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
  noteInput: {
    minHeight: 120,
    padding: 12,
    color: '#111827',
    textAlignVertical: 'top',
  },
  videoPlayer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  footstoneRow: {
    justifyContent: 'flex-end',
    marginBottom: -4,
  },
  footstoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  promptInputRow: {
    minHeight: 1,
  },
});

export default Home;
