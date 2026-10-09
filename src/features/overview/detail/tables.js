// Tablas y CSV de la vista de detalle.
import { formatNumber } from '../../../shared/utils/format';

// Props para SeriesTable: una serie (con columnas de variación) o varias en filas compartidas.
export const singleSeriesTable = (series, label, format, options = {}) => ({
    data: series,
    columns: [{ key: 'value', label, format }],
    ...options
});

export const multiSeriesTable = (data, seriesDefs, format, options = {}) => ({
    data,
    columns: seriesDefs.map((def) => ({ key: def.key, label: def.label, color: def.color, format })),
    ...options
});

export const buildCsv = (data, seriesDefs, decimals = 1) => {
    const header = ['fecha', ...seriesDefs.map((def) => def.header || def.key)].join(';');
    const lines = (data || []).map((row) => {
        const values = seriesDefs.map((def) => (
            row[def.key] === undefined || row[def.key] === null ? '' : formatNumber(Number(row[def.key]), decimals)
        ));
        return [row.date || '', ...values].join(';');
    });
    return [header, ...lines].join('\n');
};
