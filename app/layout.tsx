import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/components/supabase";
import { ConfigProvider, AppConfig, DEFAULT_CONFIG } from "@/components/ConfigContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data } = await supabase.from("app_config").select("app_name, tagline").eq("id", 1).single();
    if (data?.app_name) {
      return {
        title: data.app_name,
        description: data.tagline || "Platform Transparansi & Aspirasi Warga",
      };
    }
  } catch {
    // Fallback default
  }

  return {
    title: "Pantau Desa",
    description: "Platform Transparansi & Aspirasi Warga",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialConfig: AppConfig = DEFAULT_CONFIG;

  try {
    const { data } = await supabase.from("app_config").select("*").eq("id", 1).single();
    if (data) {
      initialConfig = {
        appName: data.app_name || DEFAULT_CONFIG.appName,
        tagline: data.tagline || DEFAULT_CONFIG.tagline,
        instansi: data.instansi || DEFAULT_CONFIG.instansi,
        logoUrl: data.logo_url || null,
        loginBgTheme: data.login_bg_theme || DEFAULT_CONFIG.loginBgTheme,
      };
    }
  } catch {
    // Tetap fallback ke DEFAULT_CONFIG jika server offline / saat build
  }

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ConfigProvider initialConfig={initialConfig}>
          <Toaster position="top-center" /> 
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
