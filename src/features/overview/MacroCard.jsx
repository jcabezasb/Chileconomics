import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, LineChart, Table2, X } from 'lucide-react';
import TrendChart from '../../shared/components/TrendChart';
import DataTable from '../../shared/components/DataTable';
import { getChartData, getFxDetailSeries, getImacecDetailSeries, getIpcDetailSeries, getTcrDetailSeries } from '../../data/bcch/api';
import { formatNumber } from '../../shared/utils/format';
import { DetailPanel, IconButton, Legend, Segmented, StatStrip } from './IndicatorDetailParts';
import { buildJoinedReturns, buildRollingCorrelation, correlationBetween, toWeekly } from '../../shared/utils/correlation';
import {
    computeSeriesStats,
    formatPeriodChange,
    formatShortDate,
    isDailySeries,
    makeAxisFormatter,
    makeValueFormatter
} from '../../shared/utils/detailStats';

const DEFAULT_RANGE_BY_INDICATOR = {
    ipc: '1y',
    desempleo: '1y',
    dolar: '1y',
    cobre: '1y'
};
const RANGE_OPTIONS = [
    { id: '1y', label: '1A' },
    { id: '2y', label: '2A' },
    { id: '5y', label: '5A' },
    { id: 'all', label: 'Todo' }
];
const MODAL_RANGE_OPTIONS = [
    ...RANGE_OPTIONS,
    { id: 'custom', label: 'Otro', title: 'Elegir fechas' }
];
const UNIT_OPTIONS = [
    { id: 'level', label: 'Nivel' },
    { id: 'yoy', label: 'Var. 12 meses', title: 'Variación porcentual respecto a 12 meses antes' }
];
const VIEW_OPTIONS = [
    { id: 'chart', label: 'Gráfico', icon: LineChart },
    { id: 'table', label: 'Tabla', icon: Table2 }
];
const PERIOD_LABELS = {
    '1y': 'en 12 meses',
    '2y': 'en 2 años',
    '5y': 'en 5 años',
    all: 'en todo el período',
    custom: 'en el período'
};
const PERCENT_UNIT_INDICATORS = new Set(['ipc', 'desempleo']);
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const YOY_ELIGIBLE = new Set(['imacec', 'cobre', 'dolar']);
const IMACEC_GOODS_OPTIONS = [
    { id: 'total', label: 'Total' },
    { id: 'mineria', label: 'Minería' },
    { id: 'industria', label: 'Industria' },
    { id: 'resto', label: 'Resto de bienes' }
];

