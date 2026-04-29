import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Phone, ChevronLeft, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react';
import { translations, Language } from '../translations';

export const LoginPage = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const translateError = (error: string) => {
    if (lang !== 'ar') return error;
    const lower = error.toLowerCase();
    if (lower.includes('no user record') || lower.includes('user-not-found')) return 'بيانات الدخول غير صحيحة.';
    if (lower.includes('wrong-password')) return 'كلمة المرور غير صحيحة.';
    if (lower.includes('invalid-email')) return 'بيانات الدخول غير صحيحة.';
    if (lower.includes('too-many-requests')) return 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.';
    if (lower.includes('network-request-failed')) return 'فشل في الاتصال بالشبكة.';
    return error;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Phone Sanitization Helper
      const sanitizePhone = (phone: string): string => {
        let clean = phone.replace(/\D/g, "");
        if (clean.startsWith("00966")) clean = clean.substring(2);
        if (clean.startsWith("05") && clean.length === 10) clean = "966" + clean.substring(1);
        else if (clean.startsWith("5") && clean.length === 9) clean = "966" + clean;
        else if (!clean.startsWith("966") && clean.length === 9) clean = "966" + clean;
        return clean;
      };

      let loginEmail = loginInput;
      
      // If it looks like a phone number, look it up via backend
      if (!loginInput.includes('@')) {
        const cleanPhone = sanitizePhone(loginInput);
        
        try {
          const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3001";
          const response = await fetch(`${baseUrl}/api/get-email-by-phone?phone=${encodeURIComponent(cleanPhone)}`);
          const data = await response.json();
          
          if (data.success && data.email) {
            loginEmail = data.email;
          } else {
            // Fallback to generated email if lookup fails
            loginEmail = `${cleanPhone}@hakkal.com`;
          }
        } catch (lookupErr) {
          console.error("Email lookup failed:", lookupErr);
          // Fallback to generated email
          loginEmail = `${cleanPhone}@hakkal.com`;
        }
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err: any) {
      console.error(err);
      setError(translateError(err.code || err.message || t.auth.loginError));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!loginInput) {
      setError(t.auth.enterEmailFirst);
      return;
    }
    setLoading(true);
    try {
      let resetEmail = loginInput;
      if (!loginInput.includes('@')) {
        const cleanPhone = loginInput.replace(/\D/g, '');
        resetEmail = `${cleanPhone}@hakkal.com`;
      }
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setError('');
    } catch (err: any) {
      setError(t.auth.failedSendReset);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6" dir={lang === 'ar' ? "rtl" : "ltr"}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={toggleLang}
          className="absolute top-6 start-6 flex items-center gap-2 text-brand-navy hover:text-brand-orange transition-colors z-10"
        >
          <Globe size={20} />
          <span className="text-[10px] font-bold tracking-widest">{lang === 'en' ? 'AR' : 'EN'}</span>
        </button>

        <div className="absolute top-0 end-0 w-32 h-32 bg-brand-orange/5 rounded-full -me-16 -mt-16" />
        
        <div className="text-center mb-10 relative">
          <div className="flex items-center justify-center mb-6">
            <img
              src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png"
              alt={t.auth.welcomeBrand}
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-serif text-brand-navy mb-3">{t.auth.login}</h2>
          <p className="text-gray-400 text-sm font-medium">{t.auth.welcomeBrand}</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center space-x-3 space-x-reverse text-sm`}
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {resetSent && (
          <div className="mb-8 p-4 bg-green-50 text-green-600 rounded-2xl text-sm text-center font-bold">
            {t.auth.resetLinkSent}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
              {lang === 'ar' ? 'رقم الجوال أو البريد الإلكتروني' : 'Phone Number or Email'}
            </label>
            <div className="relative">
              <Phone className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-start"
                placeholder={lang === 'ar' ? "9665XXXXXXXX" : "email@example.com"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {t.auth.password}
              </label>
              <button 
                type="button"
                onClick={handleResetPassword}
                className="text-[10px] font-bold text-brand-orange hover:text-brand-orange-hover transition-colors tracking-widest uppercase"
              >
                {t.auth.forgotPassword}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pe-12 ps-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-orange transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 text-center"
          >
            {loading ? t.auth.verifying : t.auth.loginBtn}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-xs font-medium mb-4">{t.auth.noAccount}</p>
          <Link 
            to="/register" 
            className="inline-flex items-center space-x-2 space-x-reverse text-brand-orange font-bold text-[11px] tracking-widest uppercase hover:text-brand-orange-hover transition-colors"
          >
            <span>{t.auth.register}</span>
            <ChevronLeft size={16} className={lang === 'ar' ? "" : "rotate-180"} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
