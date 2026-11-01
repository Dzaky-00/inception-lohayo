'use client';
import { useState, useMemo, useEffect } from 'react';
import AppShell from '@/components/AppShell';

interface DesaItem {
  id: string;
  nama: string;
  kec: string;
  kab: string;
  adminEmail: string;
  paguAnggaran: number;
  serapanNominal: number;
  totalWargaDpt: number;
  wargaAktif: number;
  statusApi: 'Aktif Terhubung' | 'Sinkronisasi Ulang' | 'Nonaktif';
}

interface ApiDesaMaster {
  kodeWilayah: string;
  nama: string;
  kec: string;
  kab: string;
  paguOmspan: number;
  dptSiak: number;
  emailRekomendasi: string;
}

// Master Data Gateway Wilayah Kemendagri & Kemenkeu OMSPAN (Katalog Layanan API Nasional)
const MASTER_API_KEMENDAGRI: ApiDesaMaster[] = [
  {
    kodeWilayah: '35.78.01.2001',
    nama: 'Desa Keputih',
    kec: 'Sukolilo',
    kab: 'Surabaya',
    paguOmspan: 2350000000,
    dptSiak: 5210,
    emailRekomendasi: 'admin.keputih@desa.id',
  },
  {
    kodeWilayah: '35.78.02.2002',
    nama: 'Desa Rungkut Kidul',
    kec: 'Rungkut',
    kab: 'Surabaya',
    paguOmspan: 2150000000,
    dptSiak: 4650,
    emailRekomendasi: 'admin.rungkutkidul@desa.id',
  },
  {
    kodeWilayah: '35.15.08.2004',
    nama: 'Desa Wadungasri',
    kec: 'Waru',
    kab: 'Sidoarjo',
    paguOmspan: 2680000000,
    dptSiak: 6340,
    emailRekomendasi: 'admin.wadungasri@desa.id',
  },
  {
    kodeWilayah: '35.15.12.2006',
    nama: 'Desa Sedati Gede',
    kec: 'Sedati',
    kab: 'Sidoarjo',
    paguOmspan: 2220000000,
    dptSiak: 4980,
    emailRekomendasi: 'admin.sedatigede@desa.id',
  },
  {
    kodeWilayah: '35.25.04.2003',
    nama: 'Desa Suci',
    kec: 'Manyar',
    kab: 'Gresik',
    paguOmspan: 2450000000,
    dptSiak: 5800,
    emailRekomendasi: 'admin.suci@desa.id',
  },
  {
    kodeWilayah: '35.07.15.2001',
    nama: 'Desa Pujon Kidul',
    kec: 'Pujon',
    kab: 'Malang',
    paguOmspan: 1950000000,
    dptSiak: 4120,
    emailRekomendasi: 'admin.pujonkidul@desa.id',
  },
];

const INITIAL_DESA: DesaItem[] = [
  {
    id: 'DS-001',
    nama: 'Desa Sukamakmur',
    kec: 'Kenjeran',
    kab: 'Surabaya',
    adminEmail: 'admin@desa.id',
    paguAnggaran: 2400000000, // Rp 2,40 M
    serapanNominal: 1650000000,
    totalWargaDpt: 4800,
    wargaAktif: 3420, // 71.2%
    statusApi: 'Aktif Terhubung',
  },
  {
    id: 'DS-002',
    nama: 'Desa Karanganyar',
    kec: 'Rungkut',
    kab: 'Surabaya',
    adminEmail: 'kades.karang@jatim.id',
    paguAnggaran: 1850000000, // Rp 1,85 M
    serapanNominal: 1120000000,
    totalWargaDpt: 3900,
    wargaAktif: 2580, // 66.1%
    statusApi: 'Aktif Terhubung',
  },
  {
    id: 'DS-003',
    nama: 'Desa Wonosari',
    kec: 'Wonokromo',
    kab: 'Surabaya',
    adminEmail: 'wonosari.admin@desa.id',
    paguAnggaran: 2750000000, // Rp 2,75 M
    serapanNominal: 1900000000,
    totalWargaDpt: 5600,
    wargaAktif: 3820, // 68.2%
    statusApi: 'Sinkronisasi Ulang',
  },
  {
    id: 'DS-004',
    nama: 'Desa Sumberrejo',
    kec: 'Gubeng',
    kab: 'Surabaya',
    adminEmail: 'admin.sumber@desa.id',
    paguAnggaran: 2100000000, // Rp 2,10 M
    serapanNominal: 950000000,
    totalWargaDpt: 4200,
    wargaAktif: 2310, // 55.0%
    statusApi: 'Aktif Terhubung',
  },
  {
    id: 'DS-005',
    nama: 'Desa Banjarsari',
    kec: 'Tambaksari',
    kab: 'Surabaya',
    adminEmail: 'banjarsari.adm@desa.id',
    paguAnggaran: 2900000000, // Rp 2,90 M
    serapanNominal: 1450000000,
    totalWargaDpt: 6100,
    wargaAktif: 4150, // 68.0%
    statusApi: 'Aktif Terhubung',
  },
  {
    id: 'DS-006',
    nama: 'Desa Sidomulyo',
    kec: 'Tegalsari',
    kab: 'Surabaya',
    adminEmail: 'sidomulyo@desa.id',
    paguAnggaran: 2200000000, // Rp 2,20 M
    serapanNominal: 450000000,
    totalWargaDpt: 3800,
    wargaAktif: 1140, // 30.0%
    statusApi: 'Nonaktif',
  },
];

