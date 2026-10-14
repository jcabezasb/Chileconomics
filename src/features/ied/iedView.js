import { IED_ITEMS } from './iedGroups';

const yearOf = (date) => Number(date.slice(0, 4));
const byYear = (series) => Object.fromEntries((series || []).map((point) => [yearOf(point.date), point.value]));
const percentChange = (now, before) => (
    Number.isFinite(now) && Number.isFinite(before) && before !== 0 ? ((now - before) / before) * 100 : null
);

// series: { total: [{ date, value }], [id del grupo]: [...] } -> valores por año.
// Solo quedan los años que tienen el total y todos los grupos, para que las partes sumen el total.
export const buildIedData = (series) => {
    const total = byYear(series.total);
    const values = Object.fromEntries(IED_ITEMS.map((item) => [item.id, byYear(series[item.id])]));
    const years = Object.keys(total)
        .map(Number)
        .filter((year) => Number.isFinite(total[year]) && IED_ITEMS.every((item) => Number.isFinite(values[item.id][year])))
        .sort((a, b) => a - b);
    return { years, total, values };
};

// Monto, participación en el total y variación anual de cada grupo en un año.
export const iedSnapshot = (data, year) => {
    const total = data.total[year];
    const items = IED_ITEMS.map((item) => {
        const value = data.values[item.id][year];
        return {
            ...item,
            value,
            share: total ? value / total : null,
            change: percentChange(value, data.values[item.id][year - 1])
        };
    });
    return { year, total, totalChange: percentChange(total, data.total[year - 1]), items };
};

// Evolución del stock de un grupo (o del total nacional si id es null): [{ year, value }].
export const iedHistory = (data, id) => data.years.map((year) => ({
    year,
    value: id ? data.values[id][year] : data.total[year]
}));
