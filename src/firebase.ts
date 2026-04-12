
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Configurazione Firebase centralizzata
const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.firebasestorage.app",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:c591c034fa132e549bb710",
  databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app"
};

// PATTERN SINGLETON: Inizializza l'app solo se non esiste già
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inizializzazione di App Check (una sola volta, dopo l'inizializzazione dell'app)
if (typeof window !== 'undefined') { // Assicura che il codice venga eseguito solo nel browser
  try {
    if (import.meta.env.DEV) {
      // AMBIENTE DI SVILUPPO (ANTEPRIMA)
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log("Firebase App Check in modalità DEBUG.");
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6Ld84bMsAAAAAP_4_qsKx2a4MSgmc82Gg5k8-C6k'), // Chiave fittizia per localhost
        isTokenAutoRefreshEnabled: true
      });
    } else {
      // AMBIENTE DI PRODUZIONE (SITO ONLINE) con la NUOVA CHIAVE
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6Lee77MsAAAAALdYGZlQ1p_hf2UleNSFLhRhvz-q'), 
        isTokenAutoRefreshEnabled: true
      });
    }
  } catch (error) {
    // Gestisce il caso in cui App Check sia già inizializzato, evitando crash
    if (String(error).includes('already-initialized')) {
      console.log("App Check è già inizializzato.");
    } else {
      console.error("Errore durante l'inizializzazione di App Check:", error);
    }
  }
}

// Esportazioni dei servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
