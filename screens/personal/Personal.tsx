import { FC, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Household from './household/Household';

type Props = {
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  onHouseholdPress?: () => void;
};

const Personal: FC<Props> = ({ onMenuPress, onProfilePress, onHouseholdPress }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHousehold, setShowHousehold] = useState(false);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    onMenuPress?.();
  };

  const selectProfile = () => {
    setMenuOpen(false);
    setShowHousehold(false);
    onProfilePress?.();
  };

  const selectHousehold = () => {
    setMenuOpen(false);
    setShowHousehold(true);
    onHouseholdPress?.();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardLabel}>{showHousehold ? 'Household' : 'Personal'}</Text>
        <View style={styles.menuWrapper}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Text style={styles.menuText}>Menu</Text>
          </TouchableOpacity>
          {menuOpen ? (
            <View style={styles.dropdown}>
              <TouchableOpacity style={styles.dropdownButton} onPress={selectProfile}>
                <Text style={styles.dropdownText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownButton} onPress={selectHousehold}>
                <Text style={styles.dropdownText}>Household</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
      {showHousehold ? (
        <Household />
      ) : (
        <Text style={styles.cardDescription}>
          Personal content will live here. Scroll left to return home.
        </Text>
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
    gap: 8,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  menuWrapper: {
    position: 'relative',
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: '#374151',
  },
});

export default Personal;
