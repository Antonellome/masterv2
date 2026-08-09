import { create } from 'zustand';

// Placeholder per lo stato. Verrà espanso nelle fasi successive.
interface GlobalState {
  // Esempio: user, tecnici, ecc.
}

export const useGlobalStore = create<GlobalState>((set) => ({
  // Stato iniziale
}));
