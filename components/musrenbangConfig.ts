// Konfigurasi Siklus Musrenbang & Sistem Alokasi Dana Pantau Desa
// Hak Pengaturan Alokasi: Eksklusif Admin Desa

import { supabase } from './supabase';

export type MusrenbangFase = 1 | 2 | 3 | 4;

export interface MusrenbangConfig {
  faseAktif: MusrenbangFase; // Ditentukan otomatis berdasarkan jadwal tanggal saat ini / tanggal simulasi
  fase1Start: string; // YYYY-MM-DD
  fase1End: string;   // YYYY-MM-DD
  fase2Start: string; // YYYY-MM-DD
  fase2End: string;   // YYYY-MM-DD
  fase3Start: string; // YYYY-MM-DD
  fase3End: string;   // YYYY-MM-DD
  budgetCap: number; // Batas Anggaran Proyek Partisipasi Warga (Budget Cap)
  totalApbdes: number; // Total Seluruh APBDes Desa
  danaBtt: number; // Pos Belanja Tidak Terduga (BTT) untuk Kedaruratan
  fase1DurationDays: number;
  fase2DurationDays: number;
  fase3DurationDays: number;
  sisaHari: number;
  simulatedDate?: string; // YYYY-MM-DD jika simulasi waktu diaktifkan
}

// Perhitungan pembagian otomatis alokasi APBDes dengan Rasio 7 : 3
// 70% (rasio 7) untuk Batas Anggaran Partisipatif (Budget Cap)
// 30% (rasio 3) untuk Pos Belanja Tidak Terduga (BTT) Kedaruratan
export const calculateAllocationsFromTotalApbdes = (
  totalApbdes: number
): { budgetCap: number; danaBtt: number } => {
  const cap = Math.round(totalApbdes * 0.7);
  const btt = Math.max(0, totalApbdes - cap);
  return { budgetCap: cap, danaBtt: btt };
};

// Nilai standar default jika belum ada di database
export const DEFAULT_CONFIG: MusrenbangConfig = {
  faseAktif: 1,
  fase1Start: '2026-11-01',
  fase1End: '2026-11-14',
  fase2Start: '2026-11-15',
  fase2End: '2026-11-21',
  fase3Start: '2026-11-22',
  fase3End: '2026-12-12',
  totalApbdes: 1250000000, // Rp 1,25 Miliar
  budgetCap: 875000000, // Rp 875 Juta (70% dari Total APBDes - Rasio 7)
  danaBtt: 375000000, // Rp 375 Juta (30% dari Total APBDes - Rasio 3)
  fase1DurationDays: 14,
  fase2DurationDays: 7,
  fase3DurationDays: 21,
  sisaHari: 14,
};

const CONFIG_KEY = 'pantau_musrenbang_config';
const VOTES_STORAGE_KEY = 'pantau_user_allocated_votes';
const SIMULATED_DATE_KEY = 'pantau_simulated_date';

// Ambil tanggal saat ini (menggunakan tanggal simulasi jika diatur oleh user, atau tanggal riil)
export const getEffectiveCurrentDate = (): string => {
  if (typeof window === 'undefined') {
    return '2026-11-01';
  }
  try {
    const sim = localStorage.getItem(SIMULATED_DATE_KEY);
    if (sim && /^\d{4}-\d{2}-\d{2}$/.test(sim)) {
      return sim;
    }
  } catch {}

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getSimulatedDate = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SIMULATED_DATE_KEY);
  } catch {
    return null;
  }
};

