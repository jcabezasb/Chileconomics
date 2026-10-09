import { useEffect, useState } from 'react';
import { REGION_IDS } from '../../shared/constants/regions';
import { buildPeriods } from '../../shared/utils/series';
import { loadBcchData } from './client';
import { getKeyIndicators } from './indicators';
import { SERIES, regionalKey } from './seriesKeys';

// PIB regional: último trimestre, variación contra el mismo trimestre del año anterior e historia.
const buildRegionalPib = (series) => {
    if (!series.length) return null;
    const latest = series[series.length - 1];
    const previous = series.length > 4 ? series[series.length - 5] : null;
    return {
        value: latest.value,
        variation: previous?.value ? ((latest.value - previous.value) / previous.value) * 100 : null,
        history: series,
        date: latest.date
    };
};

const buildDashboardData = (series) => {
    const get = (key) => series[key] || [];

    const regionalData = Object.fromEntries(REGION_IDS.map((regionId) => [regionId, {
        pib: buildRegionalPib(get(regionalKey.pib(regionId))),
        pob: {
            total: get(regionalKey.population(regionId)),
            mujeres: get(regionalKey.populationWomen(regionId)),
            hombres: get(regionalKey.populationMen(regionId))
        },
        labor: {
            ftr: get(regionalKey.laborForce(regionId)),
            ocu: get(regionalKey.employed(regionId)),
            des: get(regionalKey.unemploymentRate(regionId))
        }
    }]));

    const nominalSeries = {
        pibSeries: get(SERIES.pibNominal),
        consumoSeries: get(SERIES.consumo),
        gastoSeries: get(SERIES.gasto),
        fbkfSeries: get(SERIES.fbkf),
        existenciasSeries: get(SERIES.existencias),
        exportSeries: get(SERIES.exportaciones),
        importSeries: get(SERIES.importaciones)
    };

    return {
        regionalData,
        nominalSeries,
        availablePeriods: buildPeriods(nominalSeries.pibSeries),
        realPibData: get(SERIES.pibReal),
        populationData: {
            total: get(SERIES.pobTotal),
            hombres: get(SERIES.pobHombres),
            mujeres: get(SERIES.pobMujeres)
        }
    };
};

const EMPTY = {
    indicators: [],
    regionalData: {},
    nominalSeries: null,
    availablePeriods: [],
    realPibData: [],
    populationData: null,
    loading: true
};

// Todos los datos que necesita la sección Datos, en una sola carga.
const useBcchData = () => {
    const [state, setState] = useState(EMPTY);

    useEffect(() => {
        let isActive = true;
        Promise.all([loadBcchData(), getKeyIndicators()]).then(([data, indicators]) => {
            if (!isActive) return;
            setState({ ...buildDashboardData(data.series), indicators, loading: false });
        });
        return () => {
            isActive = false;
        };
    }, []);

    return state;
};

export default useBcchData;
