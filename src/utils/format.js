const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const numberFormatterCache = new Map();

const getNumberFormatter = (minimumFractionDigits, maximumFractionDigits) => {
    const key = `${minimumFractionDigits}|${maximumFractionDigits}`;
    if (!numberFormatterCache.has(key)) {
        numberFormatterCache.set(
            key,
            new Intl.NumberFormat('es-CL', {
                minimumFractionDigits,
                maximumFractionDigits
            })
        );
    }
    return numberFormatterCache.get(key);
};

export const formatNumber = (value, optionsOrDecimals = 1) => {
    if (typeof optionsOrDecimals === 'number') {
        const formatter = getNumberFormatter(optionsOrDecimals, optionsOrDecimals);
        return formatter.format(value);
    }
    const options = optionsOrDecimals || {};
    const minimumFractionDigits = options.minimumFractionDigits ?? 1;
    const maximumFractionDigits = options.maximumFractionDigits ?? minimumFractionDigits;
    const formatter = getNumberFormatter(minimumFractionDigits, maximumFractionDigits);
    return formatter.format(value);
};

export const parseDateParts = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split('-');
    if (!year || !month) return null;
    return {
        year,
        month: Number(month),
        day: day ? Number(day) : null
    };
};

export const formatMonthLabelSpace = (date) => {
    const parts = parseDateParts(date);
    if (!parts || !parts.month) return '';
    const mon = monthShort[parts.month - 1] || '';
    return `${mon} ${parts.year}`;
};

export const formatMonthLabelDash = (date) => {
    const parts = parseDateParts(date);
    if (!parts || !parts.month) return '';
    const mon = monthShort[parts.month - 1] || '';
    return `${mon}-${parts.year}`;
};

export const formatDayLabel = (date) => {
    const parts = parseDateParts(date);
    if (!parts || !parts.day) return '';
    const mon = monthShort[parts.month - 1] || '';
    const day = String(parts.day).padStart(2, '0');
    return `${day}-${mon}`;
};

export const formatShortDate = (date) => {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length < 2) return '';
    const year = parts[0];
    const month = parts[1];
    const day = parts[2] || '01';
    if (!year || !month) return '';
    const yy = year.slice(-2);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${dd}/${mm}/${yy}`;
};

export const formatQuarterLabel = (date) => {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length < 2) return '';
    const year = parts[0];
    const month = Number(parts[1]);
    if (!year || !month) return '';
    const quarter = Math.ceil(month / 3);
    return `T${quarter}-${year}`;
};
