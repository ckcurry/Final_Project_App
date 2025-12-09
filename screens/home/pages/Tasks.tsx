import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Task = {
  name: string;
  dueDate: string;
  recurrence: string;
  category: string;
};
type NoteEntry = {
  text?: string;
  voice?: string;
  timestamp?: string;
};

const recurrenceOptions = ['Once', 'Weekly', 'Monthly'];
const categoryOptions = ['Household', 'Hobby', 'Education', 'Personal'];
const categoryStyles: Record<string, { color: string; bg: string }> = {
  Household: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  Hobby: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  Education: { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  Personal: { color: '#DB2777', bg: 'rgba(219, 39, 119, 0.12)' },
};

type Props = {
  autoShowForm?: boolean;
  initialDueDate?: string;
  showCalendarInline?: boolean;
  onCloseCalendar?: () => void;
  showListWhenFormHidden?: boolean;
  onAddPress?: () => void;
};

const Tasks: FC<Props> = (props) => {
  const resolvedAutoShowForm = props?.autoShowForm ?? false;
  const { initialDueDate, showCalendarInline, onCloseCalendar, showListWhenFormHidden, onAddPress } = props || {};
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const formatDisplayDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date;
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) return 'Today';
    const month = d.toLocaleString('default', { month: 'long' });
    return `${month} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

  const [dueDate, setDueDate] = useState(() => {
    if (initialDueDate) return initialDueDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [recurrence, setRecurrence] = useState(recurrenceOptions[0]);
  const [category, setCategory] = useState(categoryOptions[3]);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(Boolean(resolvedAutoShowForm));
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskNotes, setTaskNotes] = useState<Record<number, NoteEntry[]>>({});
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const [editMode, setEditMode] = useState(false);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [queuedSource, setQueuedSource] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('home-tasks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .map((t) => {
                if (typeof t === 'string') {
                  return {
                    name: t,
                    dueDate,
                    recurrence: recurrenceOptions[0],
                    category: categoryOptions[3],
                  } as Task;
                }
                if (t && typeof t === 'object' && typeof t.name === 'string') {
                  return {
                    name: t.name,
                    dueDate: typeof t.dueDate === 'string' && t.dueDate ? t.dueDate : dueDate,
                    recurrence: typeof t.recurrence === 'string' ? t.recurrence : recurrenceOptions[0],
                    category: typeof t.category === 'string' ? t.category : categoryOptions[3],
                  } as Task;
                }
                return null;
              })
              .filter((t): t is Task => !!t);
            setTasks(cleaned);
          }
        }
      } catch {
        setStatus('Could not load tasks.');
      }
    };
    load();
  }, [dueDate]);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const [slotStateJson, slotNotesJson, slotListJson] = await Promise.all([
          AsyncStorage.getItem('home-task-slot-state'),
          AsyncStorage.getItem('home-task-slot-notes'),
          AsyncStorage.getItem('home-task-slot-note-list'),
        ]);
        const slotState = slotStateJson ? JSON.parse(slotStateJson) : [];
        const slotNotes = slotNotesJson ? JSON.parse(slotNotesJson) : [];
        const slotList = slotListJson ? JSON.parse(slotListJson) : [];

        if (Array.isArray(slotState)) {
          const mapping: Record<number, NoteEntry[]> = {};
          tasks.forEach((_, idx) => {
            const slotIdx = slotState[idx];
            if (typeof slotIdx === 'number' && slotIdx >= 0) {
              const listForSlot = Array.isArray(slotList?.[slotIdx]) ? slotList[slotIdx] : null;
              if (listForSlot) {
                const filtered = listForSlot
                  .map((entry: any) => {
                    if (!entry || typeof entry !== 'object') return null;
                    const text = typeof entry.text === 'string' ? entry.text.trim() : '';
                    const voice = typeof entry.voice === 'string' ? entry.voice : '';
                    const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : undefined;
                    if (!text && !voice) return null;
                    return { text: text || undefined, voice: voice || undefined, timestamp };
                  })
                  .filter(Boolean) as NoteEntry[];
                if (filtered.length > 0) {
                  mapping[idx] = filtered;
                  return;
                }
              }

              const text = Array.isArray(slotNotes) ? slotNotes[slotIdx] : undefined;
              const hasText = typeof text === 'string' && text.trim().length > 0;
              if (hasText) {
                mapping[idx] = [
                  {
                    text: text.trim(),
                  },
                ];
              }
            }
          });
          setTaskNotes(mapping);
        }
      } catch {
        setTaskNotes({});
      }
    };
    loadNotes();
  }, [tasks]);

  useEffect(() => {
    setShowForm(Boolean(resolvedAutoShowForm));
  }, [resolvedAutoShowForm]);

  useEffect(() => {
    if (initialDueDate) {
      setDueDate(initialDueDate);
    }
  }, [initialDueDate]);

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
      case 'Daily': // legacy support
        return isSameOrAfter;
      default:
        return sameDay;
    }
  }, []);

  const monthData = useMemo(() => {
    const monthName = monthCursor.toLocaleString('default', { month: 'long' });
    const year = monthCursor.getFullYear();
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();

    const slots: Array<number | null> = Array(startDay).fill(null);
    for (let d = 1; d <= daysInMonth; d += 1) slots.push(d);
    while (slots.length % 7 !== 0) slots.push(null);

    const weeks: Array<Array<number | null>> = [];
    for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));

    const daysWithTasks = new Map<number, Task[]>();
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
      tasks.forEach((task) => {
        if (occursOnDate(task, date)) {
          const list = daysWithTasks.get(d) ?? [];
          list.push(task);
          daysWithTasks.set(d, list);
        }
      });
    }

    return { monthName, year, weeks, daysWithTasks };
  }, [monthCursor, tasks, occursOnDate]);

  const handleSelectDate = useCallback(
    (day: number | null) => {
      if (!day) return;
      const formatted = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}-${String(
        day,
      ).padStart(2, '0')}`;
      setDueDate(formatted);
      setShowCalendar(false);
    },
    [monthCursor],
  );

  const goMonth = useCallback(
    (delta: number) => {
      setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    },
    [],
  );

  const persistTasks = useCallback(async (next: Task[]) => {
    try {
      await AsyncStorage.setItem('home-tasks', JSON.stringify(next));
      setTasks(next);
      setStatus('Saved locally on this device.');
      DeviceEventEmitter.emit('tasks-updated');
    } catch {
      setStatus('Save failed. Please try again.');
    }
  }, []);

  const handleAdd = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedDate = dueDate.trim();
    if (!trimmedName || !trimmedDate) {
      setStatus('Enter a name and due date.');
      return;
    }
    const next: Task[] = [...tasks, { name: trimmedName, dueDate: trimmedDate, recurrence, category }];
    persistTasks(next);
    setName('');
    setDueDate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    setRecurrence(recurrenceOptions[0]);
    setCategory(categoryOptions[3]);
    if (showCalendarInline) {
      onCloseCalendar?.();
    } else {
      setShowCalendar(false);
    }
    setShowForm(false);
  }, [name, dueDate, recurrence, category, tasks, persistTasks]);

  const handleRemove = useCallback(
    (index: number) => {
      const next = tasks.filter((_, i) => i !== index);
      persistTasks(next);
    },
    [tasks, persistTasks],
  );

  const playVoice = useCallback(
    async (uri?: string) => {
      if (!uri) return;
      try {
        // Replace current source and play
        await player.replace(uri);
        await player.play();
        setQueuedSource(uri);
      } catch {
        // ignore playback errors
      }
    },
    [player],
  );

  const useExternalAdd = Boolean(onAddPress);
  const shouldRenderForm = showForm && !useExternalAdd;
  const cardStyle = [styles.card, showListWhenFormHidden && styles.cardFill];

  return (
    <View style={cardStyle}>
      <Text style={styles.cardLabel}>Tasks</Text>

      {!shouldRenderForm && (
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={() => {
            if (useExternalAdd) {
              onAddPress?.();
            } else {
              setShowForm(true);
            }
          }}
        >
          <Text style={styles.buttonText}>Add Task</Text>
        </TouchableOpacity>
      )}

      {!shouldRenderForm && (
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={() => setEditMode((prev) => !prev)}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>{editMode ? 'Done' : 'Edit Tasks'}</Text>
        </TouchableOpacity>
      )}

      {shouldRenderForm && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.selectedDate}>
              {dueDate ? `Selected: ${formatDisplayDate(dueDate)}` : 'No date selected'}
            </Text>

          {showCalendarInline ? (
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => goMonth(-1)}>
                  <Text style={styles.nav}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{`${monthData.monthName} ${monthData.year}`}</Text>
                <TouchableOpacity onPress={() => goMonth(1)}>
                  <Text style={styles.nav}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.weekdays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.weeks}>
                {monthData.weeks.map((week, idx) => (
                  <View key={`week-${idx}`} style={styles.weekRow}>
                    {week.map((day, dayIdx) => {
                      const formatted =
                        day &&
                        `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}-${String(
                          day,
                        ).padStart(2, '0')}`;
                      const isSelected = day && dueDate === formatted;
                      const dayTasks = day ? monthData.daysWithTasks.get(day) ?? [] : [];
                      return (
                        <TouchableOpacity
                          key={`day-${idx}-${dayIdx}`}
                          style={[styles.dayCell, isSelected ? styles.daySelected : null]}
                          onPress={() => handleSelectDate(day)}
                          disabled={!day}
                        >
                          {day ? (
                            <>
                              <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : null]}>{day}</Text>
                              <View style={styles.dotsRow}>
                                {dayTasks.slice(0, 3).map((task, i) => {
                                  const color = categoryStyles[task.category]?.color ?? '#111827';
                                  return <View key={`dot-${i}`} style={[styles.dot, { backgroundColor: color }]} />;
                                })}
                              </View>
                            </>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
              <View style={[styles.row, styles.wrap, styles.topMargin]}>
                <Text style={styles.fieldLabel}>Recurrence</Text>
                {recurrenceOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chip,
                      recurrence === option ? styles.chipActive : styles.chipInactive,
                    ]}
                    onPress={() => setRecurrence(option)}
                  >
                    <Text style={recurrence === option ? styles.chipTextActive : styles.chipText}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <Modal
              visible={showCalendar}
              transparent
              animationType="fade"
              onRequestClose={() => setShowCalendar(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => goMonth(-1)}>
                      <Text style={styles.nav}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>{`${monthData.monthName} ${monthData.year}`}</Text>
                    <TouchableOpacity onPress={() => goMonth(1)}>
                      <Text style={styles.nav}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <Text key={day} style={styles.weekday}>
                        {day}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.weeks}>
                    {monthData.weeks.map((week, idx) => (
                      <View key={`week-${idx}`} style={styles.weekRow}>
                        {week.map((day, dayIdx) => {
                          const formatted =
                            day &&
                            `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}-${String(
                              day,
                            ).padStart(2, '0')}`;
                          const isSelected = day && dueDate === formatted;
                          const dayTasks = day ? monthData.daysWithTasks.get(day) ?? [] : [];
                          return (
                            <TouchableOpacity
                              key={`day-${idx}-${dayIdx}`}
                              style={[styles.dayCell, isSelected ? styles.daySelected : null]}
                              onPress={() => handleSelectDate(day)}
                              disabled={!day}
                            >
                              {day ? (
                                <>
                                  <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : null]}>{day}</Text>
                                  <View style={styles.dotsRow}>
                                    {dayTasks.slice(0, 3).map((task, i) => {
                                      const color = categoryStyles[task.category]?.color ?? '#111827';
                                      return <View key={`dot-${i}`} style={[styles.dot, { backgroundColor: color }]} />;
                                    })}
                                  </View>
                                </>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                  <View style={[styles.row, styles.wrap, styles.topMargin]}>
                    <Text style={styles.fieldLabel}>Recurrence</Text>
                    {recurrenceOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.chip,
                          recurrence === option ? styles.chipActive : styles.chipInactive,
                        ]}
                        onPress={() => setRecurrence(option)}
                      >
                        <Text style={recurrence === option ? styles.chipTextActive : styles.chipText}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.button, styles.secondary, styles.closeButton]}
                    onPress={() => setShowCalendar(false)}
                  >
                    <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          <View style={styles.row}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Task name"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.singleLine, styles.rowInput]}
              returnKeyType="next"
            />
          </View>

            <View style={[styles.row, styles.wrap]}>
              <Text style={styles.fieldLabel}>Categories</Text>
              {categoryOptions.map((option) => {
                const { color, bg } = categoryStyles[option] ?? categoryStyles.Personal;
                const active = category === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                      active && { borderColor: color, backgroundColor: bg },
                    ]}
                    onPress={() => setCategory(option)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && { color },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.row, styles.saveRow]}>
              <TouchableOpacity style={[styles.button, styles.primary, styles.largeButton]} onPress={handleAdd}>
                <Text style={styles.buttonText}>Save Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      )}

      <Text style={styles.status}>{status}</Text>

      {!shouldRenderForm && showListWhenFormHidden && (
        <View style={styles.listWrapper}>
          <ScrollView style={styles.tasksList} contentContainerStyle={styles.tasksListContent}>
            {tasks.length === 0 ? (
              <Text style={styles.empty}>No tasks yet.</Text>
            ) : (
              tasks.map((task, index) => {
                    const notes = taskNotes[index] ?? [];
                    const hasNotes = notes.length > 0;
                    const isOpen = Boolean(openNotes[index]);
                    return (
                      <View key={`${task}-${index}`} style={styles.taskItem}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTextGroup}>
                        <Text style={styles.taskName}>{task.name}</Text>
                      </View>
                      {hasNotes && (
                        <TouchableOpacity
                          style={[styles.button, styles.secondary, styles.noteToggleInline]}
                          onPress={() => {
                            setOpenNotes((prev) => ({ ...prev, [index]: !prev[index] }));
                          }}
                        >
                          <Text style={[styles.buttonText, styles.secondaryText]}>
                            {isOpen ? 'Hide Notes' : 'Show Notes'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.taskTextGroup}>
                      <Text style={styles.taskMeta}>
                        {task.dueDate ? `Due ${task.dueDate}` : 'No due date'} · {task.recurrence} · {task.category}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.categoryPill,
                        {
                          borderColor: (categoryStyles[task.category]?.color) ?? '#D1D5DB',
                          backgroundColor: (categoryStyles[task.category]?.bg) ?? '#F3F4F6',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: (categoryStyles[task.category]?.color) ?? '#111827' },
                        ]}
                      >
                        {task.category}
                      </Text>
                    </View>
                    {editMode && (
                      <TouchableOpacity onPress={() => handleRemove(index)}>
                        <Text style={styles.remove}>Remove</Text>
                      </TouchableOpacity>
                    )}
                    {hasNotes && isOpen && (
                    <View style={styles.noteBox}>
                        <View style={styles.noteList}>
                          {[...notes]
                            .sort((a, b) => {
                              const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                              const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                              return tb - ta;
                            })
                            .map((entry, noteIdx) => {
                            const noteId = `${task.name}-${index}-${entry.timestamp ?? noteIdx}`;
                            const timestampLabel = entry.timestamp
                              ? new Date(entry.timestamp).toLocaleString()
                              : 'Note';
                            return (
                              <View key={noteId} style={styles.noteEntry}>
                                <Text style={styles.noteLabel}>{timestampLabel}</Text>
                                {entry.text ? <Text style={styles.noteText}>{entry.text}</Text> : null}
                                {entry.voice ? (
                                  <TouchableOpacity
                                    style={[styles.button, styles.secondary, styles.notePlay]}
                                    onPress={() => playVoice(entry.voice)}
                                    disabled={playerStatus.playing && queuedSource === entry.voice}
                                  >
                                    <Text style={[styles.buttonText, styles.secondaryText]}>
                                      {playerStatus.playing && queuedSource === entry.voice ? 'Playing...' : 'Play Voice Memo'}
                                    </Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
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
  cardFill: {
    flex: 1,
  },
  formContent: {
    gap: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveRow: {
    justifyContent: 'center',
    marginBottom: -4,
  },
  wrap: {
    flexWrap: 'wrap',
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
  rowInput: {
    flex: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  half: {
    flex: 1,
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
  selectedDate: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  chipInactive: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#0F5132',
    backgroundColor: '#E9F5EF',
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0F5132',
    fontWeight: '700',
  },
  topMargin: {
    marginTop: 8,
  },
  fieldLabel: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  tasksList: {
    flex: 1,
    minHeight: 0,
  },
  tasksListContent: {
    gap: 8,
    paddingVertical: 8,
  },
  listWrapper: {
    marginTop: 'auto',
    width: '100%',
    flex: 1,
  },
  calendarCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  nav: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F5132',
    paddingHorizontal: 8,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '600',
  },
  weeks: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  daySelected: {
    borderColor: '#0F5132',
    backgroundColor: '#E9F5EF',
  },
  dayText: {
    color: '#111827',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#0F5132',
  },
  taskItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  taskTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  taskRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  taskName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  taskMeta: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  remove: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  noteToggle: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  noteToggleInline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  notePlay: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  noteBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  noteList: {
    gap: 2,
  },
  noteEntry: {
    gap: 4,
    marginTop: 6,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  noteText: {
    fontSize: 14,
    color: '#111827',
  },
  status: {
    fontSize: 13,
    color: '#4B5563',
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
    gap: 12,
  },
  closeButton: {
    marginTop: 8,
  },
});

export default Tasks;
