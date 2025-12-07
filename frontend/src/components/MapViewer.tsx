import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewerProps {
    center?: [number, number];
    zoom?: number;
    onParcelClick?: (parcelId: string) => void;
}

export default function MapViewer({
    center = [73.0479, 33.6844], // Islamabad default
    zoom = 10,
    onParcelClick
}: MapViewerProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        try {
            console.log('Initializing map...');
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        'osm': {
                            type: 'raster',
                            tiles: [
                                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            ],
                            tileSize: 256,
                            attribution: '&copy; OpenStreetMap contributors',
                        },
                    },
                    layers: [
                        {
                            id: 'osm-layer',
                            type: 'raster',
                            source: 'osm',
                            minzoom: 0,
                            maxzoom: 19,
                        },
                    ],
                },
                center: center,
                zoom: zoom,
            });
        } catch (err) {
            console.error('Error initializing map:', err);
            return;
        }

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        map.current.on('load', () => {
            setLoaded(true);

            // Add parcel layer placeholder
            map.current?.addSource('parcels', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [],
                },
            });

            map.current?.addLayer({
                id: 'parcels-fill',
                type: 'fill',
                source: 'parcels',
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'status'],
                        'active', '#4CAF50',
                        'disputed', '#FF9800',
                        'inactive', '#9E9E9E',
                        '#4CAF50'
                    ],
                    'fill-opacity': 0.5,
                },
            });

            map.current?.addLayer({
                id: 'parcels-outline',
                type: 'line',
                source: 'parcels',
                paint: {
                    'line-color': '#333',
                    'line-width': 2,
                },
            });

            // Click handler for parcels
            map.current?.on('click', 'parcels-fill', (e) => {
                if (e.features && e.features[0]) {
                    const parcelId = e.features[0].properties?.id;
                    onParcelClick?.(parcelId);
                }
            });

            // Cursor change on hover
            map.current?.on('mouseenter', 'parcels-fill', () => {
                if (map.current) map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current?.on('mouseleave', 'parcels-fill', () => {
                if (map.current) map.current.getCanvas().style.cursor = '';
            });
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [center, zoom, onParcelClick]);

    return (
        <div className="relative w-full h-full min-h-[400px]">
            <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

            {/* Add Parcel Button */}
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => {
                        // Mock creation for now, or trigger parent callback
                        const id = `P-${Date.now()}`;
                        console.log('Creating parcel:', id);
                        // In real app, this would open a form or draw mode
                        // onParcelClick?.(id); // Just to trigger something
                        alert(`Triggering agristack.parcels.create for ${id}`);
                    }}
                    className="bg-white text-secondary-900 px-4 py-2 rounded-md shadow-md font-medium hover:bg-secondary-50 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    Add Parcel
                </button>
            </div>

            {!loaded && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 px-8 py-4 rounded-lg shadow-lg font-medium z-10">
                    Loading map...
                </div>
            )}
        </div>
    );
}
