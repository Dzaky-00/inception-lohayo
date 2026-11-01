'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  getMusrenbangConfig,
  getEffectiveCurrentDate,
  getSimulatedDate,
  setSimulatedDate,
  getActiveFaseFromDate,
  autoRejectUnverifiedProposals,
  MusrenbangConfig,
  DEFAULT_CONFIG,
} from './musrenbangConfig';
import toast from 'react-hot-toast';

export default function SimulationCalendarBar() {
  const [config, setConfig] = useState<MusrenbangConfig>(DEFAULT_CONFIG);
  const [currentDate, setCurrentDate] = useState<string>('2026-11-01');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Navigasi bulan di dalam kalender popover (tahun & bulan 0-indexed)
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(10); // 10 = November (0-indexed)

  const popoverRef = useRef<HTMLDivElement>(null);

  const updateState = () => {
    const cfg = getMusrenbangConfig();
    const effDate = getEffectiveCurrentDate();
    const sim = getSimulatedDate();
    setConfig(cfg);
    setCurrentDate(effDate);
    setIsSimulated(!!sim);

    // Sinkronisasi tahun & bulan tampilan kalender ke tanggal aktif
    if (effDate) {
      const [y, m] = effDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  };

  useEffect(() => {
    updateState();

    const handleChange = () => updateState();
    window.addEventListener('pantau_simulated_date_changed', handleChange);
    window.addEventListener('musrenbang_config_changed', handleChange);

    return () => {
      window.removeEventListener('pantau_simulated_date_changed', handleChange);
      window.removeEventListener('musrenbang_config_changed', handleChange);
    };
  }, []);

  // Menutup kalender saat klik di luar popover atau menekan tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format tanggal Indonesia ramah pengguna: "Minggu, 1 November 2026"
  const formatDateIndo = (dateStr: string, includeDayName = true) => {
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

  // Pilih tanggal secara manual dari kotak kalender
  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setSimulatedDate(newDate);
    const { statusText, fase } = getActiveFaseFromDate(newDate, config);
    if (fase >= 3) {
      autoRejectUnverifiedProposals(fase).then((count) => {
        if (count > 0) {
          toast(`Otomatisasi Fase 3: ${count} usulan yang belum diverifikasi otomatis diperbarui ke Ditolak.`, {
            icon: 'ℹ️',
          });
        }
      });
    }
    toast.success(`📅 Simulasi: ${formatDateIndo(newDate, true)}\n${statusText}`);
    setIsOpen(false); // Tutup popover setelah tanggal dipilih
  };

  // Reset ke hari riil saat ini
  const handleReset = () => {
    setSimulatedDate(null);
    toast('Waktu simulasi direset ke waktu riil hari ini.', { icon: '🔄' });
  };

  const { fase: activeFase, statusText: activeStatusText, sisaHari } = getActiveFaseFromDate(currentDate, config);

  // Informasi fase untuk mewarnai kotak tanggal di kalender
  const getDayPhaseInfo = (dateStr: string) => {
    const f1Start = config.fase1Start || '2026-11-01';
    const f1End = config.fase1End || '2026-11-14';
    const f2Start = config.fase2Start || '2026-11-15';
    const f2End = config.fase2End || '2026-11-21';
    const f3Start = config.fase3Start || '2026-11-22';
    const f3End = config.fase3End || '2026-12-12';

    if (dateStr >= f1Start && dateStr <= f1End) {
      return { fase: 1, theme: 'amber' };
    }
    if (dateStr >= f2Start && dateStr <= f2End) {
      return { fase: 2, theme: 'blue' };
    }
    if (dateStr >= f3Start && dateStr <= f3End) {
      return { fase: 3, theme: 'emerald' };
    }
    if (dateStr > f3End) {
      return { fase: 4, theme: 'purple' };
    }
    return { fase: 0, theme: 'gray' };
  };

  // Navigasi bulan kalender
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Kalkulasi hari-hari dalam bulan untuk grid 7 kolom (Min..Sab)
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Minggu
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <aside aria-label="Simulasi Waktu Musrenbang" className="bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-6 py-2.5 text-xs shadow-md relative z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Sisi Kiri: Status Waktu Sistem & Fase Aktif */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="p-1 bg-blue-500/20 text-blue-400 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-300 hidden sm:inline">Waktu Sistem:</span>
              <strong className="text-white font-mono font-bold text-xs sm:text-sm">
                {formatDateIndo(currentDate, true)}
              </strong>
              {isSimulated ? (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                  SIMULASI
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  REAL-TIME
                </span>
              )}
            </div>
          </div>

          {/* Badge Fase Aktif (Otomatis berdasarkan tanggal terpilih) */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold transition shadow-xs ${
              activeFase === 1
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : activeFase === 2
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : activeFase === 3
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{activeStatusText}</span>
            {activeFase < 4 ? (
              <span className="opacity-80 text-[10px] font-semibold">({sisaHari} Hari Tersisa)</span>
            ) : (
              <span className="opacity-80 text-[10px] font-semibold">(Selesai)</span>
            )}
          </div>
        </div>

        {/* Sisi Kanan: Kontrol Pemilihan Tanggal Manual (Kompak & Rapi) */}
        <div className="relative flex items-center gap-2" ref={popoverRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            title="Klik untuk memilih tanggal simulasi dari kalender"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-200" />
            <span>Pilih Tanggal di Kalender</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSimulated && (
            <button
              onClick={handleReset}
              title="Kembalikan waktu ke kondisi riil hari ini"
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Riil</span>
            </button>
          )}

          {/* POPOVER KALENDER KOMPAK (Tidak overflow layar & mudah ditutup) */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-[60] text-white animate-in fade-in zoom-in-95 duration-150">
              {/* Header Kalender: Navigasi Bulan & Tombol Tutup */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-white px-2">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Tutup Kalender"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Kalender: Header Hari */}
              <div className="grid grid-cols-7 gap-1 text-center mt-3 mb-1.5">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, idx) => (
                  <div
                    key={d}
                    className={`text-[10px] font-bold py-0.5 ${
                      idx === 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid Kotak Tanggal */}
              <div className="grid grid-cols-7 gap-1">
                {/* Kotak kosong offset awal bulan */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 rounded-lg" />
                ))}

                {/* Hari-hari dalam bulan */}
                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                    dayNum
                  ).padStart(2, '0')}`;
                  const phaseInfo = getDayPhaseInfo(dateStr);
                  const isSelected = dateStr === currentDate;

                  let colorClasses = 'border border-transparent text-slate-300 hover:bg-slate-800';
                  if (phaseInfo.theme === 'amber') {
                    colorClasses = 'border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25';
                  } else if (phaseInfo.theme === 'blue') {
                    colorClasses = 'border border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/25';
                  } else if (phaseInfo.theme === 'emerald') {
                    colorClasses = 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/25';
                  } else if (phaseInfo.theme === 'purple') {
                    colorClasses = 'border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/25';
                  }

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateChange(dateStr)}
                      className={`h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition cursor-pointer ${colorClasses} ${
                        isSelected
                          ? 'bg-blue-600 text-white font-black ring-2 ring-white scale-105 z-10 shadow-sm'
                          : ''
                      }`}
                      title={formatDateIndo(dateStr, true)}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Legenda Warna Sederhana */}
              <div className="flex items-center justify-between gap-1 text-[10px] pt-3 mt-2 border-t border-slate-800 text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Fase 1
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Fase 2
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fase 3
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span> Pasca-F3
                </span>
              </div>

              {/* Tombol Tutup di Bagian Bawah */}
              <div className="pt-2 mt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
