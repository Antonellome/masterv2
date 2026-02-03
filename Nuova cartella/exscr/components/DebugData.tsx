import { useData } from '@/hooks/useData';

const DebugData = () => {
    const {
        loading,
        tecnici,
        veicoli,
        documenti,
        rapportini,
        clienti,
        navi,
        ditte,
        luoghi,
        qualifiche,
        webAppUsers,
    } = useData();

    if (loading) {
        return (
            <div style={{
                backgroundColor: '#ffc',
                padding: '10px',
                border: '1px solid #ccc',
                margin: '10px',
                fontFamily: 'monospace',
                fontSize: '12px'
            }}>
                <p><strong>[DEBUG]</strong> In attesa del caricamento dei dati...</p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#f0f8ff',
            padding: '10px',
            border: '1px solid #ccc',
            margin: '10px',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <p><strong>[STATO DATI DEBUG]</strong></p>
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
