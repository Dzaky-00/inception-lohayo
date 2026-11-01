'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from './supabase';
import { AlertTriangle, Siren, Upload, X, ShieldAlert, Phone, MapPin } from 'lucide-react';

interface LaporEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LaporEmergencyModal({ isOpen, onClose, onSuccess }: LaporEmergencyModalProps) {
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [lokasiTeks, setLokasiTeks] = useState('');
  const [namaPelapor, setNamaPelapor] = useState('');
  const [noHp, setNoHp] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      toast.error('Judul kejadian darurat wajib diisi!');
      return;
    }
    if (!deskripsi.trim()) {
      toast.error('Jelaskan tingkat urgensi dan dampak darurat!');
      return;
    }

    setIsSubmitting(true);

    const prosesLapor = async () => {
      let foto_url = '';
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `emergency-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('proposal-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('proposal-images').getPublicUrl(fileName);
        foto_url = publicUrlData.publicUrl;
      }

      // Default koordinat darurat di pusat desa jika belum ada geotag
      const pointLokasi = 'POINT(112.768845 -7.250445)';

      const fullDeskripsi = `${deskripsi.trim()}\n\n[LOKASI: ${lokasiTeks || 'Pusat Wilayah Desa'}]\n[PELAPOR: ${namaPelapor || 'Warga Desa'} (${noHp || 'Tanpa Kontak'})]\n[JALUR_BTT_EMERGENCY]`;

      const { error: insertError } = await supabase.from('usulan').insert([
        {
          judul: `[DARURAT - BTT] ${judul.trim()}`,
          deskripsi: fullDeskripsi,
          lokasi: pointLokasi,
          foto_url,
          status: 'darurat',
          total_token: 0,
        },
      ]);

      if (insertError) throw insertError;

      // Reset form
      setJudul('');
      setDeskripsi('');
      setLokasiTeks('');
      setNamaPelapor('');
      setNoHp('');
      setFile(null);
      onClose();
      if (onSuccess) onSuccess();
    };

    toast.promise(prosesLapor(), {
      loading: 'Mengirimkan laporan darurat ke Kepala Desa & BPD...',
      success: '🚨 Laporan Darurat Masuk! Segera ditangani pos Belanja Tidak Terduga (BTT).',
      error: (err) => `Gagal mengirim laporan: ${err.message}`,
    });

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Alert Merah */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 rounded-t-[22px] flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl animate-pulse">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white text-red-700 px-2 py-0.5 rounded-full">
                  Jalur Cepat BTT
                </span>
                <span className="text-xs text-red-100">Bypass Musrenbang</span>
              </div>
              <h2 className="text-lg font-black mt-0.5 leading-tight">Lapor Kejadian Emergency</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner Regulasi BTT */}
        <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Khusus Bencana & Kerusakan Fasum Mendadak!</p>
            <p className="mt-0.5 text-amber-800 text-[11px]">
              Laporan ini <strong>TIDAK memerlukan voting koin warga</strong>. Kepala Desa & BPD berwenang langsung mencairkan pos <strong>Belanja Tidak Terduga (BTT)</strong> APBDes untuk tanggap darurat instan.
            </p>
          </div>
        </div>

        {/* Formulir Kedaruratan */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Kejadian Darurat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Jembatan RT 02 Roboh Tergerus Banjir"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              Detail Lokasi Kejadian <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Dusun Krajan RT 02 / RW 01, dekat sungai utama"
              value={lokasiTeks}
              onChange={(e) => setLokasiTeks(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1 flex items-center justify-between">
              <span>Urgensi & Dampak Terhadap Warga <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-gray-400 font-normal">Jelaskan bahaya langsung</span>
            </label>
            <textarea
              placeholder="Jelaskan kondisi di lapangan: Jalan terputus, warga terisolir, risiko korban jiwa, atau kebutuhan evakuasi segera..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">Nama Pelapor (Opsional)</label>
              <input
                type="text"
                placeholder="Nama Anda / Ketua RT"
                value={namaPelapor}
                onChange={(e) => setNamaPelapor(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-500" />
                Nomor WhatsApp (Untuk Konfirmasi)
              </label>
              <input
                type="tel"
                placeholder="0812xxxxxxx"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              Foto Bukti Kerusakan / Kejadian
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) setFile(e.target.files[0]);
              }}
              className="w-full text-[11px] text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan Darurat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

