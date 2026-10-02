import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { firestore } from './firebaseConfig';
import { db } from '@/db/database';
import { CheckinRecord, Tecnico, Luogo, Nave } from '@/models/definitions';
import dayjs from 'dayjs';

const robustToDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Timestamp) {
    return dateValue.toDate();
  }
  if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
  }
  const d = dayjs(dateValue);
  return d.isValid() ? d.toDate() : null;
};

const processCheckin = async (doc: any): Promise<CheckinRecord | null> => {
  const docData = doc.data();
  if (!docData) return null;

  const id = doc.id;
  const checkinId = docData.checkinId || id;

  if (!checkinId) {
    console.warn('Record di check-in scartato: ID mancante', docData);
    return null;
  }

  const data = robustToDate(docData.data);
  const oraReale = robustToDate(docData.oraReale);

  if (!data || !oraReale) {
      console.warn('Record di check-in scartato: data o oraReale non valide', docData);
      return null;
  }

  // Arricchimento dei dati
  let luogoNome = '-';
  if (docData.luogoId) {
      const luogo = await db.luoghi.get(docData.luogoId);
      luogoNome = luogo?.nome || 'Luogo non trovato';
  }

  let naveNome = '-';
  if (docData.naveId) {
      const nave = await db.navi.get(docData.naveId);
      naveNome = nave?.nome || 'Nave non trovata';
  }

  return {
    id: checkinId,
    checkinId: checkinId,
    tecnicoId: docData.tecnicoId || '',
    tecnicoNome: docData.tecnicoNome || 'Sconosciuto',
    tipoCheckin: docData.tipoCheckin || 'NON_DEFINITO',
    oraImpostata: docData.oraImpostata || '--:--',
    oraReale: oraReale,
    data: data,
    luogoId: docData.luogoId,
    naveId: docData.naveId,
    luogoNome: luogoNome,
    naveNome: naveNome,
  };
};

export const setupFirestoreListeners = () => {
  console.log("Impostazione dei listener di Firestore...");

  const checkinsQuery = query(collection(firestore, 'checkins'));
  onSnapshot(checkinsQuery, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'removed') {
        db.checkins.delete(change.doc.id).catch(err => {
            console.error("Errore nell'eliminare il check-in in Dexie:", err);
        });
        return;
      }

      const processedCheckin = await processCheckin(change.doc);
      if (processedCheckin) {
        db.checkins.put(processedCheckin).catch(err => {
          console.error("Errore nel salvare il check-in in Dexie:", err);
        });
      }
    });
  }, (error) => {
      console.error("Errore nel listener di checkins:", error);
  });

  const tecniciQuery = query(collection(firestore, 'tecnici'));
  onSnapshot(tecniciQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const docData = change.doc.data();
      const id = change.doc.id;
      if (change.type === 'added' || change.type === 'modified') {
        const nome = docData.nomeCognome || docData.name || 'Sconosciuto';
        db.tecnici.put({ id, nome } as Tecnico).catch(err => console.error('Errore DB Tecnici:', err));
      }
      if (change.type === 'removed') {
        db.tecnici.delete(id).catch(err => console.error('Errore DB Tecnici:', err));
      }
    });
  }, (error) => {
      console.error("Errore nel listener di tecnici:", error);
  });

  const naviQuery = query(collection(firestore, 'navi'));
  onSnapshot(naviQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const docData = change.doc.data();
      const id = change.doc.id;
      if (change.type === 'added' || change.type === 'modified') {
        const nome = docData.nome || 'Sconosciuta';
        db.navi.put({ id, nome } as Nave).catch(err => console.error('Errore DB Navi:', err));
      }
      if (change.type === 'removed') {
        db.navi.delete(id).catch(err => console.error('Errore DB Navi:', err));
      }
    });
  }, (error) => {
      console.error("Errore nel listener di navi:", error);
  });

  const luoghiQuery = query(collection(firestore, 'luoghi'));
  onSnapshot(luoghiQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const docData = change.doc.data();
      const id = change.doc.id;
      if (change.type === 'added' || change.type === 'modified') {
        const nome = docData.nome || 'Sconosciuto';
        db.luoghi.put({ id, nome } as Luogo).catch(err => console.error('Errore DB Luoghi:', err));
      }
      if (change.type === 'removed') {
        db.luoghi.delete(id).catch(err => console.error('Errore DB Luoghi:', err));
      }
    });
  }, (error) => {
      console.error("Errore nel listener di luoghi:", error);
  });

  console.log("Listener di Firestore impostati.");
};