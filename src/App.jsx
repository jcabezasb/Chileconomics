import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import HeroHeader from './components/Sections/HeroHeader';
import TopNav from './components/Sections/TopNav';
import PlaceholderSection from './components/Sections/PlaceholderSection';
import ContactSection from './components/Sections/ContactSection';
import DevelopmentSection from './components/Sections/DevelopmentSection';
import OverviewSection from './components/Sections/OverviewSection';
import RegionalSection from './components/Sections/RegionalSection';
import useBcchData from './hooks/useBcchData';
import {
    REGION_ID_BY_NAME,
    REGION_LABEL_BY_ID
} from './constants/regions';
import {
    formatMonthLabelDash,
    formatNumber,
    formatQuarterLabel,
    formatShortDate
} from './utils/format';
import { buildSparklinePaths } from './utils/sparkline';
import { getTrendFromHistory } from './utils/series';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './styles/global.css';

function App() {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [overviewView, setOverviewView] = useState('pib');
    const [growthMetric, setGrowthMetric] = useState('gdpGrowth');
    const [activeSection, setActiveSection] = useState('datos');
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const revealElementsRef = useRef([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [regionalTimeRange, setRegionalTimeRange] = useState('1a');
    const [hasScrolled, setHasScrolled] = useState(false);
    const [showPibInfo, setShowPibInfo] = useState(false);

    const {
        indicators,
        latestPib: latestPibData,
        regionalData,
        compositionStats,
        pibCompositionData,
        populationData,
        realPibData,
        nominalSeries,
        availablePeriods
    } = useBcchData(selectedDate);

    const getSparklineTrend = (history) => {
        if (!history || history.length < 2) return 'neutral';
        const valid = history
            .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));
        if (valid.length < 2) return 'neutral';
        return valid[valid.length - 1] >= valid[0] ? 'up' : 'down';
    };

    const periodYears = useMemo(() => {
        const years = Array.from(new Set(availablePeriods.map(period => period.year)));
        return years.sort((a, b) => Number(b) - Number(a));
    }, [availablePeriods]);

    useEffect(() => {
        if (!periodYears.length) return;
        if (!selectedYear || !periodYears.includes(selectedYear)) {
            setSelectedYear(periodYears[0]);
        }
    }, [periodYears, selectedYear]);

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
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleScroll = () => {
            setHasScrolled(window.scrollY > 20);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (activeSection !== 'datos') return undefined;
        const elements = revealElementsRef.current.filter(Boolean);
        if (!elements.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    } else {
                        entry.target.classList.remove('is-visible');
                    }
                });
            },
            { threshold: 0.25 }
        );

        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [activeSection]);

    const buildValueLabel = (value, unit, decimals) => {
        const formatted = formatNumber(value, 1);
        return unit ? `${formatted} ${unit}` : formatted;
    };

    const buildPercentLabel = (value, decimals = 1) => {
        const formatted = formatNumber(value, 1);
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

    const pibValue = typeof pibCompositionData.total === 'number' ? pibCompositionData.total : (latestPibData?.value ?? 51880.0);
    const pibVariation = typeof compositionStats?.total?.variation === 'number'
        ? compositionStats.total.variation
        : (latestPibData?.variation ?? 0);

    const getShare = (value) => {
        if (!pibCompositionData.total) return null;
        const share = (Math.abs(value) / pibCompositionData.total) * 100;
        return Number(share.toFixed(1));
    };

    const baseIndicatorSpecs = useMemo(() => (
        [
            {
                id: 'pib',
                title: 'PIB Total',
                value: pibValue,
                unit: 'MM CLP',
                decimals: 0,
                variation: pibVariation,
                trend: pibVariation >= 0 ? 'up' : 'down',
                history: compositionStats?.total?.history || latestPibData?.history || [],
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
        ]
    ), [
        pibValue,
        pibVariation,
        compositionStats,
        latestPibData,
        pibCompositionData
    ]);

    const buildSideIndicators = (regionName) => {
        const factor = getRegionFactor(regionName);
        const variationShift = (factor - 1) * 2.2;

        // Mapeo de nombres del TopoJSON a IDs internos
        const regId = REGION_ID_BY_NAME[regionName] || regionName;
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
            const baseTrend = variationValue === null ? spec.trend : variationValue >= 0 ? 'up' : 'down';
            const trend = getTrendFromHistory(history, baseTrend);

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

    const sideIndicators = useMemo(
        () => buildSideIndicators(selectedRegion),
        [selectedRegion, baseIndicatorSpecs, regionalData]
    );

    const pibTableIndicators = useMemo(
        () => buildSideIndicators(null),
        [baseIndicatorSpecs]
    );

    const getRegionId = (name) => REGION_ID_BY_NAME[name];

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

    const renderGrowthTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const value = payload[0]?.value ?? 0;
        const regionLabel = REGION_LABEL_BY_ID[label] || `Region ${label}`;
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
        return Number((sum / regionGrowthData.length).toFixed(1));
    }, [regionGrowthData, growthMetric]);

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
    const chartIndicators = useMemo(() => (
        indicators
            .filter(ind => chartOrder.includes(ind.id))
            .sort((a, b) => chartOrder.indexOf(a.id) - chartOrder.indexOf(b.id))
    ), [indicators]);

    const regionalPibRaw = useMemo(() => (
        selectedRegion
            ? (regionalData[getRegionId(selectedRegion)]?.pib?.history || [])
            : (realPibData || [])
    ), [selectedRegion, regionalData, realPibData]);
    const regionalPibLimitMap = { '1a': 4, '2a': 8, '5a': 20, 'all': null };
    const regionalPibLimit = regionalPibLimitMap[regionalTimeRange];
    const regionalPibChartData = useMemo(
        () => (regionalPibLimit ? regionalPibRaw.slice(-regionalPibLimit) : regionalPibRaw),
        [regionalPibLimit, regionalPibRaw]
    );
    const regionalPibStartLabel = formatQuarterLabel(regionalPibChartData[0]?.date) || formatShortDate(regionalPibChartData[0]?.date);
    const regionalPibEndLabel = formatQuarterLabel(regionalPibChartData[regionalPibChartData.length - 1]?.date)
        || formatShortDate(regionalPibChartData[regionalPibChartData.length - 1]?.date);

    const laborRegionId = selectedRegion ? getRegionId(selectedRegion) : null;
    const laborRangeMap = { '1a': 12, '2a': 24, '5a': 60, 'all': null };
    const laborRangeLimit = laborRangeMap[regionalTimeRange];
    const buildLaborChartData = (series, limit = laborRangeLimit) => {
        if (!series || !series.length) return [];
        const cleaned = series
            .filter((entry) => entry && entry.value !== null && entry.value !== undefined)
            .map((entry) => ({ date: entry.date, value: entry.value }));
        const effectiveLimit = limit === undefined ? 48 : limit;
        return effectiveLimit ? cleaned.slice(-effectiveLimit) : cleaned;
    };
    const nationalLaborSeries = useMemo(() => {
        const ftrMap = new Map();
        const ocuMap = new Map();

        Object.values(regionalData).forEach((region) => {
            (region?.labor?.ftr || []).forEach((entry) => {
                if (!entry || entry.value === null || entry.value === undefined) return;
                const current = ftrMap.get(entry.date) || 0;
                ftrMap.set(entry.date, current + Number(entry.value));
            });
            (region?.labor?.ocu || []).forEach((entry) => {
                if (!entry || entry.value === null || entry.value === undefined) return;
                const current = ocuMap.get(entry.date) || 0;
                ocuMap.set(entry.date, current + Number(entry.value));
            });
        });

        const buildSeries = (map) => Array.from(map.entries())
            .sort((a, b) => (a[0] || '').localeCompare(b[0] || ''))
            .map(([date, value]) => ({ date, value }));

        const ftrSeries = buildSeries(ftrMap);
        const ocuSeries = buildSeries(ocuMap);
        const ocuLookup = new Map(ocuSeries.map((entry) => [entry.date, entry.value]));
        const desSeries = ftrSeries
            .map((entry) => {
                const ocuValue = ocuLookup.get(entry.date);
                if (!ocuValue || !entry.value) return null;
                const rate = (1 - (ocuValue / entry.value)) * 100;
                return { date: entry.date, value: rate };
            })
            .filter(Boolean);

        return { ftr: ftrSeries, ocu: ocuSeries, des: desSeries };
    }, [regionalData]);
    const laborFtrSeries = laborRegionId ? regionalData[laborRegionId]?.labor?.ftr : nationalLaborSeries.ftr;
    const laborOcuSeries = laborRegionId ? regionalData[laborRegionId]?.labor?.ocu : nationalLaborSeries.ocu;
    const laborDesSeries = laborRegionId ? regionalData[laborRegionId]?.labor?.des : nationalLaborSeries.des;
    const laborCards = useMemo(() => (
        [
            {
                id: 'labor-ftr',
                title: 'Fuerza de trabajo',
                series: laborFtrSeries,
                color: '#38bdf8',
                unit: 'mil personas',
                formatter: (val) => `${formatNumber(val, 1)} mil`
            },
            {
                id: 'labor-ocu',
                title: 'Ocupados',
                series: laborOcuSeries,
                color: '#22c55e',
                unit: 'mil personas',
                formatter: (val) => `${formatNumber(val, 1)} mil`
            },
            {
                id: 'labor-des',
                title: 'Tasa de desocupacion',
                series: laborDesSeries,
                color: '#facc15',
                unit: '%',
                formatter: (val) => `${formatNumber(val, 1)}%`
            }
        ]
    ), [laborFtrSeries, laborOcuSeries, laborDesSeries]);

    const showTopNav = hasScrolled || activeSection !== 'datos';
    const handleSectionSelect = (sectionId) => {
        setActiveSection(sectionId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const blogItems = [
        {
            title: 'Blog editorial',
            badge: 'PROXIMAMENTE',
            description: 'Publicaciones breves con contexto macro y lecturas semanales.'
        }
    ];

    const videoItems = [
        {
            title: 'Videos explicativos',
            badge: 'PROXIMAMENTE',
            description: 'Series cortas y entrevistas para explicar datos con claridad.'
        }
    ];

    const developmentItems = [
        { id: 'dev-1', label: 'Detalles en graficos', done: true },
        { id: 'dev-2', label: 'Descarga de datos', done: true },
        { id: 'dev-3', label: 'Correcciones y mejoras visuales', done: true },
        { id: 'dev-4', label: 'Correo oficial', done: true }
    ];

    return (
        <div className={`container ${hasScrolled ? 'has-scrolled' : 'intro-only'}`}>
            <TopNav
                theme={theme}
                onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                activeSection={activeSection}
                onSelectSection={handleSectionSelect}
                isVisible={showTopNav}
            />

            {activeSection === 'datos' ? (
                <>
                    <HeroHeader />

                    <OverviewSection
                        sectionRef={(el) => { revealElementsRef.current[0] = el; }}
                        pibCompositionData={pibCompositionData}
                        theme={theme}
                        showPibInfo={showPibInfo}
                        setShowPibInfo={setShowPibInfo}
                        periodYears={periodYears}
                        periodQuarters={periodQuarters}
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        selectedQuarter={selectedQuarter}
                        setSelectedQuarter={setSelectedQuarter}
                        availablePeriods={availablePeriods}
                        nominalSeries={nominalSeries}
                        pibTableIndicators={pibTableIndicators}
                        buildSparklinePaths={buildSparklinePaths}
                        getSparklineTrend={getSparklineTrend}
                        chartIndicators={chartIndicators}
                    />

                    <RegionalSection
                        sectionRef={(el) => { revealElementsRef.current[1] = el; }}
                        theme={theme}
                        selectedRegion={selectedRegion}
                        setSelectedRegion={setSelectedRegion}
                        regionalData={regionalData}
                        sideIndicators={sideIndicators}
                        realPibData={realPibData}
                        formatNumber={formatNumber}
                        regionalTimeRange={regionalTimeRange}
                        setRegionalTimeRange={setRegionalTimeRange}
                        regionalPibChartData={regionalPibChartData}
                        regionalPibStartLabel={regionalPibStartLabel}
                        regionalPibEndLabel={regionalPibEndLabel}
                        getRegionId={getRegionId}
                        populationData={populationData}
                        laborCards={laborCards}
                        buildLaborChartData={buildLaborChartData}
                        formatMonthLabelDash={formatMonthLabelDash}
                    />
                </>
            ) : null}

            {activeSection === 'blog' ? (
                <PlaceholderSection
                    title="Blog"
                    subtitle="Un espacio editorial para análisis, notas breves y lecturas en profundidad."
                    items={blogItems}
                />
            ) : null}

            {activeSection === 'videos' ? (
                <PlaceholderSection
                    title="Videos"
                    subtitle="Contenido audiovisual para explicar los datos con claridad y contexto."
                    items={videoItems}
                />
            ) : null}

            {activeSection === 'contacto' ? <ContactSection /> : null}

            {activeSection === 'desarrollo' ? (
                <DevelopmentSection items={developmentItems} />
            ) : null}
            <Analytics />
            <SpeedInsights />
        </div>
    );
}

export default App;
