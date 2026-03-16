import React, { useEffect, useMemo, useRef, useState } from 'react';
import TrendChart from '../../shared/components/TrendChart';
import { getChartData, getFxDetailSeries, getIpcDetailSeries, getTcrDetailSeries } from '../../data/bcch/api';
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

const MacroCard = ({ indicator, theme, onOpen, variant = 'compact' }) => {
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState(DEFAULT_RANGE_BY_INDICATOR[indicator.id] || '1y');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [rangeStep, setRangeStep] = useState({ start: 'year', end: 'year' });
    const [showDataTable, setShowDataTable] = useState(false);
    const [showDetailTable, setShowDetailTable] = useState(false);
    const [ipcDetailData, setIpcDetailData] = useState(null);
    const [fxDetailData, setFxDetailData] = useState(null);
    const [tcrDetailData, setTcrDetailData] = useState(null);
    const customRangeRef = useRef(null);

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

    const formatAverage = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        const formatted = formatNumber(value, 1);
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

    useEffect(() => {
        setTimeRange(DEFAULT_RANGE_BY_INDICATOR[indicator.id] || '1y');
        setCustomRange({ start: '', end: '' });
        setOpenDropdown(null);
        setRangeStep({ start: 'year', end: 'year' });
        setShowDataTable(false);
        setShowDetailTable(false);
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
    const chartStartDate = formatStartDate(filteredChartData[0]?.date);
    const isInteractive = typeof onOpen === 'function';
    const isModal = variant === 'modal';
    const chartHeight = isModal ? 240 : 110;
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
        if (!filteredChartData.length) return '';
        const header = 'fecha;valor';
        const rows = filteredChartData.map((entry) => {
            const dateValue = entry.date || entry.name || '';
            const value = Number(entry.value);
            const formattedValue = Number.isNaN(value) ? '' : formatNumber(value, 1);
            return `${dateValue};${formattedValue}`;
        });
        return [header, ...rows].join('\n');
    }, [filteredChartData]);
    const handleDownloadCsv = () => {
        if (!csvContent) return;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${indicator.id || 'serie'}-datos.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
    const fxDetailSeries = useMemo(() => {
        if (indicator.id !== 'dolar' || !fxDetailData) return null;

        const buildSeries = (series) => {
            const freq = getSeriesFrequency(series);
            return applyRangeWindow(series, freq);
        };

        return {
            cny: buildSeries(fxDetailData.cny || []),
            eur: buildSeries(fxDetailData.eur || []),
            ars: buildSeries(fxDetailData.ars || []),
            jpy: buildSeries(fxDetailData.jpy || [])
        };
    }, [indicator.id, fxDetailData, rangePoints, timeRange, customRange.start, customRange.end, useMonthlyRange, useDailyPicker]);
    const fxHasData = Boolean(
        fxDetailSeries
        && (fxDetailSeries.cny.length || fxDetailSeries.eur.length || fxDetailSeries.ars.length || fxDetailSeries.jpy.length)
    );
    const tcrDetailSeries = useMemo(() => {
        if (indicator.id !== 'dolar' || !tcrDetailData) return null;

        const buildSeries = (series) => {
            const freq = getSeriesFrequency(series);
            return applyRangeWindow(series, freq);
        };

        return {
            tcr: buildSeries(tcrDetailData.tcr || []),
            tcr5: buildSeries(tcrDetailData.tcr5 || [])
        };
    }, [indicator.id, tcrDetailData, timeRange, customRange.start, customRange.end, useMonthlyRange, useDailyPicker]);
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

        addSeries(filteredChartData, 'usd');
        if (fxDetailSeries) {
            addSeries(fxDetailSeries.cny, 'cny');
            addSeries(fxDetailSeries.eur, 'eur');
            addSeries(fxDetailSeries.ars, 'ars');
            addSeries(fxDetailSeries.jpy, 'jpy');
        }

        const rows = Array.from(dateMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map((row) => ({
                id: row.id,
                date: formatStartDate(row.date),
                usd: row.usd !== undefined ? formatTooltipValue(row.usd) : '',
                cny: row.cny !== undefined ? formatNumber(row.cny, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                eur: row.eur !== undefined ? formatNumber(row.eur, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                ars: row.ars !== undefined ? formatNumber(row.ars, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                jpy: row.jpy !== undefined ? formatNumber(row.jpy, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
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
    }, [indicator.id, filteredChartData, fxDetailSeries, formatStartDate, formatTooltipValue]);
    const buildSeriesStartLabel = (series) => formatStartDate(series?.[0]?.date || series?.[0]?.name);
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
        if (!detailCsvContent) return;
        const blob = new Blob([detailCsvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ipc-detalle-datos.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                padding: isModal ? '1.2rem' : '0.85rem',
                paddingBottom: isModal ? '2.2rem' : '1.7rem',
                borderRadius: isModal ? '12px' : '10px',
                boxShadow: isModal ? 'none' : 'var(--shadow-md)',
                border: isModal ? 'none' : '1px solid var(--border)',
                transition: 'transform 0.2s',
                cursor: isInteractive ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{indicator.title}</span>
                    {indicator.subtitle ? (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            ({indicator.subtitle})
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
                                    fontSize: '0.6rem',
                                    padding: '0.2rem 0.4rem',
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
                    <span style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>{indicator.value}</span>
                    {indicator.variation ? (
                        <span style={{
                            fontSize: '0.95rem',
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
                    data={filteredChartData}
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
            {isModal && showDataTable ? (
                <DataTableModal
                    title="Datos del grafico"
                    columns={fxTableData?.columns || [
                        { key: 'date', label: 'Fecha' },
                        { key: 'value', label: 'Valor', align: 'right', emphasis: true }
                    ]}
                    rows={fxTableData?.rows || filteredChartData.map((entry, index) => ({
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
