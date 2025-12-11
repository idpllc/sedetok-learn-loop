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
  const lastUpdateRef = useRef(0);
  const jawBoneRef = useRef<THREE.Bone | null>(null);

  // Find meshes with morph targets (Ready Player Me uses Wolf3D_ prefix)
  const morphMeshes = useMemo(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
          // Check if this mesh has viseme morph targets
          const hasVisemes = Object.keys(mesh.morphTargetDictionary).some(key => 
            key.startsWith('viseme_')
          );
          if (hasVisemes) {
            console.log('Found morph mesh:', mesh.name, Object.keys(mesh.morphTargetDictionary));
            meshes.push(mesh);
          }
        }
      }
      // Also find jaw bone for fallback animation
      if ((child as THREE.Bone).isBone && child.name.toLowerCase().includes('jaw')) {
        jawBoneRef.current = child as THREE.Bone;
        console.log('Found jaw bone:', child.name);
      }
    });
    return meshes;
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
  useFrame(() => {
    const now = performance.now();
    const morphSmoothing = 0.25;

    if (isSpeaking) {
      // If we have morph meshes with visemes, use them
      if (morphMeshes.length > 0) {
        // Cycle through visemes when speaking
        if (now - lastUpdateRef.current > 80 + Math.random() * 80) {
          const speakingVisemes = ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_SS', 'viseme_nn', 'viseme_RR'];
          const randomIndex = Math.floor(Math.random() * speakingVisemes.length);
          currentVisemeRef.current = speakingVisemes[randomIndex];
          lastUpdateRef.current = now;
        }

        // Apply current viseme with intensity based on audio level
        const intensity = Math.max(0.3, Math.min(1, 0.4 + (audioLevel * 0.8)));
        
        morphMeshes.forEach((mesh) => {
          if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
          
          VISEME_TARGETS.forEach((viseme) => {
            const index = mesh.morphTargetDictionary![viseme];
            
            if (index !== undefined) {
              const targetValue = viseme === currentVisemeRef.current ? intensity : 0;
              mesh.morphTargetInfluences![index] = THREE.MathUtils.lerp(
                mesh.morphTargetInfluences![index],
                targetValue,
                morphSmoothing
              );
            }
          });
        });
      }
      
      // Fallback: animate jaw bone if no morph targets
      if (jawBoneRef.current) {
        const jawIntensity = Math.max(0.05, audioLevel * 0.15);
        const targetRotation = -jawIntensity + Math.sin(now * 0.02) * 0.03;
        jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          jawBoneRef.current.rotation.x,
          targetRotation,
          0.3
        );
      }
    } else {
      // Reset to silent viseme when not speaking
      morphMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        
        VISEME_TARGETS.forEach((viseme) => {
          const index = mesh.morphTargetDictionary![viseme];
          
          if (index !== undefined) {
            mesh.morphTargetInfluences![index] = THREE.MathUtils.lerp(
              mesh.morphTargetInfluences![index],
              0,
              0.15
            );
          }
        });
      });
      
      // Reset jaw bone
      if (jawBoneRef.current) {
        jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          jawBoneRef.current.rotation.x,
          0,
          0.15
        );
      }
    }

    // Subtle idle animation - slight head movement
    if (group.current) {
      const time = now * 0.001;
      group.current.rotation.y = Math.sin(time * 0.5) * 0.03;
      group.current.rotation.x = Math.sin(time * 0.3) * 0.01;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]} scale={1}>
      <primitive object={clone} />
    </group>
  );
}

// Preload avatar URLs with morphTargets enabled
useGLTF.preload('https://models.readyplayer.me/693a050ffe6f676b66e408b7.glb?morphTargets=Oculus%20Visemes,ARKit');
useGLTF.preload('https://models.readyplayer.me/693a028814ff705000c68122.glb?morphTargets=Oculus%20Visemes,ARKit');
