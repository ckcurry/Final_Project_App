import { FC } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  types: string[];
  selectedType?: string;
  selectedRoom?: string | null;
  roomsOpen?: boolean;
  deleteMode?: boolean;
  onSelectType?: (type: string) => void;
  onToggleRooms?: () => void;
  onSelectRoom?: (room: string) => void;
  onDeleteType?: (type: string) => void;
};

const roomOptions = ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom'];

const HouseholdTasks: FC<Props> = ({
  types,
  selectedType,
  selectedRoom,
  roomsOpen,
  deleteMode,
  onSelectType,
  onToggleRooms,
  onSelectRoom,
  onDeleteType,
}) => {
  const isSelected = (label: string) => selectedType === label;

  const handleTypePress = (type: string) => {
    if (deleteMode) {
      onDeleteType?.(type);
      return;
    }
    onSelectType?.(type);
  };

  return (
    <View style={styles.container}>
      {types.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.button,
            isSelected(type) && styles.buttonActive,
            deleteMode && styles.buttonDeleteMode,
          ]}
          onPress={() => handleTypePress(type)}
        >
          <Text
            style={[
              styles.text,
              isSelected(type) && styles.textActive,
              deleteMode && styles.textDeleteMode,
            ]}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.button,
          styles.roomsButton,
          isSelected('Rooms') && styles.buttonActive,
        ]}
        onPress={() => {
          if (deleteMode) return;
          onToggleRooms?.();
        }}
      >
        <Text style={[styles.text, isSelected('Rooms') && styles.textActive]}>Rooms</Text>
      </TouchableOpacity>

      {roomsOpen ? (
        <View style={styles.roomsList}>
          {roomOptions.map((room) => {
            const active = selectedRoom === room && selectedType === 'Rooms';
            return (
              <TouchableOpacity
                key={room}
                style={[styles.roomPill, active && styles.roomPillActive]}
                onPress={() => onSelectRoom?.(room)}
              >
                <Text style={[styles.roomText, active && styles.roomTextActive]}>{room}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  button: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F5132',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#08331E',
  },
  buttonDeleteMode: {
    backgroundColor: '#B91C1C',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textDeleteMode: {
    color: '#FFFFFF',
  },
  roomsButton: {
    flexBasis: '100%',
  },
  roomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  roomPillActive: {
    backgroundColor: '#0F5132',
  },
  roomText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  roomTextActive: {
    color: '#FFFFFF',
  },
});

export default HouseholdTasks;
