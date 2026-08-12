import { useGlobalStore } from '@/stores/globalStore';

const DebugData = () => {
    const tecnici = useGlobalStore(state => state.tecnici);
    const veicoli = useGlobalStore(state => state.veicoli);
    const documenti = useGlobalStore(state => state.documenti);
    const rapportini = useGlobalStore(state => state.rapportini);
    const clienti = useGlobalStore(state => state.clienti);
    const navi = useGlobalStore(state => state.navi);
    const ditte = useGlobalStore(state => state.ditte);
    const luoghi = useGlobalStore(state => state.luoghi);
    const qualifiche = useGlobalStore(state => state.qualifiche);
    const webAppUsers = useGlobalStore(state => state.webAppUsers);
    
    // In questa versione, assumiamo che i dati siano già caricati 
    // dal DataHydrator all'avvio dell'app. Il concetto di "loading"
    // a livello di singolo componente non è più necessario.

    return (
        <div style={{
            backgroundColor: '#f0f8ff',
            padding: '10px',
            border: '1px solid #ccc',
            margin: '10px',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <p><strong>[STATO DATI DEBUG - da GlobalStore]</strong></p>
            <ul>
                <li>Tecnici: <strong>{tecnici.length}</strong></li>
                <li>Utenti App: <strong>{webAppUsers.length}</strong></li>
                <li>Qualifiche: <strong>{qualifiche.length}</strong></li>
                <hr />
                <li>Veicoli: <strong>{veicoli.length}</strong></li>
                <li>Documenti: <strong>{documenti.length}</strong></li>
                <li>Rapportini: <strong>{rapportini.length}</strong></li>
                <hr />
                <li>Clienti: <strong>{clienti.length}</strong></li>
                <li>Navi: <strong>{navi.length}</strong></li>
                <li>Ditte: <strong>{ditte.length}</strong></li>
                <li>Luoghi: <strong>{luoghi.length}</strong></li>
            </ul>
        </div>
    );
};

export default DebugData;
