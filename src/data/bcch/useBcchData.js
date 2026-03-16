import { useEffect, useState } from 'react';
import { getKeyIndicators, getSeries } from './api';
import {
    buildGovernmentResidualSeries,
    buildPeriods,
    computeSeriesStatsAtDate,
    mergeInvestmentSeries
} from '../../shared/utils/series';
import {
    REGION_IDS,
    REGION_NUMERIC_CODE_BY_ID,
    REGION_POB_CODE_BY_ID
} from '../../shared/constants/regions';

const initialPibComposition = {
    total: 51880.0,
    consumo: 32165.0,
    inversion: 11414.0,
    gasto: 7263.0,
    export: 16083.0,
    import: -15045.0
};

const useBcchData = (selectedDate) => {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [latestPib, setLatestPib] = useState(null);
    const [latestDolar, setLatestDolar] = useState(null);
    const [latestIpc, setLatestIpc] = useState(null);
    const [regionalData, setRegionalData] = useState({});
    const [compositionStats, setCompositionStats] = useState(null);
    const [pibCompositionData, setPibCompositionData] = useState(initialPibComposition);
    const [populationData, setPopulationData] = useState(null);
    const [realPibData, setRealPibData] = useState(null);
    const [nominalSeries, setNominalSeries] = useState(null);
    const [availablePeriods, setAvailablePeriods] = useState([]);
    useEffect(() => {
        getKeyIndicators().then(data => {
            setIndicators(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!nominalSeries) return;
        const investmentSeries = mergeInvestmentSeries(nominalSeries.fbkfSeries, nominalSeries.existenciasSeries);

        const consumoStats = computeSeriesStatsAtDate(nominalSeries.consumoSeries, selectedDate, { lag: 4, historyPoints: 4 });
        const fallbackGastoSeries = buildGovernmentResidualSeries(
            nominalSeries.pibSeries,
            nominalSeries.consumoSeries,
            investmentSeries,
            nominalSeries.exportSeries,
            nominalSeries.importSeries
        );
        const gastoStats = computeSeriesStatsAtDate(nominalSeries.gastoSeries, selectedDate, { lag: 4, historyPoints: 4 })
            || computeSeriesStatsAtDate(fallbackGastoSeries, selectedDate, { lag: 4, historyPoints: 4 });
        const exportStats = computeSeriesStatsAtDate(nominalSeries.exportSeries, selectedDate, { lag: 4, historyPoints: 4 });
        const importStats = computeSeriesStatsAtDate(nominalSeries.importSeries, selectedDate, { lag: 4, historyPoints: 4 });
        const inversionStats = computeSeriesStatsAtDate(investmentSeries, selectedDate, { lag: 4, historyPoints: 4 });
        const pibStats = computeSeriesStatsAtDate(nominalSeries.pibSeries, selectedDate, { lag: 4, historyPoints: 4 });

        const total = pibStats?.value || latestPib?.value || 0;

        setCompositionStats({
            consumo: consumoStats,
            gasto: gastoStats,
            export: exportStats,
            import: importStats,
            inversion: inversionStats,
            total: pibStats
        });

        if (total) {
            setPibCompositionData({
                total,
                consumo: consumoStats?.value ?? 0,
                inversion: inversionStats?.value ?? 0,
                gasto: gastoStats?.value ?? 0,
                export: exportStats?.value ?? 0,
                import: -(Math.abs(importStats?.value ?? 0))
            });
        }
    }, [nominalSeries, selectedDate, latestPib]);

    useEffect(() => {
        let isActive = true;

        const loadPibSeries = async () => {
            const series = await getSeries('F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T', { frequency: 'T' });
            if (!isActive || !Array.isArray(series) || !series.length) return;

            const stats = computeSeriesStatsAtDate(series, null, { lag: 4, historyPoints: 4 });
            if (!stats) return;
            setLatestPib({ date: stats.date, value: stats.value, variation: stats.variation, history: stats.history });
        };

        const loadNominalComponents = async () => {
            const [
                consumoSeries,
                gastoSeries,
                fbkfSeries,
                existenciasSeries,
                exportSeries,
                importSeries,
                pibSeries
            ] = await Promise.all([
                getSeries('F033.CPR.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F033.COG.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F033.FKF.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F033.VAX.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F033.XBS.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F033.IBS.FLU.N.CLP.EP18.0.T', { frequency: 'T' }),
                getSeries('F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T', { frequency: 'T' })
            ]);

            if (!isActive) return;

            setNominalSeries({
                consumoSeries,
                gastoSeries,
                fbkfSeries,
                existenciasSeries,
                exportSeries,
                importSeries,
                pibSeries
            });

            const periods = buildPeriods(pibSeries);
            if (periods.length) {
                setAvailablePeriods(periods);
            }
        };

        const loadOtherSeries = async () => {
            // Dólar
            const dolarSeries = await getSeries('F073.TCO.PRE.Z.D');
            if (isActive && dolarSeries.length) {
                const latest = dolarSeries[dolarSeries.length - 1];
                const previous = dolarSeries.length > 1 ? dolarSeries[dolarSeries.length - 2] : null;
                const variation = previous ? (latest.value - previous.value) : 0;
                const history = dolarSeries.slice(-10).map(v => v.value);
                setLatestDolar({ ...latest, variation, history });
            }

            // IPC
            const ipcSeries = await getSeries('G073.IPC.IND.2023.M');
            if (isActive && ipcSeries.length) {
                const latest = ipcSeries[ipcSeries.length - 1];
                const history = ipcSeries.slice(-10).map(v => v.value);
                setLatestIpc({ ...latest, history });
            }
        };

        const loadPopulationAndRealPib = async () => {
            const [pobTotal, pobHombres, pobMujeres, pibReal] = await Promise.all([
                getSeries('F049.POB.STO.INE1.01.A'),
                getSeries('F049.POB.STO.INE1.02.A'),
                getSeries('F049.POB.STO.INE1.03.A'),
                getSeries('F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T')
            ]);

            if (isActive) {
                setPopulationData({
                    total: pobTotal,
                    hombres: pobHombres,
                    mujeres: pobMujeres
                });
                setRealPibData(pibReal);
            }
        };

        const loadRegionalSeries = async () => {
            const laborSeriesMap = {
                XV: { ftr: 'F049.FTR.STO.INE9.RAP.M', ocu: 'F049.OCU.PMT.INE9.25.M', des: 'F049.DES.TAS.INE9.25.M' },
                I: { ftr: 'F049.FTR.STO.INE9.RTA.M', ocu: 'F049.OCU.PMT.INE9.11.M', des: 'F049.DES.TAS.INE9.11.M' },
                II: { ftr: 'F049.FTR.STO.INE9.RAN.M', ocu: 'F049.OCU.PMT.INE9.12.M', des: 'F049.DES.TAS.INE9.12.M' },
                III: { ftr: 'F049.FTR.STO.INE9.RAT.M', ocu: 'F049.OCU.PMT.INE9.13.M', des: 'F049.DES.TAS.INE9.13.M' },
                IV: { ftr: 'F049.FTR.STO.INE9.RCO.M', ocu: 'F049.OCU.PMT.INE9.14.M', des: 'F049.DES.TAS.INE9.14.M' },
                V: { ftr: 'F049.FTR.STO.INE9.RVA.M', ocu: 'F049.OCU.PMT.INE9.15.M', des: 'F049.DES.TAS.INE9.15.M' },
                RM: { ftr: 'F049.FTR.STO.INE9.RRM.M', ocu: 'F049.OCU.PMT.INE9.23.M', des: 'F049.DES.TAS.INE9.23.M' },
                VI: { ftr: 'F049.FTR.STO.INE9.RLI.M', ocu: 'F049.OCU.PMT.INE9.16.M', des: 'F049.DES.TAS.INE9.16.M' },
                VII: { ftr: 'F049.FTR.STO.INE9.RML.M', ocu: 'F049.OCU.PMT.INE9.17.M', des: 'F049.DES.TAS.INE9.17.M' },
                VIII: { ftr: 'F049.FTR.STO.INE9.RBI.M', ocu: 'F049.OCU.PMT.INE9.18N.M', des: 'F049.DES.TAS.INE9.18N.M' },
                XVI: { ftr: 'F049.FTR.STO.INE9.RNB.M', ocu: 'F049.OCU.PMT.INE9.26.M', des: 'F049.DES.TAS.INE9.26.M' },
                IX: { ftr: 'F049.FTR.STO.INE9.RAR.M', ocu: 'F049.OCU.PMT.INE9.19.M', des: 'F049.DES.TAS.INE9.19.M' },
                XIV: { ftr: 'F049.FTR.STO.INE9.RLR.M', ocu: 'F049.OCU.PMT.INE9.24.M', des: 'F049.DES.TAS.INE9.24.M' },
                X: { ftr: 'F049.FTR.STO.INE9.RLL.M', ocu: 'F049.OCU.PMT.INE9.20.M', des: 'F049.DES.TAS.INE9.20.M' },
                XI: { ftr: 'F049.FTR.STO.INE9.RAI.M', ocu: 'F049.OCU.PMT.INE9.21.M', des: 'F049.DES.TAS.INE9.21.M' },
                XII: { ftr: 'F049.FTR.STO.INE9.RMA.M', ocu: 'F049.OCU.PMT.INE9.22.M', des: 'F049.DES.TAS.INE9.22.M' }
            };
            const data = {};

            await Promise.all(REGION_IDS.map(async (regId) => {
                const numericCode = REGION_NUMERIC_CODE_BY_ID[regId];
                if (!numericCode) return;
                const pibSeriesId = `F035.PIB.FLU.R.CLP.2018.Z.Z.Z.${numericCode}.0.T`;
                const pobKey = REGION_POB_CODE_BY_ID[regId] || regId;
                const pobSeriesId = `F049.POB${pobKey}.STO.INE.AT.A`;
                const pobMSeriesId = pobSeriesId.replace('.AT.A', '.MT.A');
                const pobHSeriesId = pobSeriesId.replace('.AT.A', '.HT.A');

                const laborIds = laborSeriesMap[regId] || {};
                const [pibSeries, pobSeries, pobMSeries, pobHSeries, laborFtrSeries, laborOcuSeries, laborDesSeries] = await Promise.all([
                    getSeries(pibSeriesId),
                    getSeries(pobSeriesId),
                    getSeries(pobMSeriesId),
                    getSeries(pobHSeriesId),
                    laborIds.ftr ? getSeries(laborIds.ftr) : Promise.resolve([]),
                    laborIds.ocu ? getSeries(laborIds.ocu) : Promise.resolve([]),
                    laborIds.des ? getSeries(laborIds.des) : Promise.resolve([])
                ]);

                const regionEntry = {
                    pob: {
                        total: pobSeries || [],
                        mujeres: pobMSeries || [],
                        hombres: pobHSeries || []
                    },
                    labor: {
                        ftr: laborFtrSeries || [],
                        ocu: laborOcuSeries || [],
                        des: laborDesSeries || []
                    }
                };

                if (pibSeries && pibSeries.length) {
                    const valid = pibSeries.filter(entry => entry && entry.value !== null);
                    if (valid.length) {
                        const latest = valid[valid.length - 1];
                        const previous = valid.length > 4 ? valid[valid.length - 5] : null;
                        const latestValue = Number(latest.value);
                        const previousValue = previous ? Number(previous.value) : null;
                        const variation = previousValue ? ((latestValue - previousValue) / previousValue) * 100 : null;
                        const history = valid.map(v => ({ date: v.date, value: v.value }));

                        regionEntry.pib = { value: latestValue, variation, history, date: latest.date };
                    }
                }

                data[regId] = regionEntry;
            }));

            if (isActive) setRegionalData(data);
        };

        loadPibSeries();
        loadOtherSeries();
        loadPopulationAndRealPib();
        loadRegionalSeries();
        loadNominalComponents();

        return () => {
            isActive = false;
        };
    }, []);

    return {
        indicators,
        loading,
        latestPib,
        latestDolar,
        latestIpc,
        regionalData,
        compositionStats,
        pibCompositionData,
        populationData,
        realPibData,
        nominalSeries,
        availablePeriods
    };
};

export default useBcchData;
