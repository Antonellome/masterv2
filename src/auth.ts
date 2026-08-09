
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db as firestoreDb } from './firebase'; // Importa istanza auth e firestore
import { useGlobalStore } from './stores/globalStore';
import { UserProfile } from './models/definitions';

/**
 * Recupera il profilo utente da Firestore.
 * @param uid L'UID dell'utente.
 * @returns Il profilo utente o null se non trovato.
 */
const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(firestoreDb, 'users', uid); // Assumiamo la collezione 'users'
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // Ricostruisce l'oggetto UserProfile con l'id del documento
      return { uid, ...userDocSnap.data() } as UserProfile;
    } else {
      console.warn(`Profilo utente non trovato per UID: ${uid}. L'utente potrebbe non avere permessi.`);
      return null;
    }
  } catch (error) {
    console.error("Errore nel recuperare il profilo utente:", error);
    return null;
  }
};

/**
 * Inizializza il listener per lo stato di autenticazione.
 * Aggiorna il globalStore con l'utente e il suo profilo.
 */
export const initializeAuth = () => {
  onAuthStateChanged(auth, async (user: User | null) => {
    const { setUser, setUserProfile, setIsAuthLoading } = useGlobalStore.getState();

    if (user) {
      // Utente autenticato
      setUser(user);
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    } else {
      // Utente non autenticato o sloggato
      setUser(null);
      setUserProfile(null);
    }

    // In ogni caso, il controllo iniziale dell'autenticazione è terminato.
    setIsAuthLoading(false);
  });
};
