# 🏛️ Pantau Desa

> **Platform WebGIS Participatory Budgeting & Akuntabilitas APBDes Terpadu Tiga Tingkat Peran (Warga, Admin Desa, Otoritas Super Admin)**

Pantau Desa adalah platform transparansi dan pengawasan partisipatif pembangunan desa berbasis spasial (WebGIS). Platform ini mengintegrasikan pemetaan lokasi usulan warga secara *real-time*, dompet hak suara berbasis *quadratic voting*, tata kelola alokasi dana desa (APBDes), serta integrasi master data kependudukan dan perbendaharaan negara.

---

## 🌟 Fitur Utama

1. **Akses Warga (`/`):**
   - Eksplorasi peta interaktif WebGIS berbasis Leaflet & PostGIS `POINT(lng lat)`.
   - Pengajuan aspirasi & laporan fisik infrastruktur dengan bukti foto langsung ke Supabase Storage.
   - Dompet hak suara digital (*Quadratic Voting Tokens*) untuk menentukan prioritas usulan pembangunan.
   - Bilah transparansi realisasi pagu anggaran APBDes berjalan.

2. **Admin Desa (`/admin`):**
   - Tata kelola alokasi pagu APBDes 2 pos utama: **Dana Pembangunan** & **Dana Darurat**.
   - Pengunggahan bukti serapan multi-format (foto baliho, nota belanja, berkas LPJ PDF).
   - Validasi dan moderasi usulan warga desa setempat.
   - Sistem notifikasi audio *alert chime* berbasis Web Audio API.

3. **Super Admin / Otoritas Pusat (`/superadmin`):**
   - Konsolidasi makro pagu anggaran APBDes nasional dan metrik partisipasi warga.
   - Integrasi REST API Gateway Kemendagri (SIAK Kependudukan) & Kemenkeu (OMSPAN Perbendaharaan).
   - Penarikan dan pendaftaran entitas desa baru secara terpadu (*auto-fill* kodefikasi wilayah).
   - Manajemen profil entitas desa, penyesuaian status aktif/nonaktif, dan *reset* sandi dinas.
   - Panel pengaturan *branding* visual dinamis di Supabase (`/superadmin/pengaturan`).

---

## 🚀 Menjalankan Proyek Secara Lokal

Pastikan Anda telah memasang **Node.js** (v18+) dan paket manajer **npm** / **pnpm**.

```bash
# 1. Klon repositori
git clone https://github.com/<username>/pantau-desa.git
cd pantau-desa

# 2. Pasang dependensi
npm install

# 3. Konfigurasi Environment Variables (.env.local)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 4. Jalankan server pengembangan
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) pada peramban Anda.

---

## AI Use Declaration

Dalam pengembangan proyek **Pantau Desa**, Artificial Intelligence (Large Language Models) digunakan sebagai asisten komputasi dan *co-pilot* untuk:
- Eksplorasi arsitektur geospasial WebGIS dan isolasi render komponen *client-side* Leaflet di Next.js App Router.
- Penyusunan struktur dokumen teknis dan penanganan *debugging* integrasi PostGIS serta mitigasi *event bubbling* pada DOM.
- Seluruh logika bisnis, arsitektur data multi-tenant, dan integrasi akhir divalidasi serta diuji secara mandiri oleh tim pengembang.

---

## Third-Party Declaration

Proyek ini memanfaatkan beberapa pustaka dan layanan pihak ketiga:
- **Framework & Runtime:** Next.js (React), TypeScript, Node.js
- **Styling:** Tailwind CSS
- **Pemetaan & WebGIS:** Leaflet.js, React-Leaflet, OpenStreetMap Tile Layer
- **Backend as a Service:** Supabase (PostgreSQL Database, PostGIS Extension, Supabase Storage)
- **UI Components & Notifikasi:** React Hot Toast
- **Hosting & Deployment:** Vercel Inc.
