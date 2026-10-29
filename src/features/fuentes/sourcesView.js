import { formatMonthLabelSpace, formatQuarterLabel, parseDateParts } from '../../shared/utils/format';
import { DATOS_SECTIONS } from '../datos/datosSections';
import { SOURCE_GROUPS } from './sourcesCatalog';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const SECTION_LABELS = Object.fromEntries(DATOS_SECTIONS.map(({ id, label }) => [id, label]));

// '2026-10-19' o '2026-10-19 04:22:24' -> '19 oct 2026'.
export const formatDay = (value) => {
    const parts = parseDateParts(String(value || '').slice(0, 10));
    if (!parts?.day) return null;
    return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
};

// Fecha del último dato según la frecuencia: diaria '19 oct 2026', mensual 'sep 2026',
// trimestral 'T2-2026', anual '2025'.
export const formatPeriod = (date, period) => {
    if (!date) return null;
    if (period === 'D') return formatDay(date);
    if (period === 'M') return formatMonthLabelSpace(date);
    if (period === 'T') return formatQuarterLabel(date);
    return date.slice(0, 4);
};

// Fecha más reciente entre las últimas observaciones de varias series ({ clave: [{ date, value }] }).
export const latestDate = (series, keys) => keys.reduce((latest, key) => {
    const points = series?.[key];
    const last = points?.length ? points[points.length - 1].date : null;
    return last && (!latest || last > latest) ? last : latest;
}, null);

const lastVintage = (product) => product?.vintages?.[product.vintages.length - 1] || null;

// Último dato y fecha de revisión de una fila, según el archivo del que sale. null si falta.
const rowDates = (row, data, year) => {
    const { bcch, fiscal, iedPaises, projections, us } = data;
    switch (row.dataset) {
        case 'bcch': {
            const date = latestDate(bcch?.series, row.keys(year));
            const lastData = row.projection && date ? `Proyección hasta ${date.slice(0, 4)}` : formatPeriod(date, row.period);
            return { lastData, checked: formatDay(bcch?.lastUpdate) };
        }
        case 'us':
            return {
                lastData: formatPeriod(latestDate(us?.series, row.keys(year)), 'D'),
                checked: formatDay(us?.sources?.[row.source]?.checked_at)
            };
        case 'dipres':
            return {
                lastData: fiscal?.last_period ? formatMonthLabelSpace(`${fiscal.last_period}-01`) : null,
                checked: formatDay(fiscal?.checked_at)
            };
        case 'iedPaises': {
            const years = iedPaises?.years || [];
            return { lastData: years.length ? String(years[years.length - 1]) : null, checked: formatDay(iedPaises?.checked_at) };
        }
        case 'ipom':
        case 'weo': {
            const product = projections?.[row.dataset];
            return { lastData: formatPeriod(lastVintage(product)?.date, 'M'), checked: formatDay(product?.checked_at) };
        }
        default:
            return { lastData: null, checked: null };
    }
};

// Grupos de SOURCE_GROUPS con las fechas de cada fila. data: { bcch: { lastUpdate, series }, fiscal,
// iedPaises, projections, us: { sources, series } } (cualquiera puede faltar: esas fechas quedan en null).
export const buildSourceGroups = (data, today = new Date()) => {
    const year = today.getFullYear();
    return SOURCE_GROUPS.map((group) => ({
        ...group,
        rows: group.rows.map((row) => ({
            id: row.id,
            label: row.label,
            note: row.note || null,
            section: row.section,
            sectionLabel: SECTION_LABELS[row.section] || row.section,
            frequency: row.frequency,
            url: row.url,
            ...rowDates(row, data || {}, year)
        }))
    }));
};
