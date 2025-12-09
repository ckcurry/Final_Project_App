import { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Personal: FC = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Personal</Text>
      <Text style={styles.cardDescription}>
        Personal content will live here. Scroll left to return home.
      </Text>
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
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#374151',
  },
});

export default Personal;
