import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, ChevronLeft, AlertCircle, Globe } from 'lucide-react';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError(lang === 'ar' ? "كلمة المرور غير صحيحة." : "Incorrect password.");
      } else if (err.code === 'auth/user-not-found') {
        setError(lang === 'ar' ? "هذا البريد الإلكتروني غير مسجل." : "Email not registered.");
      } else if (err.code === 'auth/too-many-requests') {
        setError(lang === 'ar' ? "محاولات كثيرة جداً. يرجى المحاولة لاحقاً." : "Too many attempts. Please try again later.");
      } else {
        setError(lang === 'ar' ? "حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من بياناتك." : "Login error. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError(lang === 'ar' ? "يرجى إدخال البريد الإلكتروني أولاً." : "Please enter email first.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch (err: any) {
      setError(lang === 'ar' ? "فشل إرسال رابط إعادة التعيين. تأكد من صحة البريد." : "Failed to send reset link.");
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-navy/5 rounded-3xl mb-6">
            <Lock className="text-brand-navy" size={32} />
          </div>
          <h2 className="text-3xl font-serif text-brand-navy mb-3">{t.auth.login}</h2>
          <p className="text-gray-400 text-sm font-medium">{lang === 'ar' ? 'مرحباً بك مجدداً في مختبر النكهات' : 'Welcome back to Flavor Lab'}</p>
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
            {lang === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' : 'Password reset link sent to your email.'}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
              {t.auth.email}
            </label>
            <div className="relative">
              <Mail className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-end"
                placeholder="email@example.com"
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
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 text-center"
          >
            {loading ? (lang === 'ar' ? 'جاري التحقق...' : 'VERIFYING...') : t.auth.loginBtn}
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
