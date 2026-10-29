import { iedCountry } from './iedCountries';
import { sectorItems } from './iedSectors';

const slug = (text) => text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const percentChange = (now, before) => (
    Number.isFinite(now) && Number.isFinite(before) && before !== 0 ? ((now - before) / before) * 100 : null
);

// Un bloque del JSON (stock de un sentido) -> ítems en el orden del Excel, agrupados por continente.
// kind: 'country' (tiene lugar en el globo), 'rest' ("Resto América"...), 'continent' (continente sin
// desglose por país) o 'unassigned'. Solo los 'country' llevan cinta al globo.
export const countryItems = (block) => {
    const items = [];
    block.continents.forEach((continent) => {
        if (!continent.countries.length) {
            items.push({ id: `c-${slug(continent.name)}`, label: continent.name, continent: continent.name, kind: 'continent', values: continent.total, place: null });
            return;
        }
        continent.countries.forEach((country) => {
            const place = iedCountry(country.name);
            items.push({
                id: `c-${slug(country.name)}`,
                label: country.name,
                continent: continent.name,
                kind: place ? 'country' : 'rest',
                values: country.values,
                place
            });
        });
    });
    items.push({ id: 'c-no-asignados', label: 'No asignados', continent: null, kind: 'unassigned', values: block.unassigned, place: null });
    return items;
};

// JSON de public/data/ied_paises.json -> stock por país en ambos sentidos y, si vienen, por sector
// (sectors es null si el archivo es anterior a los sectores).
export const buildCountryData = (payload) => {
    if (!payload?.years?.length || !payload.inward?.stock || !payload.outward?.stock) return null;
    const side = (stock) => ({ total: stock.total, items: countryItems(stock) });
    const sectors = (block) => (block ? { total: block.total, items: sectorItems(block) } : null);
    return {
        years: payload.years,
        inward: side(payload.inward.stock),
        outward: side(payload.outward.stock),
        sectors: payload.inward.sectors && payload.outward.sectors
            ? { inward: sectors(payload.inward.sectors), outward: sectors(payload.outward.sectors) }
            : null
    };
};

// Ítems en un año: monto, participación, variación anual y evolución.
// side: { total: [por año], items: [{ values: [por año] }] }.
const itemsSnapshot = (side, years, year) => {
    const index = years.indexOf(year);
    if (index < 0) return null;
    const total = side.total[index];
    return {
        total,
        totalChange: percentChange(total, side.total[index - 1]),
        totalHistory: years.map((entry, i) => ({ year: entry, value: side.total[i] })),
        items: side.items.map((item) => ({
            ...item,
            value: item.values[index],
            share: total ? item.values[index] / total : null,
            change: percentChange(item.values[index], item.values[index - 1]),
            history: years.map((entry, i) => ({ year: entry, value: item.values[i] }))
        }))
    };
};

// Países de un sentido en un año.
export const countrySnapshot = (data, direction, year) => itemsSnapshot(data[direction], data.years, year);

// Lo mismo para los sectores (null si no hay datos por sector).
export const sectorSnapshot = (data, direction, year) => (
    data.sectors ? itemsSnapshot(data.sectors[direction], data.years, year) : null
);

// Series del gráfico de líneas: los `count` ítems con más stock en el último año (quien llama deja
// fuera "Resto", continentes y no asignados, que no son un lugar). El orden fija el color de cada
// serie, así que no cambia al moverse entre años. items: [{ id, label, values }] alineados con `years`.
export const lineSeries = (items, years, count = 6) => {
    const last = years.length - 1;
    const series = items
        .filter((item) => Number.isFinite(item.values[last]))
        .sort((a, b) => b.values[last] - a.values[last])
        .slice(0, count)
        .map(({ id, label, values }) => ({ id, label, values }));
    const rows = years.map((year, index) => ({
        year,
        ...Object.fromEntries(series.map((entry) => [entry.id, entry.values[index]]))
    }));
    return { series, rows };
};
