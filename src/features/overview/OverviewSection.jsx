import React, { useState } from 'react';
import MacroCard from './MacroCard';
import IndicatorModal from './IndicatorModal';

const OverviewSection = ({
    sectionRef,
    theme,
    chartIndicators,
    imacecIndicator
}) => {
    const [activeIndicator, setActiveIndicator] = useState(null);

    return (
        <section
            id="datos"
            className="overview-section reveal reveal-delay-1 is-visible"
            ref={sectionRef}
            style={{ paddingBottom: '4rem' }}
        >
            {/* Main Grid: Featured IMACEC | Charts (2x2) */}
            <div className="overview-grid">
                <div className="overview-featured">
                    <MacroCard
                        indicator={imacecIndicator}
                        theme={theme}
                        onOpen={setActiveIndicator}
                        variant="featured"
                    />
                </div>

                {/* Columns 2-3: 4 Charts in 2x2 grid */}
                {chartIndicators.slice(0, 2).map(ind => (
                    <MacroCard
                        key={ind.id}
                        indicator={ind}
                        theme={theme}
                        onOpen={setActiveIndicator}
                    />
                ))}
                {chartIndicators.slice(2, 4).map(ind => (
                    <MacroCard
                        key={ind.id}
                        indicator={ind}
                        theme={theme}
                        onOpen={setActiveIndicator}
                    />
                ))}
            </div>
            {activeIndicator ? (
                <IndicatorModal
                    indicator={activeIndicator}
                    theme={theme}
                    onClose={() => setActiveIndicator(null)}
                />
            ) : null}
        </section>
    );
};

export default OverviewSection;
