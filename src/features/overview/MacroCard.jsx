import React, { useEffect, useMemo, useRef, useState } from 'react';
import TrendChart from '../../shared/components/TrendChart';
import { getChartData, getFxDetailSeries, getImacecDetailSeries, getIpcDetailSeries, getTcrDetailSeries } from '../../data/bcch/api';
import { formatNumber } from '../../shared/utils/format';
import DataTableModal from '../../shared/components/DataTableModal';

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
    { id: 'custom', label: 'Otro' }
];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const YOY_ELIGIBLE = new Set(['imacec', 'cobre', 'dolar']);
const IMACEC_GOODS_OPTIONS = [
    { id: 'total', label: 'Total' },
    { id: 'mineria', label: 'Mineria' },
    { id: 'industria', label: 'Industria' },
    { id: 'resto', label: 'Resto de bienes' }
];

const MacroCard = ({ indicator, theme, onOpen, variant = 'compact' }) => {
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState(DEFAULT_RANGE_BY_INDICATOR[indicator.id] || '1y');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [rangeStep, setRangeStep] = useState({ start: 'year', end: 'year' });
    const [showDataTable, setShowDataTable] = useState(false);
    const [showDetailTable, setShowDetailTable] = useState(false);
    const [showYoY, setShowYoY] = useState(false);
    const [ipcDetailData, setIpcDetailData] = useState(null);
    const [imacecDetailData, setImacecDetailData] = useState(null);
    const [fxDetailData, setFxDetailData] = useState(null);
    const [tcrDetailData, setTcrDetailData] = useState(null);
    const [imacecGoodsSelection, setImacecGoodsSelection] = useState(['total']);
    const [imacecDetailTable, setImacecDetailTable] = useState(null);
    const [imacecGoodsDropdownOpen, setImacecGoodsDropdownOpen] = useState(false);
    const customRangeRef = useRef(null);
    const imacecGoodsRef = useRef(null);
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
    const buildActionButtonStyle = (isActive) => ({
        fontSize: '0.6rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        background: isActive ? 'var(--bg-hover)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: 700
    });
    const buildImacecSelectionLabel = () => {
        if (imacecGoodsSelection.includes('total')) return 'Total';
        if (!imacecGoodsSelection.length) return 'Total';
        const labels = IMACEC_GOODS_OPTIONS
            .filter((option) => imacecGoodsSelection.includes(option.id))
            .map((option) => option.label);
        if (!labels.length) return 'Total';
        if (labels.length === 1) return labels[0];
        if (labels.length === 2) return `${labels[0]} + ${labels[1]}`;
        return `${labels[0]} + ${labels.length - 1} mas`;
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
        setShowDataTable(false);
        setShowDetailTable(false);
        setShowYoY(false);
        setImacecGoodsSelection(['total']);
        setImacecDetailTable(null);
        setImacecGoodsDropdownOpen(false);
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

        if (!filteredChartData.length) return null;
        const core = filteredChartData.map((entry, index) => {
            const base = Number(entry.value);
            const mod = Math.sin(index / 6) * 0.15;
            const value = Number.isNaN(base) ? null : Number((base * 0.6 + mod).toFixed(1));
            return { ...entry, value };
        });
        const volatile = filteredChartData.map((entry, index) => {
            const base = Number(entry.value);
            const mod = Math.cos(index / 5) * 0.12;
            const value = Number.isNaN(base) ? null : Number((base * 0.4 + mod).toFixed(1));
            return { ...entry, value };
        });
        return { core, volatile };
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
            total: { key: 'bienes', label: 'Produccion de bienes', color: '#38bdf8', series: imacecDetailSeries.bienes },
            mineria: { key: 'mineria', label: 'Mineria', color: '#0ea5e9', series: imacecDetailSeries.mineria },
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
    const imacecGoodsTableData = useMemo(() => {
        if (!imacecDetailSeries || !imacecGoodsSeriesMap) return null;
        const selection = imacecGoodsSelection.length ? imacecGoodsSelection : ['total'];
        const selectedSeries = selection
            .map((id) => imacecGoodsSeriesMap[id])
            .filter(Boolean);

        if (!selectedSeries.length) return null;
        if (selectedSeries.length === 1) {
            const base = selectedSeries[0];
            const rows = (base.series || []).map((entry, index) => ({
                id: `imacec-bienes-${base.key}-${entry.date || entry.name || index}`,
                date: formatStartDate(entry.date || entry.name),
                value: entry.value !== undefined ? formatNumber(entry.value, 1) : ''
            }));
            const csvRows = (base.series || []).map((entry) => {
                const dateValue = entry.date || entry.name || '';
                const value = entry.value !== undefined ? formatNumber(entry.value, 1) : '';
                return `${dateValue};${value}`;
            });
            return {
                title: `IMACEC - ${base.label}${yoyEnabled ? ' (Var. 12m)' : ''}`,
                filename: `imacec-${base.key}${yoyEnabled ? '-yoy' : ''}.csv`,
                columns: [
                    { key: 'date', label: 'Fecha' },
                    { key: 'value', label: base.label, align: 'right', emphasis: true }
                ],
                rows,
                csv: ['fecha;valor', ...csvRows].join('\n')
            };
        }

        const data = mergeSeriesByDate(
            selectedSeries.reduce((acc, entry) => {
                acc[entry.key] = entry.series;
                return acc;
            }, {})
        );
        const rows = data.map((entry, index) => {
            const row = { id: `imacec-bienes-${entry.date || index}`, date: formatStartDate(entry.date) };
            selectedSeries.forEach((series) => {
                row[series.key] = entry[series.key] !== undefined ? formatNumber(entry[series.key], 1) : '';
            });
            return row;
        });
        const csvRows = data.map((entry) => {
            const values = selectedSeries.map((series) => (
                entry[series.key] !== undefined ? formatNumber(entry[series.key], 1) : ''
            ));
            return `${entry.date || ''};${values.join(';')}`;
        });
        return {
            title: `IMACEC - Produccion de bienes (seleccion)${yoyEnabled ? ' (Var. 12m)' : ''}`,
            filename: `imacec-produccion-bienes-seleccion${yoyEnabled ? '-yoy' : ''}.csv`,
            columns: [
                { key: 'date', label: 'Fecha' },
                ...selectedSeries.map((series, index) => ({
                    key: series.key,
                    label: series.label,
                    align: 'right',
                    emphasis: index === 0
                }))
            ],
            rows,
            csv: [`fecha;${selectedSeries.map((series) => series.key).join(';')}`, ...csvRows].join('\n')
        };
    }, [imacecDetailSeries, imacecGoodsSeriesMap, imacecGoodsSelection]);
    const imacecCommerceTableData = useMemo(() => {
        if (!imacecDetailSeries) return null;
        const rows = imacecCommerceServicesData.map((entry, index) => ({
            id: `imacec-com-serv-${entry.date || index}`,
            date: formatStartDate(entry.date),
            comercio: entry.comercio !== undefined ? formatNumber(entry.comercio, 1) : '',
            servicios: entry.servicios !== undefined ? formatNumber(entry.servicios, 1) : ''
        }));
        const csvRows = imacecCommerceServicesData.map((entry) => {
            const dateValue = entry.date || '';
            const comercio = entry.comercio !== undefined ? formatNumber(entry.comercio, 1) : '';
            const servicios = entry.servicios !== undefined ? formatNumber(entry.servicios, 1) : '';
            return `${dateValue};${comercio};${servicios}`;
        });
        return {
            title: `IMACEC - Comercio y servicios${yoyEnabled ? ' (Var. 12m)' : ''}`,
            filename: `imacec-comercio-servicios${yoyEnabled ? '-yoy' : ''}.csv`,
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'comercio', label: 'Comercio', align: 'right', emphasis: true },
                { key: 'servicios', label: 'Servicios', align: 'right' }
            ],
            rows,
            csv: ['fecha;comercio;servicios', ...csvRows].join('\n')
        };
    }, [imacecDetailSeries, imacecCommerceServicesData]);
    const imacecNoMineroTableData = useMemo(() => {
        if (!imacecDetailSeries) return null;
        const rows = imacecDetailSeries.noMinero.map((entry, index) => ({
            id: `imacec-no-minero-${entry.date || entry.name || index}`,
            date: formatStartDate(entry.date || entry.name),
            value: entry.value !== undefined ? formatNumber(entry.value, 1) : ''
        }));
        const csvRows = imacecDetailSeries.noMinero.map((entry) => {
            const dateValue = entry.date || entry.name || '';
            const value = entry.value !== undefined ? formatNumber(entry.value, 1) : '';
            return `${dateValue};${value}`;
        });
        return {
            title: `IMACEC no minero${yoyEnabled ? ' (Var. 12m)' : ''}`,
            filename: `imacec-no-minero${yoyEnabled ? '-yoy' : ''}.csv`,
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'value', label: 'IMACEC no minero', align: 'right', emphasis: true }
            ],
            rows,
            csv: ['fecha;imacec_no_minero', ...csvRows].join('\n')
        };
    }, [imacecDetailSeries]);
    const activeImacecTable = useMemo(() => {
        if (!imacecDetailTable) return null;
        if (imacecDetailTable === 'bienes') return imacecGoodsTableData;
        if (imacecDetailTable === 'comercio') return imacecCommerceTableData;
        if (imacecDetailTable === 'no-minero') return imacecNoMineroTableData;
        return null;
    }, [imacecDetailTable, imacecGoodsTableData, imacecCommerceTableData, imacecNoMineroTableData]);
    const fxTableData = useMemo(() => {
        if (indicator.id !== 'dolar') return null;

        const dateMap = new Map();
        const addSeries = (series, key) => {
            (series || []).forEach((entry) => {
                const dateKey = entry?.date || entry?.name || '';
                if (!dateKey) return;
                const current = dateMap.get(dateKey) || { id: dateKey, date: dateKey };
                current[key] = entry.value;
                dateMap.set(dateKey, current);
            });
        };

        addSeries(displayChartData, 'usd');
        if (fxDetailSeries) {
            addSeries(fxDetailSeries.cny, 'cny');
            addSeries(fxDetailSeries.eur, 'eur');
            addSeries(fxDetailSeries.ars, 'ars');
            addSeries(fxDetailSeries.jpy, 'jpy');
        }

        const formatFxValue = (value, digits = 2) => {
            if (value === undefined || value === null) return '';
            if (yoyEnabled) {
                return `${formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
            }
            return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
        };

        const rows = Array.from(dateMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map((row) => ({
                id: row.id,
                date: formatStartDate(row.date),
                usd: row.usd !== undefined ? (yoyEnabled ? formatFxValue(row.usd, 1) : formatTooltipValue(row.usd)) : '',
                cny: formatFxValue(row.cny),
                eur: formatFxValue(row.eur),
                ars: formatFxValue(row.ars),
                jpy: formatFxValue(row.jpy)
            }));

        return {
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'usd', label: 'USD/CLP', align: 'right', emphasis: true },
                { key: 'cny', label: 'CNY/CLP', align: 'right' },
                { key: 'eur', label: 'EUR/CLP', align: 'right' },
                { key: 'ars', label: 'ARS/CLP', align: 'right' },
                { key: 'jpy', label: 'JPY/CLP', align: 'right' }
            ],
            rows
        };
    }, [indicator.id, displayChartData, fxDetailSeries, formatStartDate, formatTooltipValue, yoyEnabled]);
    const buildSeriesStartLabel = (series) => formatStartDate(series?.[0]?.date || series?.[0]?.name);
    const displayValue = useMemo(() => {
        if (!yoyEnabled) return indicator.value;
        const latest = displayChartData[displayChartData.length - 1];
        if (!latest || latest.value === null || latest.value === undefined) return '--';
        return `${formatNumber(latest.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    }, [yoyEnabled, displayChartData, indicator.value]);
    const displaySubtitle = yoyEnabled ? 'Var. % en 12 meses' : indicator.subtitle;
    const showVariation = indicator.variation && !yoyEnabled;
    const detailCsvContent = useMemo(() => {
        if (!ipcDetailSeries) return '';
        const header = 'fecha;ipc_subyacente;ipc_volatil';
        const rows = ipcDetailSeries.core.map((entry, index) => {
            const dateValue = entry.date || entry.name || '';
            const coreVal = ipcDetailSeries.core[index]?.value;
            const volatileVal = ipcDetailSeries.volatile[index]?.value;
            return `${dateValue};${formatNumber(coreVal, 1)};${formatNumber(volatileVal, 1)}`;
        });
        return [header, ...rows].join('\n');
    }, [ipcDetailSeries]);
    const handleDownloadDetailCsv = () => {
        downloadCsv(detailCsvContent, 'ipc-detalle-datos.csv');
    };
    const ipcTopComponents = useMemo(() => {
        if (indicator.id !== 'ipc') return [];
        return [
            { name: 'Alimentos', change: 1.2, weight: 0.28 },
            { name: 'Vivienda y servicios', change: 0.9, weight: 0.22 },
            { name: 'Transporte', change: 0.7, weight: 0.14 },
            { name: 'Salud', change: 0.6, weight: 0.09 },
            { name: 'Educacion', change: 0.5, weight: 0.06 }
        ];
    }, [indicator.id]);
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
            if (imacecGoodsRef.current && !imacecGoodsRef.current.contains(event.target)) {
                setImacecGoodsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            style={{
                background: 'var(--bg-card)',
                padding: isModal ? '1.2rem' : isFeatured ? '1.25rem' : '0.85rem',
                paddingBottom: isModal ? '2.2rem' : isFeatured ? '2rem' : '1.7rem',
                borderRadius: isModal ? '12px' : isFeatured ? '14px' : '10px',
boxShadow: isModal ? 'none' : 'var(--shadow-md)',
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
                e.currentTarget.style.boxShadow = isModal ? 'none' : 'var(--shadow-md)';
            }}
        >
            {isModal && isYoYEligible ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setShowYoY((prev) => !prev);
                    }}
                    style={{
                        position: 'absolute',
                        top: '-1.7rem',
                        left: '-0.3rem',
                        fontSize: '0.75rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '999px',
                        border: `1px solid ${showYoY ? 'var(--accent)' : 'var(--border)'}`,
                        background: showYoY ? 'var(--bg-hover)' : 'var(--bg-card)',
                        color: showYoY ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        boxShadow: 'var(--shadow-sm)',
                        zIndex: 3
                    }}
                >
                    Variacion 12 meses
                </button>
            ) : null}
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
                    {(isModal ? MODAL_RANGE_OPTIONS : RANGE_OPTIONS).map((option) => {
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
                    {isModal ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setShowDataTable(true);
                            }}
                            style={{
                                fontSize: '0.6rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px',
                                border: `1px solid ${showDataTable ? 'var(--accent)' : 'var(--border)'}`,
                                background: showDataTable ? 'var(--bg-hover)' : 'transparent',
                                color: showDataTable ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 700
                            }}
                        >
                            Datos
                        </button>
                    ) : null}
                </div>
            </div>

            {isModal && timeRange === 'custom' ? (
                <div ref={customRangeRef} style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.45rem', position: 'relative' }}>
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
            ) : null}

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
            {isModal && indicator.id === 'imacec' && imacecDetailSeries ? (
                <div style={{ marginTop: '1.2rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Produccion de bienes</span>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{yoyEnabled ? 'Var. % en 12 meses' : 'Indice 2018=100'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div ref={imacecGoodsRef} style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setImacecGoodsDropdownOpen((prev) => !prev);
                                        }}
                                        className="period-select"
                                        style={{ minWidth: '170px', textAlign: 'left', fontSize: '0.65rem' }}
                                    >
                                        {buildImacecSelectionLabel()}
                                    </button>
                                    {imacecGoodsDropdownOpen ? (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 6px)',
                                                right: 0,
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '12px',
                                                boxShadow: 'var(--shadow-md)',
                                                padding: '0.6rem',
                                                width: '220px',
                                                zIndex: 6
                                            }}
                                        >
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.45rem' }}>
                                                Series (seleccion multiple)
                                            </div>
                                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                {IMACEC_GOODS_OPTIONS.map((option) => {
                                                    const totalActive = imacecGoodsSelection.includes('total');
                                                    const isChecked = totalActive || imacecGoodsSelection.includes(option.id);
                                                    const isMuted = totalActive && option.id !== 'total';
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                toggleImacecSelection(option.id);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                padding: '0.35rem 0.4rem',
                                                                borderRadius: '8px',
                                                                border: '1px solid transparent',
                                                                background: isChecked ? 'var(--bg-hover)' : 'transparent',
                                                                color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                                fontSize: '0.7rem',
                                                                cursor: 'pointer',
                                                                textAlign: 'left',
                                                                opacity: isMuted ? 0.6 : 1
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: '14px',
                                                                    height: '14px',
                                                                    borderRadius: '4px',
                                                                    border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`,
                                                                    background: isChecked ? 'var(--accent)' : 'transparent',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.65rem',
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                {isChecked ? '✓' : ''}
                                                            </span>
                                                            <span>{option.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                <span style={{ width: '1px', height: '16px', background: 'var(--border)', display: 'inline-flex' }}></span>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setImacecDetailTable('bienes');
                                    }}
                                    style={buildActionButtonStyle(imacecDetailTable === 'bienes')}
                                >
                                    Datos
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        downloadCsv(imacecGoodsTableData?.csv, imacecGoodsTableData?.filename);
                                    }}
                                    style={buildActionButtonStyle(false)}
                                >
                                    Descargar CSV
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            {imacecGoodsChart.series.length ? (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                                    {imacecGoodsChart.series.map((series) => (
                                        <span
                                            key={series.key}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}
                                        >
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: series.color }}></span>
                                            {series.label}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                            <TrendChart
                                data={imacecGoodsChart.data}
                                color="#38bdf8"
                                height={170}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                                series={imacecGoodsChart.series.length ? imacecGoodsChart.series : undefined}
                            />
                            {buildSeriesStartLabel(imacecGoodsChart.data) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(imacecGoodsChart.data)}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Comercio y servicios</span>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{yoyEnabled ? 'Var. % en 12 meses' : 'Indice 2018=100'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setImacecDetailTable('comercio');
                                    }}
                                    style={buildActionButtonStyle(imacecDetailTable === 'comercio')}
                                >
                                    Datos
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        downloadCsv(imacecCommerceTableData?.csv, imacecCommerceTableData?.filename);
                                    }}
                                    style={buildActionButtonStyle(false)}
                                >
                                    Descargar CSV
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></span>
                                    Comercio
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa' }}></span>
                                    Servicios
                                </span>
                            </div>
                            <TrendChart
                                data={imacecCommerceServicesData}
                                height={170}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                                series={[
                                    { key: 'comercio', color: '#22c55e', label: 'Comercio', fill: true, fillOpacity: 0.22 },
                                    { key: 'servicios', color: '#60a5fa', label: 'Servicios', fill: true, fillOpacity: 0.2 }
                                ]}
                            />
                            {buildSeriesStartLabel(imacecCommerceServicesData) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(imacecCommerceServicesData)}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>IMACEC no minero</span>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{yoyEnabled ? 'Var. % en 12 meses' : 'Indice 2018=100'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setImacecDetailTable('no-minero');
                                    }}
                                    style={buildActionButtonStyle(imacecDetailTable === 'no-minero')}
                                >
                                    Datos
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        downloadCsv(imacecNoMineroTableData?.csv, imacecNoMineroTableData?.filename);
                                    }}
                                    style={buildActionButtonStyle(false)}
                                >
                                    Descargar CSV
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <TrendChart
                                data={imacecDetailSeries.noMinero}
                                color="#f97316"
                                height={170}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(imacecDetailSeries.noMinero) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(imacecDetailSeries.noMinero)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
            {isModal && indicator.id === 'ipc' && ipcDetailSeries ? (
                <div style={{ marginTop: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Detalle IPC</span>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Subyacente vs volatiles</span>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setShowDetailTable(true);
                                }}
                                style={{
                                    fontSize: '0.6rem',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '999px',
                                    border: `1px solid ${showDetailTable ? 'var(--accent)' : 'var(--border)'}`,
                                    background: showDetailTable ? 'var(--bg-hover)' : 'transparent',
                                    color: showDetailTable ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                }}
                            >
                                Datos
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subyacente (Core)</span>
                            <TrendChart
                                data={ipcDetailSeries.core}
                                color="var(--trend-up)"
                                height={160}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(ipcDetailSeries.core) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(ipcDetailSeries.core)}
                                </span>
                            ) : null}
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Volatiles</span>
                            <TrendChart
                                data={ipcDetailSeries.volatile}
                                color="var(--trend-down)"
                                height={160}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(ipcDetailSeries.volatile) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(ipcDetailSeries.volatile)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Componentes con mayor alza (mock)</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Top 5 contribuciones</span>
                        </div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', padding: '0.45rem 0.7rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)' }}>
                                <span>Componente</span>
                                <span style={{ textAlign: 'right' }}>Variacion</span>
                                <span style={{ textAlign: 'right' }}>Peso</span>
                            </div>
                            {ipcTopComponents.map((item) => (
                                <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr', padding: '0.4rem 0.7rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                    <span>{item.name}</span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {formatNumber(item.change, 1)}pp
                                    </span>
                                    <span style={{ textAlign: 'right' }}>{formatNumber(item.weight * 100, 1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
            {isModal && indicator.id === 'dolar' && fxHasData ? (
                <div style={{ marginTop: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Detalle tipo de cambio</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>CLP vs monedas</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Yuan chino (CNY)</span>
                            <TrendChart
                                data={fxDetailSeries.cny}
                                color="#22d3ee"
                                height={150}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(fxDetailSeries.cny) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(fxDetailSeries.cny)}
                                </span>
                            ) : null}
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Euro (EUR)</span>
                            <TrendChart
                                data={fxDetailSeries.eur}
                                color="#60a5fa"
                                height={150}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(fxDetailSeries.eur) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(fxDetailSeries.eur)}
                                </span>
                            ) : null}
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Peso argentino (ARS)</span>
                            <TrendChart
                                data={fxDetailSeries.ars}
                                color="#f97316"
                                height={150}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(fxDetailSeries.ars) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(fxDetailSeries.ars)}
                                </span>
                            ) : null}
                        </div>
                        <div style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Yen japones (JPY)</span>
                            <TrendChart
                                data={fxDetailSeries.jpy}
                                color="#22c55e"
                                height={150}
                                averageFormatter={formatAverage}
                                valueFormatter={formatTooltipValue}
                                theme={theme}
                            />
                            {buildSeriesStartLabel(fxDetailSeries.jpy) ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    {buildSeriesStartLabel(fxDetailSeries.jpy)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
            {isModal && indicator.id === 'dolar' && tcrChartData.length ? (
                <div style={{ marginTop: '1.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tipo de Cambio Real</span>
                            <span
                                title="Indice que mide la competitividad cambiaria ajustando por inflacion. Un valor mas alto indica tipo de cambio real mas depreciado."
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: '1px solid var(--border)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    color: 'var(--text-secondary)',
                                    cursor: 'help'
                                }}
                            >
                                ?
                            </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Indice promedio 1986=100</span>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }}></span>
                                TCR
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }}></span>
                                TCR-5
                            </span>
                        </div>
                        <TrendChart
                            data={tcrChartData}
                            height={180}
                            averageFormatter={(val) => formatNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            valueFormatter={(val) => formatNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            theme={theme}
                            series={[
                                { key: 'tcr', color: '#38bdf8', label: 'TCR', fill: true, fillOpacity: 0.2 },
                                { key: 'tcr5', color: '#f97316', label: 'TCR-5', fill: true, fillOpacity: 0.26 }
                            ]}
                        />
                        {buildSeriesStartLabel(tcrDetailSeries?.tcr) ? (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                {buildSeriesStartLabel(tcrDetailSeries?.tcr)}
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {isModal && indicator.id === 'imacec' && activeImacecTable ? (
                <DataTableModal
                    title={activeImacecTable.title}
                    columns={activeImacecTable.columns}
                    rows={activeImacecTable.rows}
                    onClose={() => setImacecDetailTable(null)}
                    onDownload={() => downloadCsv(activeImacecTable.csv, activeImacecTable.filename)}
                />
            ) : null}
            {isModal && showDataTable ? (
                <DataTableModal
                    title={yoyEnabled ? 'Datos del grafico (Var. 12m)' : 'Datos del grafico'}
                    columns={fxTableData?.columns || [
                        { key: 'date', label: 'Fecha' },
                        { key: 'value', label: 'Valor', align: 'right', emphasis: true }
                    ]}
                    rows={fxTableData?.rows || displayChartData.map((entry, index) => ({
                        id: `${entry.date || entry.name}-${index}`,
                        date: formatStartDate(entry.date || entry.name),
                        value: formatTooltipValue(entry.value)
                    }))}
                    onClose={() => setShowDataTable(false)}
                    onDownload={handleDownloadCsv}
                />
            ) : null}
            {isModal && showDetailTable && ipcDetailSeries ? (
                <DataTableModal
                    title="Datos IPC subyacente/volatiles"
                    columns={[
                        { key: 'date', label: 'Fecha' },
                        { key: 'core', label: 'Subyacente (Core)', align: 'right', emphasis: true },
                        { key: 'volatile', label: 'Volatiles', align: 'right', emphasis: true }
                    ]}
                    rows={ipcDetailSeries.core.map((entry, index) => ({
                        id: `detail-${entry.date || entry.name}-${index}`,
                        date: formatStartDate(entry.date || entry.name),
                        core: formatNumber(entry.value, 1),
                        volatile: formatNumber(ipcDetailSeries.volatile[index]?.value, 1)
                    }))}
                    onClose={() => setShowDetailTable(false)}
                    onDownload={handleDownloadDetailCsv}
                />
            ) : null}
        </div>
    );
};

export default React.memo(MacroCard);
