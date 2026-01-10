import { useState, useCallback } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
} from 'firebase/firestore';
import type {
    WithFieldValue,
    FirestoreDataConverter,
    DocumentData,
    QueryDocumentSnapshot,
    SnapshotOptions
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { BaseEntity } from '@/models/definitions';

// Il FirestoreDataConverter generico
const converter = <T extends BaseEntity>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
        // Rimuoviamo l'ID prima di salvarlo in Firestore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = data;
        return rest;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T => {
        const data = snapshot.data(options) as Omit<T, 'id'>;
        return { id: snapshot.id, ...data } as T;
    }
});

export const useFirestore = () => {
    const [isMutating, setIsMutating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const addData = useCallback(async <T extends BaseEntity>(collectionName: string, data: WithFieldValue<Omit<T, 'id'>>) => {
        setIsMutating(true);
        setError(null);
        try {
            const collRef = collection(db, collectionName).withConverter(converter<T>());
            const docRef = await addDoc(collRef, data as T); // Cast a T, più specifico di any
            return docRef.id;
        } catch (e: unknown) {
            console.error(`Error adding document to ${collectionName}:`, e);
            setError(e as Error);
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, []);

    const updateData = useCallback(async <T extends BaseEntity>(collectionName: string, id: string, data: WithFieldValue<Partial<T>>) => {
        setIsMutating(true);
        setError(null);
        try {
            const docRef = doc(db, collectionName, id).withConverter(converter<T>());
            await updateDoc(docRef, data);
        } catch (e: unknown) {
            console.error(`Error updating document in ${collectionName}:`, e);
            setError(e as Error);
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, []);

    const deleteData = useCallback(async (collectionName: string, id: string) => {
        setIsMutating(true);
        setError(null);
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (e: unknown) {
            console.error(`Error deleting document from ${collectionName}:`, e);
            setError(e as Error);
            throw e;
        } finally {
            setIsMutating(false);
        }
    }, []);

    return { isMutating, error, addData, updateData, deleteData };
};
