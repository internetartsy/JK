import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
// Mock Native Module for Expo Go
const MapLibreGL = {
    setAccessToken: () => { },
    MapView: (props: any) => <View {...props}>{props.children}</View>,
    Camera: () => null,
    ShapeSource: () => null,
    FillLayer: () => null,
    LineLayer: () => null,
};

// Try importing real module, fallback if fails (Expo Go)
let RealMapLibreGL: any = null;
try {
    // This require will work in Development Build but fail in Expo Go
    RealMapLibreGL = require('@maplibre/maplibre-react-native').default;
    RealMapLibreGL.setAccessToken(null); // Set to null for open styles
} catch (e) {
    console.log('MapLibreGL native module not available, using fallback');
}

interface MapProps {
    geojson: any;
}

export default function Map({ geojson }: MapProps) {
    if (!RealMapLibreGL) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }]}>
                <Text style={{ fontWeight: 'bold', color: '#64748b' }}>Map Not Supported in Expo Go</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 5 }}>
                    Native module '@maplibre/maplibre-react-native' is missing.
                    Please use a Development Build to view the map.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <RealMapLibreGL.MapView
                style={styles.map}
                styleURL="https://demotiles.maplibre.org/style.json"
            >
                <RealMapLibreGL.Camera
                    defaultSettings={{
                        centerCoordinate: [74.3587, 31.5204],
                        zoomLevel: 12,
                    }}
                />
                {geojson && (
                    <RealMapLibreGL.ShapeSource id="parcels" shape={geojson}>
                        <RealMapLibreGL.FillLayer
                            id="parcels-fill"
                            style={{
                                fillColor: '#3b82f6',
                                fillOpacity: 0.5,
                                fillOutlineColor: '#1e40af',
                            }}
                        />
                        <RealMapLibreGL.LineLayer
                            id="parcels-line"
                            style={{
                                lineColor: '#1e40af',
                                lineWidth: 2,
                            }}
                        />
                    </RealMapLibreGL.ShapeSource>
                )}
            </RealMapLibreGL.MapView>
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
    map: {
        flex: 1,
    },
});
