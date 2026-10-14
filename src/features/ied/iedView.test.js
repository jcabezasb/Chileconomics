import { describe, expect, it } from 'vitest';
import { IED_GROUPS, IED_ITEMS, iedGroupOfRegion } from './iedGroups';
import { buildIedData, iedHistory, iedSnapshot } from './iedView';
import { barSegments, contiguousSpans, ribbonPath, ribbonTarget, sparkline, spreadLabels } from './iedLayout';

// Dos años: cada ítem vale 10 en 2024 y 20 en 2025; el total es la suma.
const point = (year, value) => ({ date: `${year}-01-01`, value });
const series = Object.fromEntries(IED_ITEMS.map((item) => [item.id, [point(2024, 10), point(2025, 20)]]));
series.total = [point(2023, 50), point(2024, 10 * IED_ITEMS.length), point(2025, 20 * IED_ITEMS.length)];

describe('grupos de IED', () => {
    it('cubre cada región una sola vez, de norte a sur', () => {
        const regions = IED_GROUPS.flatMap((group) => group.regions);
        expect(new Set(regions).size).toBe(16);
        expect(regions.length).toBe(16);
        expect(iedGroupOfRegion('VIII')).toBe('XVI_VIII_IX');
        expect(iedGroupOfRegion('RM')).toBe('RM');
    });
});

describe('buildIedData e iedSnapshot', () => {
    it('deja solo los años con total y todos los grupos', () => {
        expect(buildIedData(series).years).toEqual([2024, 2025]);
    });

    it('calcula participación y variación anual', () => {
        const snapshot = iedSnapshot(buildIedData(series), 2025);
        const rm = snapshot.items.find((item) => item.id === 'RM');
        expect(snapshot.total).toBe(20 * IED_ITEMS.length);
        expect(snapshot.totalChange).toBeCloseTo(100);
        expect(rm.share).toBeCloseTo(1 / IED_ITEMS.length);
        expect(rm.change).toBeCloseTo(100);
    });

    it('sin año anterior la variación queda vacía', () => {
        const snapshot = iedSnapshot(buildIedData(series), 2024);
        expect(snapshot.items[0].change).toBeNull();
    });

    it('entrega la evolución del total o de un grupo', () => {
        const data = buildIedData(series);
        expect(iedHistory(data, null)).toEqual([{ year: 2024, value: 10 * IED_ITEMS.length }, { year: 2025, value: 20 * IED_ITEMS.length }]);
        expect(iedHistory(data, 'RM')).toEqual([{ year: 2024, value: 10 }, { year: 2025, value: 20 }]);
    });

    it('sin datos no hay años', () => {
        expect(buildIedData({}).years).toEqual([]);
    });
});

describe('geometría', () => {
    it('reparte la barra en proporción al valor, con espacio entre segmentos', () => {
        const segments = barSegments([{ id: 'a', value: 3 }, { id: 'b', value: 1 }], { top: 10, height: 102, gap: 2 });
        expect(segments[0]).toEqual({ id: 'a', y0: 10, y1: 85 });
        expect(segments[1]).toEqual({ id: 'b', y0: 87, y1: 112 });
    });

    it('junta los tramos del mapa sin superponerlos', () => {
        const spans = contiguousSpans([{ id: 'a', y0: 0, y1: 12 }, { id: 'b', y0: 8, y1: 20 }]);
        expect(spans[0].y1).toBe(10);
        expect(spans[1].y0).toBe(10);
        expect(spans[1].y1).toBe(20);
    });

    it('la cinta llega al mapa con el grosor de su segmento, sin salirse del tramo', () => {
        expect(ribbonTarget({ y0: 0, y1: 10 }, { y0: 100, y1: 200 })).toEqual([145, 155]);
        expect(ribbonTarget({ y0: 0, y1: 80 }, { y0: 100, y1: 120 })).toEqual([100, 120]);
    });

    it('dibuja la cinta como una figura cerrada entre ambos tramos', () => {
        expect(ribbonPath(0, [0, 10], 100, [40, 45])).toBe('M0,0 C50,0 50,40 100,40 L100,45 C50,45 50,10 0,10 Z');
    });

    it('separa etiquetas cercanas sin salir de los bordes', () => {
        expect(spreadLabels([10, 12, 13], 5, 0, 100)).toEqual([10, 15, 20]);
        expect(spreadLabels([95, 98], 5, 0, 100)).toEqual([95, 100]);
        expect(spreadLabels([99, 100], 5, 0, 100)).toEqual([95, 100]);
    });

    it('el minigráfico parte de cero y llega al máximo arriba', () => {
        const { points, line, area } = sparkline([0, 5, 10], 100, 50);
        expect(points).toEqual([{ x: 0, y: 50 }, { x: 50, y: 25 }, { x: 100, y: 0 }]);
        expect(line).toBe('M0,50 L50,25 L100,0');
        expect(area).toBe('M0,50 L50,25 L100,0 L100,50 L0,50 Z');
    });
});
