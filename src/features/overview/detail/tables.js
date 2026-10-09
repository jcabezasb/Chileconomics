// Tablas y CSV de la vista de detalle. Las tablas muestran la fila más reciente arriba;
// los CSV van en orden cronológico (más cómodo para planillas).
import { formatNumber } from '../../../shared/utils/format';
import { formatShortDate, isDailySeries } from '../../../shared/utils/detailStats';

export const buildSingleTable = (series, label, formatter) => {
    const daily = isDailySeries(series);
    return {
        columns: [
            { key: 'date', label: 'Fecha' },
            { key: 'value', label, align: 'right', emphasis: true }
        ],
        rows: [...(series || [])].reverse().map((entry, index) => ({
            id: `${entry.date}-${index}`,
            date: formatShortDate(entry.date, daily),
            value: formatter(entry.value)
        }))
    };
};

export const buildMultiTable = (data, seriesDefs, formatter) => {
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
