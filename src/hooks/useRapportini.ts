
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, Query, DocumentData, Timestamp, QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Rapportino } from '@/models/definitions';
import { isEqual } from 'lodash';

export interface RapportiniFilters {
    dataDa?: string | null;
    dataA?: string | null;
    tecnicoId?: string | null;
    clienteId?: string | null;
    naveId?: string | null;
    luogoId?: string | null;
    tipoGiornataId?: string | null;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    pageSize?: number;
    enabled?: boolean;
}

// Hook riscritto per essere robusto e prevedibile.
const useRapportini = (filters: RapportiniFilters) => {
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

    const prevFiltersRef = useRef<RapportiniFilters>();

    const { enabled = true } = filters;

    const performFetch = useCallback(async (currentFilters: RapportiniFilters, isContinuation: boolean) => {
        setLoading(true);
        try {
            const rapportiniCollection = collection(db, 'rapportini');
            const constraints: QueryConstraint[] = [];

            if (currentFilters.dataDa) constraints.push(where('data', '>=', Timestamp.fromDate(new Date(currentFilters.dataDa))));
            if (currentFilters.dataA) constraints.push(where('data', '<=', Timestamp.fromDate(new Date(currentFilters.dataA))));
            if (currentFilters.tecnicoId) constraints.push(where('presenze', 'array-contains', currentFilters.tecnicoId));
            if (currentFilters.clienteId) constraints.push(where('clienteId', '==', currentFilters.clienteId));
            if (currentFilters.naveId) constraints.push(where('naveId', '==', currentFilters.naveId));
            if (currentFilters.luogoId) constraints.push(where('luogoId', '==', currentFilters.luogoId));
            if (currentFilters.tipoGiornataId) constraints.push(where('tipoGiornataId', '==', currentFilters.tipoGiornataId));

            const orderByField = currentFilters.sortBy || 'data';
            const sortDirection = currentFilters.sortOrder || 'desc';
            constraints.push(orderBy(orderByField, sortDirection));

            const pageSize = currentFilters.pageSize || 15;
            constraints.push(limit(pageSize));

            if (isContinuation && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            const q = query(rapportiniCollection, ...constraints);
            const documentSnapshots = await getDocs(q);
            const newRapportini = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
            const newLastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];

            setRapportini(prev => isContinuation ? [...prev, ...newRapportini] : newRapportini);
            setLastDoc(newLastDoc || null);
            setHasMore(documentSnapshots.docs.length === pageSize);

        } catch (error) {
            console.error("Errore nel recupero dei rapportini: ", error);
            // In caso di errore, resetta lo stato per evitare inconsistenze
            setRapportini([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [lastDoc]); // Dipende solo da `lastDoc` per la paginazione

    useEffect(() => {
        // Se l'hook viene disabilitato, puliamo tutto.
        if (!enabled) {
            setRapportini([]);
            setLastDoc(null);
            setHasMore(true);
            setLoading(false); // Assicuriamoci che non rimanga in caricamento
            prevFiltersRef.current = undefined; // Resettiamo i filtri precedenti
            return;
        }

        // Se i filtri cambiano, significa che è una nuova ricerca.
        if (!isEqual(prevFiltersRef.current, filters)) {
            prevFiltersRef.current = filters;
            performFetch(filters, false); // Esegui una nuova ricerca (non una continuazione)
        }
    }, [filters, enabled, performFetch]);

    const fetchNextPage = useCallback(() => {
        if (!loading && hasMore && enabled) {
            performFetch(filters, true); // Esegui una ricerca in continuazione (paginazione)
        }
    }, [loading, hasMore, enabled, filters, performFetch]);

    return { rapportini, loading, hasMore, fetchNextPage };
};

export default useRapportini;
