import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import TrendChart from '../Charts/TrendChart';
import { getChartData } from '../../services/api';

const MacroCard = ({ indicator }) => {
    const [chartData, setChartData] = useState([]);
    const defaultRangeByIndicator = {
        ipc: '3y',
        desempleo: '3y',
        dolar: '1y',
        cobre: '1y'
    };
    const [timeRange, setTimeRange] = useState(defaultRangeByIndicator[indicator.id] || '1y');

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

    const formatAverage = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        const formatter = new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });

        if (indicator.id === 'ipc') {
            return `${formatter.format(value)}%`;
        }
        if (indicator.id === 'desempleo') {
            return `${formatter.format(value)}%`;
        }
        if (indicator.id === 'dolar') {
            return `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)}`;
        }
        if (indicator.id === 'cobre') {
            return `$${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
        }
        return formatter.format(value);
    };

    const formatTooltipValue = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        if (indicator.id === 'ipc') {
            return `${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
        }
        if (indicator.id === 'desempleo') {
            return `${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
        }
        if (indicator.id === 'dolar') {
            return `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)}`;
        }
        if (indicator.id === 'cobre') {
            return `$${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
        }
        return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);
    };

    useEffect(() => {
        setTimeRange(defaultRangeByIndicator[indicator.id] || '1y');
    }, [indicator.id]);

    const rangeOptions = [
        { id: '1y', label: '1A' },
        { id: '2y', label: '2A' },
        { id: '5y', label: '5A' },
        { id: 'all', label: 'Todo' }
    ];

    const getPointsPerYear = () => {
        if (indicator.id === 'ipc' || indicator.id === 'desempleo') return 12;
        if (indicator.id === 'dolar' || indicator.id === 'cobre') return 365;
        return 12;
    };

    const getRangePoints = () => {
        const pointsPerYear = getPointsPerYear();
        if (timeRange === 'all') return null;
        const years = Number(timeRange.replace('y', ''));
        return Number.isNaN(years) ? null : years * pointsPerYear;
    };

    const rangePoints = getRangePoints();
    const filteredChartData = rangePoints ? chartData.slice(-rangePoints) : chartData;

    return (
            <div style={{
                background: 'var(--bg-card)',
                padding: '0.85rem',
                paddingBottom: '1.7rem',
                borderRadius: '10px',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border)',
                transition: 'transform 0.2s',
                cursor: 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%', // Fill available space
                boxSizing: 'border-box',
                position: 'relative'
            }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{indicator.title}</span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {rangeOptions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setTimeRange(option.id)}
                            style={{
                                fontSize: '0.6rem',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '999px',
                                border: '1px solid var(--border)',
                                background: timeRange === option.id ? 'var(--bg-app)' : 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Value */}
            <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>{indicator.value}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: "flex-start", alignItems: "center", marginTop: "0.1rem" }}>
                    <span style={{ fontSize: '0.75rem', color: indicator.trend === 'up' ? 'var(--trend-up)' : indicator.trend === 'down' ? 'var(--trend-down)' : 'var(--text-secondary)' }}>
                        {indicator.variation}
                    </span>
                </div>
            </div>

            {/* Sparkline Chart */}
            <TrendChart
                data={filteredChartData}
                color="var(--chart-neon)"
                height={110}
                averageFormatter={formatAverage}
                valueFormatter={formatTooltipValue}
            />
            {indicator.period ? (
                <span style={{
                    position: 'absolute',
                    right: '0.85rem',
                    bottom: '0.7rem',
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)'
                }}>
                    {indicator.period}
                </span>
            ) : null}
        </div>
    );
};

export default MacroCard;
