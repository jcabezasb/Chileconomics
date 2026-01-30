export const getKeyIndicators = async () => {
    // Mock data simulating BC Central API response
    return [
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
};

export const getGDPComponents = async () => {
    return [
        { name: 'Consumo Hogares', share: 60, growth: 2.1 },
        { name: 'Gobierno', share: 15, growth: 1.5 },
        { name: 'Inversión', share: 22, growth: -3.0 },
        { name: 'Exportaciones Netas', share: 3, growth: 5.0 }
    ]
}

export const getChartData = async (indicatorId) => {
    // Return time series mock
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((m, i) => ({
        name: m,
        value: Math.floor(Math.random() * 10) + 1 // Random mock
    }));
}
