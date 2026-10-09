// Cálculos para la tabla de series de tiempo: frecuencia, agrupación por período y variaciones.
import { formatNumber } from './format';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const FREQUENCY_ORDER = ['day', 'month', 'quarter', 'year'];

export const FREQUENCY_LABELS = {
    day: { option: 'Día', previous: 'vs día anterior', aggregate: 'cada día' },
    month: { option: 'Mes', previous: 'vs mes anterior', aggregate: 'cada mes' },
    quarter: { option: 'Trimestre', previous: 'vs trim. anterior', aggregate: 'cada trimestre' },
    year: { option: 'Año', previous: 'vs año anterior', aggregate: 'cada año' }
};

// Frecuencia nativa según las fechas: diaria si hay días distintos de 01; anual si solo hay enero;
// trimestral si solo hay meses 01/04/07/10; mensual en otro caso.
export const detectFrequency = (rows) => {
    const dates = (rows || []).map((row) => row.date).filter(Boolean);
    if (!dates.length) return 'day';
    if (dates.some((date) => date.slice(8, 10) !== '01')) return 'day';
    const months = new Set(dates.map((date) => date.slice(5, 7)));
    if (months.size === 1 && months.has('01') && dates.length > 1) return 'year';
    if ([...months].every((month) => ['01', '04', '07', '10'].includes(month))) return 'quarter';
    return 'month';
};

// Clave del período al que pertenece una fecha ('2026-10-09' -> mes '2026-10', trimestre '2026-T4', año '2026').
export const periodKey = (date, frequency) => {
    const year = date.slice(0, 4);
    const month = Number(date.slice(5, 7));
    if (frequency === 'day') return date;
    if (frequency === 'month') return date.slice(0, 7);
    if (frequency === 'quarter') return `${year}-T${Math.ceil(month / 3)}`;
    return year;
};

export const formatPeriod = (key, frequency) => {
    if (frequency === 'year') return key;
    if (frequency === 'quarter') return `${key.slice(6)}T ${key.slice(0, 4)}`;
    const month = MONTHS[Number(key.slice(5, 7)) - 1];
    if (frequency === 'month') return `${month} ${key.slice(0, 4)}`;
    return `${Number(key.slice(8, 10))} ${month} ${key.slice(0, 4)}`;
};

// Mismo período un año antes ('2026-10' -> '2025-10', '2026-T4' -> '2025-T4').
const previousYearKey = (key) => `${Number(key.slice(0, 4)) - 1}${key.slice(4)}`;

// Agrupa filas [{ date, a, b }] por período: promedio, suma o último valor de cada columna.
export const groupRows = (rows, keys, frequency, aggregate = 'mean') => {
    const groups = new Map();
    (rows || []).forEach((row) => {
        const key = periodKey(row.date, frequency);
        if (!groups.has(key)) groups.set(key, { key, date: row.date, values: {} });
        const group = groups.get(key);
        group.date = row.date < group.date ? row.date : group.date;
        keys.forEach((column) => {
            const value = Number(row[column]);
            if (row[column] === null || row[column] === undefined || !Number.isFinite(value)) return;
            (group.values[column] ||= []).push({ date: row.date, value });
        });
    });

    const reduce = (points) => {
        if (!points?.length) return null;
        if (aggregate === 'sum') return points.reduce((total, point) => total + point.value, 0);
        if (aggregate === 'last') return [...points].sort((a, b) => a.date.localeCompare(b.date)).at(-1).value;
        return points.reduce((total, point) => total + point.value, 0) / points.length;
    };

    return Array.from(groups.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((group) => ({
            key: group.key,
            date: group.date,
            ...Object.fromEntries(keys.map((column) => [column, reduce(group.values[column])]))
        }));
};

const change = (value, previous, percentUnit) => {
    if (!Number.isFinite(value) || !Number.isFinite(previous)) return null;
    if (percentUnit) return value - previous;
    return previous ? ((value - previous) / Math.abs(previous)) * 100 : null;
};

// Variación de una columna contra el período anterior y contra el mismo período del año anterior.
// En series diarias, si ese día del año anterior no tuvo dato se busca hasta 7 días antes.
export const addChanges = (rows, column, frequency, percentUnit) => {
    const byKey = new Map(rows.map((row) => [row.key, row[column]]));
    const sameDayLastYear = (key) => {
        const target = new Date(`${previousYearKey(key)}T00:00:00Z`);
        for (let back = 0; back <= 7; back += 1) {
            const candidate = new Date(target.getTime() - back * 86400000).toISOString().slice(0, 10);
            if (byKey.has(candidate)) return byKey.get(candidate);
        }
        return null;
    };
    return rows.map((row, index) => {
        const previous = index > 0 ? rows[index - 1][column] : null;
        const lastYear = frequency === 'day' ? sameDayLastYear(row.key) : byKey.get(previousYearKey(row.key));
        return {
            ...row,
            change: change(row[column], previous, percentUnit),
            yoy: frequency === 'year' ? null : change(row[column], lastYear ?? null, percentUnit)
        };
    });
};

// Redondea a 1 decimal antes de decidir el signo: -0,04 se muestra como 0,0 (sin flecha ni '−').
export const roundChange = (value) => (Number.isFinite(value) ? (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10 : null);

export const formatChange = (value, percentUnit) => {
    const rounded = roundChange(value);
    if (rounded === null) return '';
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
    return `${sign}${formatNumber(Math.abs(rounded), 1)}${percentUnit ? ' pp' : '%'}`;
};

// Tabla como texto separado por tabuladores (se pega directo en Excel o Google Sheets).
export const toTsv = (header, rows) => [header, ...rows].map((cells) => cells.join('\t')).join('\n');
