import { describe, expect, it } from 'vitest';
import {
    buildHistory,
    buildMacroContext,
    buildPeriods,
    buildTreeView,
    monthlyRows,
    nodeStats,
    prepareFiscalData,
    realChange,
    treeCsv
} from './fiscalView';
import { formatNumber } from '../../shared/utils/format';
import { formatPct, formatPesos, niceTicks } from './fiscalFormat';

// Dos años: 2025 completo y 2026 hasta junio. Cada mes: ingresos 10, gastos 12 (tributarios 8 + otros 2).
const months = (count, value) => Array.from({ length: count }, () => value);
const payload = {
    start: '2025-01',
    last_period: '2026-06',
    tree: [
        { id: 'ingresos', label: 'Ingresos', children: [{ id: 'tributarios', label: 'Tributarios' }, { id: 'otros', label: 'Otros' }] },
        { id: 'gastos', label: 'Gastos' }
    ],
    series: {
        ingresos: months(18, 10),
        tributarios: months(18, 8),
        otros: months(18, 2),
        gastos: [...months(12, 12), ...months(6, 15)],
        balance: [...months(12, -2), ...months(6, 1)]
    }
};
const data = prepareFiscalData(payload);

// IPC: 100 en 2025 y 110 en 2026. PIB: 1 (mil millones) por trimestre = 1.000 millones.
const ipc = [
    ...Array.from({ length: 12 }, (_, i) => ({ date: `2025-${String(i + 1).padStart(2, '0')}-01`, value: 100 })),
    ...Array.from({ length: 6 }, (_, i) => ({ date: `2026-${String(i + 1).padStart(2, '0')}-01`, value: 110 }))
];
const pibNominal = ['2025-01-01', '2025-04-01', '2025-07-01', '2025-10-01', '2026-01-01'].map((date) => ({ date, value: 1 }));
const context = buildMacroContext({ ipc, pibNominal });

describe('fiscalView', () => {
    it('ofrece el año en curso acumulado y los años cerrados', () => {
        const periods = buildPeriods(data);
        expect(periods.map((period) => period.id)).toEqual(['2026-ytd', '2025']);
        expect(periods[0]).toMatchObject({ year: 2026, months: 6, partial: true, label: '2026 (ene–jun)' });
    });

    it('suma el período y calcula el % del PIB de los mismos trimestres', () => {
        const year = nodeStats(data, context, 'ingresos', { year: 2025, months: 12 });
        expect(year.value).toBe(120);
        expect(year.pctPib).toBeCloseTo(3);
        // Falta el PIB del 2° trimestre de 2026: no se inventa el %.
        expect(nodeStats(data, context, 'ingresos', { year: 2026, months: 6 }).pctPib).toBeNull();
        expect(nodeStats(data, context, 'ingresos', { year: 2026, months: 3 }).pctPib).toBeCloseTo(3);
    });

    it('calcula la variación real deflactando por el IPC', () => {
        // Gastos: 15 a precios de 110 contra 12 a precios de 100 -> 15/1,1/12 - 1 = 13,6%
        expect(realChange(data.series.gastos, context.ipc, 2026, 6)).toBeCloseTo((15 / 1.1 / 12 - 1) * 100);
        // El balance cambia de signo: la variación no tiene sentido.
        expect(realChange(data.series.balance, context.ipc, 2026, 6)).toBeNull();
        // 2024 no existe.
        expect(realChange(data.series.gastos, context.ipc, 2025, 12)).toBeNull();
    });

    it('arma el árbol con el peso de cada partida en su rama', () => {
        const [ingresos] = buildTreeView(data, context, { year: 2025, months: 12 });
        expect(ingresos.share).toBe(100);
        expect(ingresos.children.map((child) => child.share)).toEqual([80, 20]);
        expect(ingresos.children[0].depth).toBe(1);
        const csv = treeCsv(buildTreeView(data, context, { year: 2025, months: 12 }), formatNumber).split('\n');
        expect(csv[0]).toBe('partida;monto_millones_pesos;porcentaje_pib;variacion_real_pct');
        expect(csv[1]).toBe('Ingresos;120;3,00;');
        expect(csv[2]).toBe('  Tributarios;96;2,40;');
    });

    it('arma la historia anual y la serie mensual', () => {
        const history = buildHistory(data, context, 'gastos', buildPeriods(data));
        expect(history.map((entry) => entry.label)).toEqual(['2025', '2026*']);
        expect(history[1].value).toBe(90);
        expect(monthlyRows(data, 'gastos')[12]).toEqual({ date: '2026-01-01', value: 15 });
    });

    it('formatea montos en millones con la unidad adecuada', () => {
        expect(formatPesos(72581123)).toBe('$72,6 billones');
        expect(formatPesos(895536)).toBe('$896 mil millones');
        expect(formatPesos(-1880)).toBe('−$1,9 mil millones');
        expect(formatPesos(450)).toBe('$450 millones');
        expect(formatPesos(null)).toBe('--');
        expect(formatPct(-1.43)).toBe('−1,4%');
        expect(formatPct(-0.01)).toBe('0,0%');
    });

    it('elige marcas redondas para el eje, incluyendo el cero', () => {
        expect(niceTicks([31.7, -7.7, 20])).toEqual([-10, 0, 10, 20, 30, 40]);
        expect(niceTicks([2.1, 3.4])).toEqual([0, 1, 2, 3, 4]);
        expect(niceTicks([null])).toBeUndefined();
    });
});
