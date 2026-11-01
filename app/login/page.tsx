import { supabase } from '@/components/supabase';
import { AppConfig, DEFAULT_CONFIG } from '@/components/ConfigContext';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  let initialConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    tagline: 'Gerbang Akses Partisipasi & Pengawasan Terpadu',
  };

  try {
    const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
    if (data) {
      initialConfig = {
        appName: data.app_name || initialConfig.appName,
        tagline: data.tagline || initialConfig.tagline,
        instansi: data.instansi || initialConfig.instansi,
        logoUrl: data.logo_url || null,
        loginBgTheme: data.login_bg_theme || initialConfig.loginBgTheme,
      };
    }
  } catch (err) {
    // Fallback default jika offline
  }

  return <LoginForm initialConfig={initialConfig} />;
}
