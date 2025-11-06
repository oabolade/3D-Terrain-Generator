import { useState } from 'react';
import { Layers, Mountain } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

interface MapStyleControlProps {
  map: mapboxgl.Map;
}

type MapStyle = 'outdoors' | 'satellite' | 'terrain';

const STYLE_PRESETS = {
  outdoors: {
    name: 'Outdoors',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    description: 'Natural terrain with labels',
  },
  satellite: {
    name: 'Satellite',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    description: 'Satellite imagery with streets',
  },
  terrain: {
    name: 'Terrain',
    style: 'mapbox://styles/mapbox/terrain-v12',
    description: 'Topographic with contours',
  },
};

export default function MapStyleControl({ map }: MapStyleControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyle>('outdoors');
  const [showContours, setShowContours] = useState(false);

  const handleStyleChange = (style: MapStyle) => {
    setCurrentStyle(style);
    map.setStyle(STYLE_PRESETS[style].style);

    map.once('style.load', () => {
      if (showContours && style !== 'terrain') {
        addContourLayer();
      }
    });
  };

  const addContourLayer = () => {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }

    if (!map.getLayer('contour-lines')) {
      map.addLayer({
        id: 'contour-lines',
        type: 'line',
        source: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2',
        },
        'source-layer': 'contour',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#877b59',
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            10, 0.5,
            14, 1,
            18, 2
          ],
          'line-opacity': 0.7,
        },
      });
    }
  };

  const removeContourLayer = () => {
    if (map.getLayer('contour-lines')) {
      map.removeLayer('contour-lines');
    }
  };

  const toggleContours = () => {
    const newShowContours = !showContours;
    setShowContours(newShowContours);

    if (currentStyle === 'terrain') {
      return;
    }

    if (newShowContours) {
      addContourLayer();
    } else {
      removeContourLayer();
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Map Style</span>
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
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Style Presets
            </label>
            {(Object.keys(STYLE_PRESETS) as MapStyle[]).map((styleKey) => {
              const preset = STYLE_PRESETS[styleKey];
              return (
                <button
                  key={styleKey}
                  onClick={() => handleStyleChange(styleKey)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    currentStyle === styleKey
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className={`text-xs mt-1 ${
                    currentStyle === styleKey ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-200">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Overlay Options
            </label>
            <button
              onClick={toggleContours}
              disabled={currentStyle === 'terrain'}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                showContours && currentStyle !== 'terrain'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } ${currentStyle === 'terrain' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Mountain size={18} />
                <div>
                  <div className="font-semibold">Contour Lines</div>
                  <div className={`text-xs mt-0.5 ${
                    showContours && currentStyle !== 'terrain' ? 'text-emerald-100' : 'text-gray-500'
                  }`}>
                    {currentStyle === 'terrain'
                      ? 'Included in terrain style'
                      : 'Show elevation contours'}
                  </div>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all ${
                showContours && currentStyle !== 'terrain' ? 'bg-emerald-400' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform m-0.5 ${
                  showContours && currentStyle !== 'terrain' ? 'translate-x-6' : ''
                }`} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
