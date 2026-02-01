
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from './firebase'; // Assumiamo che db sia esportato da firebase.js

function AccessoApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Livello 1: Autenticazione
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Livello 2: Autorizzazione
      const userDocRef = doc(db, "tecnici", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().accessoApp === true) {
        // Utente autenticato e autorizzato
        console.log("Accesso consentito!");
        // Qui andrebbe la logica per reindirizzare l'utente
      } else {
        // Utente autenticato ma non autorizzato
        setError("Utente non autorizzato.");
        // Logout per sicurezza
        auth.signOut();
      }
    } catch (error) {
      // Errore di autenticazione (es. password sbagliata)
      setError("Credenziali non valide o utente non trovato.");
      console.error("Errore di accesso:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: '40px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white', width: '300px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Accesso Tecnici</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
          {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default AccessoApp;
