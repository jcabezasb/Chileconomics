const components = [
    { name: "Consumo Hogares", share: 60, growth: 2.1 },
    { name: "Gobierno", share: 15, growth: 1.5 },
    { name: "Inversión", share: 22, growth: -3.0 },
    { name: "Exportaciones Netas", share: 3, growth: 5.0 }
];

export default function handler(req, res) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ data: components });
}
