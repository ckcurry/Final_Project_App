import { FC, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  onMakeProject?: () => void;
};

const HouseholdProjects: FC<Props> = ({ onMakeProject }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [milestones, setMilestones] = useState<string[]>(['']);

  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, '']);
  };

  const handleUpdateMilestone = (index: number, value: string) => {
    setMilestones((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    // Placeholder: wire into persistence if needed
    onMakeProject?.();
    setCreating(false);
    setName('');
    setMilestones(['']);
  };

  return (
    <View style={styles.card}>
      {!creating ? (
        <>
          <TouchableOpacity
            style={styles.makeButton}
            onPress={() => {
              setCreating(true);
            }}
          >
            <Text style={styles.makeText}>Make Project</Text>
          </TouchableOpacity>
          <View style={styles.emptyState}>
            <Text style={styles.title}>Projects</Text>
            <Text style={styles.subtitle}>Create a household project to track milestones.</Text>
          </View>
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>New Household Project</Text>
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter project name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Milestones</Text>
          <View style={styles.milestoneList}>
            {milestones.map((milestone, index) => (
              <TextInput
                key={`${index}`}
                style={styles.input}
                placeholder={`Milestone ${index + 1}`}
                placeholderTextColor="#9CA3AF"
                value={milestone}
                onChangeText={(text) => handleUpdateMilestone(index, text)}
              />
            ))}
          </View>
          <TouchableOpacity style={[styles.smallButton, styles.secondary]} onPress={handleAddMilestone}>
            <Text style={[styles.makeText, styles.secondaryText]}>+ Add Milestone</Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.smallButton, styles.secondary]}
              onPress={() => {
                setCreating(false);
                setName('');
                setMilestones(['']);
              }}
            >
              <Text style={[styles.makeText, styles.secondaryText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.primary]} onPress={handleSave}>
              <Text style={styles.makeText}>Save Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  makeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F5132',
  },
  makeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    gap: 4,
  },
  form: {
    gap: 10,
  },
  label: {
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
  milestoneList: {
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primary: {
    backgroundColor: '#0F5132',
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
});

export default HouseholdProjects;
