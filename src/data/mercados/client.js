// Carga única de public/data/mercados_eeuu.json (lo genera python/import_mercados_eeuu.py): tasas y
// precios de mercado de EE.UU., con el mismo formato de series que bcch_series.json.
import { cleanSeries } from '../bcch/client';

const DATA_URL = '/data/mercados_eeuu.json';

// Claves de las series dentro del JSON (las mismas que escribe el importador).
export const US_SERIES = {
    treasury: (tenor) => `ust_${tenor}`,
    tips: (tenor) => `tips_${tenor}`,
    effr: 'effr',
    fedLow: 'fed_low',
    fedHigh: 'fed_high',
    dollarIndex: 'dolar_global',
    vix: 'vix'
};

let pending = null;

// { sources: { treasury | nyfed | fred: { name, url, checked_at, series } }, series: { clave: [{ date, value }] } }
// o null si el archivo no se pudo cargar.
export const loadUsMarkets = () => {
    if (!pending) {
        pending = fetch(DATA_URL)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((payload) => ({
                sources: payload?.sources || {},
                series: Object.fromEntries(Object.entries(payload?.series || {}).map(([key, entry]) => [key, cleanSeries(entry?.data)]))
            }))
            .catch((error) => {
                console.error('No se pudo cargar mercados_eeuu.json:', error);
                pending = null;
                return null;
            });
    }
    return pending;
};
