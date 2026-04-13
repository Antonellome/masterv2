
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// LA CHIAVE CORRETTA (reCAPTCHA v3 Standard) per la produzione
const RECAPTCHA_KEY = '6Lcp2LUsAAAAALannRMeNzgFLMHd_272Jo6MBAXM';

// PATTERN SINGLETON: Inizializza l'app solo se non esiste già
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inizializzazione di App Check
if (typeof window !== 'undefined') { // Assicura che il codice venga eseguito solo nel browser
  try {
    let appCheckProvider;

    if (import.meta.env.DEV) {
      // In SVILUPPO, usiamo un CustomProvider per generare un token fittizio.
      // Questo evita gli errori di reCAPTCHA nella console e velocizza i test.
      // Funziona perché abbiamo disabilitato l'enforcement di App Check sul backend per Auth.
      console.log("App in modalità sviluppo. Inizializzo App Check con un provider fittizio.");
      appCheckProvider = new CustomProvider({
        getToken: () => Promise.resolve({
          token: "dev-mode-fake-token",
          expireTimeMillis: Date.now() + 60 * 60 * 1000, // Scade tra 1 ora
        }),
      });
    } else {
      // In PRODUZIONE, usiamo il provider reCAPTCHA v3 standard per la sicurezza.
      appCheckProvider = new ReCaptchaV3Provider(RECAPTCHA_KEY);
    }

    initializeAppCheck(app, {
      provider: appCheckProvider,
      isTokenAutoRefreshEnabled: true
    });

  } catch (error) {
    if (String(error).includes('already-initialized')) {
      // Questo non è un errore critico, l'app check è già attivo.
    } else {
      console.error("Errore critico durante l'inizializzazione di App Check:", error);
    }
  }
}

// Esportazioni dei servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
