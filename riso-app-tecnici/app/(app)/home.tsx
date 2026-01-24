import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext'; // Percorso relativo corretto

const HomeScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard Tecnici</Text>
      <Text style={styles.subtitle}>
        Benvenuto, {user ? user.email : 'Tecnico'}!
      </Text>
      
      {/* Aggiungeremo qui i componenti della dashboard */}
      
      <Button 
        mode="contained"
        onPress={logout} 
        style={styles.logoutButton}
        icon="logout"
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#8e8e93',
    marginBottom: 40,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 40,
    width: '90%',
    backgroundColor: '#FF3B30', // Colore per un'azione distruttiva come il logout
  },
});

export default HomeScreen;
