'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/components/supabase';
import {
  getMusrenbangConfig,
  fetchMusrenbangConfigFromDb,
  saveMusrenbangConfig,
  DEFAULT_CONFIG,
  MusrenbangConfig,
  formatRupiah,
  formatNumberWithDots,
  MusrenbangFase,
  hasOfficialBiaya,
  getOfficialBiaya,
  getCleanDeskripsi,
  updateDeskripsiWithBiaya,
  getRejectionReason,
  updateDeskripsiWithRejection,
  autoRejectUnverifiedProposals,
} from '@/components/musrenbangConfig';
import {
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  MapPin,
  ExternalLink,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ThumbsUp,
  X,
  XCircle,
  Layers,
  Siren,
  ShieldAlert,
  Zap,
  Check,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

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
    const match = lokasiData.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/);
    if (match) return [parseFloat(match[2]), parseFloat(match[1])];
  }
  if (typeof lokasiData === 'object' && lokasiData.coordinates) {
    return [lokasiData.coordinates[1], lokasiData.coordinates[0]];
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

export default function AdminDashboard() {
  const [config, setConfig] = useState<MusrenbangConfig>(DEFAULT_CONFIG);
  const [isMounted, setIsMounted] = useState(false);
  const [usulanList, setUsulanList] = useState<UsulanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'voting' | 'ditolak' | 'darurat'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedUsulan, setSelectedUsulan] = useState<UsulanItem | null>(null);
  const [alokasiDanaInput, setAlokasiDanaInput] = useState<string>('');
  const [isSavingBiaya, setIsSavingBiaya] = useState(false);

  // State Modal Konfirmasi Penolakan Usulan
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [usulanToReject, setUsulanToReject] = useState<UsulanItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Sinkronkan input alokasi dana ketika usulan dipilih
  useEffect(() => {
    if (selectedUsulan) {
      const existing = getOfficialBiaya(selectedUsulan.deskripsi);
      setAlokasiDanaInput(existing ? formatNumberWithDots(existing) : '');
    } else {
      setAlokasiDanaInput('');
    }
  }, [selectedUsulan]);

  const fetchUsulan = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const latestCfg = await fetchMusrenbangConfigFromDb();
      setConfig(latestCfg);

      // Otomatisasi: Usulan belum diverifikasi yang tersisa hingga Fase 3 mulai otomatis diubah ke 'ditolak'
      if (latestCfg.faseAktif >= 3) {
        const autoRejectedCount = await autoRejectUnverifiedProposals(latestCfg.faseAktif);
        if (autoRejectedCount > 0 && showToast) {
          toast(`Otomatisasi Fase 3: ${autoRejectedCount} usulan yang belum diverifikasi otomatis diperbarui ke status Ditolak.`, {
            icon: 'ℹ️',
          });
        }
      }

      const { data, error } = await supabase
        .from('usulan')
        .select('*')
        .neq('status', 'system_config')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Gagal memuat data usulan: ' + error.message);
      } else {
        setUsulanList(data || []);
        if (showToast) {
          toast.success(`Sinkronisasi berhasil! ${data?.length || 0} usulan termuat.`);
        }
      }
    } catch (err: any) {
      toast.error('Gagal terhubung ke database Supabase');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenRejectModal = (usulan: UsulanItem) => {
    setUsulanToReject(usulan);
    setRejectionReason(''); // Pastikan kolom alasan selalu kosong secara default
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!usulanToReject) return;
    if (!rejectionReason.trim()) {
      toast.error('Harap masukkan alasan penolakan usulan!');
      return;
    }

    setIsSubmittingRejection(true);
    try {
      const updatedDeskripsi = updateDeskripsiWithRejection(
        usulanToReject.deskripsi || '',
        rejectionReason.trim()
      );

      const { error } = await supabase
        .from('usulan')
        .update({
          status: 'ditolak',
          deskripsi: updatedDeskripsi,
        })
        .eq('id', usulanToReject.id);

      if (error) throw error;

      // Update state lokal usulanList
      setUsulanList((prev) =>
        prev.map((u) =>
          u.id === usulanToReject.id
            ? { ...u, status: 'ditolak', deskripsi: updatedDeskripsi }
            : u
        )
      );

      // Update selectedUsulan jika usulan yang sedang dibuka adalah yang ditolak
      if (selectedUsulan && selectedUsulan.id === usulanToReject.id) {
        setSelectedUsulan({
          ...selectedUsulan,
          status: 'ditolak',
          deskripsi: updatedDeskripsi,
        });
      }

      toast.success(`Usulan "${usulanToReject.judul}" berhasil ditolak dengan alasan tercatat.`);
      setIsRejectModalOpen(false);
      setUsulanToReject(null);
      setRejectionReason('');
    } catch (err: any) {
      toast.error('Gagal menolak usulan: ' + err.message);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    setConfig(getMusrenbangConfig());
    fetchUsulan();
    fetchMusrenbangConfigFromDb().then((cfg) => setConfig(cfg));

    const handleConfigChange = () => setConfig(getMusrenbangConfig());
    window.addEventListener('musrenbang_config_changed', handleConfigChange);
    return () => window.removeEventListener('musrenbang_config_changed', handleConfigChange);
  }, []);

  // Tutup dropdown menu filter ketika klik di luar menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update status usulan dengan validasi syarat Fase 2
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const target = usulanList.find((u) => u.id === id) || (selectedUsulan?.id === id ? selectedUsulan : null);
    const isDarurat = target?.status === 'darurat' || target?.judul.toLowerCase().includes('[darurat');

    // Validasi Fase: Hanya Fase 2 yang mengizinkan pembaruan status reguler oleh Admin Desa
    if (!isDarurat && config.faseAktif !== 2) {
      if (config.faseAktif === 1) {
        toast.error('Pembaruan status usulan hanya dapat dilakukan pada Fase 2 (Desk Teknis). Di Fase 1 usulan hanya dapat ditinjau.');
      } else {
        toast.error('Pembaruan status usulan telah dikunci karena periode Desk Teknis (Fase 2) telah selesai.');
      }
      return;
    }
    
    // Validasi: Usulan non-darurat yang diloloskan ke Voting (Fase 3) WAJIB telah ditetapkan anggarannya di Fase 2
    if (newStatus === 'voting' && target) {
      const isDarurat = target.status === 'darurat' || target.judul.toLowerCase().includes('[darurat');
      if (!isDarurat && !hasOfficialBiaya(target.deskripsi)) {
        toast.error('Usulan ini belum memiliki penetapan Kebutuhan Dana resmi! Silakan tetapkan nominal anggaran terlebih dahulu di menu Tinjau.');
        setSelectedUsulan(target);
        return;
      }
    }

    const previous = [...usulanList];
    setUsulanList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );
    if (selectedUsulan && selectedUsulan.id === id) {
      setSelectedUsulan((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    const { error } = await supabase
      .from('usulan')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Gagal memperbarui status: ' + error.message);
      setUsulanList(previous);
    } else {
      toast.success(`Status berhasil diperbarui ke "${newStatus.toUpperCase()}"`);
    }
  };

  // Tetapkan Alokasi Kebutuhan Dana (RAB Resmi) oleh Admin Desa di Fase 2
  const handleSaveBiayaUsulan = async (usulanId: string, loloskanKeVoting: boolean = false) => {
    const currentRole = localStorage.getItem('pantau_role');
    if (currentRole !== 'admin') {
      toast.error('Akses Ditolak: Hanya Admin Desa yang berhak menetapkan alokasi kebutuhan dana.');
      return;
    }

    // Validasi Fase: Hanya Fase 2 yang mengizinkan penetapan RAB resmi
    if (config.faseAktif !== 2) {
      if (config.faseAktif === 1) {
        toast.error('Penetapan alokasi dana baru dapat dilakukan pada Fase 2 (Desk Teknis). Pada Fase 1 usulan hanya dapat ditinjau.');
      } else {
        toast.error('Penetapan alokasi dana telah dikunci karena periode Desk Teknis (Fase 2) telah berakhir.');
      }
      return;
    }

    const raw = alokasiDanaInput.replace(/\D/g, '');
    const nominal = parseInt(raw, 10);

    if (isNaN(nominal) || nominal <= 0) {
      toast.error('Harap masukkan nominal alokasi dana yang valid (misal: 50000000 untuk 50 Juta)!');
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

      // Update daftar lokal
      setUsulanList((prev) =>
        prev.map((u) =>
          u.id === usulanId
            ? { ...u, deskripsi: updatedDeskripsi, ...(loloskanKeVoting ? { status: 'voting' } : {}) }
            : u
        )
      );

      // Update modal yang sedang dibuka
      if (selectedUsulan && selectedUsulan.id === usulanId) {
        setSelectedUsulan({
          ...selectedUsulan,
          deskripsi: updatedDeskripsi,
          ...(loloskanKeVoting ? { status: 'voting' } : {}),
        });
      }

      if (loloskanKeVoting) {
        toast.success(
          `Alokasi dana ${formatRupiah(nominal)} resmi ditetapkan & usulan lolos ke Periode Voting (Fase 3)!`
        );
      } else {
        toast.success(`Alokasi kebutuhan dana resmi berhasil disimpan: ${formatRupiah(nominal)}.`);
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan alokasi dana: ${err.message}`);
    } finally {
      setIsSavingBiaya(false);
    }
  };

  // Tanggap Darurat BTT: Pencairan Dana Darurat Instan oleh Kepala Desa
  const handleCairkanBtt = async (usulan: UsulanItem) => {
    const confirmAction = confirm(
      `Cairkan pos Belanja Tidak Terduga (BTT) untuk penanganan darurat "${usulan.judul}"?\n\nSesuai Permendagri, dana BTT dapat dicairkan langsung tanpa menunggu voting Musrenbang.`
    );
    if (!confirmAction) return;

    await handleUpdateStatus(usulan.id, 'diproses');
    toast.success(
      '🚨 Dana BTT Resmi Dicairkan! Tim tanggap darurat dan logistik desa segera dikerahkan.',
      { duration: 5000 }
    );
  };

  // Hapus Usulan
  const handleDeleteUsulan = async (id: string, judul: string) => {
    if (!confirm(`Hapus usulan "${judul}" secara permanen?`)) return;

    const previous = [...usulanList];
    setUsulanList((prev) => prev.filter((u) => u.id !== id));
    if (selectedUsulan?.id === id) setSelectedUsulan(null);

    const { error } = await supabase.from('usulan').delete().eq('id', id);

    if (error) {
      toast.error('Gagal menghapus usulan: ' + error.message);
      setUsulanList(previous);
    } else {
      toast.success('Usulan berhasil dihapus dari sistem');
    }
  };

  // Filter Kedaruratan BTT
  const laporanDaruratList = usulanList.filter(
    (u) => u.status === 'darurat' || u.judul.toLowerCase().includes('[darurat')
  );

  // Kalkulasi statistik riil
  const regularUsulan = usulanList.filter(
    (u) => u.status !== 'darurat' && u.status !== 'system_config' && !u.judul.toLowerCase().includes('[darurat')
  );
  const totalUsulan = regularUsulan.length;
  const pendingCount = regularUsulan.filter((u) => (u.status || '').toLowerCase() === 'pending').length;
  const votingCount = regularUsulan.filter((u) => (u.status || '').toLowerCase() === 'voting').length;
  const ditolakCount = regularUsulan.filter((u) => (u.status || '').toLowerCase() === 'ditolak').length;
  const daruratCount = laporanDaruratList.length;

  const filterOptions: {
    id: 'all' | 'pending' | 'voting' | 'ditolak' | 'darurat';
    label: string;
    count: number;
    icon: string;
  }[] = [
    { id: 'all', label: 'Semua Usulan', count: totalUsulan + daruratCount, icon: '📋' },
    { id: 'pending', label: 'Perlu Verifikasi', count: pendingCount, icon: '⏳' },
    { id: 'voting', label: 'Lolos ke Voting', count: votingCount, icon: '🗳️' },
    { id: 'ditolak', label: 'Ditolak', count: ditolakCount, icon: '❌' },
    { id: 'darurat', label: 'Darurat BTT', count: daruratCount, icon: '🚨' },
  ];

  const activeFilterOption = filterOptions.find((opt) => opt.id === statusFilter) || filterOptions[0];

  // Filter data tabel (Disesuaikan bersih dengan siklus 3 Fase + Jalur Darurat)
  const filteredUsulan = usulanList.filter((u) => {
    if (u.status === 'system_config') return false;

    const statusVal = (u.status || 'pending').toLowerCase();
    const isDaruratItem = statusVal === 'darurat' || u.judul.toLowerCase().includes('[darurat');

    if (statusFilter === 'darurat') {
      if (!isDaruratItem) return false;
    } else if (statusFilter === 'all') {
      // Tampilkan seluruh usulan
    } else {
      if (isDaruratItem) return false;
      if (statusVal !== statusFilter) return false;
    }

    const matchesSearch =
      (u.judul || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.deskripsi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'darurat':
        return 'bg-red-100 text-red-800 border border-red-300 animate-pulse';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'voting':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ditolak':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'darurat':
        return '🚨 Darurat BTT';
      case 'pending':
        return '⏳ Perlu Verifikasi';
      case 'voting':
        return '🗳️ Lolos Voting';
      case 'ditolak':
        return '❌ Ditolak';
      default:
        return s;
    }
  };

  const selectedCoords = selectedUsulan ? parseCoords(selectedUsulan.lokasi) : null;

  return (
    <div className="space-y-8">
      {/* Header Dashboard & Sinkronisasi */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Panel Pengendali Desa & Musrenbang
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Dashboard Verifikasi & Anggaran Desa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola filter teknis kelayakan usulan warga, alokasi dana partisipasi, dan tanggap darurat BTT.
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

      {/* 1. SECTION KHUSUS: Alert Tanggap Darurat BTT (Belanja Tidak Terduga) */}
      {laporanDaruratList.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-6 shadow-xl border border-red-500/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/20 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-2xl animate-pulse">
                <Siren className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white text-red-700 px-2.5 py-0.5 rounded-full">
                  Jalur Khusus Permendagri: Belanja Tidak Terduga (BTT)
                </span>
                <h2 className="text-lg sm:text-xl font-black mt-1">
                  🚨 {laporanDaruratList.length} Kejadian Darurat Membutuhkan Tindakan Cepat!
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-red-100 block">Alokasi Kas Pos BTT Tersedia:</span>
              <span className="text-lg font-black text-yellow-300">{formatRupiah(config.danaBtt)}</span>
            </div>
          </div>

          <p className="text-xs text-red-100 mb-4 leading-relaxed">
            Sesuai regulasi keuangan desa, bencana alam atau fasum yang rusak mendadak <strong>TIDAK PERLU menunggu Musrenbang / voting warga</strong>. Kepala Desa berwenang langsung mencairkan Dana BTT secara instan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {laporanDaruratList.map((darurat) => (
              <div
                key={darurat.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-sm text-yellow-200">{darurat.judul}</h3>
                    <span className="text-[10px] font-bold bg-white text-red-700 px-2 py-0.5 rounded-full shrink-0 uppercase">
                      {darurat.status}
                    </span>
                  </div>
                  <p className="text-xs text-red-100 mt-1 line-clamp-3 leading-relaxed">
                    {darurat.deskripsi}
                  </p>
                  <p className="text-[10px] text-red-200 mt-2 font-mono">
                    Waktu Lapor: {formatTanggal(darurat.created_at)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex gap-2 justify-end">
                  <button
                    onClick={() => setSelectedUsulan(darurat)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition"
                  >
                    Tinjau Bukti
                  </button>
                  {darurat.status === 'darurat' ? (
                    <button
                      onClick={() => handleCairkanBtt(darurat)}
                      className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-yellow-950 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Cairkan Dana BTT Instan</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-emerald-500/80 rounded-xl text-xs font-bold text-white flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      BTT Telah Dicairkan
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Kontrol Pencarian & Menu Dropdown Filter (Tanpa Scroll) */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari berdasarkan judul usulan atau deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Menu Dropdown Filter */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 transition shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-gray-500 font-medium">Filter:</span>
                  <span className="font-bold text-gray-900">{activeFilterOption.label}</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {activeFilterOption.count}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isFilterOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Popover Menu Dropdown */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-full sm:w-60 bg-white rounded-2xl shadow-xl border border-gray-200 p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-1">
                    Pilih Kategori Usulan
                  </div>
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                        statusFilter === opt.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          statusFilter === opt.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabel Usulan Riil */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-sm font-semibold text-gray-600">Memuat usulan dari Supabase...</p>
              </div>
            ) : filteredUsulan.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-bold text-gray-700">Tidak ada usulan ditemukan</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-600 border-b border-gray-200 uppercase tracking-wider font-bold text-[11px]">
                      <th className="p-4">Foto / ID</th>
                      <th className="p-4">Judul Usulan & Deskripsi</th>
                      {config.faseAktif >= 2 && <th className="p-4">Kebutuhan Dana (RAB)</th>}
                      <th className="p-4">Waktu Masuk</th>
                      {config.faseAktif >= 3 && <th className="p-4 text-center">Dukungan Koin</th>}
                      <th className="p-4">Status Verifikasi</th>
                      <th className="p-4 text-center">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsulan.map((usulan) => {
                      const coords = parseCoords(usulan.lokasi);
                      const isDarurat = usulan.status === 'darurat' || usulan.judul.toLowerCase().includes('[darurat');
                      return (
                        <tr
                          key={usulan.id}
                          className={`hover:bg-blue-50/30 transition group ${
                            isDarurat ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="p-4 align-top w-28">
                            <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                              {usulan.foto_url ? (
                                <img
                                  src={usulan.foto_url}
                                  alt={usulan.judul}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-[10px]">
                                  <MapPin className="w-4 h-4 mb-0.5" />
                                  <span>No Foto</span>
                                </div>
                              )}
                            </div>
                            <span className="block text-[10px] text-gray-400 font-mono mt-1 truncate" title={usulan.id}>
                              #{usulan.id.substring(0, 8)}
                            </span>
                          </td>

                          <td className="p-4 align-top max-w-sm">
                            <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition">
                              {usulan.judul}
                            </h3>
                            <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                              {getCleanDeskripsi(usulan.deskripsi) || <span className="italic text-gray-400">Tidak ada deskripsi</span>}
                            </p>
                            {coords && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-2 font-mono">
                                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                <span>{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
                              </div>
                            )}
                          </td>

                          {config.faseAktif >= 2 && (
                            <td className="p-4 align-top whitespace-nowrap">
                              {isDarurat ? (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">
                                  Non-Musrenbang (BTT)
                                </span>
                              ) : hasOfficialBiaya(usulan.deskripsi) ? (
                                <div>
                                  <span className="text-xs font-black text-emerald-700 block">
                                    {formatRupiah(getOfficialBiaya(usulan.deskripsi)!)}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                                    ✓ Resmi Desk Teknis
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-xs font-bold text-amber-700 block">Belum Ditetapkan</span>
                                  <button
                                    onClick={() => setSelectedUsulan(usulan)}
                                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 inline-block mt-0.5 transition"
                                  >
                                    ⚠️ Tetapkan RAB
                                  </button>
                                </div>
                              )}
                            </td>
                          )}

                          <td className="p-4 align-top text-gray-600 whitespace-nowrap">
                            <span className="font-medium text-gray-800" suppressHydrationWarning>
                              {formatTanggal(usulan.created_at)}
                            </span>
                          </td>

                          {config.faseAktif >= 3 && (
                            <td className="p-4 align-top text-center">
                              {isDarurat ? (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">
                                  Non-Voting BTT
                                </span>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-base font-black text-blue-600">
                                    {usulan.total_token || 0}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Koin</span>
                                </div>
                              )}
                            </td>
                          )}

                          <td className="p-4 align-top whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize inline-block ${getStatusBadge(usulan.status)}`}>
                              {getStatusLabel(usulan.status)}
                            </span>
                            {usulan.status === 'ditolak' && getRejectionReason(usulan.deskripsi) && (
                              <p
                                className="text-[10px] text-rose-600 font-medium mt-1 max-w-[170px] truncate"
                                title={`Alasan: ${getRejectionReason(usulan.deskripsi)}`}
                              >
                                Alasan: {getRejectionReason(usulan.deskripsi)}
                              </p>
                            )}
                          </td>

                          <td className="p-4 align-top text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedUsulan(usulan)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg border border-blue-200 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Tinjau</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUsulan(usulan.id, usulan.judul)}
                                title="Hapus Usulan"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* Modal Detail Usulan & Koordinat Geospasial */}
      {selectedUsulan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusBadge(selectedUsulan.status)}`}>
                  {getStatusLabel(selectedUsulan.status)}
                </span>
                <span className="text-xs text-gray-400 font-mono">#{selectedUsulan.id}</span>
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
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi Masalah / Urgensi:</h4>
                <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-line">
                  {getCleanDeskripsi(selectedUsulan.deskripsi) || 'Tidak ada deskripsi rinci yang disertakan.'}
                </div>
              </div>

              {selectedCoords && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Koordinat Geospasial PostGIS
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedCoords[0]},${selectedCoords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      Buka di Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs font-mono text-blue-900">
                    Latitude: <strong>{selectedCoords[0]}</strong> | Longitude: <strong>{selectedCoords[1]}</strong>
                  </p>
                </div>
              )}

              {/* Status Alokasi Koin / Aksi Verifikasi */}
              {selectedUsulan.status === 'darurat' ? (
                <div className="p-5 bg-red-50 rounded-2xl border border-red-200 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                        Jalur Tanggap Darurat BTT
                      </span>
                      <p className="text-xs text-red-800 mt-1">
                        Kas kedaruratan dapat dicairkan instan oleh Kepala Desa tanpa melalui proses voting warga.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCairkanBtt(selectedUsulan)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow transition flex items-center gap-1.5 shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Cairkan Dana BTT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {config.faseAktif === 1 ? (
                    /* Fase 1: Admin Desa hanya bisa meninjau usulan baru */
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Fase 1: Tahap Peninjauan Usulan Baru Warga</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Saat ini sistem berada di <strong>Fase 1</strong>. Admin Desa hanya dapat meninjau detail usulan dan lokasi geospasial yang diajukan warga. Pembaruan status kelayakan dan penetapan alokasi anggaran resmi (RAB) akan dibuka pada <strong>Fase 2 (Desk Teknis)</strong>.
                      </p>
                      <div className="text-[11px] font-semibold text-amber-700 pt-1">
                        Status Terdaftar: <span className="uppercase font-bold">{selectedUsulan.status || 'Pending'}</span>
                      </div>
                    </div>
                  ) : config.faseAktif === 2 ? (
                    /* Fase 2: Admin Desa bisa memperbarui status dan anggaran (RAB) */
                    <div className="p-5 bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40 rounded-2xl border border-blue-200 space-y-4 shadow-xs">
                      <div className="border-b border-blue-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-blue-600 text-white rounded-lg">
                            <DollarSign className="w-4 h-4" />
                          </span>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                            Penetapan Kebutuhan Dana (Fase 2: Desk Teknis)
                          </h4>
                        </div>
                        <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
                          Sesuai regulasi Musrenbang Desa, nominal anggaran (RAB) <strong>hanya dapat ditentukan oleh Admin Desa</strong> setelah verifikasi fisik & status legalitas lahan.
                        </p>
                      </div>

                      {/* Tampilkan Alasan jika usulan ini berstatus ditolak */}
                      {selectedUsulan.status === 'ditolak' && (
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1.5">
                          <div className="flex items-center gap-2 font-bold text-rose-800">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Status Usulan: Ditolak oleh Pemerintah Desa</span>
                          </div>
                          <div className="pl-6">
                            <span className="font-semibold text-rose-700 text-[11px]">Alasan Penolakan:</span>
                            <p className="mt-1 text-rose-900 bg-white/80 p-2.5 rounded-xl border border-rose-200 leading-relaxed font-medium">
                              {getRejectionReason(selectedUsulan.deskripsi) || 'Tidak memenuhi kriteria teknis / pagu anggaran desa.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Input Alokasi Dana (Dimasukkan Sendiri secara Manual) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 flex flex-wrap items-center justify-between gap-1">
                          <span>Alokasi Kebutuhan Dana Proyek (RAB Resmi):</span>
                          {alokasiDanaInput && !isNaN(parseInt(alokasiDanaInput.replace(/\D/g, ''))) && (
                            <span className="text-xs font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                              Terbilang: {formatRupiah(parseInt(alokasiDanaInput.replace(/\D/g, '')))}
                            </span>
                          )}
                        </label>

                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Masukkan nominal anggaran (misal: 50.000.000 untuk Rp 50 Juta)"
                            value={alokasiDanaInput}
                            onChange={(e) => setAlokasiDanaInput(formatNumberWithDots(e.target.value))}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Tombol Aksi Verifikasi & Persetujuan Anggaran */}
                      <div className="pt-2 flex flex-wrap gap-2 justify-end border-t border-blue-100">
                        <button
                          type="button"
                          disabled={isSavingBiaya}
                          onClick={() => handleSaveBiayaUsulan(selectedUsulan.id, false)}
                          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {isSavingBiaya ? 'Menyimpan...' : 'Simpan Anggaran Saja'}
                        </button>

                        <button
                          type="button"
                          disabled={isSavingBiaya}
                          onClick={() => handleSaveBiayaUsulan(selectedUsulan.id, true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tetapkan & Loloskan ke Voting (Fase 3)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(selectedUsulan)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Tolak Usulan</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Fase 3 & Pasca Fase 3: Tinjauan dan anggaran dikunci permanen */
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>{config.faseAktif === 3 ? 'Fase 3: Periode Voting Berlangsung' : 'Musrenbang Selesai'}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Tinjauan, status kelayakan, dan penetapan anggaran usulan telah <strong>dikunci permanen</strong> karena periode Desk Teknis (Fase 2) telah selesai. Hal ini untuk menjamin integritas dan transparansi perolehan suara warga.
                      </p>
                      {hasOfficialBiaya(selectedUsulan.deskripsi) && (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Anggaran Resmi Ditetapkan:</span>
                          <span className="text-emerald-700 font-extrabold text-sm">
                            {formatRupiah(getOfficialBiaya(selectedUsulan.deskripsi)!)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info Suara Koin Warga (Hanya tampil di Fase 3 ke atas saat periode voting dibuka) */}
                  {config.faseAktif >= 3 && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-gray-500 font-medium">Akumulasi Suara Koin Warga (Fase 3):</p>
                        <p className="text-base font-black text-blue-600">{selectedUsulan.total_token || 0} Koin</p>
                      </div>
                    </div>
                  )}

                  {config.faseAktif === 2 && selectedUsulan.status !== 'pending' && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleUpdateStatus(selectedUsulan.id, 'pending')}
                        className="text-gray-500 hover:text-gray-800 underline font-medium text-xs"
                      >
                        Kembalikan ke Status Pending (Desk Teknis)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 rounded-b-3xl">
              <button
                onClick={() => setSelectedUsulan(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Konfirmasi Penolakan Usulan */}
      {isRejectModalOpen && usulanToReject && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Popup */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-gray-100 bg-rose-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                    Konfirmasi Penolakan Usulan
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Alasan penolakan resmi untuk transparansi warga
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setUsulanToReject(null);
                  setRejectionReason('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Form (Scrollable jika layar sempit) */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Ringkasan Usulan */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Judul Usulan:
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    #{usulanToReject.id.substring(0, 8)}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-900 line-clamp-1 mt-0.5">
                  {usulanToReject.judul}
                </p>
              </div>

              {/* Pilihan Cepat Alasan Penolakan */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Pilihan Cepat Alasan Penolakan:
                </label>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Tanah sengketa / milik perorangan',
                    'Di luar kewenangan APBDes (Pemkab/Pusat)',
                    'Lokasi tidak memenuhi standar teknis',
                    'Biaya melampaui batas pagu Budget Cap',
                    'Duplikasi dengan rencana desa lainnya',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className={`text-[10px] px-2 py-1 rounded-lg border text-left transition ${
                        rejectionReason === preset
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Alasan Penolakan */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Alasan Penolakan Resmi (Wajib Diisi):
                </label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan alasan penolakan secara spesifik..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white resize-none"
                />
              </div>

              {/* Info Transparansi Warga */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[10px] text-amber-900 leading-snug">
                <span className="font-bold">ℹ️ Transparansi:</span> Alasan ini tersimpan dan dapat dibaca oleh pemohon di detail usulan pada peta.
              </div>
            </div>

            {/* Footer Tombol Aksi */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setUsulanToReject(null);
                  setRejectionReason('');
                }}
                disabled={isSubmittingRejection}
                className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingRejection || !rejectionReason.trim()}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isSubmittingRejection ? 'Menolak...' : 'Konfirmasi Tolak'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
