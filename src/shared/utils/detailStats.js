import { formatNumber } from './format';

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// isDaily: si no se indica, se adivina por el día (las series mensuales vienen con día 01).
export const formatShortDate = (date, isDaily) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    const mon = MONTH_SHORT[Number(month) - 1] || '';
    const showDay = isDaily ?? Boolean(day && day !== '01');
    return showDay && day ? `${Number(day)} ${mon} ${year}` : `${mon} ${year}`;
};

export const isDailySeries = (series) => (series || []).some((entry) => {
    const day = (entry.date || entry.name || '').split('-')[2];
    return day && day !== '01';
});

// Formateador de valores con unidad: makeValueFormatter({ prefix: '$', decimals: 2 })
export const makeValueFormatter = ({ prefix = '', suffix = '', decimals = 1 } = {}) => (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
    return `${prefix}${formatNumber(Number(value), decimals)}${suffix}`;
};

export const makeAxisFormatter = ({ prefix = '', suffix = '' } = {}) => (value, decimals) => (
    `${prefix}${formatNumber(value, decimals)}${suffix}`
);

// Resumen de una serie [{date, value}] en el rango visible.
export const computeSeriesStats = (series, key = 'value') => {
    const points = (series || [])
        .map((entry) => ({ date: entry.date || entry.name, value: Number(entry[key]) }))
        .filter((entry) => entry.date && !Number.isNaN(entry.value));
    if (!points.length) return null;
    let min = points[0];
    let max = points[0];
    let sum = 0;
    points.forEach((point) => {
        if (point.value < min.value) min = point;
        if (point.value > max.value) max = point;
        sum += point.value;
    });
    return {
        first: points[0],
        last: points[points.length - 1],
        min,
        max,
        average: sum / points.length
    };
};

// Cambio entre el primer y último punto: en pp si la serie ya es un porcentaje, en % si es un nivel.
export const formatPeriodChange = (stats, isPercentUnit) => {
    if (!stats) return null;
    const diff = stats.last.value - stats.first.value;
    const amount = isPercentUnit
        ? diff
        : (stats.first.value ? (diff / Math.abs(stats.first.value)) * 100 : null);
    if (amount === null || !Number.isFinite(amount)) return null;
    const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
    return {
        text: `${sign}${formatNumber(Math.abs(amount), 1)}${isPercentUnit ? ' pp' : '%'}`,
        direction: amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat'
    };
};
