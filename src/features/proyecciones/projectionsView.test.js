import { describe, expect, it } from 'vitest';
import {
    annualGrowth,
    buildProducts,
    currentYear,
    eeeVintages,
    fileVintages,
    formatGrowth,
    latestForecast,
    revisionSeries,
    revisionYears,
    summaryRows,
    yearRows
} from './projectionsView';

const series = {
    eee_pib_2026: [
        { date: '2025-12-01', value: 2.3 },
        { date: '2026-10-01', value: 0.2 }
    ],
    eee_pib_2027: [{ date: '2026-10-01', value: 3 }],
    dolar: [{ date: '2026-10-01', value: 900 }]
};

const payload = {
    ipom: {
        vintages: [
            { date: '2025-12-01', label: 'IPoM diciembre 2025', values: { 2025: [2.4, 2.4], 2026: [2, 3] } },
            { date: '2026-09-01', label: 'IPoM septiembre 2026', values: { 2026: [0.25, 0.75], 2027: [2, 3] } }
        ]
    },
    weo: { vintages: [{ date: '2026-10-01', label: 'WEO octubre 2026', values: { 2026: 0.61, 2027: 2.61, 2031: 2.31 } }] }
};

describe('ediciones', () => {
    it('arma las ediciones de la EEE por fecha de encuesta', () => {
        const vintages = eeeVintages(series);
        expect(vintages.map((v) => v.date)).toEqual(['2025-12-01', '2026-10-01']);
        expect(vintages[1]).toEqual({
            date: '2026-10-01',
            label: 'EEE octubre 2026',
            values: { 2026: { mid: 0.2, low: 0.2, high: 0.2 }, 2027: { mid: 3, low: 3, high: 3 } }
        });
    });

    it('lee rangos del IPoM con su punto medio y números del FMI', () => {
        const [, ipom] = fileVintages(payload.ipom);
        expect(ipom.values[2026]).toEqual({ mid: 0.5, low: 0.25, high: 0.75 });
        expect(fileVintages(payload.weo)[0].values[2031]).toEqual({ mid: 2.31, low: 2.31, high: 2.31 });
        expect(fileVintages(undefined)).toEqual([]);
    });

    it('la última proyección deja fuera los años anteriores a la edición', () => {
        const products = buildProducts({ series, payload });
        const ipom = products.find((p) => p.id === 'ipom');
        expect(Object.keys(latestForecast(ipom).values)).toEqual(['2026', '2027']);
        expect(currentYear(products)).toBe(2026);
    });
});

describe('crecimiento efectivo', () => {
    it('suma los cuatro trimestres y omite años incompletos', () => {
        const quarters = [2024, 2025].flatMap((year, i) => [1, 4, 7, 10].map((month) => ({
            date: `${year}-${String(month).padStart(2, '0')}-01`,
            value: 100 * (1 + i * 0.02)
        })));
        quarters.push({ date: '2026-01-01', value: 110 });
        const growth = annualGrowth(quarters);
        expect(Object.keys(growth)).toEqual(['2025']);
        expect(growth[2025]).toBeCloseTo(2);
    });
});

describe('vistas', () => {
    const products = buildProducts({ series, payload });

    it('por año: efectivo hasta el último año cerrado y luego cada proyección', () => {
        const rows = yearRows({ products, actual: { 2024: 2.6, 2025: 2.5 }, history: 2 });
        expect(rows.map((row) => row.year)).toEqual([2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
        const row2026 = rows.find((row) => row.year === 2026);
        expect(row2026).toMatchObject({ actual: null, eee: 0.2, ipom: 0.5, weo: 0.61 });
        expect(row2026.ipomRange).toEqual({ mid: 0.5, low: 0.25, high: 0.75 });
        expect(rows.find((row) => row.year === 2025)).toMatchObject({ actual: 2.5, eee: null, ipom: null });
    });

    it('revisiones: cada edición que proyectó el año elegido', () => {
        const [eee, ipom] = revisionSeries({ products, target: 2026 });
        expect(eee.points.map((p) => p.mid)).toEqual([2.3, 0.2]);
        expect(ipom.points.map((p) => p.label)).toEqual(['IPoM diciembre 2025', 'IPoM septiembre 2026']);
        expect(revisionYears(products)).toEqual([2026]);
    });

    it('resumen del panel', () => {
        const { years, rows } = summaryRows(products, 2026);
        expect(years).toEqual([2026, 2027, 2028]);
        expect(rows.find((row) => row.id === 'weo').values.map(formatGrowth)).toEqual(['0,61%', '2,61%', '–']);
        expect(formatGrowth(rows.find((row) => row.id === 'ipom').values[0])).toBe('0,25–0,75%');
        expect(formatGrowth(-1.5)).toBe('-1,5%');
    });
});
