
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from "firebase/app-check";

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


const RECAPTCHA_KEY = '6Lcp2LUsAAAAALannRMeNzgFLMHd_272Jo6MBAXM';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CORREZIONE: Usiamo la dimensione minima consentita per la cache (1MB) invece di 0.
// Questo risolve il crash e forza la rinizializzazione della cache.
const db = initializeFirestore(app, { cacheSizeBytes: 1048576 });


if (typeof window !== 'undefined') { 
  try {
    let appCheckProvider;

    if (import.meta.env.DEV) {
      console.log("App in modalità sviluppo. Inizializzo App Check con un provider fittizio.");
      appCheckProvider = new CustomProvider({
        getToken: () => Promise.resolve({
          token: "dev-mode-fake-token",
          expireTimeMillis: Date.now() + 60 * 60 * 1000, 
        }),
      });
    } else {
      appCheckProvider = new ReCaptchaV3Provider(RECAPTCHA_KEY);
    }

    initializeAppCheck(app, {
      provider: appCheckProvider,
      isTokenAutoRefreshEnabled: true
    });

  } catch (error) {
    if (String(error).includes('already-initialized')) {
    } else {
      console.error("Errore critico durante l'inizializzazione di App Check:", error);
    }
  }
}

export const auth = getAuth(app);
export { db }; // Esportiamo l'istanza del db modificata
export const functions = getFunctions(app, 'europe-west1');
