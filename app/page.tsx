'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

export default function Home() {
  // Matikan Server-Side Rendering untuk komponen Peta
  const Map = useMemo(() => dynamic(
    () => import('@/components/Map'),
    { ssr: false, loading: () => <p>Memuat Peta...</p> }
  ), []);

  return (
    <main className="p-4 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Pantau Desa: Peta Aspirasi</h1>
      <Map usulanData={[]} />
    </main>
  );
}