// Set tanggal simulasi atau reset ke waktu riil (null)
// Simpan tanggal simulasi ke database Supabase agar otomatis tersinkron ke semua warga di perangkat/tab lain
export const syncSimulatedDateToDb = async (dateStr: string | null): Promise<void> => {
  try {
    const { data: existing } = await supabase
      .from('usulan')
      .select('id, deskripsi')
      .eq('status', 'system_config')
      .maybeSingle();

    let cfg: Partial<MusrenbangConfig> = DEFAULT_CONFIG;
    if (existing && existing.deskripsi) {
      try {
        cfg = JSON.parse(existing.deskripsi);
      } catch {}
    }

    if (dateStr) {
      cfg.simulatedDate = dateStr;
    } else {
      delete cfg.simulatedDate;
    }

    const effDate = dateStr || getEffectiveCurrentDate();
    const { fase, sisaHari } = getActiveFaseFromDate(effDate, cfg);
    cfg.faseAktif = fase;
    cfg.sisaHari = sisaHari;

    const payloadJson = JSON.stringify(cfg);

    if (existing) {
      await supabase
        .from('usulan')
        .update({
          deskripsi: payloadJson,
          judul: '[SISTEM] Konfigurasi Alokasi Dana Desa',
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('usulan').insert([
        {
          judul: '[SISTEM] Konfigurasi Alokasi Dana Desa',
          deskripsi: payloadJson,
          lokasi: 'POINT(112.768845 -7.250445)',
          status: 'system_config',
          total_token: 0,
        },
      ]);
    }
  } catch (err) {
    console.error('Error saat menyimpan simulatedDate ke database:', err);
  }
};

// Set tanggal simulasi atau reset ke waktu riil (null) & sinkronkan ke local + database cloud
export const setSimulatedDate = (dateStr: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (!dateStr) {
      localStorage.removeItem(SIMULATED_DATE_KEY);
    } else {
      localStorage.setItem(SIMULATED_DATE_KEY, dateStr);
    }

    // Perbarui data di cache config lokal
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (dateStr) {
        parsed.simulatedDate = dateStr;
      } else {
        delete parsed.simulatedDate;
      }
      const effDate = dateStr || getEffectiveCurrentDate();
      const { fase, sisaHari } = getActiveFaseFromDate(effDate, parsed);
      parsed.faseAktif = fase;
      parsed.sisaHari = sisaHari;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
    }
  } catch {}

  window.dispatchEvent(new Event('pantau_simulated_date_changed'));
  window.dispatchEvent(new Event('musrenbang_config_changed'));

  // Sinkronkan ke database Supabase secara asinkron
  syncSimulatedDateToDb(dateStr).catch((err) => {
    console.error('Gagal menyinkronkan tanggal simulasi ke Supabase:', err);
  });
};

// Kalkulasi fase aktif dan sisa hari secara otomatis berdasarkan tanggal efektif dan jadwal rentang waktu
export const getActiveFaseFromDate = (
  dateStr: string,
  cfg: Partial<MusrenbangConfig>
): { fase: MusrenbangFase; sisaHari: number; statusText: string } => {
  const f1Start = cfg.fase1Start || '2026-11-01';
  const f1End = cfg.fase1End || '2026-11-14';
  const f2Start = cfg.fase2Start || '2026-11-15';
  const f2End = cfg.fase2End || '2026-11-21';
  const f3Start = cfg.fase3Start || '2026-11-22';
  const f3End = cfg.fase3End || '2026-12-12';

  if (dateStr <= f1End) {
    const end = new Date(f1End + 'T23:59:59').getTime();
    const cur = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = Math.max(0, Math.ceil((end - cur) / (1000 * 60 * 60 * 24)));
    return {
      fase: 1,
      sisaHari: diffDays,
      statusText: dateStr < f1Start ? 'Belum Dimulai (Menunggu Fase 1)' : 'Fase 1: Pengajuan Usulan Warga',
    };
  } else if (dateStr <= f2End) {
    const end = new Date(f2End + 'T23:59:59').getTime();
    const cur = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = Math.max(0, Math.ceil((end - cur) / (1000 * 60 * 60 * 24)));
    return {
      fase: 2,
      sisaHari: diffDays,
      statusText: 'Fase 2: Verifikasi & Desk Teknis',
    };
  } else if (dateStr <= f3End) {
    const end = new Date(f3End + 'T23:59:59').getTime();
    const cur = new Date(dateStr + 'T00:00:00').getTime();
    const diffDays = Math.max(0, Math.ceil((end - cur) / (1000 * 60 * 60 * 24)));
    return {
      fase: 3,
      sisaHari: diffDays,
      statusText: 'Fase 3: Periode Voting Koin Warga',
    };
  } else {
    return {
      fase: 4,
      sisaHari: 0,
      statusText: 'Pasca Fase 3: Hasil Akhir Musrenbang Selesai',
    };
  }
};

