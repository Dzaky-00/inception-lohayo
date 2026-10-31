'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
const router = useRouter();
const [role, setRole] = useState<'warga' | 'admin' | 'superadmin'>('warga');
const [isCheckingAuth, setIsCheckingAuth] = useState(true);

// Periksa sesi: tahan render jika sudah memiliki sesi aktif
useEffect(() => {
    const activeRole = localStorage.getItem('pantau_role');
    if (activeRole === 'warga') {
    router.replace('/');
    } else if (activeRole === 'admin') {
    router.replace('/admin');
    } else if (activeRole === 'superadmin') {
    router.replace('/superadmin');
    } else {
    setIsCheckingAuth(false); // Hanya buka form login jika benar-benar belum login
    }
}, [router]);

// State Warga
const [nik, setNik] = useState('');
const [otp, setOtp] = useState('');
const [step, setStep] = useState(1);

// State Admin Desa
const [emailAdmin, setEmailAdmin] = useState('');
const [passwordAdmin, setPasswordAdmin] = useState('');

// State Super Admin
const [nipPusat, setNipPusat] = useState('');
const [tokenPusat, setTokenPusat] = useState('');

const [isLoading, setIsLoading] = useState(false);

const handleCekNik = (e: React.FormEvent) => {
    e.preventDefault();
    if (nik.length !== 16) {
    alert('NIK wajib 16 digit angka!');
    return;
    }
    setIsLoading(true);
    setTimeout(() => {
    setIsLoading(false);
    setStep(2);
    }, 500);
};

const handleLoginWarga = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234') {
    alert('OTP salah! (Demo: 1234)');
    return;
    }
    localStorage.setItem('pantau_role', 'warga');
    localStorage.setItem('pantau_identifier', nik);
    router.replace('/');
};

const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailAdmin === 'admin@desa.id' && passwordAdmin === 'admin123') {
    localStorage.setItem('pantau_role', 'admin');
    localStorage.setItem('pantau_identifier', emailAdmin);
    router.replace('/admin');
    } else {
    alert('Kredensial Admin Desa salah! (Gunakan: admin@desa.id / admin123)');
    }
};

const handleLoginSuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nipPusat === 'pusat@kemendagri.go.id' && tokenPusat === 'pusat123') {
    localStorage.setItem('pantau_role', 'superadmin');
    localStorage.setItem('pantau_identifier', 'Pengawas Pusat Kemendagri');
    router.replace('/superadmin');
    } else {
    alert('Kredensial Pusat salah! (Gunakan: pusat@kemendagri.go.id / pusat123)');
    }
};

// Layar bersih saat memverifikasi sesi (mencegah form login berkedip)
if (isCheckingAuth) {
    return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
    );
}

return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white mb-3 shadow-md shadow-blue-500/20">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pantau Desa</h1>
        <p className="text-xs text-gray-500 mt-1">Gerbang Akses Partisipasi & Pengawasan Terpadu</p>
        </div>

        {/* Pemilih Role */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 text-xs font-semibold">
        <button
            type="button"
            onClick={() => { setRole('warga'); setStep(1); }}
            className={`flex-1 py-2 rounded-lg transition-all ${role === 'warga' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-500'}`}
        >
            Warga
        </button>
        <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 rounded-lg transition-all ${role === 'admin' ? 'bg-white shadow-xs text-blue-600' : 'text-gray-500'}`}
        >
            Admin Desa
        </button>
        <button
            type="button"
            onClick={() => setRole('superadmin')}
            className={`flex-1 py-2 rounded-lg transition-all ${role === 'superadmin' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-500'}`}
        >
            Admin Pusat
        </button>
        </div>

        {/* Form Warga */}
        {role === 'warga' && (
        step === 1 ? (
            <form onSubmit={handleCekNik} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NIK Warga</label>
                <input
                type="text"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="3578xxxxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition"
            >
                {isLoading ? 'Memeriksa DPT...' : 'Verifikasi NIK'}
            </button>
            </form>
        ) : (
            <form onSubmit={handleLoginWarga} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kode OTP</label>
                <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Ketik: 1234"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                required
                />
            </div>
            <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition"
            >
                Masuk ke Peta
            </button>
            </form>
        )
        )}

        {/* Form Admin Desa */}
        {role === 'admin' && (
        <form onSubmit={handleLoginAdmin} className="space-y-4">
            <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Dinas Desa</label>
            <input
                type="email"
                value={emailAdmin}
                onChange={(e) => setEmailAdmin(e.target.value)}
                placeholder="admin@desa.id"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kata Sandi</label>
            <input
                type="password"
                value={passwordAdmin}
                onChange={(e) => setPasswordAdmin(e.target.value)}
                placeholder="admin123"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
            />
            </div>
            <button
            type="submit"
            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md transition"
            >
            Masuk Dashboard Desa
            </button>
        </form>
        )}

        {/* Form Super Admin */}
        {role === 'superadmin' && (
        <form onSubmit={handleLoginSuperAdmin} className="space-y-4">
            <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Dinas Pusat</label>
            <input
                type="email"
                value={nipPusat}
                onChange={(e) => setNipPusat(e.target.value)}
                placeholder="pusat@kemendagri.go.id"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
            />
            </div>
            <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kunci Akses Otoritas</label>
            <input
                type="password"
                value={tokenPusat}
                onChange={(e) => setTokenPusat(e.target.value)}
                placeholder="pusat123"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
            />
            </div>
            <button
            type="submit"
            className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-md transition"
            >
            Akses Portal Pusat
            </button>
        </form>
        )}
    </div>
    </div>
);
}