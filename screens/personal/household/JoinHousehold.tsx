import { FC } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onJoin?: () => void;
  onCreate?: () => void;
};

const JoinHousehold: FC<Props> = ({ onJoin, onCreate }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Household</Text>
      <Text style={styles.subtitle}>Join an existing household or create a new one.</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={onJoin}>
          <Text style={styles.buttonText}>Join a Household</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onCreate}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Create a Household</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
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
});

export default JoinHousehold;
