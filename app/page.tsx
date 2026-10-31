'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { Toaster } from 'react-hot-toast';

// Pindahkan dynamic import ke luar fungsi Home agar instance Leaflet tidak bentrok
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-medium">
      Memuat Peta Desa...
    </div>
  ),
});

export default function Home() {
  const [userToken, setUserToken] = useState(100);

  const handleVoteUsulan = (jumlahToken: number) => {
    if (userToken < jumlahToken) {
      return false;
    }
    setUserToken((prev) => prev - jumlahToken);
    return true;
  };

  return (
    <AppShell allowedRole="warga" userToken={userToken}>
      {/* Container Toast untuk notifikasi Supabase */}
      <Toaster position="top-right" />

      {/* Banner Transparansi APBDes */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-4 px-6 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <p className="text-xs text-blue-200 uppercase font-semibold">Transparansi Dana Desa TA 2026</p>
            <p className="text-base font-bold">Total Alokasi APBDes Terverifikasi: <span className="text-yellow-300">Rp 1.250.000.000</span></p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span>Musrenbang Aktif s/d <strong>30 Nov 2026</strong></span>
          </div>
        </div>
      </section>

      <div className="p-6 max-w-7xl mx-auto w-full">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">Sebaran Aspirasi Pembangunan</h2>
          <p className="text-xs text-gray-500">Klik titik mana saja di peta untuk mengusulkan perbaikan, atau alokasikan token suara pada pin yang ada.</p>
        </div>
        <Map usulanData={[]} />
        {/* Render Map */}
      </div>
    </AppShell>
  );
}