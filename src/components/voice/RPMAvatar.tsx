import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { VISEME_TARGETS } from '@/lib/voiceAgents';

interface RPMAvatarProps {
  avatarUrl: string;
  isSpeaking: boolean;
  audioLevel?: number;
}

export function RPMAvatar({ avatarUrl, isSpeaking, audioLevel = 0 }: RPMAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(avatarUrl);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(clone);
  const { actions, mixer } = useAnimations(animations, group);
  
  const currentVisemeRef = useRef<string>('viseme_sil');
  const visemeIndexRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // Find head and teeth meshes with morph targets
  const headMesh = useMemo(() => {
    let head: THREE.SkinnedMesh | null = null;
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.name.includes('Head') && mesh.morphTargetDictionary) {
          head = mesh;
        }
      }
    });
    return head;
  }, [clone]);

  const teethMesh = useMemo(() => {
    let teeth: THREE.SkinnedMesh | null = null;
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.name.includes('Teeth') && mesh.morphTargetDictionary) {
          teeth = mesh;
        }
      }
    });
    return teeth;
  }, [clone]);

  // Play idle animation if available
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const idleAction = actions['Idle'] || Object.values(actions)[0];
      if (idleAction) {
        idleAction.reset().fadeIn(0.5).play();
      }
    }
    return () => {
      mixer?.stopAllAction();
    };
  }, [actions, mixer]);

  // Animate lip-sync based on speaking state
  useFrame((_, delta) => {
    if (!headMesh?.morphTargetDictionary || !headMesh?.morphTargetInfluences) return;

    const now = performance.now();
    const morphSmoothing = 0.15;

    if (isSpeaking) {
      // Cycle through visemes when speaking
      if (now - lastUpdateRef.current > 80 + Math.random() * 40) {
        // Randomly select viseme based on audio level
        const visemeCount = VISEME_TARGETS.length;
        const randomIndex = Math.floor(Math.random() * visemeCount);
        currentVisemeRef.current = VISEME_TARGETS[randomIndex];
        visemeIndexRef.current = randomIndex;
        lastUpdateRef.current = now;
      }

      // Apply current viseme with intensity based on audio level
      const intensity = 0.5 + audioLevel * 0.5;
      
      VISEME_TARGETS.forEach((viseme) => {
        const headIndex = headMesh.morphTargetDictionary?.[viseme];
        const teethIndex = teethMesh?.morphTargetDictionary?.[viseme];
        
        if (headIndex !== undefined && headMesh.morphTargetInfluences) {
          const targetValue = viseme === currentVisemeRef.current ? intensity : 0;
          headMesh.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[headIndex],
            targetValue,
            morphSmoothing
          );
        }
        
        if (teethIndex !== undefined && teethMesh?.morphTargetInfluences) {
          const targetValue = viseme === currentVisemeRef.current ? intensity : 0;
          teethMesh.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(
            teethMesh.morphTargetInfluences[teethIndex],
            targetValue,
            morphSmoothing
          );
        }
      });
    } else {
      // Reset to silent viseme when not speaking
      VISEME_TARGETS.forEach((viseme) => {
        const headIndex = headMesh.morphTargetDictionary?.[viseme];
        const teethIndex = teethMesh?.morphTargetDictionary?.[viseme];
        
        if (headIndex !== undefined && headMesh.morphTargetInfluences) {
          headMesh.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[headIndex],
            0,
            0.1
          );
        }
        
        if (teethIndex !== undefined && teethMesh?.morphTargetInfluences) {
          teethMesh.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(
            teethMesh.morphTargetInfluences[teethIndex],
            0,
            0.1
          );
        }
      });
    }

    // Subtle idle animation - slight head movement
    if (group.current) {
      const time = now * 0.001;
      group.current.rotation.y = Math.sin(time * 0.5) * 0.05;
      group.current.rotation.x = Math.sin(time * 0.3) * 0.02;
    }
  });

  return (
    <group ref={group} position={[0, -0.6, 0]} scale={1.5}>
      <primitive object={clone} />
    </group>
  );
}

// Preload common avatar URLs
useGLTF.preload('https://models.readyplayer.me/64c4a1e60f347b57f2c60c31.glb');
