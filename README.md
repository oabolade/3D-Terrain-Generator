# 3D Terrain Generator

A modern web application that creates stunning 3D terrain visualizations from any location worldwide. Built with React, Three.js, and Mapbox GL.

## Features

- **Interactive Map Selection**: Click and drag to select any area on the interactive Mapbox map
- **Location Search**: Find locations using three different methods:
  - Address/Place Name (e.g., "San Francisco", "Mount Everest")
  - Coordinates (e.g., "37.7749, -122.4194")
  - Google Maps URL (paste any Google Maps link)
- **Map Customization**:
  - Three map style presets (Outdoors, Satellite, Terrain)
  - Contour line overlay toggle for elevation visualization
- **GeoJSON Import**: Overlay trails, buildings, or other geographic features from GeoJSON files
- **3D Terrain Visualization**: Real-time 3D terrain generation with adjustable height exaggeration
- **Terrain Style Presets**: Switch between Satellite, Shaded Relief, and Flat Color styles
- **Place Labels**: Automatic labeling of nearby cities and landmarks in 3D space
- **Export Options**:
  - GLB format (3D model for use in Blender, Unity, etc.)
  - PNG format (screenshot of the current view)
  - STL format (optimized for 3D printing)
- **Make.com Integration**: Send terrain data to Make.com webhooks for automation workflows
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Prerequisites

Before you begin, you'll need:

- Node.js 18+ and npm
- A Mapbox account (free tier available)
- (Optional) A Make.com account for webhook integration

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Get Your Mapbox Token

Mapbox is required for the map display and terrain data.

1. **Create a Mapbox Account**
   - Go to [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/)
   - Sign up for a free account (no credit card required for development)

2. **Create an Access Token**
   - Once logged in, go to [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
   - Click "Create a token" or use your default public token
   - Copy the token (it starts with `pk.`)

3. **Add Token to Environment**
   - Open the `.env` file in the project root
   - Replace the `VITE_MAPBOX_TOKEN` value with your token:
   ```
   VITE_MAPBOX_TOKEN=pk.your_actual_token_here
   ```

### 3. (Optional) Set Up Make.com Webhook

The Make.com integration allows you to send terrain data to automation workflows.

1. **Create a Make.com Account**
   - Go to [https://www.make.com/en/register](https://www.make.com/en/register)
   - Sign up for a free account

2. **Create a New Scenario**
   - In your Make.com dashboard, click "Create a new scenario"
   - Add a "Webhooks" module as the first step
   - Choose "Custom webhook"
   - Click "Add" to create a new webhook
   - Copy the webhook URL provided

3. **Configure Your Webhook**
   - The webhook will receive JSON data with this structure:
   ```json
   {
     "map_id": "unique-uuid",
     "coordinates": [lng1, lat1, lng2, lat2],
     "height_exaggeration": 2.0,
     "export_type": "GLB",
     "timestamp": "2025-11-06T10:00:00Z",
     "metadata": {
       "terrainSize": { "width": 80, "height": 80 },
       "elevationRange": { "min": 0, "max": 1500 },
       "labelCount": 5
     }
   }
   ```

4. **Add Webhook URL to Environment**
   - Open the `.env` file
   - Add your webhook URL:
   ```
   VITE_MAKE_WEBHOOK_URL=https://hook.us1.make.com/your_webhook_id
   ```

5. **Test the Integration**
   - In the app, generate a 3D terrain
   - Click "Send to Make.com"
   - Check your Make.com scenario to see the received data

### 4. Environment Variables

Your `.env` file should contain:

```bash
# Required: Mapbox token for map and terrain data
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Optional: Make.com webhook URL for automation
VITE_MAKE_WEBHOOK_URL=https://hook.us1.make.com/your_webhook_id

# Supabase (pre-configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage Guide

### Creating a 3D Terrain

1. **Find Your Location**
   - Click "Search Location" in the top-left of the map
   - Choose your search method (Address, Coordinates, or URL)
   - Enter your location and click "Go to Location"
   - The map will fly to your chosen location

2. **Customize Map View (Optional)**
   - Click "Map Style" to change between Outdoors, Satellite, or Terrain views
   - Toggle "Contour Lines" to show elevation lines on the map
   - Click "GeoJSON Overlay" to import trail maps, buildings, or other features

3. **Select Area**
   - Click "Select Area on Map" in the control panel
   - Click and drag on the map to draw a selection box
   - Adjust the corners by dragging the handles
   - Click "Confirm Selection"

4. **Generate 3D Terrain**
   - Click "Generate 3D Terrain"
   - Wait for the elevation data to load
   - Your 3D terrain will appear in the viewer below

5. **Customize 3D Terrain**
   - Use the "Height Exaggeration" slider to adjust the vertical scale (0.5x to 5x)
   - Choose a terrain style:
     - **Satellite**: Real satellite imagery texture
     - **Shaded Relief**: Natural terrain coloring with lighting
     - **Flat Color**: Minimalist single-color rendering
   - Rotate, pan, and zoom the 3D view with your mouse

6. **Export or Share**
   - **Export GLB**: Download 3D model for Blender, Unity, or other 3D software
   - **Export PNG**: Save a screenshot of your current view
   - **Export STL**: Download optimized file for 3D printing
   - **Send to Make.com**: Send terrain data to your automation workflow

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **3D Rendering**: Three.js with React Three Fiber
- **Mapping**: Mapbox GL JS
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend**: Supabase (for future data persistence)

## API Credits

- Elevation data © Mapbox
- Terrain data © SRTM (Shuttle Radar Topography Mission)
- Satellite imagery © Mapbox
- Geocoding © Mapbox

## Troubleshooting

### Map Not Loading

- Verify your Mapbox token is correct in `.env`
- Check browser console for error messages
- Ensure you're not exceeding Mapbox's free tier limits

### Location Search Not Working

- Verify your Mapbox token has geocoding permissions
- Check your internet connection
- Try different search formats (address vs coordinates)

### Make.com Integration Not Working

- Verify the webhook URL is correct
- Ensure the webhook scenario is active in Make.com
- Check browser console for error messages

### 3D Model Not Generating

- Ensure you've selected an area on the map
- Try a smaller area if the selection is too large
- Check that the selected area has terrain data (avoid oceans)

## Development

### Project Structure

```
src/
├── components/
│   ├── BoundingBoxSelector.tsx  # Area selection tool
│   ├── ControlPanel.tsx         # Main control interface
│   ├── LocationSearch.tsx       # Location search with multiple modes
│   ├── MapView.tsx              # Mapbox map component
│   ├── PlaceLabels.tsx          # 3D labels for places
│   ├── TerrainView.tsx          # 3D terrain viewer
│   └── ThreeJSViewer.tsx        # Three.js setup
├── services/
│   └── terrainService.ts        # Terrain data fetching and processing
├── App.tsx                      # Main application
└── main.tsx                     # Entry point
```

### Key Libraries

- `mapbox-gl`: Map display and terrain data
- `three`: 3D rendering engine
- `@react-three/fiber`: React renderer for Three.js
- `@react-three/drei`: Useful helpers for React Three Fiber
- `axios`: HTTP client for API requests
- `lucide-react`: Icon library

## License

This project is open source and available for educational and personal use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your environment variables are set correctly
3. Check the browser console for error messages
