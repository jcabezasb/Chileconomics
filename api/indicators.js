const indicators = [
    {
        id: "imacec",
        title: "IMACEC",
        value: "112.4",
        variation: "",
        trend: "neutral",
        period: "Ene 2024",
        description: "Indicador Mensual de Actividad Economica"
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

export default function handler(req, res) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ data: indicators });
}