// Ambil konfigurasi lokal (sinkron) dengan sinkronisasi fase berdasarkan tanggal saat ini / simulasi
export const getMusrenbangConfig = (): MusrenbangConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged: MusrenbangConfig = { ...DEFAULT_CONFIG, ...parsed };
    const curDate = getEffectiveCurrentDate();
    const { fase, sisaHari } = getActiveFaseFromDate(curDate, merged);
    merged.faseAktif = fase;
    merged.sisaHari = sisaHari;
    merged.simulatedDate = getSimulatedDate() || undefined;
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
};

// Ambil konfigurasi riil dari Supabase (async) - Dapat diakses publik/warga sebagai transparansi
export const fetchMusrenbangConfigFromDb = async (): Promise<MusrenbangConfig> => {
  try {
    const { data } = await supabase
      .from('usulan')
      .select('deskripsi')
      .eq('status', 'system_config')
      .maybeSingle();

    if (data && data.deskripsi) {
      const parsed = JSON.parse(data.deskripsi);
      const merged: MusrenbangConfig = { ...DEFAULT_CONFIG, ...parsed };

      // Sinkronkan simulatedDate dari database jika Admin Desa telah menetapkannya di cloud
      if (typeof window !== 'undefined') {
        if (parsed.simulatedDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.simulatedDate)) {
          localStorage.setItem(SIMULATED_DATE_KEY, parsed.simulatedDate);
        } else if (parsed.simulatedDate === null || parsed.simulatedDate === '') {
          localStorage.removeItem(SIMULATED_DATE_KEY);
        }
      }

      const curDate = getEffectiveCurrentDate();
      const { fase, sisaHari } = getActiveFaseFromDate(curDate, merged);
      merged.faseAktif = fase;
      merged.sisaHari = sisaHari;
      merged.simulatedDate = getSimulatedDate() || undefined;

      if (typeof window !== 'undefined') {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('pantau_simulated_date_changed'));
        window.dispatchEvent(new Event('musrenbang_config_changed'));
      }
      return merged;
    }
  } catch (err) {
    console.error('Gagal memuat konfigurasi dari database:', err);
  }
  return getMusrenbangConfig();
};

// Simpan konfigurasi ke database & lokal — HANYA BISA DIAKSES OLEH ADMIN DESA
export const saveMusrenbangConfig = async (
  newConfig: Partial<MusrenbangConfig>
): Promise<{ success: boolean; config: MusrenbangConfig; message: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, config: DEFAULT_CONFIG, message: 'Window undefined' };
  }

  // Validasi Otoritas Ketat: Hanya Admin Desa yang berhak mengubah jadwal dan alokasi dana
  const currentRole = localStorage.getItem('pantau_role');
  if (currentRole !== 'admin') {
    const msg = 'Akses Ditolak: Hanya Admin Desa yang berwenang mengatur alokasi dana APBDes dan jadwal fase.';
    console.warn(msg);
    return { success: false, config: getMusrenbangConfig(), message: msg };
  }

  const current = getMusrenbangConfig();
  const updated: MusrenbangConfig = { ...current, ...newConfig };

  // Otomatisasi pembagian rasio 7:3 (Budget Cap 70% : BTT 30%) berdasarkan Total APBDes
  if (typeof newConfig.totalApbdes === 'number' && newConfig.totalApbdes > 0) {
    const { budgetCap, danaBtt } = calculateAllocationsFromTotalApbdes(newConfig.totalApbdes);
    updated.totalApbdes = newConfig.totalApbdes;
    updated.budgetCap = budgetCap;
    updated.danaBtt = danaBtt;
  }

  // Otomatisasi kalkulasi faseAktif berdasarkan jadwal tanggal yang baru disimpan
  const curDate = getEffectiveCurrentDate();
  const { fase, sisaHari } = getActiveFaseFromDate(curDate, updated);
  updated.faseAktif = fase;
  updated.sisaHari = sisaHari;

  if (updated.faseAktif >= 3) {
    autoRejectUnverifiedProposals(updated.faseAktif).catch((e) =>
      console.error('Auto reject pada saveMusrenbangConfig gagal:', e)
    );
  }

  // 1. Simpan ke Cache Lokal
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('musrenbang_config_changed'));

  // 2. Sinkronisasi Permanen ke Database Supabase
  try {
    const payloadJson = JSON.stringify(updated);
    const { data: existing } = await supabase
      .from('usulan')
      .select('id')
      .eq('status', 'system_config')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('usulan')
        .update({
          deskripsi: payloadJson,
          judul: '[SISTEM] Konfigurasi Alokasi Dana Desa',
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('usulan').insert([
        {
          judul: '[SISTEM] Konfigurasi Alokasi Dana Desa',
          deskripsi: payloadJson,
          lokasi: 'POINT(112.768845 -7.250445)',
          status: 'system_config',
          total_token: 0,
        },
      ]);
    }
  } catch (err) {
    console.error('Gagal menyinkronkan konfigurasi ke server:', err);
  }

  return { success: true, config: updated, message: 'Jadwal dan alokasi dana berhasil diperbarui oleh Admin Desa.' };
};

