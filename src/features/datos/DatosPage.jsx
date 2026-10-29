import { useEffect, useMemo, useRef } from 'react';
import useBcchData from '../../data/bcch/useBcchData';
import OverviewSection from '../overview/OverviewSection';
import RegionalSection from '../regional/RegionalSection';
import PibCompositionSection from '../pib/PibCompositionSection';
import FiscalSection from '../fiscal/FiscalSection';
import IedSection from '../ied/IedSection';
import ProjectionsSection from '../proyecciones/ProjectionsSection';
import MercadosSection from '../mercados/MercadosSection';
import SourcesSection from '../fuentes/SourcesSection';
import { DATOS_SECTIONS } from './datosSections';
import useDatosSection from './useDatosSection';

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

// Muestra la sección apenas se monta (con la animación de entrada de .reveal).
const showSection = (element) => {
    if (element) requestAnimationFrame(() => element.classList.add('is-visible'));
};

// Página /datos: un menú con las secciones (indicadores, tasas y mercados, proyecciones, regiones, inversión extranjera,
// PIB, finanzas públicas y fuentes) y debajo solo la sección elegida, para no tener que recorrer la página.
const DatosPage = ({ theme }) => {
    const { indicators, regionalData, realPibData, populationData, nominalSeries, availablePeriods } = useBcchData();
    const { section, chooseSection } = useDatosSection();
    const headerRef = useRef(null);

    const chartIndicators = useMemo(() => (
        indicators
            .filter((indicator) => CHART_ORDER.includes(indicator.id))
            .sort((a, b) => CHART_ORDER.indexOf(a.id) - CHART_ORDER.indexOf(b.id))
    ), [indicators]);

    const imacecIndicator = useMemo(
        () => ({ ...IMACEC_PLACEHOLDER, ...indicators.find((indicator) => indicator.id === 'imacec') }),
        [indicators]
    );

    // Al elegir una sección, la página baja hasta dejar el menú fijo arriba: la sección queda a
    // pantalla completa, sin tener que buscarla. Se hace después de dibujar la sección nueva (antes
    // la página puede ser más corta y no alcanza a bajar).
    const scrollPending = useRef(false);
    const select = (id) => {
        scrollPending.current = true;
        chooseSection(id);
    };
    useEffect(() => {
        const header = headerRef.current;
        if (!scrollPending.current || !header) return;
        scrollPending.current = false;
        // Posición natural del menú = fin del encabezado (offsetTop de un elemento fijo cambia al bajar).
        window.scrollTo({ top: header.offsetTop + header.offsetHeight, behavior: 'smooth' });
    }, [section]);

    return (
        <>
            <section className="data-header" ref={headerRef}>
                <h1 className="data-title">DATOS</h1>
            </section>
            <nav className="datos-menu" aria-label="Secciones de datos">
                <div className="datos-menu-track">
                    {DATOS_SECTIONS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            className={`datos-menu-item${section === id ? ' is-active' : ''}`}
                            aria-current={section === id ? 'page' : undefined}
                            onClick={() => select(id)}
                        >
                            <Icon size={16} strokeWidth={2} aria-hidden="true" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </nav>
            <div className="datos-panel" key={section}>
                {section === 'indicadores' ? (
                    <OverviewSection
                        sectionRef={showSection}
                        theme={theme}
                        chartIndicators={chartIndicators}
                        imacecIndicator={imacecIndicator}
                    />
                ) : null}
                {section === 'mercados' ? <MercadosSection sectionRef={showSection} /> : null}
                {section === 'proyecciones' ? <ProjectionsSection sectionRef={showSection} /> : null}
                {section === 'regiones' ? (
                    <RegionalSection
                        sectionRef={showSection}
                        theme={theme}
                        regionalData={regionalData}
                        realPibData={realPibData}
                        populationData={populationData}
                    />
                ) : null}
                {section === 'ied' ? <IedSection sectionRef={showSection} /> : null}
                {section === 'pib' ? (
                    <PibCompositionSection
                        sectionRef={showSection}
                        nominalSeries={nominalSeries}
                        availablePeriods={availablePeriods}
                    />
                ) : null}
                {section === 'fiscal' ? <FiscalSection sectionRef={showSection} /> : null}
                {section === 'fuentes' ? <SourcesSection sectionRef={showSection} onSelectSection={select} /> : null}
            </div>
        </>
    );
};

export default DatosPage;
