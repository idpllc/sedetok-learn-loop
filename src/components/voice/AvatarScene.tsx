import { Suspense, useMemo, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { RPMAvatar } from './RPMAvatar';
import { Loader2, User } from 'lucide-react';
import * as THREE from 'three';

interface AvatarSceneProps {
  avatarUrl: string;
  isSpeaking: boolean;
  audioLevel?: number;
  avatarImageUrl?: string;
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

// 2D fallback when 3D avatar fails to load
function Avatar2DFallback({ avatarImageUrl, isSpeaking }: { avatarImageUrl?: string; isSpeaking: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1a3e] via-[#2d3a6d] to-[#1e2a4a] rounded-xl">
      <div className={`relative ${isSpeaking ? 'animate-pulse' : ''}`}>
        {avatarImageUrl ? (
          <img 
            src={avatarImageUrl} 
            alt="Avatar" 
            className="w-32 h-32 rounded-full object-cover border-4 border-primary/30 shadow-2xl"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30">
            <User className="w-16 h-16 text-primary" />
          </div>
        )}
        {isSpeaking && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Error boundary wrapper for Canvas
function CanvasWrapper({ avatarUrl, isSpeaking, audioLevel, onError }: AvatarSceneProps & { onError: () => void }) {
  return (
    <Canvas
      camera={{ position: [0, 0.45, 0.9], fov: 35 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onError);
      }}
    >
      <GradientBackground />
      <Stars radius={100} depth={50} count={1000} factor={2} saturation={0} fade speed={0.5} />
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
  );
}

export function AvatarScene({ avatarUrl, isSpeaking, audioLevel = 0, avatarImageUrl }: AvatarSceneProps) {
  const [has3DError, setHas3DError] = useState(false);
  
  const handleError = useCallback(() => {
    console.warn('3D avatar failed to load, falling back to 2D');
    setHas3DError(true);
  }, []);

  if (has3DError) {
    return <Avatar2DFallback avatarImageUrl={avatarImageUrl} isSpeaking={isSpeaking} />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      <CanvasWrapper 
        avatarUrl={avatarUrl} 
        isSpeaking={isSpeaking} 
        audioLevel={audioLevel} 
        onError={handleError}
      />
    </div>
  );
}
