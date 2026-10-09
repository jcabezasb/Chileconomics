import { useMemo } from 'react';
import TrendChart from '../../../../shared/components/TrendChart';
import { getIpcDetailSeries } from '../../../../data/bcch/indicators';
import { mergeSeriesByDate } from '../../../../shared/utils/dates';
import { downloadCsv } from '../../../../shared/utils/download';
import { DetailPanel, Legend } from '../DetailParts';
import { buildCsv, buildMultiTable } from '../tables';
import BreakdownSection from './BreakdownSection';
import { legendItems, percentAxis, percentFormatter, useAsyncData } from './breakdownUtils';

const IPC_SERIES = [
    { key: 'general', label: 'IPC general', color: 'var(--chart-neon)', strokeWidth: 2.5 },
    { key: 'core', label: 'Subyacente', color: '#38bdf8' },
    { key: 'volatile', label: 'Volátiles', color: '#f59e0b' }
];
const INFLATION_TARGET = [{ y: 3, label: 'Meta 3%' }];

// IPC general vs subyacente (sin volátiles) vs volátiles, con la meta del Banco Central.
const IpcBreakdown = ({ theme, mainSeries, prepare }) => {
    const detail = useAsyncData(getIpcDetailSeries);
    const data = useMemo(() => (
        detail
            ? mergeSeriesByDate({ general: mainSeries, core: prepare(detail.core), volatile: prepare(detail.volatile) })
            : []
    ), [detail, mainSeries, prepare]);

    if (!data.length) return null;

    return (
        <BreakdownSection>
            <DetailPanel
                wide
                title="General, subyacente y volátiles"
                subtitle="Var. % en 12 meses · la línea gris marca la meta de 3% del Banco Central"
                legend={<Legend items={legendItems(IPC_SERIES)} />}
                table={() => buildMultiTable(data, IPC_SERIES, percentFormatter)}
                onDownload={() => downloadCsv(buildCsv(data, IPC_SERIES), 'ipc-componentes.csv')}
            >
                <TrendChart
                    data={data}
                    height={260}
                    valueFormatter={percentFormatter}
                    axisFormatter={percentAxis}
                    theme={theme}
                    series={IPC_SERIES}
                    showAverage={false}
                    referenceLines={INFLATION_TARGET}
                    detailed
                />
            </DetailPanel>
        </BreakdownSection>
    );
};

export default IpcBreakdown;
