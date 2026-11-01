# Panduan Arsitektur & Rekam Jejak Sistem: Pantau Desa

Dokumen ini merupakan panduan awal dan catatan arsitektur resmi (*living documentation*) untuk ekosistem **Pantau Desa** — platform WebGIS *participatory budgeting* terintegrasi tiga tingkat peran (Warga, Admin Desa, Super Admin) dengan backend Supabase dan Next.js Server-Side Rendering (SSR).

---

## 🏛️ Arsitektur Tiga Tingkat Peran (Multi-Tenancy RBAC)

1. **Warga (`/` - Role: `warga`):**
   - Eksplorasi peta WebGIS interaktif berbasis Leaflet & PostGIS `POINT(lng lat)`.
   - Dompet hak suara dinamis (*quadratic voting tokens*).
   - Penyaluran token suara langsung pada pin usulan pembangunan (+1, +5, +10).
   - Pengajuan aspirasi/laporan spasial beserta bukti gambar ke bucket Supabase `proposal-images`.
   - Pemantauan bilah transparansi realisasi APBDes berjalan.

2. **Admin Desa (`/admin` - Role: `admin`):**
   - Tata kelola alokasi dana APBDes berbasis bukti multi-format (gambar, baliho, nota, PDF, DOCX, XLSX) beserta verifikasi kelayakan.
   - Moderasi dan validasi usulan partisipatif warga desa setempat.
   - Notifikasi real-time terintegrasi *audio alert chime* (Web Audio API).

3. **Super Admin / Otoritas Pusat (`/superadmin` - Role: `superadmin`):**
   - Tata kelola makro lintas wilayah & pendaftaran entitas desa baru (*tenant onboarding*).
   - Penerbitan dan manajemen akun dinas perangkat desa.
   - Gerbang simulasi integrasi REST API Disdukcapil (SIAK Kemendagri) untuk verifikasi otomatis NIK DPT warga.
   - Penyiaran instruksi pembangunan nasional dan pengawasan serapan anggaran nasional.
   - Pengaturan branding global (`/superadmin/pengaturan`) tersimpan di Supabase `app_config`.

---

## 📋 Rekam Jejak Pembaruan & Konvensi Teknis

### 1. Panel Admin Desa & Penyederhanaan Form
* **Bukti Alokasi APBDes Fleksibel:** Pengaturan alokasi dana menerima berkas multi-format (gambar, baliho, nota, dokumen PDF/DOCX/XLSX) dilengkapi status kelayakan berkas.
* **Pembersihan Formulir:** Menghilangkan input manual identitas wilayah desa dan pasang foto profil admin desa agar antarmuka fokus pada tata kelola dana.
* **Header & Sidebar Universal:** Lonceng notifikasi dan *audio alert chime* (Web Audio API) berada di tingkat tata letak universal sehingga tetap aktif di seluruh halaman admin.

### 2. Peningkatan Interaktivitas Navigasi
* **Pembersihan Menu Akun:** Dropdown profil admin hanya menyajikan informasi akun dan tombol keluar.
* **Standarisasi Tampilan Profil Header:** Menampilkan email dinas resmi di samping lonceng notifikasi untuk Admin Desa dan Super Admin (menggantikan teks nama statis), tersinkronisasi otomatis saat kredensial diperbarui.
* **Penutup Pop-up Otomatis (*Click-Outside*):** Mengintegrasikan `useRef` dan event listener global sehingga pop-up notifikasi maupun profil langsung menutup saat area layar lain diklik.
* **Sidebar Responsif & Logo:** *Hamburger toggle* untuk membuka-tutup sidebar secara mulus serta menyematkan identitas logo Pantau Desa di bilah navigasi.

### 3. Sisi Warga & Mekanisme Voting Kuadratik
* **Header Partisipasi Warga:** Menampilkan dompet hak suara (*token wallet*) dinamis dan bilah transparansi total anggaran APBDes berjalan.
* **Voting Langsung pada Pin WebGIS:** Warga dapat menyalurkan token dukungan suara (+1, +5, +10) secara langsung pada pin laporan infrastruktur di peta.

### 4. Skalabilitas Multi-Tenancy & Super Admin
* **Dasbor Otoritas Pusat & Metrik Konsolidasi Makro:**
  - **Total Desa Terdaftar:** Menampilkan akumulasi entitas desa dengan rincian status (Aktif Terhubung, Sinkronisasi Ulang, Nonaktif).
  - **Pagu Anggaran Terkonsolidasi:** Akumulasi seluruh pagu dana desa berformat mata uang IDR (`Rp 14,2 Miliar`) dilengkapi indikator realisasi serapan anggaran nasional.
  - **Partisipasi Warga Aktif:** Metrik makro total warga aktif nasional serta kolom detail partisipasi warga per desa (`3.420 Warga (71%)` + indikator progress bar warna).
  - **Pendaftaran Tenant Desa & Alokasi Pagu:** Modal registrasi desa baru dengan penetapan pagu APBDes dan target DPT awal.
