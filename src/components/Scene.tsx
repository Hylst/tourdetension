import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Lights, camera rig, table and controls. A red rim light intensifies with the
 * `danger` value so the scene itself feels more threatening near collapse.
 */
function DangerLight({ danger }: { danger: number }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const pulse = danger > 0.7 ? 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 5) : 1;
    ref.current.intensity = danger * 3.2 * pulse;
  });
  return (
    <pointLight
      ref={ref}
      color="#ff2a2a"
      position={[5, 7, 6]}
      distance={40}
      decay={1.4}
    />
  );
}

export default function Scene({
  danger,
  children,
}: {
  danger: number;
  children: ReactNode;
}) {
  return (
    <>
      <color attach="background" args={["#0a0d14"]} />
      <fog attach="fog" args={["#0a0d14", 26, 52]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#9fb4d8", "#1a1206", 0.5]} />
      <directionalLight
        position={[7, 15, 9]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={20}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-9, 7, -7]} intensity={0.35} color="#7fb2ff" />
      <spotLight
        position={[0, 22, 6]}
        angle={0.5}
        penumbra={0.7}
        intensity={1.1}
        color="#ffe9c7"
        distance={50}
        decay={1.2}
      />
      <DangerLight danger={danger} />

      {/* table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#15110d" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* faint inner glow ring on the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[3.4, 7, 64]} />
        <meshBasicMaterial
          color="#3a2a18"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {children}

      <OrbitControls
        target={[0, 5, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        minPolarAngle={0.25}
        maxPolarAngle={1.52}
        makeDefault
      />
    </>
  );
}
