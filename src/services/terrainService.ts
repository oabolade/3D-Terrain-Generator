import mapboxgl from 'mapbox-gl';

export interface PlaceLabel {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface TerrainData {
  elevations: number[][];
  minElevation: number;
  maxElevation: number;
  width: number;
  height: number;
  labels: PlaceLabel[];
  textureUrl: string;
}

export async function fetchTerrainData(
  bounds: mapboxgl.LngLatBounds,
  resolution: number = 100
): Promise<TerrainData> {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const zoom = 12;
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const elevations: number[][] = [];
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  const latStep = (ne.lat - sw.lat) / (resolution - 1);
  const lngStep = (ne.lng - sw.lng) / (resolution - 1);

  for (let i = 0; i < resolution; i++) {
    const row: number[] = [];
    const lat = sw.lat + (i * latStep);

    for (let j = 0; j < resolution; j++) {
      const lng = sw.lng + (j * lngStep);

      const tileCoords = latLngToTile(lat, lng, zoom);
      const pixelCoords = latLngToPixel(lat, lng, zoom);

      try {
        const elevation = await getElevationFromTile(
          tileCoords.x,
          tileCoords.y,
          zoom,
          pixelCoords.x,
          pixelCoords.y,
          token
        );

        row.push(elevation);
        minElevation = Math.min(minElevation, elevation);
        maxElevation = Math.max(maxElevation, elevation);
      } catch (error) {
        console.warn('Failed to fetch elevation, using fallback');
        row.push(0);
      }
    }

    elevations.push(row);
  }

  const labels = await fetchPlaceLabels(bounds);

  console.log('About to fetch map texture with bounds:', bounds);
  console.log('SW:', bounds.getSouthWest(), 'NE:', bounds.getNorthEast());

  const textureUrl = await fetchMapTexture(bounds, token);

  console.log('Texture URL result:', textureUrl ? 'success' : 'failed');

  return {
    elevations,
    minElevation: minElevation === Infinity ? 0 : minElevation,
    maxElevation: maxElevation === -Infinity ? 100 : maxElevation,
    width: resolution,
    height: resolution,
    labels,
    textureUrl,
  };
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function latLngToPixel(lat: number, lng: number, zoom: number) {
  const tile = latLngToTile(lat, lng, zoom);
  const n = Math.pow(2, zoom);
  const x = (((lng + 180) / 360) * n - tile.x) * 256;
  const y = (((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n - tile.y) * 256;
  return { x: Math.floor(x), y: Math.floor(y) };
}

const tileCache = new Map<string, ImageData>();

async function getElevationFromTile(
  tileX: number,
  tileY: number,
  zoom: number,
  pixelX: number,
  pixelY: number,
  token: string
): Promise<number> {
  const cacheKey = `${zoom}/${tileX}/${tileY}`;

  let imageData = tileCache.get(cacheKey);

  if (!imageData) {
    const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tileX}/${tileY}.pngraw?access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch terrain tile');
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.drawImage(bitmap, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    tileCache.set(cacheKey, imageData);
  }

  const clampedX = Math.max(0, Math.min(pixelX, imageData.width - 1));
  const clampedY = Math.max(0, Math.min(pixelY, imageData.height - 1));

  const idx = (clampedY * imageData.width + clampedX) * 4;
  const r = imageData.data[idx];
  const g = imageData.data[idx + 1];
  const b = imageData.data[idx + 2];

  const elevation = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);

  return elevation;
}

export async function fetchPlaceLabels(bounds: mapboxgl.LngLatBounds): Promise<PlaceLabel[]> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const centerLng = (sw.lng + ne.lng) / 2;
  const centerLat = (sw.lat + ne.lat) / 2;

  const labels: PlaceLabel[] = [];

  const placeTypes = ['place', 'poi', 'locality', 'neighborhood'];

  for (const placeType of placeTypes) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${centerLng},${centerLat}.json?types=${placeType}&bbox=${sw.lng},${sw.lat},${ne.lng},${ne.lat}&limit=10&access_token=${token}`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();

      if (data.features) {
        for (const feature of data.features) {
          const [lng, lat] = feature.center;

          if (lng >= sw.lng && lng <= ne.lng && lat >= sw.lat && lat <= ne.lat) {
            labels.push({
              name: feature.text || feature.place_name,
              lat,
              lng,
              type: placeType,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${placeType} labels:`, error);
    }
  }

  const uniqueLabels = labels.filter((label, index, self) =>
    index === self.findIndex((l) => l.name === label.name && Math.abs(l.lat - label.lat) < 0.001 && Math.abs(l.lng - label.lng) < 0.001)
  );

  return uniqueLabels.slice(0, 15);
}