// Ambil riwayat alokasi koin per usulan oleh warga yang sedang login
export const getUserAllocatedVotes = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveUserAllocatedVotes = (votes: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
    window.dispatchEvent(new Event('pantau_user_votes_changed'));
  } catch {
    // ignore
  }
};

// Cek apakah usulan sudah memiliki alokasi anggaran resmi dari Admin Desa
export const hasOfficialBiaya = (deskripsi?: string): boolean => {
  if (!deskripsi) return false;
  return /\[(?:Biaya|Anggaran|Estimasi):\s*(?:Rp\s*)?[0-9.,]+/i.test(deskripsi);
};

// Ambil nilai nominal alokasi anggaran resmi jika sudah ditetapkan
export const getOfficialBiaya = (deskripsi?: string): number | null => {
  if (!deskripsi) return null;
  const match = deskripsi.match(/\[(?:Biaya|Anggaran|Estimasi):\s*(?:Rp\s*)?([0-9.,]+)(?:\s*(?:Juta|jt))?\]/i);
  if (match) {
    let numStr = match[1].replace(/\./g, '').replace(/,/g, '');
    let num = parseFloat(numStr);
    if (match[0].toLowerCase().includes('juta') || match[0].toLowerCase().includes('jt')) {
      num = num * 1000000;
    }
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
};

// Ambil alasan penolakan usulan jika usulan ditolak oleh Admin Desa
export const getRejectionReason = (deskripsi?: string): string | null => {
  if (!deskripsi) return null;
  const match = deskripsi.match(/\[(?:Alasan Penolakan|Ditolak):\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};

// Bersihkan metadata sistem ([Biaya: ...], [Alasan Penolakan: ...]) agar teks deskripsi tampil bersih di UI
export const getCleanDeskripsi = (deskripsi?: string): string => {
  if (!deskripsi) return '';
  return deskripsi
    .replace(/(\r?\n)*\[(?:Biaya|Anggaran|Estimasi):[^\]]+\]/gi, '')
    .replace(/(\r?\n)*\[(?:Alasan Penolakan|Ditolak):[^\]]+\]/gi, '')
    .trim();
};

// Sisipkan atau perbarui alasan penolakan oleh Admin Desa ke dalam deskripsi
export const updateDeskripsiWithRejection = (deskripsi: string = '', reason: string): string => {
  const clean = (deskripsi || '').replace(/(\r?\n)*\[(?:Alasan Penolakan|Ditolak):[^\]]+\]/gi, '').trim();
  if (!reason.trim()) return clean;
  return `${clean}\n\n[Alasan Penolakan: ${reason.trim()}]`;
};

// Sisipkan atau perbarui alokasi kebutuhan dana resmi oleh Admin Desa ke dalam deskripsi
export const updateDeskripsiWithBiaya = (deskripsi: string = '', nominal: number): string => {
  // Hapus tag biaya lama jika sudah ada
  const cleanDesc = getCleanDeskripsi(deskripsi);
  if (nominal <= 0) return cleanDesc;
  return `${cleanDesc}\n\n[Biaya: ${formatRupiah(nominal)}]`;
};

// Otomatisasi penolakan usulan yang belum diverifikasi saat Fase 3 dimulai
export const autoRejectUnverifiedProposals = async (currentFase: number): Promise<number> => {
  if (currentFase < 3) return 0;
  try {
    const { data: pendingList, error } = await supabase
      .from('usulan')
      .select('id, deskripsi, judul, status')
      .neq('status', 'system_config');

    if (error || !pendingList) return 0;

    // Filter usulan dengan status pending atau belum diverifikasi (bukan BTT darurat)
    const unverified = pendingList.filter((u) => {
      const s = (u.status || '').toLowerCase();
      const isDarurat = s === 'darurat' || (u.judul || '').toLowerCase().includes('[darurat');
      return s === 'pending' && !isDarurat;
    });

    if (unverified.length === 0) return 0;

    const defaultReason =
      'Masa verifikasi desk teknis (Fase 2) telah berakhir sebelum usulan diverifikasi oleh Pemerintah Desa.';

    for (const item of unverified) {
      const updatedDeskripsi = updateDeskripsiWithRejection(item.deskripsi || '', defaultReason);
      await supabase
        .from('usulan')
        .update({
          status: 'ditolak',
          deskripsi: updatedDeskripsi,
        })
        .eq('id', item.id);
    }

    return unverified.length;
  } catch (err) {
    console.error('Error auto-rejecting unverified proposals:', err);
    return 0;
  }
};

// Helper parsing estimasi biaya usulan dari deskripsi atau fallback realistis (untuk Leaderboard)
export const parseBiayaUsulan = (deskripsi?: string, judul?: string): number => {
  const official = getOfficialBiaya(deskripsi);
  if (official !== null) return official;

  // Fallback berdasarkan kata kunci judul usulan jika belum diverifikasi desk teknis
  const j = (judul || '').toLowerCase();
  if (j.includes('drainase') || j.includes('selokan') || j.includes('gorong')) return 100000000;
  if (j.includes('penerangan') || j.includes('lampu') || j.includes('pju')) return 100000000;
  if (j.includes('posyandu') || j.includes('kesehatan') || j.includes('alat')) return 50000000;
  if (j.includes('paving') || j.includes('jalan') || j.includes('aspal')) return 100000000;
  if (j.includes('sampah') || j.includes('kebersihan')) return 40000000;
  if (j.includes('kamling') || j.includes('pos')) return 35000000;

  return 75000000;
};

export const formatRupiah = (nominal: number): string => {
  if (nominal >= 1000000000) {
    const m = (nominal / 1000000000).toFixed(2).replace(/\.00$/, '');
    return `Rp ${m} Miliar`;
  }
  if (nominal >= 1000000) {
    const jt = (nominal / 1000000).toFixed(0);
    return `Rp ${jt} Juta`;
  }
  return `Rp ${nominal.toLocaleString('id-ID')}`;
};

// Format nominal angka dengan pemisah titik setiap 3 digit (contoh: 1250000000 -> "1.250.000.000")
export const formatNumberWithDots = (value: string | number): string => {
  if (value === null || value === undefined || value === '') return '';
  let cleanNumber = value.toString().replace(/\D/g, '');
  if (!cleanNumber) return '';
  if (cleanNumber.length > 1 && cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.replace(/^0+/, '') || '0';
  }
  return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse string dengan pemisah titik kembali ke integer bersih
export const parseNumberFromDots = (value: string | number): number => {
  if (value === null || value === undefined || value === '') return 0;
  const cleanNumber = value.toString().replace(/\D/g, '');
  return parseInt(cleanNumber, 10) || 0;
};

// Format tanggal Indonesia ramah pengguna: "Minggu, 1 November 2026" atau "1 November 2026"
export const formatDateIndo = (dateStr: string, includeDayName = true): string => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    if (includeDayName) {
      return `${days[date.getDay()]}, ${d} ${months[m - 1]} ${y}`;
    }
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
};

// Listener sinkronisasi antar-tab peramban (Cross-Tab Synchronization)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SIMULATED_DATE_KEY || e.key === CONFIG_KEY) {
      window.dispatchEvent(new Event('pantau_simulated_date_changed'));
      window.dispatchEvent(new Event('musrenbang_config_changed'));
    }
  });
}
