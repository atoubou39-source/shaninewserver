import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserPlus, Mail, Phone, Lock, ChevronLeft, AlertCircle, CheckCircle2, Globe, User as UserIcon } from 'lucide-react';
import { translations, Language } from '../translations';

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
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    if (formData.password !== formData.confirmPassword) {
      setStatus({ 
        type: 'error', 
        message: lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match' 
      });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setStatus({ 
        type: 'error', 
        message: lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters' 
      });
      setLoading(false);
      return;
    }

    try {
      // 1. First, check if the customer exists in Odoo
      let odooData = { success: false, customer: null };
      try {
        const odooCheck = await fetch('/api/auth/verify-odoo-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: formData.phone,
            email: formData.email 
          })
        });
        
        const contentType = odooCheck.headers.get("content-type");
        if (odooCheck.ok && contentType && contentType.includes("application/json")) {
          odooData = await odooCheck.json();
        } else {
          const errorText = await odooCheck.text();
          console.error("Odoo check failed or returned HTML:", odooCheck.status, errorText.substring(0, 100));
          throw new Error(lang === 'ar' ? 'نظام التحقق غير متاح حالياً على هذا الرابط.' : 'Verification system not available on this URL.');
        }
      } catch (fetchErr: any) {
        console.error("Fetch error during Odoo check:", fetchErr);
        setStatus({ 
          type: 'error', 
          message: lang === 'ar' ? `فشل الاتصال بنظام التحقق: ${fetchErr.message || 'تأكد من اتصال الإنترنت'}` : `Connection failed: ${fetchErr.message}`
        });
        setLoading(false);
        return;
      }
      
      if (!odooData.success) {
        setStatus({ 
          type: 'error', 
          message: t.auth.odooRestricted 
        });
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      try {
        console.log("Creating user document in Firestore for UID:", user.uid);
        await setDoc(doc(db, 'users', user.uid), {
          facilityName: odooData.customer?.name || formData.name,
          email: formData.email.toLowerCase().trim(),
          phoneNumber: formData.phone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: 'customer',
          odooPartnerId: odooData.customer?.id || null,
          accountActivated: true
        });
        console.log("User document created successfully");
      } catch (firestoreErr: any) {
        console.error("Detailed Firestore Error:", firestoreErr);
        setStatus({ 
          type: 'error', 
          message: lang === 'ar' ? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة لاحقاً.' : 'Error saving data. Please try again later.'
        });
        setLoading(false);
        return;
      }

      setStatus({ 
        type: 'success', 
        message: lang === 'ar' ? 'تم إنشاء الحساب بنجاح! سيتم توجيهك الآن...' : 'Account created successfully! Redirecting...' 
      });
      setTimeout(() => navigate('/'), 2000);

    } catch (err: any) {
      console.error(err);
      let message = lang === 'ar' ? "فشل إنشاء الحساب. يرجى التأكد من البيانات." : "Registration failed. Please check your data.";
      if (err.code === 'auth/email-already-in-use') {
        message = lang === 'ar' ? "البريد الإلكتروني مسجل بالفعل." : "Email already in use.";
      } else if (err.code === 'auth/invalid-email') {
        message = lang === 'ar' ? "البريد الإلكتروني غير صالح." : "Invalid email.";
      }
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
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
          className="absolute top-6 left-6 flex items-center space-x-2 space-x-reverse text-brand-navy hover:text-brand-orange transition-colors z-10"
        >
          <Globe size={20} />
          <span className="text-[10px] font-bold tracking-widest">{lang === 'en' ? 'AR' : 'EN'}</span>
        </button>

        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full -mr-16 -mt-16" />
        
        <div className="text-center mb-10 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-navy/5 rounded-3xl mb-6">
            <UserPlus className="text-brand-navy" size={32} />
          </div>
          <h2 className="text-3xl font-serif text-brand-navy mb-3">{t.auth.register}</h2>
          <p className="text-gray-400 text-sm font-medium">{t.auth.odooRestricted}</p>
        </div>

        {status.message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 rounded-2xl flex items-center space-x-3 space-x-reverse text-sm ${
              status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span>{status.message}</span>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-6 relative">
          <div className="space-y-2 md:col-span-2">
            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest block ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>
              {t.auth.name}
            </label>
            <div className="relative">
              <UserIcon className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
              <input 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy`}
                placeholder={lang === 'ar' ? "الاسم كما هو مسجل في اودو" : "Name as registered in Odoo"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest block ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>
              {t.auth.email}
            </label>
            <div className="relative">
              <Mail className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
              <input 
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy`}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest block ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>
              {t.auth.phone}
            </label>
            <div className="relative">
              <Phone className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
              <input 
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy`}
                placeholder="966XXXXXXXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest block ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>
              {t.auth.password}
            </label>
            <div className="relative">
              <Lock className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
              <input 
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest block ${lang === 'ar' ? 'mr-1' : 'ml-1'}`}>
              {t.auth.confirmPassword}
            </label>
            <div className="relative">
              <Lock className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
              <input 
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-brand-navy`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full md:col-span-2 bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (lang === 'ar' ? 'جاري إنشاء الحساب...' : 'CREATING ACCOUNT...') : t.auth.registerBtn}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-xs font-medium mb-4">{t.auth.hasAccount}</p>
          <Link 
            to="/login" 
            className="inline-flex items-center space-x-2 space-x-reverse text-brand-orange font-bold text-[11px] tracking-widest uppercase hover:text-brand-orange-hover transition-colors"
          >
            <span>{t.auth.login}</span>
            <ChevronLeft size={16} className={lang === 'ar' ? "" : "rotate-180"} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};