import { useRef, useEffect, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import PlaceLabels from './PlaceLabels';
import { TerrainData } from '../services/terrainService';
import mapboxgl from 'mapbox-gl';

interface TerrainMeshProps {
  heightData: number[][];
  minElevation: number;
  maxElevation: number;
  textureUrl: string;
}

function TerrainMesh({ heightData, minElevation, maxElevation, textureUrl }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!textureUrl) {
      console.warn('No texture URL provided');
      return;
    }

    console.log('Loading texture from URL (length):', textureUrl.length);
    console.log('URL type:', textureUrl.startsWith('blob:') ? 'blob' : textureUrl.startsWith('data:') ? 'data' : 'other');

    // Create image element and load texture manually
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('Image loaded, creating THREE texture');
      const loadedTexture = new THREE.Texture(img);
      loadedTexture.needsUpdate = true;
      loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
      loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      loadedTexture.flipY = false;
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      console.log('Texture object created and configured with SRGBColorSpace, calling setTexture');
      setTexture(loadedTexture);
      console.log('setTexture called successfully');
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
    };

    img.src = textureUrl;

    return () => {
      if (textureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(textureUrl);
      }
    };
  }, [textureUrl]);

  useEffect(() => {
    if (!meshRef.current || !heightData) return;

    const width = heightData[0].length;
    const height = heightData.length;
    const geometry = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);

    const positions = geometry.attributes.position.array as Float32Array;
    const elevationRange = maxElevation - minElevation || 1;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 3;
        const elevation = heightData[i][j];
        const normalizedHeight = (elevation - minElevation) / elevationRange;

        positions[idx + 2] = normalizedHeight * 4;
      }
    }

    const uvs = new Float32Array(width * height * 2);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 2;
        uvs[idx] = j / (width - 1);
        uvs[idx + 1] = 1 - (i / (height - 1));
      }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    console.log('Geometry updated with', width, 'x', height, 'vertices');

    meshRef.current.geometry = geometry;
  }, [heightData, minElevation, maxElevation]);

  console.log('TerrainMesh render - texture:', texture ? 'LOADED ✓' : 'not loaded');

  if (texture) {
    console.log('Rendering mesh WITH texture map');
  }

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      {texture ? (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial
          color="#e5e7eb"
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0.1}
        />
      )}
    </mesh>
  );
}

interface ThreeJSViewerProps {
  terrainData: TerrainData | null;
  selectedBounds: mapboxgl.LngLatBounds | null;
  onModelReady: (scene: THREE.Scene) => void;
}

export default function ThreeJSViewer({ terrainData, selectedBounds, onModelReady }: ThreeJSViewerProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-300 to-sky-50 rounded-lg shadow-lg overflow-hidden">
      {terrainData && selectedBounds ? (
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={5}
            maxDistance={50}
          />

          <ambientLight intensity={0.7} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
          />
          <hemisphereLight
            color="#ffffff"
            groundColor="#8b7355"
            intensity={0.4}
          />

          <TerrainMesh
            heightData={terrainData.elevations}
            minElevation={terrainData.minElevation}
            maxElevation={terrainData.maxElevation}
            textureUrl={terrainData.textureUrl}
          />

          {terrainData.labels && terrainData.labels.length > 0 && (
            <PlaceLabels
              labels={terrainData.labels}
              bounds={selectedBounds}
              minElevation={terrainData.minElevation}
              maxElevation={terrainData.maxElevation}
              elevations={terrainData.elevations}
            />
          )}
        </Canvas>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Select an area and generate a 3D map</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}
