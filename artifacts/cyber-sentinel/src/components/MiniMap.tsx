import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function CenterAndMark({ lat, lon, ip }: { lat: number; lon: number; ip: string }) {
  const map = useMap();

  const icon = useMemo(() => L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:20px;height:20px">
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:10px;height:10px;
          background:#ff2244;border-radius:50%;
          border:2px solid #ff8899;
          box-shadow:0 0 12px rgba(255,34,68,0.8);
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:20px;height:20px;border-radius:50%;
          border:1px solid rgba(255,34,68,0.5);
          animation:miniRing 2s ease-out infinite;
        "></div>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  }), []);

  useEffect(() => {
    map.setView([lat, lon], 10, { animate: true });
  }, [lat, lon, map]);

  return (
    <Marker position={[lat, lon]} icon={icon}>
      <Popup>
        <div style={{ fontFamily: 'Courier New,monospace', fontSize: 12, color: '#ff8899', fontWeight: 'bold' }}>
          {ip}
        </div>
        <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
          {lat.toFixed(4)}°, {lon.toFixed(4)}°
        </div>
      </Popup>
    </Marker>
  );
}

interface MiniMapProps {
  lat: number;
  lon: number;
  ip: string;
  height?: number;
}

export default function MiniMap({ lat, lon, ip, height = 280 }: MiniMapProps) {
  if (!lat || !lon) return null;

  return (
    <div style={{ height, position: 'relative' }}>
      <style>{`
        .mini-map .leaflet-container { background: #080810 !important; }
        .mini-map .leaflet-popup-content-wrapper {
          background: rgba(8,8,16,0.97) !important;
          border: 1px solid rgba(255,34,68,0.5) !important;
          border-radius: 6px !important;
        }
        .mini-map .leaflet-popup-tip { background: rgba(8,8,16,0.97) !important; }
        .mini-map .leaflet-control-zoom a {
          background: rgba(8,8,16,0.95) !important;
          border-color: #1a1a2e !important;
          color: #00ff88 !important;
        }
        .mini-map .leaflet-bar { border-color: #1a1a2e !important; box-shadow: none !important; }
        .mini-map .leaflet-control-attribution {
          background: rgba(0,0,0,0.7) !important;
          color: #2a2a3a !important;
          font-size: 8px !important;
        }
        .mini-map .leaflet-control-attribution a { color: #333 !important; }
        @keyframes miniRing {
          0% { opacity: 0.8; transform: translate(-50%,-50%) scale(0.5); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(3); }
        }
      `}</style>
      <div className="mini-map" style={{ height: '100%', width: '100%' }}>
        <MapContainer
          center={[lat, lon]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          <CenterAndMark lat={lat} lon={lon} ip={ip} />
        </MapContainer>
      </div>
    </div>
  );
}
