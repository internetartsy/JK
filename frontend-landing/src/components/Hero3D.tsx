import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function JKMapHologram() {
    const meshRef = useRef<THREE.Mesh>(null);
    // Load the generated map texture
    const mapTexture = useTexture('/jk-map.png');

    useFrame((state) => {
        if (meshRef.current) {
            // Slow, majestic rotation
            // meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
            meshRef.current.rotation.z = Math.cos(state.clock.getElapsedTime() * 0.1) * 0.05;
        }
    });

    return (
        <group>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Main Map Plane */}
                <mesh ref={meshRef} position={[2, 0, 0]} rotation={[0, -0.2, 0]} scale={1.2}>
                    <planeGeometry args={[7, 7]} />
                    <meshBasicMaterial
                        map={mapTexture}
                        transparent
                        opacity={0.8}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            </Float>

            {/* Ambient Particles for "Data Dust" effect */}
            <Sparkles
                count={100}
                scale={10}
                size={2}
                speed={0.4}
                opacity={0.5}
                color="#4ade80"
            />
        </group>
    );
}

export function Hero3D() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#4ade80" />

                <JKMapHologram />
            </Canvas>
        </div>
    );
}
