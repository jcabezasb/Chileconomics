import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import TrendChart from '../Charts/TrendChart';
import { getChartData } from '../../services/api';

const MacroCard = ({ indicator }) => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        getChartData(indicator.id).then(data => setChartData(data));
    }, [indicator.id]);

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={16} className="text-up" />;
        if (trend === 'down') return <TrendingDown size={16} className="text-down" />;
        return <Minus size={16} className="text-neutral" />;
    };

    const getChartColor = (trend) => {
        if (trend === 'up') return "var(--trend-up)";
        if (trend === 'down') return "var(--trend-down)";
        return "var(--trend-neutral)";
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border)',
            transition: 'transform 0.2s',
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '160px' // Slightly taller for chart
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{indicator.title}</span>
                {getTrendIcon(indicator.trend)}
            </div>

            {/* Main Value */}
            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-brand)' }}>{indicator.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                    <span style={{ fontSize: '0.9rem', color: indicator.trend === 'up' ? 'var(--trend-up)' : indicator.trend === 'down' ? 'var(--trend-down)' : 'var(--text-secondary)' }}>
                        {indicator.variation}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {indicator.period}
                    </span>
                </div>
            </div>

            {/* Sparkline Chart */}
            <TrendChart data={chartData} color={getChartColor(indicator.trend)} height={50} />
        </div>
    );
};

export default MacroCard;
