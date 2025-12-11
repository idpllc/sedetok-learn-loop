import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { RPMAvatar } from './RPMAvatar';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';

interface AvatarSceneProps {
  avatarUrl: string;
  isSpeaking: boolean;
  audioLevel?: number;
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="hsl(165, 89%, 24%)" />
    </mesh>
  );
}

// Gradient background component
function GradientBackground() {
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#1a1a3e') },
        colorMiddle: { value: new THREE.Color('#2d3a6d') },
        colorBottom: { value: new THREE.Color('#1e2a4a') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorMiddle;
        uniform vec3 colorBottom;
        varying vec2 vUv;
        void main() {
          vec3 color;
          if (vUv.y > 0.5) {
            color = mix(colorMiddle, colorTop, (vUv.y - 0.5) * 2.0);
          } else {
            color = mix(colorBottom, colorMiddle, vUv.y * 2.0);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    return { geometry, material };
  }, []);

  return (
    <mesh position={[0, 0, -3]} geometry={mesh.geometry} material={mesh.material} />
  );
}

export function AvatarScene({ avatarUrl, isSpeaking, audioLevel = 0 }: AvatarSceneProps) {
  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      <Canvas
        camera={{ position: [0, 0.45, 0.9], fov: 35 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Gradient Background */}
        <GradientBackground />
        
        {/* Stars for atmosphere */}
        <Stars 
          radius={100} 
          depth={50} 
          count={1000} 
          factor={2} 
          saturation={0} 
          fade 
          speed={0.5}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#8888ff" />
        <pointLight position={[0, 2, 2]} intensity={0.4} color="#ffffff" />
        
        <Suspense fallback={<LoadingFallback />}>
          <group position={[0, -1.15, 0]}>
            <RPMAvatar 
              avatarUrl={avatarUrl} 
              isSpeaking={isSpeaking} 
              audioLevel={audioLevel}
            />
          </group>
          <Environment preset="city" />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          minPolarAngle={Math.PI / 2.3}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.4, 0]}
        />
      </Canvas>
      
      {/* Loading overlay */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <></>
      </Suspense>
    </div>
  );
}
