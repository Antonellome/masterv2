
// Importa le funzioni necessarie dal Firebase SDK
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Chiama la Cloud Function 'markNotificationAsRead' per marcare 
 * una notifica come letta.
 *
 * @param {string} notificationId L'ID del documento della notifica in Firestore.
 * @returns {Promise<boolean>} Ritorna true in caso di successo, false altrimenti.
 */
export const markNotificationAsReadOnServer = async (notificationId: string): Promise<boolean> => {
  // Validazione dell'input nel client per fallire velocemente
  if (!notificationId) {
    console.error("ID notifica non fornito. Impossibile procedere.");
    return false;
  }

  try {
    // Ottiene l'istanza delle Functions
    const functions = getFunctions();
    
    // Crea un riferimento alla nostra Cloud Function 'callable'
    const markAsRead = httpsCallable(functions, 'markNotificationAsRead');
    
    console.log(`[CLIENT] Chiamata al server per marcare la notifica ${notificationId} come letta...`);
    
    // Chiama la funzione passando l'ID della notifica
    const result: any = await markAsRead({ notificationId: notificationId });
    
    // La nostra funzione sul server restituisce { status: 'success', ... }
    if (result.data.status === 'success') {
      console.log(`[SERVER] Successo:`, result.data.message);
      // L'aggiornamento UI avverrà automaticamente grazie a onSnapshot
      return true;
    } else {
      // Gestisce un caso in cui il server risponde ma non con successo
      console.error("[SERVER] La funzione ha risposto ma senza successo:", result.data);
      return false;
    }

  } catch (error: any) {
    // Gestisce errori di rete o errori lanciati dalla Cloud Function
    console.error("[CLIENT] Errore durante la chiamata alla Cloud Function:", error.message);
    return false;
  }
};
