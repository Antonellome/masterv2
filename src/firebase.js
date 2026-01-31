
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "IzaSyC344Gv7Y2l82oBcVg43Loka_408_I51axA",
  authDomain: "rapportini-dd61d.firebaseapp.com",
  projectId: "rapportini-dd61d",
  storageBucket: "rapportini-dd61d.appspot.com",
  messagingSenderId: "922969634761",
  appId: "1:922969634761:web:322e6f4a594181b14a6316"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta i servizi che ti servono
export const auth = getAuth(app);
export const db = getFirestore(app);
