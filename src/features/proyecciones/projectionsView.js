import { formatNumber } from '../../shared/utils/format';

// Proyecciones de crecimiento del PIB de Chile. Cada "producto" es una serie de ediciones
// (vintages): en una fecha, una institución proyecta el crecimiento de uno o más años.
//   vintage: { date: 'YYYY-MM-DD', label, values: { [año]: { mid, low, high } } }
// low/high distintos solo en el IPoM (rango); en el resto low = high = mid.

export const PRODUCTS = [
    {
        id: 'eee',
        institution: 'bcch',
        label: 'Encuesta de Expectativas',
        short: 'EEE',
        description: 'Mediana de lo que esperan los economistas que encuesta el Banco Central cada mes.'
    },
    {
        id: 'ipom',
        institution: 'bcch',
        label: 'IPoM',
        short: 'IPoM',
        description: 'Rango oficial del Banco Central en su Informe de Política Monetaria (cuatro al año). '
            + 'El gráfico marca el punto medio y el rango.'
    },
    {
        id: 'weo',
        institution: 'fmi',
        label: 'FMI (WEO)',
        short: 'FMI',
        description: 'Proyección del Fondo Monetario Internacional en el World Economic Outlook (abril y octubre).'
    }
];

export const SOURCES = [
    { id: 'bcch', label: 'Banco Central', products: ['eee', 'ipom'] },
    { id: 'fmi', label: 'FMI', products: ['weo'] },
    { id: 'todas', label: 'Comparar', products: ['eee', 'ipom', 'weo'] }
];

// Color de cada producto (variables en projections.css).
export const productColor = (id) => `var(--proj-${id})`;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
    'noviembre', 'diciembre'];
const EEE_PREFIX = 'eee_pib_';

const point = (value) => ({ mid: value, low: value, high: value });
const vintageYear = (vintage) => Number(vintage.date.slice(0, 4));

