import { FC, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Member = {
  name: string;
};

type Props = {
  activeProject?: string;
  members?: Member[];
};

const Family: FC<Props> = ({ activeProject, members }) => {
  const team = useMemo<Member[]>(() => members ?? [], [members]);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Family</Text>
      <View style={styles.activeTask}>
        <Text style={styles.label}>Active Household Project</Text>
        <Text style={styles.value}>{activeProject?.trim() || 'None'}</Text>
      </View>

      <View style={styles.members}>
        <Text style={styles.label}>Household Members</Text>
        {team.length === 0 ? (
          <Text style={styles.empty}>No members listed.</Text>
        ) : (
          team.map((member, idx) => (
            <View key={`${member.name}-${idx}`} style={styles.memberSlot}>
              <Text style={styles.memberName}>{member.name || 'Member'}</Text>
            </View>
          ))
        )}
        <Text style={styles.add} onPress={() => setShowAdd(true)}>
          + Add member
        </Text>
      </View>

      <Modal
        visible={showAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Text style={styles.popupTitle}>Invite a Member</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrText}>QR Code</Text>
            </View>
            <TouchableOpacity style={styles.sponsorButton} onPress={() => setShowAdd(false)}>
              <Text style={styles.sponsorText}>Sponsor Member</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeLink} onPress={() => setShowAdd(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeTask: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  members: {
    gap: 8,
  },
  add: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F5132',
    marginBottom: 4,
  },
  memberSlot: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  empty: {
    fontSize: 14,
    color: '#6B7280',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  popup: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  qrPlaceholder: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  qrText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  sponsorButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F5132',
    alignItems: 'center',
  },
  sponsorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  closeText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Family;
