import React, { useState, useEffect } from 'react';
import { login as authLogin, saveSession, getApiUrl, API_BASE } from '../auth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Phone, ChevronLeft, AlertCircle, Globe, Eye, EyeOff, Key } from 'lucide-react';
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

  const [step, setStep] = useState<'login' | 'otp' | 'set-password'>('login');
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();



  const translateError = (error: string) => {
    if (lang !== 'ar') return error;
    const lower = error.toLowerCase();
    if (lower.includes('no user record') || lower.includes('user-not-found') || lower.includes('invalid-credential')) return 'بيانات الدخول غير صحيحة.';
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
      await authLogin(loginInput, password);
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('pendingActivation') || msg.includes('pending activation')) {
        setError(lang === 'ar' ? 'حسابك قيد المراجعة، يرجى الانتظار حتى يتم التفعيل.' : 'Account pending activation.');
      } else {
        setError(translateError(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!loginInput) {
      setError(t.auth.enterEmailFirst);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginInput, reason: 'reset' }),
      });
      const data = await response.json();
      if (data.success) {
        setStep('otp');
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (err) {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginInput, otp }),
      });
      const data = await response.json();
      if (data.success && data.uid) {
        setStep('set-password');
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    setError("");
    try {

      const response = await fetch(`${API_BASE}/api/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginInput, password: newPassword }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        saveSession(data.token, data.user || { uid: data.uid, phone: loginInput, email: '', name: '', isAdmin: false, role: 'customer', accountActivated: true });
        navigate("/dashboard");
      } else {
        setError(data.error || "Failed to save password");
      }
    } catch (err) {
      setError("Operation failed.");
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
          <h2 className="text-3xl font-serif text-brand-navy mb-3">
            {step === 'login' ? t.auth.login : step === 'otp' ? 'تأكيد الرمز' : 'كلمة مرور جديدة'}
          </h2>
          <p className="text-gray-400 text-sm font-medium">
            {step === 'login' ? t.auth.welcomeBrand : step === 'otp' ? 'أدخل الكود المرسل لجوالك' : 'أدخل كلمة المرور الجديدة'}
          </p>
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

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6 relative">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
                {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
              </label>
              <div className="relative">
                <Phone className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-start"
                  placeholder="05XXXXXXXX"
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
                  onClick={handleSendOTP}
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
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">كود التحقق</label>
              <div className="relative">
                <Key className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="000000"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] hover:bg-brand-orange transition-all"
            >
              {loading ? "جاري التأكد..." : "تحقق من الكود"}
            </button>
            <button type="button" onClick={() => setStep('login')} className="w-full text-gray-400 text-[10px] font-bold uppercase text-center">رجوع</button>
          </form>
        )}

        {step === 'set-password' && (
          <form onSubmit={handleSetNewPassword} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">تأكيد كلمة المرور</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] hover:bg-brand-orange transition-all"
            >
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور والدخول"}
            </button>
          </form>
        )}

        {step === 'login' && (
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
        )}
      </motion.div>
    </div>
  );
};
