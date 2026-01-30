import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// URL for Chile TopoJSON (16 Regions)
const CHILE_TOPO_URL = "https://raw.githubusercontent.com/gonzalobustos/chile-geojson/master/topojson/regiones.json";

const MacroMap = ({ onRegionSelect }) => {
    const [selectedRegion, setSelectedRegion] = useState(null);

    // Custom projection config for Chile's long shape
    // Centers and zooms to fit Chile reasonably well
    const projectionConfig = {
        scale: 2000,
        center: [-70, -35]
    };

    // Example color scale based on some mock data (e.g., Growth)
    const colorScale = scaleLinear()
        .domain([0, 10])
        .range(["#fee2e2", "#ef4444"]);

    return (
        <div className="macro-map-container" style={{ width: "100%", height: "600px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden" }}>
            <ComposableMap
                projection="geoMercator"
                projectionConfig={projectionConfig}
                width={400}
                height={800} // Taller aspect ratio for Chile
                style={{ width: "100%", height: "100%" }}
            >
                <ZoomableGroup center={[-71, -38]} zoom={1.2}>
                    <Geographies geography={CHILE_TOPO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const isSelected = selectedRegion === geo.properties.Region;
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onClick={() => {
                                            const regionName = geo.properties.Region || geo.properties.name;
                                            setSelectedRegion(regionName);
                                            if (onRegionSelect) onRegionSelect(regionName);
                                        }}
                                        style={{
                                            default: {
                                                fill: isSelected ? "var(--color-accent)" : "#cbd5e1",
                                                stroke: "#FFF",
                                                strokeWidth: 0.5,
                                                outline: "none",
                                                transition: "all 0.3s ease"
                                            },
                                            hover: {
                                                fill: isSelected ? "var(--color-accent)" : "#94a3b8",
                                                stroke: "#FFF",
                                                strokeWidth: 0.5,
                                                outline: "none",
                                                cursor: "pointer"
                                            },
                                            pressed: {
                                                fill: "var(--color-accent)",
                                                outline: "none"
                                            }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>

            {/* Region Label Overlay */}
            {selectedRegion && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border)'
                }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Región Seleccionada</h4>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-brand)' }}>{selectedRegion}</p>
                </div>
            )}
        </div>
    );
};

export default MacroMap;
