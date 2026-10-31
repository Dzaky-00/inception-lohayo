'use client';
import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast'; // <-- Import notifikasi baru
import { supabase } from './supabase';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const parseLokasi = (lokasiData: any): L.LatLngTuple | null => {
  if (!lokasiData) return null;
  if (typeof lokasiData === 'string') {
    const match = lokasiData.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/);
    if (match) return [parseFloat(match[2]), parseFloat(match[1])];
  }
  if (typeof lokasiData === 'object' && lokasiData.coordinates) {
    return [lokasiData.coordinates[1], lokasiData.coordinates[0]];
  }
  return null;
};

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

export default function Map({ usulanData }: { usulanData: any[] }) {
  const [newPin, setNewPin] = useState<L.LatLng | null>(null);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [daftarUsulan, setDaftarUsulan] = useState<any[]>([]);
  
  const markerRef = useRef<any>(null);

  const fetchUsulan = async () => {
    const { data, error } = await supabase
      .from('usulan')
      .select('*'); // Jika sudah tambah kolom created_at, tambahkan .order('created_at', { ascending: false })

    if (error) {
      toast.error("Gagal mengambil data usulan dari server");
    } else {
      setDaftarUsulan(data || []);
    }
  };

  useEffect(() => {
    fetchUsulan();
  }, []);

  useEffect(() => {
    if (newPin && markerRef.current) {
      setTimeout(() => markerRef.current?.openPopup(), 100);
    }
  }, [newPin]);

  const handleCancel = () => {
    setNewPin(null);
    setJudul('');
    setDeskripsi('');
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!judul || !newPin) {
      toast.error("Judul usulan tidak boleh kosong!"); // <-- Mengganti alert
      return;
    }
    
    setIsSubmitting(true);
    // Menggunakan toast.promise untuk menampilkan animasi loading
    const prosesUpload = async () => {
      let foto_url = '';
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('proposal-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('proposal-images').getPublicUrl(fileName);
        foto_url = publicUrlData.publicUrl;
      }

      const pointLokasi = `POINT(${newPin.lng} ${newPin.lat})`;
      const { error: insertError } = await supabase.from('usulan').insert([
        { judul, deskripsi, lokasi: pointLokasi, foto_url, status: 'pending', total_token: 0 }
      ]);
      if (insertError) throw insertError;
      
      handleCancel();
      fetchUsulan();
    };

    // Eksekusi proses dengan notifikasi interaktif
    toast.promise(prosesUpload(), {
      loading: 'Mengirim usulan...',
      success: 'Berhasil! Usulan kamu telah masuk ke sistem.',
      error: (err) => `Terjadi kesalahan: ${err.message}`,
    });

    setIsSubmitting(false);
  };

  return (
    <MapContainer 
      center={[-7.250445, 112.768845]} 
      zoom={13} 
      style={{ height: "600px", width: "100%" }}
      className="rounded-lg z-0 shadow-md border border-gray-200"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapClickHandler onMapClick={setNewPin} />

      {daftarUsulan.map((usulan) => {
        const coords = parseLokasi(usulan.lokasi);
        if (!coords) return null;
        return (
          <Marker key={usulan.id} position={coords} icon={icon}>
            <Popup minWidth={250}>
              <div className="flex flex-col gap-2">
                {usulan.foto_url && (
                  <img src={usulan.foto_url} alt={usulan.judul} className="w-full h-32 object-cover rounded-md mb-1" />
                )}
                <h3 className="font-bold text-gray-800 text-base">{usulan.judul}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{usulan.deskripsi}</p>
                <div className="mt-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full w-fit capitalize">
                  Status: {usulan.status}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {newPin && (
        <Marker position={newPin} icon={icon} ref={markerRef}>
          <Popup minWidth={250} closeButton={false}>
            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 text-base">Buat Usulan Baru</h3>
              <input 
                type="text" 
                placeholder="Judul (Mis: Jalan Berlubang)" 
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <textarea 
                placeholder="Deskripsi detail..." 
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-sm w-full h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files) setFile(e.target.files[0]);
                }}
                className="text-xs w-full text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md font-medium transition text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                  disabled={isSubmitting}
                  className={`flex-1 ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-3 rounded-md font-medium transition text-sm`}
                >
                  Ajukan
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}