const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const buildSeries = (indicatorId) => {
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

export default function handler(req, res) {
    const indicatorId = (req.query?.id || "").toString();
    const series = buildSeries(indicatorId);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ data: series });
}
