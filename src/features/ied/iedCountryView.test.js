import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IED_COUNTRIES } from './iedCountries';
import { buildCountryData, countryItems, countrySnapshot, lineSeries, sectorSnapshot } from './iedCountryView';
import { listSlots } from './iedLayout';
import { SECTOR_UNASSIGNED_ID, sectorItems } from './iedSectors';

const stock = (scale) => ({
    continents: [
        { name: 'América', total: [30 * scale, 40 * scale], countries: [
            { name: 'Canadá', values: [20 * scale, 30 * scale] },
            { name: 'Resto América', values: [10 * scale, 10 * scale] }
        ] },
        { name: 'África', total: [5, 5], countries: [] }
    ],
    unassigned: [15, 5],
    total: [30 * scale + 20, 40 * scale + 10]
});
const payload = { years: [2024, 2025], inward: { stock: stock(1) }, outward: { stock: stock(2) } };

describe('IED por país', () => {
    it('clasifica países, restos, continentes sin desglose y no asignados', () => {
        const items = countryItems(stock(1));
        expect(items.map((item) => [item.id, item.kind])).toEqual([
            ['c-canada', 'country'],
            ['c-resto-america', 'rest'],
            ['c-africa', 'continent'],
            ['c-no-asignados', 'unassigned']
        ]);
        expect(items[0].place.iso).toBe('124');
    });

    it('calcula participación, variación y evolución de un año', () => {
        const snapshot = countrySnapshot(buildCountryData(payload), 'outward', 2025);
        const canada = snapshot.items[0];
        expect(snapshot.total).toBe(90);
        expect(canada.value).toBe(60);
        expect(canada.share).toBeCloseTo(60 / 90);
        expect(canada.change).toBeCloseTo(50);
        expect(canada.history).toEqual([{ year: 2024, value: 40 }, { year: 2025, value: 60 }]);
    });

    it('elige las series con más stock en el último año, en ese orden', () => {
        const items = [
            { id: 'a', label: 'A', values: [5, 1] },
            { id: 'b', label: 'B', values: [1, 9] },
            { id: 'c', label: 'C', values: [3, 4] }
        ];
        const { series, rows } = lineSeries(items, [2024, 2025], 2);
        expect(series.map((entry) => entry.id)).toEqual(['b', 'c']);
        expect(rows).toEqual([{ year: 2024, b: 1, c: 3 }, { year: 2025, b: 9, c: 4 }]);
    });

    it('sin datos devuelve null', () => {
        expect(buildCountryData(null)).toBeNull();
        expect(buildCountryData({ years: [] })).toBeNull();
    });
});

const sectors = {
    items: [{ name: 'Minería', values: [10, 20] }, { name: 'Sector nuevo', values: [5, 5] }],
    unassigned: [5, 15],
    total: [20, 40]
};

describe('IED por sector', () => {
    it('asocia nombre corto e ícono, y deja los no asignados al final', () => {
        const items = sectorItems(sectors);
        expect(items.map((item) => [item.id, item.kind])).toEqual([
            ['s-mineria', 'sector'],
            ['s-sector-nuevo', 'sector'],
            [SECTOR_UNASSIGNED_ID, 'unassigned']
        ]);
        expect(items[0].short).toBe('Minería');
        expect(items[0].icon).toBeTruthy();
        // Un sector que no está en la lista se muestra con su nombre del Excel.
        expect(items[1].short).toBe('Sector nuevo');
        expect(items[2].icon).toBeNull();
    });

    it('calcula el año de cada sector; sin sectores en el archivo devuelve null', () => {
        const withSectors = buildCountryData({ ...payload, inward: { ...payload.inward, sectors }, outward: { ...payload.outward, sectors } });
        const snapshot = sectorSnapshot(withSectors, 'inward', 2025);
        expect(snapshot.total).toBe(40);
        expect(snapshot.items[0]).toMatchObject({ value: 20, share: 0.5, change: 100 });
        expect(sectorSnapshot(buildCountryData(payload), 'inward', 2025)).toBeNull();
    });

    it('reparte la lista en filas iguales, con la cinta centrada en cada una', () => {
        const slots = listSlots(4, 0, 100, 0.5);
        expect(slots.map((slot) => slot.middle)).toEqual([12.5, 37.5, 62.5, 87.5]);
        expect(slots[0]).toMatchObject({ y0: 6.25, y1: 18.75 });
        expect(listSlots(0, 0, 100)).toEqual([]);
    });
});

// Contrato con public/data/ied_paises.json: cada país del Excel tiene su lugar en el globo.
describe('ied_paises.json', () => {
    const json = JSON.parse(fs.readFileSync(new URL('../../../public/data/ied_paises.json', import.meta.url), 'utf8'));

    it('todos los países tienen ubicación (salvo los "Resto")', () => {
        const names = ['inward', 'outward'].flatMap((direction) => json[direction].stock.continents
            .flatMap((continent) => continent.countries.map((country) => country.name)));
        const missing = names.filter((name) => !name.startsWith('Resto') && !IED_COUNTRIES[name]);
        expect(missing).toEqual([]);
    });

    it('los sectores suman el mismo total que los países, en ambos sentidos', () => {
        ['inward', 'outward'].forEach((direction) => {
            const { sectors: block, stock } = json[direction];
            const last = block.total.length - 1;
            const parts = block.items.reduce((sum, item) => sum + item.values[last], 0) + block.unassigned[last];
            expect(parts).toBeCloseTo(block.total[last], 0);
            expect(block.total[last]).toBeCloseTo(stock.total[last], 0);
        });
    });

    it('las partes suman el total del stock en Chile', () => {
        const { stock: inward } = json.inward;
        const last = inward.total.length - 1;
        const parts = inward.continents.reduce((sum, continent) => sum + continent.total[last], 0) + inward.unassigned[last];
        expect(parts).toBeCloseTo(inward.total[last], 0);
    });
});
