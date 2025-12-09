import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

type ConfirmSignUpProps = {
  email: string;
  onConfirmed: () => void;
  onBack: () => void;
};

export default function ConfirmSignUp({ email, onConfirmed, onBack }: ConfirmSignUpProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setSuccess('Email confirmed! You can now sign in.');
      setTimeout(() => onConfirmed(), 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    try {
      await resendSignUpCode({ username: email });
      setSuccess('Code resent to your email');
    } catch (err: any) {
      setError(err?.message ?? 'Resend failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Email</Text>
      <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
      <View style={styles.form}>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Confirmation code"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Confirming...' : 'Confirm'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleResend}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Resend Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onBack}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Back to Sign In</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  form: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111827',
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
  error: {
    fontSize: 13,
    color: '#B91C1C',
  },
  success: {
    fontSize: 13,
    color: '#059669',
  },
});
