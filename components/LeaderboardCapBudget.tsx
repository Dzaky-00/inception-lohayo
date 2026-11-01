'use client';

import { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Coins,
  ShieldCheck,
  ChevronRight,
  Info,
  DollarSign,
  Sparkles,
  Check,
} from 'lucide-react';
import { parseBiayaUsulan, formatRupiah, hasOfficialBiaya, getCleanDeskripsi, MusrenbangConfig } from './musrenbangConfig';

interface Usulan {
  id: string;
  judul: string;
  deskripsi: string;
  total_token: number;
  status: string;
  foto_url?: string;
  created_at?: string;
}

export interface ProcessedUsulan extends Usulan {
  rank: number;
  biaya: number;
  isLolos: boolean;
  lolosReason: 'prioritas_utama' | 'sisa_pagu_mencukupi' | 'cadangan_melebihi_pagu' | 'cadangan_pagu_habis';
  runningTotal: number;
  sisaPaguSaatGiliran: number;
}

interface LeaderboardCapBudgetProps {
  usulanList: Usulan[];
  config: MusrenbangConfig;
  onSelectUsulan?: (usulan: Usulan) => void;
}

export default function LeaderboardCapBudget({
  usulanList,
  config,
  onSelectUsulan,
}: LeaderboardCapBudgetProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'lolos' | 'cadangan'>('all');

  // Hanya proses usulan partisipasi warga non-darurat
  const regularUsulan = usulanList.filter(
    (u) =>
      u.status !== 'darurat' &&
      u.status !== 'system_config' &&
      !u.judul.toLowerCase().includes('[darurat') &&
      u.status !== 'ditolak'
  );

  // Urutkan berdasarkan total token tertinggi (Peringkat 1 -> ...) dengan tie-breaker waktu (FIFO)
  const sorted = [...regularUsulan].sort((a, b) => {
    const diff = (b.total_token || 0) - (a.total_token || 0);
    if (diff !== 0) return diff;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  // Hitung status Lolos / Cadangan berdasarkan urutan suara & ketersediaan sisa pagu
  // Aturan: Usulan yang kalah voting dari usulan di atasnya tetap lolos/eligible jika sisa pagu mencukupi!
  let akumulasiBiaya = 0;
  let adaYangDilewati = false;

  const processedList: ProcessedUsulan[] = sorted.map((item, index) => {
    const biayaItem = parseBiayaUsulan(item.deskripsi, item.judul);
    const sisaPaguSaatGiliran = Math.max(0, config.budgetCap - akumulasiBiaya);
    const bisaDidanai = sisaPaguSaatGiliran >= biayaItem && biayaItem > 0;

    let lolosReason: ProcessedUsulan['lolosReason'];

    if (bisaDidanai) {
      akumulasiBiaya += biayaItem;
      // Jika sebelumnya ada usulan berperingkat lebih tinggi yang tidak muat,
      // usulan ini dinyatakan lolos berkat optimalisasi sisa pagu yang mencukupi!
      if (adaYangDilewati) {
        lolosReason = 'sisa_pagu_mencukupi';
      } else {
        lolosReason = 'prioritas_utama';
      }
    } else {
      adaYangDilewati = true;
      if (sisaPaguSaatGiliran > 0) {
        lolosReason = 'cadangan_melebihi_pagu';
      } else {
        lolosReason = 'cadangan_pagu_habis';
      }
    }

    return {
      ...item,
      rank: index + 1,
      biaya: biayaItem,
      isLolos: bisaDidanai,
      lolosReason,
      runningTotal: akumulasiBiaya,
      sisaPaguSaatGiliran,
    };
  });

  const totalAnggaranTerpakai = akumulasiBiaya;
  const sisaAnggaran = Math.max(0, config.budgetCap - totalAnggaranTerpakai);
  const persentaseSerap = Math.min(100, Math.round((totalAnggaranTerpakai / config.budgetCap) * 100));

  const totalLolos = processedList.filter((p) => p.isLolos).length;
  const totalCadangan = processedList.filter((p) => !p.isLolos).length;

  let displayList: ProcessedUsulan[] = processedList.filter((item) => {
    if (filterMode === 'lolos') return item.isLolos;
    if (filterMode === 'cadangan') return !item.isLolos;
    return true;
  });

  // Jika pada tab 'Semua Usulan', kelompokkan usulan Lolos di atas Garis Batas Pagu,
  // dan usulan Cadangan di bawah Garis Batas Pagu agar garis pembatas tampil tepat 1 kali.
  if (filterMode === 'all') {
    const lolosItems = displayList.filter((item) => item.isLolos);
    const cadanganItems = displayList.filter((item) => !item.isLolos);
    displayList = [...lolosItems, ...cadanganItems];
  }

  // Indeks batas pertama usulan yang masuk daftar cadangan (Garis Cut-off Tunggal)
  const firstCadanganIndex = displayList.findIndex((item) => !item.isLolos);

  return (
    <div className="space-y-6">
      {/* Header Banner Leaderboard & Cap Budget */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-yellow-400/20 text-yellow-300 rounded-lg">
                <Trophy className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Sistem Peringkat Demokratis Partisipatif
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Papan Peringkat Usulan & Batas Anggaran (Budget Cap)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Bukan sistem <em>Winner-Takes-All</em>. Seluruh aspirasi diurutkan dari bobot dukungan token terbanyak dan dibiayai bertahap hingga pagu anggaran desa terpenuhi.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 min-w-[130px] flex-1">
              <span className="text-[11px] font-semibold text-blue-200 uppercase">Pagu Budget Cap</span>
              <p className="text-lg sm:text-xl font-black text-yellow-300 mt-0.5" suppressHydrationWarning>
                {formatRupiah(config.budgetCap)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 min-w-[130px] flex-1">
              <span className="text-[11px] font-semibold text-emerald-200 uppercase">Terakomodasi</span>
              <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                {formatRupiah(totalAnggaranTerpakai)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15 min-w-[120px] flex-1">
              <span className="text-[11px] font-semibold text-slate-300 uppercase">Sisa Kuota</span>
              <p className="text-lg sm:text-xl font-black text-slate-200 mt-0.5">
                {formatRupiah(sisaAnggaran)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar Penyerapan Anggaran */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Tingkat Penyerapan Pagu Partisipasi: <strong>{persentaseSerap}%</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              {totalLolos} Usulan Lolos Didanai • {totalCadangan} Usulan di Daftar Cadangan
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${persentaseSerap}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Penjelasan Kebijakan Sisa Pagu & Filosofi Koin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-emerald-950 leading-relaxed shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950">Kebijakan Optimalisasi Pagu Desa (Budget-Filling)</p>
            <p className="text-emerald-800 mt-0.5">
              Jika suatu usulan kalah jumlah voting dari usulan di atasnya namun <strong>kebutuhan dananya mencukupi sisa pagu anggaran</strong>, maka usulan tersebut <strong>otomatis dinyatakan Lolos/Eligible</strong>. Sistem ini memaksimalkan penyerapan APBDes agar tidak ada sisa dana desa yang mengendap sia-sia.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-blue-900 leading-relaxed shadow-xs">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-950">Apakah Koin Warga Dikembalikan?</p>
            <p className="text-blue-800 mt-0.5">
              Koin <strong>tidak perlu dikembalikan</strong> karena berfungsi sebagai pemberi bobot (<em>preference score</em>). Usulan yang belum masuk anggaran tahun ini otomatis masuk ke <strong>"Daftar Cadangan"</strong> prioritas APBDes tahun berikutnya.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Switcher Tampilan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Usulan ({processedList.length})
          </button>
          <button
            onClick={() => setFilterMode('lolos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'lolos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lolos Didanai ({totalLolos})
          </button>
          <button
            onClick={() => setFilterMode('cadangan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'cadangan'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Daftar Cadangan ({totalCadangan})
          </button>
        </div>
      </div>

      {/* List Kartu Peringkat */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="font-bold text-gray-600 text-sm">Belum ada usulan dalam kategori ini</p>
          </div>
        ) : (
          displayList.map((item, idx) => {
            // Garis pembatas Cut-off Budget Cap dipastikan hanya muncul 1 kali tepat di usulan cadangan pertama
            const isFirstCadangan =
              filterMode === 'all' &&
              idx === firstCadanganIndex &&
              firstCadanganIndex !== -1;

            return (
              <div key={item.id}>
                {/* Garis Batas Pagu Anggaran (Budget Cap Cut-off Divider) */}
                {isFirstCadangan && (
                  <div className="my-6 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-dashed border-red-400"></div>
                    </div>
                    <div
                      suppressHydrationWarning
                      className="relative bg-red-50 text-red-700 px-4 py-1.5 rounded-full border border-red-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Garis Batas Pagu Anggaran (Budget Cap: {formatRupiah(config.budgetCap)})
                    </div>
                  </div>
                )}

                <div
                  onClick={() => onSelectUsulan && onSelectUsulan(item)}
                  className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                    item.isLolos
                      ? item.lolosReason === 'sisa_pagu_mencukupi'
                        ? 'bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/30 border-teal-300 hover:border-teal-400'
                        : 'bg-white border-emerald-200 hover:border-emerald-400'
                      : 'bg-slate-50/70 border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Sisi Kiri: Badge Peringkat + Judul Usulan */}
                    <div className="flex items-start gap-4">
                      {/* Ranking Badge */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          item.rank === 1
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 text-slate-800'
                            : item.rank === 3
                            ? 'bg-amber-700/20 text-amber-900 border border-amber-800/30'
                            : item.isLolos
                            ? item.lolosReason === 'sisa_pagu_mencukupi'
                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                              : 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        #{item.rank}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                            {item.judul}
                          </h3>

                          {/* Lencana Status Kelolosan / Cadangan */}
                          {item.isLolos ? (
                            item.lolosReason === 'sisa_pagu_mencukupi' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100 text-teal-800 border border-teal-300">
                                  <Sparkles className="w-3 h-3 text-teal-600" />
                                  Lolos (Sisa Pagu Mencukupi)
                                </span>
                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                  ⚡ Kalah voting, namun dana ({formatRupiah(item.biaya)}) mencukupi sisa pagu
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Lolos / Didanai APBDes
                              </span>
                            )
                          ) : item.lolosReason === 'cadangan_melebihi_pagu' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3" />
                                Daftar Cadangan (Melebihi Sisa Pagu)
                              </span>
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Butuh {formatRupiah(item.biaya)} &gt; sisa pagu saat gilirannya ({formatRupiah(item.sisaPaguSaatGiliran)})
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gray-200 text-gray-700 border border-gray-300">
                              <Clock className="w-3 h-3" />
                              Daftar Cadangan (Tahun Depan)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 line-clamp-1">
                          {getCleanDeskripsi(item.deskripsi) || 'Tidak ada deskripsi'}
                        </p>
                      </div>
                    </div>

                    {/* Sisi Kanan: Koin & Kebutuhan Anggaran */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* Bobot Token */}
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                          Dukungan Warga
                        </span>
                        <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                          <Coins className="w-4 h-4 text-blue-600" />
                          <span className="text-base font-black text-blue-700">
                            {(item.total_token || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs font-bold text-gray-500">Koin</span>
                        </div>
                      </div>

                      {/* Estimasi Biaya */}
                      <div className="text-right min-w-[120px]">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                          Kebutuhan Dana
                        </span>
                        <span className="text-sm font-black text-gray-800 mt-0.5 block">
                          {formatRupiah(item.biaya)}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                            item.isLolos
                              ? item.lolosReason === 'sisa_pagu_mencukupi'
                                ? 'text-teal-800 bg-teal-100 border border-teal-300'
                                : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}
                        >
                          {item.isLolos
                            ? item.lolosReason === 'sisa_pagu_mencukupi'
                              ? '✓ Lolos Sisa Pagu'
                              : hasOfficialBiaya(item.deskripsi)
                              ? '✓ Resmi Desa'
                              : 'Estimasi'
                            : hasOfficialBiaya(item.deskripsi)
                            ? 'Cadangan (Resmi)'
                            : 'Perlu Desk'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

