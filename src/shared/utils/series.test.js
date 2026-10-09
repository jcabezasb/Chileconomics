import { describe, expect, it } from 'vitest';
import {
    buildGovernmentResidualSeries,
    buildPeriods,
    computeSeriesStatsAtDate,
    getTrendFromHistory,
    mergeInvestmentSeries,
    normalizeSeries
} from './series';

const quarterly = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-04-01', value: 102 },
    { date: '2024-07-01', value: 101 },
    { date: '2024-10-01', value: 105 },
    { date: '2025-01-01', value: 110 }
];

describe('normalizeSeries', () => {
    it('descarta nulos y convierte a número', () => {
        expect(normalizeSeries([{ date: 'a', value: '3' }, { date: 'b', value: null }, { date: 'c', value: 'x' }]))
            .toEqual([{ date: 'a', value: 3 }]);
    });
});

describe('getTrendFromHistory', () => {
    it('compara el último con el primero', () => {
        expect(getTrendFromHistory([1, 2, 3])).toBe('up');
        expect(getTrendFromHistory([3, 2, 1])).toBe('down');
        expect(getTrendFromHistory([1], 'neutral')).toBe('neutral');
    });
});

describe('computeSeriesStatsAtDate', () => {
    it('calcula la variación contra 4 trimestres antes', () => {
        const stats = computeSeriesStatsAtDate(quarterly, null, { lag: 4, historyPoints: 4 });
        expect(stats.value).toBe(110);
        expect(stats.variation).toBeCloseTo(10);
        expect(stats.history).toEqual([102, 101, 105, 110]);
        expect(stats.date).toBe('2025-01-01');
    });

    it('usa la fecha pedida cuando existe', () => {
        expect(computeSeriesStatsAtDate(quarterly, '2024-10-01').value).toBe(105);
    });
});

describe('buildPeriods', () => {
    it('asigna año y trimestre', () => {
        expect(buildPeriods(quarterly.slice(0, 2))).toEqual([
            { date: '2024-01-01', year: '2024', quarter: 'Q1' },
            { date: '2024-04-01', year: '2024', quarter: 'Q2' }
        ]);
    });
});

describe('mergeInvestmentSeries', () => {
    it('suma FBKF y variación de existencias por fecha', () => {
        const merged = mergeInvestmentSeries(
            [{ date: '2024-01-01', value: 10 }],
            [{ date: '2024-01-01', value: -2 }, { date: '2024-04-01', value: 1 }]
        );
        expect(merged).toEqual([{ date: '2024-01-01', value: 8 }, { date: '2024-04-01', value: 1 }]);
    });
});

describe('buildGovernmentResidualSeries', () => {
    it('calcula G = PIB - C - I - X + M', () => {
        const point = (value) => [{ date: '2024-01-01', value }];
        expect(buildGovernmentResidualSeries(point(100), point(60), point(20), point(30), point(25)))
            .toEqual([{ date: '2024-01-01', value: 15 }]);
    });
});
