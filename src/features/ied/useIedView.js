import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadBcchData } from '../../data/bcch/client';
import { iedKey } from '../../data/bcch/seriesKeys';
import { IED_GROUPS, IED_ITEMS, IED_UNASSIGNED } from './iedGroups';
import { buildCountryData, countrySnapshot, lineSeries } from './iedCountryView';
import { buildIedData, iedHistory, iedSnapshot } from './iedView';
import useTweenedValues from './useTweenedValues';

const PLAY_STEP_MS = 1400;
// En pantallas angostas el globo y el mapa quedan muy chicos: se parte por el gráfico de líneas.
const NARROW = '(max-width: 640px)';
const initialView = () => (typeof window !== 'undefined' && window.matchMedia?.(NARROW).matches ? 'lineas' : 'mapa');
const COUNTRIES_URL = '/data/ied_paises.json';

const NOTES = {
    groupedRegion: 'El Banco Central publica estas regiones juntas.',
    unassignedRegion: 'Parte del stock que el Banco Central no asigna a ninguna región.',
    rest: 'Países que el Banco Central publica agrupados.',
    continent: 'El Banco Central no desglosa este continente por país.',
    unassignedCountry: 'Parte del stock que el Banco Central no asigna a ningún país.',
    outwardRegions: 'El Banco Central no publica por región la inversión de Chile en el exterior.'
};

const loadCountries = () => fetch(COUNTRIES_URL)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

// Ficha de lo destacado: todo Chile si no hay nada, una región o un país.
const buildFocus = ({ direction, year, regional, countries, activeId }) => {
    const inward = direction === 'inward';
    const region = inward ? regional?.items.find((item) => item.id === activeId) : null;
    const country = countries?.items.find((item) => item.id === activeId);
    if (region) {
        const group = IED_GROUPS.find((entry) => entry.id === region.id);
        return {
            label: region.label,
            value: region.value,
            share: region.share,
            change: region.change,
            history: regional.history(region.id),
            note: region.id === IED_UNASSIGNED.id ? NOTES.unassignedRegion : group?.regions.length > 1 ? NOTES.groupedRegion : null
        };
    }
    if (country) {
        const notes = { rest: NOTES.rest, continent: NOTES.continent, unassigned: NOTES.unassignedCountry };
        return {
            label: country.label,
            value: country.value,
            share: country.share,
            change: country.change,
            history: country.history,
            note: notes[country.kind] || null
        };
    }
    const source = countries || regional;
    if (!source) return null;
    return {
        label: inward ? `Chile · IED recibida · ${year}` : `Chile · inversión en el exterior · ${year}`,
        isTotal: true,
        value: source.total,
        change: source.totalChange,
        history: source.totalHistory,
        note: inward ? null : NOTES.outwardRegions
    };
};

// Datos y estado de la sección de IED: sentido (hacia o desde Chile), año, reproducción y destacado.
const useIedView = () => {
    const [regionalData, setRegionalData] = useState(null);
    const [countryData, setCountryData] = useState(undefined);
    const [direction, setDirection] = useState('inward');
    const [chartView, setChartView] = useState(initialView);
    const [lineBreakdown, setLineBreakdown] = useState('paises');
    const [year, setYear] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        let isActive = true;
        Promise.all([loadBcchData(), loadCountries()]).then(([{ series }, payload]) => {
            if (!isActive) return;
            const byItem = Object.fromEntries(IED_ITEMS.map((item) => [item.id, series[iedKey.group(item.id)] || []]));
            setRegionalData(buildIedData({ total: series[iedKey.total] || [], ...byItem }));
            setCountryData(buildCountryData(payload));
        });
        return () => {
            isActive = false;
        };
    }, []);

    // Años con datos por región y por país (si el archivo de países no está, solo por región).
    const years = useMemo(() => {
        const regional = regionalData?.years || [];
        return countryData ? regional.filter((entry) => countryData.years.includes(entry)) : regional;
    }, [regionalData, countryData]);
    const lastYear = years[years.length - 1] ?? null;
    const currentYear = years.includes(year) ? year : lastYear;

    // Reproducción: avanza un año cada PLAY_STEP_MS y se detiene en el último.
    useEffect(() => {
        if (!playing) return undefined;
        const index = years.indexOf(currentYear);
        if (index < 0 || index >= years.length - 1) {
            setPlaying(false);
            return undefined;
        }
        const timer = setTimeout(() => setYear(years[index + 1]), PLAY_STEP_MS);
        return () => clearTimeout(timer);
    }, [playing, currentYear, years]);

    const togglePlay = useCallback(() => {
        if (!playing && currentYear === lastYear) setYear(years[0]);
        setPlaying(!playing);
    }, [playing, currentYear, lastYear, years]);

    const chooseYear = useCallback((value) => {
        setPlaying(false);
        setYear(value);
    }, []);

    const chooseDirection = useCallback((value) => {
        setDirection(value);
        setHoveredId(null);
        setSelectedId(null);
    }, []);

    const toggleSelected = useCallback((id) => setSelectedId((current) => (current === id ? null : id)), []);
    const clearSelected = useCallback(() => setSelectedId(null), []);

    const regional = useMemo(() => {
        if (!regionalData || !currentYear) return null;
        const snapshot = iedSnapshot(regionalData, currentYear);
        return {
            ...snapshot,
            totalHistory: iedHistory(regionalData, null),
            history: (id) => iedHistory(regionalData, id)
        };
    }, [regionalData, currentYear]);
    const countries = useMemo(
        () => (countryData && currentYear ? countrySnapshot(countryData, direction, currentYear) : null),
        [countryData, direction, currentYear]
    );

    // Montos que se animan al cambiar de año o de sentido: regiones y países juntos.
    const targetValues = useMemo(() => {
        if (!regional) return null;
        const values = Object.fromEntries(regional.items.map((item) => [item.id, item.value]));
        (countries?.items || []).forEach((item) => {
            values[item.id] = item.value;
        });
        return values;
    }, [regional, countries]);
    const animatedValues = useTweenedValues(targetValues);

    // Gráfico de líneas: principales países del sentido elegido, o regiones (solo hacia Chile).
    const lines = useMemo(() => {
        if (!regionalData) return null;
        const breakdown = direction === 'inward' ? lineBreakdown : 'paises';
        if (breakdown === 'regiones') {
            const items = IED_GROUPS.map((group) => ({
                id: group.id,
                label: group.short,
                values: regionalData.years.map((entry) => regionalData.values[group.id][entry])
            }));
            return { breakdown, ...lineSeries(items, regionalData.years) };
        }
        if (!countryData) return null;
        return { breakdown, ...lineSeries(countryData[direction].items.filter((item) => item.kind === 'country'), countryData.years) };
    }, [regionalData, countryData, direction, lineBreakdown]);

    const activeId = hoveredId || selectedId;
    const focus = useMemo(
        () => buildFocus({ direction, year: currentYear, regional, countries, activeId }),
        [direction, currentYear, regional, countries, activeId]
    );

    return {
        loading: regionalData === null || countryData === undefined,
        hasCountries: Boolean(countryData),
        regionalData,
        countryData,
        direction,
        chooseDirection,
        chartView,
        setChartView,
        lineBreakdown,
        setLineBreakdown,
        lines,
        years,
        year: currentYear,
        chooseYear,
        playing,
        togglePlay,
        regional,
        countries,
        animatedValues,
        activeId,
        selectedId,
        focus,
        setHoveredId,
        toggleSelected,
        clearSelected
    };
};

export default useIedView;
