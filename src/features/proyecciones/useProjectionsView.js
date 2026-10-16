import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadBcchData } from '../../data/bcch/client';
import { SERIES } from '../../data/bcch/seriesKeys';
import {
    SOURCES,
    annualGrowth,
    buildProducts,
    currentYear,
    revisionSeries,
    revisionYears,
    summaryRows,
    yearRows
} from './projectionsView';

const PROJECTIONS_URL = '/data/proyecciones.json';

const loadProjections = () => fetch(PROJECTIONS_URL)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

// Datos y estado de la sección de proyecciones: fuente (Banco Central, FMI o comparar), qué
// productos se muestran, vista (por año o revisiones) y año elegido para las revisiones.
const useProjectionsView = () => {
    const [data, setData] = useState(null);
    const [source, setSource] = useState('bcch');
    const [hidden, setHidden] = useState([]);
    const [view, setView] = useState('anual');
    const [target, setTarget] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    useEffect(() => {
        let isActive = true;
        Promise.all([loadBcchData(), loadProjections()]).then(([{ series }, payload]) => {
            if (!isActive) return;
            setData({
                products: buildProducts({ series, payload }),
                actual: annualGrowth(series[SERIES.pibReal] || [])
            });
        });
        return () => {
            isActive = false;
        };
    }, []);

    const sourceProducts = useMemo(() => {
        if (!data) return [];
        const ids = SOURCES.find((entry) => entry.id === source).products;
        return data.products.filter((product) => ids.includes(product.id) && product.vintages.length);
    }, [data, source]);
    const products = useMemo(
        () => sourceProducts.filter((product) => !hidden.includes(product.id)),
        [sourceProducts, hidden]
    );

    // Siempre queda al menos un producto visible.
    const toggleProduct = useCallback((id) => {
        setHidden((current) => {
            if (current.includes(id)) return current.filter((entry) => entry !== id);
            const visible = sourceProducts.filter((product) => !current.includes(product.id));
            return visible.length > 1 ? [...current, id] : current;
        });
    }, [sourceProducts]);

    const chooseSource = useCallback((id) => {
        setSource(id);
        setHidden([]);
        setHoveredId(null);
    }, []);

    const baseYear = useMemo(() => (data ? currentYear(data.products) : null), [data]);
    const years = useMemo(() => revisionYears(products), [products]);
    const targetYear = years.includes(target) ? target : (years.includes(baseYear) ? baseYear : years[years.length - 1] ?? null);

    const rows = useMemo(() => (data ? yearRows({ products, actual: data.actual }) : []), [data, products]);
    const revisions = useMemo(
        () => (targetYear ? revisionSeries({ products, target: targetYear }) : []),
        [products, targetYear]
    );
    const summary = useMemo(
        () => (baseYear ? summaryRows(sourceProducts, baseYear) : null),
        [sourceProducts, baseYear]
    );

    return {
        loading: data === null,
        hasData: Boolean(data?.products.some((product) => product.vintages.length)),
        actual: data?.actual || {},
        source,
        chooseSource,
        sourceProducts,
        products,
        hidden,
        toggleProduct,
        view,
        setView,
        years,
        targetYear,
        setTarget,
        rows,
        revisions,
        summary,
        hoveredId,
        setHoveredId
    };
};

export default useProjectionsView;
