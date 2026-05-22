'use client';
import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, MeshDistortMaterial } from '@react-three/drei';

function Satellite({ tilt, speed }) {
    const groupRef = useRef();
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (groupRef.current) {
            groupRef.current.rotation.y = time * speed;
        }
    });
    return (
        <group rotation={[tilt * (Math.PI / 180), 0, 0]}>
            <group ref={groupRef}>
                <mesh position={[2.4, 0, 0]}>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshStandardMaterial 
                        color="#0047ff" 
                        emissive="#0047ff" 
                        emissiveIntensity={3.0} 
                    />
                </mesh>
            </group>
        </group>
    );
}

function LoadingRing({ isLoading }) {
    const ringRef = useRef();
    useFrame((state) => {
        if (ringRef.current && isLoading) {
            ringRef.current.rotation.z = state.clock.getElapsedTime() * 8;
            ringRef.current.rotation.x = state.clock.getElapsedTime() * 3;
        }
    });
    if (!isLoading) return null;
    return (
        <mesh ref={ringRef}>
            <torusGeometry args={[2.0, 0.08, 8, 48]} />
            <meshStandardMaterial 
                color="#0047ff" 
                emissive="#0047ff" 
                emissiveIntensity={2.0} 
            />
        </mesh>
    );
}

function ShockwaveRing({ age, onComplete }) {
    const ringRef = useRef();
    const currentAge = useRef(age);

    useFrame(() => {
        currentAge.current += 0.025;
        if (currentAge.current > 1.0) {
            onComplete();
            return;
        }
        if (ringRef.current) {
            const radius = 1.8 + (5.0 - 1.8) * currentAge.current;
            ringRef.current.scale.set(radius, radius, 1);
            if (ringRef.current.material) {
                ringRef.current.material.opacity = 1.0 - currentAge.current;
            }
        }
    });

    return (
        <mesh ref={ringRef}>
            <torusGeometry args={[1, 0.03, 8, 32]} />
            <meshBasicMaterial 
                color="#ff1f3d" 
                transparent={true} 
                wireframe={true} 
                opacity={1.0}
            />
        </mesh>
    );
}

function MainSphere({ isListening, isLoading, onClick, triggerShockwave }) {
    const materialRef = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (materialRef.current) {
            materialRef.current.emissiveIntensity = 1.7 + Math.sin(time * 1.5) * 0.5;
        }
    });

    const distort = isListening ? 0.55 : isLoading ? 0.2 : 0.3;
    const speed = isListening ? 5.0 : isLoading ? 8.0 : 2.0;
    const emissive = isListening ? '#ff6600' : '#ff1f3d';

    return (
        <Float floatIntensity={0.6} rotationIntensity={0.2}>
            <mesh 
                onClick={(e) => {
                    e.stopPropagation();
                    if (isLoading) return;
                    if (onClick) onClick();
                    triggerShockwave();
                }}
                style={{ cursor: isLoading ? 'default' : 'pointer' }}
            >
                <sphereGeometry args={[1.8, 64, 64]} />
                <MeshDistortMaterial
                    ref={materialRef}
                    color="#cc001a"
                    emissive={emissive}
                    emissiveIntensity={1.8}
                    distort={distort}
                    speed={speed}
                    roughness={0}
                    metalness={0.85}
                />
            </mesh>
            <Text
                fontSize={0.9}
                color="white"
                fontWeight="800"
                letterSpacing={0.18}
                position={[0, 0, 2.0]}
                outlineWidth={0.04}
                outlineColor="#ff1f3d"
                material-toneMapped={false}
            >
                SOS
            </Text>
            <LoadingRing isLoading={isLoading} />
        </Float>
    );
}

function SOSSphereScene({ isListening, isLoading, onClick }) {
    const [shockwaves, setShockwaves] = useState([]);

    const triggerShockwave = () => {
        setShockwaves(prev => {
            const next = [...prev, { id: Date.now() + Math.random(), age: 0 }];
            if (next.length > 3) next.shift();
            return next;
        });
    };

    const removeShockwave = (id) => {
        setShockwaves(prev => prev.filter(sw => sw.id !== id));
    };

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[3, 3, 4]} color="#ff1f3d" intensity={3.0} />
            <pointLight position={[-3, -2, 3]} color="#0047ff" intensity={2.0} />

            <MainSphere 
                isListening={isListening} 
                isLoading={isLoading} 
                onClick={onClick} 
                triggerShockwave={triggerShockwave}
            />

            <Satellite tilt={0} speed={0.9} />
            <Satellite tilt={60} speed={1.3} />
            <Satellite tilt={120} speed={1.7} />

            {shockwaves.map(sw => (
                <ShockwaveRing 
                    key={sw.id} 
                    age={sw.age} 
                    onComplete={() => removeShockwave(sw.id)} 
                />
            ))}
        </>
    );
}

function SOSSphereComponent({ isListening, isLoading, onClick }) {
    return (
        <div className="sos-sphere-container">
            <Suspense fallback={
                <div className="sos-sphere-fallback">
                    <span style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.15em' }}>SOS</span>
                </div>
            }>
                <Canvas
                    camera={{ position: [0, 0, 5.5], fov: 60 }}
                    style={{ background: 'transparent' }}
                >
                    <SOSSphereScene 
                        isListening={isListening} 
                        isLoading={isLoading} 
                        onClick={onClick} 
                    />
                </Canvas>
            </Suspense>
        </div>
    );
}

const SOSSphere = React.memo(SOSSphereComponent);
export default SOSSphere;
