
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
    authDomain: "riso-project-app.firebaseapp.com",
    databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riso-project-app",
    storageBucket: "riso-project-app.firebasestorage.app",
    messagingSenderId: "157316892209",
    appId: "1:157316892209:web:c591c034fa132e549bb710"
};

// Inizializza Firebase in modo sicuro, prevenendo la ri-creazione in ambiente di hot-reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Esporta le istanze dei servizi Firebase che verranno utilizzate nell'app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
