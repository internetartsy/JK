import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { parcelApi } from '../api/client';
import { Search, MapPin, X } from 'lucide-react';
// import { useSettings } from '../context/SettingsContext';

interface MapViewProps {
    center?: [number, number];
    zoom?: number;
}

const mockGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                id: 'LP-1001',
                ulpin: 'JK-8080',
                farmer_id: 'FAR-1001',
                status: 'under_review',
                owner: 'Ramesh Kumar',
                village: 'Rampur',
                khasra: '12/4',
                landmark: 'Near Canal'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [74.7973, 32.7266],
                    [74.8023, 32.7266],
                    [74.8023, 32.7216],
                    [74.7973, 32.7216],
                    [74.7973, 32.7266]
                ]]
            }
        },
        {
            type: 'Feature',
            properties: {
                id: 'LP-1002',
                ulpin: 'JK-9090',
                farmer_id: 'FAR-1002',
                status: 'disputed',
                owner: 'Sita Devi',
                village: 'Rampur',
                khasra: '14/2',
                landmark: 'Old Well'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [74.8073, 32.7316],
                    [74.8123, 32.7316],
                    [74.8123, 32.7266],
                    [74.8073, 32.7266],
                    [74.8073, 32.7316]
                ]]
            }
        },
        {
            type: 'Feature',
            properties: {
                id: 'LP-1003',
                ulpin: 'JK-7070',
                farmer_id: 'FAR-1003',
                status: 'active',
                owner: 'Abdul Khan',
                village: 'Jammu West',
                khasra: '88/1',
                landmark: 'Highway Junction'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [74.8050, 32.7200],
                    [74.8100, 32.7200],
                    [74.8100, 32.7150],
                    [74.8050, 32.7150],
                    [74.8050, 32.7200]
                ]]
            }
        }
    ]
};

