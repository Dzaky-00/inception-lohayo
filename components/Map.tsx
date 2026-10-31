'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

import L from 'leaflet';

// Fix ikon default Leaflet di Next.js
const icon = L.icon({
iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
iconSize: [25, 41],
iconAnchor: [12, 41],
});

export default function Map({ usulanData }: { usulanData: any[] }) {
return (
    <MapContainer 
    center={[-7.250445, 112.768845]} 
    zoom={13} 
    style={{ height: "600px", width: "100%" }} /* INI KUNCINYA */
    className="rounded-lg z-0"
    >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {/* Nanti di-mapping dari database */}
    <Marker position={[-7.250445, 112.768845]} icon={icon}>
        <Popup>Contoh Titik Desa</Popup>
    </Marker>
    </MapContainer>
);
}   