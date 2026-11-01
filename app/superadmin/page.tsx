'use client';
import { useState, useMemo } from 'react';
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

  const [formDesa, setFormDesa] = useState({
    nama: '',
    kec: '',
    kab: '',
    emailAdmin: '',
    passAdmin: '',
    paguAnggaran: '2000000000',
    totalWargaDpt: '4000',
  });

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

  const handleTambahDesa = (e: React.FormEvent) => {
    e.preventDefault();
    const idBaru = `DS-00${daftarDesa.length + 1}`;
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
    setFormDesa({
      nama: '',
      kec: '',
      kab: '',
      emailAdmin: '',
      passAdmin: '',
      paguAnggaran: '2000000000',
      totalWargaDpt: '4000',
    });
    alert(`Entitas wilayah ${newDesa.nama} berhasil diterbitkan dengan alokasi pagu ${formatRupiahRingkas(paguNum)}!`);
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

          {/* Tabel Konten */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-gray-600 border-b border-gray-200">
                  <th className="p-3.5 font-bold">Kode</th>
                  <th className="p-3.5 font-bold">Nama Desa</th>
                  <th className="p-3.5 font-bold">Wilayah</th>
                  <th className="p-3.5 font-bold">Pagu APBDes</th>
                  <th className="p-3.5 font-bold">Serapan Dana</th>
                  <th className="p-3.5 font-bold">Partisipasi Warga Aktif</th>
                  <th className="p-3.5 font-bold">Akun Dinas Admin</th>
                  <th className="p-3.5 font-bold">Status Desa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDesa.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      Tidak ada entitas desa yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredDesa.map((d) => {
                    const persenDesa = Math.round((d.wargaAktif / d.totalWargaDpt) * 100);
                    const persenSerapanDesa = Math.round((d.serapanNominal / d.paguAnggaran) * 100);

                    return (
                      <tr key={d.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-3.5 font-mono text-gray-500 font-semibold">{d.id}</td>
                        <td className="p-3.5 font-bold text-gray-900">{d.nama}</td>
                        <td className="p-3.5 text-gray-600">
                          {d.kec}, {d.kab}
                        </td>
                        <td className="p-3.5 font-bold text-gray-800">{formatRupiahRingkas(d.paguAnggaran)}</td>
                        <td className="p-3.5">
                          <div>
                            <span className="font-semibold text-emerald-600">
                              {formatRupiahRingkas(d.serapanNominal)}
                            </span>
                            <span className="text-[10px] text-gray-400 block">{persenSerapanDesa}% terealisasi</span>
                          </div>
                        </td>
                        <td className="p-3.5 min-w-[180px]">
                          <div>
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
                                {persenDesa}% Aktif
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-[width] duration-500 ${
                                  persenDesa >= 60
                                    ? 'bg-emerald-500'
                                    : persenDesa >= 40
                                    ? 'bg-indigo-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${persenDesa}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5 block">
                              dari {d.totalWargaDpt.toLocaleString('id-ID')} DPT
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-gray-600 text-[11px]">{d.adminEmail}</td>
                        <td className="p-3.5">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Daftarkan Desa Baru */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-gray-200 w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <h3 className="text-base font-bold text-gray-800 mb-1">Daftarkan Entitas Desa Baru</h3>
              <p className="text-xs text-gray-500 mb-4">
                Input data wilayah untuk menerbitkan akun admin dan menetapkan pagu APBDes.
              </p>
              <form onSubmit={handleTambahDesa} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nama Desa</label>
                  <input
                    type="text"
                    required
                    value={formDesa.nama}
                    onChange={(e) => setFormDesa({ ...formDesa, nama: e.target.value })}
                    placeholder="Mis: Desa Sumberrejo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kecamatan</label>
                    <input
                      type="text"
                      required
                      value={formDesa.kec}
                      onChange={(e) => setFormDesa({ ...formDesa, kec: e.target.value })}
                      placeholder="Kenjeran"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Pagu APBDes Awal (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      min={100000000}
                      step={50000000}
                      value={formDesa.paguAnggaran}
                      onChange={(e) => setFormDesa({ ...formDesa, paguAnggaran: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Total DPT Warga</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={formDesa.totalWargaDpt}
                      onChange={(e) => setFormDesa({ ...formDesa, totalWargaDpt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
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
                    placeholder="admin.sumberrejo@desa.id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kata Sandi Awal</label>
                  <input
                    type="password"
                    required
                    value={formDesa.passAdmin}
                    onChange={(e) => setFormDesa({ ...formDesa, passAdmin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Terbitkan Akun & Pagu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
