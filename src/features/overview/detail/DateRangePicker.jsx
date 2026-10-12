import { useEffect, useMemo, useRef, useState } from 'react';
import { formatShortDate } from '../../../shared/utils/format';
import { getSeriesFrequency, toDayKey, toMonthKey } from '../../../shared/utils/dates';

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Fechas disponibles agrupadas: años -> meses -> días.
const buildDateTree = (dates) => {
    const tree = { years: [], monthsByYear: {}, daysByYearMonth: {} };
    dates.forEach((value) => {
        const [year, month = '01', day = '01'] = value.split('-');
        if (!tree.monthsByYear[year]) {
            tree.years.push(year);
            tree.monthsByYear[year] = [];
        }
        if (!tree.monthsByYear[year].includes(month)) tree.monthsByYear[year].push(month);
        const yearMonth = `${year}-${month}`;
        (tree.daysByYearMonth[yearMonth] ||= []).push(day);
    });
    return tree;
};

const splitDate = (value) => {
    const [year = '', month = '01', day = '01'] = (value || '').split('-');
    return { year, month, day };
};

const OptionGrid = ({ options, selected, onSelect, format = (option) => option }) => (
    <div className="range-option-grid">
        {options.map((option) => (
            <button
                key={option}
                type="button"
                className={`range-option${option === selected ? ' is-selected' : ''}`}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect(option);
                }}
            >
                {format(option)}
            </button>
        ))}
    </div>
);

// Selector "Desde / Hasta" por pasos (año -> mes -> día). Las series diarias eligen día;
// el resto, mes. Solo ofrece fechas con datos.
const DateRangePicker = ({ series, value, onChange }) => {
    const [openField, setOpenField] = useState(null);
    const [step, setStep] = useState({ start: 'year', end: 'year' });
    const containerRef = useRef(null);

    const isDailyPicker = getSeriesFrequency(series) === 'daily';
    const dates = useMemo(() => (
        Array.from(new Set(series.map((entry) => (isDailyPicker ? toDayKey(entry.date) : toMonthKey(entry.date))))).sort()
    ), [series, isDailyPicker]);
    const tree = useMemo(() => buildDateTree(dates), [dates]);

    // Al abrir "Otro" el rango parte con toda la serie.
    useEffect(() => {
        if (!value.start && !value.end && dates.length) onChange({ start: dates[0], end: dates[dates.length - 1] });
    }, [value.start, value.end, dates, onChange]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setOpenField(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const buildValue = ({ year, month, day }) => (isDailyPicker ? `${year}-${month}-${day || '01'}` : `${year}-${month}`);
    // Mantiene start <= end moviendo el otro extremo si hace falta.
    const update = (field, parts) => {
        const next = buildValue(parts);
        onChange(field === 'start'
            ? { start: next, end: value.end && value.end < next ? next : value.end }
            : { start: value.start && value.start > next ? next : value.start, end: next });
    };
    const display = (date) => {
        if (!date) return 'Fecha';
        if (isDailyPicker) return formatShortDate(date);
        const { year, month } = splitDate(date);
        return `${MONTH_SHORT[Number(month) - 1] || month} ${year}`;
    };

    return (
        <div ref={containerRef} className="detail-custom-range date-range-picker">
            {['start', 'end'].map((field) => {
                const parts = splitDate(value[field]);
                const isStart = field === 'start';
                const edge = (list) => (isStart ? list[0] : list[list.length - 1]);
                return (
                    <div key={field} className="date-range-field">
                        <span className="date-range-label">{isStart ? 'Desde' : 'Hasta'}</span>
                        <button
                            type="button"
                            className="period-select date-range-button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpenField(openField === field ? null : field);
                                setStep((prev) => ({ ...prev, [field]: 'year' }));
                            }}
                        >
                            {display(value[field])}
                        </button>
                        {openField === field ? (
                            <div className="date-range-dropdown">
                                {step[field] === 'year' ? (
                                    <>
                                        <div className="date-range-step">Año</div>
                                        <OptionGrid
                                            options={tree.years}
                                            selected={parts.year}
                                            onSelect={(year) => {
                                                const month = edge(tree.monthsByYear[year] || ['01']);
                                                const day = edge(tree.daysByYearMonth[`${year}-${month}`] || ['01']);
                                                update(field, { year, month, day });
                                                setStep((prev) => ({ ...prev, [field]: 'month' }));
                                            }}
                                        />
                                    </>
                                ) : null}
                                {step[field] === 'month' ? (
                                    <>
                                        <div className="date-range-step">Mes</div>
                                        <OptionGrid
                                            options={tree.monthsByYear[parts.year] || []}
                                            selected={parts.month}
                                            format={(month) => MONTH_SHORT[Number(month) - 1] || month}
                                            onSelect={(month) => {
                                                const day = edge(tree.daysByYearMonth[`${parts.year}-${month}`] || ['01']);
                                                update(field, { year: parts.year, month, day });
                                                if (isDailyPicker) setStep((prev) => ({ ...prev, [field]: 'day' }));
                                                else setOpenField(null);
                                            }}
                                        />
                                    </>
                                ) : null}
                                {isDailyPicker && step[field] === 'day' ? (
                                    <>
                                        <div className="date-range-step">Día</div>
                                        <OptionGrid
                                            options={tree.daysByYearMonth[`${parts.year}-${parts.month}`] || []}
                                            selected={parts.day}
                                            onSelect={(day) => {
                                                update(field, { ...parts, day });
                                                setOpenField(null);
                                            }}
                                        />
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
};

export default DateRangePicker;
