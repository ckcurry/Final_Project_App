import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signIn, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

type SignInProps = {
  onSignInSuccess: () => void;
  onSwitchToRegister: () => void;
};

export default function SignIn({ onSignInSuccess, onSwitchToRegister }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn({ username: email.trim(), password });
      onSignInSuccess();
    } catch (err: any) {
      console.log('Error details:', err);
      console.log('Error message:', err?.message);
      console.log('Error name:', err?.name);
      console.log('Underlying:', err?.underlyingError?.message);
      if (err?.name === 'UserNotConfirmedException' || err?.code === 'UserNotConfirmedException') {
        setNeedsConfirmation(true);
        setError('Please confirm your email first');
      } else {
        setError(err?.underlyingError?.message || err?.message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email.trim(), confirmationCode: confirmCode });
      setNeedsConfirmation(false);
      setConfirmCode('');
      await signIn({ username: email.trim(), password });
      onSignInSuccess();
    } catch (err: any) {
      if (err?.message?.includes('Current status is CONFIRMED')) {
        setNeedsConfirmation(false);
        await handleSignIn();
      } else {
        setError(err?.message ?? 'Confirmation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendSignUpCode({ username: email.trim() });
      setError('Code sent to your email');
    } catch (err: any) {
      setError(err?.message ?? 'Resend failed');
    }
  };

  if (needsConfirmation) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Confirm Email</Text>
        <Text style={styles.subtitle}>Enter code sent to {email}</Text>
        <View style={styles.form}>
          <TextInput
            value={confirmCode}
            onChangeText={setConfirmCode}
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
            <Text style={styles.buttonText}>{loading ? 'Confirming...' : 'Confirm & Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleResend}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Resend Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setNeedsConfirmation(false)}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Back</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <View style={styles.form}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onSwitchToRegister}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Need an account? Sign up</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
    marginBottom: 24,
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
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
});
