import { useMemo } from 'react';
import useBcchData from '../../data/bcch/useBcchData';
import useRevealOnScroll from '../../app/hooks/useRevealOnScroll';
import OverviewSection from '../overview/OverviewSection';
import RegionalSection from '../regional/RegionalSection';
import PibCompositionSection from '../pib/PibCompositionSection';

const CHART_ORDER = ['ipc', 'dolar', 'desempleo', 'cobre'];

const IMACEC_PLACEHOLDER = {
    id: 'imacec',
    title: 'IMACEC',
    subtitle: 'Indice 2018=100',
    value: '--',
    variation: '',
    trend: 'neutral',
    period: 'Serie en preparacion',
    description: 'Indicador Mensual de Actividad Economica'
};

// Página /datos: indicadores principales, análisis regional y composición del PIB.
const DatosPage = ({ theme }) => {
    const { indicators, regionalData, realPibData, populationData, nominalSeries, availablePeriods } = useBcchData();
    const registerReveal = useRevealOnScroll(0.25);

    const chartIndicators = useMemo(() => (
        indicators
            .filter((indicator) => CHART_ORDER.includes(indicator.id))
            .sort((a, b) => CHART_ORDER.indexOf(a.id) - CHART_ORDER.indexOf(b.id))
    ), [indicators]);

    const imacecIndicator = useMemo(
        () => ({ ...IMACEC_PLACEHOLDER, ...indicators.find((indicator) => indicator.id === 'imacec') }),
        [indicators]
    );

    return (
        <>
            <section className="data-header">
                <h1 className="data-title">DATOS</h1>
            </section>
            <OverviewSection
                sectionRef={registerReveal(0)}
                theme={theme}
                chartIndicators={chartIndicators}
                imacecIndicator={imacecIndicator}
            />
            <RegionalSection
                sectionRef={registerReveal(1)}
                theme={theme}
                regionalData={regionalData}
                realPibData={realPibData}
                populationData={populationData}
            />
            <PibCompositionSection
                sectionRef={registerReveal(2)}
                nominalSeries={nominalSeries}
                availablePeriods={availablePeriods}
            />
        </>
    );
};

export default DatosPage;
