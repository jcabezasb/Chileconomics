import { useCallback, useState } from 'react';
import IndicatorCard from './IndicatorCard';
import IndicatorModal from './IndicatorModal';

// Grilla principal: IMACEC destacado a la izquierda y 4 indicadores (2x2) a la derecha.
const OverviewSection = ({ sectionRef, theme, chartIndicators, imacecIndicator }) => {
    const [activeIndicator, setActiveIndicator] = useState(null);
    const closeModal = useCallback(() => setActiveIndicator(null), []);

    return (
        <section
            id="datos"
            className="overview-section reveal reveal-delay-1 is-visible"
            ref={sectionRef}
            style={{ paddingBottom: '4rem' }}
        >
            <div className="overview-grid">
                <div className="overview-featured">
                    <IndicatorCard indicator={imacecIndicator} theme={theme} onOpen={setActiveIndicator} featured />
                </div>
                {chartIndicators.slice(0, 4).map((indicator) => (
                    <IndicatorCard key={indicator.id} indicator={indicator} theme={theme} onOpen={setActiveIndicator} />
                ))}
            </div>
            {activeIndicator ? (
                <IndicatorModal indicator={activeIndicator} theme={theme} onClose={closeModal} />
            ) : null}
        </section>
    );
};

export default OverviewSection;
