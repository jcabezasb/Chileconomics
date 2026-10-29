import { formatNumber } from '../../shared/utils/format';
import { IED_ITEMS } from './iedGroups';

export const formatMillions = (value) => (Number.isFinite(value) ? formatNumber(value, 0) : '–');
export const formatShare = (share) => (Number.isFinite(share) ? `${formatNumber(share * 100, 1)}%` : '–');
export const formatChange = (change) => (
    Number.isFinite(change) ? `${change > 0 ? '+' : ''}${formatNumber(change, 1)}%` : '–'
);

const COLUMNS = (first) => [
    { key: 'label', label: first, emphasis: true, width: 'minmax(0, 1.8fr)' },
    { key: 'value', label: 'Millones US$', align: 'right', emphasis: true, bar: 'bar', width: 'minmax(0, 1.3fr)' },
    { key: 'share', label: '% del total', align: 'right' },
    { key: 'change', label: 'Var. anual', align: 'right' }
];

// Filas ordenadas de mayor a menor, con el total al final.
const rankingRows = (items, total, totalChange) => {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const max = sorted[0]?.value || 1;
    return [
        ...sorted.map((item) => ({
            id: item.id,
            label: item.label,
            value: formatMillions(item.value),
            bar: Math.max(0, item.value) / max,
            share: formatShare(item.share),
            change: formatChange(item.change)
        })),
        { id: 'total', label: 'Total', value: formatMillions(total), share: '100,0%', change: formatChange(totalChange) }
    ];
};

const csvRow = (cells) => cells.join(';');
const csvValue = (value) => (Number.isFinite(value) ? formatNumber(value, 1) : '');

// Tablas del año elegido (por país, por sector y, hacia Chile, por región) y un CSV con todos los años.
export const iedTable = ({ direction, year, regional, countries, sectors, regionalData, countryData }) => {
    const inward = direction === 'inward';
    const tables = [];
    const csv = [];
    if (countries) {
        tables.push({ heading: inward ? 'Por país de origen' : 'Por país de destino', columns: COLUMNS('País'), rows: rankingRows(countries.items, countries.total, countries.totalChange) });
        csv.push(csvRow(['tipo', 'nombre', ...countryData.years]));
        countries.items.forEach((item) => csv.push(csvRow(['país', item.label, ...item.values.map(csvValue)])));
        csv.push(csvRow(['país', 'Total', ...countryData[direction].total.map(csvValue)]));
    }
    if (sectors) {
        tables.push({ heading: 'Por sector económico', columns: COLUMNS('Sector'), rows: rankingRows(sectors.items, sectors.total, sectors.totalChange) });
        if (!csv.length) csv.push(csvRow(['tipo', 'nombre', ...countryData.years]));
        countryData.sectors[direction].items.forEach((item) => csv.push(csvRow(['sector', item.label, ...item.values.map(csvValue)])));
    }
    if (inward && regional) {
        tables.push({ heading: 'Por región', columns: COLUMNS('Región'), rows: rankingRows(regional.items, regional.total, regional.totalChange) });
        if (!csv.length) csv.push(csvRow(['tipo', 'nombre', ...regionalData.years]));
        IED_ITEMS.forEach((item) => csv.push(csvRow(['región', item.label, ...regionalData.years.map((entry) => csvValue(regionalData.values[item.id][entry]))])));
    }
    return {
        title: inward ? `Inversión extranjera directa en Chile, ${year}` : `Inversión directa de Chile en el exterior, ${year}`,
        subtitle: 'Stock a fin de año, millones de dólares. País del inversionista inmediato. Fuente: Banco Central de Chile.',
        tables,
        csv: csv.join('\n'),
        filename: inward ? 'ied-en-chile.csv' : 'inversion-chile-en-el-exterior.csv'
    };
};
