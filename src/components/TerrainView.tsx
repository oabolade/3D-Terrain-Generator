import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainData } from '../services/terrainService';
import mapboxgl from 'mapbox-gl';
import PlaceLabels from './PlaceLabels';
import { Palette } from 'lucide-react';

type TerrainStyle = 'satellite' | 'shaded' | 'flat';

interface TerrainMeshProps {
  heightData: number[][];
  minElevation: number;
  maxElevation: number;
  textureUrl: string;
  heightExaggeration: number;
  style: TerrainStyle;
}

function TerrainMesh({
  heightData,
  minElevation,
  maxElevation,
  textureUrl,
  heightExaggeration,
  style
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!textureUrl) return;

    if (textureRef.current) {
      if (!texture) {
        setTexture(textureRef.current);
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const loadedTexture = new THREE.Texture(img);
      loadedTexture.needsUpdate = true;
      loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
      loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      loadedTexture.flipY = false;
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      textureRef.current = loadedTexture;
      setTexture(loadedTexture);
    };

    img.onerror = (error) => {
      console.error('Error loading texture:', error);
    };

    img.src = textureUrl;
  }, [textureUrl, texture]);

  useEffect(() => {
    if (style === 'satellite' && textureRef.current && !texture) {
      setTexture(textureRef.current);
    }
  }, [style, texture]);

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

        positions[idx + 2] = normalizedHeight * 4 * heightExaggeration;
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

    meshRef.current.geometry = geometry;
  }, [heightData, minElevation, maxElevation, heightExaggeration]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      {style === 'satellite' ? (
        texture ? (
          <meshBasicMaterial
            key="satellite"
            map={texture}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            key="satellite-loading"
            color="#cccccc"
            side={THREE.DoubleSide}
          />
        )
      ) : style === 'flat' ? (
        <meshBasicMaterial
          key="flat"
          color="#8b9467"
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial
          key="shaded"
          color="#a8b88f"
          side={THREE.DoubleSide}
          roughness={0.85}
          metalness={0.05}
        />
      )}
    </mesh>
  );
}

interface TerrainViewProps {
  terrainData: TerrainData | null;
  selectedBounds: mapboxgl.LngLatBounds | null;
  onModelReady?: (scene: THREE.Scene) => void;
}

export interface TerrainViewRef {
  exportPNG: () => void;
  exportSTL: () => void;
  getHeightExaggeration: () => number;
}

function generateSTL(geometry: THREE.BufferGeometry): string {
  const vertices = geometry.attributes.position;
  const indices = geometry.index;

  let stl = 'solid terrain\n';

  if (indices) {
    for (let i = 0; i < indices.count; i += 3) {
      const i1 = indices.getX(i);
      const i2 = indices.getX(i + 1);
      const i3 = indices.getX(i + 2);

      const v1 = new THREE.Vector3(
        vertices.getX(i1),
        vertices.getY(i1),
        vertices.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        vertices.getX(i2),
        vertices.getY(i2),
        vertices.getZ(i2)
      );
      const v3 = new THREE.Vector3(
        vertices.getX(i3),
        vertices.getY(i3),
        vertices.getZ(i3)
      );

      const normal = new THREE.Vector3();
      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      normal.crossVectors(edge1, edge2).normalize();

      stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
      stl += `    outer loop\n`;
      stl += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
      stl += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
      stl += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
      stl += `    endloop\n`;
      stl += `  endfacet\n`;
    }
  }

  stl += 'endsolid terrain\n';
  return stl;
}

interface SceneCaptureProps {
  onModelReady?: (scene: THREE.Scene, gl: THREE.WebGLRenderer) => void;
}

function SceneCapture({ onModelReady }: SceneCaptureProps) {
  const { scene, gl } = useThree();

  useEffect(() => {
    if (onModelReady) {
      onModelReady(scene, gl);
    }
  }, [scene, gl, onModelReady]);

  return null;
}

const TerrainView = forwardRef<TerrainViewRef, TerrainViewProps>(({
  terrainData,
  selectedBounds,
  onModelReady
}, ref) => {
  const [heightExaggeration, setHeightExaggeration] = useState(1);
  const [terrainStyle, setTerrainStyle] = useState<TerrainStyle>('satellite');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      if (!glRef.current) {
        console.error('WebGL renderer not available');
        return;
      }

      try {
        const canvas = glRef.current.domElement;

        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Failed to create blob from canvas');
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = '3d-terrain-map.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 'image/png', 1.0);
      } catch (error) {
        console.error('Error exporting PNG:', error);
      }
    },
    exportSTL: () => {
      if (!sceneRef.current || !terrainData) return;

      const terrainMesh = sceneRef.current.children.find(
        (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
      ) as THREE.Mesh | undefined;

      if (!terrainMesh) return;

      const geometry = terrainMesh.geometry.clone();
      geometry.rotateX(-Math.PI / 2);

      const stlString = generateSTL(geometry);
      const blob = new Blob([stlString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '3d-terrain-map.stl';
      link.click();
      URL.revokeObjectURL(url);
    },
    getHeightExaggeration: () => heightExaggeration
  }));

  return (
    <div ref={canvasRef} className="w-full h-full bg-gradient-to-b from-sky-300 to-sky-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
      {terrainData && selectedBounds ? (
        <>
          <Canvas shadows>
            <SceneCapture onModelReady={(scene, gl) => {
              sceneRef.current = scene;
              glRef.current = gl;
              onModelReady?.(scene);
            }} />
            <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxPolarAngle={Math.PI / 2}
              minDistance={5}
              maxDistance={50}
            />

            <ambientLight intensity={0.6} />
            <directionalLight
              position={[20, 30, 10]}
              intensity={1.0}
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
              intensity={0.3}
            />

            <TerrainMesh
              heightData={terrainData.elevations}
              minElevation={terrainData.minElevation}
              maxElevation={terrainData.maxElevation}
              textureUrl={terrainData.textureUrl}
              heightExaggeration={heightExaggeration}
              style={terrainStyle}
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

          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 p-4 w-64 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Height Exaggeration: <span className="text-blue-600">{heightExaggeration.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={heightExaggeration}
                onChange={(e) => setHeightExaggeration(parseFloat(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
              />
              <div className="flex justify-between text-xs font-medium text-gray-500 mt-2">
                <span>0.5x</span>
                <span>5x</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Palette size={16} className="text-blue-600" />
                Terrain Style
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setTerrainStyle('satellite')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    terrainStyle === 'satellite'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setTerrainStyle('shaded')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    terrainStyle === 'shaded'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Shaded Relief
                </button>
                <button
                  onClick={() => setTerrainStyle('flat')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    terrainStyle === 'flat'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Flat Color
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Box className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">Ready to Generate</p>
            <p className="text-sm text-gray-500">Select an area on the map and click Generate 3D Terrain</p>
          </div>
        </div>
      )}
    </div>
  );
});

TerrainView.displayName = 'TerrainView';

export default TerrainView;

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
