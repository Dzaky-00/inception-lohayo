'use client';
import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

const icon = L.icon({
iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
iconSize: [25, 41],
iconAnchor: [12, 41],
});

// Parser lokasi PostGIS POINT(lng lat) atau GeoJSON
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
useMapEvents({
    click(e) {
    onMapClick(e.latlng);
    },
});
return null;
}

export default function Map({
usulanData,
onVote,
}: {
usulanData?: any[];
onVote?: (jumlahToken: number) => boolean;
}) {
const [isMounted, setIsMounted] = useState(false);
const [newPin, setNewPin] = useState<L.LatLng | null>(null);
const [judul, setJudul] = useState('');
const [deskripsi, setDeskripsi] = useState('');
const [file, setFile] = useState<File | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [daftarUsulan, setDaftarUsulan] = useState<any[]>([]);

const markerRef = useRef<any>(null);

// Ambil data usulan riil dari Supabase
const fetchUsulan = async () => {
    const { data, error } = await supabase.from('usulan').select('*');
    if (error) {
    toast.error('Gagal mengambil data usulan dari server');
    } else {
    setDaftarUsulan(data || []);
    }
};

useEffect(() => {
    setIsMounted(true);
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

// Kirim usulan baru ke Supabase
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
        const { error: uploadError } = await supabase.storage.from('proposal-images').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('proposal-images').getPublicUrl(fileName);
        foto_url = publicUrlData.publicUrl;
    }

    const pointLokasi = `POINT(${newPin.lng} ${newPin.lat})`;

    const { error: insertError } = await supabase.from('usulan').insert([
        {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        lokasi: pointLokasi,
        foto_url,
        status: 'pending',
        total_token: 0,
        },
    ]);

    if (insertError) throw insertError;

    handleCancel();
    fetchUsulan();
    };

    toast.promise(prosesUpload(), {
    loading: 'Mengirim usulan...',
    success: 'Berhasil! Usulan kamu telah masuk ke sistem.',
    error: (err) => `Terjadi kesalahan: ${err.message}`,
    });

    setIsSubmitting(false);
};

// Fungsi alokasi token hak suara warga ke Supabase
const handleVoteToken = async (usulanId: number, currentToken: number, tokenTambahan: number) => {
    if (!onVote) return;

    const cukup = onVote(tokenTambahan);
    if (!cukup) {
    toast.error('Saldo token suara Anda tidak mencukupi!');
    return;
    }

    const tokenBaru = (currentToken || 0) + tokenTambahan;

    // Perbarui state lokal seketika
    setDaftarUsulan((prev) =>
    prev.map((u) => (u.id === usulanId ? { ...u, total_token: tokenBaru } : u))
    );

    // Sinkronkan ke tabel database Supabase
    const { error } = await supabase
    .from('usulan')
    .update({ total_token: tokenBaru })
    .eq('id', usulanId);

    if (error) {
    toast.error('Gagal memperbarui voting di server');
    } else {
    toast.success(`Berhasil memberikan +${tokenTambahan} token dukungan!`);
    }
};

if (!isMounted) {
    return (
    <div
        style={{ height: '600px', width: '100%' }}
        className="rounded-xl z-0 shadow-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 font-medium text-sm"
    >
        Memuat Peta Desa...
    </div>
    );
}

return (
    <MapContainer
    center={[-7.250445, 112.768845]}
    zoom={13}
    style={{ height: '600px', width: '100%' }}
    className="rounded-xl z-0 shadow-md border border-gray-200"
    >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapClickHandler onMapClick={setNewPin} />

    {/* Pin Usulan Tersimpan dari Supabase */}
    {daftarUsulan.map((usulan) => {
        const coords = parseLokasi(usulan.lokasi);
        if (!coords) return null;

        return (
        <Marker key={usulan.id} position={coords} icon={icon}>
            <Popup minWidth={260}>
            <div className="flex flex-col gap-2">
                {usulan.foto_url && (
                <img
                    src={usulan.foto_url}
                    alt={usulan.judul}
                    className="w-full h-32 object-cover rounded-md mb-1"
                />
                )}
                <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-gray-900 text-sm leading-snug">{usulan.judul}</h3>
                <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full capitalize shrink-0">
                    {usulan.status || 'Pending'}
                </span>
                </div>
                {usulan.deskripsi && (
                <p className="text-xs text-gray-600 line-clamp-3">{usulan.deskripsi}</p>
                )}

                {/* Perolehan Token & Tombol Voting */}
                <div className="pt-2 border-t border-gray-100 mt-1">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-700">Dukungan Warga:</span>
                    <span className="text-xs font-black text-blue-600">
                    {usulan.total_token || 0} Token
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                    <button
                    onClick={() => handleVoteToken(usulan.id, usulan.total_token, 1)}
                    className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                    >
                    +1
                    </button>
                    <button
                    onClick={() => handleVoteToken(usulan.id, usulan.total_token, 5)}
                    className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                    >
                    +5
                    </button>
                    <button
                    onClick={() => handleVoteToken(usulan.id, usulan.total_token, 10)}
                    className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                    >
                    +10
                    </button>
                </div>
                </div>
            </div>
            </Popup>
        </Marker>
        );
    })}

    {/* Pin Baru Saat Mengklik Peta */}
    {newPin && (
        <Marker position={newPin} icon={icon} ref={markerRef}>
        <Popup minWidth={250} closeButton={false}>
            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-sm">Buat Usulan Baru</h3>
            <input
                type="text"
                placeholder="Judul (Mis: Jalan Berlubang)"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
                placeholder="Deskripsi detail kebutuhan/kerusakan..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                if (e.target.files) setFile(e.target.files[0]);
                }}
                className="text-[11px] w-full text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div className="flex gap-2 mt-1">
                <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-3 rounded text-xs font-semibold transition"
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
                } text-white py-1.5 px-3 rounded text-xs font-semibold transition`}
                >
                {isSubmitting ? 'Mengirim...' : 'Ajukan'}
                </button>
            </div>
            </div>
        </Popup>
        </Marker>
    )}
    </MapContainer>
);
}