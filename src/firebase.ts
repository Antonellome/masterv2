
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

/* 
// Blocco di debug disattivato per testare la modalità produzione
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log("Firebase App Check in modalità DEBUG. Cerca il token nella console.");
}
*/

// Inizializza App Check con la tua chiave reCAPTCHA V3
// Ora questo blocco verrà eseguito sempre, sia in dev che in prod.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Lfm5bMsAAAAAATbPGU1PmyLyR8QNNFvQsRMu-RC'), 
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
