'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppConfig } from '@/components/ConfigContext';

interface AppShellProps {
  children: React.ReactNode;
  allowedRole: 'warga' | 'admin' | 'superadmin';
  userToken?: number;
}

export default function AppShell({ children, allowedRole, userToken }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentRole, setCurrentRole] = useState<'warga' | 'admin' | 'superadmin' | null>(null);
  const [identifier, setIdentifier] = useState('');

  // Konfigurasi Global Dinamis terpusat dari Server-Side Rendering (SSR)
  const { config } = useAppConfig();

  // Kontrol Sidebar & Dropdown
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [notifList, setNotifList] = useState([
    { id: 1, text: 'Usulan baru: Perbaikan Selokan RT 04 masuk', time: '5 menit lalu', read: false },
    { id: 2, text: 'Dukungan Penerangan Jalan Kenjeran mencapai 45 token', time: '1 jam lalu', read: false },
  ]);

  // Validasi Sesi Role
  useEffect(() => {
    const role = localStorage.getItem('pantau_role') as 'warga' | 'admin' | 'superadmin' | null;
    let id = localStorage.getItem('pantau_identifier') || '';

    // Pastikan jika Super Admin, yang ditampilkan adalah email dinas (bukan teks nama lama)
    if (role === 'superadmin') {
      const savedEmail = localStorage.getItem('pantau_superadmin_email') || 'pusat@kemendagri.go.id';
      if (!id || id.includes('Pengawas') || !id.includes('@')) {
        id = savedEmail;
        localStorage.setItem('pantau_identifier', id);
      }
    }

    if (!role) {
      router.replace('/login');
      return;
    }

    if (role !== allowedRole) {
      if (role === 'warga') router.replace('/');
      else if (role === 'admin') router.replace('/admin');
      else if (role === 'superadmin') router.replace('/superadmin');
      return;
    }

    setCurrentRole(role);
    setIdentifier(id);
    setIsAuthorized(true);
  }, [allowedRole, router]);

  // Listener sinkronisasi perubahan identitas akun (email dinas) secara instan
  useEffect(() => {
    const handleAuthUpdate = () => {
      const id = localStorage.getItem('pantau_identifier') || '';
      if (id) setIdentifier(id);
    };
    window.addEventListener('authUpdated', handleAuthUpdate);
    return () => window.removeEventListener('authUpdated', handleAuthUpdate);
  }, []);

  // Tutup dropdown saat klik luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pantau_role');
    localStorage.removeItem('pantau_identifier');
    router.replace('/login');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Universal (Fixed di Kiri, Tetap Tampil Saat Konten di-scroll) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 bg-gray-900 text-white flex flex-col z-30 transition-[width,transform] duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'
        } overflow-hidden shadow-xl`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center gap-3 w-64 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Dinamis Tanpa Kotak Putih */}
            {config.logoUrl ? (
              <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center">
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-wide truncate">{config.appName}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-800 text-blue-400">
                {currentRole === 'superadmin' ? 'Pusat Otoritas' : currentRole === 'admin' ? 'Panel Desa' : 'Akses Warga'}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Sidebar Berdasarkan Role (Scroll mandiri jika menu panjang) */}
        <nav className="flex-1 p-4 space-y-2 w-64 overflow-y-auto">
          {currentRole === 'warga' && (
            <button
              onClick={() => router.push('/')}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                pathname === '/' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>🗺️</span> Peta Aspirasi & Usulan
            </button>
          )}

          {currentRole === 'admin' && (
            <>
              <button
                onClick={() => router.push('/admin')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  pathname === '/admin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>📊</span> Dashboard Usulan
              </button>
              <button
                onClick={() => router.push('/admin/pengaturan')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  pathname === '/admin/pengaturan' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>⚙️</span> Pengaturan Desa & Akun
              </button>
            </>
          )}

          {currentRole === 'superadmin' && (
            <>
              <button
                onClick={() => router.push('/superadmin')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  pathname === '/superadmin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>🏛️</span> Pengawasan Nasional
              </button>
              <button
                onClick={() => router.push('/superadmin/pengaturan')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  pathname === '/superadmin/pengaturan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>🎨</span> Pengaturan Tampilan & Sistem
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Konten Utama (Native Window Scroll - Ringan & 60/120 FPS Lancar) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out ${
          isSidebarOpen ? 'md:ml-64' : 'ml-0'
        }`}
      >
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              title="Buka/Tutup Sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {currentRole === 'warga' && userToken !== undefined && (
              <div className="bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                <span className="text-sm">🪙</span>
                <div>
                  <p className="text-[9px] text-blue-600 font-bold uppercase leading-tight">Hak Suara</p>
                  <p className="text-xs font-black text-blue-800 leading-tight">{userToken} Token</p>
                </div>
              </div>
            )}

            {/* Lonceng Notifikasi */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
                className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifList.some((n) => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-white"></span>
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-3 z-50">
                  <div className="px-4 pb-2 border-b border-gray-100 flex justify-between items-center">
                    <p className="font-bold text-sm text-gray-800">Pemberitahuan</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {notifList.map((n) => (
                      <div key={n.id} className={`p-3 hover:bg-gray-50 transition cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/40'}`}>
                        <p className="text-xs text-gray-800 leading-snug font-medium">{n.text}</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profil Admin */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
                className="flex items-center gap-2.5 focus:outline-none"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-800 truncate max-w-[180px] md:max-w-[220px]">{identifier}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{currentRole}</p>
                </div>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs ${
                  currentRole === 'superadmin' ? 'bg-indigo-600' : currentRole === 'admin' ? 'bg-gray-800' : 'bg-blue-600'
                }`}>
                  {currentRole === 'superadmin' ? 'SA' : currentRole === 'admin' ? 'AD' : 'WG'}
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                    <p className="text-xs font-bold text-gray-800 truncate">{identifier}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{currentRole}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Keluar (Logout)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
