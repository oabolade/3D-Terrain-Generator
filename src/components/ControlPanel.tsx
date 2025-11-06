import { MapPin, Box, Download, Send, Image, Printer } from 'lucide-react';

interface ControlPanelProps {
  onSelectArea: () => void;
  onGenerate3D: () => void;
  onExportGLB: () => void;
  onExportPNG: () => void;
  onExportSTL: () => void;
  onSendToMake: () => void;
  isSelecting: boolean;
  hasSelection: boolean;
  isGenerating: boolean;
  has3DModel: boolean;
}

export default function ControlPanel({
  onSelectArea,
  onGenerate3D,
  onExportGLB,
  onExportPNG,
  onExportSTL,
  onSendToMake,
  isSelecting,
  hasSelection,
  isGenerating,
  has3DModel,
}: ControlPanelProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Workflow</h2>
        <p className="text-sm text-gray-500 mt-1">Follow these steps to create your 3D terrain</p>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Step 1</div>
        <button
          onClick={onSelectArea}
          disabled={isSelecting || isGenerating}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg ${
            isSelecting
              ? 'bg-blue-600 text-white'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none'
          }`}
        >
          <MapPin size={20} />
          {isSelecting ? 'Selecting Area...' : 'Select Area on Map'}
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Step 2</div>
        <button
          onClick={onGenerate3D}
          disabled={!hasSelection || isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:shadow-none"
        >
          <Box size={20} />
          {isGenerating ? (
            <>
              <span className="animate-pulse">Generating...</span>
            </>
          ) : (
            'Generate 3D Terrain'
          )}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-5 space-y-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Export & Share</div>

        <div className="space-y-2">
          <button
            onClick={onExportGLB}
            disabled={!has3DModel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            <Download size={18} />
            Export GLB
          </button>

          <button
            onClick={onExportPNG}
            disabled={!has3DModel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            <Image size={18} />
            Export PNG
          </button>

          <button
            onClick={onExportSTL}
            disabled={!has3DModel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            <Printer size={18} />
            Export STL (3D Print)
          </button>

          <button
            onClick={onSendToMake}
            disabled={!has3DModel}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-200 disabled:to-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none"
          >
            <Send size={18} />
            Send to Make.com
          </button>
        </div>
      </div>
    </div>
  );
}
