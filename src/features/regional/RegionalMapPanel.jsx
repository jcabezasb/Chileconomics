import MacroMap from './MacroMap';
import { Segmented } from '../overview/detail/DetailParts';
import { REGION_SHORT_NAME_BY_ID } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';

const MAP_MODES = [
    { id: 'regions', label: 'Regiones' },
    { id: 'percapita', label: 'PIB per cápita' }
];

// Columna izquierda: selector de modo, mapa y leyenda del PIB per cápita.
const RegionalMapPanel = ({ view }) => {
    const { selectedRegion, toggleRegion, mapMode, setMapMode, choropleth, perCapita } = view;
    const { extremes } = perCapita;
    const label = (row) => `${REGION_SHORT_NAME_BY_ID[row.regionId]}`;
    const millions = (row) => formatNumber(row.value / 1e6, 1);

    return (
        <div className="regional-map">
            <div className="regional-map-stack">
                <Segmented ariaLabel="Colorear mapa" options={MAP_MODES} value={mapMode} onChange={setMapMode} />
                <MacroMap selectedRegion={selectedRegion} choropleth={choropleth} onRegionSelect={toggleRegion} />
                {choropleth && extremes ? (
                    <div className="regional-map-legend">
                        <span className="regional-map-legend-title">PIB per cápita, millones de $ por habitante</span>
                        <span className="regional-map-legend-bar" aria-hidden="true" />
                        <div className="regional-map-legend-labels">
                            <span>{millions(extremes.min)} · {label(extremes.min)}</span>
                            <span>{label(extremes.max)} · {millions(extremes.max)}</span>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default RegionalMapPanel;