// Series eee_pib_<año> (una observación por encuesta) -> ediciones por fecha de encuesta.
export const eeeVintages = (series) => {
    const byDate = {};
    Object.entries(series || {}).forEach(([key, points]) => {
        if (!key.startsWith(EEE_PREFIX)) return;
        const year = key.slice(EEE_PREFIX.length);
        points.forEach(({ date, value }) => {
            if (!Number.isFinite(value)) return;
            const month = Number(date.slice(5, 7));
            byDate[date] ||= { date, label: `EEE ${MONTHS[month - 1]} ${date.slice(0, 4)}`, values: {} };
            byDate[date].values[year] = point(value);
        });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
};

// Bloque del JSON (proyecciones.json) -> ediciones; valores [mín, máx] (IPoM) o un número (FMI).
export const fileVintages = (block) => (block?.vintages || []).map((vintage) => ({
    date: vintage.date,
    label: vintage.label,
    values: Object.fromEntries(Object.entries(vintage.values || {}).flatMap(([year, value]) => {
        if (Array.isArray(value) && value.every(Number.isFinite)) {
            const [low, high] = value;
            return [[year, { mid: (low + high) / 2, low, high }]];
        }
        return Number.isFinite(value) ? [[year, point(value)]] : [];
    }))
})).filter((vintage) => Object.keys(vintage.values).length);

export const buildProducts = ({ series, payload }) => {
    const vintages = { eee: eeeVintages(series), ipom: fileVintages(payload?.ipom), weo: fileVintages(payload?.weo) };
    return PRODUCTS.map((product) => ({ ...product, vintages: vintages[product.id] }));
};

// PIB real trimestral -> crecimiento anual (%) de los años con los cuatro trimestres.
export const annualGrowth = (quarters) => {
    const totals = {};
    (quarters || []).forEach(({ date, value }) => {
        const year = Number(date.slice(0, 4));
        totals[year] ||= { sum: 0, count: 0 };
        totals[year].sum += value;
        totals[year].count += 1;
    });
    const growth = {};
    Object.keys(totals).map(Number).forEach((year) => {
        const now = totals[year];
        const before = totals[year - 1];
        if (now.count === 4 && before?.count === 4) growth[year] = (now.sum / before.sum - 1) * 100;
    });
    return growth;
};

// Última edición de un producto y los años que proyecta (desde el de la edición en adelante).
export const latestForecast = (product) => {
    const vintage = product.vintages[product.vintages.length - 1];
    if (!vintage) return null;
    const values = Object.fromEntries(
        Object.entries(vintage.values).filter(([year]) => Number(year) >= vintageYear(vintage))
    );
    return { ...vintage, values };
};

// Vista "Por año": crecimiento efectivo de los últimos años y, a continuación, la última proyección
// de cada producto. Filas para un gráfico de barras: { year, actual, [id], [`${id}Range`] }.
export const yearRows = ({ products, actual, history = 10 }) => {
    const actualYears = Object.keys(actual).map(Number);
    const lastActual = actualYears.length ? Math.max(...actualYears) : null;
    const forecasts = products.map((product) => ({ product, forecast: latestForecast(product) })).filter((entry) => entry.forecast);
    const forecastYears = forecasts.flatMap(({ forecast }) => Object.keys(forecast.values).map(Number));
    if (lastActual === null && !forecastYears.length) return [];
    const first = (lastActual ?? Math.min(...forecastYears)) - history + 1;
    const last = Math.max(lastActual ?? -Infinity, ...forecastYears);
    const rows = [];
    for (let year = first; year <= last; year += 1) {
        const row = { year, actual: Number.isFinite(actual[year]) ? actual[year] : null };
        forecasts.forEach(({ product, forecast }) => {
            const value = forecast.values[year];
            row[product.id] = value ? value.mid : null;
            row[`${product.id}Range`] = value ? value : null;
        });
        rows.push(row);
    }
    return rows;
};

// Vista "Revisiones": cómo cambió, edición a edición, lo que cada producto proyectaba para un año.
export const revisionSeries = ({ products, target }) => products.map((product) => ({
    ...product,
    points: product.vintages
        .filter((vintage) => vintage.values[target])
        .map((vintage) => ({
            time: Date.parse(`${vintage.date}T00:00:00Z`),
            date: vintage.date,
            label: vintage.label,
            ...vintage.values[target]
        }))
}));

// Años que se pueden elegir en "Revisiones": los que tienen al menos dos ediciones de algún producto,
// hasta los últimos `count`.
export const revisionYears = (products, count = 8) => {
    const years = new Set();
    products.forEach((product) => {
        const counts = {};
        product.vintages.forEach((vintage) => Object.keys(vintage.values).forEach((year) => {
            counts[year] = (counts[year] || 0) + 1;
        }));
        Object.entries(counts).forEach(([year, n]) => {
            if (n >= 2) years.add(Number(year));
        });
    });
    return [...years].sort((a, b) => a - b).slice(-count);
};

// Último año con ediciones (el "año en curso" de los datos, sin depender del reloj del visitante).
export const currentYear = (products) => {
    const dates = products.flatMap((product) => product.vintages.map((vintage) => vintage.date));
    return dates.length ? Number(dates.sort()[dates.length - 1].slice(0, 4)) : null;
};

// Resumen del panel: la última proyección de cada producto para el año en curso y los dos siguientes.
export const summaryRows = (products, baseYear) => {
    const years = [baseYear, baseYear + 1, baseYear + 2];
    return {
        years,
        rows: products.map((product) => {
            const forecast = latestForecast(product);
            return {
                id: product.id,
                label: product.short,
                edition: forecast?.label || null,
                values: years.map((year) => forecast?.values[year] || null)
            };
        })
    };
};

const decimals = (value) => (Number.isInteger(Math.round(value * 100) / 10) ? 1 : 2);

// 2,5% / 0,25–0,75% / –
export const formatGrowth = (value) => {
    if (!value) return '–';
    if (typeof value === 'number') return Number.isFinite(value) ? `${formatNumber(value, decimals(value))}%` : '–';
    if (value.low === value.high) return `${formatNumber(value.mid, decimals(value.mid))}%`;
    return `${formatNumber(value.low, decimals(value.low))}–${formatNumber(value.high, decimals(value.high))}%`;
};
