// In questo file definiremo tutte le interfacce e i tipi di dati condivisi nell'applicazione.

// Esempio che andremo a espandere:
export interface User {
  uid: string;
  nome: string;
  email: string;
  codiceAttivazione: string;
  ultimoAccesso: number;
  // ...altri campi dal documento utente di Firestore
}

export interface Ship {
  id: string;
  name: string;
  // ...altri campi
}

export interface Location {
  id: string;
  name: string;
  // ...altri campi
}

export interface Report {
  id: string;
  // ...definiremo la struttura del rapportino qui
}
