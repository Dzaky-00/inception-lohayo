'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { Toaster } from 'react-hot-toast';
import {
  getMusrenbangConfig,
  fetchMusrenbangConfigFromDb,
  DEFAULT_CONFIG,
  MusrenbangConfig,
  formatRupiah,
  autoRejectUnverifiedProposals,
} from '@/components/musrenbangConfig';
import { supabase } from '@/components/supabase';
import LeaderboardCapBudget from '@/components/LeaderboardCapBudget';
import LaporEmergencyModal from '@/components/LaporEmergencyModal';
import {
  MapPin,
  Trophy,
  Siren,
  Calendar,
  Coins,
  ShieldCheck,
  Lock,
  CheckCircle2,
} from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 font-medium">
      Memuat Peta Desa...
    </div>
  ),
});

export default function Home() {
  const [config, setConfig] = useState<MusrenbangConfig>(DEFAULT_CONFIG);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard'>('map');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [userToken, setUserToken] = useState(100);
  const [usulanList, setUsulanList] = useState<any[]>([]);

  // Sinkronisasi data alokasi dana resmi dari Admin Desa dan usulan riil
  const loadData = async () => {
    const latestConfig = await fetchMusrenbangConfigFromDb();
    setConfig(latestConfig);

    if (latestConfig.faseAktif >= 3) {
      await autoRejectUnverifiedProposals(latestConfig.faseAktif);
    }

    const { data } = await supabase
      .from('usulan')
      .select('*')
      .neq('status', 'system_config')
      .order('total_token', { ascending: false });
    if (data) setUsulanList(data);
  };

  useEffect(() => {
    setIsMounted(true);
    setConfig(getMusrenbangConfig());
    loadData();

    const handleConfigChange = () => {
      setConfig(getMusrenbangConfig());
    };
    window.addEventListener('musrenbang_config_changed', handleConfigChange);
    return () => window.removeEventListener('musrenbang_config_changed', handleConfigChange);
  }, []);

  // Alokasi Koin Suara (+koin)
  const handleVoteUsulan = (jumlahToken: number) => {
    if (userToken < jumlahToken) {
      return false;
    }
    setUserToken((prev) => prev - jumlahToken);
    loadData();
    return true;
  };

  // Fleksibilitas Koin (Dynamic Re-allocation / -koin)
  const handleRefundToken = (jumlahToken: number) => {
    setUserToken((prev) => prev + jumlahToken);
    loadData();
  };

  return (
    <AppShell allowedRole="warga" userToken={userToken}>
      <Toaster position="top-right" />

      {/* Banner Transparansi APBDes & Tombol Emergency BTT */}
      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white py-4 px-6 border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[11px] text-blue-200 uppercase font-black tracking-wider">
                Musrenbang Digital Desa TA 2026 — Transparansi Publik
              </p>
            </div>
            <p className="text-base sm:text-lg font-black mt-0.5">
              Pagu Partisipasi Warga: <span className="text-yellow-300">{formatRupiah(config.budgetCap)}</span>{' '}
              <span className="text-xs text-blue-300 font-normal">
                (Total APBDes: {formatRupiah(config.totalApbdes)})
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => setIsEmergencyOpen(true)}
              className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg border border-red-400/50 flex items-center gap-2 animate-bounce hover:animate-none transition"
            >
              <Siren className="w-4 h-4 text-white animate-pulse" />
              <span>Lapor Kejadian Emergency</span>
            </button>
          </div>
        </div>
      </section>

      {/* Alur 3 Fase Berurutan Musrenbang (Sequential Phases) */}
      <section className="bg-white border-b border-gray-200 py-3.5 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Indikator 3 Fase */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-gray-500 uppercase tracking-wider text-[11px]">
                  Tahapan Siklus Anggaran Musrenbang
                </span>
                <span className="text-blue-600 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {config.faseAktif <= 3
                    ? `${config.sisaHari} Hari Tersisa di Fase ${config.faseAktif}`
                    : 'Musrenbang TA 2026 Selesai'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Fase 1 */}
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    config.faseAktif === 1
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 text-amber-950 font-bold'
                      : config.faseAktif > 1
                      ? 'bg-gray-50 border-gray-200 text-gray-500 line-through'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shrink-0">
                      1
                    </span>
                    <span className="truncate">Fase 1: Pengajuan Usulan</span>
                  </div>
                  <span className="text-[10px] block text-gray-500 font-normal mt-0.5 truncate font-mono">
                    {config.fase1Start || '2026-11-01'} s/d {config.fase1End || '2026-11-14'}
                  </span>
                </div>

                {/* Fase 2 */}
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    config.faseAktif === 2
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/40 text-blue-950 font-bold'
                      : config.faseAktif > 2
                      ? 'bg-gray-50 border-gray-200 text-gray-500 line-through'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      2
                    </span>
                    <span className="truncate">Fase 2: Desk Review</span>
                  </div>
                  <span className="text-[10px] block text-gray-500 font-normal mt-0.5 truncate font-mono">
                    {config.fase2Start || '2026-11-15'} s/d {config.fase2End || '2026-11-21'}
                  </span>
                </div>

                {/* Fase 3 */}
                <div
                  className={`p-2.5 rounded-xl border text-xs transition ${
                    config.faseAktif === 3
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40 text-emerald-950 font-bold'
                      : config.faseAktif > 3
                      ? 'bg-gray-50 border-gray-200 text-gray-500 line-through'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      3
                    </span>
                    <span className="truncate">Fase 3: Voting Koin</span>
                  </div>
                  <span className="text-[10px] block text-gray-500 font-normal mt-0.5 truncate font-mono">
                    {config.fase3Start || '2026-11-22'} s/d {config.fase3End || '2026-12-12'}
                  </span>
                </div>
              </div>
            </div>

            {/* Label Otoritas Transparan */}
            <div className="bg-blue-50/80 border border-blue-200/80 p-2.5 px-3.5 rounded-2xl shrink-0 flex items-center gap-2 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-[11px] font-semibold">
                Alokasi Pagu Ditetapkan Resmi oleh <strong>Pemerintah Desa</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Tabs (Peta Aspirasi vs Papan Peringkat / Leaderboard) */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Peta Usulan</span>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'leaderboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {config.faseAktif < 4 ? (
                <>
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Peringkat (Terkunci)</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span>Hasil Akhir Peringkat</span>
                </>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-900 px-3.5 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
            <Coins className="w-4 h-4 text-blue-600" />
            <span>
              Saldo Koin Suara Anda: <strong>{userToken} Koin</strong>
            </span>
          </div>
        </div>

        {/* Tab Content: Map vs Leaderboard */}
        <div className={activeTab === 'map' ? 'block' : 'hidden'}>
          <div>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Sebaran Spasial Aspirasi Warga</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {config.faseAktif === 1 &&
                    'Fase 1 Aktif: Klik titik mana saja di peta untuk mengajukan usulan perbaikan baru. Status usulan terdaftar dapat dipantau di titik peta.'}
                  {config.faseAktif === 2 &&
                    'Fase 2 Aktif: Pengajuan usulan baru ditutup. Usulan sedang diverifikasi kelayakan teknis & alokasi anggarannya oleh Admin Desa.'}
                  {config.faseAktif === 3 &&
                    'Fase 3 Aktif: Alokasikan koin suara Anda ke usulan prioritas. Peringkat usulan disembunyikan sementara hingga voting selesai.'}
                  {config.faseAktif === 4 &&
                    'Pasca Fase 3: Siklus Musrenbang selesai. Hasil akhir peringkat resmi telah dibuka dan dapat dilihat pada tab Hasil Akhir Peringkat.'}
                </p>
              </div>
            </div>

            <Map
              usulanData={usulanList}
              onVote={handleVoteUsulan}
              onRefundToken={handleRefundToken}
              config={config}
            />
          </div>
        </div>

        <div className={activeTab === 'leaderboard' ? 'block' : 'hidden'}>
          {config.faseAktif < 4 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">
                  Papan Peringkat Usulan Disembunyikan
                </h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Untuk menjaga objektivitas dan mencegah penggiringan opini (<em>bandwagon effect</em>), peringkat usulan dan perolehan suara disembunyikan dari publik selama masa pengajuan dan voting (Fase 1 s/d Fase 3).
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-semibold flex items-center justify-center gap-2">
                <span>🏆 Hasil akhir peringkat resmi Musrenbang akan dibuka secara transparan pada <strong>Pasca Fase 3 ({config.fase3End || 'Musrenbang Selesai'})</strong>.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-white/20 rounded-xl">
                    <Trophy className="w-6 h-6 text-yellow-300" />
                  </span>
                  <div>
                    <h3 className="font-black text-sm">Hasil Akhir Musrenbang Desa Resmi Dibuka</h3>
                    <p className="text-xs text-emerald-100">
                      Periode voting telah berakhir dan alokasi pagu anggaran APBDes telah dikunci secara final.
                    </p>
                  </div>
                </div>
                <span className="bg-white text-emerald-900 text-xs font-black px-3.5 py-1.5 rounded-xl uppercase shrink-0 shadow-xs">
                  Hasil Final Terkunci
                </span>
              </div>
              <LeaderboardCapBudget usulanList={usulanList} config={config} />
            </div>
          )}
        </div>
      </div>

      {/* Modal Lapor Emergency BTT */}
      <LaporEmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onSuccess={loadData}
      />
    </AppShell>
  );
}
