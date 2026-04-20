import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { Clock, LogOut, MessageSquare, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations, Language } from '../translations';

export const PendingActivation = () => {
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

  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6" dir={lang === 'ar' ? "rtl" : "ltr"}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 md:p-12 shadow-2xl text-center relative overflow-hidden"
      >
        <button 
          onClick={toggleLang}
          className="absolute top-6 left-6 flex items-center space-x-2 space-x-reverse text-brand-navy hover:text-brand-orange transition-colors z-10"
        >
          <Globe size={20} />
          <span className="text-[10px] font-bold tracking-widest">{lang === 'en' ? 'AR' : 'EN'}</span>
        </button>

        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-orange/5 rounded-full -ml-16 -mt-16" />
        
        <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-orange/10 rounded-full mb-8 relative">
          <Clock className="text-brand-orange" size={48} />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-brand-orange/20 border-t-brand-orange rounded-full"
          />
        </div>

        <h2 className="text-3xl font-serif text-brand-navy mb-4">{t.pending.title}</h2>
        
        <p className="text-gray-500 mb-10 leading-relaxed">
          {t.pending.description}
        </p>

        <div className="space-y-4">
          <button 
            className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] shadow-xl shadow-brand-navy/10 hover:bg-brand-orange transition-all duration-300 flex items-center justify-center space-x-3 space-x-reverse"
          >
            <MessageSquare size={18} />
            <span>{t.pending.supportBtn}</span>
          </button>

          <button 
            onClick={handleSignOut}
            className="w-full border-2 border-brand-navy/10 text-brand-navy/60 py-5 rounded-2xl text-[11px] font-bold tracking-[0.2em] hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-3 space-x-reverse"
          >
            <LogOut size={18} />
            <span>{t.pending.logoutBtn}</span>
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-50">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-loose">
            Chef Shani's Flavor Lab <br />
            Premium Sri Lankan Selection
          </p>
        </div>
      </motion.div>
    </div>
  );
};
