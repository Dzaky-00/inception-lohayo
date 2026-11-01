'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

export interface AppConfig {
  appName: string;
  tagline: string;
  instansi: string;
  logoUrl: string | null;
  loginBgTheme: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'Pantau Desa',
  tagline: 'Platform Akuntabilitas & Musrenbang',
  instansi: 'Kementerian Desa PDTT / Dinas PMD Provinsi',
  logoUrl: null,
  loginBgTheme: 'gradient-blue',
};

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  refreshConfig: async () => {},
});

export function ConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig?: AppConfig;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<AppConfig>(initialConfig || DEFAULT_CONFIG);

  // Sinkronisasi cache lokal saat pertama kali mount dari server
  useEffect(() => {
    if (initialConfig) {
      localStorage.setItem('pantau_global_config', JSON.stringify(initialConfig));
    } else {
      const cached = localStorage.getItem('pantau_global_config');
      if (cached) {
        try {
          setConfig((prev) => ({ ...prev, ...JSON.parse(cached) }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [initialConfig]);

  // Listener untuk pembaruan instan saat Super Admin menyimpan perubahan
  useEffect(() => {
    const handleConfigUpdated = () => {
      const saved = localStorage.getItem('pantau_global_config');
      if (saved) {
        try {
          setConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('configUpdated', handleConfigUpdated);
    return () => window.removeEventListener('configUpdated', handleConfigUpdated);
  }, []);

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('pantau_global_config', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshConfig = async () => {
    try {
      const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
      if (data) {
        const fresh: AppConfig = {
          appName: data.app_name || DEFAULT_CONFIG.appName,
          tagline: data.tagline || DEFAULT_CONFIG.tagline,
          instansi: data.instansi || DEFAULT_CONFIG.instansi,
          logoUrl: data.logo_url || null,
          loginBgTheme: data.login_bg_theme || DEFAULT_CONFIG.loginBgTheme,
        };
        setConfig(fresh);
        localStorage.setItem('pantau_global_config', JSON.stringify(fresh));
      }
    } catch (e) {
      console.error('Gagal memperbarui konfigurasi:', e);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(ConfigContext);
}

