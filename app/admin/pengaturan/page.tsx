'use client';
import { useState } from 'react';

export default function PengaturanPage() {
const [activeTab, setActiveTab] = useState<'desa' | 'akun'>('desa');

// State Alokasi Dana & Berkas Bukti (Gambar / Dokumen)
const [anggaran, setAnggaran] = useState('1250000000');
const [fileBukti, setFileBukti] = useState<{ name: string; size: string; type: string; url?: string } | null>(null);

// State Jadwal Musrenbang
const [tglBuka, setTglBuka] = useState('2026-11-01');
const [tglTutup, setTglTutup] = useState('2026-11-30');

// State Akun Admin (Tanpa Foto Profil)
const [namaAdmin, setNamaAdmin] = useState('Perangkat Desa Sukamakmur');
const [emailAdmin, setEmailAdmin] = useState('admin@desa.id');
const [passwordBaru, setPasswordBaru] = useState('');

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
const isImage = file.type.startsWith('image/');

setFileBukti({
    name: file.name,
    size: fileSizeFormatted,
    type: file.type,
    url: isImage ? URL.createObjectURL(file) : undefined,
});
};

const handleSimpan = (e: React.FormEvent) => {
e.preventDefault();
alert('Pengaturan alokasi dana dan akun berhasil disimpan!');
};

return (
<div className="max-w-4xl">
    <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
    <p className="text-sm text-gray-500 mt-1">Konfigurasi alokasi dana APBDes, siklus voting Musrenbang, dan kredensial admin.</p>
    </div>

    {/* Tab Switcher */}
    <div className="flex border-b border-gray-200 mb-6">
    <button
        onClick={() => setActiveTab('desa')}
        className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
        activeTab === 'desa' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
    >
        Alokasi APBDes & Musrenbang
    </button>
    <button
        onClick={() => setActiveTab('akun')}
        className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
        activeTab === 'akun' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
    >
        Kredensial Admin
    </button>
    </div>

    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
    <form onSubmit={handleSimpan} className="space-y-6">
        {activeTab === 'desa' && (
        <>
            {/* Alokasi Dana APBDes & Upload Bukti Multi-Format */}
            <div>
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
                1. Alokasi APBDes & Bukti Penyaluran
            </h3>
            <div className="space-y-4">
                <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total Anggaran APBDes Siap Salur (Rp)
                </label>
                <input
                    type="number"
                    value={anggaran}
                    onChange={(e) => setAnggaran(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                    Nominal ini ditampilkan secara transparan di dashboard warga sebagai basis konversi voting token.
                </p>
                </div>

                <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unggah Bukti Penyaluran (Foto Baliho / Nota / Berkas LPJ PDF)
                </label>
                <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />

                {/* Preview Hasil Unggahan */}
                {fileBukti && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {fileBukti.type.includes('pdf') ? 'DOKUMEN PDF' : fileBukti.type.startsWith('image/') ? 'FOTO/GAMBAR' : 'DOKUMEN'}
                        </span>
                        <span className="text-xs text-gray-800 font-medium truncate max-w-xs">{fileBukti.name}</span>
                        <span className="text-[11px] text-gray-400">({fileBukti.size})</span>
                        </div>
                        <span className="text-[11px] text-green-600 font-semibold">Siap Ditampilkan ke Warga</span>
                    </div>

                    {fileBukti.url && (
                        <div className="mt-3">
                        <img src={fileBukti.url} alt="Pratinjau Bukti" className="h-40 w-auto rounded object-contain border bg-white" />
                        </div>
                    )}
                    </div>
                )}
                </div>
            </div>
            </div>

            {/* Siklus Jadwal Musrenbang */}
            <div>
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
                2. Jadwal Periode Musrenbang (Voting Kuadratik)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai Voting</label>
                <input
                    type="date"
                    value={tglBuka}
                    onChange={(e) => setTglBuka(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                </div>
                <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Akhir Voting</label>
                <input
                    type="date"
                    value={tglTutup}
                    onChange={(e) => setTglTutup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                </div>
            </div>
            </div>
        </>
        )}

        {activeTab === 'akun' && (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-4">
            Kredensial & Akun Dinas
            </h3>
            <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Perangkat / Instansi</label>
            <input
                type="text"
                value={namaAdmin}
                onChange={(e) => setNamaAdmin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Dinas Resmi</label>
            <input
                type="email"
                value={emailAdmin}
                onChange={(e) => setEmailAdmin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            </div>
            <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kata Sandi Baru</label>
            <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengganti kata sandi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            </div>
        </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg text-sm shadow-xs transition"
        >
            Simpan Pengaturan
        </button>
        </div>
    </form>
    </div>
</div>
);
}