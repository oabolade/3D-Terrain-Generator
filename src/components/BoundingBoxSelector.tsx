import { useState, useCallback, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface BoundingBoxSelectorProps {
  map: mapboxgl.Map;
  onConfirm: (bounds: mapboxgl.LngLatBounds) => void;
  onCancel: () => void;
}

interface BoxCoordinates {
  nw: mapboxgl.Point;
  ne: mapboxgl.Point;
  sw: mapboxgl.Point;
  se: mapboxgl.Point;
}

export default function BoundingBoxSelector({ map, onConfirm, onCancel }: BoundingBoxSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [box, setBox] = useState<BoxCoordinates | null>(null);
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  const pixelToBounds = useCallback((coords: BoxCoordinates): mapboxgl.LngLatBounds => {
    const nw = map.unproject([coords.nw.x, coords.nw.y]);
    const se = map.unproject([coords.se.x, coords.se.y]);
    return new mapboxgl.LngLatBounds(nw, se);
  }, [map]);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle || 'body');

    if (!box && !handle) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const initialBox: BoxCoordinates = {
        nw: new mapboxgl.Point(x, y),
        ne: new mapboxgl.Point(x, y),
        sw: new mapboxgl.Point(x, y),
        se: new mapboxgl.Point(x, y),
      };
      setBox(initialBox);
    }
  }, [box]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !box) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setBox((prev) => {
      if (!prev) return null;

      if (dragHandle === 'body') {
        return {
          nw: new mapboxgl.Point(Math.min(prev.nw.x, x), Math.min(prev.nw.y, y)),
          ne: new mapboxgl.Point(Math.max(prev.nw.x, x), Math.min(prev.nw.y, y)),
          sw: new mapboxgl.Point(Math.min(prev.nw.x, x), Math.max(prev.nw.y, y)),
          se: new mapboxgl.Point(Math.max(prev.nw.x, x), Math.max(prev.nw.y, y)),
        };
      }

      const width = prev.se.x - prev.nw.x;
      const height = prev.se.y - prev.nw.y;

      switch (dragHandle) {
        case 'nw':
          return {
            nw: new mapboxgl.Point(x, y),
            ne: new mapboxgl.Point(prev.se.x, y),
            sw: new mapboxgl.Point(x, prev.se.y),
            se: prev.se,
          };
        case 'ne':
          return {
            nw: new mapboxgl.Point(prev.nw.x, y),
            ne: new mapboxgl.Point(x, y),
            sw: new mapboxgl.Point(prev.nw.x, prev.se.y),
            se: new mapboxgl.Point(x, prev.se.y),
          };
        case 'sw':
          return {
            nw: new mapboxgl.Point(x, prev.nw.y),
            ne: new mapboxgl.Point(prev.se.x, prev.nw.y),
            sw: new mapboxgl.Point(x, y),
            se: new mapboxgl.Point(prev.se.x, y),
          };
        case 'se':
          return {
            nw: prev.nw,
            ne: new mapboxgl.Point(x, prev.nw.y),
            sw: new mapboxgl.Point(prev.nw.x, y),
            se: new mapboxgl.Point(x, y),
          };
        default:
          return prev;
      }
    });
  }, [isDragging, box, dragHandle]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  const handleConfirm = () => {
    if (box) {
      const bounds = pixelToBounds(box);
      onConfirm(bounds);
    }
  };

  useEffect(() => {
    const canvas = map.getCanvas();
    canvas.style.cursor = box ? 'crosshair' : 'crosshair';

    return () => {
      canvas.style.cursor = '';
    };
  }, [map, box]);

  const bounds = box ? pixelToBounds(box) : null;
  const nw = bounds?.getNorthWest();
  const se = bounds?.getSouthEast();

  return (
    <div className="absolute inset-0 z-20">
      <div
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDragging ? 'crosshair' : 'crosshair' }}
      >
        {box && (
          <>
            <div
              className="absolute"
              style={{
                left: `${box.nw.x}px`,
                top: `${box.nw.y}px`,
                width: `${box.se.x - box.nw.x}px`,
                height: `${box.se.y - box.nw.y}px`,
                border: '3px solid #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
              }}
            />

            {['nw', 'ne', 'sw', 'se'].map((handle) => {
              const pos = box[handle as keyof BoxCoordinates];
              return (
                <div
                  key={handle}
                  onMouseDown={(e) => handleMouseDown(e, handle)}
                  className="absolute w-4 h-4 bg-white border-3 border-blue-600 cursor-move hover:scale-125 transition-transform"
                  style={{
                    left: `${pos.x - 8}px`,
                    top: `${pos.y - 8}px`,
                    borderWidth: '3px',
                  }}
                />
              );
            })}
          </>
        )}
      </div>

      <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-xl shadow-xl border border-blue-500 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span className="font-semibold">Click and drag to select area</span>
        </div>
      </div>

      {box && (
        <>
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 p-4 max-w-md">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Selected Coordinates
            </h3>
            <div className="text-sm text-gray-700 space-y-1.5 font-mono bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Northwest:</span>
                <span className="font-semibold">{nw?.lat.toFixed(6)}, {nw?.lng.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Southeast:</span>
                <span className="font-semibold">{se?.lat.toFixed(6)}, {se?.lng.toFixed(6)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Width:</span>
                  <span className="font-semibold text-blue-600">{Math.abs((se?.lng || 0) - (nw?.lng || 0)).toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Height:</span>
                  <span className="font-semibold text-blue-600">{Math.abs((nw?.lat || 0) - (se?.lat || 0)).toFixed(6)}°</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Confirm Selection
            </button>
          </div>
        </>
      )}
    </div>
  );
}
