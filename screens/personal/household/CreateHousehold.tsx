import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { client } from '../../../lib/dataClient';

type Props = {
  onCreated: (household: any) => void;
  onBack: () => void;
};

export default function CreateHousehold({ onCreated, onBack }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Enter a household name');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data } = await client.models.Household.create({
        name: name.trim(),
        inviteCode,
      });
      
      if (data) {
        await client.models.HouseholdUser.create({
          householdId: data.id,
          userId: 'current-user',
          role: 'admin',
        });
        onCreated(data);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Household</Text>
      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Household name"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onBack}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Back</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#0F5132',
  },
  secondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#0F172A',
  },
  error: {
    color: '#B91C1C',
    fontSize: 13,
  },
});