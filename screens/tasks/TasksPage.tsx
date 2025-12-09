import { FC, useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tasks from '../home/pages/Tasks';
import AddTask from '../AddTask';

type Props = {
  onGoHome?: () => void;
};

type NoteItem = {
  id: string;
  taskName: string;
  dueDate: string;
  note?: string;
  viewed: boolean;
};

const TasksPage: FC<Props> = ({ onGoHome }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const [tasksJson, slotStateJson, slotNotesJson, slotListJson, viewedJson] = await Promise.all([
        AsyncStorage.getItem('home-tasks'),
        AsyncStorage.getItem('home-task-slot-state'),
        AsyncStorage.getItem('home-task-slot-notes'),
        AsyncStorage.getItem('home-task-slot-note-list'),
        AsyncStorage.getItem('home-task-note-viewed'),
      ]);
      const tasks = tasksJson ? JSON.parse(tasksJson) : [];
      const slotState = slotStateJson ? JSON.parse(slotStateJson) : [];
      const slotNotes = slotNotesJson ? JSON.parse(slotNotesJson) : [];
      const slotList = slotListJson ? JSON.parse(slotListJson) : [];
      const viewedMap = viewedJson ? JSON.parse(viewedJson) : {};

      const list: NoteItem[] = [];

      if (Array.isArray(tasks) && Array.isArray(slotState)) {
        tasks.forEach((t, taskIndex) => {
          const slotIdx = slotState[taskIndex];
          if (typeof slotIdx === 'number' && slotIdx >= 0) {
            const notesForSlot = Array.isArray(slotList?.[slotIdx]) ? slotList[slotIdx] : null;
            if (notesForSlot && notesForSlot.length > 0) {
              notesForSlot.forEach((entry: any, idxNote: number) => {
                if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string') return;
                const trimmed = entry.text.trim();
                if (!trimmed) return;
                const id = `${t?.name ?? ''}|${t?.dueDate ?? ''}|${taskIndex}|${idxNote}`;
                list.push({
                  id,
                  taskName: t?.name ?? 'Task',
                  dueDate: t?.dueDate ?? '',
                  note: trimmed,
                  viewed: Boolean(viewedMap?.[id]),
                });
              });
            } else {
              const legacyNote = Array.isArray(slotNotes) ? slotNotes[slotIdx] : undefined;
              if (typeof legacyNote === 'string' && legacyNote.trim().length > 0) {
                const id = `${t?.name ?? ''}|${t?.dueDate ?? ''}|${taskIndex}`;
                list.push({
                  id,
                  taskName: t?.name ?? 'Task',
                  dueDate: t?.dueDate ?? '',
                  note: legacyNote,
                  viewed: Boolean(viewedMap?.[id]),
                });
              }
            }
          }
        });
      }

      setNotes(list);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const markViewed = useCallback(
    async (id: string) => {
      try {
        const viewedJson = await AsyncStorage.getItem('home-task-note-viewed');
        const viewedMap = viewedJson ? JSON.parse(viewedJson) : {};
        viewedMap[id] = true;
        await AsyncStorage.setItem('home-task-note-viewed', JSON.stringify(viewedMap));
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, viewed: true } : n)));
      } catch {
        // ignore
      }
    },
    [],
  );

  const markAllViewed = useCallback(async () => {
    try {
      const viewedJson = await AsyncStorage.getItem('home-task-note-viewed');
      const viewedMap = viewedJson ? JSON.parse(viewedJson) : {};
      notes.forEach((n) => {
        viewedMap[n.id] = true;
      });
      await AsyncStorage.setItem('home-task-note-viewed', JSON.stringify(viewedMap));
      setNotes((prev) => prev.map((n) => ({ ...n, viewed: true })));
    } catch {
      // ignore
    }
  }, [notes]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Tasks
          autoShowForm={false}
          showListWhenFormHidden
          onAddPress={() => setShowAddModal(true)}
        />
      </View>
      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setShowNotesModal(true)}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Listen to Notes</Text>
        </TouchableOpacity>
      </View>
      {onGoHome && (
        <TouchableOpacity style={[styles.button, styles.secondary, styles.footerButton]} onPress={onGoHome}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Back to Home</Text>
        </TouchableOpacity>
      )}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AddTask onClose={() => setShowAddModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Unviewed Notes</Text>
            <ScrollView style={styles.notesList} contentContainerStyle={styles.notesContent}>
              {notes.filter((n) => !n.viewed).length === 0 ? (
                <Text style={styles.empty}>No unviewed notes.</Text>
              ) : (
                notes
                  .filter((n) => !n.viewed)
                  .map((item) => (
                    <View key={item.id} style={styles.noteCard}>
                      <Text style={styles.noteTask}>{item.taskName}</Text>
                      <Text style={styles.noteMeta}>{item.dueDate ? `Due ${item.dueDate}` : 'No due date'}</Text>
                      {item.note ? <Text style={styles.noteBody}>{item.note}</Text> : null}
                      <TouchableOpacity
                        style={[styles.button, styles.primary]}
                        onPress={() => markViewed(item.id)}
                      >
                        <Text style={styles.buttonText}>Mark Viewed</Text>
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </ScrollView>
            <View style={styles.noteActions}>
              <TouchableOpacity style={[styles.button, styles.secondary, styles.half]} onPress={() => setShowNotesModal(false)}>
                <Text style={[styles.buttonText, styles.secondaryText]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primary, styles.half]} onPress={markAllViewed}>
                <Text style={styles.buttonText}>Mark All Viewed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  primary: {
    backgroundColor: '#0F5132',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#111827',
  },
  footerButton: {
    marginTop: 12,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  notesList: {
    maxHeight: 320,
  },
  notesContent: {
    gap: 10,
  },
  noteCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  noteTask: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  noteMeta: {
    fontSize: 13,
    color: '#4B5563',
  },
  noteBody: {
    fontSize: 14,
    color: '#111827',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default TasksPage;
