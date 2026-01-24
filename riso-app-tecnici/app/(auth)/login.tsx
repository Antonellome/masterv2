import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Pressable
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext'; // Percorso relativo corretto
import { TextInput, Button } from 'react-native-paper'; // Usiamo componenti da react-native-paper

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email e password sono obbligatori.');
      return;
    }
    setError(null);
    try {
      await login(email, password);
      // La navigazione verrà gestita dal RootLayout
    } catch (err: any) {
      let errorMessage = 'Si è verificato un errore. Riprova.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Credenziali non valide. Controlla email e password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Il formato dell\'email non è valido.';
      }
      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        
        <View style={styles.logoContainer}>
          <Text style={styles.logoTextLine1}>R.I.S.O.</Text>
          <Text style={styles.logoTextLine2}>App Tecnici</Text>
        </View>

        <Text style={styles.subtitle}>Accedi con le tue credenziali</Text>
        
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={isLoading}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          disabled={isLoading}
        />

        <Button 
          mode="contained"
          onPress={handleLogin}
          disabled={isLoading}
          loading={isLoading}
          style={styles.button}
          labelStyle={styles.buttonText}
        >
          {!isLoading && "Accedi"}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e', // Un grigio scuro più moderno
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logoTextLine1: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoTextLine2: {
    fontSize: 26,
    color: '#3478F6', // Un blu più brillante
    marginTop: -5,
  },
  subtitle: {
    fontSize: 18,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#2c2c2e',
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#3478F6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default LoginScreen;
