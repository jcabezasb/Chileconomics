// Fechas como texto 'YYYY-MM-DD' (así vienen del JSON). Se evita Date salvo para sumar días/años.

export const toMonthKey = (value) => (value ? value.slice(0, 7) : '');
export const toDayKey = (value) => (value && value.length === 7 ? `${value}-01` : value || '');

const pad = (number, width = 2) => String(number).padStart(width, '0');
const buildDateKey = (year, month, day) => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

const parseIsoDate = (value) => {
    const [year, month, day] = (value || '').split('-').map(Number);
    return year && month && day ? { year, month, day } : null;
};

export const shiftDays = (value, days) => {
    const parts = parseIsoDate(value);
    if (!parts) return '';
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return buildDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

// Misma fecha N años antes; si no existe (29 de febrero) usa el último día de ese mes.
export const shiftYears = (value, years = -1) => {
    const parts = parseIsoDate(value);
    if (!parts) return '';
    const year = parts.year + years;
    const lastDay = new Date(Date.UTC(year, parts.month, 0)).getUTCDate();
    return buildDateKey(year, parts.month, Math.min(parts.day, lastDay));
};

// 'daily' si alguna de las primeras fechas no cae el día 1; las series mensuales/trimestrales vienen con día 01.
export const getSeriesFrequency = (series) => (
    (series || []).slice(0, 24).some((entry) => (entry?.date || '').split('-')[2] !== '01') ? 'daily' : 'monthly'
);

// Variación % en 12 meses según la fecha (no la posición): en series diarias busca el mismo día
// del año anterior o, si no hubo dato (fin de semana, feriado), hasta 7 días antes.
export const buildYoYSeries = (series) => {
    const points = (series || [])
        .filter((entry) => entry?.date && Number.isFinite(Number(entry.value)))
        .map((entry) => ({ date: entry.date, value: Number(entry.value) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    if (!points.length) return [];

    const variation = (value, previous) => (previous ? ((value - previous) / previous) * 100 : null);

    if (getSeriesFrequency(points) === 'monthly') {
        const byMonth = new Map(points.map((point) => [toMonthKey(point.date), point.value]));
        return points
            .map((point) => {
                const [year, month] = toMonthKey(point.date).split('-');
                const yoy = variation(point.value, byMonth.get(`${Number(year) - 1}-${month}`));
                return yoy === null ? null : { date: point.date, value: yoy };
            })
            .filter(Boolean);
    }

    const byDay = new Map(points.map((point) => [point.date, point.value]));
    const findPrevious = (target) => {
        for (let back = 0; back <= 7; back += 1) {
            const key = back ? shiftDays(target, -back) : target;
            if (byDay.has(key)) return byDay.get(key);
        }
        return null;
    };
    return points
        .map((point) => {
            const yoy = variation(point.value, findPrevious(shiftYears(point.date)));
            return yoy === null ? null : { date: point.date, value: yoy };
        })
        .filter(Boolean);
};

// { a: serieA, b: serieB } -> [{ date, a, b }] ordenado por fecha (para gráficos de varias series).
export const mergeSeriesByDate = (seriesByKey) => {
    const rows = new Map();
    Object.entries(seriesByKey || {}).forEach(([key, series]) => {
        (series || []).forEach((entry) => {
            if (!entry?.date) return;
            const row = rows.get(entry.date) || { date: entry.date };
            row[key] = entry.value;
            rows.set(entry.date, row);
        });
    });
    return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// Filtra una serie al rango elegido: '1y' | '2y' | '5y' | 'all' | 'custom' (con { start, end }).
// Las fechas del rango personalizado vienen como 'YYYY-MM' o 'YYYY-MM-DD' según el selector.
export const filterByRange = (series, timeRange, customRange = {}) => {
    if (!series?.length || timeRange === 'all') return series || [];
    const daily = getSeriesFrequency(series) === 'daily';
    const keyOf = daily ? toDayKey : toMonthKey;

    if (timeRange === 'custom') {
        const start = customRange.start ? keyOf(customRange.start) : '';
        const end = customRange.end ? keyOf(customRange.end) : '';
        if (!start && !end) return series;
        return series.filter((entry) => {
            const key = keyOf(entry.date);
            return key && (!start || key >= start) && (!end || key <= end);
        });
    }

    const years = Number(String(timeRange).replace('y', ''));
    const last = keyOf(series[series.length - 1].date);
    if (!years || !last) return series;
    const start = `${Number(last.slice(0, 4)) - years}${last.slice(4)}`;
    return series.filter((entry) => keyOf(entry.date) >= start);
};
