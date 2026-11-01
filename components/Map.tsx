'use client';

import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { supabase } from './supabase';
import {
  parseBiayaUsulan,
  formatRupiah,
  hasOfficialBiaya,
  getCleanDeskripsi,
  getRejectionReason,
  MusrenbangConfig,
  getUserAllocatedVotes,
  saveUserAllocatedVotes,
} from './musrenbangConfig';
import { Coins, AlertTriangle, ShieldCheck, Clock, CheckCircle2, RotateCcw } from 'lucide-react';

let _icon: L.Icon | null = null;
const getIcon = (isDarurat = false) => {
  if (isDarurat) {
    return L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
  if (!_icon) {
    _icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
  return _icon;
};

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

function MapClickHandler({
  onMapClick,
  faseAktif,
}: {
  onMapClick: (latlng: L.LatLng) => void;
  faseAktif: number;
}) {
  useMapEvents({
    click(e) {
      if (faseAktif !== 1) {
        if (faseAktif === 2) {
          toast('Pengajuan usulan telah ditutup. Saat ini dalam proses Verifikasi & Desk Teknis Desa (Fase 2).', {
            icon: '🔒',
          });
        } else if (faseAktif === 3) {
          toast('Pengajuan usulan baru ditutup. Saat ini dalam Periode Voting Koin (Fase 3).', {
            icon: '🔒',
          });
        } else {
          toast('Musrenbang telah selesai. Pengajuan usulan baru telah ditutup.', {
            icon: '🔒',
          });
        }
        return;
      }
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function Map({
  usulanData,
  onVote,
  onRefundToken,
  config,
}: {
  usulanData?: any[];
  onVote?: (jumlahToken: number) => boolean;
  onRefundToken?: (jumlahToken: number) => void;
  config?: MusrenbangConfig;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [newPin, setNewPin] = useState<L.LatLng | null>(null);
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [daftarUsulan, setDaftarUsulan] = useState<any[]>([]);
  const [userAllocated, setUserAllocated] = useState<Record<string, number>>({});

  const markerRef = useRef<any>(null);
  const faseAktif = config?.faseAktif ?? 3;

  // Ambil data usulan riil dari Supabase
  const fetchUsulan = async () => {
    const { data, error } = await supabase.from('usulan').select('*').neq('status', 'system_config');
    if (error) {
      toast.error('Gagal mengambil data usulan dari server');
    } else {
      setDaftarUsulan(data || []);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchUsulan();
    setUserAllocated(getUserAllocatedVotes());

    const handleVotesChange = () => {
      setUserAllocated(getUserAllocatedVotes());
    };
    window.addEventListener('pantau_user_votes_changed', handleVotesChange);
    return () => window.removeEventListener('pantau_user_votes_changed', handleVotesChange);
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

  // Kirim usulan baru ke Supabase (Hanya aktif di Fase 1)
  const handleSubmit = async () => {
    if (faseAktif !== 1) {
      toast.error('Pengajuan usulan baru hanya dapat dilakukan pada Fase 1!');
      return;
    }

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
      const cleanDeskripsi = deskripsi.trim();

      const { error: insertError } = await supabase.from('usulan').insert([
        {
          judul: judul.trim(),
          deskripsi: cleanDeskripsi,
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
      success: 'Berhasil! Usulan kamu telah masuk ke sistem dan menunggu verifikasi desk teknis (Fase 2).',
      error: (err) => `Terjadi kesalahan: ${err.message}`,
    });

    setIsSubmitting(false);
  };

  // 1. Tambah Alokasi Token Dukungan
  const handleVoteToken = async (usulanId: any, currentToken: number, tokenTambahan: number) => {
    if (faseAktif !== 3) {
      if (faseAktif < 3) {
        toast.error('Voting koin belum dibuka! Tahap voting akan dimulai pada Fase 3.');
      } else {
        toast.error('Periode voting telah ditutup.');
      }
      return;
    }

    const target = daftarUsulan.find((u) => u.id === usulanId);
    if (target && target.status !== 'voting') {
      toast.error('Hanya usulan yang telah disahkan (Lolos Voting) oleh Desa yang dapat didukung!');
      return;
    }

    if (!onVote) return;

    const cukup = onVote(tokenTambahan);
    if (!cukup) {
      toast.error('Saldo koin suara Anda tidak mencukupi!');
      return;
    }

    const tokenBaru = (currentToken || 0) + tokenTambahan;

    // Perbarui state lokal usulan seketika
    setDaftarUsulan((prev) =>
      prev.map((u) => (u.id === usulanId ? { ...u, total_token: tokenBaru } : u))
    );

    // Simpan riwayat koin warga lokal untuk fitur re-allocation
    const nextVotes = { ...userAllocated, [usulanId]: (userAllocated[usulanId] || 0) + tokenTambahan };
    setUserAllocated(nextVotes);
    saveUserAllocatedVotes(nextVotes);

    // Sinkronkan ke database Supabase
    const { error } = await supabase
      .from('usulan')
      .update({ total_token: tokenBaru })
      .eq('id', usulanId);

    if (error) {
      toast.error('Gagal memperbarui voting di server');
    } else {
      toast.success(`Berhasil memberikan +${tokenTambahan} koin dukungan!`);
    }
  };

  // 2. Fitur Fleksibilitas Koin (Dynamic Re-allocation: Tarik / Pindahkan Koin)
  const handleRefundToken = async (usulanId: any, currentToken: number, tokenTarik: number) => {
    if (faseAktif !== 3) {
      toast.error('Pemindahan koin hanya berlaku selama Fase 3 aktif!');
      return;
    }

    const userCoinOnThis = userAllocated[usulanId] || 0;
    if (userCoinOnThis < tokenTarik) {
      toast.error(`Anda hanya memiliki ${userCoinOnThis} koin di usulan ini untuk ditarik.`);
      return;
    }

    const tokenBaru = Math.max(0, (currentToken || 0) - tokenTarik);

    // Kembalikan saldo koin ke dompet warga
    if (onRefundToken) {
      onRefundToken(tokenTarik);
    }

    // Perbarui state lokal seketika
    setDaftarUsulan((prev) =>
      prev.map((u) => (u.id === usulanId ? { ...u, total_token: tokenBaru } : u))
    );

    const nextVotes = { ...userAllocated, [usulanId]: userCoinOnThis - tokenTarik };
    setUserAllocated(nextVotes);
    saveUserAllocatedVotes(nextVotes);

    const { error } = await supabase
      .from('usulan')
      .update({ total_token: tokenBaru })
      .eq('id', usulanId);

    if (error) {
      toast.error('Gagal menarik koin di server');
    } else {
      toast.success(`Koin berhasil ditarik (-${tokenTarik})! Saldo koin Anda dikembalikan untuk dialokasikan ke usulan lain.`);
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
      <MapClickHandler onMapClick={setNewPin} faseAktif={faseAktif} />

      {/* Pin Usulan Tersimpan dari Supabase */}
      {daftarUsulan.map((usulan) => {
        const coords = parseLokasi(usulan.lokasi);
        if (!coords) return null;

        const isDarurat = usulan.status === 'darurat' || usulan.judul.toLowerCase().includes('[darurat');
        const estimasiBiayaNum = parseBiayaUsulan(usulan.deskripsi, usulan.judul);
        const myCoin = userAllocated[usulan.id] || 0;

        return (
          <Marker key={usulan.id} position={coords} icon={getIcon(isDarurat)}>
            <Popup minWidth={280}>
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
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                      isDarurat
                        ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                        : faseAktif === 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : usulan.status === 'voting'
                        ? 'bg-blue-100 text-blue-800'
                        : usulan.status === 'ditolak'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {isDarurat
                      ? '🚨 Darurat BTT'
                      : faseAktif === 1
                      ? 'Menunggu Desk Teknis'
                      : usulan.status === 'voting'
                      ? 'Lolos Voting'
                      : usulan.status === 'ditolak'
                      ? 'Ditolak'
                      : 'Menunggu Verifikasi'}
                  </span>
                </div>

                {usulan.deskripsi && (
                  <p className="text-xs text-gray-600 line-clamp-3">{getCleanDeskripsi(usulan.deskripsi)}</p>
                )}

                {/* Tampilkan Alasan Penolakan jika usulan ditolak */}
                {usulan.status === 'ditolak' && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs mt-1">
                    <span className="font-bold text-rose-800 block text-[11px] mb-0.5">
                      ❌ Usulan Ditolak oleh Pemerintah Desa:
                    </span>
                    <p className="text-[11px] text-rose-900 leading-snug">
                      <span className="font-semibold text-rose-700">Alasan: </span>
                      {getRejectionReason(usulan.deskripsi) || 'Usulan tidak memenuhi kriteria kelayakan teknis atau pagu anggaran desa.'}
                    </p>
                  </div>
                )}

                {/* Info Kebutuhan Anggaran Proyek (Hanya tampil mulai Fase 2 ke atas) */}
                {faseAktif >= 2 && !isDarurat && (
                  hasOfficialBiaya(usulan.deskripsi) ? (
                    <div className="bg-emerald-50 border border-emerald-200/90 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-emerald-900 font-bold text-[11px] block">Alokasi Resmi Desa:</span>
                        <span className="text-[10px] text-emerald-700 font-medium">✓ Disahkan di Desk Teknis</span>
                      </div>
                      <span className="font-extrabold text-emerald-800 text-xs sm:text-sm">
                        {formatRupiah(estimasiBiayaNum)}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50/90 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-amber-900 font-bold text-[11px] block">Kebutuhan Dana:</span>
                        <span className="text-[10px] text-amber-700 font-medium">Menunggu Penetapan Admin Desa</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                        Fase 2 (Desk Teknis)
                      </span>
                    </div>
                  )
                )}

                {/* Kontrol Berdasarkan Alur Fase */}
                {isDarurat ? (
                  <div className="bg-red-50 text-red-700 p-2 rounded-lg text-xs font-semibold text-center border border-red-200 mt-1">
                    ⚡ Jalur Cepat Belanja Tidak Terduga (BTT) — Ditangani instan oleh Kepala Desa tanpa voting koin warga.
                  </div>
                ) : faseAktif === 1 ? (
                  /* Fase 1: Warga hanya bisa melihat status usulan, desk teknis dan status voting belum ditampilkan */
                  <div className="bg-amber-50/70 text-amber-800 p-2 rounded-lg text-xs border border-amber-200 mt-1">
                    <span className="text-[10px] text-amber-700 font-medium block">
                      ℹ️ Fase 1 (Pengajuan Usulan): Usulan berhasil terdaftar. Peninjauan teknis & alokasi anggaran akan dilakukan oleh Desa pada Fase 2.
                    </span>
                  </div>
                ) : faseAktif === 2 ? (
                  /* Fase 2: Warga hanya menunggu pembaruan status dan desk teknis */
                  <div className="bg-blue-50 text-blue-800 p-2.5 rounded-lg text-xs font-semibold text-center border border-blue-200 mt-1">
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    Sedang Verifikasi & Desk Teknis
                    <span className="block text-[10px] text-blue-700 font-normal mt-0.5">
                      Pemerintah Desa sedang memverifikasi usulan & menetapkan pagu dana. Pintu voting dibuka di Fase 3.
                    </span>
                  </div>
                ) : faseAktif === 3 ? (
                  /* Fase 3: Periode Voting & Dynamic Re-allocation (Peringkat di-hide) */
                  usulan.status !== 'voting' ? (
                    <div className="bg-gray-50 text-gray-600 p-2.5 rounded-lg text-xs text-center border border-gray-200 mt-1">
                      <span className="font-bold block">Tidak Memenuhi Syarat Voting</span>
                      <span className="text-[10px] text-gray-500">
                        Usulan ini tidak diloloskan oleh Pemerintah Desa pada verifikasi teknis Fase 2.
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-gray-100 mt-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-gray-700">Status Voting:</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Voting Dibuka
                        </span>
                      </div>

                      {/* Riwayat Alokasi Koin Warga Ini */}
                      {myCoin > 0 && (
                        <div className="bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
                          <span className="text-blue-900 font-medium text-[11px]">Koin Anda di sini:</span>
                          <span className="font-black text-blue-700 text-xs">{myCoin} Koin</span>
                        </div>
                      )}

                      {/* Tombol Tambah Koin */}
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                          + Berikan Koin Dukungan:
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => handleVoteToken(usulan.id, usulan.total_token, 1)}
                            className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                          >
                            +1 Koin
                          </button>
                          <button
                            onClick={() => handleVoteToken(usulan.id, usulan.total_token, 5)}
                            className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                          >
                            +5 Koin
                          </button>
                          <button
                            onClick={() => handleVoteToken(usulan.id, usulan.total_token, 10)}
                            className="py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition border border-blue-200"
                          >
                            +10 Koin
                          </button>
                        </div>
                      </div>

                      {/* Tombol Tarik / Re-alokasi Koin (Hanya aktif jika warga sudah punya koin di sini) */}
                      {myCoin > 0 && (
                        <div className="pt-1.5 border-t border-gray-100">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <RotateCcw className="w-3 h-3" />
                            Tarik Koin (Pindahkan Dukungan):
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleRefundToken(usulan.id, usulan.total_token, 1)}
                              disabled={myCoin < 1}
                              className="py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white transition border border-amber-200 disabled:opacity-40"
                            >
                              -1 Koin
                            </button>
                            <button
                              onClick={() => handleRefundToken(usulan.id, usulan.total_token, 5)}
                              disabled={myCoin < 5}
                              className="py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white transition border border-amber-200 disabled:opacity-40"
                            >
                              -5 Koin
                            </button>
                            <button
                              onClick={() => handleRefundToken(usulan.id, usulan.total_token, 10)}
                              disabled={myCoin < 10}
                              className="py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white transition border border-amber-200 disabled:opacity-40"
                            >
                              -10 Koin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* Fase 4: Pasca Fase 3 (Musrenbang Selesai) */
                  <div className="bg-purple-50 text-purple-900 p-2.5 rounded-lg text-xs font-semibold text-center border border-purple-200 mt-1">
                    🏆 Musrenbang TA 2026 Selesai
                    <span className="block text-[10px] text-purple-700 font-normal mt-0.5">
                      Periode voting telah ditutup dan hasil akhir telah dikunci. Silakan buka menu <strong>Peringkat</strong> untuk melihat hasil final.
                    </span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Pin Baru Saat Mengklik Peta (Hanya aktif di Fase 1) */}
      {newPin && faseAktif === 1 && (
        <Marker position={newPin} icon={getIcon()} ref={markerRef}>
          <Popup minWidth={260} closeButton={false}>
            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="border-b pb-1.5">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Fase 1: Pengajuan Usulan
                </span>
                <h3 className="font-bold text-gray-800 text-sm mt-1">Buat Usulan Baru</h3>
              </div>

              <input
                type="text"
                placeholder="Judul Usulan (Mis: Perbaikan Drainase)"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="bg-blue-50 border border-blue-200/80 rounded-lg p-2.5 text-[11px] text-blue-900 leading-snug">
                <span className="font-bold flex items-center gap-1 text-blue-950 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Alokasi Dana Proyek (Fase 2: Desk Teknis)
                </span>
                Warga tidak perlu menentukan biaya. Kebutuhan anggaran resmi akan dihitung dan ditetapkan secara eksklusif oleh <strong>Admin Desa</strong> saat verifikasi teknis.
              </div>

              <textarea
                placeholder="Deskripsi detail kebutuhan/kerusakan fisik..."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="border border-gray-300 p-2 rounded-md text-xs w-full h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {isSubmitting ? 'Mengirim...' : 'Ajukan Usulan'}
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
