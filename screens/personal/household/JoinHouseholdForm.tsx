import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { client } from '../../../lib/dataClient';

type Props = {
  onJoined: (household: any) => void;
  onBack: () => void;
};

export default function JoinHouseholdForm({ onJoined, onBack }: Props) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Enter an invite code');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const { data: households } = await client.models.Household.list({
        filter: { inviteCode: { eq: inviteCode.trim().toUpperCase() } }
      });
      
      if (!households || households.length === 0) {
        setError('Invalid invite code');
        return;
      }
      
      const household = households[0];
      await client.models.HouseholdUser.create({
        householdId: household.id,
        userId: 'current-user',
        role: 'member',
      });
      
      onJoined(household);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to join household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Household</Text>
      <View style={styles.form}>
        <TextInput
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Invite code"
          autoCapitalize="characters"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Joining...' : 'Join'}</Text>
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