// Carga única del archivo de datos generado por python/sync_bcch_data.py.
// En producción no hay llamadas a la API del Banco Central: todo sale de este JSON estático.

const DATA_URL = '/data/bcch_series.json';

let cache = null;
let pending = null;

// Deja solo puntos con fecha y valor numérico, ordenados por fecha.
export const cleanSeries = (series) => (
    (Array.isArray(series) ? series : [])
        .filter((entry) => entry?.date && entry.value !== null && entry.value !== undefined)
        .map((entry) => ({ date: entry.date, value: Number(entry.value) }))
        .filter((entry) => Number.isFinite(entry.value))
);

const normalizePayload = (payload) => {
    const series = {};
    Object.entries(payload?.series || {}).forEach(([key, entry]) => {
        series[key] = cleanSeries(Array.isArray(entry) ? entry : entry?.data);
    });
    return { lastUpdate: payload?.last_update || null, series };
};

export const loadBcchData = async () => {
    if (cache) return cache;
    if (!pending) {
        pending = fetch(DATA_URL)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((payload) => {
                cache = normalizePayload(payload);
                return cache;
            })
            .catch((error) => {
                console.error('No se pudo cargar bcch_series.json:', error);
                return { lastUpdate: null, series: {} };
            })
            .finally(() => {
                pending = null;
            });
    }
    return pending;
};

// Serie por clave (ver seriesKeys.js). Devuelve [] si no existe.
export const getSeries = async (key) => {
    const data = await loadBcchData();
    return data.series[key] || [];
};

export const getSeriesMap = async (keysByName) => {
    const data = await loadBcchData();
    return Object.fromEntries(
        Object.entries(keysByName).map(([name, key]) => [name, data.series[key] || []])
    );
};

// Solo para pruebas.
export const resetBcchCache = () => {
    cache = null;
    pending = null;
};
