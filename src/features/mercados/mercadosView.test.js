import { describe, expect, it } from 'vitest';
import { chartRows, diffByDate, lastYears, valueOn, weekly, yearChange, yieldCurves } from './mercadosView';

const s = (pairs) => pairs.map(([date, value]) => ({ date, value }));

describe('mercadosView', () => {
    it('valueOn toma el último dato hasta la fecha', () => {
        const series = s([['2026-10-13', 1], ['2026-10-15', 2]]);
        expect(valueOn(series, '2026-10-14')).toBe(1);
        expect(valueOn(series, '2026-10-20')).toBe(2);
        expect(valueOn(series, '2026-10-01')).toBeNull();
    });

    it('lastYears cuenta desde el último dato de la serie', () => {
        const series = s([['2020-01-01', 1], ['2025-10-14', 2], ['2025-10-16', 3], ['2026-10-15', 4]]);
        expect(lastYears(series, 1).map((p) => p.value)).toEqual([3, 4]);
        expect(lastYears([], 1)).toEqual([]);
    });

    it('weekly deja el último dato de cada semana (lunes a domingo)', () => {
        const series = s([['2026-10-12', 1], ['2026-10-16', 2], ['2026-10-18', 3], ['2026-10-19', 4]]);
        expect(weekly(series).map((p) => p.date)).toEqual(['2026-10-18', '2026-10-19']);
    });

    it('diffByDate resta solo en las fechas comunes', () => {
        const chile = s([['2026-10-14', 5.9], ['2026-10-15', 6]]);
        const us = s([['2026-10-15', 5.1], ['2026-10-16', 5]]);
        const diff = diffByDate(chile, us);
        expect(diff.map((p) => p.date)).toEqual(['2026-10-15']);
        expect(diff[0].value).toBeCloseTo(0.9);
    });

    it('yearChange compara con el valor de hace un año', () => {
        expect(yearChange(s([['2025-10-15', 100], ['2026-10-15', 110]]))).toBeCloseTo(10);
        expect(yearChange(s([['2026-10-15', 110]]))).toBeNull();
    });

    it('yieldCurves usa la fecha más reciente común y omite plazos sin dato', () => {
        const chile = { policy: s([['2026-10-19', 4.5]]), 2: s([['2026-10-15', 4.95]]), 10: s([['2026-10-15', 5.99]]) };
        const us = { policy: s([['2026-10-16', 3.88]]), 1: s([['2026-10-16', 4.46]]), 10: s([['2026-10-15', 5.1], ['2026-10-16', 5.09]]) };
        const curves = yieldCurves(chile, us);
        expect(curves.date).toBe('2026-10-15');
        // La TPM solo tiene dato el 19 oct (después de la fecha común): queda fuera.
        expect(curves.chile.map((p) => [p.tenor, p.value])).toEqual([['2', 4.95], ['10', 5.99]]);
        expect(curves.us.map((p) => [p.tenor, p.value])).toEqual([['10', 5.1]]);
    });

    it('chartRows junta las series por fecha, semanal y en el rango', () => {
        const rows = chartRows({ a: s([['2026-10-12', 1], ['2026-10-16', 2]]), b: s([['2026-10-16', 3]]) }, 1);
        expect(rows).toEqual([{ date: '2026-10-16', a: 2, b: 3 }]);
    });
});
