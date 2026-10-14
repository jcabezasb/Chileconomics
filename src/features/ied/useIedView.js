import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadBcchData } from '../../data/bcch/client';
import { iedKey } from '../../data/bcch/seriesKeys';
import { IED_ITEMS } from './iedGroups';
import { buildIedData, iedSnapshot } from './iedView';
import useTweenedValues from './useTweenedValues';

const PLAY_STEP_MS = 1400;

// Datos y estado de la sección de IED: año elegido, reproducción año a año y grupo destacado.
const useIedView = () => {
    const [data, setData] = useState(null);
    const [year, setYear] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        let isActive = true;
        loadBcchData().then(({ series }) => {
            if (!isActive) return;
            const byItem = Object.fromEntries(IED_ITEMS.map((item) => [item.id, series[iedKey.group(item.id)] || []]));
            setData(buildIedData({ total: series[iedKey.total] || [], ...byItem }));
        });
        return () => {
            isActive = false;
        };
    }, []);

    const years = useMemo(() => data?.years || [], [data]);
    const lastYear = years[years.length - 1] ?? null;
    const currentYear = year ?? lastYear;

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

    const toggleSelected = useCallback((id) => setSelectedId((current) => (current === id ? null : id)), []);
    const clearSelected = useCallback(() => setSelectedId(null), []);

    const snapshot = useMemo(() => (data && currentYear ? iedSnapshot(data, currentYear) : null), [data, currentYear]);
    const targetValues = useMemo(
        () => (snapshot ? Object.fromEntries(snapshot.items.map((item) => [item.id, item.value])) : null),
        [snapshot]
    );
    const animatedValues = useTweenedValues(targetValues);

    const activeId = hoveredId || selectedId;

    return {
        loading: data === null,
        data,
        years,
        year: currentYear,
        chooseYear,
        playing,
        togglePlay,
        snapshot,
        animatedValues,
        activeId,
        selectedId,
        activeItem: snapshot?.items.find((item) => item.id === activeId) || null,
        setHoveredId,
        toggleSelected,
        clearSelected
    };
};

export default useIedView;
