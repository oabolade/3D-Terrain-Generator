import { useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapView from './components/MapView';
import ControlPanel from './components/ControlPanel';
import TerrainView, { TerrainViewRef } from './components/TerrainView';
import axios from 'axios';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { fetchTerrainData, TerrainData } from './services/terrainService';

function App() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScene, setCurrentScene] = useState<THREE.Scene | null>(null);
  const terrainViewRef = useRef<TerrainViewRef>(null);

  const handleSelectArea = () => {
    setIsSelecting(true);
  };

  const handleAreaSelected = (bounds: mapboxgl.LngLatBounds) => {
    setSelectedBounds(bounds);
    setIsSelecting(false);
  };

  const handleCancelSelection = () => {
    setIsSelecting(false);
  };

  const handleGenerate3D = async () => {
    if (!selectedBounds) {
      console.log('No bounds selected');
      return;
    }

    console.log('=== STARTING 3D GENERATION ===');
    console.log('Selected bounds:', selectedBounds.toString());
    setIsGenerating(true);

    try {
      console.log('Calling fetchTerrainData...');
      const data = await fetchTerrainData(selectedBounds, 80);
      console.log('Terrain data received:', {
        width: data.width,
        height: data.height,
        textureUrlLength: data.textureUrl.length,
        textureUrlType: data.textureUrl.substring(0, 20)
      });
      setTerrainData(data);
    } catch (error) {
      console.error('Failed to fetch terrain data:', error);
      alert('Failed to fetch terrain data. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportGLB = () => {
    if (!currentScene) {
      alert('No 3D model to export. Please generate a 3D map first.');
      return;
    }

    const exporter = new GLTFExporter();
    exporter.parse(
      currentScene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '3d-terrain-map.glb';
        link.click();
        URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Export error:', error);
        alert('Failed to export model');
      },
      { binary: true }
    );
  };

  const handleExportPNG = () => {
    if (!terrainData) {
      alert('No 3D model to export. Please generate a 3D map first.');
      return;
    }

    terrainViewRef.current?.exportPNG();
  };

  const handleExportSTL = () => {
    if (!terrainData) {
      alert('No 3D model to export. Please generate a 3D map first.');
      return;
    }

    terrainViewRef.current?.exportSTL();
  };

  const handleSendToMake = async () => {
    if (!terrainData || !selectedBounds) {
      alert('No 3D model to send. Please generate a 3D map first.');
      return;
    }

    const webhookUrl = import.meta.env.VITE_MAKE_WEBHOOK_URL || '';

    if (!webhookUrl) {
      alert('Make.com webhook URL not configured. Add VITE_MAKE_WEBHOOK_URL to your .env file.');
      return;
    }

    const sw = selectedBounds.getSouthWest();
    const ne = selectedBounds.getNorthEast();
    const heightExaggeration = terrainViewRef.current?.getHeightExaggeration() || 1;

    const payload = {
      map_id: crypto.randomUUID(),
      coordinates: [sw.lng, sw.lat, ne.lng, ne.lat],
      height_exaggeration: heightExaggeration,
      export_type: 'GLB',
      timestamp: new Date().toISOString(),
      metadata: {
        terrainSize: {
          width: terrainData.width,
          height: terrainData.height,
        },
        elevationRange: {
          min: terrainData.minElevation,
          max: terrainData.maxElevation,
        },
        labelCount: terrainData.labels.length,
      }
    };

    try {
      await axios.post(webhookUrl, payload);
      alert('Successfully sent to Make.com!');
    } catch (error) {
      console.error('Error sending to Make.com:', error);
      alert('Failed to send to Make.com');
    }
  };

  const handleModelReady = (scene: THREE.Scene) => {
    setCurrentScene(scene);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">3D Terrain Generator</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-0.5">Create stunning 3D terrain visualizations from any location</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="h-[400px] sm:h-[500px]">
              <MapView
                onAreaSelected={handleAreaSelected}
                isSelecting={isSelecting}
                onCancelSelection={handleCancelSelection}
              />
            </div>

            <div className="h-[400px] sm:h-[500px]">
              <TerrainView
                ref={terrainViewRef}
                terrainData={terrainData}
                selectedBounds={selectedBounds}
                onModelReady={handleModelReady}
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <ControlPanel
              onSelectArea={handleSelectArea}
              onGenerate3D={handleGenerate3D}
              onExportGLB={handleExportGLB}
              onExportPNG={handleExportPNG}
              onExportSTL={handleExportSTL}
              onSendToMake={handleSendToMake}
              isSelecting={isSelecting}
              hasSelection={!!selectedBounds}
              isGenerating={isGenerating}
              has3DModel={!!terrainData}
            />
          </div>
        </div>
      </main>

      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2">
              <span>Elevation data © Mapbox</span>
              <span>Terrain data © SRTM</span>
              <span>Satellite imagery © Mapbox</span>
            </div>
            <div className="text-gray-500">
              Built with React, Three.js & Mapbox GL
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
