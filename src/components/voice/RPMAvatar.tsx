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
  const spineBoneRef = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const leftArmBoneRef = useRef<THREE.Bone | null>(null);
  const rightArmBoneRef = useRef<THREE.Bone | null>(null);
  const leftHandBoneRef = useRef<THREE.Bone | null>(null);
  const rightHandBoneRef = useRef<THREE.Bone | null>(null);
  const fingerBonesRef = useRef<THREE.Bone[]>([]);

  // Find meshes with morph targets and bones
  const morphMeshes = useMemo(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    const fingerBones: THREE.Bone[] = [];
    
    clone.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
          const hasVisemes = Object.keys(mesh.morphTargetDictionary).some(key => 
            key.startsWith('viseme_')
          );
          if (hasVisemes) {
            meshes.push(mesh);
          }
        }
      }
      
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        const name = bone.name;
        
        // Ready Player Me bone names (case-sensitive)
        switch(name) {
          case 'Jaw':
            jawBoneRef.current = bone;
            break;
          case 'Spine1':
          case 'Spine2':
            if (!spineBoneRef.current) spineBoneRef.current = bone;
            break;
          case 'Neck':
            neckBoneRef.current = bone;
            break;
          case 'Head':
            headBoneRef.current = bone;
            break;
          case 'LeftArm':
            leftArmBoneRef.current = bone;
            break;
          case 'RightArm':
            rightArmBoneRef.current = bone;
            break;
          case 'LeftHand':
            leftHandBoneRef.current = bone;
            break;
          case 'RightHand':
            rightHandBoneRef.current = bone;
            break;
        }
        
        // Find finger bones (RPM naming: LeftHandIndex1, RightHandThumb2, etc.)
        if (name.includes('Hand') && (
          name.includes('Thumb') || name.includes('Index') || 
          name.includes('Middle') || name.includes('Ring') || 
          name.includes('Pinky') || name.includes('Little')
        )) {
          fingerBones.push(bone);
        }
      }
    });
    
    fingerBonesRef.current = fingerBones;
    
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

  // Eye blink state
  const blinkStateRef = useRef({ nextBlink: 0, isBlinking: false, blinkProgress: 0 });
  
  // Animate lip-sync, blinking, and eye movement
  useFrame(() => {
    const now = performance.now();
    const morphSmoothing = 0.25;
    const time = now * 0.001;

    // === EYE BLINKING ===
    const blinkState = blinkStateRef.current;
    
    // Schedule next blink (random interval 2-5 seconds)
    if (now > blinkState.nextBlink && !blinkState.isBlinking) {
      blinkState.isBlinking = true;
      blinkState.blinkProgress = 0;
    }
    
    if (blinkState.isBlinking) {
      blinkState.blinkProgress += 0.15; // Speed of blink
      
      // Blink curve: quick close, quick open
      let blinkValue = 0;
      if (blinkState.blinkProgress < 0.5) {
        blinkValue = blinkState.blinkProgress * 2; // Close
      } else if (blinkState.blinkProgress < 1) {
        blinkValue = 1 - (blinkState.blinkProgress - 0.5) * 2; // Open
      } else {
        blinkState.isBlinking = false;
        blinkState.nextBlink = now + 2000 + Math.random() * 3000; // Next blink in 2-5s
        blinkValue = 0;
      }
      
      // Apply blink to both eyes
      morphMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        
        const leftBlinkIndex = mesh.morphTargetDictionary['eyeBlinkLeft'];
        const rightBlinkIndex = mesh.morphTargetDictionary['eyeBlinkRight'];
        
        if (leftBlinkIndex !== undefined) {
          mesh.morphTargetInfluences[leftBlinkIndex] = blinkValue;
        }
        if (rightBlinkIndex !== undefined) {
          mesh.morphTargetInfluences[rightBlinkIndex] = blinkValue;
        }
      });
    }

    // === SUBTLE EYE MOVEMENT ===
    const eyeLookX = Math.sin(time * 0.7) * 0.15; // Horizontal movement
    const eyeLookY = Math.sin(time * 0.5 + 1) * 0.1; // Vertical movement
    
    morphMeshes.forEach((mesh) => {
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      
      // Horizontal eye movement
      const lookLeftIndex = mesh.morphTargetDictionary['eyeLookOutLeft'];
      const lookRightIndex = mesh.morphTargetDictionary['eyeLookOutRight'];
      const lookInLeftIndex = mesh.morphTargetDictionary['eyeLookInLeft'];
      const lookInRightIndex = mesh.morphTargetDictionary['eyeLookInRight'];
      
      if (eyeLookX > 0) {
        // Looking right
        if (lookRightIndex !== undefined) mesh.morphTargetInfluences[lookRightIndex] = eyeLookX;
        if (lookInLeftIndex !== undefined) mesh.morphTargetInfluences[lookInLeftIndex] = eyeLookX;
        if (lookLeftIndex !== undefined) mesh.morphTargetInfluences[lookLeftIndex] = 0;
        if (lookInRightIndex !== undefined) mesh.morphTargetInfluences[lookInRightIndex] = 0;
      } else {
        // Looking left
        if (lookLeftIndex !== undefined) mesh.morphTargetInfluences[lookLeftIndex] = -eyeLookX;
        if (lookInRightIndex !== undefined) mesh.morphTargetInfluences[lookInRightIndex] = -eyeLookX;
        if (lookRightIndex !== undefined) mesh.morphTargetInfluences[lookRightIndex] = 0;
        if (lookInLeftIndex !== undefined) mesh.morphTargetInfluences[lookInLeftIndex] = 0;
      }
      
      // Vertical eye movement
      const lookUpLeftIndex = mesh.morphTargetDictionary['eyeLookUpLeft'];
      const lookUpRightIndex = mesh.morphTargetDictionary['eyeLookUpRight'];
      const lookDownLeftIndex = mesh.morphTargetDictionary['eyeLookDownLeft'];
      const lookDownRightIndex = mesh.morphTargetDictionary['eyeLookDownRight'];
      
      if (eyeLookY > 0) {
        if (lookUpLeftIndex !== undefined) mesh.morphTargetInfluences[lookUpLeftIndex] = eyeLookY;
        if (lookUpRightIndex !== undefined) mesh.morphTargetInfluences[lookUpRightIndex] = eyeLookY;
        if (lookDownLeftIndex !== undefined) mesh.morphTargetInfluences[lookDownLeftIndex] = 0;
        if (lookDownRightIndex !== undefined) mesh.morphTargetInfluences[lookDownRightIndex] = 0;
      } else {
        if (lookDownLeftIndex !== undefined) mesh.morphTargetInfluences[lookDownLeftIndex] = -eyeLookY;
        if (lookDownRightIndex !== undefined) mesh.morphTargetInfluences[lookDownRightIndex] = -eyeLookY;
        if (lookUpLeftIndex !== undefined) mesh.morphTargetInfluences[lookUpLeftIndex] = 0;
        if (lookUpRightIndex !== undefined) mesh.morphTargetInfluences[lookUpRightIndex] = 0;
      }
    });

    // === LIP SYNC ===
    if (isSpeaking) {
      if (morphMeshes.length > 0) {
        if (now - lastUpdateRef.current > 80 + Math.random() * 80) {
          const speakingVisemes = ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_SS', 'viseme_nn', 'viseme_RR'];
          const randomIndex = Math.floor(Math.random() * speakingVisemes.length);
          currentVisemeRef.current = speakingVisemes[randomIndex];
          lastUpdateRef.current = now;
        }

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
      
      if (jawBoneRef.current) {
        jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          jawBoneRef.current.rotation.x,
          0,
          0.15
        );
      }
    }


    // === BREATHING / SPINE ANIMATION ===
    if (spineBoneRef.current) {
      const breathe = Math.sin(time * 0.8) * 0.008;
      spineBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        spineBoneRef.current.rotation.x,
        breathe,
        0.05
      );
    }

    // === SUBTLE NECK/HEAD IDLE MOVEMENT ===
    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        neckBoneRef.current.rotation.y,
        Math.sin(time * 0.4) * 0.02,
        0.05
      );
      neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        neckBoneRef.current.rotation.x,
        Math.sin(time * 0.3) * 0.01,
        0.05
      );
    }

    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(
        headBoneRef.current.rotation.y,
        Math.sin(time * 0.5 + 0.5) * 0.025,
        0.05
      );
    }

    // === RELAXED ARM ANIMATION ===
    if (leftArmBoneRef.current) {
      leftArmBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        leftArmBoneRef.current.rotation.z,
        Math.sin(time * 0.3) * 0.015,
        0.05
      );
    }
    if (rightArmBoneRef.current) {
      rightArmBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        rightArmBoneRef.current.rotation.z,
        Math.sin(time * 0.3 + 1) * 0.015,
        0.05
      );
    }

    // === RELAXED HAND ANIMATION ===
    if (leftHandBoneRef.current) {
      leftHandBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        leftHandBoneRef.current.rotation.z,
        Math.sin(time * 0.4) * 0.03,
        0.08
      );
      leftHandBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        leftHandBoneRef.current.rotation.x,
        Math.sin(time * 0.35) * 0.02,
        0.08
      );
    }
    if (rightHandBoneRef.current) {
      rightHandBoneRef.current.rotation.z = THREE.MathUtils.lerp(
        rightHandBoneRef.current.rotation.z,
        Math.sin(time * 0.4 + 0.5) * 0.03,
        0.08
      );
      rightHandBoneRef.current.rotation.x = THREE.MathUtils.lerp(
        rightHandBoneRef.current.rotation.x,
        Math.sin(time * 0.35 + 0.5) * 0.02,
        0.08
      );
    }

    // === SUBTLE FINGER CURL FOR RELAXED POSE ===
    fingerBonesRef.current.forEach((bone, index) => {
      const name = bone.name;
      const offset = index * 0.15;
      
      // Base curl - natural relaxed position
      let baseCurl = 0.12;
      
      // Different curl based on finger segment (1=proximal, 2=intermediate, 3=distal)
      if (name.includes('1')) {
        baseCurl = 0.08;
      } else if (name.includes('2')) {
        baseCurl = 0.12;
      } else if (name.includes('3')) {
        baseCurl = 0.15;
      }
      
      // Thumb curls less
      if (name.includes('Thumb')) {
        baseCurl *= 0.4;
      }
      
      // Add subtle movement
      const movement = Math.sin(time * 0.2 + offset) * 0.015;
      
      bone.rotation.z = THREE.MathUtils.lerp(
        bone.rotation.z,
        baseCurl + movement,
        0.04
      );
    });
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
