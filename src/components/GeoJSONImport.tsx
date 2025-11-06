import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

interface GeoJSONImportProps {
  map: mapboxgl.Map;
}

export default function GeoJSONImport({ map }: GeoJSONImportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; id: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);

      if (!geojson.type || (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature')) {
        throw new Error('Invalid GeoJSON format. Must be a Feature or FeatureCollection.');
      }

      const sourceId = `geojson-${Date.now()}`;
      const layerId = `${sourceId}-layer`;

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      const geometryType = geojson.type === 'FeatureCollection'
        ? geojson.features[0]?.geometry?.type
        : geojson.geometry?.type;

      if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.8,
          },
        });
      } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        map.addLayer({
          id: `${layerId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3,
          },
        });
        map.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
          },
        });
      }

      const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
      if (features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();

        features.forEach((feature: any) => {
          if (feature.geometry.type === 'Point') {
            bounds.extend(feature.geometry.coordinates);
          } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
            const coords = feature.geometry.type === 'LineString'
              ? feature.geometry.coordinates
              : feature.geometry.coordinates.flat();
            coords.forEach((coord: number[]) => bounds.extend(coord));
          } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.type === 'Polygon'
              ? feature.geometry.coordinates[0]
              : feature.geometry.coordinates.flat(2);
            coords.forEach((coord: number[]) => bounds.extend(coord));
          }
        });

        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      }

      setUploadedFiles([...uploadedFiles, { name: file.name, id: sourceId }]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse GeoJSON file');
    }
  };

  const removeLayer = (id: string, name: string) => {
    const layerId = `${id}-layer`;

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getLayer(`${layerId}-fill`)) {
      map.removeLayer(`${layerId}-fill`);
    }
    if (map.getLayer(`${layerId}-outline`)) {
      map.removeLayer(`${layerId}-outline`);
    }
    if (map.getSource(id)) {
      map.removeSource(id);
    }

    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">GeoJSON Overlay</span>
          {uploadedFiles.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {uploadedFiles.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="geojson-upload"
            />
            <label
              htmlFor="geojson-upload"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg"
            >
              <Upload size={18} />
              Import GeoJSON File
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Import trails, buildings, or other geographic features
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Active Overlays
              </label>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3 group hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeLayer(file.id, file.name)}
                    className="p-1 hover:bg-red-100 rounded-md transition-colors flex-shrink-0"
                    title="Remove overlay"
                  >
                    <X size={16} className="text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">Supported Features:</p>
            <ul className="text-xs text-blue-700 space-y-0.5">
              <li>• Points & MultiPoints (markers)</li>
              <li>• LineStrings (trails, routes)</li>
              <li>• Polygons (buildings, areas)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
