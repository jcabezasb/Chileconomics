import { formatGrowth } from './projectionsView';

const csvCell = (value) => (Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '');
const csvText = (text) => `"${String(text).replace(/"/g, '""')}"`;

// Tabla (y CSV) de lo que muestra el gráfico: por año, o las ediciones que proyectaron el año elegido.
export const projectionsTable = ({ view, rows, revisions, products, editions, targetYear }) => {
    if (view === 'revisiones') {
        const entries = revisions
            .flatMap((entry) => entry.points.map((point) => ({ ...point, product: entry.short })))
            .sort((a, b) => a.date.localeCompare(b.date) || a.product.localeCompare(b.product));
        return {
            title: `Proyecciones de crecimiento para ${targetYear}`,
            subtitle: 'Crecimiento anual del PIB proyectado en cada edición (%).',
            columns: [
                { key: 'label', label: 'Edición' },
                { key: 'product', label: 'Fuente', width: '5rem' },
                { key: 'value', label: 'Proyección', align: 'right', width: '8rem', emphasis: true }
            ],
            rows: entries.map((entry) => ({ id: `${entry.product}-${entry.date}`, label: entry.label, product: entry.product, value: formatGrowth(entry) })),
            csv: [
                'fecha,fuente,edicion,minimo,maximo',
                ...entries.map((entry) => [entry.date, entry.product, csvText(entry.label), csvCell(entry.low), csvCell(entry.high)].join(','))
            ].join('\n'),
            filename: `proyecciones_pib_${targetYear}.csv`
        };
    }
    return {
        title: 'Crecimiento del PIB: efectivo y proyectado',
        subtitle: `Variación anual (%). Proyecciones: ${products.map((product) => editions[product.id]).join(', ')}.`,
        columns: [
            { key: 'year', label: 'Año', width: '4rem' },
            { key: 'actual', label: 'Efectivo', align: 'right' },
            ...products.map((product) => ({ key: product.id, label: product.short, align: 'right' }))
        ],
        rows: rows.map((row) => ({
            id: row.year,
            year: row.year,
            actual: formatGrowth(row.actual),
            ...Object.fromEntries(products.map((product) => [product.id, formatGrowth(row[`${product.id}Range`])]))
        })),
        csv: [
            ['anio', 'efectivo', ...products.flatMap((product) => [`${product.id}_min`, `${product.id}_max`])].join(','),
            ...rows.map((row) => [
                row.year,
                csvCell(row.actual),
                ...products.flatMap((product) => [csvCell(row[`${product.id}Range`]?.low), csvCell(row[`${product.id}Range`]?.high)])
            ].join(','))
        ].join('\n'),
        filename: 'proyecciones_pib.csv'
    };
};
