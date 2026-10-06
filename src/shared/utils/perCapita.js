// PIB per cápita a partir del PIB trimestral (miles de millones de pesos encadenados 2018)
// y la población anual (personas, proyecciones INE).

const BILLIONS = 1e9;

const yearOf = (date) => (date ? date.slice(0, 4) : '');

const buildPopulationByYear = (populationSeries) => {
    const map = new Map();
    (populationSeries || []).forEach((entry) => {
        const value = Number(entry?.value);
        if (entry?.date && Number.isFinite(value) && value > 0) map.set(yearOf(entry.date), value);
    });
    return map;
};

// Serie anual: suma de los 4 trimestres de cada año completo dividida por la población de ese año.
// Valores en pesos por habitante.
export const buildAnnualPerCapita = (pibQuarterly, populationSeries) => {
    const population = buildPopulationByYear(populationSeries);
    const byYear = new Map();
    (pibQuarterly || []).forEach((entry) => {
        const value = Number(entry?.value);
        if (!entry?.date || !Number.isFinite(value)) return;
        const year = yearOf(entry.date);
        const current = byYear.get(year) || { sum: 0, count: 0 };
        current.sum += value;
        current.count += 1;
        byYear.set(year, current);
    });
    return Array.from(byYear.entries())
        .filter(([year, { count }]) => count === 4 && population.has(year))
        .map(([year, { sum }]) => ({ date: `${year}-01-01`, value: (sum * BILLIONS) / population.get(year) }))
        .sort((a, b) => a.date.localeCompare(b.date));
};

// Último dato en 12 meses móviles: los 4 trimestres más recientes sobre la población del año del último trimestre.
// Incluye la variación real respecto a los 12 meses anteriores.
export const buildLatestPerCapita = (pibQuarterly, populationSeries) => {
    const population = buildPopulationByYear(populationSeries);
    const valid = (pibQuarterly || []).filter((entry) => entry?.date && Number.isFinite(Number(entry.value)));
    if (valid.length < 8) return null;

    const window = (endIndex) => {
        const slice = valid.slice(endIndex - 3, endIndex + 1);
        const end = slice[slice.length - 1];
        const pop = population.get(yearOf(end.date));
        if (!pop) return null;
        const sum = slice.reduce((acc, entry) => acc + Number(entry.value), 0);
        return { date: end.date, value: (sum * BILLIONS) / pop, pibAnnual: sum, population: pop };
    };

    const latest = window(valid.length - 1);
    const previous = window(valid.length - 5);
    if (!latest) return null;
    return {
        ...latest,
        growth: previous ? ((latest.value - previous.value) / previous.value) * 100 : null
    };
};

// Ranking de regiones por PIB per cápita y promedio del conjunto de regiones
// (PIB regional sumado / población sumada; no es igual al nacional porque el PIB regionalizado
// excluye partidas que no se asignan a una región).
export const buildRegionalPerCapitaRanking = (regionalData) => {
    const rows = Object.entries(regionalData || {})
        .map(([regionId, entry]) => {
            const latest = buildLatestPerCapita(entry?.pib?.history, entry?.pob?.total);
            return latest ? { regionId, ...latest } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value)
        .map((row, index) => ({ ...row, rank: index + 1 }));

    const totals = rows.reduce((acc, row) => ({
        pib: acc.pib + row.pibAnnual,
        population: acc.population + row.population
    }), { pib: 0, population: 0 });
    const average = totals.population ? (totals.pib * BILLIONS) / totals.population : null;

    return { rows, average, byId: Object.fromEntries(rows.map((row) => [row.regionId, row])) };
};
