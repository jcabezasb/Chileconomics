import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import MacroMap from './components/Overview/MacroMap';
import MacroCard from './components/Overview/MacroCard';
import CompactIndicator from './components/Overview/CompactIndicator';
import PIBComparisonChart from './components/Overview/PIBComparisonChart';
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

    useEffect(() => {
        getKeyIndicators().then(data => {
            setIndicators(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadPibSeries = async () => {
            const series = await getSeries('F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T', { frequency: 'T' });
            if (!isActive || !Array.isArray(series) || !series.length) return;

            const valid = series.filter(entry => entry && entry.value !== null && entry.value !== undefined);
            if (!valid.length) return;

            const latest = valid[valid.length - 1];
            // Variación en 12 meses (4 trimestres atrás)
            const previous = valid.length > 4 ? valid[valid.length - 5] : null;
            const latestValue = Number(latest.value);
            const previousValue = previous ? Number(previous.value) : null;

            if (Number.isNaN(latestValue)) return;

            const variation = previousValue !== null && !Number.isNaN(previousValue) && previousValue !== 0
                ? ((latestValue - previousValue) / previousValue) * 100
                : null;

            // Guardar los últimos 10 puntos para el minigráfico
            const history = valid.slice(-10).map(v => v.value);
            setLatestPib({ ...latest, value: latestValue, variation, history });
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
            const ipcSeries = await getSeries('F074.IPC.VAR.Z.Z.C.M');
            if (isActive && ipcSeries.length) {
                const latest = ipcSeries[ipcSeries.length - 1];
                const history = ipcSeries.slice(-10).map(v => v.value);
                setLatestIpc({ ...latest, history });
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
                const seriesId = `F035.PIB.FLU.R.CLP.2018.Z.Z.Z.${numericCode}.0.T`;
                const series = await getSeries(seriesId);

                if (series && series.length) {
                    const valid = series.filter(entry => entry && entry.value !== null);
                    if (valid.length) {
                        const latest = valid[valid.length - 1];
                        // Variación en 12 meses (4 trimestres atrás)
                        const previous = valid.length > 4 ? valid[valid.length - 5] : null;
                        const latestValue = Number(latest.value);
                        const previousValue = previous ? Number(previous.value) : null;

                        const variation = previousValue ? ((latestValue - previousValue) / previousValue) * 100 : null;
                        // Tomar últimos 10 puntos (2.5 años de trimestres) para el minigráfico
                        const history = valid.slice(-10).map(v => v.value);

                        data[regId] = { value: latestValue, variation, history };
                    }
                }
            }));

            if (isActive) setRegionalData(data);
        };

        loadPibSeries();
        loadOtherSeries();
        loadRegionalSeries();

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

    const pibValue = typeof latestPib?.value === 'number' ? latestPib.value : 51880.0;
    const pibVariation = typeof latestPib?.variation === 'number' ? latestPib.variation : 2.3;

    // Mocks de componentes basados en pesos históricos (BCCH)
    const pibCompositionData = useMemo(() => {
        const total = pibValue;
        return {
            total: total,
            consumo: total * 0.62,
            inversion: total * 0.22,
            gasto: total * 0.14,
            export: total * 0.31,
            import: -total * 0.29
        };
    }, [pibValue]);

    const baseIndicatorSpecs = [
        {
            id: 'pib',
            title: 'PIB Total',
            value: pibValue,
            unit: 'MM CLP',
            decimals: 0,
            variation: pibVariation,
            trend: pibVariation >= 0 ? 'up' : 'down',
            history: latestPib?.history || [],
            type: 'level',
            weight: 100
        },
        {
            id: 'consumo',
            title: 'Consumo Privado',
            value: pibCompositionData.consumo,
            unit: 'MM CLP',
            decimals: 0,
            variation: 1.8,
            trend: 'up',
            type: 'level',
            weight: 62,
            history: [1.2, 1.4, 1.3, 1.5, 1.7, 1.6, 1.8]
        },
        {
            id: 'inversion',
            title: 'Inversion (FBKF)',
            value: pibCompositionData.inversion,
            unit: 'MM CLP',
            decimals: 0,
            variation: -2.4,
            trend: 'down',
            type: 'level',
            weight: 22,
            history: [2.1, 1.9, 1.8, 1.5, 1.2, 0.8, -0.5]
        },
        {
            id: 'gasto',
            title: 'Gasto Gobierno',
            value: pibCompositionData.gasto,
            unit: 'MM CLP',
            decimals: 0,
            variation: 3.1,
            trend: 'up',
            type: 'level',
            weight: 14,
            history: [2.8, 2.9, 3.0, 3.1, 3.0, 3.2, 3.1]
        },
        {
            id: 'exportaciones',
            title: 'Exportaciones',
            value: pibCompositionData.export,
            unit: 'MM CLP',
            decimals: 0,
            variation: 4.2,
            trend: 'up',
            type: 'level',
            weight: 31,
            history: [3.5, 3.8, 3.6, 4.0, 4.1, 4.3, 4.2]
        },
        {
            id: 'importaciones',
            title: 'Importaciones',
            value: Math.abs(pibCompositionData.import),
            unit: 'MM CLP',
            decimals: 0,
            variation: -0.8,
            trend: 'down',
            type: 'level',
            weight: 29,
            history: [2.5, 2.2, 1.8, 1.5, 1.2, 1.0, 0.8]
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
        const regionRealData = regId ? regionalData[regId] : null;

        return baseIndicatorSpecs.map((spec) => {
            let value = spec.value;
            let variationValue = spec.variation;
            let history = spec.history;

            // Si es PIB y tenemos data real de la región, usarla
            if (spec.id === 'pib' && regionRealData) {
                value = regionRealData.value;
                variationValue = regionRealData.variation;
                history = regionRealData.history;
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
                history: history
            };
        });
    };

    const sideIndicators = buildSideIndicators(selectedRegion);

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
    const chartIndicators = indicators.filter(ind =>
        ['ipc', 'dolar', 'cobre', 'desempleo'].includes(ind.id)
    );

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
                            <div style={{ flex: 1.2, position: 'relative' }}>
                                <PIBComparisonChart data={pibCompositionData} theme={theme} />
                            </div>

                            {/* Components List Area */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto' }}>
                                {sideIndicators.map(ind => (
                                    <div key={ind.id} style={{
                                        padding: '0.6rem 0.8rem',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.2rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{ind.title}</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{ind.weight}% del PIB</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.2rem' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{ind.value}</div>
                                            <div style={{ width: '40px', height: '16px' }}>
                                                <svg width="40" height="16" viewBox="0 0 40 16">
                                                    <path
                                                        d={buildSparklinePaths(ind.history || [], 40, 16).linePath}
                                                        fill="none"
                                                        stroke={ind.trend === 'up' ? 'var(--trend-up)' : 'var(--trend-down)'}
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: ind.trend === 'up' ? 'var(--trend-up)' : 'var(--trend-down)'
                                            }}>
                                                {ind.variation}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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

            {/* NEW SECTION: Geográfico / Regional */}
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
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Análisis Geográfico y Estructura Regional</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                            Explora el pulso de la economía a nivel regional. Selecciona una zona en el mapa para ver el PIB real y su peso en la economía nacional.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', minHeight: '500px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <MacroMap
                                selectedRegion={selectedRegion}
                                onRegionSelect={(regionName) => {
                                    setSelectedRegion((prev) => prev === regionName ? null : regionName);
                                }}
                            />
                        </div>

                        <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {selectedRegion ? (
                                <div className="reveal is-visible" style={{ animation: 'slideIn 0.3s ease' }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent)' }}>{selectedRegion}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>PIB Regional</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{sideIndicators[0].value}</div>
                                            <div style={{ fontSize: '0.9rem', color: sideIndicators[0].trend === 'up' ? 'var(--trend-up)' : 'var(--trend-down)', fontWeight: 600 }}>
                                                {sideIndicators[0].variation} YoY
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Peso Nacional</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{getRegionFactor(selectedRegion).toFixed(1)}%</div>
                                            </div>
                                            <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Estatus</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--trend-up)' }}>En Crecimiento</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p>Selecciona una región en el mapa para ver el detalle económico local.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default App;
