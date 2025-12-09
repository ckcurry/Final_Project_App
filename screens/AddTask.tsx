import { FC, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Tasks from './home/pages/Tasks';

type Props = {
  onClose?: () => void;
  initialDueDate?: string;
};

const AddTask: FC<Props> = ({ onClose, initialDueDate }) => {
  const [showForm, setShowForm] = useState(true);

  return (
    <View style={styles.card}>
      {showForm ? (
        <Tasks
          autoShowForm
          showCalendarInline
          showListWhenFormHidden={false}
          initialDueDate={initialDueDate}
          onCloseCalendar={onClose}
        />
      ) : (
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => setShowForm(true)}>
          <Text style={styles.buttonText}>Add Task</Text>
        </TouchableOpacity>
      )}
      {onClose && (
        <TouchableOpacity style={[styles.button, styles.secondary, styles.closeButton]} onPress={onClose}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#111827',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
});

export default AddTask;
