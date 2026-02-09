"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CARD_COUNT = 10;
const RADIUS = 2.6;
const CARD_THICKNESS = 0.12;

// Each card: different heights to create visual interest like the reference
const cards = [
  { height: 2.4, width: 1.3, color: "#1c1c8c", sideColor: "#12126a" },
  { height: 2.8, width: 1.2, color: "#1a1a85", sideColor: "#101065" },
  { height: 2.2, width: 1.4, color: "#1e1e90", sideColor: "#14146e" },
  { height: 3.0, width: 1.1, color: "#1c1c88", sideColor: "#111168" },
  { height: 2.5, width: 1.3, color: "#1a1a82", sideColor: "#101062" },
  { height: 2.7, width: 1.2, color: "#1d1d8e", sideColor: "#13136c" },
  { height: 2.3, width: 1.4, color: "#1b1b86", sideColor: "#111166" },
  { height: 2.9, width: 1.1, color: "#1c1c8a", sideColor: "#121269" },
  { height: 2.4, width: 1.3, color: "#1a1a84", sideColor: "#101064" },
  { height: 2.6, width: 1.2, color: "#1e1e8f", sideColor: "#14146d" },
];

function Panel({ index, total }: { index: number; total: number }) {
  const card = cards[index % cards.length];
  const angle = (index / total) * Math.PI * 2;

  // Position on circle
  const x = Math.sin(angle) * RADIUS;
  const z = Math.cos(angle) * RADIUS;

  // Create materials array for the box: [right, left, top, bottom, front, back]
  // Sides are darker to show 3D depth
  const materials = [
    new THREE.MeshStandardMaterial({ color: card.sideColor, roughness: 0.7, metalness: 0.05 }), // right
    new THREE.MeshStandardMaterial({ color: card.sideColor, roughness: 0.7, metalness: 0.05 }), // left
    new THREE.MeshStandardMaterial({ color: card.sideColor, roughness: 0.6, metalness: 0.05 }), // top
    new THREE.MeshStandardMaterial({ color: card.sideColor, roughness: 0.8, metalness: 0.05 }), // bottom
    new THREE.MeshStandardMaterial({ color: card.color, roughness: 0.5, metalness: 0.05 }),     // front
    new THREE.MeshStandardMaterial({ color: card.color, roughness: 0.5, metalness: 0.05 }),     // back
  ];

  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <mesh material={materials} castShadow receiveShadow>
        <boxGeometry args={[card.width, card.height, CARD_THICKNESS]} />
      </mesh>
    </group>
  );
}

function Ring() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.004;
    }
  });

  return (
    // Tilt the ring to view from above - matching the reference perspective
    <group ref={groupRef} rotation={[0.55, 0, 0.08]}>
      {Array.from({ length: CARD_COUNT }).map((_, i) => (
        <Panel key={i} index={i} total={CARD_COUNT} />
      ))}
    </group>
  );
}

export default function CardCarousel() {
  return (
    <Canvas
      camera={{
        position: [0, 4, 7],
        fov: 40,
        near: 0.1,
        far: 100,
      }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      shadows
    >
      {/* Ambient fill */}
      <ambientLight intensity={0.5} />

      {/* Key light from top-right, like the reference */}
      <directionalLight
        position={[4, 8, 4]}
        intensity={1.2}
        castShadow
        color="#ffffff"
      />

      {/* Subtle blue fill from the left */}
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.3}
        color="#6666cc"
      />

      {/* Warm accent light from below */}
      <pointLight
        position={[0, -2, 0]}
        intensity={0.2}
        color="#d4a843"
        distance={10}
      />

      <Ring />
    </Canvas>
  );
}
