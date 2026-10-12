// Carga única de public/data/finanzas_publicas.json (lo genera python/import_dipres.py con los
// informes trimestrales de la DIPRES). Montos mensuales en millones de pesos.

const DATA_URL = '/data/finanzas_publicas.json';

let pending = null;

export const loadFiscalData = () => {
    if (!pending) {
        pending = fetch(DATA_URL)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .catch((error) => {
                console.error('No se pudo cargar finanzas_publicas.json:', error);
                pending = null;
                return null;
            });
    }
    return pending;
};
