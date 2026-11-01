'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  getMusrenbangConfig,
  fetchMusrenbangConfigFromDb,
  saveMusrenbangConfig,
  calculateAllocationsFromTotalApbdes,
  formatNumberWithDots,
  getActiveFaseFromDate,
  getEffectiveCurrentDate,
  MusrenbangConfig,
  formatRupiah,
  MusrenbangFase,
} from '@/components/musrenbangConfig';
import {
  ShieldAlert,
  Trophy,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Lock,
  CalendarDays,
  AlertCircle,
  X,
  DollarSign,
  FileText,
  UploadCloud,
} from 'lucide-react';

export default function PengaturanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'desa' | 'akun'>('desa');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);

  // State Konfigurasi Musrenbang & APBDes (Hanya Total Dana yang dapat diedit)
  const [anggaran, setAnggaran] = useState('1.250.000.000');
  const [fileBukti, setFileBukti] = useState<{ name: string; size: string; type: string; url?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State Jadwal Rentang Waktu 3 Fase (Diatur Manual oleh Admin Desa)
  const [fase1Start, setFase1Start] = useState('2026-11-01');
  const [fase1End, setFase1End] = useState('2026-11-14');
  const [fase2Start, setFase2Start] = useState('2026-11-15');
  const [fase2End, setFase2End] = useState('2026-11-21');
  const [fase3Start, setFase3Start] = useState('2026-11-22');
  const [fase3End, setFase3End] = useState('2026-12-12');

  // Perhitungan pembagian otomatis alokasi dengan Rasio 7 : 3 dari Total APBDes
  // 70% (Rasio 7) untuk Batas Anggaran Partisipatif (Budget Cap)
  // 30% (Rasio 3) untuk Pos Belanja Tidak Terduga (BTT) Kedaruratan
  const totalNum = parseInt(anggaran.replace(/\D/g, ''), 10) || 0;
  const { budgetCap: autoBudgetCap, danaBtt: autoDanaBtt } = calculateAllocationsFromTotalApbdes(totalNum);

  // Kalkulasi fase aktif otomatis berdasarkan tanggal sistem / simulasi
  const curEffectiveDate = getEffectiveCurrentDate();
  const { fase: faseAktifAuto, statusText: activeStatusText } = getActiveFaseFromDate(curEffectiveDate, {
    fase1Start,
    fase1End,
    fase2Start,
    fase2End,
    fase3Start,
    fase3End,
  });

  // State Akun Admin
  const [namaAdmin, setNamaAdmin] = useState('Perangkat Desa Sukamakmur');
  const [emailAdmin, setEmailAdmin] = useState('admin@desa.id');
  const [passwordBaru, setPasswordBaru] = useState('');

  useEffect(() => {
    // Muat konfigurasi awal dari database / cache
    fetchMusrenbangConfigFromDb().then((cfg) => {
      setAnggaran(formatNumberWithDots(cfg.totalApbdes));
      if (cfg.fase1Start) setFase1Start(cfg.fase1Start);
      if (cfg.fase1End) setFase1End(cfg.fase1End);
      if (cfg.fase2Start) setFase2Start(cfg.fase2Start);
      if (cfg.fase2End) setFase2End(cfg.fase2End);
      if (cfg.fase3Start) setFase3Start(cfg.fase3Start);
      if (cfg.fase3End) setFase3End(cfg.fase3End);
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const isImage = file.type.startsWith('image/');

    setFileBukti({
      name: file.name,
      size: fileSizeFormatted,
      type: file.type,
      url: isImage ? URL.createObjectURL(file) : undefined,
    });
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalNum <= 0) {
      toast.error('Total dana APBDes harus lebih dari Rp 0!');
      return;
    }

    setIsSaving(true);

    const res = await saveMusrenbangConfig({
      totalApbdes: totalNum,
      budgetCap: autoBudgetCap,
      danaBtt: autoDanaBtt,
      fase1Start,
      fase1End,
      fase2Start,
      fase2End,
      fase3Start,
      fase3End,
    });

    if (res.success) {
      toast.success('Pengaturan berhasil disimpan!');
      // Otomatis redirect ke Dashboard Usulan (/admin)
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
    } else {
      toast.error(res.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 bg-blue-100 text-blue-700 rounded-lg">
            <Lock className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Hak Akses Khusus: Administrator Desa
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem & Alokasi Anggaran</h1>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi alokasi dana APBDes, pagu partisipatif (Budget Cap), dana darurat BTT, dan siklus voting 3 fase.
        </p>
      </div>

      {/* Banner Otoritas Eksklusif Admin Desa */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-blue-900 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-950">Alokasi Dana Hanya Dapat Diatur Oleh Admin Desa</p>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            Sesuai tata kelola pemerintahan desa, hanya akun Admin Desa terverifikasi yang memiliki wewenang menetapkan besaran Pagu Partisipatif (Budget Cap), Kas Kedaruratan (BTT), serta transisi tahapan Musrenbang. Data ini otomatis disajikan secara transparan di dashboard seluruh warga.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('desa')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'desa'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Alokasi APBDes, Pagu & 3 Fase
        </button>
        <button
          onClick={() => setActiveTab('akun')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'akun'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Kredensial Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <form onSubmit={handleSimpan} className="space-y-6">
          {activeTab === 'desa' && (
            <>
              {/* 1. Pengaturan Jadwal 3 Fase Musrenbang */}
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/80 shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">
                          1. Pengaturan Jadwal 3 Fase Musrenbang
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsJadwalModalOpen(true)}
                          className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/90 inline-flex items-center justify-center transition shadow-2xs cursor-pointer"
                          title="Klik untuk melihat ketentuan tahapan Fase 1, 2, 3, dan Pasca Fase 3"
                        >
                          <AlertCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">Tentukan rentang tanggal pelaksanaan setiap tahapan musrenbang</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Fase 1 */}
                  <div className="p-4 rounded-2xl border border-gray-200/90 bg-white hover:border-amber-300 shadow-2xs transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        Fase 1: Pengajuan Usulan
                      </span>
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        1
                      </span>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Mulai:</label>
                        <input
                          type="date"
                          value={fase1Start}
                          onChange={(e) => setFase1Start(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Berakhir:</label>
                        <input
                          type="date"
                          value={fase1End}
                          onChange={(e) => setFase1End(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fase 2 */}
                  <div className="p-4 rounded-2xl border border-gray-200/90 bg-white hover:border-blue-300 shadow-2xs transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                        Fase 2: Desk Teknis & RAB
                      </span>
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        2
                      </span>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Mulai:</label>
                        <input
                          type="date"
                          value={fase2Start}
                          onChange={(e) => setFase2Start(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Berakhir:</label>
                        <input
                          type="date"
                          value={fase2End}
                          onChange={(e) => setFase2End(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fase 3 */}
                  <div className="p-4 rounded-2xl border border-gray-200/90 bg-white hover:border-emerald-300 shadow-2xs transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Fase 3: Voting Koin Warga
                      </span>
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        3
                      </span>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Mulai:</label>
                        <input
                          type="date"
                          value={fase3Start}
                          onChange={(e) => setFase3Start(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Tanggal Berakhir:</label>
                        <input
                          type="date"
                          value={fase3End}
                          onChange={(e) => setFase3End(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Pengaturan Total APBDes */}
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/80 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">
                          2. Pengaturan Total APBDes
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsInfoModalOpen(true)}
                          className="w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/90 inline-flex items-center justify-center transition shadow-2xs cursor-pointer"
                          title="Klik untuk melihat ketentuan batas rasio alokasi & total dana anggaran"
                        >
                          <AlertCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">Pagu anggaran belanja desa yang dialokasikan dalam siklus partisipasi</p>
                    </div>
                  </div>
                </div>

                {/* Input Total Dana APBDes (Hanya ini yang dapat diedit) */}
                <div className="p-5 rounded-2xl border border-gray-200/90 bg-slate-50/50 space-y-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Total Seluruh APBDes Desa (Rp) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
                      Terbilang: {formatRupiah(totalNum)}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={anggaran}
                      onChange={(e) => setAnggaran(formatNumberWithDots(e.target.value))}
                      placeholder="Contoh: 1.250.000.000"
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-extrabold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-xs transition"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Upload Berkas Transparansi */}
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/80 shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        3. Berkas Transparansi APBDes
                      </h3>
                      <p className="text-[11px] text-gray-500">Dokumen pendukung publikasi anggaran desa</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl bg-gray-50/40 hover:bg-blue-50/20 transition text-center space-y-2">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto border border-blue-100">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                      <span>Pilih berkas</span>
                      <span className="text-gray-500 font-normal"> atau seret ke sini</span>
                    </label>
                    <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX, XLSX, atau Gambar (Maks. 10MB)</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {fileBukti && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 shadow-2xs mt-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{fileBukti.name}</span>
                      <span className="text-[10px] text-gray-400">({fileBukti.size})</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'akun' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
                Kredensial & Akun Dinas
              </h3>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Perangkat / Instansi</label>
                <input
                  type="text"
                  value={namaAdmin}
                  onChange={(e) => setNamaAdmin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Dinas Resmi</label>
                <input
                  type="email"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Baru</label>
                <input
                  type="password"
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengganti kata sandi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-xs transition disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Popup Informasi Ketentuan Rasio & Pembagian Anggaran */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Popup */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-emerald-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                    Ketentuan Pembagian Alokasi APBDes
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Sistem Rasio 7:3 (Budget Cap & Dana BTT Kedaruratan)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Ketentuan & Rincian Pembagian Alokasi */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Callout Penjelasan Ketentuan Rasio 7:3 */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-black text-[10px] tracking-wider uppercase">
                    Rasio 7 : 3
                  </span>
                  <span className="font-bold text-xs text-amber-900">
                    Formula Regulasi Keuangan Desa
                  </span>
                </div>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  Hanya <strong>Total Seluruh APBDes</strong> yang dapat diedit oleh Admin Desa. Sistem secara otomatis menghitung dan membagi alokasi dana dengan rasio <strong>7 : 3</strong> untuk menjamin transparansi serta kepastian dana darurat desa.
                </p>
              </div>

              {/* Rincian Total Dana Pembagian Anggaran Berdasarkan Input Saat Ini */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-gray-700 text-xs">Total Seluruh APBDes Saat Ini:</span>
                  <span className="text-sm font-black text-blue-700">{formatRupiah(totalNum)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Budget Cap (70%) */}
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Budget Cap
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> 70%
                      </span>
                    </div>
                    <p className="text-base font-black text-emerald-700">
                      {formatRupiah(autoBudgetCap)}
                    </p>
                    <p className="text-[10px] text-emerald-800/80 leading-snug">
                      Batas pagu anggaran partisipatif untuk usulan warga pada Leaderboard Musrenbang.
                    </p>
                  </div>

                  {/* Dana BTT (30%) */}
                  <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        Pos BTT
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> 30%
                      </span>
                    </div>
                    <p className="text-base font-black text-red-700">
                      {formatRupiah(autoDanaBtt)}
                    </p>
                    <p className="text-[10px] text-red-800/80 leading-snug">
                      Belanja Tidak Terduga untuk penanganan cepat bencana atau fasum darurat desa.
                    </p>
                  </div>
                </div>
              </div>

              {/* Catatan Transparansi */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold flex items-center gap-1 text-blue-950 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Prinsip Transparansi Publik:
                </span>
                Besaran Budget Cap ini disajikan kepada seluruh warga di beranda dan papan peringkat sebagai batas kelolosan resmi usulan.
              </div>
            </div>

            {/* Footer Popup */}
            <div className="p-3 sm:p-3.5 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Informasi Ketentuan Alur 3 Fase & Pasca Musrenbang */}
      {isJadwalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Popup */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-blue-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                    Ketentuan Tahapan Siklus Musrenbang
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Panduan alur pelaksanaan perencanaan pembangunan partisipatif desa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJadwalModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Ketentuan Per Fase (Bahasa Umum & Profesional) */}
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Fase 1 */}
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    1
                  </span>
                  <h4 className="font-bold text-amber-950 text-xs">Fase 1: Penjaringan Usulan Masyarakat</h4>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Tahap pembukaan bagi warga desa untuk menyampaikan aspirasi dan gagasan pembangunan fasilitas umum di lingkungannya. Pada tahap ini, usulan-usulan baru dihimpun untuk persiapan penelaahan awal oleh Pemerintah Desa.
                </p>
              </div>

              {/* Fase 2 */}
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    2
                  </span>
                  <h4 className="font-bold text-blue-950 text-xs">Fase 2: Verifikasi Kelayakan & Desk Teknis</h4>
                </div>
                <p className="text-[11px] text-blue-900/90 leading-relaxed">
                  Tahap penelaahan kelayakan usulan oleh Pemerintah Desa, meliputi kesesuaian lokasi, keabsahan kepemilikan lahan, serta perhitungan Rencana Anggaran Biaya (RAB). Usulan yang dinyatakan layak akan disahkan untuk maju ke tahap musyawarah prioritas.
                </p>
              </div>

              {/* Fase 3 */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    3
                  </span>
                  <h4 className="font-bold text-emerald-950 text-xs">Fase 3: Musyawarah & Penentuan Prioritas</h4>
                </div>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  Tahap partisipasi aktif masyarakat desa dalam menentukan urutan prioritas pembangunan terhadap program-program yang telah terverifikasi, guna menjaring usulan yang paling mendesak dan berdampak luas bagi kesejahteraan bersama.
                </p>
              </div>

              {/* Pasca Fase 3 */}
              <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    4
                  </span>
                  <h4 className="font-bold text-purple-950 text-xs">Pasca Fase 3: Penetapan Hasil Akhir Musrenbang</h4>
                </div>
                <p className="text-[11px] text-purple-900/90 leading-relaxed">
                  Tahap pengesahan kesepakatan akhir Musrenbang Desa. Usulan prioritas teratas yang disetujui resmi didanai melalui pagu APBDes tahun anggaran berjalan dan dapat dipantau realisasinya oleh seluruh lapisan masyarakat secara terbuka.
                </p>
              </div>
            </div>

            {/* Footer Popup */}
            <div className="p-3 sm:p-3.5 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsJadwalModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
