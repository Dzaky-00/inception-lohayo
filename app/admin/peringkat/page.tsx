'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';
import {
  getMusrenbangConfig,
  fetchMusrenbangConfigFromDb,
  MusrenbangConfig,
  DEFAULT_CONFIG,
  formatRupiah,
  getCleanDeskripsi,
  parseBiayaUsulan,
  hasOfficialBiaya,
  updateDeskripsiWithBiaya,
  autoRejectUnverifiedProposals,
} from '@/components/musrenbangConfig';
import LeaderboardCapBudget from '@/components/LeaderboardCapBudget';
import {
  Trophy,
  RefreshCw,
  X,
  MapPin,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  Check,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface UsulanItem {
  id: string;
  judul: string;
  deskripsi: string;
  lokasi: any;
  foto_url?: string;
  total_token: number;
  status: string;
  created_at: string;
}

// Parser koordinat PostGIS / GeoJSON ke [latitude, longitude]
const parseCoords = (lokasiData: any): [number, number] | null => {
  if (!lokasiData) return null;
  if (typeof lokasiData === 'string') {
    const match = lokasiData.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (match) {
      const lon = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
    }
  }
  if (typeof lokasiData === 'object' && lokasiData.coordinates) {
    const [lon, lat] = lokasiData.coordinates;
    if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
  }
  return null;
};

const formatTanggal = (isoString?: string) => {
  if (!isoString) return '-';
  try {
    return (
      new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return isoString;
  }
};

export default function AdminPeringkatPage() {
  const [usulanList, setUsulanList] = useState<UsulanItem[]>([]);
  const [config, setConfig] = useState<MusrenbangConfig>(DEFAULT_CONFIG);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUsulan, setSelectedUsulan] = useState<UsulanItem | null>(null);

  // Form input penetapan RAB resmi di modal
  const [alokasiDanaInput, setAlokasiDanaInput] = useState('');
  const [isSavingBiaya, setIsSavingBiaya] = useState(false);

  const fetchUsulan = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const latestCfg = await fetchMusrenbangConfigFromDb();
      setConfig(latestCfg);

      if (latestCfg.faseAktif >= 3) {
        await autoRejectUnverifiedProposals(latestCfg.faseAktif);
      }

      const { data, error } = await supabase
        .from('usulan')
        .select('*')
        .neq('status', 'system_config')
        .order('total_token', { ascending: false });

      if (error) {
        toast.error('Gagal mengambil data usulan: ' + error.message);
      } else {
        setUsulanList(data || []);
        if (showToast) toast.success('Peringkat usulan berhasil disinkronkan!');
      }
    } catch (err: any) {
      toast.error('Gagal memuat data: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setConfig(getMusrenbangConfig());
    fetchUsulan();

    const handleConfigChange = () => {
      setConfig(getMusrenbangConfig());
    };
    window.addEventListener('musrenbang_config_changed', handleConfigChange);
    return () => window.removeEventListener('musrenbang_config_changed', handleConfigChange);
  }, []);

  // Update input saat modal dibuka
  useEffect(() => {
    if (selectedUsulan) {
      const existing = parseBiayaUsulan(selectedUsulan.deskripsi);
      if (existing) {
        setAlokasiDanaInput(existing.toLocaleString('id-ID'));
      } else {
        setAlokasiDanaInput('');
      }
    }
  }, [selectedUsulan]);

  // Simpan RAB resmi
  const handleSaveBiayaUsulan = async (usulanId: string, loloskanKeVoting: boolean = false) => {
    const currentRole = localStorage.getItem('pantau_role');
    if (currentRole !== 'admin') {
      toast.error('Akses Ditolak: Hanya Admin Desa yang berhak menetapkan anggaran.');
      return;
    }

    if (config.faseAktif !== 2) {
      if (config.faseAktif === 1) {
        toast.error('Penetapan alokasi dana baru dapat dilakukan pada Fase 2 (Desk Teknis).');
      } else {
        toast.error('Penetapan alokasi dana telah dikunci karena periode Desk Teknis (Fase 2) telah selesai.');
      }
      return;
    }

    const raw = alokasiDanaInput.replace(/\D/g, '');
    const nominal = parseInt(raw, 10);

    if (isNaN(nominal) || nominal <= 0) {
      toast.error('Harap masukkan nominal alokasi dana yang valid!');
      return;
    }

    setIsSavingBiaya(true);
    try {
      const target = usulanList.find((u) => u.id === usulanId) || selectedUsulan;
      if (!target) throw new Error('Usulan tidak ditemukan');

      const updatedDeskripsi = updateDeskripsiWithBiaya(target.deskripsi || '', nominal);
      const updatePayload: any = { deskripsi: updatedDeskripsi };

      if (loloskanKeVoting) {
        updatePayload.status = 'voting';
      }

      const { error } = await supabase
        .from('usulan')
        .update(updatePayload)
        .eq('id', usulanId);

      if (error) throw error;

      setUsulanList((prev) =>
        prev.map((u) =>
          u.id === usulanId
            ? { ...u, deskripsi: updatedDeskripsi, ...(loloskanKeVoting ? { status: 'voting' } : {}) }
            : u
        )
      );

      if (selectedUsulan && selectedUsulan.id === usulanId) {
        setSelectedUsulan({
          ...selectedUsulan,
          deskripsi: updatedDeskripsi,
          ...(loloskanKeVoting ? { status: 'voting' } : {}),
        });
      }

      toast.success(
        loloskanKeVoting
          ? `Kebutuhan dana ${formatRupiah(nominal)} berhasil disimpan & usulan lolos ke voting!`
          : `Kebutuhan dana ${formatRupiah(nominal)} berhasil ditetapkan!`
      );
    } catch (err: any) {
      toast.error('Gagal menyimpan dana usulan: ' + err.message);
    } finally {
      setIsSavingBiaya(false);
    }
  };

  const selectedCoords = selectedUsulan ? parseCoords(selectedUsulan.lokasi) : null;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header Halaman Peringkat */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Papan Peringkat Resmi APBDes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Papan Peringkat & Batas Anggaran
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {config.faseAktif < 3
              ? 'Papan peringkat live akan dibuka pada Fase 3 (Periode Voting Warga) setelah seluruh verifikasi & RAB selesai.'
              : `Simulasi kelolosan usulan warga berdasarkan akumulasi koin partisipatif dan pagu anggaran APBDes (${formatRupiah(config.budgetCap)}).`}
          </p>
        </div>

        <button
          onClick={() => fetchUsulan(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}
        </button>
      </div>

      {/* Komponen Papan Peringkat (Hanya aktif di Fase 3 ke atas) */}
      {config.faseAktif < 3 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
            <Trophy className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">
              Papan Peringkat Belum Aktif
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Papan peringkat dan simulasi alokasi pagu APBDes secara <em>live</em> baru akan aktif saat <strong>Fase 3 (Periode Voting Koin Warga)</strong> dimulai.
            </p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-semibold leading-relaxed">
            {config.faseAktif === 1 ? (
              <span>Saat ini sistem berada di <strong>Fase 1 (Pengajuan Usulan Warga)</strong>. Usulan warga masih dalam proses pengumpulan dan belum diverifikasi.</span>
            ) : (
              <span>Saat ini sistem berada di <strong>Fase 2 (Desk Verifikasi & Penetapan RAB Desa)</strong>. Silakan selesaikan verifikasi kelayakan dan penetapan anggaran usulan terlebih dahulu di Dashboard Usulan.</span>
            )}
          </div>
        </div>
      ) : (
        <LeaderboardCapBudget
          usulanList={usulanList}
          config={config}
          onSelectUsulan={(u) => setSelectedUsulan(u as UsulanItem)}
        />
      )}

      {/* Modal Detail & Review Usulan */}
      {selectedUsulan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">#{selectedUsulan.id}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedUsulan.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedUsulan(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {selectedUsulan.foto_url && (
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-h-72 flex items-center justify-center">
                  <img
                    src={selectedUsulan.foto_url}
                    alt={selectedUsulan.judul}
                    className="max-h-72 w-full object-contain"
                  />
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedUsulan.judul}</h2>
                <p className="text-xs text-gray-400 mt-1">Diajukan pada: {formatTanggal(selectedUsulan.created_at)}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi Usulan:</h4>
                <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-line">
                  {getCleanDeskripsi(selectedUsulan.deskripsi) || 'Tidak ada deskripsi rinci yang disertakan.'}
                </div>
              </div>

              {/* Form Penetapan RAB Resmi */}
              {config.faseAktif === 2 ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                        Penetapan Kebutuhan Dana (RAB Resmi - Fase 2)
                      </h4>
                      <p className="text-[11px] text-blue-800">
                        Tentukan kebutuhan dana resmi APBDes untuk usulan ini agar dapat diperhitungkan dalam batas pagu.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-blue-200/60">
                    <label className="block text-xs font-bold text-gray-700">
                      Nominal Anggaran (Rupiah):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-500">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="Contoh: 50.000.000"
                        value={alokasiDanaInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          if (!raw) {
                            setAlokasiDanaInput('');
                          } else {
                            const num = parseInt(raw, 10);
                            setAlokasiDanaInput(num.toLocaleString('id-ID'));
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSavingBiaya}
                        onClick={() => handleSaveBiayaUsulan(selectedUsulan.id, false)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSavingBiaya ? 'Menyimpan...' : 'Simpan Anggaran'}</span>
                      </button>
                      {selectedUsulan.status !== 'voting' && (
                        <button
                          type="button"
                          disabled={isSavingBiaya}
                          onClick={() => handleSaveBiayaUsulan(selectedUsulan.id, true)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Simpan & Loloskan ke Voting</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>
                      {config.faseAktif === 1
                        ? 'Fase 1: Tahap Peninjauan Usulan'
                        : config.faseAktif === 3
                        ? 'Fase 3: Periode Voting Berlangsung'
                        : 'Musrenbang Selesai'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {config.faseAktif === 1
                      ? 'Penetapan anggaran resmi (RAB) dibuka pada Fase 2 (Desk Teknis).'
                      : 'Penetapan anggaran resmi telah dikunci karena periode Desk Teknis telah berakhir.'}
                  </p>
                  {hasOfficialBiaya(selectedUsulan.deskripsi) && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Anggaran Resmi Ditetapkan:</span>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        {formatRupiah(parseBiayaUsulan(selectedUsulan.deskripsi)!)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedCoords && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Lokasi Geospasial:</h4>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="font-mono">{selectedCoords[0].toFixed(6)}, {selectedCoords[1].toFixed(6)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedCoords[0]},${selectedCoords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>Buka Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedUsulan(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

