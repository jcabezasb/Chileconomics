export const buildSparklinePaths = (values, width, height) => {
    const safeValues = values && values.length ? values : [0, 0];
    const min = Math.min(...safeValues);
    const max = Math.max(...safeValues);
    const range = max - min || 1;
    const step = width / (safeValues.length - 1);
    const points = safeValues.map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return [x, y];
    });
    const linePath = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`)
        .join(' ');
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
    return { linePath, areaPath };
};
