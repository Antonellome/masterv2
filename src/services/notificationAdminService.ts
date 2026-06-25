import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const getAllTecnici = async () => {
  const tecniciCollection = collection(db, 'tecnici');
  const tecniciSnapshot = await getDocs(tecniciCollection);
  const tecniciList = tecniciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return tecniciList;
};

export const inviaNotifica = async (tecnicoId: string, titolo: string, corpo: string) => {
  const notificheCollection = collection(db, 'notifiche');
  await addDoc(notificheCollection, {
    tecnicoId,
    titolo,
    corpo,
    data: new Date(),
    letta: false,
  });
};