export async function fetchMapTexture(
  bounds: mapboxgl.LngLatBounds,
  token: string,
  width: number = 1024,
  height: number = 1024
): Promise<string> {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  console.log('Bounds received:', { sw, ne });

  const lngDiff = Math.abs(ne.lng - sw.lng);
  const latDiff = Math.abs(ne.lat - sw.lat);

  console.log('Lng diff:', lngDiff, 'Lat diff:', latDiff);

  const lngZoom = Math.log2(360 / lngDiff);
  const latZoom = Math.log2(180 / latDiff);

  let zoom = Math.floor(Math.min(lngZoom, latZoom));
  zoom = Math.max(1, Math.min(14, zoom));

  console.log('Creating texture canvas with zoom:', zoom, 'bounds:', sw, ne);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    const tiles = getTilesForBounds(sw, ne, zoom);
    console.log('Need to fetch', tiles.length, 'tiles');

    const tileSize = 512;
    const loadedTiles = await Promise.all(
      tiles.map(async (tile) => {
        const url = `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${tile.x}/${tile.y}@2x.jpg?access_token=${token}`;

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });

          return { tile, img };
        } catch (error) {
          console.warn('Failed to load tile:', tile, error);
          return null;
        }
      })
    );

    const validTiles = loadedTiles.filter(t => t !== null);
    console.log('Loaded', validTiles.length, 'tiles successfully');

    const minTileX = Math.min(...tiles.map(t => t.x));
    const minTileY = Math.min(...tiles.map(t => t.y));
    const maxTileX = Math.max(...tiles.map(t => t.x));
    const maxTileY = Math.max(...tiles.map(t => t.y));

    const tilesWide = maxTileX - minTileX + 1;
    const tilesHigh = maxTileY - minTileY + 1;

    const scaleX = width / (tilesWide * tileSize);
    const scaleY = height / (tilesHigh * tileSize);

    // Fill with a test color first to verify canvas works
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 50, 50);
    console.log('Drew red test square at 0,0');

    validTiles.forEach(({ tile, img }) => {
      const x = (tile.x - minTileX) * tileSize * scaleX;
      const y = (tile.y - minTileY) * tileSize * scaleY;
      const w = tileSize * scaleX;
      const h = tileSize * scaleY;
      console.log(`Drawing tile ${tile.x},${tile.y} at position (${x.toFixed(1)}, ${y.toFixed(1)}) size ${w.toFixed(1)}x${h.toFixed(1)}`);
      ctx.drawImage(img, x, y, w, h);
    });

    // Check pixel data
    const imageData = ctx.getImageData(0, 0, Math.min(10, width), Math.min(10, height));
    const pixels = Array.from(imageData.data.slice(0, 40));
    console.log('First 10 pixels RGBA values:', pixels);

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          console.log('Texture blob URL created:', blobUrl);
          resolve(blobUrl);
        } else {
          console.error('Failed to create blob from canvas');
          resolve('');
        }
      }, 'image/jpeg', 0.9);
    });
  } catch (error) {
    console.error('Error creating map texture:', error);
    return '';
  }
}

function getTilesForBounds(
  sw: mapboxgl.LngLat,
  ne: mapboxgl.LngLat,
  zoom: number
): Array<{ x: number; y: number }> {
  const swTile = latLngToTile(sw.lat, sw.lng, zoom);
  const neTile = latLngToTile(ne.lat, ne.lng, zoom);

  const tiles: Array<{ x: number; y: number }> = [];

  for (let x = Math.min(swTile.x, neTile.x); x <= Math.max(swTile.x, neTile.x); x++) {
    for (let y = Math.min(swTile.y, neTile.y); y <= Math.max(swTile.y, neTile.y); y++) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

function calculateZoom(bounds: mapboxgl.LngLatBounds, width: number, height: number): number {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const lngDiff = ne.lng - sw.lng;
  const latDiff = ne.lat - sw.lat;

  const lngZoom = Math.log2(360 / lngDiff);
  const latZoom = Math.log2(180 / latDiff);

  return Math.floor(Math.min(lngZoom, latZoom));
}
