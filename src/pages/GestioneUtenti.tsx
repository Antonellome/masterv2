import React, { useState, useEffect } from 'react';
import GestioneUtenti from '@/components/GestioneUtenti/GestioneUtenti';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase.ts';
import { GridColDef } from '@mui/x-data-grid';
import { sendPasswordResetEmail } from 'firebase/auth';

interface UserProfile {
  id: string;
  nome: string;
  email: string;
}

interface AdminData {
    id: string;
}

interface CombinedUserData extends UserProfile {
  isAdmin: boolean;
}

const GestioneUtentiPage: React.FC = () => {
  const [utentiMaster, loadingMaster, errorMaster] = useCollectionData<UserProfile>(
    collection(db, 'utenti_master'),
    { idField: 'id' }
  );

  const [admins, loadingAdmins, errorAdmins] = useCollectionData<AdminData>(
    collection(db, 'admins'),
    { idField: 'id' }
  );

  const [combinedData, setCombinedData] = useState<CombinedUserData[]>([]);

  useEffect(() => {
    if (utentiMaster && admins) {
      const adminIds = new Set(admins.map(a => a.id));
      const combined = utentiMaster.map(user => ({
        ...user,
        isAdmin: adminIds.has(user.id),
      }));
      setCombinedData(combined);
    }
  }, [utentiMaster, admins]);

  const handleStatusChange = async (id: string, newStatus: boolean) => {
    const adminRef = doc(db, 'admins', id);
    try {
      if (newStatus) {
        const user = utentiMaster?.find(u => u.id === id);
        if(user) {
            await setDoc(adminRef, { nome: user.nome, email: user.email });
        }
      } else {
        await deleteDoc(adminRef);
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato:", error);
    }
  };

  const handleSendPassword = (email: string) => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log(`Email di reset inviata a ${email}`);
      })
      .catch((error) => {
        console.error("Errore nell'invio dell'email di reset:", error);
      });
  };

  const columns: GridColDef<CombinedUserData>[] = [
    { field: 'nome', headerName: 'Nome', width: 200 },
    { field: 'email', headerName: 'Email', width: 250 },
  ];

  if (loadingMaster || loadingAdmins) {
    return <div>Caricamento dati utenti...</div>;
  }

  if (errorMaster || errorAdmins) {
    return <div>Errore nel caricamento dei dati.</div>;
  }

  return (
    <GestioneUtenti<CombinedUserData>
      title="Gestione Utenti"
      data={combinedData}
      baseColumns={columns}
      statusField="isAdmin"
      onStatusChange={handleStatusChange}
      onSendPassword={handleSendPassword}
    />
  );
};

export default GestioneUtentiPage;
