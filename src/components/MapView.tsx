import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BoundingBoxSelector from './BoundingBoxSelector';
import LocationSearch from './LocationSearch';
import MapStyleControl from './MapStyleControl';
import GeoJSONImport from './GeoJSONImport';

interface MapViewProps {
  onAreaSelected: (bounds: mapboxgl.LngLatBounds) => void;
  isSelecting: boolean;
  onCancelSelection: () => void;
}

export default function MapView({ onAreaSelected, isSelecting, onCancelSelection }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    console.log('Mapbox token exists:', !!token);
    console.log('Token starts with pk.:', token?.startsWith('pk.'));

    if (!token || token === 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJleGFtcGxlIn0.example') {
      setError('Mapbox token required. Get one free at https://mapbox.com');
      setIsLoading(false);
      return;
    }

    mapboxgl.accessToken = token;
    console.log('Initializing Mapbox map...');

    // Wait for next frame to ensure container is fully rendered
    requestAnimationFrame(() => {
      if (!mapContainer.current || map.current) return;

      try {
        console.log('Creating map instance...');
        console.log('Container ready - dimensions:', mapContainer.current.offsetWidth, 'x', mapContainer.current.offsetHeight);

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [-122.4194, 37.7749],
          zoom: 12,
          pitch: 45,
        });

      console.log('Map instance created, waiting for load event');

      // Set a timeout to hide loading overlay if the load event doesn't fire
      const loadTimeout = setTimeout(() => {
        console.log('⚠️ Load event timeout - forcing map to show');
        if (map.current) {
          const canvas = map.current.getCanvas();
          console.log('Canvas exists:', !!canvas);
          console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
          console.log('Container dimensions:', mapContainer.current?.offsetWidth, 'x', mapContainer.current?.offsetHeight);
          console.log('Map loaded:', map.current.loaded());
          console.log('Map style loaded:', map.current.isStyleLoaded());

          // Force a resize
          map.current.resize();
        }
        setIsLoading(false);
      }, 3000);

      map.current.on('load', () => {
        clearTimeout(loadTimeout);
        setIsLoading(false);
        console.log('✅ Map loaded successfully');
      });

      map.current.on('idle', () => {
        clearTimeout(loadTimeout);
        setIsLoading(false);
        console.log('✅ Map idle - ready for interaction');
      });

      map.current.on('error', (e) => {
        clearTimeout(loadTimeout);
        console.error('❌ Map error event:', e);
        console.error('Error details:', JSON.stringify(e, null, 2));
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
        setIsLoading(false);
      });

      map.current.on('style.load', () => {
        console.log('Map style loaded');
      });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Failed to initialize map. Please check your token.');
        setIsLoading(false);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const handleConfirmSelection = (bounds: mapboxgl.LngLatBounds) => {
    onAreaSelected(bounds);
  };

  return (
    <div className="relative w-full h-full">
      {error ? (
        <div className="w-full h-full rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 to-white border border-gray-200 flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mapbox Token Required</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Get Free Token
            </a>
            <p className="text-sm text-gray-500 mt-4">Add <code className="bg-gray-100 px-2 py-1 rounded text-xs">VITE_MAPBOX_TOKEN</code> to your .env file</p>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-gray-200" style={{ minHeight: '400px' }} />
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <div className="text-gray-700 font-semibold">Loading map...</div>
              </div>
            </div>
          )}
          {!isSelecting && !isLoading && map.current && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md z-10 space-y-3">
              <LocationSearch map={map.current} />
              <MapStyleControl map={map.current} />
              <GeoJSONImport map={map.current} />
            </div>
          )}
          {isSelecting && map.current && !isLoading && (
            <BoundingBoxSelector
              map={map.current}
              onConfirm={handleConfirmSelection}
              onCancel={onCancelSelection}
            />
          )}
        </>
      )}
    </div>
  );
}
