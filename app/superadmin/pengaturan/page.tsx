'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { supabase } from '@/components/supabase';
import { useAppConfig } from '@/components/ConfigContext';

export default function PengaturanBrandingPage() {
  const { updateConfig } = useAppConfig();

  // Tab State
  const [activeTab, setActiveTab] = useState<'branding' | 'akun'>('branding');

  // State Branding & Tampilan
  const [appName, setAppName] = useState('Pantau Desa');
  const [tagline, setTagline] = useState('Gerbang Akses Partisipasi & Pengawasan Terpadu');
  const [instansi, setInstansi] = useState('Kementerian Desa PDTT / Dinas PMD Provinsi');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loginBgTheme, setLoginBgTheme] = useState('gradient-blue');
  const [isSaving, setIsSaving] = useState(false);

  // State Kredensial Akun Super Admin
  const [emailAdminPusat, setEmailAdminPusat] = useState('pusat@kemendagri.go.id');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [isSavingAkun, setIsSavingAkun] = useState(false);

  // Ambil konfigurasi visual dari Supabase & email dari localStorage saat halaman dibuka
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        if (data.app_name) setAppName(data.app_name);
        if (data.tagline) setTagline(data.tagline);
        if (data.instansi) setInstansi(data.instansi);
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.login_bg_theme) setLoginBgTheme(data.login_bg_theme);
      }
    };

    fetchConfig();

    // Muat email dinas superadmin tersimpan
    const savedEmail =
      localStorage.getItem('pantau_superadmin_email') ||
      localStorage.getItem('pantau_identifier');
    if (savedEmail && savedEmail.includes('@')) {
      setEmailAdminPusat(savedEmail);
    }
  }, []);

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const configData = {
      app_name: appName,
      tagline,
      instansi,
      logo_url: logoUrl,
      login_bg_theme: loginBgTheme,
      updated_at: new Date().toISOString(),
    };

    // 1. Simpan ke Database Supabase
    const { error } = await supabase
      .from('app_config')
      .upsert({ id: 1, ...configData });

    setIsSaving(false);

    if (error) {
      alert(`Gagal menyimpan ke server: ${error.message}`);
      return;
    }

    // 2. Simpan juga ke cache lokal dan sync context
    localStorage.setItem(
      'pantau_global_config',
      JSON.stringify({
        appName,
        tagline,
        instansi,
        logoUrl,
        loginBgTheme,
      })
    );
    updateConfig({ appName, tagline, instansi, logoUrl, loginBgTheme });
    window.dispatchEvent(new Event('configUpdated'));

    alert('Konfigurasi visual berhasil disimpan ke database pusat! Perubahan sekarang tampil di semua browser.');
  };

  const handleSimpanAkun = (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailAdminPusat || !emailAdminPusat.includes('@')) {
      alert('Masukkan format email dinas yang valid!');
      return;
    }

    if (passwordBaru) {
      if (passwordBaru !== konfirmasiPassword) {
        alert('Konfirmasi kata sandi baru tidak cocok!');
        return;
      }
      if (passwordBaru.length < 6) {
        alert('Kata sandi baru minimal 6 karakter!');
        return;
      }
    }

    setIsSavingAkun(true);

    // 1. Perbarui kredensial superadmin
    localStorage.setItem('pantau_superadmin_email', emailAdminPusat);
    localStorage.setItem('pantau_identifier', emailAdminPusat);

    if (passwordBaru) {
      localStorage.setItem('pantau_superadmin_password', passwordBaru);
    }

    // 2. Dispatch event agar AppShell header otomatis menampilkan email baru seketika
    window.dispatchEvent(new Event('authUpdated'));

    setIsSavingAkun(false);
    setPasswordBaru('');
    setKonfirmasiPassword('');

    alert(`Kredensial Super Admin berhasil disimpan! Email ${emailAdminPusat} kini aktif dan langsung tampil di header.`);
  };

  return (
    <AppShell allowedRole="superadmin">
      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem & Akun Otoritas</h1>
          <p className="text-xs text-gray-500 mt-1">
            Kelola branding visual platform serta kredensial akun dinas Super Admin (Otoritas Pusat).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🎨</span> Tampilan & Branding Global
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('akun')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'akun'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🔐</span> Kredensial & Akun Super Admin
          </button>
        </div>

        {/* TAB 1: BRANDING & TAMPILAN */}
        {activeTab === 'branding' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <form onSubmit={handleSimpan} className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">1. Logo Utama Website</h3>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center p-2 bg-gray-50 overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium text-center">Logo Standar</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Rekomendasi PNG/SVG transparan.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">2. Identitas Teks & Birokrasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Platform Sistem</label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tagline Halaman Login</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Instansi Penanggung Jawab Resmi</label>
                  <input
                    type="text"
                    value={instansi}
                    onChange={(e) => setInstansi(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">3. Tema Latar Belakang (Background) Login</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoginBgTheme('gradient-blue')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      loginBgTheme === 'gradient-blue' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 mb-2"></div>
                    <p className="text-xs font-bold text-gray-800">Biru Gradasi</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginBgTheme('dark')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      loginBgTheme === 'dark' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-slate-950 mb-2"></div>
                    <p className="text-xs font-bold text-gray-800">Executive Dark</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginBgTheme('clean-slate')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      loginBgTheme === 'clean-slate' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-gray-100 border mb-2"></div>
                    <p className="text-xs font-bold text-gray-800">Abu Terang</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginBgTheme('emerald')}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      loginBgTheme === 'emerald' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200'
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-gradient-to-br from-emerald-950 to-slate-950 mb-2"></div>
                    <p className="text-xs font-bold text-gray-800">Emerald</p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan ke Database...' : 'Simpan Perubahan Visual'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: KREDENSIAL AKUN SUPER ADMIN */}
        {activeTab === 'akun' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <form onSubmit={handleSimpanAkun} className="space-y-5" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Email Dinas Resmi (Tampil di Header & Login)
                </label>
                <input
                  type="email"
                  required
                  value={emailAdminPusat}
                  onChange={(e) => setEmailAdminPusat(e.target.value)}
                  placeholder="pusat@kemendagri.go.id"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Sama seperti akun Admin Desa, email ini yang akan ditampilkan pada bilah profil di pojok kanan atas.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-3">Ubah Kunci Akses / Kata Sandi (Opsional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={konfirmasiPassword}
                      onChange={(e) => setKonfirmasiPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Kosongkan kedua kolom kata sandi di atas jika Anda hanya ingin memperbarui alamat email dinas.
                </p>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSavingAkun}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSavingAkun ? 'Memperbarui Akun...' : 'Simpan Kredensial Super Admin'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
