import { FC, useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HouseholdTasks from './HouseholdTasks';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type HouseholdTask = { name: string; type: string };
const baseTypes = ['Laundry', 'Dusting', 'Vacuum', 'Dishes'];

const Household: FC = () => {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showTasks, setShowTasks] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Laundry');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [savedTasks, setSavedTasks] = useState<HouseholdTask[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const tasksStorageKey = 'household-tasks';
  const typesStorageKey = 'household-task-types';
  const allTypes = useMemo(() => [...baseTypes, ...customTypes], [customTypes]);
  const [showLaundryDays, setShowLaundryDays] = useState(false);
  const [laundryDays, setLaundryDays] = useState<Set<string>>(new Set());
  const [doAllLaundry, setDoAllLaundry] = useState(false);
  const [showLaundryOnCalendar, setShowLaundryOnCalendar] = useState(false);
  const laundryStorageKey = 'household-laundry-settings';

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const saved = await AsyncStorage.getItem(tasksStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSavedTasks(parsed);
          }
        }
      } catch {
        // ignore load errors
      }
    };
    const loadTypes = async () => {
      try {
        const saved = await AsyncStorage.getItem(typesStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCustomTypes(parsed.filter((t) => typeof t === 'string'));
          }
        }
      } catch {
        // ignore
      }
    };
    const loadLaundry = async () => {
      try {
        const saved = await AsyncStorage.getItem(laundryStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.days)) {
              setLaundryDays(new Set(parsed.days.filter((d: unknown) => typeof d === 'string')));
            }
            if (typeof parsed.all === 'boolean') {
              setDoAllLaundry(parsed.all);
            }
          }
        }
      } catch {
        // ignore
      }
    };
    loadTasks();
    loadTypes();
    loadLaundry();
  }, []);

  useEffect(() => {
    const payload = {
      days: Array.from(laundryDays),
      all: doAllLaundry,
    };
    AsyncStorage.setItem(laundryStorageKey, JSON.stringify(payload)).catch(() => {});
  }, [laundryDays, doAllLaundry]);

  const { monthName, year, weeks } = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const start = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = start.getDay(); // 0 = Sunday

    const leadingBlanks: Array<number | null> = Array.from({ length: startDay }, () => null);
    const monthDays: number[] = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const cells: Array<number | null> = [...leadingBlanks, ...monthDays];
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: Array<Array<number | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    const monthName = monthCursor.toLocaleString('default', { month: 'long' });
    return { monthName, year, weeks };
  }, [monthCursor]);

  const goMonth = (delta: number) => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Household Calendar</Text>
        <View style={styles.monthSwitcher}>
          <TouchableOpacity style={styles.switchButton} onPress={() => goMonth(-1)}>
            <Text style={styles.switchText}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {monthName} {year}
          </Text>
          <TouchableOpacity style={styles.switchButton} onPress={() => goMonth(1)}>
            <Text style={styles.switchText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {dayLabels.map((label) => (
            <Text key={label} style={[styles.cell, styles.weekday]}>
              {label}
            </Text>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const isLaundry =
                showLaundryOnCalendar &&
                !!day &&
                (doAllLaundry ||
                  (() => {
                    const dow = new Date(year, monthCursor.getMonth(), day).getDay();
                    const label = dayLabels[dow];
                    return laundryDays.has(label);
                  })());
              return (
                <View key={`${weekIndex}-${dayIndex}`} style={styles.cell}>
                  {day ? (
                    <>
                      <Text style={styles.dayNumber}>{day}</Text>
                      {isLaundry ? (
                        <View style={styles.laundryDot}>
                          <Text style={styles.laundryDotText}>L</Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setShowTasks(true);
            setDeleteMode(false);
            setAddingTask(false);
            setShowLaundryDays(false);
            setShowLaundryOnCalendar(false);
          }}
        >
          <Text style={styles.actionText}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>News</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Family</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTasks}
        animationType="slide"
        onRequestClose={() => setShowTasks(false)}
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Household Tasks</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    styles.deleteButton,
                    deleteMode && styles.deleteActive,
                    deleteMode && styles.deleteWide,
                  ]}
                  onPress={() => {
                    setAddingTask(false);
                    setDeleteMode((prev) => !prev);
                    setShowLaundryDays(false);
                    setShowLaundryOnCalendar(false);
                  }}
                >
                  <Text style={styles.iconText}>{deleteMode ? 'Done' : '-'}</Text>
                </TouchableOpacity>
                {!deleteMode ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      setDeleteMode(false);
                      setAddingTask(true);
                      setShowLaundryDays(false);
                      setShowLaundryOnCalendar(false);
                    }}
                  >
                    <Text style={styles.iconText}>+</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowTasks(false);
                    setDeleteMode(false);
                    setAddingTask(false);
                    setShowLaundryOnCalendar(false);
                  }}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            {addingTask ? (
              <View style={styles.addTaskCard}>
                <Text style={styles.inputLabel}>New Task Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter task name"
                  placeholderTextColor="#9CA3AF"
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  autoFocus
                />
                <View style={styles.addActions}>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.secondaryBtn]}
                    onPress={() => {
                      setAddingTask(false);
                      setNewTaskName('');
                    }}
                  >
                    <Text style={styles.smallText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.primaryBtn]}
                    onPress={async () => {
                      const trimmed = newTaskName.trim();
                      if (!trimmed) return;
                      const newType = trimmed;
                      const nextTypes =
                        baseTypes.includes(newType) || customTypes.includes(newType)
                          ? customTypes
                          : [...customTypes, newType];
                      const typeLabel =
                        selectedType === 'Rooms' && selectedRoom ? `Rooms - ${selectedRoom}` : newType;
                      const next: HouseholdTask[] = [...savedTasks, { name: newType, type: typeLabel }];
                      try {
                        await AsyncStorage.setItem(tasksStorageKey, JSON.stringify(next));
                        await AsyncStorage.setItem(typesStorageKey, JSON.stringify(nextTypes));
                        setSavedTasks(next);
                        setCustomTypes(nextTypes);
                        setSelectedType(newType);
                        setSelectedRoom(null);
                        setRoomsOpen(false);
                        setShowLaundryDays(newType === 'Laundry');
                      } catch {
                        // ignore save errors
                      }
                      setAddingTask(false);
                      setNewTaskName('');
                    }}
                  >
                    <Text style={[styles.smallText, styles.primaryText]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : showLaundryDays ? (
              <View style={styles.laundryCard}>
                <Text style={styles.modalTitle}>Laundry Days</Text>
                <Text style={styles.inputLabel}>Pick the days for laundry</Text>
                <TouchableOpacity
                  style={[styles.checkRow, doAllLaundry && styles.checkRowActive]}
                  onPress={() => setDoAllLaundry((prev) => !prev)}
                >
                  <View style={[styles.checkbox, doAllLaundry && styles.checkboxChecked]}>
                    {doAllLaundry ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.checkLabel, doAllLaundry && styles.checkLabelActive]}>
                    Doing all laundry
                  </Text>
                </TouchableOpacity>
                <View style={styles.dayGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                    const active = laundryDays.has(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayPill, active && styles.dayPillActive]}
                        onPress={() => {
                          if (doAllLaundry) return;
                          setLaundryDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(day)) {
                              next.delete(day);
                            } else {
                              next.add(day);
                            }
                            return next;
                          });
                        }}
                      >
                        <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.smallButton, styles.primaryBtn]}
                  onPress={() => setShowLaundryDays(false)}
                >
                  <Text style={[styles.smallText, styles.primaryText]}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <HouseholdTasks
                types={allTypes}
                selectedType={selectedType}
                selectedRoom={selectedRoom}
                roomsOpen={roomsOpen}
                deleteMode={deleteMode}
                onSelectType={(type) => {
                  if (deleteMode) return;
                  setSelectedType(type);
                  const isLaundry = type === 'Laundry';
                  setShowLaundryDays(isLaundry);
                  setShowLaundryOnCalendar(isLaundry);
                  if (type !== 'Rooms') {
                    setSelectedRoom(null);
                    setRoomsOpen(false);
                  }
                }}
                onToggleRooms={() => {
                  if (deleteMode) return;
                  setRoomsOpen((prev) => !prev);
                  setSelectedType('Rooms');
                  setShowLaundryDays(false);
                  setShowLaundryOnCalendar(false);
                }}
                onSelectRoom={(room) => {
                  if (deleteMode) return;
                  setSelectedType('Rooms');
                  setSelectedRoom(room);
                  setShowLaundryDays(false);
                  setShowLaundryOnCalendar(false);
                }}
                onDeleteType={(type) => {
                  if (baseTypes.includes(type)) return;
                  const nextTypes = customTypes.filter((t) => t !== type);
                  setCustomTypes(nextTypes);
                  AsyncStorage.setItem(typesStorageKey, JSON.stringify(nextTypes)).catch(() => {});
                  if (selectedType === type) {
                    const fallback = nextTypes[0] ?? baseTypes[0];
                    setSelectedType(fallback);
                  }
                  setDeleteMode(false);
                  setShowLaundryDays(false);
                  setShowLaundryOnCalendar(false);
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  switchButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekday: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
  },
  dayNumber: {
    fontSize: 14,
    color: '#111827',
  },
  laundryDot: {
    marginTop: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laundryDotText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  addTaskCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtn: {
    backgroundColor: '#F3F4F6',
  },
  primaryBtn: {
    backgroundColor: '#0F5132',
  },
  smallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#B91C1C',
  },
  deleteActive: {
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  deleteWide: {
    minWidth: 64,
    paddingHorizontal: 12,
  },
  laundryCard: {
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkRowActive: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  checkLabelActive: {
    color: '#0F5132',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  dayPillActive: {
    backgroundColor: '#0F5132',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
});

export default Household;
