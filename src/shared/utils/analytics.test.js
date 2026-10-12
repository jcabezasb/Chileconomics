import { describe, expect, it } from 'vitest';
import { formatNumber, formatQuarterLabel, formatShortDate } from './format';
import { buildAnnualPerCapita, buildLatestPerCapita, buildRegionalPerCapitaRanking } from './perCapita';
import { buildJoinedReturns, buildRollingCorrelation, correlationBetween, toWeekly } from './correlation';
import { downsampleLTTB, downsampleStride } from './downsample';
import { computeSeriesStats, formatPeriodChange, formatShortDate as formatDetailDate } from './detailStats';

describe('format', () => {
    it('usa el formato chileno', () => {
        expect(formatNumber(1234.5, 1)).toBe('1.234,5');
        expect(formatNumber(0.456, { minimumFractionDigits: 2 })).toBe('0,46');
        expect(formatShortDate('2026-04-09')).toBe('09/04/26');
        expect(formatQuarterLabel('2026-04-01')).toBe('T2-2026');
    });
});

describe('detailStats', () => {
    const series = [
        { date: '2025-01-01', value: 10 },
        { date: '2025-02-01', value: 30 },
        { date: '2025-03-01', value: 20 }
    ];

    it('resume mínimo, máximo y promedio', () => {
        const stats = computeSeriesStats(series);
        expect(stats.max).toEqual({ date: '2025-02-01', value: 30 });
        expect(stats.min).toEqual({ date: '2025-01-01', value: 10 });
        expect(stats.average).toBe(20);
    });

    it('expresa el cambio en % para niveles y en pp para tasas', () => {
        const stats = computeSeriesStats(series);
        expect(formatPeriodChange(stats, false)).toEqual({ text: '+100,0%', direction: 'up' });
        expect(formatPeriodChange(stats, true)).toEqual({ text: '+10,0 pp', direction: 'up' });
    });

    it('muestra el día solo en series diarias', () => {
        expect(formatDetailDate('2026-10-01')).toBe('oct 2026');
        expect(formatDetailDate('2026-10-01', true)).toBe('1 oct 2026');
        expect(formatDetailDate('2026-10-05')).toBe('5 oct 2026');
    });
});

describe('perCapita', () => {
    const pib = ['2024-01-01', '2024-04-01', '2024-07-01', '2024-10-01', '2025-01-01', '2025-04-01', '2025-07-01', '2025-10-01']
        .map((date) => ({ date, value: 25 }));
    const population = [{ date: '2024-01-01', value: 100_000_000 }, { date: '2025-01-01', value: 100_000_000 }];

    it('suma 4 trimestres (miles de millones) y divide por la población', () => {
        expect(buildAnnualPerCapita(pib, population)).toEqual([
            { date: '2024-01-01', value: 1000 },
            { date: '2025-01-01', value: 1000 }
        ]);
        const latest = buildLatestPerCapita(pib, population);
        expect(latest.value).toBe(1000);
        expect(latest.growth).toBe(0);
    });

    it('ordena regiones y calcula el promedio ponderado', () => {
        const ranking = buildRegionalPerCapitaRanking({
            A: { pib: { history: pib }, pob: { total: population } },
            B: { pib: { history: pib.map((p) => ({ ...p, value: 50 })) }, pob: { total: population } }
        });
        expect(ranking.rows.map((r) => r.regionId)).toEqual(['B', 'A']);
        expect(ranking.average).toBe(1500);
    });
});

describe('correlation', () => {
    it('agrupa por semana con el último dato', () => {
        const weekly = toWeekly([
            { date: '2026-10-05', value: 1 },
            { date: '2026-10-07', value: 2 },
            { date: '2026-10-12', value: 3 }
        ]);
        expect(weekly.map((w) => [w.date, w.value])).toEqual([['2026-10-05', 2], ['2026-10-12', 3]]);
    });

    it('da -1 cuando las series se mueven exactamente al revés', () => {
        const a = [1, 2, 1.5, 3, 2.5].map((value, i) => ({ date: `2026-01-0${i + 1}`, value }));
        const b = a.map((p) => ({ date: p.date, value: 10 / p.value }));
        const returns = buildJoinedReturns(a, b);
        expect(correlationBetween(returns)).toBeCloseTo(-1);
        const rolling = buildRollingCorrelation(returns, [{ key: 'c', size: 3 }]);
        expect(rolling).toHaveLength(2);
        rolling.forEach((row) => expect(row.c).toBeCloseTo(-1));
    });
});

describe('downsample', () => {
    const data = Array.from({ length: 1000 }, (_, i) => ({ date: String(i), value: i === 500 ? 999 : Math.sin(i / 50) }));

    it('LTTB conserva extremos, primer y último punto', () => {
        const sampled = downsampleLTTB(data, 100);
        expect(sampled).toHaveLength(100);
        expect(sampled[0]).toBe(data[0]);
        expect(sampled[99]).toBe(data[999]);
        expect(sampled).toContain(data[500]);
    });

    it('no toca series cortas', () => {
        expect(downsampleLTTB(data.slice(0, 50), 100)).toHaveLength(50);
        expect(downsampleStride(data, 100).length).toBeLessThanOrEqual(101);
    });
});
