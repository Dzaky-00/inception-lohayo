'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';

export default function SuperAdminPage() {
const [isSyncing, setIsSyncing] = useState(false);
const [lastSyncTime, setLastSyncTime] = useState('31 Okt 2026, 08:30 WIB');
const [totalPendudukApi, setTotalPendudukApi] = useState(48290);

const [daftarDesa, setDaftarDesa] = useState([
    { id: 'DS-001', nama: 'Desa Sukamakmur', kec: 'Kenjeran', kab: 'Surabaya', adminEmail: 'admin@desa.id', statusApi: 'Aktif Terhubung' },
    { id: 'DS-002', nama: 'Desa Karanganyar', kec: 'Rungkut', kab: 'Surabaya', adminEmail: 'kades.karang@jatim.id', statusApi: 'Aktif Terhubung' },
]);

const [formDesa, setFormDesa] = useState({ nama: '', kec: '', kab: '', emailAdmin: '', passAdmin: '' });
const [isModalOpen, setIsModalOpen] = useState(false);

const triggerApiDukcapil = () => {
    setIsSyncing(true);
    setTimeout(() => {
    setIsSyncing(false);
    setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB');
    setTotalPendudukApi((prev) => prev + 120);
    alert('Sinkronisasi Berhasil: 120 NIK DPT baru otomatis diperbarui dari API Disdukcapil Kemendagri!');
    }, 1500);
};

const handleTambahDesa = (e: React.FormEvent) => {
    e.preventDefault();
    const idBaru = `DS-00${daftarDesa.length + 1}`;
    setDaftarDesa([
    ...daftarDesa,
    { id: idBaru, nama: formDesa.nama, kec: formDesa.kec, kab: formDesa.kab, adminEmail: formDesa.emailAdmin, statusApi: 'Aktif Terhubung' },
    ]);
    setIsModalOpen(false);
    setFormDesa({ nama: '', kec: '', kab: '', emailAdmin: '', passAdmin: '' });
    alert(`Desa & Akun Admin Desa (${formDesa.emailAdmin}) berhasil diterbitkan oleh Otoritas Pusat!`);
};

return (
    <AppShell allowedRole="superadmin">
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner API Disdukcapil */}
        <div className="bg-indigo-900/90 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg border border-indigo-700">
        <div>
            <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">REST API Disdukcapil SIAK Aktif</p>
            </div>
            <h2 className="text-xl font-black">Sinkronisasi Otomatis Data Penduduk & NIK</h2>
            <p className="text-xs text-indigo-200 mt-1">Data warga sinkron otomatis via server Dukcapil pusat tanpa entri berkas manual.</p>
            <p className="text-[11px] text-indigo-300 mt-2 font-mono">
            Terakhir Sinkron: <strong>{lastSyncTime}</strong> | NIK Terverifikasi: <strong>{totalPendudukApi.toLocaleString('id-ID')} Jiwa</strong>
            </p>
        </div>

        <button
            onClick={triggerApiDukcapil}
            disabled={isSyncing}
            className="shrink-0 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs px-5 py-3 rounded-xl shadow transition"
        >
            {isSyncing ? 'Menghubungi API SIAK...' : 'Tarik Pembaruan NIK API'}
        </button>
        </div>

        {/* Tabel Entitas Desa */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
            <div>
            <h3 className="text-base font-bold text-gray-800">Daftar Entitas Desa Terdaftar</h3>
            <p className="text-xs text-gray-500">Pusat bertugas menerbitkan kredensial awal admin balai desa.</p>
            </div>
            <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
            >
            + Daftarkan Desa & Admin Baru
            </button>
        </div>

        <table className="w-full text-left text-xs border-collapse">
            <thead>
            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="p-4 font-bold">Kode Wilayah</th>
                <th className="p-4 font-bold">Nama Desa</th>
                <th className="p-4 font-bold">Kecamatan / Kab</th>
                <th className="p-4 font-bold">Akun Admin Desa</th>
                <th className="p-4 font-bold">Status Koneksi API</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {daftarDesa.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-gray-500">{d.id}</td>
                <td className="p-4 font-bold text-gray-800 text-sm">{d.nama}</td>
                <td className="p-4 text-gray-600">{d.kec}, {d.kab}</td>
                <td className="p-4 font-mono text-gray-600">{d.adminEmail}</td>
                <td className="p-4">
                    <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                    {d.statusApi}
                    </span>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>

        {/* Modal Daftarkan Desa Baru */}
        {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-gray-200 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Daftarkan Entitas Desa Baru</h3>
            <p className="text-xs text-gray-500 mb-4">Input data wilayah untuk menerbitkan akun admin desa.</p>
            <form onSubmit={handleTambahDesa} className="space-y-3">
                <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nama Desa</label>
                <input
                    type="text"
                    required
                    value={formDesa.nama}
                    onChange={(e) => setFormDesa({ ...formDesa, nama: e.target.value })}
                    placeholder="Mis: Desa Sumberrejo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                    />
                </div>
                </div>
                <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Email Dinas Admin Desa</label>
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                >
                    Terbitkan Akun
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