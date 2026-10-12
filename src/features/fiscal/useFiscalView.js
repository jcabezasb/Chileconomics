import { useEffect, useMemo, useState } from 'react';
import { loadFiscalData } from '../../data/dipres/client';
import { getSeriesMap } from '../../data/bcch/client';
import { SERIES } from '../../data/bcch/seriesKeys';
import {
    buildHistory,
    buildMacroContext,
    buildPeriods,
    buildTreeView,
    nodeStats,
    prepareFiscalData
} from './fiscalView';

// Datos de la sección de finanzas públicas: carga el JSON de la DIPRES y, del Banco Central,
// el IPC (para la variación real) y el PIB nominal (para el % del PIB).
const useFiscalView = () => {
    const [state, setState] = useState(null);
    const [periodId, setPeriodId] = useState(null);
    const [selectedId, setSelectedId] = useState('resumen');

    useEffect(() => {
        let isActive = true;
        Promise.all([
            loadFiscalData(),
            getSeriesMap({ ipc: SERIES.ipcGeneral, pibNominal: SERIES.pibNominal })
        ]).then(([payload, macro]) => {
            if (!isActive) return;
            const data = prepareFiscalData(payload);
            setState(data ? { data, context: buildMacroContext(macro), periods: buildPeriods(data) } : { error: true });
        });
        return () => {
            isActive = false;
        };
    }, []);

    const period = useMemo(() => {
        if (!state?.periods) return null;
        return state.periods.find((item) => item.id === periodId) || state.periods[0];
    }, [state, periodId]);

    const view = useMemo(() => {
        if (!state?.data || !period) return null;
        const { data, context, periods } = state;
        const tree = buildTreeView(data, context, period);
        const summary = ['ingresos', 'gastos', 'balance'].map((id) => ({ id, ...nodeStats(data, context, id, period) }));
        const historyOf = (id) => buildHistory(data, context, id, periods);
        return { tree, summary, historyOf };
    }, [state, period]);

    return {
        loading: !state,
        error: Boolean(state?.error),
        data: state?.data || null,
        periods: state?.periods || [],
        period,
        setPeriodId,
        selectedId,
        setSelectedId,
        view
    };
};

export default useFiscalView;
