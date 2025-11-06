import { useState } from 'react';
import { Search, MapPin, Globe, Link } from 'lucide-react';
import mapboxgl from 'mapbox-gl';

interface LocationSearchProps {
  map: mapboxgl.Map;
  onLocationFound?: () => void;
}

type SearchMode = 'address' | 'coordinates' | 'url';

export default function LocationSearch({ map, onLocationFound }: LocationSearchProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('address');
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const searchByAddress = async (address: string) => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`
    );

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Location not found');
    }

    const [lng, lat] = data.features[0].center;
    return { lng, lat, placeName: data.features[0].place_name };
  };

  const parseCoordinates = (input: string) => {
    const patterns = [
      /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/,
      /^lat[:\s]*(-?\d+\.?\d*)[,\s]*lng[:\s]*(-?\d+\.?\d*)$/i,
      /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/,
    ];

    for (const pattern of patterns) {
      const match = input.trim().match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }

    return null;
  };

  const parseGoogleMapsUrl = (url: string) => {
    const patterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }

    return null;
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      let lat: number, lng: number;

      if (searchMode === 'address') {
        const result = await searchByAddress(searchValue);
        lat = result.lat;
        lng = result.lng;
      } else if (searchMode === 'coordinates') {
        const coords = parseCoordinates(searchValue);
        if (!coords) {
          throw new Error('Invalid coordinates format. Use: lat, lng (e.g., 37.7749, -122.4194)');
        }
        lat = coords.lat;
        lng = coords.lng;
      } else {
        const coords = parseGoogleMapsUrl(searchValue);
        if (!coords) {
          throw new Error('Could not extract coordinates from URL');
        }
        lat = coords.lat;
        lng = coords.lng;
      }

      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        pitch: 45,
        duration: 2000,
      });

      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([lng, lat])
        .addTo(map);

      setTimeout(() => {
        const markers = document.querySelectorAll('.mapboxgl-marker');
        markers.forEach(marker => marker.remove());
      }, 5000);

      onLocationFound?.();
      setSearchValue('');
      setIsExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Search Location</span>
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
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSearchMode('address')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                searchMode === 'address'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MapPin size={16} />
              <span className="text-sm">Address</span>
            </button>
            <button
              onClick={() => setSearchMode('coordinates')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                searchMode === 'coordinates'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Globe size={16} />
              <span className="text-sm">Coords</span>
            </button>
            <button
              onClick={() => setSearchMode('url')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                searchMode === 'url'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Link size={16} />
              <span className="text-sm">URL</span>
            </button>
          </div>

          <div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                searchMode === 'address'
                  ? 'Enter city, address, or place name...'
                  : searchMode === 'coordinates'
                  ? 'Enter lat, lng (e.g., 37.7749, -122.4194)'
                  : 'Paste Google Maps URL...'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={isSearching}
            />
            {searchMode === 'coordinates' && (
              <p className="text-xs text-gray-500 mt-2">
                Format: latitude, longitude (e.g., 37.7749, -122.4194)
              </p>
            )}
            {searchMode === 'url' && (
              <p className="text-xs text-gray-500 mt-2">
                Paste any Google Maps link with coordinates
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={isSearching || !searchValue.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={18} />
                Go to Location
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
