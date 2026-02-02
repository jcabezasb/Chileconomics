const mockIndicators = [
    {
        id: "imacec",
        title: "IMACEC",
        value: "1.2%",
        variation: "+0.3%",
        trend: "up",
        period: "Ene 2024",
        description: "Indicador Mensual de Actividad Económica"
    },
    {
        id: "ipc",
        title: "IPC (12 meses)",
        value: "3.8%",
        variation: "-0.1%",
        trend: "down",
        period: "Feb 2024",
        description: "Inflación anual"
    },
    {
        id: "tpm",
        title: "TPM",
        value: "7.25%",
        variation: "-100pb",
        trend: "down",
        period: "Reunión Ene",
        description: "Tasa de Política Monetaria"
    },
    {
        id: "dolar",
        title: "Dólar Obs.",
        value: "$980",
        variation: "+$12",
        trend: "up",
        period: "Hoy",
        description: "Tipo de cambio USD/CLP"
    },
    {
        id: "cobre",
        title: "Cobre",
        value: "$3.85",
        variation: "+0.5%",
        trend: "up",
        period: "Hoy",
        description: "USD/Libra Bolsa Metales"
    },
    {
        id: "desempleo",
        title: "Desempleo",
        value: "8.5%",
        variation: "+0.1%",
        trend: "up",
        period: "Trimestre Movil",
        description: "Tasa de desocupación nacional"
    }
];

const mockGDPComponents = [
    { name: "Consumo Hogares", share: 60, growth: 2.1 },
    { name: "Gobierno", share: 15, growth: 1.5 },
    { name: "Inversión", share: 22, growth: -3.0 },
    { name: "Exportaciones Netas", share: 3, growth: 5.0 }
];

const mockChartData = (indicatorId) => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    let base = 5;
    let volatility = 1;

    switch (indicatorId) {
        case "imacec": base = 1.0; volatility = 0.5; break;
        case "ipc": base = 3.5; volatility = 0.3; break;
        case "tpm": base = 8.0; volatility = 0.75; break;
        case "dolar": base = 950; volatility = 20; break;
        case "cobre": base = 3.8; volatility = 0.2; break;
        case "desempleo": base = 8.5; volatility = 0.4; break;
        default: base = 5; break;
    }

    return months.map((m, i) => {
        let val = base + (Math.random() * volatility - volatility / 2);
        if (indicatorId === "tpm") val -= (i * 0.1);
        if (indicatorId === "imacec") val += (i * 0.05);
        return {
            name: m,
            value: Number(val.toFixed(2))
        };
    });
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const fetchData = async (url, fallback) => {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`);
        if (!response.ok) throw new Error("Request failed");
        const payload = await response.json();
        return payload?.data ?? fallback;
    } catch (error) {
        return fallback;
    }
};

export const getKeyIndicators = async () => {
    return fetchData("/api/indicators", mockIndicators);
};

export const getGDPComponents = async () => {
    return fetchData("/api/gdp-components", mockGDPComponents);
};

export const getChartData = async (indicatorId) => {
    // Intentar obtener datos reales del BC
    const bcchData = await loadBcchData();
    const keyMap = {
        'ipc': 'ipc',
        'dolar': 'dolar'
    };

    const key = keyMap[indicatorId];
    if (bcchData && key && bcchData[key]) {
        // Convertir formato BC {date, value} a formato Recharts {name, value}
        // Tomamos los últimos 12 registros para el gráfico
        return bcchData[key].data.slice(-12).map(d => ({
            name: d.date.substring(0, 7), // YYYY-MM
            value: d.value
        }));
    }

    return fetchData(`/api/chart?id=${encodeURIComponent(indicatorId)}`, mockChartData(indicatorId));
};

// Mapeo de IDs de series a claves en el JSON
const SERIES_KEY_MAP = {
    'F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T': 'pib_real',
    'F073.TCO.PRE.Z.D': 'dolar',
    'F074.IPC.VAR.Z.Z.C.M': 'ipc',
    // Regionales
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.15.0.T': 'pib_reg_XV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.01.0.T': 'pib_reg_I',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.02.0.T': 'pib_reg_II',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.03.0.T': 'pib_reg_III',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.04.0.T': 'pib_reg_IV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.05.0.T': 'pib_reg_V',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.13.0.T': 'pib_reg_RM',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.06.0.T': 'pib_reg_VI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.07.0.T': 'pib_reg_VII',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.16.0.T': 'pib_reg_XVI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.08.0.T': 'pib_reg_VIII',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.09.0.T': 'pib_reg_IX',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.14.0.T': 'pib_reg_XIV',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.10.0.T': 'pib_reg_X',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.11.0.T': 'pib_reg_XI',
    'F035.PIB.FLU.R.CLP.2018.Z.Z.Z.12.0.T': 'pib_reg_XII'
};

// Cache para datos del BC
let bcchDataCache = null;

const loadBcchData = async () => {
    if (bcchDataCache) return bcchDataCache;

    try {
        const response = await fetch('/data/bcch_series.json');
        if (!response.ok) throw new Error('Failed to load BCCH data');
        bcchDataCache = await response.json();
        return bcchDataCache;
    } catch (error) {
        console.warn('Could not load BCCH data:', error);
        return null;
    }
};

export const getSeries = async (seriesId, options = {}) => {
    if (!seriesId) return [];

    // Intentar cargar desde JSON estático primero
    const bcchData = await loadBcchData();
    const key = SERIES_KEY_MAP[seriesId];

    if (bcchData && key && bcchData[key]) {
        return bcchData[key].data || [];
    }

    // Fallback a la API si está disponible
    const params = new URLSearchParams({ series: seriesId });
    if (options.start) params.append("desde", options.start);
    if (options.end) params.append("hasta", options.end);
    if (options.frequency) params.append("frecuencia", options.frequency);
    const payload = await fetchData(`/api/bcch-series?${params.toString()}`, []);
    return payload || [];
};

export const getLatestSeries = async (seriesId, frequency) => {
    if (!seriesId) return null;
    const params = new URLSearchParams({ series: seriesId, last: "1" });
    if (frequency) params.append("frecuencia", frequency);
    const payload = await fetchData(`/api/bcch-series?${params.toString()}`, null);
    return payload?.latest ?? null;
};
