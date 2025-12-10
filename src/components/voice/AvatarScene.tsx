import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { RPMAvatar } from './RPMAvatar';
import { Loader2 } from 'lucide-react';

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

export function AvatarScene({ avatarUrl, isSpeaking, audioLevel = 0 }: AvatarSceneProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0.2, 1.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        
        <Suspense fallback={<LoadingFallback />}>
          <RPMAvatar 
            avatarUrl={avatarUrl} 
            isSpeaking={isSpeaking} 
            audioLevel={audioLevel}
          />
          <Environment preset="apartment" />
          <ContactShadows 
            position={[0, -0.6, 0]} 
            opacity={0.4} 
            scale={2} 
            blur={2} 
          />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0.1, 0]}
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
