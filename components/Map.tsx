'use client';

import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

// Konfigurasi aset ikon default Leaflet
const iconDefault = L.icon({
iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
iconSize: [25, 41],
iconAnchor: [12, 41],
popupAnchor: [1, -34],
shadowSize: [41, 41],
});

// Parser koordinat untuk PostGIS WKT, GeoJSON, atau objek lat-lng
const parseLokasi = (lokasiData: any): L.LatLngTuple | null => {
if (!lokasiData) return null;
if (typeof lokasiData === 'string') {
    const match = lokasiData.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/i);
    if (match) return [parseFloat(match[2]), parseFloat(match[1])];
}
if (typeof lokasiData === 'object') {
    if (Array.isArray(lokasiData.coordinates) && lokasiData.coordinates.length >= 2) {
    return [lokasiData.coordinates[1], lokasiData.coordinates[0]];
    }
    if ('lat' in lokasiData && 'lng' in lokasiData) {
    return [lokasiData.lat, lokasiData.lng];
    }
}
return null;
};

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
useMapEvents({
    click(e) {
    onMapClick(e.latlng);
    },
});
return null;
}

interface MapProps {
usulanData?: any[];
onVote?: (jumlahToken: number) => boolean;
}

export default function Map({ usulanData = [], onVote }: MapProps) {
const [newPin, setNewPin] = useState<L.LatLng | null>(null);
const [judul, setJudul] = useState('');
const [deskripsi, setDeskripsi] = useState('');
const [kategori, setKategori] = useState('Drainase');
const [file, setFile] = useState<File | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [daftarUsulan, setDaftarUsulan] = useState<any[]>([]);

const markerRef = useRef<any>(null);

// Ambil data dari Supabase dengan fallback ke data props
const fetchUsulan = async () => {
    const { data, error } = await supabase.from('usulan').select('*');

    if (error) {
    toast.error('Gagal mengambil data usulan dari server');
    if (usulanData.length > 0) {
        setDaftarUsulan(usulanData);
    }
    } else {
    setDaftarUsulan(data && data.length > 0 ? data : usulanData);
    }
};

useEffect(() => {
    fetchUsulan();
}, []);

// Buka popup otomatis saat pengguna menentukan titik baru di peta
useEffect(() => {
    if (newPin && markerRef.current) {
    const timer = setTimeout(() => markerRef.current?.openPopup(), 100);
    return () => clearTimeout(timer);
    }
}, [newPin]);

const handleCancel = () => {
    setNewPin(null);
    setJudul('');
    setDeskripsi('');
    setKategori('Drainase');
    setFile(null);
};

// Mekanisme voting token kuadratik
const handleVote = async (id: number | string, tokenTambahan: number) => {
    if (onVote) {
    const diperbolehkan = onVote(tokenTambahan);
    if (!diperbolehkan) return;
    }

    const itemTarget = daftarUsulan.find((item) => item.id === id);
    const tokenSekarang = (itemTarget?.total_token ?? itemTarget?.token ?? 0) + tokenTambahan;

    // Update optimis ke UI lokal
    setDaftarUsulan((prev) =>
    prev.map((item) =>
        item.id === id
        ? { ...item, total_token: tokenSekarang, token: tokenSekarang }
        : item
    )
    );

    // Sinkronisasi pembaruan token ke database
    const { error } = await supabase
    .from('usulan')
    .update({ total_token: tokenSekarang })
    .eq('id', id);

    if (error) {
    toast.error('Gagal menyinkronkan token ke database');
    } else {
    toast.success(`Berhasil menambahkan ${tokenTambahan} token dukungan!`);
    }
};

// Kirim usulan baru warga ke Supabase Storage & PostGIS Table
const handleSubmit = async () => {
    if (!judul.trim() || !newPin) {
    toast.error('Judul usulan tidak boleh kosong!');
    return;
    }

    setIsSubmitting(true);

    const prosesUpload = async () => {
    let foto_url = '';

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
        .from('proposal-images')
        .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
        .from('proposal-images')
        .getPublicUrl(fileName);

        foto_url = publicUrlData.publicUrl;
    }

    const pointLokasi = `POINT(${newPin.lng} ${newPin.lat})`;
    const { error: insertError } = await supabase.from('usulan').insert([
        {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        kategori,
        lokasi: pointLokasi,
        foto_url,
        status: 'pending',
        total_token: 0,
        },
    ]);

    if (insertError) throw insertError;

    handleCancel();
    await fetchUsulan();
    };

    try {
    await toast.promise(prosesUpload(), {
        loading: 'Mengirim usulan...',
        success: 'Berhasil! Usulan kamu telah masuk ke sistem.',
        error: (err) => `Terjadi kesalahan: ${err.message || 'Gagal menyimpan usulan'}`,
    });
    } catch (err) {
    console.error(err);
    } finally {
    setIsSubmitting(false);
    }
};

