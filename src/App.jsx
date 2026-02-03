import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import MacroMap from './components/Overview/MacroMap';
import MacroCard from './components/Overview/MacroCard';
import CompactIndicator from './components/Overview/CompactIndicator';
import PIBComparisonChart from './components/Overview/PIBComparisonChart';
import TrendChart from './components/Charts/TrendChart';
import { getKeyIndicators, getSeries } from './services/api';
import './styles/global.css';

function App() {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [overviewView, setOverviewView] = useState('pib');
    const [growthMetric, setGrowthMetric] = useState('gdpGrowth');
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const revealElementsRef = useRef([]);
    const [latestPib, setLatestPib] = useState(null);
    const [latestDolar, setLatestDolar] = useState(null);
    const [latestIpc, setLatestIpc] = useState(null);
    const [regionalData, setRegionalData] = useState({}); // { regionId: { value, variation, history } }
    const [compositionStats, setCompositionStats] = useState(null);
    const [pibCompositionData, setPibCompositionData] = useState({
        total: 51880.0,
        consumo: 32165.0,
        inversion: 11414.0,
        gasto: 7263.0,
        export: 16083.0,
        import: -15045.0
    });
    const [populationData, setPopulationData] = useState(null);
    const [realPibData, setRealPibData] = useState(null);
    const [nominalSeries, setNominalSeries] = useState(null);
    const [availablePeriods, setAvailablePeriods] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [regionalTimeRange, setRegionalTimeRange] = useState('1y');

    const normalizeSeries = (series) => (
        (series || [])
            .filter(entry => entry && entry.value !== null && entry.value !== undefined)
            .map(entry => ({ ...entry, value: Number(entry.value) }))
            .filter(entry => !Number.isNaN(entry.value))
    );

    const getQuarterFromDate = (dateStr) => {
        if (!dateStr || dateStr.length < 7) return null;
        const month = Number(dateStr.slice(5, 7));
        if (month <= 3) return 'Q1';
        if (month <= 6) return 'Q2';
        if (month <= 9) return 'Q3';
        return 'Q4';
    };

    const buildPeriods = (series) => {
        const valid = normalizeSeries(series);
        return valid
            .map(entry => {
                const year = entry.date ? entry.date.slice(0, 4) : '';
                const quarter = getQuarterFromDate(entry.date);
                return year && quarter ? { date: entry.date, year, quarter } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    };

    const computeSeriesStatsAtDate = (series, targetDate, options = {}) => {
        const { lag = 4, historyPoints = 4 } = options;
        const valid = normalizeSeries(series);
        if (!valid.length) return null;
        const targetIndex = targetDate
            ? valid.findIndex(entry => entry.date === targetDate)
            : valid.length - 1;
        const index = targetIndex >= 0 ? targetIndex : valid.length - 1;
        const latest = valid[index];
        const previous = index - lag >= 0 ? valid[index - lag] : null;
        const variation = previous && previous.value !== 0
            ? ((latest.value - previous.value) / previous.value) * 100
            : null;
        const start = Math.max(0, index - historyPoints + 1);
        const history = valid.slice(start, index + 1).map(entry => entry.value);
        const prior = index - 1 >= 0 ? valid[index - 1] : null;
        const trend = prior ? (latest.value >= prior.value ? 'up' : 'down') : 'up';
        return {
            value: latest.value,
            variation,
            history,
            trend,
            date: latest.date
        };
    };

    const mergeInvestmentSeries = (fbkfSeries, existenciasSeries) => {
        const map = new Map();
        normalizeSeries(fbkfSeries).forEach(entry => {
            map.set(entry.date, { date: entry.date, fbkf: entry.value, vax: 0 });
        });
        normalizeSeries(existenciasSeries).forEach(entry => {
            const current = map.get(entry.date) || { date: entry.date, fbkf: 0, vax: 0 };
            map.set(entry.date, { ...current, vax: entry.value });
        });
        return Array.from(map.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map(entry => ({ date: entry.date, value: (entry.fbkf || 0) + (entry.vax || 0) }));
    };

    const buildGovernmentResidualSeries = (pibSeries, consumoSeries, inversionSeries, exportSeries, importSeries) => {
        const pibData = normalizeSeries(pibSeries);
        if (!pibData.length) return [];
        const consumoMap = new Map(normalizeSeries(consumoSeries).map(entry => [entry.date, entry.value]));
        const inversionMap = new Map(normalizeSeries(inversionSeries).map(entry => [entry.date, entry.value]));
        const exportMap = new Map(normalizeSeries(exportSeries).map(entry => [entry.date, entry.value]));
        const importMap = new Map(normalizeSeries(importSeries).map(entry => [entry.date, entry.value]));

        return pibData
            .map(entry => {
                const consumo = consumoMap.get(entry.date);
                const inversion = inversionMap.get(entry.date);
                const exportVal = exportMap.get(entry.date);
                const importVal = importMap.get(entry.date);
                if ([consumo, inversion, exportVal, importVal].some(val => val === undefined || val === null)) return null;
                const value = entry.value - consumo - inversion - exportVal + importVal;
                return { date: entry.date, value };
            })
            .filter(Boolean);
    };

    const periodYears = useMemo(() => {
        const years = Array.from(new Set(availablePeriods.map(period => period.year)));
        return years.sort((a, b) => Number(b) - Number(a));
    }, [availablePeriods]);

    const periodQuarters = useMemo(() => {
        if (!selectedYear) return [];
        const quarters = Array.from(
            new Set(
                availablePeriods
                    .filter(period => period.year === selectedYear)
                    .map(period => period.quarter)
            )
        );
        const order = ['Q1', 'Q2', 'Q3', 'Q4'];
        return quarters.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }, [availablePeriods, selectedYear]);

    useEffect(() => {
        getKeyIndicators().then(data => {
            setIndicators(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!availablePeriods.length || !selectedYear || !selectedQuarter) return;
        const match = availablePeriods.find(
            (period) => period.year === selectedYear && period.quarter === selectedQuarter
        );
        if (match && match.date !== selectedDate) {
            setSelectedDate(match.date);
        }
    }, [availablePeriods, selectedYear, selectedQuarter, selectedDate]);

    useEffect(() => {
        if (!periodQuarters.length) return;
        if (!selectedQuarter || !periodQuarters.includes(selectedQuarter)) {
            setSelectedQuarter(periodQuarters[periodQuarters.length - 1]);
        }
    }, [periodQuarters, selectedQuarter]);

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
                const latest = periods[periods.length - 1];
                if (!selectedYear) setSelectedYear(latest.year);
                if (!selectedQuarter) setSelectedQuarter(latest.quarter);
                if (!selectedDate) setSelectedDate(latest.date);
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
            const ipcSeries = await getSeries('F074.IPC.IND.Z.EP23.C.M');
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
            const regionToCode = {
                'XV': '15', 'I': '01', 'II': '02', 'III': '03', 'IV': '04', 'V': '05',
                'RM': '13', 'VI': '06', 'VII': '07', 'XVI': '16', 'VIII': '08', 'IX': '09',
                'XIV': '14', 'X': '10', 'XI': '11', 'XII': '12'
            };
            const regions = Object.keys(regionToCode);
            const data = {};

            await Promise.all(regions.map(async (regId) => {
                const numericCode = regionToCode[regId];
                const pibSeriesId = `F035.PIB.FLU.R.CLP.2018.Z.Z.Z.${numericCode}.0.T`;
                const getPobCode = (id) => {
                    const map = {
                        'RM': 'RM', 'XV': 'AP', 'I': 'TA', 'II': 'AN', 'III': 'AT', 'IV': 'CO', 'V': 'VA',
                        'VI': 'LI', 'VII': 'ML', 'VIII': 'BI', 'XVI': 'NB', 'IX': 'AR', 'XIV': 'LR',
                        'X': 'LL', 'XI': 'AI', 'XII': 'MA'
                    };
                    return map[id] || id;
                };
                const pobKey = getPobCode(regId);
                const pobSeriesId = `F049.POB${pobKey}.STO.INE.AT.A`;
                const pobMSeriesId = pobSeriesId.replace('.AT.A', '.MT.A');
                const pobHSeriesId = pobSeriesId.replace('.AT.A', '.HT.A');

                const [pibSeries, pobSeries, pobMSeries, pobHSeries] = await Promise.all([
                    getSeries(pibSeriesId),
                    getSeries(pobSeriesId),
                    getSeries(pobMSeriesId),
                    getSeries(pobHSeriesId)
                ]);

                if (pibSeries && pibSeries.length) {
                    const valid = pibSeries.filter(entry => entry && entry.value !== null);
                    if (valid.length) {
                        const latest = valid[valid.length - 1];
                        const previous = valid.length > 4 ? valid[valid.length - 5] : null;
                        const latestValue = Number(latest.value);
                        const previousValue = previous ? Number(previous.value) : null;
                        const variation = previousValue ? ((latestValue - previousValue) / previousValue) * 100 : null;
                        const history = valid.map(v => ({ date: v.date, value: v.value }));

                        data[regId] = {
                            pib: { value: latestValue, variation, history, date: latest.date },
                            pob: {
                                total: pobSeries || [],
                                mujeres: pobMSeries || [],
                                hombres: pobHSeries || []
                            }
                        };
                    }
                }
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

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const elements = revealElementsRef.current.filter(Boolean);
        if (!elements.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.25 }
        );

        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const formatNumber = (value, decimals = 1) => {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    };

    const buildValueLabel = (value, unit, decimals) => {
        const formatted = formatNumber(value, decimals);
        return unit ? `${formatted} ${unit}` : formatted;
    };

    const buildPercentLabel = (value, decimals = 1) => {
        const formatted = formatNumber(value, decimals);
        return `${value >= 0 ? '+' : ''}${formatted}%`;
    };

    const getRegionFactor = (name) => {
        if (!name) return 1;
        let hash = 0;
        for (let i = 0; i < name.length; i += 1) {
            hash = (hash * 31 + name.charCodeAt(i)) % 1000;
        }
        return 0.75 + (hash / 1000) * 0.55; // 0.75 - 1.30
    };

    const pibValue = typeof pibCompositionData.total === 'number' ? pibCompositionData.total : (latestPib?.value ?? 51880.0);
    const pibVariation = typeof compositionStats?.total?.variation === 'number'
        ? compositionStats.total.variation
        : (latestPib?.variation ?? 0);

    const getShare = (value) => {
        if (!pibCompositionData.total) return null;
        const share = (Math.abs(value) / pibCompositionData.total) * 100;
        return Number(share.toFixed(1));
    };

    const baseIndicatorSpecs = [
        {
            id: 'pib',
            title: 'PIB Total',
            value: pibValue,
            unit: 'MM CLP',
            decimals: 0,
            variation: pibVariation,
            trend: pibVariation >= 0 ? 'up' : 'down',
            history: compositionStats?.total?.history || latestPib?.history || [],
            type: 'level',
            weight: 100
        },
        {
            id: 'consumo',
            title: 'Consumo Privado',
            value: pibCompositionData.consumo,
            unit: 'MM CLP',
            decimals: 0,
            variation: compositionStats?.consumo?.variation ?? 1.8,
            trend: compositionStats?.consumo?.trend || ((compositionStats?.consumo?.variation ?? 1.8) >= 0 ? 'up' : 'down'),
            type: 'level',
            weight: getShare(pibCompositionData.consumo) ?? 62,
            history: compositionStats?.consumo?.history || [1.2, 1.4, 1.3, 1.5, 1.7, 1.6, 1.8]
        },
        {
            id: 'inversion',
            title: 'Inversion (FBKF)',
            value: pibCompositionData.inversion,
            unit: 'MM CLP',
            decimals: 0,
            variation: compositionStats?.inversion?.variation ?? -2.4,
            trend: compositionStats?.inversion?.trend || ((compositionStats?.inversion?.variation ?? -2.4) >= 0 ? 'up' : 'down'),
            type: 'level',
            weight: getShare(pibCompositionData.inversion) ?? 22,
            history: compositionStats?.inversion?.history || [2.1, 1.9, 1.8, 1.5, 1.2, 0.8, -0.5]
        },
        {
            id: 'gasto',
            title: 'Gasto Gobierno',
            value: pibCompositionData.gasto,
            unit: 'MM CLP',
            decimals: 0,
            variation: compositionStats?.gasto?.variation ?? 3.1,
            trend: compositionStats?.gasto?.trend || ((compositionStats?.gasto?.variation ?? 3.1) >= 0 ? 'up' : 'down'),
            type: 'level',
            weight: getShare(pibCompositionData.gasto) ?? 14,
            history: compositionStats?.gasto?.history || [2.8, 2.9, 3.0, 3.1, 3.0, 3.2, 3.1]
        },
        {
            id: 'exportaciones',
            title: 'Exportaciones',
            value: pibCompositionData.export,
            unit: 'MM CLP',
            decimals: 0,
            variation: compositionStats?.export?.variation ?? 4.2,
            trend: compositionStats?.export?.trend || ((compositionStats?.export?.variation ?? 4.2) >= 0 ? 'up' : 'down'),
            type: 'level',
            weight: getShare(pibCompositionData.export) ?? 31,
            history: compositionStats?.export?.history || [3.5, 3.8, 3.6, 4.0, 4.1, 4.3, 4.2]
        },
        {
            id: 'importaciones',
            title: 'Importaciones',
            value: pibCompositionData.import,
            unit: 'MM CLP',
            decimals: 0,
            variation: compositionStats?.import?.variation ?? -0.8,
            trend: compositionStats?.import?.trend || ((compositionStats?.import?.variation ?? -0.8) >= 0 ? 'up' : 'down'),
            type: 'level',
            weight: getShare(pibCompositionData.import) ?? 29,
            history: compositionStats?.import?.history || [2.5, 2.2, 1.8, 1.5, 1.2, 1.0, 0.8]
        }
    ];

    const buildSideIndicators = (regionName) => {
        const factor = getRegionFactor(regionName);
        const variationShift = (factor - 1) * 2.2;

        // Mapeo de nombres del TopoJSON a IDs internos
        const REGION_MAP = {
            'Arica y Parinacota': 'XV',
            'Tarapacá': 'I',
            'Antofagasta': 'II',
            'Atacama': 'III',
            'Coquimbo': 'IV',
            'Valparaíso': 'V',
            'Región Metropolitana de Santiago': 'RM',
            'Libertador General Bernardo O\'Higgins': 'VI',
            'Maule': 'VII',
            'Ñuble': 'XVI',
            'Bío-Bío': 'VIII',
            'La Araucanía': 'IX',
            'Los Ríos': 'XIV',
            'Los Lagos': 'X',
            'Aisén del General Carlos Ibáñez del Campo': 'XI',
            'Magallanes y Antártica Chilena': 'XII'
        };

        const regId = REGION_MAP[regionName] || regionName;
        const regionRealData = regId ? regionalData[regId]?.pib : null;

        return baseIndicatorSpecs.map((spec) => {
            let value = spec.value;
            let variationValue = spec.variation;
            let history = spec.history;

            // Si es PIB y tenemos data real de la región, usarla
            if (spec.id === 'pib' && regionRealData) {
                value = regionRealData.value;
                variationValue = regionRealData.variation;
                history = (regionRealData.history || []).map((entry) => entry.value);
            }
            // Para otros indicadores o si no hay data real, usar lógica de factor (mock regional)
            else if (regionName) {
                if (spec.type === 'level') {
                    value = spec.value * factor;
                }
                if (spec.type === 'price') {
                    value = spec.value * (0.92 + factor * 0.08);
                }
                if (spec.type === 'rate') {
                    value = spec.value + (factor - 1) * 3.5;
                }

                if (spec.id !== 'pib') {
                    variationValue = spec.variation === null ? null : spec.variation + variationShift;
                }
            }

            const variationLabel = variationValue === null ? '' : buildPercentLabel(variationValue, 1);
            const trend = variationValue === null ? spec.trend : variationValue >= 0 ? 'up' : 'down';

            return {
                id: spec.id,
                title: spec.title,
                value: spec.unit === '%' ? buildPercentLabel(value, spec.decimals) : buildValueLabel(value, spec.unit, spec.decimals),
                variation: variationLabel,
                trend,
                history: history,
                weight: spec.weight
            };
        });
    };

    const sideIndicators = buildSideIndicators(selectedRegion);

    const getRegionId = (name) => {
        const REGMAP = {
            'Arica y Parinacota': 'XV', 'Tarapacá': 'I', 'Antofagasta': 'II', 'Atacama': 'III', 'Coquimbo': 'IV', 'Valparaíso': 'V',
            'Región Metropolitana de Santiago': 'RM', 'Libertador General Bernardo O\'Higgins': 'VI', 'Maule': 'VII', 'Ñuble': 'XVI',
            'Bío-Bío': 'VIII', 'La Araucanía': 'IX', 'Los Ríos': 'XIV', 'Los Lagos': 'X', 'Aisén del General Carlos Ibáñez del Campo': 'XI',
            'Magallanes y Antártica Chilena': 'XII'
        };
        return REGMAP[name];
    };

    const regionGrowthData = useMemo(() => (
        [
            { region: 'I', gdpGrowth: 2.4, exportGrowth: 4.8, investmentGrowth: -1.2, consumptionGrowth: 1.7 },
            { region: 'II', gdpGrowth: 3.1, exportGrowth: 6.2, investmentGrowth: 0.4, consumptionGrowth: 2.1 },
            { region: 'III', gdpGrowth: 1.6, exportGrowth: 3.5, investmentGrowth: -2.3, consumptionGrowth: 0.9 },
            { region: 'IV', gdpGrowth: 2.9, exportGrowth: 4.1, investmentGrowth: 1.1, consumptionGrowth: 2.4 },
            { region: 'V', gdpGrowth: 2.1, exportGrowth: 3.2, investmentGrowth: -0.6, consumptionGrowth: 1.5 },
            { region: 'VI', gdpGrowth: 2.6, exportGrowth: 4.7, investmentGrowth: 0.8, consumptionGrowth: 2.0 },
            { region: 'VII', gdpGrowth: 1.8, exportGrowth: 2.9, investmentGrowth: -1.4, consumptionGrowth: 1.1 },
            { region: 'VIII', gdpGrowth: 2.7, exportGrowth: 5.1, investmentGrowth: 0.3, consumptionGrowth: 1.9 },
            { region: 'IX', gdpGrowth: 1.4, exportGrowth: 2.6, investmentGrowth: -1.9, consumptionGrowth: 0.8 },
            { region: 'X', gdpGrowth: 2.3, exportGrowth: 3.9, investmentGrowth: 0.2, consumptionGrowth: 1.6 },
            { region: 'XI', gdpGrowth: 1.1, exportGrowth: 2.2, investmentGrowth: -2.5, consumptionGrowth: 0.6 },
            { region: 'XII', gdpGrowth: 1.9, exportGrowth: 3.1, investmentGrowth: -0.4, consumptionGrowth: 1.2 },
            { region: 'RM', gdpGrowth: 2.8, exportGrowth: 3.7, investmentGrowth: 0.9, consumptionGrowth: 2.7 },
            { region: 'XIV', gdpGrowth: 2.0, exportGrowth: 3.3, investmentGrowth: -0.8, consumptionGrowth: 1.3 },
            { region: 'XV', gdpGrowth: 2.5, exportGrowth: 4.4, investmentGrowth: 0.5, consumptionGrowth: 1.8 },
            { region: 'XVI', gdpGrowth: 2.2, exportGrowth: 3.6, investmentGrowth: -0.2, consumptionGrowth: 1.4 }
        ]
    ), []);

    const growthMetricOptions = [
        { id: 'gdpGrowth', label: 'Crecimiento PIB' },
        { id: 'exportGrowth', label: 'Crecimiento Exportaciones' },
        { id: 'consumptionGrowth', label: 'Crecimiento Consumo' }
    ];

    const exportTableRows = [
        { item: 'Cobre', value: '42,8 MM USD', delta: '+3,2%', series: [3.1, 3.4, 3.0, 3.6, 3.9, 4.1, 3.8, 4.2, 4.5, 4.3, 4.6, 4.9] },
        { item: 'Litio', value: '9,4 MM USD', delta: '+8,1%', series: [1.8, 2.0, 2.4, 2.7, 2.9, 3.3, 3.6, 3.4, 3.8, 4.1, 4.4, 4.8] },
        { item: 'Celulosa', value: '6,1 MM USD', delta: '-2,4%', series: [2.6, 2.4, 2.2, 2.5, 2.3, 2.1, 2.0, 2.2, 2.1, 1.9, 1.8, 1.7] },
        { item: 'Vino embotellado', value: '2,3 MM USD', delta: '+1,1%', series: [1.1, 1.2, 1.0, 1.3, 1.4, 1.3, 1.5, 1.6, 1.4, 1.6, 1.7, 1.8] },
        { item: 'Salmón', value: '5,8 MM USD', delta: '+4,6%', series: [2.2, 2.5, 2.3, 2.7, 2.9, 3.1, 3.0, 3.4, 3.6, 3.5, 3.8, 4.0] },
        { item: 'Frutas frescas', value: '3,2 MM USD', delta: '-0,8%', series: [1.9, 2.1, 2.0, 1.8, 1.7, 1.9, 1.8, 1.6, 1.7, 1.5, 1.6, 1.4] }
    ];

    const currentGrowthLabel = growthMetricOptions.find(option => option.id === growthMetric)?.label || 'Crecimiento PIB';

    const formatGrowthTick = (value) => `${value}%`;

    const regionNameMap = {
        I: 'Region I: Tarapaca',
        II: 'Region II: Antofagasta',
        III: 'Region III: Atacama',
        IV: 'Region IV: Coquimbo',
        V: 'Region V: Valparaiso',
        VI: 'Region VI: O\'Higgins',
        VII: 'Region VII: Maule',
        VIII: 'Region VIII: Bio-Bio',
        IX: 'Region IX: La Araucania',
        X: 'Region X: Los Lagos',
        XI: 'Region XI: Aysen',
        XII: 'Region XII: Magallanes',
        RM: 'Region RM: Metropolitana',
        XIV: 'Region XIV: Los Rios',
        XV: 'Region XV: Arica y Parinacota',
        XVI: 'Region XVI: Nuble'
    };

    const renderGrowthTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const value = payload[0]?.value ?? 0;
        const regionLabel = regionNameMap[label] || `Region ${label}`;
        const tooltipBackground = theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : '#ffffff';

        return (
            <div style={{
                background: tooltipBackground,
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '0.5rem 0.6rem',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.75rem'
            }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{regionLabel}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{currentGrowthLabel}: {value}%</div>
            </div>
        );
    };

    const growthAverage = useMemo(() => {
        if (!regionGrowthData.length) return 0;
        const sum = regionGrowthData.reduce((acc, item) => acc + (Number(item[growthMetric]) || 0), 0);
        return Number((sum / regionGrowthData.length).toFixed(2));
    }, [regionGrowthData, growthMetric]);

    const buildSparklinePaths = (values, width, height) => {
        const safeValues = values && values.length ? values : [0, 0];
        const min = Math.min(...safeValues);
        const max = Math.max(...safeValues);
        const range = max - min || 1;
        const step = width / (safeValues.length - 1);
        const points = safeValues.map((value, index) => {
            const x = index * step;
            const y = height - ((value - min) / range) * height;
            return [x, y];
        });
        const linePath = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`)
            .join(' ');
        const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
        return { linePath, areaPath };
    };

    const getOverviewButtonStyle = (id) => {
        const isActive = overviewView === id;
        const isLight = theme === 'light';
        return {
            background: isLight
                ? (isActive ? 'rgba(30, 58, 138, 0.12)' : 'transparent')
                : (isActive ? 'var(--accent)' : 'transparent'),
            color: isLight ? 'var(--text-primary)' : (isActive ? 'white' : 'var(--text-secondary)'),
            border: '1px solid var(--border)',
            padding: '0.35rem 0.7rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            cursor: 'pointer'
        };
    };

    // Chart indicators
    const chartOrder = ['ipc', 'dolar', 'desempleo', 'cobre'];
    const chartIndicators = indicators
        .filter(ind => chartOrder.includes(ind.id))
        .sort((a, b) => chartOrder.indexOf(a.id) - chartOrder.indexOf(b.id));

    return (
        <div className="container">
            <header className="hero-header" style={{ position: 'relative' }}>
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.7rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                    aria-label="Alternar modo oscuro"
                >
                    <span style={{ fontWeight: 600 }}>{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
                    <span
                        style={{
                            width: '30px',
                            height: '16px',
                            borderRadius: '999px',
                            background: theme === 'dark' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(31, 42, 90, 0.16)',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            display: 'inline-block'
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '1px',
                                left: theme === 'dark' ? '14px' : '2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: theme === 'dark' ? '#a855f7' : 'var(--chart-neon)',
                                transition: 'left 0.2s ease'
                            }}
                        />
                    </span>
                </button>
                <h1 className="hero-title">CHILECONOMICS</h1>
                <p
                    style={{ maxWidth: '720px', margin: '0.2rem auto 0', fontSize: '1rem', color: 'var(--text-secondary)' }}
                >
                    Dashboard de indicadores macroeconomicos de Chile con foco en lectura rapida, contexto regional y comparaciones historicas.
                </p>
            </header>

            <section style={{ padding: '0.25rem 0 2rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <p
                        style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}
                    >
                        Proyecto de visualizacion economica para explorar el pulso del pais en un solo vistazo.
                    </p>
                    <p
                        style={{ marginTop: '0.6rem', color: 'var(--text-secondary)' }}
                    >
                        Aqui puedes revisar PIB, mercado laboral, precios, sector externo y dinamicas regionales. En una siguiente etapa,
                        los datos vendran de fuentes oficiales para mantener el tablero actualizado.
                    </p>
                </div>
            </section>

            <section
                className="overview-section reveal"
                ref={(el) => { revealElementsRef.current[0] = el; }}
                style={{ paddingBottom: '4rem' }}
            >
                {/* Main Grid: 3 columns - [PIB Overview] | Charts (2x2) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '1rem',
                    height: '550px'
                }}>
                    {/* Column 1: PIB Structure (UNIFIED BOX) */}
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gridRow: 'span 2'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Estructura del PIB Nacional</h3>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Muestra de oferta y demanda final</div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            flex: 1,
                            minHeight: 0
                        }}>
                            {/* Chart Area */}
                            <div style={{ flex: 0.95, position: 'relative' }}>
                                <PIBComparisonChart data={pibCompositionData} theme={theme} />
                            </div>

                            {/* Components List Area (Table-like density) */}
                            <div style={{ flex: 2.05, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginBottom: '0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ano</span>
                                        <select
                                            className="period-select"
                                            value={selectedYear}
                                            onChange={(event) => setSelectedYear(event.target.value)}
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '0.25rem 0.45rem',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            {periodYears.map((year) => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Trim.</span>
                                        <select
                                            className="period-select"
                                            value={selectedQuarter}
                                            onChange={(event) => setSelectedQuarter(event.target.value)}
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '0.25rem 0.45rem',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            {periodQuarters.map((quarter) => (
                                                <option key={quarter} value={quarter}>{quarter}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.9fr 1.15fr 0.9fr 1fr',
                                    padding: '0 0.8rem 0.5rem 0.8rem',
                                    fontSize: '0.65rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 700,
                                    borderBottom: '1px solid var(--border)',
                                    marginBottom: '0.5rem',
                                    letterSpacing: '0.05em'
                                }}>
                                    <span>COMPONENTE</span>
                                    <span style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>VALOR</span>
                                    <span style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>%PIB</span>
                                    <span style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>TREND</span>
                                </div>
                                <div style={{ display: 'grid', gridAutoRows: '1fr', gap: '0.35rem', overflowY: 'auto', paddingRight: '4px', flex: 1, height: '100%' }}>
                                    {sideIndicators.map(ind => (
                                        <div key={ind.id} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.9fr 1.15fr 0.9fr 1fr',
                                            padding: '0.6rem 0.8rem',
                                            borderRadius: '6px',
                                            background: 'rgba(255,255,255,0.015)',
                                            border: '1px solid transparent',
                                            alignItems: 'center',
                                            transition: 'background 0.2s ease',
                                            height: '100%'
                                        }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{ind.title}</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'monospace', borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>
                                                {ind.value.split(' ')[0]}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', color: 'var(--accent)', borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>
                                                {ind.weight}%
                                            </span>
                                            <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.8, borderLeft: '1px solid var(--border)', padding: '0 0.6rem' }}>
                                                <svg width="34" height="12" viewBox="0 0 40 16">
                                                    <path
                                                        d={buildSparklinePaths(ind.history || [], 40, 16).linePath}
                                                        fill="none"
                                                        stroke={ind.trend === 'up' ? 'var(--trend-up)' : 'var(--trend-down)'}
                                                        strokeWidth="2"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p style={{
                            margin: '1rem 0 0 0',
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic'
                        }}>
                            Datos Nacionales: Estimación basada en cuentas nacionales trimestrales.
                        </p>
                    </div>

                    {/* Columns 2-3: 4 Charts in 2x2 grid */}
                    {chartIndicators.slice(0, 2).map(ind => (
                        <MacroCard key={ind.id} indicator={ind} />
                    ))}
                    {chartIndicators.slice(2, 4).map(ind => (
                        <MacroCard key={ind.id} indicator={ind} />
                    ))}
                </div>
            </section>

            {/* SECCIÓN RELEVADA: Geográfico / Regional */}
            <section
                className="regional-section reveal"
                ref={(el) => { revealElementsRef.current[1] = el; }}
                style={{ padding: '4rem 0' }}
            >
                <div style={{
                    background: 'var(--bg-card)',
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 700 }}>Análisis Geográfico y Demográfico</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto', fontSize: '1rem' }}>
                            {selectedRegion
                                ? `Explorando datos detallados de la ${selectedRegion}.`
                                : "Visión general de Chile. Selecciona una región en el mapa para ver estadísticas locales."}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem', minHeight: '550px', flexWrap: 'wrap' }}>
                        {/* Mapa (Columna Izquierda) */}
                        <div style={{ flex: '1.2', minWidth: '400px', position: 'relative' }}>
                            <MacroMap
                                selectedRegion={selectedRegion}
                                onRegionSelect={(regionName) => {
                                    setSelectedRegion((prev) => prev === regionName ? null : regionName);
                                }}
                            />
                        </div>

                        {/* Fichas de Datos (Columna Derecha) */}
                        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)' }}></span>
                                {selectedRegion || "Chile (Nacional)"}
                            </h3>

                            {/* Ficha 1: Detalle PIB Real */}
                            <div style={{
                                background: 'var(--bg-app)',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>PIB Real (Cuentas Nacionales)</div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.2rem 0' }}>
                                            {selectedRegion ? (sideIndicators[0].value) : (realPibData ? formatNumber(realPibData[realPibData.length - 1].value, 0) + ' MM' : '...')}
                                        </div>
                                        <div style={{
                                            fontSize: '0.95rem',
                                            fontWeight: 700,
                                            color: (selectedRegion ? sideIndicators[0].trend : (realPibData ? 'up' : 'neutral')) === 'up' ? 'var(--trend-up)' : 'var(--trend-down)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}>
                                            {selectedRegion ? sideIndicators[0].variation : (realPibData ? '+2.4%' : '')} YoY
                                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}> (Último dato)</span>
                                        </div>
                                    </div>

                                    {/* Selectores de Tiempo para el Gráfico */}
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        {['1y', '2y', '5y', 'all'].map((range) => (
                                            <button
                                                key={range}
                                                onClick={() => setRegionalTimeRange(range)}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    fontSize: '0.65rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    background: regionalTimeRange === range ? 'var(--accent)' : 'transparent',
                                                    color: regionalTimeRange === range ? 'white' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {range.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gráfico de Trayectoria */}
                                <div style={{ marginTop: '1.2rem', height: '140px' }}>
                                        <TrendChart
                                         data={(() => {
                                             const raw = selectedRegion
                                                 ? (regionalData[getRegionId(selectedRegion)]?.pib?.history || [])
                                                 : (realPibData || []);

                                            const limitMap = { '1y': 4, '2y': 8, '5y': 20, 'all': null };
                                            const limit = limitMap[regionalTimeRange];
                                            return limit ? raw.slice(-limit) : raw;
                                        })()}
                                        color="#f97316"
                                        height={120}
                                        valueFormatter={(val) => formatNumber(val, 0) + ' MM'}
                                    />
                                </div>
                            </div>

                            {/* Ficha 2: Población INE */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{
                                    background: 'var(--bg-app)',
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    gridColumn: 'span 2',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Población Total (INE)</div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                                            {(() => {
                                                const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                                const series = id ? regionalData[id]?.pob?.total : populationData?.total;
                                                return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                            })()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Fuente: INE Cine</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--trend-up)' }}>Actualizado 2024</div>
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                                        Hombres
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.3rem' }}>
                                        {(() => {
                                            const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                            const series = id ? regionalData[id]?.pob?.hombres : populationData?.hombres;
                                            return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                        })()}
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899' }}></span>
                                        Mujeres
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.3rem' }}>
                                        {(() => {
                                            const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                            const series = id ? regionalData[id]?.pob?.mujeres : populationData?.mujeres;
                                            return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default App;
