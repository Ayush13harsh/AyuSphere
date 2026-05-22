'use client';
import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Component to handle dynamic camera movements
function CameraController() {
    const { camera } = useThree();
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        camera.position.x = Math.sin(time * 0.04) * 0.4;
        camera.position.y = Math.cos(time * 0.03) * 0.25;
    });
    return null;
}

// Torus Knot component
function CentralTorusKnot() {
    const knotRef = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (knotRef.current) {
            knotRef.current.rotation.x += 0.0006;
            knotRef.current.rotation.y += 0.0004;
            const scale = 1 + Math.sin(time * 0.4) * 0.025;
            knotRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <mesh ref={knotRef} position={[0, 0, -22]}>
            <torusKnotGeometry args={[7, 1.2, 180, 16]} />
            <meshStandardMaterial 
                color="#0d0520" 
                wireframe={true} 
                emissive="#ff1f3d" 
                emissiveIntensity={0.12} 
            />
        </mesh>
    );
}

// Scrolling Holographic Grid
function HolographicGrid() {
    const gridRef = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (gridRef.current) {
            gridRef.current.position.z = (time * 1.5) % 1;
        }
    });

    return (
        <group ref={gridRef} position={[0, -11, 0]}>
            <gridHelper args={[60, 60, '#0047ff', '#0047ff']} transparent opacity={0.12} />
        </group>
    );
}

// Floating Rings
function FloatingRings() {
    const ringConfig = [
        { radius: 2.5, position: [-8, 6, -10], rotSpeed: [0.005, 0.003, 0.001], color: '#ff1f3d', opacity: 0.25 },
        { radius: 3.5, position: [9, -5, -8], rotSpeed: [-0.004, 0.006, 0.002], color: '#0047ff', opacity: 0.18 },
        { radius: 4.5, position: [-10, -7, -12], rotSpeed: [0.003, -0.005, 0.004], color: '#ff1f3d', opacity: 0.30 },
        { radius: 5.0, position: [11, 8, -9], rotSpeed: [0.002, 0.004, -0.003], color: '#0047ff', opacity: 0.22 },
        { radius: 6.0, position: [0, 10, -15], rotSpeed: [-0.003, -0.002, 0.005], color: '#ff1f3d', opacity: 0.35 }
    ];

    const refs = useRef([]);

    useFrame(() => {
        refs.current.forEach((ref, idx) => {
            if (ref) {
                const config = ringConfig[idx];
                ref.rotation.x += config.rotSpeed[0];
                ref.rotation.y += config.rotSpeed[1];
                ref.rotation.z += config.rotSpeed[2];
            }
        });
    });

    return (
        <group>
            {ringConfig.map((config, idx) => (
                <mesh 
                    key={idx} 
                    ref={(el) => (refs.current[idx] = el)} 
                    position={config.position}
                >
                    <torusGeometry args={[config.radius, 0.05, 8, 48]} />
                    <meshStandardMaterial 
                        color={config.color} 
                        wireframe={true} 
                        transparent={true} 
                        opacity={config.opacity} 
                        emissive={config.color}
                        emissiveIntensity={1.5}
                    />
                </mesh>
            ))}
        </group>
    );
}

// Particle System using Instanced Mesh
function DriftParticles({ countRed, countBlue }) {
    const redMeshRef = useRef();
    const blueMeshRef = useRef();

    // Generate random initial properties
    const redParticles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < countRed; i++) {
            temp.push({
                x: (Math.random() - 0.5) * 50,
                y: (Math.random() - 0.5) * 36,
                z: Math.random() * 17 - 15,
                phase: Math.random() * 100,
                speedX: 0.003,
                speedY: 0.008 + Math.random() * 0.004
            });
        }
        return temp;
    }, [countRed]);

    const blueParticles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < countBlue; i++) {
            temp.push({
                x: (Math.random() - 0.5) * 50,
                y: (Math.random() - 0.5) * 36,
                z: Math.random() * 17 - 15,
                phase: Math.random() * 100,
                speedX: 0.003,
                speedY: 0.008 + Math.random() * 0.004
            });
        }
        return temp;
    }, [countBlue]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();

        // Update Red Particles
        if (redMeshRef.current) {
            redParticles.forEach((p, i) => {
                p.y += p.speedY;
                if (p.y > 18) p.y = -18;
                const dynamicX = p.x + Math.sin(time + p.phase) * p.phase * 0.003;
                dummy.position.set(dynamicX, p.y, p.z);
                dummy.updateMatrix();
                redMeshRef.current.setMatrixAt(i, dummy.matrix);
            });
            redMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // Update Blue Particles
        if (blueMeshRef.current) {
            blueParticles.forEach((p, i) => {
                p.y += p.speedY;
                if (p.y > 18) p.y = -18;
                const dynamicX = p.x + Math.sin(time + p.phase) * p.phase * 0.003;
                dummy.position.set(dynamicX, p.y, p.z);
                dummy.updateMatrix();
                blueMeshRef.current.setMatrixAt(i, dummy.matrix);
            });
            blueMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.04, 1), []);

    return (
        <group>
            {/* Red Instanced Mesh */}
            <instancedMesh ref={redMeshRef} args={[geometry, null, countRed]}>
                <meshStandardMaterial 
                    color="#ff1f3d" 
                    emissive="#ff1f3d" 
                    emissiveIntensity={2.5} 
                />
            </instancedMesh>

            {/* Blue Instanced Mesh */}
            <instancedMesh ref={blueMeshRef} args={[geometry, null, countBlue]}>
                <meshStandardMaterial 
                    color="#0047ff" 
                    emissive="#0047ff" 
                    emissiveIntensity={2.0} 
                />
            </instancedMesh>
        </group>
    );
}

function Scene({ particleLimit }) {
    const redCount = Math.floor(particleLimit * (500 / 600));
    const blueCount = particleLimit - redCount;

    return (
        <>
            <fog attach="fog" args={["#04040f", 18, 55]} />
            <ambientLight intensity={0.08} />
            <pointLight position={[10, 10, 10]} color="#ff1f3d" intensity={2.5} />
            <pointLight position={[-10, -10, -8]} color="#0047ff" intensity={2.0} />
            <spotLight position={[0, 20, 0]} color="#ff1f3d" intensity={1.0} angle={0.6} />

            <CameraController />
            <CentralTorusKnot />
            <HolographicGrid />
            <FloatingRings />
            <DriftParticles countRed={redCount} countBlue={blueCount} />
        </>
    );
}

function BackgroundSceneComponent() {
    const [particleLimit, setParticleLimit] = useState(600);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const cores = navigator.hardwareConcurrency || 4;
            if (cores < 4) {
                setParticleLimit(350);
            }
        }
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', background: '#04040f' }}>
            <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#04040f' }} />}>
                <Canvas
                    camera={{ position: [0, 0, 11], fov: 75 }}
                    style={{ background: 'transparent', pointerEvents: 'none' }}
                >
                    <Scene particleLimit={particleLimit} />
                </Canvas>
            </Suspense>
        </div>
    );
}

const BackgroundScene = React.memo(BackgroundSceneComponent);
export default BackgroundScene;
