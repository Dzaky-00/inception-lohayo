'use client';

const MOCK_USULAN = [
{ id: 1, judul: 'Perbaikan Selokan RT 04', pengusul: 'Budi (3578...111)', tanggal: '31 Okt 2026', status: 'Pending', token: 0 },
{ id: 2, judul: 'Penerangan Jalan Kenjeran', pengusul: 'Siti (3578...222)', tanggal: '30 Okt 2026', status: 'Voting', token: 45 },
{ id: 3, judul: 'Renovasi Pos Kamling', pengusul: 'Agus (3578...333)', tanggal: '28 Okt 2026', status: 'Diproses', token: 120 },
{ id: 4, judul: 'Pengadaan Bak Sampah', pengusul: 'Dewi (3578...444)', tanggal: '25 Okt 2026', status: 'Selesai', token: 80 },
];

export default function AdminDashboard() {
const getStatusBadge = (status: string) => {
switch (status) {
    case 'Pending': return 'bg-gray-100 text-gray-800';
    case 'Voting': return 'bg-blue-100 text-blue-800';
    case 'Diproses': return 'bg-yellow-100 text-yellow-800';
    case 'Selesai': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
}
};

return (
<div>
    <div className="mb-8">
    <h1 className="text-3xl font-bold text-gray-800">Daftar Usulan Warga</h1>
    <p className="text-gray-500 mt-1">Tinjau aspirasi dan laporan infrastruktur yang masuk dari peta WebGIS.</p>
    </div>

    {/* Statistik Cepat */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div className="bg-white p-5 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 font-medium">Total Usulan</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">124</p>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 font-medium">Menunggu Verifikasi</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">12</p>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 font-medium">Sedang Diproses</p>
        <p className="text-2xl font-bold text-yellow-600 mt-1">5</p>
    </div>
    <div className="bg-white p-5 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 font-medium">Proyek Selesai</p>
        <p className="text-2xl font-bold text-green-600 mt-1">48</p>
    </div>
    </div>

    {/* Tabel Data Usulan */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
        <thead>
            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <th className="p-4 font-semibold">ID</th>
            <th className="p-4 font-semibold">Judul Usulan</th>
            <th className="p-4 font-semibold">Pengusul</th>
            <th className="p-4 font-semibold">Tanggal</th>
            <th className="p-4 font-semibold text-center">Dukungan</th>
            <th className="p-4 font-semibold">Status</th>
            <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
            {MOCK_USULAN.map((usulan) => (
            <tr key={usulan.id} className="hover:bg-gray-50 transition">
                <td className="p-4 text-gray-500">#{usulan.id}</td>
                <td className="p-4 font-medium text-gray-800">{usulan.judul}</td>
                <td className="p-4 text-gray-600">{usulan.pengusul}</td>
                <td className="p-4 text-gray-600">{usulan.tanggal}</td>
                <td className="p-4 text-center font-bold text-blue-600">{usulan.token} Token</td>
                <td className="p-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(usulan.status)}`}>
                    {usulan.status}
                </span>
                </td>
                <td className="p-4 text-center">
                <button
                    onClick={() => alert(`Koordinat usulan #${usulan.id} siap ditinjau di peta.`)}
                    className="text-xs font-semibold text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition"
                >
                    Tinjau Lokasi
                </button>
                </td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
    </div>
</div>
);
}