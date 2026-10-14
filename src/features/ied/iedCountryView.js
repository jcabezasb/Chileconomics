import { iedCountry } from './iedCountries';

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

// JSON de public/data/ied_paises.json -> stock por país en ambos sentidos.
export const buildCountryData = (payload) => {
    if (!payload?.years?.length || !payload.inward?.stock || !payload.outward?.stock) return null;
    const side = (stock) => ({ total: stock.total, items: countryItems(stock) });
    return { years: payload.years, inward: side(payload.inward.stock), outward: side(payload.outward.stock) };
};

// Ítems de un sentido en un año: monto, participación, variación anual y evolución.
export const countrySnapshot = (data, direction, year) => {
    const side = data[direction];
    const index = data.years.indexOf(year);
    if (index < 0) return null;
    const total = side.total[index];
    return {
        total,
        totalChange: percentChange(total, side.total[index - 1]),
        totalHistory: data.years.map((entry, i) => ({ year: entry, value: side.total[i] })),
        items: side.items.map((item) => ({
            ...item,
            value: item.values[index],
            share: total ? item.values[index] / total : null,
            change: percentChange(item.values[index], item.values[index - 1]),
            history: data.years.map((entry, i) => ({ year: entry, value: item.values[i] }))
        }))
    };
};