* **Penguncian Sesi Ketat (*Auth Guard*):** Akses rute terkunci penuh berdasarkan peran pengguna. Percobaan akses silang (misal: Super Admin membuka `/admin`) ditahan dan dialihkan langsung ke halaman yang sesuai atau login.
* **Penyatuan Kerangka Kerja (`components/AppShell.tsx`):** Menyatukan seluruh navigasi, logika keamanan RBAC, dan audio alert ketiga peran ke dalam satu wadah tata letak terpusat.

### 5. Integrasi Database Supabase & Penanganan Konflik Teknis
* **Penyelarasan Git & Skema `Map.tsx`:** Menggabungkan formulir pelaporan spasial warga dengan tabel database Supabase PostGIS `POINT(lng lat)`, penyimpanan berkas di bucket `proposal-images`, serta notifikasi `react-hot-toast` tanpa kolom kategori usulan yang redundan.
* **Resolusi Lifecycle Leaflet:** Mencegah galat manipulasi DOM Leaflet pada Next.js seperti galat `appendChild` dan `Map container is being reused by another instance` saat perpindahan rute atau pergantian sesi.
* **Sanitasi Autentikasi:** Mencegah peramban mengingat kredensial lama dengan menerapkan pembersihan *state* formulir (`resetForms()`) dan atribut `autoComplete="off"`.
* **Diagnostik Turbopack:** Pesan *instant navigation* "page.tsx dropped from rendering" adalah bagian dari diagnostik pra-render Turbopack, bukan galat aplikasi.

### 6. Arsitektur Notifikasi Terpadu (Global Alert Provider)
* **Modal Reusable:** Komponen modal pop-up seragam (`ModalAlert.tsx`) menggantikan fungsi `alert()` bawaan peramban yang memblokir thread.
* **Konteks Global:** Penyediaan `AlertProvider` di `app/layout.tsx` sehingga pemanggilan modal pop-up di file mana pun menggunakan fungsi standar `showAlert(type, title, message)`.

### 7. Branding Platform Dinamis & Migrasi ke SSR
* **Dasbor Pengaturan Visual Global (`/superadmin/pengaturan`):** Kontrol branding mencakup logo kustom, nama platform, *tagline* login, tema latar belakang login (Biru Gradasi, Dark, Abu Terang, Emerald), serta identitas Instansi Penanggung Jawab Resmi (Kementerian Desa PDTT / Dinas PMD).
* **Migrasi Database Supabase (`app_config`):** Konfigurasi tersimpan terpusat di tabel Supabase `app_config` (bukan sekadar `localStorage`), menjamin persistensi di seluruh perangkat dan mode penyamaran (*Incognito*).
* **Pencegahan Flash Default State (Anti-FOUC) dengan SSR Root Layout:**
  - `app/layout.tsx` bertindak sebagai async Server Component yang menarik data `app_config` dari Supabase sebelum HTML dikirim ke browser, membungkus aplikasi dengan `<ConfigProvider initialConfig={initialConfig}>`.
  - `components/AppShell.tsx` dan `app/login/LoginForm.tsx` terhubung ke hook `useAppConfig()`. Tidak ada lagi state hardcoded lokal di client component yang memicu kilasan default SVG atau teks "Pantau Desa".
  - Halaman `app/login/page.tsx` direfaktor menjadi Server Component murni yang mengalirkan `initialConfig` ke `LoginForm.tsx`, melenyapkan jeda loading spinner `!isReady` sehingga form login tampil instan sejak frame pertama.
* **Penyempurnaan Tampilan Logo & Estetika Visual:**
  - **Halaman Login (`LoginForm.tsx`):** Wadah logo diperbesar menjadi `w-20 h-20` (80px) bebas kotak biru kaku. Sudut logo diperhalus (`rounded-xl` + `object-contain drop-shadow-md`) agar gambar/lambang mengisi ruang secara proporsional dan tidak berbentuk kotak tajam.
  - **Sidebar Dasbor (`AppShell.tsx`):** Menghilangkan kotak putih pembungkus logo. Logo/emblem kini tampil melayang secara transparan (*seamless floating emblem*) di atas latar belakang gelap sidebar (`bg-gray-900`) dilengkapi tombol *collapse tab* (`←`) persis seperti acuan desain.

---

## 🛠️ Aturan Pengembangan Lanjutan (*Development Rules*)
1. **Preservasi RBAC:** Setiap fitur atau halaman baru harus tunduk pada validasi `allowedRole` di `AppShell.tsx` atau proteksi middleware/server-side.
2. **Kestabilan Leaflet WebGIS:** Hindari inisialisasi ulang instansi Leaflet Map di luar useEffect atau tanpa cleanup destroy map instance.
3. **Persistensi Konfigurasi:** Hindari menyimpan data preferensi institusi atau konfigurasi global hanya di `localStorage`; gunakan tabel `app_config` di Supabase.
4. **Performa Rendering:** Pertahankan pola SSR untuk rute publik/login demi meminimalisasi Layout Shift (CLS) dan jeda pemuatan halaman.

