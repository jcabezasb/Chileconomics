// Indicadores que muestra la sección Datos, derivados de las series del Banco Central.
import { formatDayLabel, formatMonthLabelSpace, formatNumber } from '../../shared/utils/format';
import { yoyByLag } from '../../shared/utils/series';
import { getSeries, getSeriesMap, loadBcchData } from './client';
import { SERIES } from './seriesKeys';

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
const fmt = (value) => formatNumber(value, ONE_DECIMAL);
// '+1,2%' / '-1,2%'; con prefijo de moneda el signo va antes: '+$3,0' / '-$3,0'.
const signed = (value, suffix = '', prefix = '') => (
    prefix
        ? `${value >= 0 ? '+' : '-'}${prefix}${fmt(Math.abs(value))}${suffix}`
        : `${value >= 0 ? '+' : ''}${fmt(value)}${suffix}`
);
const trendOf = (delta) => (delta === null ? 'neutral' : delta >= 0 ? 'up' : 'down');
const lastTwo = (series) => [series[series.length - 1] || null, series[series.length - 2] || null];

const memo = new Map();
const cached = (key, compute) => {
    if (!memo.has(key)) memo.set(key, compute());
    return memo.get(key);
};

// Tarjetas principales: valor más reciente y cambio respecto al dato anterior.
export const getKeyIndicators = () => cached('keyIndicators', async () => {
    const s = await getSeriesMap({
        ipc: SERIES.ipcGeneral,
        dolar: SERIES.dolar,
        cobre: SERIES.cobre,
        desempleo: SERIES.desempleo,
        imacec: SERIES.imacec
    });

    const [ipcLatest, ipcPrev] = lastTwo(yoyByLag(s.ipc, 12));
    const [dolarLatest, dolarPrev] = lastTwo(s.dolar);
    const [cobreLatest, cobrePrev] = lastTwo(s.cobre);
    const [desempleoLatest, desempleoPrev] = lastTwo(s.desempleo);
    const [imacecLatest] = lastTwo(s.imacec);
    const [imacecYoY] = lastTwo(yoyByLag(s.imacec, 12));
    if (!ipcLatest || !dolarLatest || !cobreLatest || !desempleoLatest) return [];

    const ipcDelta = ipcPrev ? ipcLatest.value - ipcPrev.value : null;
    const dolarDelta = dolarPrev ? dolarLatest.value - dolarPrev.value : null;
    const cobreDelta = cobrePrev?.value ? ((cobreLatest.value - cobrePrev.value) / cobrePrev.value) * 100 : null;
    const desempleoDelta = desempleoPrev ? desempleoLatest.value - desempleoPrev.value : null;

    return [
        ...(imacecLatest ? [{
            id: 'imacec',
            title: 'IMACEC',
            subtitle: 'Indice 2018=100',
            value: fmt(imacecLatest.value),
            variation: imacecYoY ? `${signed(imacecYoY.value, '%')} YoY` : '',
            trend: imacecYoY ? trendOf(imacecYoY.value) : 'neutral',
            period: formatMonthLabelSpace(imacecLatest.date),
            description: 'Indicador Mensual de Actividad Economica'
        }] : []),
        {
            id: 'ipc',
            title: 'IPC',
            subtitle: 'Var. % en 12 meses',
            value: `${fmt(ipcLatest.value)}%`,
            variation: ipcDelta === null ? '' : signed(ipcDelta, '%'),
            trend: trendOf(ipcDelta),
            period: formatMonthLabelSpace(ipcLatest.date),
            description: 'Inflacion anual'
        },
        {
            id: 'dolar',
            title: 'Tipo de cambio',
            subtitle: 'CLP/USD',
            value: `$${fmt(dolarLatest.value)}`,
            variation: dolarDelta === null ? '' : signed(dolarDelta, '', '$'),
            trend: trendOf(dolarDelta),
            period: formatDayLabel(dolarLatest.date) || 'Hoy',
            description: 'Tipo de cambio USD/CLP'
        },
        {
            id: 'cobre',
            title: 'Cobre',
            subtitle: 'USD por libra',
            value: `$${fmt(cobreLatest.value)}`,
            variation: cobreDelta === null ? '' : signed(cobreDelta, '%'),
            trend: trendOf(cobreDelta),
            period: formatDayLabel(cobreLatest.date) || 'Hoy',
            description: 'USD/Libra Bolsa Metales'
        },
        {
            id: 'desempleo',
            title: 'Desempleo',
            subtitle: '% de FT',
            value: `${fmt(desempleoLatest.value)}%`,
            variation: desempleoDelta === null ? '' : signed(desempleoDelta, 'pp'),
            trend: trendOf(desempleoDelta),
            period: formatMonthLabelSpace(desempleoLatest.date),
            description: 'Tasa de desocupacion nacional'
        }
    ];
});

// Serie principal de cada tarjeta. El IPC se muestra como variación en 12 meses.
export const getChartData = (indicatorId) => cached(`chart:${indicatorId}`, async () => {
    switch (indicatorId) {
        case 'ipc': return yoyByLag(await getSeries(SERIES.ipcGeneral), 12);
        case 'imacec': return getSeries(SERIES.imacec);
        case 'dolar': return getSeries(SERIES.dolar);
        case 'cobre': return getSeries(SERIES.cobre);
        case 'desempleo': return getSeries(SERIES.desempleo);
        default: return [];
    }
});

export const getIpcDetailSeries = () => cached('ipcDetail', async () => {
    const s = await getSeriesMap({ core: SERIES.ipcCore, volatile: SERIES.ipcVolatile });
    if (!s.core.length || !s.volatile.length) return null;
    return { core: yoyByLag(s.core, 12), volatile: yoyByLag(s.volatile, 12) };
});

export const getImacecDetailSeries = () => cached('imacecDetail', () => getSeriesMap({
    bienes: SERIES.imacecBienes,
    mineria: SERIES.imacecMineria,
    industria: SERIES.imacecIndustria,
    resto_bienes: SERIES.imacecRestoBienes,
    comercio: SERIES.imacecComercio,
    servicios: SERIES.imacecServicios,
    no_minero: SERIES.imacecNoMinero
}));

export const getFxDetailSeries = () => cached('fxDetail', () => getSeriesMap({
    cny: SERIES.cny,
    eur: SERIES.eur,
    ars: SERIES.ars,
    jpy: SERIES.jpy
}));

export const getTcrDetailSeries = () => cached('tcrDetail', () => getSeriesMap({
    tcr: SERIES.tcr,
    tcr5: SERIES.tcr5
}));

export const getLastUpdate = async () => (await loadBcchData()).lastUpdate;