const MacroCard = ({ indicator, theme, onOpen, onClose, variant = 'compact' }) => {
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState(DEFAULT_RANGE_BY_INDICATOR[indicator.id] || '1y');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [rangeStep, setRangeStep] = useState({ start: 'year', end: 'year' });
    const [mainView, setMainView] = useState('chart');
    const [showYoY, setShowYoY] = useState(false);
    const [ipcDetailData, setIpcDetailData] = useState(null);
    const [imacecDetailData, setImacecDetailData] = useState(null);
    const [fxDetailData, setFxDetailData] = useState(null);
    const [tcrDetailData, setTcrDetailData] = useState(null);
    const [imacecGoodsSelection, setImacecGoodsSelection] = useState(['total']);
    const [cobreDolarData, setCobreDolarData] = useState(null);
    const customRangeRef = useRef(null);
    const isInteractive = typeof onOpen === 'function';
    const isModal = variant === 'modal';
    const isFeatured = variant === 'featured';

    useEffect(() => {
        getChartData(indicator.id).then(data => setChartData(data));
    }, [indicator.id]);

    useEffect(() => {
        let isActive = true;
        if (indicator.id !== 'ipc') {
            setIpcDetailData(null);
            return undefined;
        }

        getIpcDetailSeries().then((data) => {
            if (!isActive) return;
            setIpcDetailData(data);
        });

        return () => {
            isActive = false;
        };
    }, [indicator.id]);

    useEffect(() => {
        let isActive = true;
        if (indicator.id !== 'imacec') {
            setImacecDetailData(null);
            return undefined;
        }

        getImacecDetailSeries().then((data) => {
            if (!isActive) return;
            setImacecDetailData(data);
        });

        return () => {
            isActive = false;
        };
    }, [indicator.id]);

    useEffect(() => {
        let isActive = true;
        if (indicator.id !== 'dolar') {
            setFxDetailData(null);
            return undefined;
        }

        getFxDetailSeries().then((data) => {
            if (!isActive) return;
            setFxDetailData(data);
        });

        return () => {
            isActive = false;
        };
    }, [indicator.id]);

    useEffect(() => {
        let isActive = true;
        if (indicator.id !== 'dolar') {
            setTcrDetailData(null);
            return undefined;
        }

        getTcrDetailSeries().then((data) => {
            if (!isActive) return;
            setTcrDetailData(data);
        });

        return () => {
            isActive = false;
        };
    }, [indicator.id]);

    // El dólar solo se carga al abrir la ventana del cobre (para compararlos).
    useEffect(() => {
        let isActive = true;
        if (!isModal || indicator.id !== 'cobre') {
            setCobreDolarData(null);
            return undefined;
        }

        getChartData('dolar').then((data) => {
            if (!isActive) return;
            setCobreDolarData(data);
        });

        return () => {
            isActive = false;
        };
    }, [isModal, indicator.id]);

    const cobreDolarReturns = useMemo(() => (
        indicator.id === 'cobre' && cobreDolarData?.length && chartData.length
            ? buildJoinedReturns(toWeekly(chartData), toWeekly(cobreDolarData))
            : []
    ), [indicator.id, cobreDolarData, chartData]);
    const cobreDolarRolling = useMemo(() => (
        buildRollingCorrelation(cobreDolarReturns, [
            { key: 'corr3m', size: 13 },
            { key: 'corr12m', size: 52 }
        ])
    ), [cobreDolarReturns]);

    const isYoYEligible = YOY_ELIGIBLE.has(indicator.id);
    const yoyEnabled = isModal && isYoYEligible && showYoY;
    const formatAverage = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        const formatted = formatNumber(value, 1);
        if (yoyEnabled) {
            return `${formatted}%`;
        }
        if (indicator.id === 'ipc') {
            return `${formatted}%`;
        }
        if (indicator.id === 'desempleo') {
            return `${formatted}%`;
        }
        if (indicator.id === 'dolar') {
            return `$${formatted}`;
        }
        if (indicator.id === 'cobre') {
            return `$${formatted}`;
        }
        return formatted;
    };

    const formatTooltipValue = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        const formatted = formatNumber(value, 1);
        if (yoyEnabled) {
            return `${formatted}%`;
        }
        if (indicator.id === 'ipc') {
            return `${formatted}%`;
        }
        if (indicator.id === 'desempleo') {
            return `${formatted}%`;
        }
        if (indicator.id === 'dolar') {
            return `$${formatted}`;
        }
        if (indicator.id === 'cobre') {
            return `$${formatted}`;
        }
        return formatted;
    };

    const formatStartDate = (date) => {
        if (!date) return '';
        const parts = date.split('-');
        if (parts.length < 2) return '';
        const year = parts[0];
        const month = parts[1];
        const day = parts[2] || '01';
        if (!year || !month) return '';
        const yy = year.slice(-2);
        const dd = String(day).padStart(2, '0');
        const mm = String(month).padStart(2, '0');
        return `${dd}/${mm}/${yy}`;
    };
    const formatMonthLabel = (value) => {
        if (!value) return '';
        const parts = value.split('-');
        if (parts.length < 2) return value;
        const year = parts[0];
        const monthIndex = Number(parts[1]) - 1;
        const mon = MONTH_SHORT[monthIndex] || parts[1];
        return `${mon} ${year}`;
    };
    const formatMonthOnly = (value) => {
        if (!value) return '';
        const parts = value.split('-');
        if (parts.length < 2) return value;
        const monthIndex = Number(parts[1]) - 1;
        return MONTH_SHORT[monthIndex] || parts[1];
    };
    const parseDateParts = (dateValue) => {
        if (!dateValue) return null;
        const parts = dateValue.split('-');
        if (parts.length < 3) return null;
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
        return { year, month, day };
    };
    const buildDateKey = (year, month, day) => (
        `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
    const shiftDayKey = (dateValue, deltaDays) => {
        const parts = parseDateParts(dateValue);
        if (!parts) return '';
        const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
        base.setUTCDate(base.getUTCDate() + deltaDays);
        return buildDateKey(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
    };
    const shiftYearKey = (dateValue, deltaYears = -1) => {
        const parts = parseDateParts(dateValue);
        if (!parts) return '';
        const targetYear = parts.year + deltaYears;
        const targetMonth = parts.month;
        let targetDay = parts.day;
        const candidate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay));
        if (candidate.getUTCMonth() !== targetMonth - 1) {
            targetDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
        }
        return buildDateKey(targetYear, targetMonth, targetDay);
    };
    const toggleImacecSelection = (optionId) => {
        setImacecGoodsSelection((prev) => {
            const next = new Set(prev);
            const totalActive = next.has('total');
            if (optionId === 'total') {
                if (totalActive) return Array.from(next);
                return ['total'];
            }
            if (totalActive) {
                return [optionId];
            }
            if (next.has(optionId)) {
                next.delete(optionId);
            } else {
                next.add(optionId);
            }
            if (next.has('total')) next.delete('total');
            return Array.from(next);
        });
    };

    useEffect(() => {
        setTimeRange(DEFAULT_RANGE_BY_INDICATOR[indicator.id] || '1y');
        setCustomRange({ start: '', end: '' });
        setOpenDropdown(null);
        setRangeStep({ start: 'year', end: 'year' });
        setMainView('chart');
        setShowYoY(false);
        setImacecGoodsSelection(['total']);
    }, [indicator.id]);

    const getPointsPerYear = () => {
        if (indicator.id === 'ipc' || indicator.id === 'desempleo') return 12;
        if (indicator.id === 'dolar' || indicator.id === 'cobre') return 365;
        return 12;
    };

    const getRangePoints = () => {
        const pointsPerYear = getPointsPerYear();
        if (timeRange === 'all') return null;
        const years = Number(timeRange.replace('y', ''));
        return Number.isNaN(years) ? null : years * pointsPerYear;
    };

    const rangePoints = getRangePoints();
    const normalizeDate = (value) => {
        if (!value) return '';
        if (value.length === 7) return `${value}-01`;
        return value;
    };
    const hasDailyDates = chartData.some((entry) => (entry.date || entry.name || '').length >= 10);
    const useDailyPicker = hasDailyDates && chartData.length > 400;
    const useMonthlyRange = !useDailyPicker;
    const toMonthKey = (value) => (value ? value.slice(0, 7) : '');
    const rawDates = chartData
        .map((entry) => entry.date || entry.name || '')
        .filter(Boolean)
        .map((value) => (useDailyPicker ? normalizeDate(value) : toMonthKey(value)))
        .filter(Boolean)
        .sort();
    const availableDateOptions = Array.from(new Set(rawDates));
    const firstAvailableDate = availableDateOptions[0] || '';
    const lastAvailableDate = availableDateOptions[availableDateOptions.length - 1] || '';
    const dateStructure = availableDateOptions.reduce((acc, value) => {
        const parts = value.split('-');
        const year = parts[0];
        const month = parts[1] || '01';
        const day = parts[2] || '01';
        if (!acc.years.includes(year)) acc.years.push(year);
        if (!acc.monthsByYear[year]) acc.monthsByYear[year] = [];
        if (!acc.monthsByYear[year].includes(month)) acc.monthsByYear[year].push(month);
        const ymKey = `${year}-${month}`;
        if (!acc.daysByYearMonth[ymKey]) acc.daysByYearMonth[ymKey] = [];
        if (!acc.daysByYearMonth[ymKey].includes(day)) acc.daysByYearMonth[ymKey].push(day);
        return acc;
    }, { years: [], monthsByYear: {}, daysByYearMonth: {} });
    dateStructure.years.sort();
    Object.keys(dateStructure.monthsByYear).forEach((year) => {
        dateStructure.monthsByYear[year].sort();
    });
    Object.keys(dateStructure.daysByYearMonth).forEach((key) => {
        dateStructure.daysByYearMonth[key].sort();
    });
    const applyCustomRange = (data) => {
        if (timeRange !== 'custom') return data;
        const start = customRange.start;
        const end = customRange.end;
        if (!start && !end) return data;
        return data.filter((entry) => {
            const raw = entry.date || entry.name || '';
            const entryDate = useMonthlyRange ? toMonthKey(raw) : normalizeDate(raw);
            if (!entryDate) return false;
            if (start && entryDate < start) return false;
            if (end && entryDate > end) return false;
            return true;
        });
    };
    const getSeriesFrequency = (series) => {
        if (!series || !series.length) return 'monthly';
        const sample = series.slice(0, Math.min(series.length, 24));
        const hasNonFirstDay = sample.some((entry) => {
            const raw = entry?.date || entry?.name || '';
            const parts = raw.split('-');
            if (parts.length < 3) return false;
            return parts[2] !== '01';
        });
        return hasNonFirstDay ? 'daily' : 'monthly';
    };
    const buildYoYSeries = (series) => {
        if (!series || !series.length) return [];
        const normalized = series
            .map((entry) => {
                const rawDate = entry?.date || entry?.name || '';
                const value = Number(entry?.value);
                if (!rawDate || Number.isNaN(value)) return null;
                return { ...entry, date: rawDate, value };
            })
            .filter(Boolean)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        if (!normalized.length) return [];

        const freq = getSeriesFrequency(normalized);
        if (freq === 'monthly') {
            const monthKey = (value) => (value ? value.slice(0, 7) : '');
            const monthMap = new Map();
            normalized.forEach((entry) => {
                const key = monthKey(entry.date);
                if (key) monthMap.set(key, entry.value);
            });
            return normalized
                .map((entry) => {
                    const key = monthKey(entry.date);
                    if (!key) return null;
                    const parts = key.split('-');
                    const year = Number(parts[0]);
                    const month = parts[1];
                    if (Number.isNaN(year) || !month) return null;
                    const prevKey = `${year - 1}-${month}`;
                    const prevValue = monthMap.get(prevKey);
                    if (prevValue === null || prevValue === undefined) return null;
                    if (!prevValue) return null;
                    const yoy = ((entry.value - prevValue) / prevValue) * 100;
                    return { ...entry, value: yoy };
                })
                .filter((entry) => entry && entry.value !== null && entry.value !== undefined);
        }

        const valueMap = new Map(normalized.map((entry) => [entry.date, entry.value]));
        const findPrevValue = (targetKey) => {
            if (valueMap.has(targetKey)) return valueMap.get(targetKey);
            for (let i = 1; i <= 7; i += 1) {
                const fallbackKey = shiftDayKey(targetKey, -i);
                if (valueMap.has(fallbackKey)) return valueMap.get(fallbackKey);
            }
            return null;
        };
        return normalized
            .map((entry) => {
                const targetKey = shiftYearKey(entry.date);
                if (!targetKey) return null;
                const prevValue = findPrevValue(targetKey);
                if (prevValue === null || prevValue === undefined) return null;
                if (!prevValue) return null;
                const yoy = ((entry.value - prevValue) / prevValue) * 100;
                return { ...entry, value: yoy };
            })
            .filter((entry) => entry && entry.value !== null && entry.value !== undefined);
    };
    const computeRangeStartKey = (series, freq) => {
        if (!series || !series.length) return '';
        if (timeRange === 'all' || timeRange === 'custom') return '';
        const years = Number(timeRange.replace('y', ''));
        if (Number.isNaN(years)) return '';
        const rawEnd = series[series.length - 1]?.date || series[series.length - 1]?.name || '';
        if (!rawEnd) return '';
        const endKey = freq === 'daily' ? normalizeDate(rawEnd) : toMonthKey(rawEnd);
        if (!endKey) return '';
        const parts = endKey.split('-');
        const endYear = Number(parts[0]);
        const endMonth = Number(parts[1] || '1');
        const endDay = Number(parts[2] || '1');
        const targetYear = endYear - years;
        const targetMonth = String(endMonth).padStart(2, '0');
        const targetDay = String(endDay).padStart(2, '0');
        return freq === 'daily'
            ? `${targetYear}-${targetMonth}-${targetDay}`
            : `${targetYear}-${targetMonth}`;
    };
    const applyRangeWindow = (data, freq) => {
        if (timeRange === 'all') return data;
        if (timeRange === 'custom') return applyCustomRangeForSeries(data, freq);
        const startKey = computeRangeStartKey(data, freq);
        if (!startKey) return data;
        return data.filter((entry) => {
            const raw = entry.date || entry.name || '';
            const entryKey = freq === 'daily' ? normalizeDate(raw) : toMonthKey(raw);
            return entryKey && entryKey >= startKey;
        });
    };
    const applyCustomRangeForSeries = (data, freq) => {
        if (timeRange !== 'custom') return data;
        const start = customRange.start;
        const end = customRange.end;
        if (!start && !end) return data;
        const startKey = start ? (freq === 'daily' ? normalizeDate(start) : toMonthKey(start)) : '';
        const endKey = end ? (freq === 'daily' ? normalizeDate(end) : toMonthKey(end)) : '';
        return data.filter((entry) => {
            const raw = entry.date || entry.name || '';
            const entryKey = freq === 'daily' ? normalizeDate(raw) : toMonthKey(raw);
            if (!entryKey) return false;
            if (startKey && entryKey < startKey) return false;
            if (endKey && entryKey > endKey) return false;
            return true;
        });
    };
    const mainSeriesFrequency = getSeriesFrequency(chartData);
    const filteredChartData = applyRangeWindow(chartData, mainSeriesFrequency);
    const rawYoYChartData = useMemo(() => buildYoYSeries(chartData), [chartData]);
    const yoySeriesFrequency = getSeriesFrequency(rawYoYChartData);
    const filteredYoYChartData = applyRangeWindow(rawYoYChartData, yoySeriesFrequency);
    const displayChartData = yoyEnabled ? filteredYoYChartData : filteredChartData;
    const chartStartDate = formatStartDate(displayChartData[0]?.date);
    const chartHeight = isModal ? 240 : isFeatured ? 260 : 110;
    const handleCardClick = () => {
        if (isInteractive) onOpen(indicator);
    };
    const handleCardKeyDown = (event) => {
        if (!isInteractive) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(indicator);
        }
    };

    const parseParts = (value) => {
        if (!value) return { year: '', month: '', day: '' };
        const parts = value.split('-');
        return {
            year: parts[0] || '',
            month: parts[1] || '01',
            day: parts[2] || '01'
        };
    };
    const buildValue = (parts) => {
        if (!parts.year || !parts.month) return '';
        if (useDailyPicker) return `${parts.year}-${parts.month}-${parts.day || '01'}`;
        return `${parts.year}-${parts.month}`;
    };
    const startParts = parseParts(customRange.start);
    const endParts = parseParts(customRange.end);
    const startYearOptions = dateStructure.years;
    const startMonthOptions = dateStructure.monthsByYear[startParts.year] || [];
    const startDayOptions = dateStructure.daysByYearMonth[`${startParts.year}-${startParts.month}`] || [];
    const endYearOptions = dateStructure.years;
    const endMonthOptions = dateStructure.monthsByYear[endParts.year] || [];
    const endDayOptions = dateStructure.daysByYearMonth[`${endParts.year}-${endParts.month}`] || [];
    const updateStart = (parts) => {
        const nextValue = buildValue(parts);
        setCustomRange((prev) => ({
            start: nextValue,
            end: prev.end && prev.end < nextValue ? nextValue : prev.end
        }));
    };
    const updateEnd = (parts) => {
        const nextValue = buildValue(parts);
        setCustomRange((prev) => ({
            start: prev.start && prev.start > nextValue ? nextValue : prev.start,
            end: nextValue
        }));
    };
    const formatDisplayDate = (value) => {
        if (!value) return 'Fecha';
        if (useDailyPicker) return formatStartDate(value);
        return formatMonthLabel(value);
    };
    const csvContent = useMemo(() => {
        if (!displayChartData.length) return '';
        const header = 'fecha;valor';
        const rows = displayChartData.map((entry) => {
            const dateValue = entry.date || entry.name || '';
            const value = Number(entry.value);
            const formattedValue = Number.isNaN(value) ? '' : formatNumber(value, 1);
            return `${dateValue};${formattedValue}`;
        });
        return [header, ...rows].join('\n');
    }, [displayChartData]);
    const downloadCsv = (content, filename) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'datos.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    const handleDownloadCsv = () => {
        downloadCsv(csvContent, `${indicator.id || 'serie'}-datos.csv`);
    };
    const ipcDetailSeries = useMemo(() => {
        if (indicator.id !== 'ipc') return null;

        if (ipcDetailData) {
            const coreBase = rangePoints ? ipcDetailData.core.slice(-rangePoints) : ipcDetailData.core;
            const volatileBase = rangePoints ? ipcDetailData.volatile.slice(-rangePoints) : ipcDetailData.volatile;
            const core = applyCustomRange(coreBase);
            const volatile = applyCustomRange(volatileBase);
            if (!core.length || !volatile.length) return null;
            return { core, volatile };
        }

        return null;
    }, [indicator.id, ipcDetailData, filteredChartData, rangePoints, timeRange, customRange.start, customRange.end, useMonthlyRange, useDailyPicker]);
    const imacecDetailSeries = useMemo(() => {
        if (indicator.id !== 'imacec' || !imacecDetailData) return null;

        const buildSeries = (series) => {
            const base = yoyEnabled ? buildYoYSeries(series) : series;
            const freq = getSeriesFrequency(base);
            return applyRangeWindow(base, freq);
        };

        return {
            bienes: buildSeries(imacecDetailData.bienes || []),
            mineria: buildSeries(imacecDetailData.mineria || []),
            industria: buildSeries(imacecDetailData.industria || []),
            restoBienes: buildSeries(imacecDetailData.resto_bienes || []),
            comercio: buildSeries(imacecDetailData.comercio || []),
            servicios: buildSeries(imacecDetailData.servicios || []),
            noMinero: buildSeries(imacecDetailData.no_minero || [])
        };
    }, [indicator.id, imacecDetailData, timeRange, customRange.start, customRange.end, yoyEnabled]);
    const fxDetailSeries = useMemo(() => {
        if (indicator.id !== 'dolar' || !fxDetailData) return null;

        const buildSeries = (series) => {
            const base = yoyEnabled ? buildYoYSeries(series) : series;
            const freq = getSeriesFrequency(base);
            return applyRangeWindow(base, freq);
        };

        return {
            cny: buildSeries(fxDetailData.cny || []),
            eur: buildSeries(fxDetailData.eur || []),
            ars: buildSeries(fxDetailData.ars || []),
            jpy: buildSeries(fxDetailData.jpy || [])
        };
    }, [indicator.id, fxDetailData, rangePoints, timeRange, customRange.start, customRange.end, useMonthlyRange, useDailyPicker, yoyEnabled]);
    const fxHasData = Boolean(
        fxDetailSeries
        && (fxDetailSeries.cny.length || fxDetailSeries.eur.length || fxDetailSeries.ars.length || fxDetailSeries.jpy.length)
    );
    const tcrDetailSeries = useMemo(() => {
        if (indicator.id !== 'dolar' || !tcrDetailData) return null;

        const buildSeries = (series) => {
            const base = yoyEnabled ? buildYoYSeries(series) : series;
            const freq = getSeriesFrequency(base);
            return applyRangeWindow(base, freq);
        };

        return {
            tcr: buildSeries(tcrDetailData.tcr || []),
            tcr5: buildSeries(tcrDetailData.tcr5 || [])
        };
    }, [indicator.id, tcrDetailData, timeRange, customRange.start, customRange.end, useMonthlyRange, useDailyPicker, yoyEnabled]);
    const tcrChartData = useMemo(() => {
        if (!tcrDetailSeries) return [];
        const dateMap = new Map();

        const addSeries = (series, key) => {
            (series || []).forEach((entry) => {
                const dateKey = entry?.date || entry?.name || '';
                if (!dateKey) return;
                const current = dateMap.get(dateKey) || { date: dateKey };
                current[key] = entry.value;
                dateMap.set(dateKey, current);
            });
        };

        addSeries(tcrDetailSeries.tcr, 'tcr');
        addSeries(tcrDetailSeries.tcr5, 'tcr5');

        return Array.from(dateMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [tcrDetailSeries]);
    const mergeSeriesByDate = (seriesMap) => {
        const dateMap = new Map();

        Object.entries(seriesMap || {}).forEach(([key, series]) => {
            (series || []).forEach((entry) => {
                const dateKey = entry?.date || entry?.name || '';
                if (!dateKey) return;
                const current = dateMap.get(dateKey) || { date: dateKey };
                current[key] = entry.value;
                dateMap.set(dateKey, current);
            });
        });

        return Array.from(dateMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    };
    const imacecGoodsSeriesMap = useMemo(() => {
        if (!imacecDetailSeries) return null;
        return {
            total: { key: 'bienes', label: 'Producción de bienes', color: '#38bdf8', series: imacecDetailSeries.bienes },
            mineria: { key: 'mineria', label: 'Minería', color: '#0ea5e9', series: imacecDetailSeries.mineria },
            industria: { key: 'industria', label: 'Industria', color: '#f59e0b', series: imacecDetailSeries.industria },
            resto: { key: 'resto', label: 'Resto de bienes', color: '#a855f7', series: imacecDetailSeries.restoBienes }
        };
    }, [imacecDetailSeries]);
    const imacecGoodsChart = useMemo(() => {
        if (!imacecDetailSeries || !imacecGoodsSeriesMap) return { data: [], series: [] };
        const selected = imacecGoodsSelection.length ? imacecGoodsSelection : ['total'];
        const uniqueSelected = Array.from(new Set(selected));
        const selectedSeries = uniqueSelected
            .map((id) => imacecGoodsSeriesMap[id])
            .filter(Boolean);

        if (selectedSeries.length <= 1) {
            const base = selectedSeries[0] || imacecGoodsSeriesMap.total;
            return { data: base?.series || [], series: [] };
        }

        const data = mergeSeriesByDate(
            selectedSeries.reduce((acc, entry) => {
                acc[entry.key] = entry.series;
                return acc;
            }, {})
        );
        const series = selectedSeries.map((entry) => ({
            key: entry.key,
            color: entry.color,
            label: entry.label,
            fill: true,
            fillOpacity: 0.2
        }));
        return { data, series };
    }, [imacecDetailSeries, imacecGoodsSeriesMap, imacecGoodsSelection]);
    const imacecCommerceServicesData = useMemo(() => {
        if (!imacecDetailSeries) return [];
        return mergeSeriesByDate({
            comercio: imacecDetailSeries.comercio,
            servicios: imacecDetailSeries.servicios
        });
    }, [imacecDetailSeries]);
    const displayValue = useMemo(() => {
        if (!yoyEnabled) return indicator.value;
        const latest = displayChartData[displayChartData.length - 1];
        if (!latest || latest.value === null || latest.value === undefined) return '--';
        return `${formatNumber(latest.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }, [yoyEnabled, displayChartData, indicator.value]);
    const displaySubtitle = yoyEnabled ? 'Var. % en 12 meses' : indicator.subtitle;
    const showVariation = indicator.variation && !yoyEnabled;
    const renderOptionGrid = (options, selectedValue, onSelect, formatLabel) => (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '0.3rem',
                maxHeight: '200px',
                overflowY: 'auto',
                paddingRight: '0.15rem'
            }}
        >
            {options.map((option) => (
                <button
                    key={`opt-${option}`}
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelect(option);
                    }}
                    style={{
                        padding: '0.35rem 0',
                        borderRadius: '8px',
                        border: '1px solid transparent',
                        background: option === selectedValue ? 'var(--bg-hover)' : 'transparent',
                        color: option === selectedValue ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer'
                    }}
                >
                    {formatLabel ? formatLabel(option) : option}
                </button>
            ))}
        </div>
    );
    const renderDayGrid = (parts, availableDays, onSelect) => {
        if (!parts.year || !parts.month) return null;
        const year = Number(parts.year);
        const month = Number(parts.month);
        if (Number.isNaN(year) || Number.isNaN(month)) return null;
        const firstDay = new Date(year, month - 1, 1);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const lastDay = new Date(year, month, 0).getDate();
        const availableSet = new Set(availableDays);
        const grid = [];
        for (let i = 0; i < startOffset; i += 1) {
            grid.push(null);
        }
        for (let day = 1; day <= lastDay; day += 1) {
            const dayValue = String(day).padStart(2, '0');
            const isAvailable = availableSet.has(dayValue);
            grid.push({ day: dayValue, isAvailable });
        }
        return renderOptionGrid(
            grid.filter((cell) => cell && cell.isAvailable).map((cell) => cell.day),
            parts.day,
            onSelect,
            (value) => String(Number(value)).padStart(2, '0')
        );
    };

    useEffect(() => {
        if (timeRange !== 'custom' || customRange.start || customRange.end) return;
        if (!chartData.length) return;
        setCustomRange({ start: firstAvailableDate, end: lastAvailableDate });
    }, [timeRange, customRange, chartData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customRangeRef.current && !customRangeRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isPercentUnit = yoyEnabled || PERCENT_UNIT_INDICATORS.has(indicator.id);
    const periodLabel = PERIOD_LABELS[timeRange] || 'en el período';
    const isCurrency = indicator.id === 'dolar' || indicator.id === 'cobre';
    const mainAxisFormatter = makeAxisFormatter(isPercentUnit ? { suffix: '%' } : isCurrency ? { prefix: '$' } : {});
    const percentFormatter = makeValueFormatter({ suffix: '%' });
    const indexFormatter = makeValueFormatter({ decimals: 1 });
    const subFormatter = yoyEnabled ? percentFormatter : indexFormatter;
    const subAxisFormatter = makeAxisFormatter(yoyEnabled ? { suffix: '%' } : {});
    const fxFormatter = (value) => (
        yoyEnabled
            ? percentFormatter(value)
            : makeValueFormatter({ prefix: '$', decimals: Math.abs(Number(value)) < 10 ? 2 : 1 })(value)
    );
    const fxAxisFormatter = makeAxisFormatter(yoyEnabled ? { suffix: '%' } : { prefix: '$' });
    const subUnitLabel = yoyEnabled ? 'Var. % en 12 meses' : 'Índice 2018=100';

    // Tablas y CSV del detalle: la fila más reciente arriba.
    const buildSingleTable = (series, label, formatter) => {
        const daily = isDailySeries(series);
        return {
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'value', label, align: 'right', emphasis: true }
            ],
            rows: [...(series || [])].reverse().map((entry, index) => ({
                id: `${entry.date || entry.name}-${index}`,
                date: formatShortDate(entry.date || entry.name, daily),
                value: formatter(entry.value)
            }))
        };
    };
    const buildMultiTable = (data, seriesDefs, formatter) => {
        const daily = isDailySeries(data);
        return {
            columns: [
                { key: 'date', label: 'Fecha' },
                ...seriesDefs.map((def, index) => ({ key: def.key, label: def.label, align: 'right', emphasis: index === 0 }))
            ],
            rows: [...(data || [])].reverse().map((row) => {
                const formatted = { id: row.date, date: formatShortDate(row.date, daily) };
                seriesDefs.forEach((def) => {
                    formatted[def.key] = formatter(row[def.key]);
                });
                return formatted;
            })
        };
    };
    const buildCsv = (data, seriesDefs, decimals = 1) => {
        const header = ['fecha', ...seriesDefs.map((def) => def.key)].join(';');
        const lines = (data || []).map((row) => {
            const values = seriesDefs.map((def) => (
                row[def.key] === undefined || row[def.key] === null ? '' : formatNumber(Number(row[def.key]), decimals)
            ));
            return [row.date || row.name || '', ...values].join(';');
        });
        return [header, ...lines].join('\n');
    };
    const fileSuffix = yoyEnabled ? '-var12m' : '';
    const panelChange = (series, percentUnit = yoyEnabled) => formatPeriodChange(computeSeriesStats(series), percentUnit);
    const panelLatest = (series, formatter) => {
        const stats = computeSeriesStats(series);
        return stats ? formatter(stats.last.value) : null;
    };

    const renderCustomRange = () => (
                <div ref={customRangeRef} className="detail-custom-range" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', position: 'relative' }}>
                    {['start', 'end'].map((kind) => {
                        const parts = kind === 'start' ? startParts : endParts;
                        const yearOptions = kind === 'start' ? startYearOptions : endYearOptions;
                        const monthOptions = kind === 'start' ? startMonthOptions : endMonthOptions;
                        const dayOptions = kind === 'start' ? startDayOptions : endDayOptions;
                        const updateFn = kind === 'start' ? updateStart : updateEnd;
                        const label = kind === 'start' ? 'Desde' : 'Hasta';
                        return (
                            <div key={kind} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{label}</span>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenDropdown(openDropdown === kind ? null : kind);
                                        setRangeStep((prev) => ({ ...prev, [kind]: 'year' }));
                                    }}
                                    className="period-select"
                                    style={{ minWidth: '180px', textAlign: 'left' }}
                                >
                                    {formatDisplayDate(kind === 'start' ? customRange.start : customRange.end)}
                                </button>
                                {openDropdown === kind ? (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        left: 0,
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-md)',
                                        padding: '0.6rem',
                                        width: '260px',
                                        maxHeight: '280px',
                                        zIndex: 6
                                    }}>
                                        {rangeStep[kind] === 'year' ? (
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Año</div>
                                                {renderOptionGrid(yearOptions, parts.year, (year) => {
                                                    const nextMonths = dateStructure.monthsByYear[year] || [];
                                                    const nextMonth = kind === 'start' ? (nextMonths[0] || '01') : (nextMonths[nextMonths.length - 1] || '01');
                                                    const nextDays = dateStructure.daysByYearMonth[`${year}-${nextMonth}`] || ['01'];
                                                    const nextDay = kind === 'start' ? (nextDays[0] || '01') : (nextDays[nextDays.length - 1] || '01');
                                                    updateFn({ year, month: nextMonth, day: nextDay });
                                                    setRangeStep((prev) => ({ ...prev, [kind]: 'month' }));
                                                })}
                                            </div>
                                        ) : null}
                                        {rangeStep[kind] === 'month' ? (
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Mes</div>
                                                {renderOptionGrid(monthOptions, parts.month, (month) => {
                                                    const nextDays = dateStructure.daysByYearMonth[`${parts.year}-${month}`] || ['01'];
                                                    const nextDay = kind === 'start' ? (nextDays[0] || '01') : (nextDays[nextDays.length - 1] || '01');
                                                    updateFn({ year: parts.year, month, day: nextDay });
                                                    if (useDailyPicker) {
                                                        setRangeStep((prev) => ({ ...prev, [kind]: 'day' }));
                                                    } else {
                                                        setOpenDropdown(null);
                                                    }
                                                }, (value) => formatMonthOnly(`${parts.year}-${value}`))}
                                            </div>
                                        ) : null}
                                        {useDailyPicker && rangeStep[kind] === 'day' ? (
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Día</div>
                                                {renderDayGrid(parts, dayOptions, (day) => {
                                                    updateFn({ year: parts.year, month: parts.month, day });
                                                    setOpenDropdown(null);
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
    );

    if (isModal) {
        const mainStats = computeSeriesStats(displayChartData);
        const mainIsDaily = isDailySeries(displayChartData);
        const mainChange = formatPeriodChange(mainStats, isPercentUnit);
        const mainTable = mainView === 'table'
            ? buildSingleTable(displayChartData, indicator.title, formatTooltipValue)
            : null;

        const goodsSelected = imacecGoodsSelection.length ? imacecGoodsSelection : ['total'];
        const goodsIsSingle = imacecGoodsChart.series.length === 0;
        const goodsSingleDef = imacecGoodsSeriesMap?.[goodsSelected[0]] || imacecGoodsSeriesMap?.total;
        const goodsSeries = imacecGoodsChart.series.map((entry) => ({ ...entry, fill: false }));
        const goodsDefs = goodsIsSingle && goodsSingleDef
            ? [{ key: 'value', label: goodsSingleDef.label }]
            : goodsSeries;
        const commerceDefs = [
            { key: 'comercio', label: 'Comercio', color: '#22c55e' },
            { key: 'servicios', label: 'Servicios', color: '#60a5fa' }
        ];
        const ipcDefs = [
            { key: 'general', label: 'IPC general', color: 'var(--chart-neon)', strokeWidth: 2.5 },
            { key: 'core', label: 'Subyacente', color: '#38bdf8' },
            { key: 'volatile', label: 'Volátiles', color: '#f59e0b' }
        ];
        const ipcCombinedData = ipcDetailSeries
            ? mergeSeriesByDate({
                general: displayChartData,
                core: ipcDetailSeries.core,
                volatile: ipcDetailSeries.volatile
            })
            : [];
        const fxPanels = [
            { key: 'cny', title: 'Yuan chino', code: 'CNY', color: '#22d3ee' },
            { key: 'eur', title: 'Euro', code: 'EUR', color: '#60a5fa' },
            { key: 'ars', title: 'Peso argentino', code: 'ARS', color: '#f97316' },
            { key: 'jpy', title: 'Yen japonés', code: 'JPY', color: '#22c55e' }
        ];
        const tcrDefs = [
            { key: 'tcr', label: 'TCR', color: '#38bdf8' },
            { key: 'tcr5', label: 'TCR-5', color: '#f97316' }
        ];
        // Cobre vs dólar: en nivel ambas series parten en 100 al inicio del período (unidades distintas);
        // en "Var. 12 meses" se comparan las variaciones anuales.
        const cobrePairDefs = [
            { key: 'cobre', label: 'Cobre (US$/lb)', color: '#f97316' },
            { key: 'dolar', label: 'Dólar (CLP/US$)', color: '#38bdf8' }
        ];
        const corrDefs = [
            { key: 'corr12m', label: 'Ventana 12 meses', color: 'var(--chart-neon)', strokeWidth: 2.5 },
            { key: 'corr3m', label: 'Ventana 3 meses', color: '#94a3b8', strokeWidth: 1.5 }
        ];
        let cobrePairData = [];
        let cobreCorrData = [];
        let cobrePeriodCorr = null;
        if (indicator.id === 'cobre' && cobreDolarData?.length && displayChartData.length) {
            const startDate = displayChartData[0].date;
            const endDate = displayChartData[displayChartData.length - 1].date;
            const dolarBase = yoyEnabled ? buildYoYSeries(cobreDolarData) : cobreDolarData;
            const dolarInRange = dolarBase.filter((entry) => entry.date >= startDate && entry.date <= endDate);
            const rebase = (series) => {
                const base = Number(series[0]?.value);
                return base ? series.map((entry) => ({ date: entry.date, value: (Number(entry.value) / base) * 100 })) : [];
            };
            cobrePairData = mergeSeriesByDate({
                cobre: yoyEnabled ? displayChartData : rebase(displayChartData),
                dolar: yoyEnabled ? dolarInRange : rebase(dolarInRange)
            });
            cobreCorrData = cobreDolarRolling.filter((row) => row.date >= startDate && row.date <= endDate);
            cobrePeriodCorr = correlationBetween(cobreDolarReturns, startDate, endDate);
        }
        const corrFormatter = (value) => (
            value === null || value === undefined || Number.isNaN(Number(value))
                ? ''
                : formatNumber(Number(value), 2)
        );
        const pairFormatter = yoyEnabled ? percentFormatter : indexFormatter;

        const hasBreakdown = (indicator.id === 'imacec' && imacecDetailSeries)
            || (indicator.id === 'ipc' && ipcCombinedData.length)
            || (indicator.id === 'dolar' && (fxHasData || tcrChartData.length))
            || (indicator.id === 'cobre' && cobrePairData.length);

        return (
            <div className="detail">
                <div className="detail-sticky">
                    <header className="detail-header">
                        <div className="detail-heading">
                            <h2 className="detail-title">{indicator.title}</h2>
                            <p className="detail-subtitle">
                                {displaySubtitle}
                                {indicator.period ? <span> · Último dato: {indicator.period}</span> : null}
                            </p>
                        </div>
                        <div className="detail-header-actions">
                            <IconButton icon={Download} label="Descargar CSV" showLabel onClick={handleDownloadCsv} />
                            {onClose ? <IconButton icon={X} label="Cerrar" onClick={onClose} /> : null}
                        </div>
                    </header>
                    <div className="detail-toolbar">
                        <Segmented ariaLabel="Período" options={MODAL_RANGE_OPTIONS} value={timeRange} onChange={setTimeRange} />
                        {isYoYEligible ? (
                            <Segmented
                                ariaLabel="Unidad"
                                options={UNIT_OPTIONS}
                                value={showYoY ? 'yoy' : 'level'}
                                onChange={(id) => setShowYoY(id === 'yoy')}
                            />
                        ) : null}
                        <span className="detail-toolbar-spacer" />
                        <Segmented ariaLabel="Vista" options={VIEW_OPTIONS} value={mainView} onChange={setMainView} />
                    </div>
                    {timeRange === 'custom' ? renderCustomRange() : null}
                </div>

                <section className="detail-main">
                    <div className="detail-hero">
                        <div className="detail-hero-value">
                            <span className="detail-value">{displayValue}</span>
                            {showVariation ? (
                                <span className={`detail-variation is-${indicator.trend || 'neutral'}`}>{indicator.variation}</span>
                            ) : null}
                        </div>
                        {mainStats ? (
                            <StatStrip
                                items={[
                                    { label: 'Máximo', value: formatTooltipValue(mainStats.max.value), hint: formatShortDate(mainStats.max.date, mainIsDaily) },
                                    { label: 'Mínimo', value: formatTooltipValue(mainStats.min.value), hint: formatShortDate(mainStats.min.date, mainIsDaily) },
                                    { label: 'Promedio', value: formatTooltipValue(mainStats.average), hint: 'línea punteada' },
                                    mainChange ? { label: 'Cambio', value: mainChange.text, hint: periodLabel } : null
                                ]}
                            />
                        ) : null}
                    </div>
                    <div className="detail-main-chart">
                        {mainTable ? (
                            <DataTable columns={mainTable.columns} rows={mainTable.rows} maxHeight={320} />
                        ) : (
                            <TrendChart
                                data={displayChartData}
                                color="var(--chart-neon)"
                                height={300}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                axisFormatter={mainAxisFormatter}
                                theme={theme}
                                detailed
                            />
                        )}
                    </div>
                </section>

                {hasBreakdown ? (
                    <section className="detail-section">
                        <div className="detail-section-heading">
                            <h3 className="detail-section-title">Desglose</h3>
                            <span className="detail-section-note">Mismo período y unidad que el gráfico principal</span>
                        </div>
                        <div className="detail-grid">
                            {indicator.id === 'imacec' && imacecDetailSeries ? (
                                <>
                                    <DetailPanel
                                        wide
                                        title="Producción de bienes"
                                        subtitle={subUnitLabel}
                                        latest={goodsIsSingle ? panelLatest(imacecGoodsChart.data, subFormatter) : null}
                                        change={goodsIsSingle ? panelChange(imacecGoodsChart.data) : null}
                                        legend={(
                                            <Legend
                                                items={IMACEC_GOODS_OPTIONS.map((option) => ({
                                                    id: option.id,
                                                    label: option.label,
                                                    color: imacecGoodsSeriesMap?.[option.id]?.color
                                                }))}
                                                activeKeys={goodsSelected}
                                                onToggle={toggleImacecSelection}
                                            />
                                        )}
                                        table={() => (goodsIsSingle
                                            ? buildSingleTable(imacecGoodsChart.data, goodsSingleDef?.label, subFormatter)
                                            : buildMultiTable(imacecGoodsChart.data, goodsSeries, subFormatter))}
                                        onDownload={() => downloadCsv(
                                            buildCsv(imacecGoodsChart.data, goodsDefs),
                                            `imacec-bienes${fileSuffix}.csv`
                                        )}
                                    >
                                        <TrendChart
                                            data={imacecGoodsChart.data}
                                            color={goodsSingleDef?.color || '#38bdf8'}
                                            height={220}
                                            averageFormatter={formatAverage}
                                            valueFormatter={subFormatter}
                                            axisFormatter={subAxisFormatter}
                                            theme={theme}
                                            series={goodsSeries.length ? goodsSeries : undefined}
                                            showAverage={goodsIsSingle}
                                            detailed
                                        />
                                    </DetailPanel>
                                    <DetailPanel
                                        title="Comercio y servicios"
                                        subtitle={subUnitLabel}
                                        legend={<Legend items={commerceDefs.map((def) => ({ id: def.key, ...def }))} />}
                                        table={() => buildMultiTable(imacecCommerceServicesData, commerceDefs, subFormatter)}
                                        onDownload={() => downloadCsv(
                                            buildCsv(imacecCommerceServicesData, commerceDefs),
                                            `imacec-comercio-servicios${fileSuffix}.csv`
                                        )}
                                    >
                                        <TrendChart
                                            data={imacecCommerceServicesData}
                                            height={190}
                                            valueFormatter={subFormatter}
                                            axisFormatter={subAxisFormatter}
                                            theme={theme}
                                            series={commerceDefs}
                                            showAverage={false}
                                            detailed
                                        />
                                    </DetailPanel>
                                    <DetailPanel
                                        title="IMACEC no minero"
                                        subtitle={subUnitLabel}
                                        latest={panelLatest(imacecDetailSeries.noMinero, subFormatter)}
                                        change={panelChange(imacecDetailSeries.noMinero)}
                                        table={() => buildSingleTable(imacecDetailSeries.noMinero, 'IMACEC no minero', subFormatter)}
                                        onDownload={() => downloadCsv(
                                            buildCsv(imacecDetailSeries.noMinero, [{ key: 'value' }]),
                                            `imacec-no-minero${fileSuffix}.csv`
                                        )}
                                    >
                                        <TrendChart
                                            data={imacecDetailSeries.noMinero}
                                            color="#f97316"
                                            height={190}
                                            averageFormatter={formatAverage}
                                            valueFormatter={subFormatter}
                                            axisFormatter={subAxisFormatter}
                                            theme={theme}
                                            detailed
                                        />
                                    </DetailPanel>
                                </>
                            ) : null}

                            {indicator.id === 'ipc' && ipcCombinedData.length ? (
                                <DetailPanel
                                    wide
                                    title="General, subyacente y volátiles"
                                    subtitle="Var. % en 12 meses · la línea gris marca la meta de 3% del Banco Central"
                                    legend={<Legend items={ipcDefs.map((def) => ({ id: def.key, ...def }))} />}
                                    table={() => buildMultiTable(ipcCombinedData, ipcDefs, percentFormatter)}
                                    onDownload={() => downloadCsv(buildCsv(ipcCombinedData, ipcDefs), 'ipc-componentes.csv')}
                                >
                                    <TrendChart
                                        data={ipcCombinedData}
                                        height={260}
                                        valueFormatter={percentFormatter}
                                        axisFormatter={makeAxisFormatter({ suffix: '%' })}
                                        theme={theme}
                                        series={ipcDefs}
                                        showAverage={false}
                                        referenceLines={[{ y: 3, label: 'Meta 3%' }]}
                                        detailed
                                    />
                                </DetailPanel>
                            ) : null}

                            {indicator.id === 'cobre' && cobrePairData.length ? (
                                <>
                                    <DetailPanel
                                        wide
                                        title="Cobre y dólar"
                                        subtitle={yoyEnabled
                                            ? 'Var. % en 12 meses de cada serie'
                                            : 'Índice: inicio del período = 100 · cuando el cobre sube, el dólar suele bajar (el peso se aprecia)'}
                                        legend={<Legend items={cobrePairDefs.map((def) => ({ id: def.key, ...def }))} />}
                                        table={() => buildMultiTable(cobrePairData, cobrePairDefs, pairFormatter)}
                                        onDownload={() => downloadCsv(
                                            buildCsv(cobrePairData, cobrePairDefs),
                                            `cobre-dolar${yoyEnabled ? '-var12m' : '-base100'}.csv`
                                        )}
                                    >
                                        <TrendChart
                                            data={cobrePairData}
                                            height={240}
                                            valueFormatter={pairFormatter}
                                            axisFormatter={makeAxisFormatter(yoyEnabled ? { suffix: '%' } : {})}
                                            theme={theme}
                                            series={cobrePairDefs}
                                            showAverage={false}
                                            referenceLines={yoyEnabled ? [{ y: 0, label: '' }] : [{ y: 100, label: 'Inicio' }]}
                                            detailed
                                        />
                                    </DetailPanel>
                                    {cobreCorrData.length ? (
                                        <DetailPanel
                                            wide
                                            title="Correlación móvil cobre–dólar"
                                            subtitle="Variaciones semanales · −1: se mueven siempre en sentido opuesto, 0: sin relación"
                                            info="Correlación de Pearson entre las variaciones semanales del precio del cobre y del dólar observado. Se usan variaciones (no niveles) para no confundir tendencias comunes con relación."
                                            latest={cobrePeriodCorr !== null ? corrFormatter(cobrePeriodCorr) : null}
                                            change={cobrePeriodCorr !== null ? { text: `correlación ${periodLabel}`, direction: 'flat' } : null}
                                            legend={<Legend items={corrDefs.map((def) => ({ id: def.key, ...def }))} />}
                                            table={() => buildMultiTable(cobreCorrData, corrDefs, corrFormatter)}
                                            onDownload={() => downloadCsv(buildCsv(cobreCorrData, corrDefs, 3), 'correlacion-cobre-dolar.csv')}
                                        >
                                            <TrendChart
                                                data={cobreCorrData}
                                                height={200}
                                                valueFormatter={corrFormatter}
                                                axisFormatter={(value, decimals) => formatNumber(value, Math.max(decimals, 1))}
                                                theme={theme}
                                                series={corrDefs}
                                                showAverage={false}
                                                referenceLines={[{ y: 0, label: '' }]}
                                                detailed
                                            />
                                        </DetailPanel>
                                    ) : null}
                                </>
                            ) : null}

                            {indicator.id === 'dolar' && fxHasData ? fxPanels.map((panel) => {
                                const series = fxDetailSeries[panel.key] || [];
                                if (!series.length) return null;
                                return (
                                    <DetailPanel
                                        key={panel.key}
                                        title={`${panel.title} (${panel.code})`}
                                        subtitle={yoyEnabled ? 'Var. % en 12 meses' : `Pesos por ${panel.code}`}
                                        latest={panelLatest(series, fxFormatter)}
                                        change={panelChange(series)}
                                        table={() => buildSingleTable(series, `${panel.code}/CLP`, fxFormatter)}
                                        onDownload={() => downloadCsv(
                                            buildCsv(series, [{ key: 'value' }], 2),
                                            `${panel.key}-clp${fileSuffix}.csv`
                                        )}
                                    >
                                        <TrendChart
                                            data={series}
                                            color={panel.color}
                                            height={170}
                                            averageFormatter={fxFormatter}
                                            valueFormatter={fxFormatter}
                                            axisFormatter={fxAxisFormatter}
                                            theme={theme}
                                            detailed
                                        />
                                    </DetailPanel>
                                );
                            }) : null}

                            {indicator.id === 'dolar' && tcrChartData.length ? (
                                <DetailPanel
                                    wide
                                    title="Tipo de cambio real"
                                    subtitle={yoyEnabled ? 'Var. % en 12 meses' : 'Índice promedio 1986=100'}
                                    info="Mide la competitividad cambiaria ajustando por inflación. Un valor más alto indica un tipo de cambio real más depreciado."
                                    legend={<Legend items={tcrDefs.map((def) => ({ id: def.key, ...def }))} />}
                                    table={() => buildMultiTable(tcrChartData, tcrDefs, subFormatter)}
                                    onDownload={() => downloadCsv(buildCsv(tcrChartData, tcrDefs), `tcr${fileSuffix}.csv`)}
                                >
                                    <TrendChart
                                        data={tcrChartData}
                                        height={220}
                                        valueFormatter={subFormatter}
                                        axisFormatter={subAxisFormatter}
                                        theme={theme}
                                        series={tcrDefs}
                                        showAverage={false}
                                        detailed
                                    />
                                </DetailPanel>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                <footer className="detail-footer">
                    Fuente: Banco Central de Chile. La línea punteada marca el promedio del período mostrado.
                </footer>
            </div>
        );
    }

    return (
        <div
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            style={{
                background: 'var(--bg-card)',
                padding: isFeatured ? '1.25rem' : '0.85rem',
                paddingBottom: isFeatured ? '2rem' : '1.7rem',
                borderRadius: isFeatured ? '14px' : '10px',
                boxShadow: 'var(--shadow-md)',
                cursor: isInteractive ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isFeatured ? 'flex-start' : 'space-between',
                gap: isFeatured ? '0.85rem' : undefined,
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                outline: isInteractive ? '2px solid transparent' : 'none',
                outlineOffset: '2px',
                transition: 'transform 0.2s, box-shadow 0.2s, outline-color 0.2s'
            }}
            onMouseEnter={(e) => {
                if (!isInteractive) return;
                e.currentTarget.style.outlineColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
                if (!isInteractive) return;
                e.currentTarget.style.outlineColor = 'transparent';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div>
                    <span style={{ fontSize: isFeatured ? '1.05rem' : '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{indicator.title}</span>
                    {displaySubtitle ? (
                        <div style={{ fontSize: isFeatured ? '0.78rem' : '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            ({displaySubtitle})
                        </div>
                    ) : null}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {RANGE_OPTIONS.map((option) => {
                        const isActive = timeRange === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setTimeRange(option.id);
                                }}
                                aria-pressed={isActive}
                            style={{
                                fontSize: isFeatured ? '0.65rem' : '0.6rem',
                                padding: isFeatured ? '0.25rem 0.5rem' : '0.2rem 0.4rem',
                                borderRadius: '999px',
                                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                                background: isActive ? 'var(--bg-hover)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: isActive ? 700 : 500,
                                boxShadow: isActive ? '0 0 0 1px rgba(14, 165, 233, 0.18)' : 'none'
                            }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Value */}
            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: isFeatured ? '2.1rem' : '1.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>{displayValue}</span>
                    {showVariation ? (
                        <span style={{
                            fontSize: indicator.id === 'imacec'
                                ? (isFeatured ? '0.82rem' : '0.8rem')
                                : (isFeatured ? '1.05rem' : '0.95rem'),
                            fontWeight: 600,
                            color: indicator.trend === 'up'
                                ? 'var(--trend-up)'
                                : indicator.trend === 'down'
                                    ? 'var(--trend-down)'
                                    : 'var(--text-secondary)'
                        }}>
                            ({indicator.variation})
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Sparkline Chart */}
            <div style={{ position: 'relative' }}>
                <TrendChart
                    data={displayChartData}
                    color="var(--chart-neon)"
                    height={chartHeight}
                    averageFormatter={formatAverage}
                    valueFormatter={formatTooltipValue}
                    theme={theme}
                />
                {chartStartDate ? (
                    <span style={{
                        position: 'absolute',
                        left: '0.85rem',
                        bottom: '0.35rem',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)'
                    }}>
                        {chartStartDate}
                    </span>
                ) : null}
                {indicator.period ? (
                    <span style={{
                        position: 'absolute',
                        right: '0.85rem',
                        bottom: '0.35rem',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)'
                    }}>
                        {indicator.period}
                    </span>
                ) : null}
            </div>
        </div>
    );
};

export default React.memo(MacroCard);
