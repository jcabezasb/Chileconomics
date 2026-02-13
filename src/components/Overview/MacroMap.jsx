import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// URL for Chile TopoJSON (16 Regions)
import chileTopo from "../../assets/chile.json";

// URL for Chile TopoJSON (16 Regions)
const CHILE_TOPO_URL = chileTopo;

const MacroMap = ({ onRegionSelect, selectedRegion }) => {
    const [isPulseActive, setIsPulseActive] = useState(false);

    // Trigger pulse on mount
    useEffect(() => {
        setIsPulseActive(true);
        const timer = setTimeout(() => setIsPulseActive(false), 2000); // 2s duration
        return () => clearTimeout(timer);
    }, []);

    // Custom projection config for Chile's long shape
    // Centers and zooms to fit Chile reasonably well
    const projectionConfig = {
        scale: 640,
        center: [-70, -38]
    };

    const mapDimensions = {
        width: 240,
        height: 620
    };

    return (
        <div className="macro-map-container">
            <div className="macro-map-frame">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={projectionConfig}
                    width={mapDimensions.width} // Compact width
                    height={mapDimensions.height} // Proportional height
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup
                        center={[-70, -38]}
                        zoom={1}
                        minZoom={1}
                        maxZoom={4}
                        translateExtent={[
                            [0, 0],
                            [mapDimensions.width, mapDimensions.height]
                        ]}
                    >
                        <Geographies geography={CHILE_TOPO_URL}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    const regionName = geo.properties.Region || geo.properties.name;
                                    const isSelected = selectedRegion === regionName;
                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            onClick={() => {
                                                if (onRegionSelect) onRegionSelect(regionName);
                                            }}
                                            style={{
                                                default: {
                                                    fill: isSelected ? "var(--map-invert-selected, var(--map-fill-selected))" : "var(--map-invert-fill, var(--map-fill))",
                                                    stroke: "var(--map-invert-stroke, var(--map-stroke))",
                                                    strokeWidth: 0.8,
                                                    outline: "none",
                                                    transition: "all 0.3s ease",
                                                    animation: isPulseActive ? `neonPulse 1.5s ease-in-out` : 'none'
                                                },
                                                hover: {
                                                    fill: isSelected ? "var(--map-invert-selected, var(--map-fill-selected))" : "var(--map-invert-hover, var(--map-fill-hover))",
                                                    stroke: "var(--map-invert-stroke, var(--map-stroke))",
                                                    strokeWidth: 0.8,
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    filter: "var(--map-hover-filter)" // Neon glow effect only in dark mode
                                                },
                                                pressed: {
                                                    fill: "var(--map-invert-selected, var(--map-fill-selected))",
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
            </div>
        </div>
    );
};

export default MacroMap;
