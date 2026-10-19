import { describe, expect, it } from 'vitest';
import { buildSourceGroups, formatDay, formatPeriod, latestDate } from './sourcesView';

const point = (date) => [{ date, value: 1 }];

const DATA = {
    bcch: {
        lastUpdate: '2026-10-19 04:22:24',
        series: {
            imacec: point('2026-08-01'),
            imacec_no_minero: point('2026-07-01'),
            dolar: point('2026-10-19'),
            pib_total: point('2026-04-01'),
            pob_total: point('2070-01-01'),
            ied_total: point('2025-01-01'),
            eee_pib_2026: point('2026-10-01'),
            eee_pib_2027: point('2026-10-01')
        }
    },
    fiscal: { last_period: '2026-06', checked_at: '2026-10-19' },
    iedPaises: { years: [2024, 2025], checked_at: '2026-10-18' },
    projections: {
        ipom: { vintages: [{ date: '2026-06-01' }, { date: '2026-09-01' }] },
        weo: { vintages: [{ date: '2026-10-01' }], checked_at: '2026-10-19' }
    }
};

const rowsById = (groups) => Object.fromEntries(groups.flatMap((group) => group.rows).map((row) => [row.id, row]));

describe('formatos de fecha', () => {
    it('formatDay acepta fecha o fecha y hora', () => {
        expect(formatDay('2026-10-19')).toBe('19 oct 2026');
        expect(formatDay('2026-01-05 04:22:24')).toBe('5 ene 2026');
        expect(formatDay(null)).toBeNull();
    });

    it('formatPeriod según la frecuencia', () => {
        expect(formatPeriod('2026-10-19', 'D')).toBe('19 oct 2026');
        expect(formatPeriod('2026-08-01', 'M')).toBe('ago 2026');
        expect(formatPeriod('2026-04-01', 'T')).toBe('T2-2026');
        expect(formatPeriod('2025-01-01', 'A')).toBe('2025');
        expect(formatPeriod(null, 'M')).toBeNull();
    });
});

describe('latestDate', () => {
    it('toma la fecha más reciente e ignora series que no están', () => {
        expect(latestDate(DATA.bcch.series, ['imacec_no_minero', 'imacec', 'no_existe'])).toBe('2026-08-01');
        expect(latestDate(DATA.bcch.series, ['no_existe'])).toBeNull();
        expect(latestDate(undefined, ['imacec'])).toBeNull();
    });
});

describe('buildSourceGroups', () => {
    const rows = rowsById(buildSourceGroups(DATA, new Date(2026, 9, 19)));

    it('lee el último dato y la revisión de las series del Banco Central', () => {
        expect(rows.imacec).toMatchObject({ lastData: 'ago 2026', checked: '19 oct 2026', sectionLabel: 'Indicadores' });
        expect(rows.monedas.lastData).toBe('19 oct 2026');
        expect(rows.cuentas.lastData).toBe('T2-2026');
        expect(rows['ied-region'].lastData).toBe('2025');
        expect(rows.eee.lastData).toBe('oct 2026');
    });

    it('marca las proyecciones de población', () => {
        expect(rows.poblacion.lastData).toBe('Proyección hasta 2070');
    });

    it('lee DIPRES, IED por país y proyecciones de sus propios archivos', () => {
        expect(rows.ejecucion).toMatchObject({ lastData: 'jun 2026', checked: '19 oct 2026', sectionLabel: 'Finanzas públicas' });
        expect(rows['ied-pais']).toMatchObject({ lastData: '2025', checked: '18 oct 2026' });
        expect(rows.weo).toMatchObject({ lastData: 'oct 2026', checked: '19 oct 2026' });
    });

    it('deja vacío lo que falta, sin inventar fechas', () => {
        expect(rows.ipom).toMatchObject({ lastData: 'sep 2026', checked: null });
        expect(rows.tcr.lastData).toBeNull();
        const empty = rowsById(buildSourceGroups(null, new Date(2026, 9, 19)));
        expect(empty.imacec).toMatchObject({ lastData: null, checked: null });
        expect(empty.ejecucion).toMatchObject({ lastData: null, checked: null });
    });
});
