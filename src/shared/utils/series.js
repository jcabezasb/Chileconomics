export const getTrendFromHistory = (history, fallback = 'up') => {
    if (!history || history.length < 2) return fallback;
    const first = history[0];
    const last = history[history.length - 1];
    if (first === null || last === null) return fallback;
    if (Number.isNaN(first) || Number.isNaN(last)) return fallback;
    return last >= first ? 'up' : 'down';
};

export const normalizeSeries = (series) => (
    (series || [])
        .filter(entry => entry && entry.value !== null && entry.value !== undefined)
        .map(entry => ({ ...entry, value: Number(entry.value) }))
        .filter(entry => !Number.isNaN(entry.value))
);

export const getQuarterFromDate = (dateStr) => {
    if (!dateStr || dateStr.length < 7) return null;
    const month = Number(dateStr.slice(5, 7));
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
};

export const buildPeriods = (series) => {
    const valid = normalizeSeries(series);
    return valid
        .map(entry => {
            const year = entry.date ? entry.date.slice(0, 4) : '';
            const quarter = getQuarterFromDate(entry.date);
            return year && quarter ? { date: entry.date, year, quarter } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
};

export const computeSeriesStatsAtDate = (series, targetDate, options = {}) => {
    const { lag = 4, historyPoints = 4 } = options;
    const valid = normalizeSeries(series);
    if (!valid.length) return null;
    const targetIndex = targetDate
        ? valid.findIndex(entry => entry.date === targetDate)
        : valid.length - 1;
    const index = targetIndex >= 0 ? targetIndex : valid.length - 1;
    const latest = valid[index];
    const previous = index - lag >= 0 ? valid[index - lag] : null;
    const variation = previous && previous.value !== 0
        ? ((latest.value - previous.value) / previous.value) * 100
        : null;
    const start = Math.max(0, index - historyPoints + 1);
    const history = valid.slice(start, index + 1).map(entry => entry.value);
    const prior = index - 1 >= 0 ? valid[index - 1] : null;
    const fallbackTrend = prior ? (latest.value >= prior.value ? 'up' : 'down') : 'up';
    const trend = getTrendFromHistory(history, fallbackTrend);
    return {
        value: latest.value,
        variation,
        history,
        trend,
        date: latest.date
    };
};

export const mergeInvestmentSeries = (fbkfSeries, existenciasSeries) => {
    const map = new Map();
    normalizeSeries(fbkfSeries).forEach(entry => {
        map.set(entry.date, { date: entry.date, fbkf: entry.value, vax: 0 });
    });
    normalizeSeries(existenciasSeries).forEach(entry => {
        const current = map.get(entry.date) || { date: entry.date, fbkf: 0, vax: 0 };
        map.set(entry.date, { ...current, vax: entry.value });
    });
    return Array.from(map.values())
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map(entry => ({ date: entry.date, value: (entry.fbkf || 0) + (entry.vax || 0) }));
};

export const buildGovernmentResidualSeries = (pibSeries, consumoSeries, inversionSeries, exportSeries, importSeries) => {
    const pibData = normalizeSeries(pibSeries);
    if (!pibData.length) return [];
    const consumoMap = new Map(normalizeSeries(consumoSeries).map(entry => [entry.date, entry.value]));
    const inversionMap = new Map(normalizeSeries(inversionSeries).map(entry => [entry.date, entry.value]));
    const exportMap = new Map(normalizeSeries(exportSeries).map(entry => [entry.date, entry.value]));
    const importMap = new Map(normalizeSeries(importSeries).map(entry => [entry.date, entry.value]));

    return pibData
        .map(entry => {
            const consumo = consumoMap.get(entry.date);
            const inversion = inversionMap.get(entry.date);
            const exportVal = exportMap.get(entry.date);
            const importVal = importMap.get(entry.date);
            if ([consumo, inversion, exportVal, importVal].some(val => val === undefined || val === null)) return null;
            const value = entry.value - consumo - inversion - exportVal + importVal;
            return { date: entry.date, value };
        })
        .filter(Boolean);
};
