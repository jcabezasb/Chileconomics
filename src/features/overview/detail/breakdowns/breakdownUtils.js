import { useEffect, useState } from 'react';
import { makeAxisFormatter, makeValueFormatter } from '../../../../shared/utils/detailStats';

// Carga asíncrona de las series de un desglose (null mientras carga).
export const useAsyncData = (loader) => {
    const [data, setData] = useState(null);
    useEffect(() => {
        let isActive = true;
        loader().then((result) => {
            if (isActive) setData(result);
        });
        return () => {
            isActive = false;
        };
    }, [loader]);
    return data;
};

export const percentFormatter = makeValueFormatter({ suffix: '%' });
export const indexFormatter = makeValueFormatter({ decimals: 1 });
export const percentAxis = makeAxisFormatter({ suffix: '%' });
export const plainAxis = makeAxisFormatter({});

// Índices (o % si se pidió variación en 12 meses).
export const indexOrPercent = (yoyEnabled) => ({
    format: yoyEnabled ? percentFormatter : indexFormatter,
    axis: yoyEnabled ? percentAxis : plainAxis,
    unitLabel: yoyEnabled ? 'Var. % en 12 meses' : 'Índice 2018=100'
});

export const legendItems = (defs) => defs.map((def) => ({ id: def.key, ...def }));
