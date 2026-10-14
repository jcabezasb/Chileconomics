import { formatNumber } from '../../shared/utils/format';
import { IED_ITEMS } from './iedGroups';

export const formatMillions = (value) => (Number.isFinite(value) ? formatNumber(value, 0) : '–');
export const formatShare = (share) => (Number.isFinite(share) ? `${formatNumber(share * 100, 1)}%` : '–');
export const formatChange = (change) => (
    Number.isFinite(change) ? `${change > 0 ? '+' : ''}${formatNumber(change, 1)}%` : '–'
);

// Tabla del año elegido (ordenada de mayor a menor) y CSV con todos los años.
export const iedTable = (snapshot, data) => {
    const rows = [...snapshot.items].sort((a, b) => b.value - a.value);
    const max = rows[0]?.value || 1;
    return {
        title: `Inversión extranjera directa por región, ${snapshot.year}`,
        subtitle: 'Stock a fin de año, millones de dólares. Fuente: Banco Central de Chile.',
        ranking: {
            columns: [
                { key: 'label', label: 'Región', emphasis: true, width: 'minmax(0, 1.8fr)' },
                { key: 'value', label: 'Millones US$', align: 'right', emphasis: true, bar: 'bar', width: 'minmax(0, 1.3fr)' },
                { key: 'share', label: '% del total', align: 'right' },
                { key: 'change', label: 'Var. anual', align: 'right' }
            ],
            rows: [
                ...rows.map((item) => ({
                    id: item.id,
                    label: item.label,
                    value: formatMillions(item.value),
                    bar: item.value / max,
                    share: formatShare(item.share),
                    change: formatChange(item.change)
                })),
                {
                    id: 'total',
                    label: 'Total nacional',
                    value: formatMillions(snapshot.total),
                    share: '100,0%',
                    change: formatChange(snapshot.totalChange)
                }
            ],
            csv: [
                ['region', ...data.years].join(';'),
                ...IED_ITEMS.map((item) => [item.label, ...data.years.map((year) => formatNumber(data.values[item.id][year], 1))].join(';')),
                ['Total nacional', ...data.years.map((year) => formatNumber(data.total[year], 1))].join(';')
            ].join('\n'),
            filename: 'ied-stock-por-region.csv'
        }
    };
};