export function MapView({
    center = [74.7973, 32.7266], // Jammu coordinates
    zoom = 13,
}: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [geoJsonData, setGeoJsonData] = useState<GeoJSON.FeatureCollection | null>(null);
    const [searchResults, setSearchResults] = useState<GeoJSON.Feature[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        try {
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

        map.current.on('load', async () => {
            setLoaded(true);

            // Add parcel layer placeholder
            map.current?.addSource('parcels', {
                type: 'geojson',
                data: mockGeoJSON,
            });

            // Set initial data state mostly for search immediate availability
            setGeoJsonData(mockGeoJSON);

            // Context Layer: Faint outlines for all parcels to provide land context
            map.current?.addLayer({
                id: 'parcels-context-outline',
                type: 'line',
                source: 'parcels',
                paint: {
                    'line-color': '#94a3b8', // slate-400
                    'line-width': 0.5,
                    'line-opacity': 0.3,
                },
            });

            // Target Layer: Status-based FILL only for the searched/selected parcel
            map.current?.addLayer({
                id: 'parcels-fill',
                type: 'fill',
                source: 'parcels',
                filter: ['==', 'id', ''], // Strictly targeted
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'status'],
                        'active', '#10b981',   // emerald-500
                        'under_review', '#f59e0b', // amber-500
                        'disputed', '#ef4444', // red-500
                        '#6366f1' // indigo-500 default
                    ],
                    'fill-opacity': 0.4,
                },
            });

            // Active Highlight: The "Pinned" surgical border
            map.current?.addLayer({
                id: 'parcels-outline',
                type: 'line',
                source: 'parcels',
                filter: ['==', 'id', ''],
                paint: {
                    'line-color': '#d946ef', // fuchsia-500
                    'line-width': 3,
                    'line-opacity': 0.9,
                    'line-dasharray': [2, 1]
                },
            });

            // Dynamic Labels: Only showing for the targeted parcel to avoid clutter
            map.current?.addLayer({
                id: 'parcels-labels',
                type: 'symbol',
                source: 'parcels',
                filter: ['==', 'id', ''],
                layout: {
                    'text-field': ['get', 'owner'],
                    'text-size': 11,
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 1.5,
                    'text-justify': 'auto',
                },
                paint: {
                    'text-color': '#1e293b',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2,
                }
            });

            // Click handler for parcels
            map.current?.on('click', 'parcels-fill', (e) => {
                if (e.features && e.features[0]) {
                    const props = e.features[0].properties;
                    new maplibregl.Popup()
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <div class="p-2 text-secondary-900">
                                <h3 class="font-bold text-sm">${props?.id}</h3>
                                <p class="text-xs text-gray-600">Owner: ${props?.owner}</p>
                                <p class="text-xs text-gray-600">Village: ${props?.village || 'N/A'}</p>
                                <p class="text-xs font-semibold capitalize mt-1 ${props?.status === 'active' ? 'text-green-600' : 'text-orange-600'
                            }">${props?.status}</p>
                            </div>
                        `)
                        .addTo(map.current!);
                }
            });

            // Cursor change on hover
            map.current?.on('mouseenter', 'parcels-fill', () => {
                if (map.current) map.current.getCanvas().style.cursor = 'pointer';
            });
            map.current?.on('mouseleave', 'parcels-fill', () => {
                if (map.current) map.current.getCanvas().style.cursor = '';
            });

            // Try to load real data
            try {
                const geoJSON: any = await parcelApi.getGeoJSON();

                if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
                    (map.current?.getSource('parcels') as maplibregl.GeoJSONSource).setData(geoJSON);
                    setGeoJsonData(geoJSON); // Update internal state for search

                    // Fit bounds to data
                    const bounds = new maplibregl.LngLatBounds();
                    geoJSON.features.forEach((feature: any) => {
                        if (feature.geometry.type === 'Polygon') {
                            feature.geometry.coordinates[0].forEach((coord: any) => {
                                bounds.extend(coord as [number, number]);
                            });
                        }
                    });

                    if (!bounds.isEmpty()) {
                        map.current?.fitBounds(bounds, { padding: 50 });
                    }
                }
            } catch {
                console.warn('Could not fetch real parcels for map, using mock data');
            }
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // HMR / Data Refresh Effect
    useEffect(() => {
        if (loaded && map.current) {
            const source = map.current.getSource('parcels') as maplibregl.GeoJSONSource;
            if (source) {
                source.setData(mockGeoJSON);
                setGeoJsonData(mockGeoJSON);
            }
        }
    }, [loaded]); // mockGeoJSON is now constant, but this ensures initial sync if loaded late

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            if (map.current) {
                // Reset visibility: Hide all highlights/fills when search is cleared
                map.current.setFilter('parcels-fill', ['==', 'id', '']);
                map.current.setFilter('parcels-outline', ['==', 'id', '']);
                map.current.setFilter('parcels-labels', ['==', 'id', '']);
            }
            return;
        }

        setIsSearching(true);
        // Local Filter first (fast feedback)
        const lowerQuery = query.toLowerCase();
        let results: any[] = [];

        if (geoJsonData) {
            results = geoJsonData.features.filter((f: any) => {
                const props = f.properties;
                return (
                    props.owner?.toLowerCase().includes(lowerQuery) ||
                    props.id?.toLowerCase().includes(lowerQuery) ||
                    props.ulpin?.toLowerCase().includes(lowerQuery) ||
                    props.farmer_id?.toLowerCase().includes(lowerQuery) ||
                    props.landmark?.toLowerCase().includes(lowerQuery) ||
                    props.village?.toLowerCase().includes(lowerQuery) ||
                    (props.khasra || props.khasra_number)?.toLowerCase().includes(lowerQuery)
                );
            });
        }

        // Server Search (enrichment)
        if (query.length > 2) {
            try {
                const serverResults = await parcelApi.search(query);
                if (serverResults && serverResults.length > 0) {
                    // Convert LandParcel to GeoJSON Feature
                    const newFeatures = serverResults.map(p => ({
                        type: 'Feature',
                        properties: {
                            id: p.id,
                            ulpin: p.ulpin,
                            landmark: p.landmark,
                            status: p.status,
                            owner: p.owner_name || p.owner_id || "Unknown Owner",
                            farmer_id: p.owner_id, // Map owner_id to farmer_id fallback
                            village: p.village_id,
                            khasra: p.khasra_number
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] // Placeholder geometry if missing
                            // In a real scenario, the search endpoint should return geometry or we fetch separate
                        }
                    }));

                    // Merge unique by ID
                    const existingIds = new Set(results.map(r => r.properties.id));
                    newFeatures.forEach((nf: any) => {
                        if (!existingIds.has(nf.properties.id)) {
                            results.push(nf);
                        }
                    });
                }
            } catch (err) {
                console.error("Search failed", err);
            }
        }

        setSearchResults(results);
    };

    const selectParcel = (feature: any) => {
        if (!map.current) return;

        // Highlight & Filter
        map.current.setFilter('parcels-highlight', ['==', 'id', feature.properties.id]);

        // "Only which mention": Filter others out
        map.current.setFilter('parcels-fill', ['==', 'id', feature.properties.id]);
        map.current.setFilter('parcels-outline', ['==', 'id', feature.properties.id]);
        map.current.setFilter('parcels-labels', ['==', 'id', feature.properties.id]);

        // Fly to
        const bounds = new maplibregl.LngLatBounds();
        if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach((coord: any) => {
                bounds.extend(coord as [number, number]);
            });
        }
        map.current.fitBounds(bounds, { padding: 100, maxZoom: 16 });

        // Show Popup
        new maplibregl.Popup()
            .setLngLat(bounds.getCenter())
            .setHTML(`
                <div class="p-2 text-secondary-900">
                    <h3 class="font-bold text-sm">${feature.properties.id}</h3>
                    <p class="text-xs text-gray-600">ULPIN: ${feature.properties.ulpin || 'N/A'}</p>
                    <p class="text-xs text-gray-600">Owner: ${feature.properties.owner}</p>
                    <p class="text-xs text-gray-600">Farmer ID: ${feature.properties.farmer_id || 'N/A'}</p>
                    <p class="text-xs text-gray-600">Village: ${feature.properties.village}</p>
                    ${feature.properties.landmark ? `<p class="text-xs text-gray-500 italic">Near ${feature.properties.landmark}</p>` : ''}
                    <div class="mt-2 text-xs font-bold text-fuchsia-600 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Pinned Location
                    </div>
                </div>
            `)
            .addTo(map.current);

        setSearchQuery(feature.properties.owner); // Set input to selected
        setSearchResults([]); // Close dropdown
        setIsSearching(false);
    };

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden border border-secondary-200 dark:border-secondary-700 shadow-xl bg-secondary-50 dark:bg-secondary-900">
            <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />

            {/* Floating Search Bar */}
            <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-10 flex flex-col gap-2">
                <div className="relative shadow-lg rounded-xl">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by ULPIN, Owner, Landmark..."
                        className="w-full pl-10 pr-10 py-3 bg-white/90 dark:bg-secondary-800/90 backdrop-blur border border-white/50 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    {searchQuery && (
                        <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && isSearching && (
                    <div className="bg-white/95 dark:bg-secondary-800/95 backdrop-blur rounded-xl shadow-xl border border-secondary-100 dark:border-secondary-700 max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                            <div
                                key={idx}
                                onClick={() => selectParcel(result)}
                                className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700 last:border-0 hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer flex items-start gap-3 transition-colors"
                            >
                                <div className={`mt-1 p-1 rounded ${result.properties?.status === 'active' ? 'bg-green-100 text-green-600' :
                                    result.properties?.status === 'under_review' ? 'bg-yellow-100 text-yellow-600' :
                                        result.properties?.status === 'disputed' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100'
                                    }`}>
                                    <MapPin size={14} />
                                </div>
                                <div>
                                    <p className="font-medium text-secondary-900 dark:text-white text-sm flex items-center gap-2">
                                        {result.properties?.owner}
                                        <span className="text-secondary-400 font-normal">({result.properties?.id})</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${result.properties?.status === 'active' ? 'bg-green-100 text-green-700' :
                                            result.properties?.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                                                result.properties?.status === 'disputed' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {result.properties?.status}
                                        </span>
                                    </p>
                                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                                        {result.properties?.ulpin ? `ULPIN: ${result.properties.ulpin} • ` : ''}
                                        {result.properties?.farmer_id ? `ID: ${result.properties.farmer_id} • ` : ''}
                                        {result.properties?.village} • Khasra: {result.properties?.khasra || result.properties?.khasra_number || 'N/A'}
                                        {result.properties?.landmark ? ` • Near ${result.properties.landmark}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-8 right-4 z-10 bg-white/90 dark:bg-secondary-800/90 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-white/50 dark:border-secondary-600 md:block hidden">
                <h3 className="text-sm font-bold text-secondary-900 dark:text-white mb-2">Map Legend</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-secondary-600 dark:text-secondary-300">
                        <span className="w-3 h-3 rounded-full bg-green-500 opacity-60"></span> Active Parcel
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary-600 dark:text-secondary-300">
                        <span className="w-3 h-3 rounded-full bg-orange-500 opacity-60"></span> Disputed Area
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary-600 dark:text-secondary-300">
                        <span className="w-3 h-3 rounded-full bg-fuchsia-500 border-2 border-fuchsia-600"></span> Pinned Search
                    </div>
                </div>
            </div>

            {
                !loaded && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 dark:bg-secondary-800/90 px-8 py-4 rounded-xl shadow-lg font-medium text-secondary-600 dark:text-secondary-300 z-10 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        Loading map data...
                    </div>
                )
            }
        </div >
    );
}
