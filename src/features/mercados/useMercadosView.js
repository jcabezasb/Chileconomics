import { useEffect, useMemo, useState } from 'react';
import { loadBcchData } from '../../data/bcch/client';
import { SERIES } from '../../data/bcch/seriesKeys';
import { US_SERIES, loadUsMarkets } from '../../data/mercados/client';
import { chartRows, diffByDate, lastPoint, lastYears, weekly, yearChange, yieldCurves } from './mercadosView';

// Bonos de Chile por plazo: en pesos (BCP) y en UF (BCU/BTU).
const CHILE_NOMINAL = { 2: SERIES.bcp2, 5: SERIES.bcp5, 10: SERIES.bcp10 };
const CHILE_REAL = { 5: SERIES.bcu5, 10: SERIES.bcu10 };

// Tarjetas de la pestaña de monedas y materias primas.
const MARKETS = [
    { id: 'dolar', label: 'Dólar observado', unit: '$ por US$', source: 'Banco Central', decimals: 1, chile: SERIES.dolar },
    { id: 'dolar-global', label: 'Dólar global (índice amplio)', unit: 'índice', source: 'Reserva Federal (FRED)', decimals: 1, us: US_SERIES.dollarIndex },
    { id: 'cobre', label: 'Cobre', unit: 'US$ por libra', source: 'Banco Central', decimals: 2, chile: SERIES.cobre },
    { id: 'wti', label: 'Petróleo WTI', unit: 'US$ por barril', source: 'Banco Central', decimals: 1, chile: SERIES.wti },
    { id: 'vix', label: 'VIX (volatilidad del S&P 500)', unit: 'índice', source: 'Cboe (FRED)', decimals: 1, us: US_SERIES.vix }
];

// Datos y estado de la sección Mercados: pestaña, rango y plazos elegidos.
// Lectores de una serie (lista vacía si no está).
const readers = (data) => ({
    chile: (key) => data?.chile[key] || [],
    us: (key) => data?.us[key] || []
});

const useMercadosView = () => {
    const [data, setData] = useState(null);
    const [view, setView] = useState('tasas');
    const [range, setRange] = useState('5');
    const [spreadTenor, setSpreadTenor] = useState('10');
    const [realTenor, setRealTenor] = useState('10');

    useEffect(() => {
        let isActive = true;
        Promise.all([loadBcchData(), loadUsMarkets()]).then(([bcch, us]) => {
            if (isActive) setData({ chile: bcch.series, us: us?.series || {} });
        });
        return () => {
            isActive = false;
        };
    }, []);

    const rates = useMemo(() => {
        if (!data) return null;
        const { chile, us } = readers(data);
        const curves = yieldCurves(
            { policy: chile(SERIES.tpm), ...Object.fromEntries(Object.entries(CHILE_NOMINAL).map(([t, key]) => [t, chile(key)])) },
            { policy: us(US_SERIES.effr), ...Object.fromEntries(['1', '2', '3', '5', '10'].map((t) => [t, us(US_SERIES.treasury(t))])) }
        );
        return {
            tpm: lastPoint(chile(SERIES.tpm)),
            effr: lastPoint(us(US_SERIES.effr)),
            fedLow: lastPoint(us(US_SERIES.fedLow)),
            fedHigh: lastPoint(us(US_SERIES.fedHigh)),
            curves,
            spreads: Object.fromEntries(Object.entries(CHILE_NOMINAL).map(([t, key]) => [t, diffByDate(chile(key), us(US_SERIES.treasury(t)))]))
        };
    }, [data]);

    const real = useMemo(() => {
        if (!data) return null;
        const { chile, us } = readers(data);
        return Object.fromEntries(Object.entries(CHILE_REAL).map(([t, key]) => {
            const chileReal = chile(key);
            const usReal = us(US_SERIES.tips(t));
            return [t, {
                chile: chileReal,
                us: usReal,
                breakevenChile: diffByDate(chile(CHILE_NOMINAL[t]), chileReal),
                breakevenUs: diffByDate(us(US_SERIES.treasury(t)), usReal)
            }];
        }));
    }, [data]);

    // Gráficos del rango elegido (semanales).
    const charts = useMemo(() => {
        if (!rates || !real) return null;
        const { chile, us } = readers(data);
        const r = real[realTenor];
        return {
            policy: chartRows({ chile: chile(SERIES.tpm), us: us(US_SERIES.effr) }, range),
            spread: chartRows({ spread: rates.spreads[spreadTenor] }, range),
            real: chartRows({ chile: r.chile, us: r.us }, range),
            breakeven: chartRows({ chile: r.breakevenChile, us: r.breakevenUs }, range)
        };
    }, [data, rates, real, range, spreadTenor, realTenor]);

    const markets = useMemo(() => {
        if (!data) return null;
        const { chile, us } = readers(data);
        return MARKETS.map((item) => {
            const series = item.chile ? chile(item.chile) : us(item.us);
            return {
                ...item,
                last: lastPoint(series),
                change: yearChange(series),
                spark: weekly(lastYears(series, 2))
            };
        });
    }, [data]);

    return {
        loading: data === null,
        view,
        setView,
        range,
        setRange,
        spreadTenor,
        setSpreadTenor,
        realTenor,
        setRealTenor,
        rates,
        real,
        charts,
        markets
    };
};

export default useMercadosView;
