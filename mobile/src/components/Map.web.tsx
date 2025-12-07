import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
    geojson: any;
}

export default function Map({ geojson }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (map.current) return; // initialize map only once
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [74.3587, 31.5204], // Lahore
            zoom: 12
        });

        map.current.on('load', () => {
            if (!map.current) return;

            // Add source and layer
            map.current.addSource('parcels', {
                type: 'geojson',
                data: geojson || { type: 'FeatureCollection', features: [] }
            });

            map.current.addLayer({
                id: 'parcels-fill',
                type: 'fill',
                source: 'parcels',
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.5,
                    'fill-outline-color': '#1e40af'
                }
            });

            map.current.addLayer({
                id: 'parcels-line',
                type: 'line',
                source: 'parcels',
                paint: {
                    'line-color': '#1e40af',
                    'line-width': 2
                }
            });
        });

        return () => {
            map.current?.remove();
            map.current = null;
        }
    }, []);

    // Update data when geojson changes
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const source = map.current.getSource('parcels') as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(geojson || { type: 'FeatureCollection', features: [] });
        }
    }, [geojson]);

    return (
        <View style={styles.container}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: 400,
        width: '100%',
        borderRadius: 10,
        overflow: 'hidden',
    },
});
