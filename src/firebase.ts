
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// LA CONFIGURAZIONE CORRETTA E AGGIORNATA
const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.firebasestorage.app",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:c591c034fa132e549bb710",
  databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

// Logica di App Check separata per sviluppo e produzione
if (import.meta.env.DEV) {
  // AMBIENTE DI SVILUPPO (ANTEPRIMA)
  // Attiva la modalità di debug di App Check. Questo è il modo corretto e sicuro per lo sviluppo.
  // Genererà un token di debug nella console del browser.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log("Firebase App Check in modalità DEBUG. Cerca il token nella console del browser.");
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Ld84bMsAAAAAP_4_qsKx2a4MSgmc82Gg5k8-C6k'), // Chiave fittizia per localhost, ma il debug token la bypasserà
    isTokenAutoRefreshEnabled: true
  });
} else {
  // AMBIENTE DI PRODUZIONE (SITO ONLINE)
  // Usa la chiave reCAPTCHA V3 che hai configurato per il tuo dominio di produzione.
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Lfm5bMsAAAAAATbPGU1PmyLyR8QNNFvQsRMu-RC'), 
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
