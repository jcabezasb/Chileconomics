import { useState } from 'react';
import DataTableModal from '../../shared/components/DataTableModal';
import { downloadCsv } from '../../shared/utils/download';
import useRegionalView from './useRegionalView';
import RegionalMapPanel from './RegionalMapPanel';
import RegionalPibCard from './RegionalPibCard';
import PerCapitaCard from './PerCapitaCard';
import PopulationCards from './PopulationCards';
import LaborCards from './LaborCards';
import PibActivitiesModal from './PibActivitiesModal';
import { laborTable, perCapitaRankingTable, pibTable, populationTable } from './regionalTables';

// Análisis geográfico: mapa a la izquierda y fichas (PIB, per cápita, población, empleo) a la derecha.
// Sin región elegida se muestran datos nacionales.
const RegionalSection = ({ sectionRef, theme, regionalData, realPibData, populationData }) => {
    const view = useRegionalView({ regionalData, realPibData, populationData });
    const { selectedRegion, regionId, timeRange } = view;
    const [table, setTable] = useState(null);
    const [showActivities, setShowActivities] = useState(false);

    const context = { selectedRegion, regionId, timeRange };
    const openTable = (content) => setTable(content);

    return (
        <>
            <section className="regional-section reveal reveal-delay-2" ref={sectionRef} style={{ padding: '4rem 0' }}>
                <div className="regional-card">
                    <div className="regional-header">
                        <h2 className="regional-title">Análisis Geográfico y Demográfico</h2>
                        <p className="regional-subtitle">
                            {selectedRegion
                                ? `Explorando datos detallados de la ${selectedRegion}.`
                                : 'Visión general de Chile. Selecciona una región en el mapa para ver estadísticas locales.'}
                        </p>
                    </div>

                    <div className="regional-layout">
                        <RegionalMapPanel view={view} />

                        <div className="regional-cards">
                            <h3 className="regional-highlight">
                                <span className="regional-dot"></span>
                                {selectedRegion || 'Chile (Nacional)'}
                            </h3>

                            <div className="regional-metrics-grid">
                                <div className="regional-metrics-left">
                                    <RegionalPibCard
                                        view={view}
                                        theme={theme}
                                        onOpenTable={() => openTable(pibTable({ ...context, chartData: view.pib.chartData }))}
                                        onOpenActivities={() => setShowActivities(true)}
                                    />
                                    <PerCapitaCard
                                        view={view}
                                        theme={theme}
                                        onOpenRanking={() => openTable(perCapitaRankingTable(view.perCapita.ranking))}
                                    />
                                    <PopulationCards
                                        population={view.population}
                                        onOpenTable={() => openTable(populationTable({ ...context, population: view.population }))}
                                    />
                                </div>
                                <LaborCards
                                    cards={view.laborCards}
                                    theme={theme}
                                    onOpenTable={(card) => openTable(laborTable({ ...context, card }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {table ? (
                <DataTableModal
                    title={table.title}
                    columns={table.columns}
                    rows={table.rows}
                    onClose={() => setTable(null)}
                    onDownload={() => downloadCsv(table.csv, table.filename)}
                />
            ) : null}
            {showActivities && regionId ? (
                <PibActivitiesModal
                    regionId={regionId}
                    regionName={selectedRegion}
                    theme={theme}
                    onClose={() => setShowActivities(false)}
                />
            ) : null}
        </>
    );
};

export default RegionalSection;
