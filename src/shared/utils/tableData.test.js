import { describe, expect, it } from 'vitest';
import { addChanges, detectFrequency, formatChange, formatPeriod, groupRows, periodKey } from './tableData';

describe('detectFrequency', () => {
    it('reconoce diaria, mensual, trimestral y anual', () => {
        expect(detectFrequency([{ date: '2026-10-08' }, { date: '2026-10-09' }])).toBe('day');
        expect(detectFrequency([{ date: '2026-01-01' }, { date: '2026-02-01' }])).toBe('month');
        expect(detectFrequency([{ date: '2026-01-01' }, { date: '2026-04-01' }])).toBe('quarter');
        expect(detectFrequency([{ date: '2025-01-01' }, { date: '2026-01-01' }])).toBe('year');
    });
});

describe('períodos', () => {
    it('arma claves y etiquetas', () => {
        expect(periodKey('2026-10-09', 'quarter')).toBe('2026-T4');
        expect(formatPeriod('2026-T4', 'quarter')).toBe('4T 2026');
        expect(formatPeriod('2026-10', 'month')).toBe('oct 2026');
        expect(formatPeriod('2026-10-09', 'day')).toBe('9 oct 2026');
    });
});

describe('groupRows', () => {
    const rows = [
        { date: '2026-01-05', v: 10 },
        { date: '2026-01-20', v: 20 },
        { date: '2026-02-03', v: 30 }
    ];

    it('promedia, suma o toma el último valor de cada período', () => {
        expect(groupRows(rows, ['v'], 'month').map((r) => [r.key, r.v])).toEqual([['2026-01', 15], ['2026-02', 30]]);
        expect(groupRows(rows, ['v'], 'month', 'sum')[0].v).toBe(30);
        expect(groupRows(rows, ['v'], 'month', 'last')[0].v).toBe(20);
    });
});

describe('addChanges', () => {
    const monthly = ['2025-01', '2025-02', '2026-01', '2026-02'].map((key, i) => ({ key, date: `${key}-01`, v: [100, 110, 120, 99][i] }));

    it('calcula variación contra el período anterior y contra 12 meses antes', () => {
        const result = addChanges(monthly, 'v', 'month', false);
        expect(result[1].change).toBeCloseTo(10);
        expect(result[2].yoy).toBeCloseTo(20);
        expect(result[3].yoy).toBeCloseTo(-10);
        expect(result[0].yoy).toBeNull();
    });

    it('usa puntos porcentuales para tasas', () => {
        expect(addChanges(monthly, 'v', 'month', true)[2].yoy).toBe(20);
        expect(formatChange(-1.25, true)).toBe('−1,3 pp');
        expect(formatChange(2, false)).toBe('+2,0%');
    });

    it('en series diarias busca el día hábil anterior del año pasado', () => {
        const daily = [
            { key: '2025-10-03', date: '2025-10-03', v: 100 },
            { key: '2026-10-05', date: '2026-10-05', v: 110 }
        ];
        expect(addChanges(daily, 'v', 'day', false)[1].yoy).toBeCloseTo(10);
    });
});
