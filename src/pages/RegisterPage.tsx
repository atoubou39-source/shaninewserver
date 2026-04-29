import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Mail, Phone, Lock, ChevronLeft, AlertCircle, CheckCircle2, Globe, User as UserIcon, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { translations, Language } from '../translations';

const getApiUrl = (path: string) => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
  
  // Clean the path
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If VITE_API_BASE_URL is set and not the placeholder, use it
  if (envBase && envBase !== "https://your-backend-domain.com") {
    const cleanBase = envBase
      .trim()
      .replace(/^[/\)\s;`"']+/, "")
      .replace(/[/\)\s;`"']+$/, "");
    
    const finalBase = cleanBase.startsWith('http') ? cleanBase : `https://${cleanBase}`;

    // Logic to prevent double /api or handle /api correctly
    if (finalBase.endsWith('/api') && cleanPath.startsWith('/api')) {
      return `${finalBase}${cleanPath.substring(4)}`;
    }
    return `${finalBase}${cleanPath}`;
  }

  // Fallback to relative path
  return cleanPath;
};

export const RegisterPage = () => {
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'password'>('form');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const translateError = (error: string) => {
    if (lang !== 'ar') return error;
    const lower = error.toLowerCase();
    if (lower.includes('no user record')) return 'لا يوجد سجل مستخدم بهذا الرقم.';
    if (lower.includes('already in use')) return 'رقم الجوال أو البريد الإلكتروني مسجل بالفعل.';
    if (lower.includes('invalid-email')) return 'بيانات الدخول غير صحيحة.';
    if (lower.includes('network-request-failed')) return 'فشل في الاتصال بالشبكة.';
    if (lower.includes('otp')) return 'رمز التحقق غير صحيح أو منتهي.';
    return error;
  };

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      // 1. Send OTP via backend
      console.log(`[Register] Sending OTP to ${formData.phone}`);
      const sendOtpUrl = getApiUrl('/api/send-otp');
      const response = await fetch(sendOtpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });

      const data = await response.json();
      if (data.success) {
        setStep('otp');
        setTimer(60); // Start 60s timer
        setStatus({ type: 'success', message: lang === 'ar' ? 'تم إرسال رمز التحقق إلى جوالك' : 'Verification code sent to your phone' });
      } else {
        setStatus({ 
          type: 'error', 
          message: data.error || (lang === 'ar' ? 'فشل إرسال رمز التحقق' : 'Failed to send verification code')
        });
      }
    } catch (err: any) {
      console.error("[OTP Send Error]", err);
      setStatus({ type: 'error', message: t.auth.odooConnectionError });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setStep('password');
      setStatus({ type: 'idle', message: '' });
    } else {
      setStatus({ type: 'error', message: lang === 'ar' ? 'يرجى إدخال رمز صحيح' : 'Please enter a valid code' });
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: t.auth.passwordsDoNotMatch });
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ type: 'error', message: t.auth.passwordTooShort });
      return;
    }

    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const verifyUrl = getApiUrl('/api/verify-otp');
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: formData.phone, 
          otp: otp,
          password: formData.password,
          email: formData.email,
          name: formData.name
        })
      });

      const data = await response.json();
      if (data.success && data.uid) {
        // We no longer sign in automatically. Instead, redirect to login.
        // await signInWithCustomToken(auth, data.customToken);
        
        setStatus({ 
          type: 'success', 
          message: lang === 'ar' 
            ? 'تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول باستخدام رقم جوالك وكلمة المرور.' 
            : 'Account created successfully! Please login with your phone and password.' 
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus({ 
          type: 'error', 
          message: translateError(data.error || (lang === 'ar' ? 'رمز التحقق غير صحيح أو منتهي' : 'Invalid or expired code'))
        });
        // If OTP fails, maybe go back to OTP step
        if (data.error?.includes('رمز') || data.error?.includes('كود') || data.error?.includes('OTP')) {
          setStep('otp');
        }
      }
    } catch (err: any) {
      console.error("[OTP Verify Error]", err);
      setStatus({ type: 'error', message: lang === 'ar' ? 'فشل التحقق من الرمز' : 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    handleGoToPassword(e);
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center py-12 px-6" dir={lang === 'ar' ? "rtl" : "ltr"}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
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
          <h2 className="text-3xl font-serif text-brand-navy mb-3">{t.auth.register}</h2>
          <p className="text-gray-400 text-sm font-medium">{t.auth.odooRestricted}</p>
        </div>

        {status.message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 rounded-2xl flex items-center gap-3 text-sm ${
              status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{status.message}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.form 
              key="register-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRegister} 
              className="grid md:grid-cols-2 gap-6 relative"
            >
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
                  {t.auth.phone}
                </label>
                <div className="relative">
                  <Phone className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-center text-xl"
                    placeholder="05XXXXXXXX"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full md:col-span-2 bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 text-center"
              >
                {loading ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : t.auth.registerBtn}
              </button>
            </motion.form>
          ) : step === 'otp' ? (
            <motion.form 
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOTP} 
              className="space-y-6 relative"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
                  {lang === 'ar' ? 'رمز التحقق' : 'Verification Code'}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pe-12 ps-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-center text-2xl tracking-[0.5em]"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  {lang === 'ar' ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى ' : 'Enter the 6-digit code sent to '}
                  <span className="text-brand-navy font-bold">{formData.phone}</span>
                </p>
                <div className="text-center mt-4">
                  <button
                    type="button"
                    disabled={loading || timer > 0}
                    onClick={handleRegister}
                    className="text-[10px] font-bold text-brand-orange uppercase tracking-widest hover:underline disabled:text-gray-300 disabled:no-underline"
                  >
                    {timer > 0 
                      ? (lang === 'ar' ? `إعادة الإرسال خلال ${timer} ثانية` : `Resend in ${timer}s`)
                      : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Code')
                    }
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 text-center"
              >
                {loading ? (lang === 'ar' ? 'جاري التحقق...' : 'Verifying...') : (lang === 'ar' ? 'تأكيد الرمز' : 'Verify Code')}
              </button>

              <button 
                type="button"
                onClick={() => setStep('form')}
                className="w-full text-gray-400 text-[10px] font-bold tracking-widest uppercase hover:text-brand-orange transition-colors"
              >
                {lang === 'ar' ? 'العودة لتعديل البيانات' : 'Back to Edit Details'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="password-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleFinalSubmit} 
              className="space-y-6 relative"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pe-12 ps-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-start"
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

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ms-1">
                  {t.auth.confirmPassword}
                </label>
                <div className="relative">
                  <Lock className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pe-12 ps-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy text-start"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-orange transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 text-center"
              >
                {loading ? (lang === 'ar' ? 'جاري التسجيل...' : 'Registering...') : (lang === 'ar' ? 'إكمال التسجيل ودخول الموقع' : 'Complete Registration')}
              </button>

              <button 
                type="button"
                onClick={() => setStep('otp')}
                className="w-full text-gray-400 text-[10px] font-bold tracking-widest uppercase hover:text-brand-orange transition-colors"
              >
                {lang === 'ar' ? 'العودة لإدخال الرمز' : 'Back to OTP'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-xs font-medium mb-4">{t.auth.hasAccount}</p>
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-brand-orange font-bold text-[11px] tracking-widest uppercase hover:text-brand-orange-hover transition-colors"
          >
            <span>{t.auth.login}</span>
            <ChevronLeft size={16} className={lang === 'ar' ? "" : "rotate-180"} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
