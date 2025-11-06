import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { PlaceLabel } from '../services/terrainService';
import mapboxgl from 'mapbox-gl';

interface PlaceLabelsProps {
  labels: PlaceLabel[];
  bounds: mapboxgl.LngLatBounds;
  minElevation: number;
  maxElevation: number;
  elevations: number[][];
}

export default function PlaceLabels({
  labels,
  bounds,
  minElevation,
  maxElevation,
  elevations,
}: PlaceLabelsProps) {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const latRange = ne.lat - sw.lat;
  const lngRange = ne.lng - sw.lng;
  const elevationRange = maxElevation - minElevation || 1;

  const getPositionForLabel = (label: PlaceLabel): [number, number, number] => {
    const normalizedLng = (label.lng - sw.lng) / lngRange;
    const normalizedLat = (label.lat - sw.lat) / latRange;

    const x = (normalizedLng - 0.5) * 10;
    const z = (normalizedLat - 0.5) * 10;

    const gridX = Math.floor(normalizedLat * (elevations.length - 1));
    const gridY = Math.floor(normalizedLng * (elevations[0].length - 1));

    const clampedX = Math.max(0, Math.min(gridX, elevations.length - 1));
    const clampedY = Math.max(0, Math.min(gridY, elevations[0].length - 1));

    const elevation = elevations[clampedX]?.[clampedY] || 0;
    const normalizedHeight = (elevation - minElevation) / elevationRange;
    const y = normalizedHeight * 4 + 0.1;

    return [x, y, z];
  };

  return (
    <>
      {labels.map((label, index) => {
        const [x, y, z] = getPositionForLabel(label);
        const isPrimary = label.type === 'place';

        return (
          <group key={`${label.name}-${index}`} position={[x, y, z]}>
            <Html
              center
              distanceFactor={6}
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  color: '#1a1a1a',
                  padding: '2px 6px',
                  fontSize: isPrimary ? '13px' : '10px',
                  fontWeight: isPrimary ? '600' : '500',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 3px white, 0 0 5px white, 0 0 8px white',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.02em',
                }}
              >
                {label.name}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