// Formatter IDR ringkas dan resmi (contoh: Rp 14,2 Miliar)
function formatRupiahRingkas(nominal: number): string {
  if (nominal >= 1000000000) {
    const miliar = nominal / 1000000000;
    return `Rp ${miliar.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Miliar`;
  }
  if (nominal >= 1000000) {
    const juta = nominal / 1000000;
    return `Rp ${juta.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Juta`;
  }
  return `Rp ${nominal.toLocaleString('id-ID')}`;
}

export default function SuperAdminPage() {
  const [daftarDesa, setDaftarDesa] = useState<DesaItem[]>(INITIAL_DESA);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('31 Okt 2026, 08:30 WIB');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDesa, setSelectedDesa] = useState<DesaItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [selectedApiKode, setSelectedApiKode] = useState('');

  const [formDesa, setFormDesa] = useState({
    kodeKemendagri: '',
    nama: '',
    kec: '',
    kab: '',
    emailAdmin: '',
    passAdmin: '',
    paguAnggaran: '2000000000',
    totalWargaDpt: '4000',
  });

  // Kunci scroll background saat salah satu pop-up modal dibuka
  useEffect(() => {
    if (selectedDesa || isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [selectedDesa, isModalOpen]);

  // Kalkulasi Metrik Agregasi Nasional (Realtime)
  const totalDesa = daftarDesa.length;
  const desaAktif = daftarDesa.filter((d) => d.statusApi === 'Aktif Terhubung').length;
  const desaSync = daftarDesa.filter((d) => d.statusApi === 'Sinkronisasi Ulang').length;
  const desaNonaktif = daftarDesa.filter((d) => d.statusApi === 'Nonaktif').length;

  const totalPagu = useMemo(
    () => daftarDesa.reduce((acc, curr) => acc + curr.paguAnggaran, 0),
    [daftarDesa]
  );
  const totalSerapan = useMemo(
    () => daftarDesa.reduce((acc, curr) => acc + curr.serapanNominal, 0),
    [daftarDesa]
  );
  const persenSerapanNasional = totalPagu > 0 ? Math.round((totalSerapan / totalPagu) * 100) : 0;

  const totalWargaAktif = useMemo(
    () => daftarDesa.reduce((acc, curr) => acc + curr.wargaAktif, 0),
    [daftarDesa]
  );
  const totalDpt = useMemo(
    () => daftarDesa.reduce((acc, curr) => acc + curr.totalWargaDpt, 0),
    [daftarDesa]
  );
  const persenPartisipasiNasional = totalDpt > 0 ? Math.round((totalWargaAktif / totalDpt) * 100) : 0;

  // Filter & Pencarian Desa
  const filteredDesa = useMemo(() => {
    return daftarDesa.filter((d) => {
      const matchSearch =
        d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.kec.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterStatus === 'all' || d.statusApi === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [daftarDesa, searchQuery, filterStatus]);

  const triggerApiDukcapil = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
      // Update aktif partisipan dari sinkronisasi DPT
      setDaftarDesa((prev) =>
        prev.map((d) => ({
          ...d,
          totalWargaDpt: d.totalWargaDpt + Math.floor(Math.random() * 25) + 10,
          statusApi: d.statusApi === 'Sinkronisasi Ulang' ? 'Aktif Terhubung' : d.statusApi,
        }))
      );
      alert('Sinkronisasi SIAK Kemendagri Berhasil! Data NIK DPT dan status koneksi API otomatis diperbarui.');
    }, 1200);
  };

  const handlePilihApiDesa = (kode: string) => {
    setSelectedApiKode(kode);
    const found = MASTER_API_KEMENDAGRI.find((m) => m.kodeWilayah === kode);
    if (found) {
      setFormDesa({
        kodeKemendagri: found.kodeWilayah,
        nama: found.nama,
        kec: found.kec,
        kab: found.kab,
        emailAdmin: found.emailRekomendasi,
        passAdmin: 'Desa2026!*',
        paguAnggaran: found.paguOmspan.toString(),
        totalWargaDpt: found.dptSiak.toString(),
      });
    }
  };

  const handleTambahDesa = (e: React.FormEvent) => {
    e.preventDefault();
    const idBaru = formDesa.kodeKemendagri || `DS-00${daftarDesa.length + 1}`;
    const paguNum = parseInt(formDesa.paguAnggaran, 10) || 0;
    const dptNum = parseInt(formDesa.totalWargaDpt, 10) || 1000;

    const newDesa: DesaItem = {
      id: idBaru,
      nama: formDesa.nama,
      kec: formDesa.kec,
      kab: formDesa.kab,
      adminEmail: formDesa.emailAdmin,
      paguAnggaran: paguNum,
      serapanNominal: 0,
      totalWargaDpt: dptNum,
      wargaAktif: 0,
      statusApi: 'Aktif Terhubung',
    };

    setDaftarDesa((prev) => [...prev, newDesa]);
    setIsModalOpen(false);
    setSelectedApiKode('');
    setFormDesa({
      kodeKemendagri: '',
      nama: '',
      kec: '',
      kab: '',
      emailAdmin: '',
      passAdmin: '',
      paguAnggaran: '2000000000',
      totalWargaDpt: '4000',
    });
    alert(`Entitas wilayah ${newDesa.nama} (${newDesa.id}) berhasil diterbitkan dari integrasi gateway!`);
  };

  const handleResetPasswordDesa = () => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      alert('Kata sandi baru minimal 6 karakter!');
      return;
    }
    alert(`Kata sandi akun dinas ${selectedDesa?.adminEmail} berhasil diperbarui!`);
    setNewPasswordInput('');
  };

  const handleToggleStatusDesa = () => {
    if (!selectedDesa) return;
    const newStatus = selectedDesa.statusApi === 'Nonaktif' ? 'Aktif Terhubung' : 'Nonaktif';
    setDaftarDesa((prev) =>
      prev.map((d) => (d.id === selectedDesa.id ? { ...d, statusApi: newStatus } : d))
    );
    setSelectedDesa((prev) => (prev ? { ...prev, statusApi: newStatus } : null));
    alert(`Status entitas ${selectedDesa.nama} kini "${newStatus}".`);
  };

  return (
    <AppShell allowedRole="superadmin">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pengawasan Wilayah Nasional</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Konsolidasi makro pagu anggaran APBDes, registrasi entitas desa, dan metrik partisipasi warga.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-indigo-200">
              Otoritas Pusat: Kementerian / PMD
            </span>
          </div>
        </div>

        {/* 3 KARTU STATISTIK UTAMA (SESUAI PERMINTAAN USER) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Total Desa Terdaftar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Desa Terdaftar</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-gray-900">{totalDesa}</span>
                  <span className="text-xs font-semibold text-gray-500">Entitas Wilayah</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                🏛️
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap text-[11px]">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {desaAktif} Aktif
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {desaSync} Sinkronisasi
              </span>
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                {desaNonaktif} Nonaktif
              </span>
            </div>
          </div>

          {/* 2. Total Pagu Anggaran Terkonsolidasi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Pagu Anggaran Terkonsolidasi</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-emerald-600">{formatRupiahRingkas(totalPagu)}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                💰
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-gray-500 font-medium">Serapan APBDes Berjalan:</span>
                <span className="font-bold text-gray-800">
                  {formatRupiahRingkas(totalSerapan)} ({persenSerapanNasional}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${persenSerapanNasional}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 3. Partisipasi Warga Aktif */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Partisipasi Warga Aktif</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-indigo-600">{totalWargaAktif.toLocaleString('id-ID')}</span>
                  <span className="text-xs font-semibold text-gray-500">Jiwa Aktif</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
                👥
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">
                Tingkat Partisipasi: <strong className="text-indigo-700">{persenPartisipasiNasional}%</strong> dari DPT
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Musrenbang Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Banner API Disdukcapil (SIAK Kemendagri) */}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm border border-indigo-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Integrasi Gateway REST API Disdukcapil (SIAK Kemendagri)
              </p>
            </div>
            <h2 className="text-lg font-bold">Sinkronisasi Basis Data Kependudukan</h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Verifikasi otomatis NIK DPT secara real-time. Memastikan keabsahan hak suara warga desa dan mencegah
              manipulasi pemungutan suara kuadratik pada usulan infrastruktur.
            </p>
            <p className="text-[11px] text-indigo-300 mt-2 font-mono">
              Pembaruan Terakhir: <strong>{lastSyncTime}</strong> | Total DPT Terdaftar:{' '}
              <strong>{totalDpt.toLocaleString('id-ID')} Jiwa</strong>
            </p>
          </div>

          <button
            onClick={triggerApiDukcapil}
            disabled={isSyncing}
            className="shrink-0 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            {isSyncing ? 'Menghubungkan SIAK...' : 'Tarik Pembaruan NIK API'}
          </button>
        </div>

        {/* Tabel Entitas Wilayah & Partisipasi per Desa */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Daftar Entitas Wilayah & Status Desa</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoring menyeluruh pagu anggaran, serapan dana, serta partisipasi aktif warga per desa.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2"
              >
                <span>+</span> Daftarkan Desa Baru
              </button>
            </div>
          </div>

          {/* Filter & Pencarian */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Cari desa, kecamatan, atau kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-gray-500 shrink-0 font-medium">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl outline-none text-xs font-medium text-gray-700"
              >
                <option value="all">Semua Status ({totalDesa})</option>
                <option value="Aktif Terhubung">Aktif Terhubung ({desaAktif})</option>
                <option value="Sinkronisasi Ulang">Sinkronisasi Ulang ({desaSync})</option>
                <option value="Nonaktif">Nonaktif ({desaNonaktif})</option>
              </select>
            </div>
          </div>

          {/* Tabel Konten (5 Kolom Bersih & Rapi) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-600 border-b border-gray-200">
                  <th className="p-4 font-bold">Desa & Wilayah</th>
                  <th className="p-4 font-bold">Pagu & Serapan APBDes</th>
                  <th className="p-4 font-bold">Partisipasi Warga</th>
                  <th className="p-4 font-bold">Status Integrasi</th>
                  <th className="p-4 font-bold text-right">Aksi Otoritas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDesa.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Tidak ada entitas desa yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredDesa.map((d) => {
                    const persenDesa = Math.round((d.wargaAktif / d.totalWargaDpt) * 100);
                    const persenSerapanDesa = Math.round((d.serapanNominal / d.paguAnggaran) * 100);

                    return (
                      <tr key={d.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              {d.id}
                            </span>
                            <span className="font-bold text-gray-900 text-sm">{d.nama}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Kec. {d.kec}, Kab. {d.kab}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900 text-xs">
                            {formatRupiahRingkas(d.paguAnggaran)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            Serapan: {formatRupiahRingkas(d.serapanNominal)} ({persenSerapanDesa}%)
                          </div>
                        </td>
                        <td className="p-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-gray-800">
                              {d.wargaAktif.toLocaleString('id-ID')} Warga
                            </span>
                            <span
                              className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                persenDesa >= 60
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : persenDesa >= 40
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {persenDesa}% DPT
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-[width] duration-300"
                              style={{ width: `${persenDesa}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${
                              d.statusApi === 'Aktif Terhubung'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : d.statusApi === 'Sinkronisasi Ulang'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {d.statusApi}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedDesa(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors border border-indigo-200"
                          >
                            <span>🔍</span> Buka Profil Desa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Daftarkan Desa Baru (Integrasi Gateway Otomatis) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
              {/* Header Pinned di Atas dengan Tombol Silang Tunggal */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Daftarkan Entitas Desa Baru</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Integrasi REST API Gateway Kemendagri (SIAK) & Kemenkeu (OMSPAN).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedApiKode('');
                  }}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition text-base font-bold leading-none shrink-0"
                  title="Tutup Modal"
                >
                  ✕
                </button>
              </div>

              {/* Body Form yang Bisa Di-scroll Halus */}
              <div className="p-6 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {/* Gateway Auto-Pull Dropdown */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-3.5 mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Tarik Otomatis dari Gateway Instansi Terhubung
                    </label>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded">
                      Kemendagri & Kemenkeu
                    </span>
                  </div>
                  <select
                    value={selectedApiKode}
                    onChange={(e) => handlePilihApiDesa(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Wilayah dari Master Data Nasional (Auto-Fill) --</option>
                    {MASTER_API_KEMENDAGRI.map((item) => (
                      <option key={item.kodeWilayah} value={item.kodeWilayah}>
                        [{item.kodeWilayah}] {item.nama} — Kec. {item.kec}, {item.kab}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-700/80 mt-1.5">
                    💡 Memilih desa dari gateway akan menarik otomatis DPT dari SIAK Dukcapil & Pagu dari OMSPAN Kemenkeu.
                  </p>
                </div>

                <form onSubmit={handleTambahDesa} className="space-y-4">
                  {formDesa.kodeKemendagri && (
                    <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-medium">
                        Kodefikasi Wilayah Resmi Kemendagri:
                      </span>
                      <strong className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {formDesa.kodeKemendagri}
                      </strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nama Desa</label>
                    <input
                      type="text"
                      required
                      value={formDesa.nama}
                      onChange={(e) => setFormDesa({ ...formDesa, nama: e.target.value })}
                      placeholder="Mis: Desa Sukamakmur"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kecamatan</label>
                      <input
                        type="text"
                        required
                        value={formDesa.kec}
                        onChange={(e) => setFormDesa({ ...formDesa, kec: e.target.value })}
                        placeholder="Kenjeran"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kabupaten/Kota</label>
                      <input
                        type="text"
                        required
                        value={formDesa.kab}
                        onChange={(e) => setFormDesa({ ...formDesa, kab: e.target.value })}
                        placeholder="Surabaya"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Pagu APBDes Siap Salur (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        min={100000000}
                        step={50000000}
                        value={formDesa.paguAnggaran}
                        onChange={(e) => setFormDesa({ ...formDesa, paguAnggaran: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        DPT Kependudukan (Jiwa)
                      </label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={formDesa.totalWargaDpt}
                        onChange={(e) => setFormDesa({ ...formDesa, totalWargaDpt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Email Dinas Admin Desa
                    </label>
                    <input
                      type="email"
                      required
                      value={formDesa.emailAdmin}
                      onChange={(e) => setFormDesa({ ...formDesa, emailAdmin: e.target.value })}
                      placeholder="admin.sukamakmur@desa.id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Kata Sandi Awal Akun Dinas
                    </label>
                    <input
                      type="password"
                      required
                      value={formDesa.passAdmin}
                      onChange={(e) => setFormDesa({ ...formDesa, passAdmin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Terbitkan Akun Dinas & Alokasi Pagu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Profil & Kelola Desa (Clean Administrative Header & Single Pinned Close Button) */}
        {selectedDesa && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
              {/* 1. Header Profil Administratif (Pinned di Atas, Tombol Silang Tetap Mengikuti) */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                      {selectedDesa.id}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{selectedDesa.nama}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedDesa.statusApi === 'Aktif Terhubung'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedDesa.statusApi === 'Sinkronisasi Ulang'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {selectedDesa.statusApi}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Kecamatan {selectedDesa.kec}, Kabupaten/Kota {selectedDesa.kab} • Akun Dinas:{' '}
                    <span className="font-mono font-medium text-gray-700">{selectedDesa.adminEmail}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDesa(null)}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition text-base font-bold leading-none shrink-0"
                  title="Tutup Modal"
                >
                  ✕
                </button>
              </div>

              {/* 2. Body Konten (Scroll Halus dengan Scrollbar Bersih) */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {/* Rincian Pagu Dana Desa (100% Tersalurkan, Terbagi 2 Pos: Pembangunan & Darurat) */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Alokasi Pagu APBDes TA 2026 (100% Tersalurkan)
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Pagu telah cair penuh dari pusat dan dibagi ke dalam 2 pos anggaran utama desa.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-indigo-700">
                        {formatRupiahRingkas(selectedDesa.paguAnggaran)}
                      </span>
                      <span className="block text-[10px] text-gray-400">Total Pagu Siap Salur</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Pos 1: Dana Pembangunan (70%) */}
                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-blue-900">1. Dana Pembangunan (70%)</span>
                        <span className="text-xs font-mono font-bold text-blue-700">
                          {formatRupiahRingkas(selectedDesa.paguAnggaran * 0.7)}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800/80 leading-relaxed">
                        Diperuntukkan untuk proyek fisik, perbaikan jalan, selokan, dan infrastruktur hasil voting warga di WebGIS.
                      </p>
                      <div className="mt-3 pt-2 border-t border-blue-200/60 flex justify-between items-center text-[10px]">
                        <span className="text-blue-700">Realisasi Serapan Berjalan:</span>
                        <strong className="text-blue-950 font-bold">{formatRupiahRingkas(selectedDesa.serapanNominal)}</strong>
                      </div>
                    </div>

                    {/* Pos 2: Dana Darurat (30%) */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-amber-900">2. Dana Darurat (30%)</span>
                        <span className="text-xs font-mono font-bold text-amber-700">
                          {formatRupiahRingkas(selectedDesa.paguAnggaran * 0.3)}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        Pos dana cadangan tanggap darurat bencana alam, krisis pangan, atau kejadian mendesak yang butuh penanganan instan.
                      </p>
                      <div className="mt-3 pt-2 border-t border-amber-200/60 flex justify-between items-center text-[10px]">
                        <span className="text-amber-700">Status Saldo Cadangan:</span>
                        <strong className="text-emerald-700 font-bold">Siap Pakai (Tersimpan di RKD)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrik Partisipasi & SIAK Kependudukan */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Status Partisipasi Warga & Integrasi SIAK Kemendagri
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">DPT SIAK</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">
                        {selectedDesa.totalWargaDpt.toLocaleString('id-ID')}
                      </p>
                      <span className="text-[9px] text-gray-400">Jiwa Terdaftar</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Warga Aktif</p>
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">
                        {selectedDesa.wargaAktif.toLocaleString('id-ID')}
                      </p>
                      <span className="text-[9px] text-gray-400">Punya Token Suara</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Rasio Partisipasi</p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5">
                        {Math.round((selectedDesa.wargaAktif / selectedDesa.totalWargaDpt) * 100)}%
                      </p>
                      <span className="text-[9px] text-emerald-600 font-semibold">Tercatat Aktif</span>
                    </div>
                  </div>
                </div>

                {/* Kontrol Akses & Kredensial Admin Desa */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Tata Kelola Otoritas & Kredensial Desa
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="w-full sm:w-auto">
                      <p className="text-xs font-medium text-gray-700">Reset Kata Sandi Admin Desa</p>
                      <p className="text-[11px] text-gray-500">
                        Terbitkan kata sandi baru jika perangkat desa setempat mengalami kendala login.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="password"
                        placeholder="Kata sandi baru..."
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-44"
                      />
                      <button
                        type="button"
                        onClick={handleResetPasswordDesa}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition whitespace-nowrap"
                      >
                        Reset Sandi
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Status Operasional Entitas</p>
                      <p className="text-[11px] text-gray-500">
                        Nonaktifkan desa jika dalam evaluasi atau terjadi pelanggaran administrasi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleStatusDesa}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        selectedDesa.statusApi === 'Nonaktif'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      {selectedDesa.statusApi === 'Nonaktif'
                        ? 'Aktifkan Kembali Desa'
                        : 'Bekukan / Nonaktifkan Desa'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