return (
    <MapContainer
    center={[-7.248, 112.77]}
    zoom={14}
    style={{ height: '620px', width: '100%' }}
    className="rounded-xl shadow-md border border-gray-200 z-0"
    >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapClickHandler onMapClick={setNewPin} />

    {/* Pin Usulan Warga Terdaftar */}
    {daftarUsulan.map((item) => {
        const coords = parseLokasi(item.lokasi ?? item);
        if (!coords) return null;

        const totalToken = item.total_token ?? item.token ?? 0;

        return (
        <Marker key={item.id} position={coords} icon={iconDefault}>
            <Popup minWidth={280}>
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                {item.foto_url && (
                <img
                    src={item.foto_url}
                    alt={item.judul}
                    className="w-full h-32 object-cover rounded-md mb-1 border border-gray-100"
                />
                )}

                <div className="flex items-center justify-between border-b pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {item.kategori || 'Infrastruktur'}
                </span>
                <span className="text-xs font-bold text-blue-600">
                    {totalToken} Dukungan Token
                </span>
                </div>

                <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.judul}</h4>
                <p className="text-xs text-gray-600 line-clamp-3">{item.deskripsi}</p>

                {item.status && (
                <div className="w-fit">
                    <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        item.status === 'disetujui'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'ditolak'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                    >
                    Status: {item.status}
                    </span>
                </div>
                )}

                {/* Kontrol Voting Dukungan Warga */}
                <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-700 mb-1.5">
                    Dukung Prioritas Usulan Ini:
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, 1);
                    }}
                    className="py-1 px-2 text-xs font-bold rounded bg-gray-100 hover:bg-blue-600 hover:text-white transition text-gray-700 border border-gray-200"
                    >
                    +1 Token
                    </button>
                    <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, 5);
                    }}
                    className="py-1 px-2 text-xs font-bold rounded bg-gray-100 hover:bg-blue-600 hover:text-white transition text-gray-700 border border-gray-200"
                    >
                    +5 Token
                    </button>
                    <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleVote(item.id, 10);
                    }}
                    className="py-1 px-2 text-xs font-bold rounded bg-gray-100 hover:bg-blue-600 hover:text-white transition text-gray-700 border border-gray-200"
                    >
                    +10 Token
                    </button>
                </div>
                </div>
            </div>
            </Popup>
        </Marker>
        );
    })}

    {/* Pin Input Form Usulan Baru */}
    {newPin && (
        <Marker position={newPin} icon={iconDefault} ref={markerRef}>
        <Popup minWidth={270} closeButton={false}>
            <div className="flex flex-col gap-2.5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-sm border-b pb-1">
                Ajukan Usulan di Titik Ini
            </h3>

            <input
                type="text"
                placeholder="Judul Usulan (Mis: Pengaspalan)"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
                <option value="Drainase">Drainase</option>
                <option value="Infrastruktur">Infrastruktur</option>
                <option value="Penerangan">Penerangan</option>
                <option value="Fasilitas Umum">Fasilitas Umum</option>
            </select>

            <textarea
                placeholder="Deskripsi kerusakan/kebutuhan..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full h-16 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            ></textarea>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                if (e.target.files) setFile(e.target.files[0]);
                }}
                className="text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            <div className="flex gap-2 mt-1">
                <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-3 rounded-md text-xs font-semibold transition"
                >
                Batal
                </button>
                <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleSubmit();
                }}
                disabled={isSubmitting}
                className={`flex-1 ${
                    isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white py-1.5 px-3 rounded-md text-xs font-semibold transition`}
                >
                {isSubmitting ? 'Mengirim...' : 'Kirim Usulan'}
                </button>
            </div>
            </div>
        </Popup>
        </Marker>
    )}
    </MapContainer>
);
}