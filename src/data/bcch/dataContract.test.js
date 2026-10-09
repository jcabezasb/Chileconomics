// Contrato entre python/bcch_shared.py y el frontend: toda clave que usa el sitio debe existir
// en el JSON publicado. Si falla, se renombró o eliminó una serie en Python sin actualizar
// src/data/bcch/seriesKeys.js (o la última sincronización no la trajo).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../../shared/constants/regions';
import { SERIES, regionalKey } from './seriesKeys';

const payload = JSON.parse(fs.readFileSync(new URL('../../../public/data/bcch_series.json', import.meta.url), 'utf8'));
const available = new Set(Object.keys(payload.series));

describe('bcch_series.json', () => {
    it('tiene todas las series nacionales que usa el sitio', () => {
        const missing = Object.values(SERIES).filter((key) => !available.has(key));
        expect(missing).toEqual([]);
    });

    it('tiene las series regionales de las 16 regiones', () => {
        const keys = REGION_IDS.flatMap((regionId) => [
            regionalKey.pib(regionId),
            regionalKey.population(regionId),
            regionalKey.populationWomen(regionId),
            regionalKey.populationMen(regionId),
            regionalKey.laborForce(regionId),
            regionalKey.employed(regionId),
            regionalKey.unemploymentRate(regionId)
        ]);
        expect(keys.filter((key) => !available.has(key))).toEqual([]);
    });

    it('cada serie es una lista de { date, value } ordenada por fecha', () => {
        Object.entries(payload.series).forEach(([key, entry]) => {
            const data = Array.isArray(entry) ? entry : entry.data;
            expect(Array.isArray(data), key).toBe(true);
            const dates = data.map((point) => point.date);
            expect(dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)), key).toBe(true);
            expect([...dates].sort(), key).toEqual(dates);
        });
    });
});
