import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Task = {
  name: string;
  dueDate: string;
  recurrence: string;
  category: string;
};

const categoryStyles: Record<string, { color: string; bg: string }> = {
  Household: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  Hobby: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  Education: { color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  Personal: { color: '#DB2777', bg: 'rgba(219, 39, 119, 0.12)' },
};

type Props = {
  onSelectDate?: (isoDate: string) => void;
};

const Calendar: FC<Props> = ({ onSelectDate }) => {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const sub = DeviceEventEmitter.addListener('tasks-updated', loadTasks);
    return () => {
      sub.remove();
    };
  }, [loadTasks]);

  useEffect(() => {
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;
    setSelectedDate(defaultDate);
  }, [today]);

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

  const { monthName, year, weeks, daysWithTasks } = useMemo(() => {
    const monthName = monthCursor.toLocaleString('default', { month: 'long' });
    const year = monthCursor.getFullYear();

    const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();

    const slots: Array<number | null> = Array(startDay).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      slots.push(day);
    }
    while (slots.length % 7 !== 0) slots.push(null);

    const weeks: Array<Array<number | null>> = [];
    for (let i = 0; i < slots.length; i += 7) {
      weeks.push(slots.slice(i, i + 7));
    }

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

  const goMonth = useCallback((delta: number) => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);

  const tasksForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const dateObj = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) return [];
    return tasks.filter((t) => occursOnDate(t, dateObj));
  }, [selectedDate, tasks, occursOnDate]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => goMonth(-1)}>
          <Text style={styles.nav}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.cardLabel}>{`${monthName} ${year}`}</Text>
          <Text style={styles.cardDescription}>Tap a day to view its tasks.</Text>
        </View>
        <TouchableOpacity onPress={() => goMonth(1)}>
          <Text style={styles.nav}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {weekdayLabels.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.weeks}>
        {weeks.map((week, idx) => (
          <View key={`week-${idx}`} style={styles.weekRow}>
            {week.map((day, dayIdx) => {
              const isSelected =
                day &&
                selectedDate ===
                  `${year}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = day ? daysWithTasks.get(day) ?? [] : [];
              return (
                <TouchableOpacity
                  key={`day-${idx}-${dayIdx}`}
                  style={[styles.dayCell, isSelected ? styles.daySelected : null]}
                  disabled={!day}
                  onPress={() => {
                    if (!day) return;
                    const formatted = `${year}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}-${String(
                      day,
                    ).padStart(2, '0')}`;
                    setSelectedDate(formatted);
                    onSelectDate?.(formatted);
                  }}
                >
                  {day ? (
                    <>
                      <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : null]}>{day}</Text>
                      <View style={styles.dotsRow}>
                        {dayTasks.slice(0, 3).map((task, i) => {
                          const color = categoryStyles[task.category ?? 'Personal']?.color ?? '#111827';
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

      {selectedDate && (
        <View style={styles.tasksBox}>
          <Text style={styles.tasksHeading}>Tasks on {selectedDate}</Text>
          {tasksForSelectedDay.length === 0 ? (
            <Text style={styles.empty}>No tasks for this day.</Text>
          ) : (
            tasksForSelectedDay.map((task, idx) => {
              const color = categoryStyles[task.category ?? 'Personal']?.color ?? '#111827';
              const bg = categoryStyles[task.category ?? 'Personal']?.bg ?? '#F3F4F6';
              return (
                <View key={`${task.name}-${idx}`} style={styles.taskRow}>
                  <View style={[styles.categoryPill, { borderColor: color, backgroundColor: bg }]}>
                    <Text style={[styles.categoryText, { color }]}>{task.category ?? 'Personal'}</Text>
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <Text style={styles.taskMeta}>{task.recurrence}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#374151',
  },
  nav: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F5132',
    paddingHorizontal: 12,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '600',
  },
  weeks: {
    gap: 6,
    marginTop: 8,
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
    backgroundColor: '#F9FAFB',
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
  tasksBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  tasksHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  taskMeta: {
    fontSize: 13,
    color: '#4B5563',
  },
});

export default Calendar;
