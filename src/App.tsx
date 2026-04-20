/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Menu, 
  X, 
  Star, 
  Check, 
  Facebook, 
  Instagram, 
  Youtube,
  ChevronRight,
  ArrowRight,
  MousePointer2,
  Truck,
  ShieldCheck,
  Leaf,
  CreditCard,
  Award,
  LayoutDashboard,
  Package,
  Search,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  Globe,
  Eye,
  LogOut,
  Database,
  Lock,
  Mail,
  Key,
  Building2,
  Minus,
  User as UserIcon,
  Phone,
  Users,
  RefreshCw,
  ArrowUpCircle
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc, 
  setDoc, 
  getDoc,
  query,
  orderBy,
  where,
  or
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendPasswordResetEmail,
  signOut, 
  User 
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PendingActivation } from "./pages/PendingActivation";
import { CustomerSyncDashboard } from "./components/admin/CustomerSyncDashboard";
import { useAuth } from "./hooks/useAuth";

import { translations, Language } from "./translations";

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  firebaseId?: string;
  isOdoo?: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  firebaseId: string;
  userId?: string | null;
  customerName: string;
  email: string;
  phone1: string;
  phone2?: string;
  address: string;
  city: string;
  district: string;
  paymentMethod: 'cod' | 'bank_transfer';
  items: {
    id: number;
    name: string;
    price: string;
    quantity: number;
    isOdoo?: boolean;
  }[];
  total: number;
  status: string;
  createdAt: string;
  odooOrderName?: string;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  image?: string;
  code?: string;
  active: boolean;
}

interface SEOData {
  title: string;
  description: string;
  keywords: string;
}

interface SiteSettings {
  seo: {
    home: SEOData;
    collection: SEOData;
    about: SEOData;
  };
  products: Product[];
}

// --- Initial Data ---

const INITIAL_PRODUCTS: Product[] = [
  {
    "id": 23,
    "name": "Acoustic Bloc Screens",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 295",
    "image": "https://picsum.photos/seed/23/400/400",
    "isOdoo": true
  },
  {
    "id": 37,
    "name": "Booking Fees",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 50",
    "image": "https://picsum.photos/seed/37/400/400",
    "isOdoo": true
  },
  {
    "id": 15,
    "name": "Cabinet with Doors",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 140",
    "image": "https://picsum.photos/seed/15/400/400",
    "isOdoo": true
  },
  {
    "id": 50,
    "name": "Cable Management Box",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 120",
    "image": "https://picsum.photos/seed/50/400/400",
    "isOdoo": true
  },
  {
    "id": 49,
    "name": "Cable Management Box",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 100",
    "image": "https://picsum.photos/seed/49/400/400",
    "isOdoo": true
  },
  {
    "id": 36,
    "name": "Chair floor protection",
    "description": "Office chairs can harm your floor: protect it.",
    "price": "SAR 12",
    "image": "https://picsum.photos/seed/36/400/400",
    "isOdoo": true
  },
  {
    "id": 16,
    "name": "Conference Chair",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 33",
    "image": "https://picsum.photos/seed/16/400/400",
    "isOdoo": true
  },
  {
    "id": 18,
    "name": "Corner Desk Left Sit",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 85",
    "image": "https://picsum.photos/seed/18/400/400",
    "isOdoo": true
  },
  {
    "id": 10,
    "name": "Corner Desk Right Sit",
    "description": "Premium Sri Lankan Selection.",
    "price": "SAR 147",
    "image": "https://picsum.photos/seed/10/400/400",
    "isOdoo": true
  },
  {
    "id": 9,
    "name": "Customizable Desk",
    "description": "160x80cm, with large legs.",
    "price": "SAR 750",
    "image": "https://picsum.photos/seed/9/400/400",
    "isOdoo": true
  }
];

const INITIAL_SEO: SiteSettings["seo"] = {
  home: {
    title: "شاني فليفر لاب | اختيار متميز",
    description: "اكتشف منتجات عالية الجودة يتم توصيلها في جميع أنحاء المملكة العربية السعودية.",
    keywords: "منتجات، عضوي، زعفران، نكهات متميزة",
  },
  collection: {
    title: "مجموعتنا | شاني فليفر لاب",
    description: "استكشف مجموعتنا المتميزة من خلطات التوابل، من مزيج البرياني الملكي إلى مزيج نار الجزيرة.",
    keywords: "مجموعة توابل، شراء توابل عبر الإنترنت، توابل سريلانكية",
  },
  about: {
    title: "من نحن | شاني فليفر لاب",
    description: "تعرف على رحلة الشيف شاني والتزامنا بالحرفية الطهوية السريلانكية الأصيلة.",
    keywords: "شيف شاني، فنان طهي، حرفة التوابل",
  }
};

// --- Helpers ---

const getStatusDetails = (status: string) => {
  switch (status) {
    case 'pending_approval': 
      return { label: 'قيد المعالجة', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'approved': 
      return { label: 'تم الموافقة', color: 'bg-green-100 text-green-700 border-green-200' };
    case 'rejected': 
      return { label: 'تم الرفض', color: 'bg-red-100 text-red-700 border-red-200' };
    case 'completed': 
      return { label: 'مكتمل', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'pending_payment':
      return { label: 'في انتظار الدفع', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    default: 
      return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

const getApiUrl = (path: string) => {
  const base = (import.meta as any).env?.VITE_API_BASE_URL?.trim();
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
};



// --- Components ---

// --- Components ---

const OffersPopup = ({ 
  isOpen, 
  onClose, 
  offer 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  offer: Offer | null 
}) => {
  if (!isOpen || !offer) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative max-w-lg w-full bg-white rounded-[3rem] overflow-hidden shadow-2xl"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/40 text-brand-navy rounded-full transition-all z-10"
          >
            <X size={20} />
          </button>

          {offer.image && (
            <div className="h-64 overflow-hidden">
              <img 
                src={offer.image} 
                alt={offer.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="p-10 text-center">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange text-[10px] font-bold tracking-[0.2em] uppercase rounded-full mb-6">
              Exclusive Offer
            </div>
            <h2 className="text-3xl font-serif text-brand-navy mb-4">{offer.title}</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {offer.description}
            </p>

            {offer.code && (
              <div className="bg-gray-50 border-2 border-dashed border-brand-orange/30 p-4 rounded-2xl mb-8">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest block mb-1">Use Code</span>
                <span className="text-2xl font-mono font-bold text-brand-navy tracking-[0.2em]">{offer.code}</span>
              </div>
            )}

            <button 
              onClick={onClose}
              className="w-full bg-brand-orange text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange-hover transition-all shadow-xl shadow-brand-orange/20"
            >
              CLAIM OFFER NOW
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Navbar = ({ 
  cartCount, 
  onOpenCart, 
  onOpenAuth,
  user,
  userRole,
  lang,
  onToggleLang,
  t
}: { 
  cartCount: number, 
  onOpenCart: () => void, 
  onOpenAuth: () => void, 
  user: User | null,
  userRole: string | null,
  lang: Language,
  onToggleLang: () => void,
  t: any
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t.nav.home, href: "#" },
    { name: t.nav.collection, href: "#collection" },
    { name: t.nav.about, href: "#about" },
    { name: t.nav.chef, href: "#chef" },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm py-4 shadow-sm border-b border-brand-navy/5" : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center space-x-3 space-x-reverse group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-navy rounded-2xl flex items-center justify-center text-white transform group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-brand-navy/10">
              <Leaf size={24} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className={`absolute -bottom-1 ${lang === 'ar' ? '-left-1' : '-right-1'} w-4 h-4 md:w-5 md:h-5 bg-brand-orange rounded-lg flex items-center justify-center text-white border-2 border-white`}>
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-brand-navy font-serif font-bold text-lg md:text-xl leading-none tracking-tight">SHANI'S</span>
            <span className="text-brand-orange text-[7px] md:text-[9px] font-bold tracking-[0.4em] uppercase mt-1">Flavor Lab</span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-10 space-x-reverse">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className={`${isScrolled || mobileMenuOpen ? 'text-brand-navy' : 'text-brand-navy/80'} text-[10px] tracking-[0.2em] font-bold hover:text-brand-orange transition-colors`}
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex items-center space-x-6 space-x-reverse">
          <button 
            onClick={onToggleLang}
            className="flex items-center space-x-2 space-x-reverse text-brand-navy hover:text-brand-orange transition-colors"
          >
            <Globe size={20} />
            <span className="text-[10px] font-bold tracking-widest">{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>
          <Link 
            to="/login"
            className="text-brand-navy hover:text-brand-orange transition-colors p-2"
          >
            <UserIcon size={22} />
          </Link>
          <button 
            onClick={onOpenCart}
            className="text-brand-navy hover:text-brand-orange transition-colors relative p-2"
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className={`absolute top-0 ${lang === 'ar' ? 'left-0' : 'right-0'} bg-brand-orange text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white`}>
                {cartCount}
              </span>
            )}
          </button>
          <button className="text-brand-navy md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          {user && (
            <Link 
              to={userRole === 'admin' ? "/admin" : "/dashboard"} 
              className="hidden md:flex items-center space-x-2 space-x-reverse text-brand-navy/60 hover:text-brand-navy transition-colors text-[10px] tracking-widest font-bold border border-brand-navy/10 px-4 py-2 rounded-full"
            >
              <LayoutDashboard size={14} />
              <span>{userRole === 'admin' ? t.nav.admin : t.nav.dashboard}</span>
            </Link>
          )}
          {!user && (
            <Link 
              to="/login" 
              className="hidden md:flex items-center space-x-2 space-x-reverse text-brand-navy/60 hover:text-brand-navy transition-colors text-[10px] tracking-widest font-bold border border-brand-navy/10 px-4 py-2 rounded-full"
            >
              <LayoutDashboard size={14} />
              <span>{t.nav.admin}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center space-y-8"
          >
            <button 
              className="absolute top-6 right-6 text-brand-navy" 
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={32} />
            </button>
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-brand-navy text-2xl font-serif tracking-widest"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ t }: { t: any }) => {
  return (
    <section className="relative min-h-screen bg-white flex items-center pt-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-orange rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center relative z-10 text-center md:text-left">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center md:items-start"
        >
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="h-[1px] w-12 bg-brand-orange" />
            <span className="text-brand-orange text-[10px] tracking-[0.4em] uppercase font-bold">
              {t.hero.subtitle}
            </span>
          </div>
          
          <h1 className="text-brand-navy text-5xl md:text-8xl font-serif leading-tight mb-8">
            {t.hero.titleMain} <br />
            {t.hero.titleSub}<span className="text-brand-orange italic">{t.hero.titleItalic}</span>
          </h1>
          
          <p className="text-brand-slate text-base md:text-lg max-w-md mb-10 leading-relaxed font-medium">
            {t.hero.description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 space-x-reverse w-full md:w-auto">
            <button 
              onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto bg-brand-orange hover:bg-brand-orange-hover text-white px-10 py-5 text-[10px] tracking-[0.2em] font-bold transition-all shadow-xl shadow-brand-orange/20"
            >
              {t.hero.exploreBtn}
            </button>
            <button 
              onClick={() => document.getElementById('chef')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto border border-brand-navy/10 hover:border-brand-navy/30 text-brand-navy px-10 py-5 text-[10px] tracking-[0.2em] font-bold transition-all"
            >
              {t.hero.meetChefBtn}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative mt-16 md:mt-0"
        >
          <div className="absolute inset-0 bg-brand-orange/5 rounded-full blur-[80px]" />
          <img 
            src="https://i.postimg.cc/rshF2439/6.png" 
            alt="Spice Collection Banner" 
            className="w-full h-auto object-contain relative z-10"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2">
        <div className="w-[1px] h-12 bg-brand-navy/10 relative">
          <motion.div 
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-orange rounded-full"
          />
        </div>
        <span className="text-brand-navy/20 text-[8px] tracking-[0.3em] uppercase font-bold">{t.hero.scroll}</span>
      </div>
    </section>
  );
};

const FeaturesBar = ({ t }: { t: any }) => {
  const features = [
    { icon: <Award size={16} />, text: t.features.premium },
    { icon: <ShieldCheck size={16} />, text: t.features.crafted },
    { icon: <Truck size={16} />, text: t.features.delivery },
    { icon: <CreditCard size={16} />, text: t.features.cod },
    { icon: <Leaf size={16} />, text: t.features.natural },
  ];

  return (
    <div className="bg-white border-y border-brand-navy/5 py-6 overflow-hidden relative z-10">
      <motion.div 
        animate={{ x: [0, -1200] }}
        transition={{ 
          duration: 30, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="flex whitespace-nowrap"
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center">
            {features.map((f, index) => (
              <div key={index} className="flex items-center mx-8 text-brand-slate">
                <span className="text-brand-orange mr-3 opacity-80">{f.icon}</span>
                <span className="text-[10px] tracking-[0.2em] font-bold uppercase">{f.text}</span>
                <div className="w-1.5 h-1.5 bg-brand-orange/10 rounded-full ml-12" />
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const Products = ({ 
  products, 
  onOrder,
  onViewProduct,
  user,
  userRole,
  onOpenAuth,
  t
}: { 
  products: Product[], 
  onOrder: (p: Product) => void,
  onViewProduct: (p: Product) => void,
  user: User | null,
  userRole: string | null,
  onOpenAuth: () => void,
  t: any
}) => {
  const [showAll, setShowAll] = useState(true);
  const visibleProducts = showAll ? products : products.slice(0, 6);

  return (
    <section id="collection" className="py-24 bg-brand-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <div className="h-[1px] w-8 bg-brand-orange" />
            <span className="text-brand-orange text-[10px] tracking-[0.3em] uppercase font-bold">{t.products.titlePrefix}</span>
          </div>
          <h2 className="text-brand-navy text-5xl font-serif mb-4">{t.products.title}</h2>
          <p className="text-brand-navy/60 text-sm italic">
            {t.products.description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <AnimatePresence mode="popLayout">
            {products.length === 0 ? (
              <div className="md:col-span-3 py-20 text-center space-y-4">
                <Package size={48} className="mx-auto text-gray-200" />
                <h3 className="text-xl font-serif text-brand-navy">
                  {t.products.noProducts}
                </h3>
                <p className="text-gray-400 text-sm">
                  {t.products.syncReminder}
                </p>
                {userRole === 'admin' && (
                  <Link 
                    to="/admin/odoo" 
                    className="inline-flex items-center space-x-2 space-x-reverse bg-brand-orange text-white px-6 py-3 rounded-xl text-[10px] font-bold tracking-widest hover:bg-brand-orange-hover transition-all shadow-lg shadow-brand-orange/20"
                  >
                    <RefreshCw size={14} />
                    <span>SYNC FROM ODOO NOW</span>
                  </Link>
                )}
              </div>
            ) : (
              visibleProducts.map((p) => (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -8, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
                  onClick={() => onViewProduct(p)}
                  className="bg-white p-5 rounded-3xl shadow-md transition-all group border border-white hover:border-brand-orange/20 cursor-pointer flex flex-col h-full"
                >
                  <div className="aspect-square mb-6 overflow-hidden rounded-2xl bg-[#f3f3f3] relative">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white text-brand-navy p-4 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Eye size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="px-1 text-left flex flex-col flex-1">
                    <h3 className="text-brand-navy font-serif text-lg font-bold mb-1 leading-tight h-12 line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-gray-500 text-xs mb-4 line-clamp-2 h-8">
                      {p.description}
                    </p>
                    
                    <div className="mt-auto">
                      {user ? (
                        <>
                          <p className="text-brand-orange font-serif font-bold text-lg mb-6">
                            {t.products.pricePrefix}{p.price.replace(/[^\d.]/g, '')}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrder(p);
                            }}
                            className="w-full bg-[#0f172a] text-white py-4 rounded-xl text-[11px] tracking-[0.1em] font-bold flex items-center justify-center space-x-2 space-x-reverse hover:bg-brand-orange transition-all duration-300"
                          >
                            <ShoppingBag size={16} />
                            <span>{t.products.addToCart}</span>
                          </button>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            {t.products.loginMessage}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAuth();
                            }}
                            className="w-full border-2 border-brand-navy text-brand-navy py-4 rounded-xl text-[11px] tracking-[0.1em] font-bold flex items-center justify-center space-x-2 space-x-reverse hover:bg-brand-navy hover:text-white transition-all duration-300"
                          >
                            <Lock size={16} />
                            <span>{t.products.loginToOrder}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {products.length > 6 && (
          <div className="flex justify-center">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="bg-brand-navy text-white px-10 py-4 text-[10px] tracking-[0.3em] font-bold flex items-center space-x-3 space-x-reverse hover:bg-brand-orange transition-all"
            >
              <span>{showAll ? t.products.showLess : t.products.showMore}</span>
              <ChevronRight size={16} className={`transform transition-transform ${showAll ? "rotate-90" : "-rotate-90"}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

// --- Dashboard Components ---

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const isAdminEmail = userCredential.user.email === "atoubou39@gmail.com";
      
      if (isAdminEmail || (userDoc.exists() && userDoc.data().role === 'admin')) {
        navigate("/admin");
      } else {
        setError("Access restricted to administrators.");
        await auth.signOut();
      }
    } catch (err: any) {
      setError("Invalid admin credentials. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      setError("Failed to send reset email. Check if email is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange/10 rounded-2xl mb-6">
            <Lock className="text-brand-orange" size={32} />
          </div>
          <h2 className="text-3xl font-serif text-brand-navy mb-2">Admin Access</h2>
          <p className="text-gray-400 text-sm">Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center">
              <Mail size={14} className="mr-2" />
              Admin Email
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-400 uppercase flex items-center">
                <Key size={14} className="mr-2" />
                Secret Key
              </label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-bold text-brand-orange hover:underline focus:outline-none"
              >
                Forgot?
              </button>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs font-medium bg-red-50 p-3 rounded-lg text-center"
            >
              {error}
            </motion.p>
          )}

          {resetSent && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-emerald-500 text-xs font-medium bg-emerald-50 p-3 rounded-lg text-center"
            >
              Password reset link sent to your email!
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-navy text-white py-4 rounded-xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all disabled:opacity-50"
          >
            {loading ? "VERIFYING ACCESS..." : "AUTHORIZE ACCESS"}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link to="/" className="text-brand-orange text-[10px] tracking-[0.2em] font-bold uppercase hover:underline">
            Back to Website
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const CustomerLoginPage = () => {
  const [step, setStep] = useState<'login' | 'phone' | 'otp' | 'set-password'>('login');
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempUid, setTempUid] = useState("");
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Clean identifier (remove spaces)
      const cleanIdentifier = identifier.trim();
      const email = cleanIdentifier.includes("@") ? cleanIdentifier : `${cleanIdentifier}@customer.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid username or password. Please try again.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (data.success) {
        setStep('otp');
        if (data.testCode) {
          setTestCode(data.testCode);
        }
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();
      if (data.success && data.uid) {
        setTempUid(data.uid);
        setStep('set-password');
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: tempUid, password: newPassword }),
      });
      const data = await response.json();
      if (data.success && data.customToken) {
        if (data.isMockAuth) {
          console.warn("MOCK AUTH: Login simulated. Firebase Identity Toolkit API is disabled.");
          // In mock mode, we just navigate to dashboard and let the app handle the "no user" state
          // or we can show a success message.
          navigate("/dashboard");
        } else {
          await signInWithCustomToken(auth, data.customToken);
          navigate("/dashboard");
        }
      } else {
        setError(data.error || "Failed to set password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon size={40} className="text-brand-orange" />
          </div>
          <h2 className="text-2xl font-serif text-brand-navy mb-2">My Account</h2>
          <p className="text-gray-500 text-sm mb-8">{user.email || user.phoneNumber}</p>
          
          <div className="space-y-4">
            <Link 
              to="/"
              className="w-full bg-brand-navy text-white py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center space-x-2"
            >
              <span>BACK TO SHOPPING</span>
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="w-full bg-red-50 text-red-500 py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
            >
              <LogOut size={16} />
              <span>LOGOUT</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-6 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-orange/10 rounded-3xl mb-6">
            {step === 'login' ? <UserIcon className="text-brand-orange" size={40} /> : 
             step === 'phone' ? <Phone className="text-brand-orange" size={40} /> :
             step === 'otp' ? <Key className="text-brand-orange" size={40} /> :
             <Lock className="text-brand-orange" size={40} />}
          </div>
          <h2 className="text-3xl font-serif text-brand-navy mb-2">
            {step === 'login' ? 'Customer Login' : 
             step === 'phone' ? 'تفعيل حساب عملاء اودو' :
             step === 'otp' ? 'Verify Code' :
             'Set New Password'}
          </h2>
          <p className="text-gray-400 text-sm">
            {step === 'login' ? 'Please enter your credentials to access your account' :
             step === 'phone' ? 'خاص بعملاء المتجر الحاليين: أدخل رقم الجوال المسجل في نظام اودو لتفعيل حسابك.' :
             step === 'otp' ? `Code sent to ${phone}` :
             'Create a strong password for your account'}
          </p>
        </div>

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <UserIcon size={12} className="mr-2" />
                Username or Email
              </label>
              <input 
                type="text" 
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Lock size={12} className="mr-2" />
                Password
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-[10px] font-bold bg-red-50 p-4 rounded-xl text-center uppercase tracking-wider"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all disabled:opacity-50 shadow-xl shadow-brand-navy/10"
            >
              {loading ? "Verifying..." : "Login"}
            </button>

            <button 
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-brand-orange text-[10px] font-bold tracking-widest uppercase hover:underline"
            >
              Don't have an account or joining for the first time?
            </button>
            <div className="bg-orange-50 p-4 rounded-xl">
              <p className="text-[9px] text-brand-orange font-bold uppercase tracking-wider text-center">
                Note: Registration is only open for existing Odoo customers.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button 
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await signInWithEmailAndPassword(auth, "966500000000@customer.com", "password123");
                    navigate("/dashboard");
                  } catch (e) {
                    setError("Demo account login failed. Please ensure Firebase is ready.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full text-gray-400 text-[9px] font-bold tracking-[0.2em] uppercase hover:text-brand-navy transition-colors"
              >
                Use Demo Account (For Testing)
              </button>
            </div>
          </form>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Phone size={12} className="mr-2" />
                Phone Number
              </label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all text-lg"
                placeholder="966XXXXXXXXX"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
            <button type="button" onClick={() => setStep('login')} className="w-full text-gray-400 text-[10px] font-bold uppercase">
              Back to Login
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Key size={12} className="mr-2" />
                Verification Code
              </label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all text-center text-2xl tracking-[0.5em] font-bold"
                placeholder="000000"
              />
            </div>
            {testCode && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider text-center">
                  Test Mode: Your code is {testCode}
                </p>
                {testCode === '123456' && (
                  <p className="text-[8px] text-blue-400 text-center mt-1">
                    (Identity Toolkit API is disabled - using Mock Auth)
                  </p>
                )}
              </div>
            )}
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>
          </form>
        )}

        {step === 'set-password' && (
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">New Password</label>
              <input 
                type="password" 
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Confirm Password</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
            >
              {loading ? "Saving..." : "Save Password & Login"}
            </button>
          </form>
        )}

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <Link to="/" className="text-brand-orange text-[10px] tracking-[0.2em] font-bold uppercase hover:underline">
            ← Back to Store
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const AuthModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean, 
  onClose: () => void 
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const email = identifier.includes("@") ? identifier : `${identifier}@customer.com`;
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid username or password.");
      } else {
        setError("Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-navy transition-colors"
        >
          <X size={24} />
        </button>

        {user ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon size={40} className="text-brand-orange" />
            </div>
            <h2 className="text-2xl font-serif text-brand-navy mb-2">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-8">{user.email || user.phoneNumber}</p>
            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-500 py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
            >
              <LogOut size={16} />
              <span>LOGOUT</span>
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange/10 rounded-2xl mb-6">
                <Lock className="text-brand-orange" size={32} />
              </div>
              <h2 className="text-3xl font-serif text-brand-navy mb-2">Login</h2>
              <p className="text-gray-400 text-sm">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <UserIcon size={12} className="mr-2" />
                  Username or Email
                </label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                  placeholder="Username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Key size={12} className="mr-2" />
                  Password
                </label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-[10px] font-bold text-center uppercase tracking-wider"
                >
                  {error}
                </motion.p>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy text-white py-4 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Login"}
              </button>

              <div className="text-center">
                <Link 
                  to="/auth" 
                  onClick={onClose}
                  className="text-brand-orange text-[10px] font-bold tracking-widest uppercase hover:underline"
                >
                  First time? Or forgot password?
                </Link>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

const CartDrawer = ({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onCheckout,
  t
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  items: CartItem[], 
  onUpdateQuantity: (id: number, delta: number) => void, 
  onRemove: (id: number) => void,
  onCheckout: () => void,
  t: any
}) => {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
    return sum + (price * item.quantity);
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-brand-navy text-white flex justify-between items-center">
              <div className="flex items-center space-x-3 space-x-reverse">
                <ShoppingBag size={20} className="text-brand-orange" />
                <h2 className="text-xl font-serif font-bold tracking-tight">{t.cart.title}</h2>
                <span className="bg-brand-orange text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {items.length} {t.cart.items}
                </span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                    <ShoppingBag size={32} className="text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-medium">{t.cart.empty}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex space-x-4 space-x-reverse group">
                      <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-brand-navy font-bold text-sm truncate pr-4">{item.name}</h3>
                          <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-gray-400 text-[10px] mb-3">{t.products.pricePrefix}{item.price.replace(/[^\d,.]/g, '')} {t.products.priceSuffix || ''}</p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center border border-gray-100 rounded-lg overflow-hidden">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-1.5 hover:bg-gray-50 text-gray-400 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-brand-navy">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-1.5 hover:bg-gray-50 text-gray-400 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-brand-orange font-bold text-sm">{t.products.pricePrefix}{item.price.replace(/[^\d.]/g, '')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-8 border-t border-gray-50 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] tracking-[0.2em] font-bold text-gray-400 uppercase">{t.cart.subtotal}</span>
                  <div className="text-right">
                    <span className="block text-brand-orange text-2xl font-serif font-bold">{t.products.pricePrefix}{total.toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={onCheckout}
                  className="w-full bg-brand-orange text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold flex items-center justify-center space-x-3 space-x-reverse hover:bg-brand-orange-hover transition-all shadow-lg shadow-brand-orange/20"
                >
                  <span>{t.cart.checkout}</span>
                  <ArrowRight size={16} />
                </button>
                <button onClick={onClose} className="w-full text-gray-400 text-[10px] font-bold tracking-[0.1em] uppercase hover:text-brand-navy transition-colors">
                  ← {t.hero.scroll}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CheckoutModal = ({ isOpen, onClose, items, onClearCart, user, setModalContent }: { isOpen: boolean, onClose: () => void, items: CartItem[], onClearCart: () => void, user: User | null, setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone1: "",
    phone2: "",
    address: "",
    city: "",
    district: "",
    paymentMethod: "cod" as "cod" | "bank_transfer",
    agreed: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch user profile data if logged in
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              customerName: data.facilityName || user.displayName || "",
              phone1: data.phoneNumber || user.phoneNumber || "",
              address: data.address || "",
              email: data.email || user.email || ""
            }));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      };
      fetchProfile();
    }
  }, [user]);

  if (items.length === 0 && !isSuccess) return null;

  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
    return sum + (price * item.quantity);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      setModalContent({
        title: "Alert",
        message: "Please agree to the terms and conditions.",
        type: 'error'
      });
      return;
    }
    
    if (!formData.customerName || !formData.email || !formData.phone1 || !formData.address) {
      setModalContent({
        title: "تنبيه",
        message: "يرجى ملء جميع الحقول المطلوبة (الاسم، البريد الإلكتروني، رقم الجوال، والعنوان).",
        type: 'error'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user?.uid || null,
        customerName: formData.customerName,
        email: formData.email,
        phone1: formData.phone1,
        phone2: formData.phone2 || "",
        address: formData.address,
        city: formData.city || "N/A",
        district: formData.district || "N/A",
        paymentMethod: formData.paymentMethod,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isOdoo: item.isOdoo
        })),
        total,
        status: formData.paymentMethod === 'bank_transfer' ? 'pending_payment' : 'pending_approval',
        createdAt: new Date().toISOString()
      };

      console.log("[Firestore] Attempting to save order:", orderData);
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("[Firestore] Order saved successfully. ID:", docRef.id);
      
      // Trigger Odoo Order Creation
      let odooOrderName = "";
      try {
        console.log("Triggering Odoo sync for order:", docRef.id);
        const odooResponse = await fetch(getApiUrl("/api/odoo/orders"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: formData.email,
            customerName: formData.customerName,
            phone: formData.phone1,
            items: orderData.items,
            address: `${formData.address}, ${formData.city}, ${formData.district}`
          })
        });
        
        const odooResult = await odooResponse.json();
        console.log("Odoo sync result:", odooResult);
        
        if (odooResult.success) {
          odooOrderName = odooResult.orderName;
          await updateDoc(docRef, { 
            odooOrderName,
            odooOrderId: odooResult.orderId,
            syncStatus: 'success',
            syncedAt: new Date().toISOString()
          });
          
          setModalContent({
            title: "تم استلام طلبك",
            message: `تم إنشاء الطلب بنجاح برقم: ${odooOrderName}. يمكنك متابعة حالة الطلب من لوحة التحكم.`,
            type: 'success'
          });
        } else {
          console.error("Odoo sync failed with error:", odooResult.error);
          await updateDoc(docRef, { 
            syncStatus: 'failed',
            syncError: odooResult.error
          });
          setModalContent({
            title: "تنبيه مهم",
            message: "تم حفظ الطلب في الموقع ولكن لم يتم إرساله إلى اودو. يرجى التواصل مع الإدارة أو إعادة المحاولة لاحقاً.",
            type: 'error'
          });
        }
      } catch (e: any) {
        console.error("Failed to sync order to Odoo:", e);
        await updateDoc(docRef, { 
          syncStatus: 'failed',
          syncError: e.message
        });
        setModalContent({
          title: "فشل الربط مع اودو",
          message: "تعذر الوصول إلى واجهة اودو من هذا النشر. الطلب محفوظ محلياً فقط حتى يتم ربط خادم API.",
          type: 'error'
        });
      }

      // Trigger email notification
      try {
        console.log("Sending email request to server for order:", docRef.id);
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: docRef.id,
            type: "order_confirmation",
            customerEmail: formData.email,
            customerName: formData.customerName,
            total,
            items: orderData.items
          })
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      setIsSuccess(true);
      onClearCart();
    } catch (error) {
      console.error("CRITICAL: Firestore Save Failed:", error);
      setModalContent({
        title: "خطأ في الطلب",
        message: "حدث خطأ أثناء حفظ الطلب في النظام. يرجى المحاولة لاحقاً.",
        type: 'error'
      });
      handleFirestoreError(error, OperationType.CREATE, "orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-serif text-brand-navy mb-1">
                  {isSuccess ? "Order Placed!" : "Checkout"}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isSuccess 
                    ? "Thank you for your order. We will contact you soon." 
                    : "Review your order and complete your details below."}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="p-8 pt-6 overflow-y-auto custom-scrollbar">
              {isSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                  </div>
                  <h3 className="text-2xl font-serif text-brand-navy mb-4">Order Placed!</h3>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">
                    Your order has been sent and will be reviewed for approval. Our representative will contact you as soon as possible.
                  </p>
                  <button 
                    onClick={onClose}
                    className="bg-brand-navy text-white px-10 py-4 rounded-xl text-[10px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
                  >
                    BACK TO STORE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Order Summary */}
                  <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">Order Summary</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="bg-brand-cream/50 rounded-2xl p-6">
                      <div className="space-y-4 mb-4 pb-4 border-b border-brand-orange/10">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <span className="text-brand-navy font-medium">{item.name}</span>
                            <span className="text-gray-500 text-sm">× {item.quantity} {item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] tracking-[0.2em] font-bold text-brand-navy uppercase">Total Amount</span>
                        <span className="text-2xl font-serif font-bold text-brand-orange">SAR {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Your Details */}
                  <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">Your Details</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">Facility Name *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Enter facility name" 
                          value={formData.customerName}
                          onChange={e => setFormData({...formData, customerName: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">Email Address *</label>
                        <input 
                          required
                          type="email" 
                          placeholder="your@email.com" 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">Phone Number *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="+94 7X XXX XXXX" 
                            value={formData.phone1}
                            onChange={e => setFormData({...formData, phone1: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">Secondary Phone (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="+94 7X XXX XXXX" 
                            value={formData.phone2}
                            onChange={e => setFormData({...formData, phone2: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">Address *</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Street, District, City" 
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">City *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="City" 
                            value={formData.city}
                            onChange={e => setFormData({...formData, city: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ml-1">District *</label>
                          <input 
                            required
                            type="text" 
                            placeholder="District" 
                            value={formData.district}
                            onChange={e => setFormData({...formData, district: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">Payment Method</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, paymentMethod: 'cod'})}
                        className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-xl transition-all ${formData.paymentMethod === 'cod' ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-100 bg-white'}`}
                      >
                        <Truck size={20} className={formData.paymentMethod === 'cod' ? 'text-brand-orange' : 'text-gray-400'} />
                        <span className={`text-xs font-bold ${formData.paymentMethod === 'cod' ? 'text-brand-navy' : 'text-gray-400'}`}>Cash on Delivery</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, paymentMethod: 'bank_transfer'})}
                        className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-xl transition-all ${formData.paymentMethod === 'bank_transfer' ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-100 bg-white'}`}
                      >
                        <Building2 size={20} className={formData.paymentMethod === 'bank_transfer' ? 'text-brand-orange' : 'text-gray-400'} />
                        <span className={`text-xs font-bold ${formData.paymentMethod === 'bank_transfer' ? 'text-brand-navy' : 'text-gray-400'}`}>Bank Deposit</span>
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="mb-8 flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <input 
                      required
                      type="checkbox" 
                      checked={formData.agreed}
                      onChange={e => setFormData({...formData, agreed: e.target.checked})}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" 
                    />
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      I have read and agree to the <span className="text-brand-orange underline">Terms & Conditions</span>, <span className="text-brand-orange underline">Privacy Policy</span>, and <span className="text-brand-orange underline">Refund & Return Policy</span> of Shani's Flavor Lab.
                    </p>
                  </div>

                  {/* Confirm Button */}
                  <button 
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold flex items-center justify-center space-x-3 hover:bg-brand-orange transition-all shadow-lg shadow-brand-navy/10 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="bg-green-500 rounded-full p-0.5">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>CONFIRM ORDER ({formData.paymentMethod === 'cod' ? 'COD' : 'BANK'})</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ProductDetailModal = ({ 
  isOpen, 
  onClose, 
  product, 
  onAddToCart,
  t
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  product: Product | null, 
  onAddToCart: (p: Product) => void,
  t: any
}) => {
  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className={`absolute top-6 ${document.documentElement.dir === 'rtl' ? 'left-6' : 'right-6'} z-10 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-full transition-colors shadow-sm`}
            >
              <X size={24} className="text-brand-navy" />
            </button>

            {/* Image Section */}
            <div className="w-full md:w-1/2 bg-[#f8f8f8] p-8 flex items-center justify-center relative overflow-hidden">
              <motion.img 
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                src={product.image} 
                alt={product.name} 
                className="w-full h-auto object-contain drop-shadow-2xl relative z-10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl" />
            </div>

            {/* Content Section */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
              <div className="mb-8">
                <div className="flex items-center space-x-3 space-x-reverse mb-4">
                  <div className="h-[1px] w-8 bg-brand-orange" />
                  <span className="text-brand-orange text-[10px] tracking-[0.3em] uppercase font-bold">Premium Selection</span>
                </div>
                <h2 className="text-brand-navy text-4xl font-serif font-bold mb-4 leading-tight">
                  {product.name}
                </h2>
                <p className="text-brand-orange font-serif font-bold text-2xl mb-6">
                  {t.products.pricePrefix}{product.price.replace(/[^\d.]/g, '')}
                </p>
                <div className="h-[1px] w-full bg-gray-100 mb-6" />
                <p className="text-brand-navy/70 text-sm leading-relaxed mb-8">
                  {product.description}
                </p>
                
                <div className="space-y-4 mb-10">
                  <div className="flex items-center text-xs text-brand-navy/60">
                    <Check size={16} className={`text-green-500 ${document.documentElement.dir === 'rtl' ? 'ml-3' : 'mr-3'}`} />
                    <span>{t.features.natural}</span>
                  </div>
                  <div className="flex items-center text-xs text-brand-navy/60">
                    <Check size={16} className={`text-green-500 ${document.documentElement.dir === 'rtl' ? 'ml-3' : 'mr-3'}`} />
                    <span>{t.features.crafted}</span>
                  </div>
                  <div className="flex items-center text-xs text-brand-navy/60">
                    <Check size={16} className={`text-green-500 ${document.documentElement.dir === 'rtl' ? 'ml-3' : 'mr-3'}`} />
                    <span>{t.features.premium}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                  className="flex-1 bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold flex items-center justify-center space-x-3 space-x-reverse hover:bg-brand-orange transition-all duration-300 shadow-lg shadow-brand-navy/10"
                >
                  <ShoppingBag size={18} />
                  <span>{t.products.addToCart}</span>
                </button>
              </div>
              
              <p className="text-center mt-6 text-[10px] text-gray-400 uppercase tracking-widest">
                {t.features.delivery}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const TermsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif text-brand-navy font-bold">Terms & Conditions</h2>
                <p className="text-brand-orange text-[10px] tracking-[0.2em] font-bold uppercase mt-1">Shani's Flavor Lab</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="prose prose-sm max-w-none text-brand-navy/80">
                <p className="mb-6 leading-relaxed">
                  Welcome to Shani's Flavor Lab! By using this website and purchasing our products, you agree to the following terms and conditions.
                </p>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">1</span>
                      General
                    </h3>
                    <p className="pl-11">All content on this website is the property of Shani's Flavor Lab.</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">2</span>
                      Orders
                    </h3>
                    <p className="pl-11">Orders are subject to availability and confirmation via email or WhatsApp.</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">3</span>
                      Pricing
                    </h3>
                    <p className="pl-11">All prices are in Saudi Riyal (SAR).</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">4</span>
                      Payment
                    </h3>
                    <p className="pl-11">Accepted methods: bank transfer, online payment, or cash on delivery (COD).</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">5</span>
                      Delivery & Shipping
                    </h3>
                    <p className="pl-11">Delivery is within Saudi Arabia. Times vary by location.</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">6</span>
                      Returns & Refunds
                    </h3>
                    <div className="pl-11 space-y-2">
                      <p>Sales of perishable food products are final.</p>
                      <p>Damaged or incorrect items must be reported within 48 hours.</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">7</span>
                      Allergens
                    </h3>
                    <p className="pl-11">Products may contain nuts, seeds, or other allergens.</p>
                  </section>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">Contact</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">info@shanisflavorlab.com</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">WhatsApp: +94 71 764 7799</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-brand-navy text-white px-10 py-4 rounded-xl text-[10px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
              >
                I UNDERSTAND
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif text-brand-navy font-bold">Privacy Policy</h2>
                <p className="text-brand-orange text-[10px] tracking-[0.2em] font-bold uppercase mt-1">Shani's Flavor Lab</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="prose prose-sm max-w-none text-brand-navy/80">
                <div className="space-y-8">
                  <p className="leading-relaxed">
                    We collect name, phone, address and payment details solely to process and fulfill orders.
                  </p>
                  <p className="leading-relaxed">
                    We do not sell or rent your personal information.
                  </p>
                  <p className="leading-relaxed">
                    Data may be shared with couriers or legal authorities if required.
                  </p>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">Contact</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">info@shanisflavorlab.com</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">WhatsApp: +94 71 764 7799</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-brand-navy text-white px-10 py-4 rounded-xl text-[10px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
              >
                I UNDERSTAND
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const RefundModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif text-brand-navy font-bold">Refund & Return Policy</h2>
                <p className="text-brand-orange text-[10px] tracking-[0.2em] font-bold uppercase mt-1">Shani's Flavor Lab</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="prose prose-sm max-w-none text-brand-navy/80">
                <div className="space-y-8">
                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">1</span>
                      Final Sales
                    </h3>
                    <p className="pl-11">All sales of food products are final.</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">2</span>
                      Reporting Issues
                    </h3>
                    <p className="pl-11">Damaged or incorrect items must be reported within 48 hours of delivery.</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs mr-3">3</span>
                      Verification
                    </h3>
                    <p className="pl-11">Photos may be requested to verify the issue.</p>
                  </section>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">Contact</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">info@shanisflavorlab.com</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">WhatsApp: +94 71 764 7799</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={onClose}
                className="bg-brand-navy text-white px-10 py-4 rounded-xl text-[10px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
              >
                I UNDERSTAND
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Customer Dashboard Components ---

const CustomerDashboardOverview = ({ orders, user }: { orders: Order[], user: User | null }) => {
  // orders is already filtered by userId/email in App.tsx for customers, 
  // but we'll double check here to be safe and handle potential legacy data
  const customerOrders = orders.filter(o => 
    o.userId === user?.uid || 
    o.email?.toLowerCase() === user?.email?.toLowerCase()
  );
  const pendingOrders = customerOrders.filter(o => o.status === 'pending_approval' || o.status === 'pending_payment' || o.status === 'processing');
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">Welcome to your Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of your recent activity and orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
              <ShoppingBag size={24} />
            </div>
            <span className="text-2xl font-serif font-bold text-brand-navy">{customerOrders.length}</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">إجمالي الطلبات</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Package size={24} />
            </div>
            <span className="text-2xl font-serif font-bold text-brand-navy">{pendingOrders.length}</span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">قيد المعالجة</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
              <Check size={24} />
            </div>
            <span className="text-2xl font-serif font-bold text-brand-navy">
              {customerOrders.filter(o => o.status === 'approved' || o.status === 'completed').length}
            </span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">تم الموافقة / مكتمل</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-xl font-serif text-brand-navy font-bold mb-6">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customerOrders.slice(0, 5).map((order) => (
                <tr key={order.firebaseId} className="group">
                  <td className="py-4">
                    <span className="text-[10px] font-mono text-gray-400">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="py-4 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 text-xs font-bold text-brand-navy">SAR {order.total.toLocaleString()}</td>
                  <td>
                    {(() => {
                      const { label, color } = getStatusDetails(order.status);
                      return (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${color}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {customerOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400 italic">No recent orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CustomerShop = ({ products, onAddToCart }: { products: Product[], onAddToCart: (p: Product) => void }) => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">Shop Now</h1>
        <p className="text-gray-500 mt-2">Browse our premium collection and add to your cart.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex flex-col">
            <div className="aspect-square mb-6 overflow-hidden rounded-3xl bg-gray-50">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <h3 className="text-brand-navy font-serif text-lg font-bold mb-2">{p.name}</h3>
            <p className="text-gray-500 text-xs mb-4 line-clamp-2">{p.description}</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-brand-orange font-serif font-bold text-lg">{p.price}</span>
              <button 
                onClick={() => onAddToCart(p)}
                className="bg-brand-navy text-white p-3 rounded-2xl hover:bg-brand-orange transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomerOrders = ({ orders, user }: { orders: Order[], user: User | null }) => {
  const customerOrders = orders.filter(o => 
    o.userId === user?.uid || 
    o.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  useEffect(() => {
    const syncStatuses = async () => {
      for (const order of customerOrders) {
        if (order.odooOrderName && (order.status === 'pending_approval' || order.status === 'processing')) {
          try {
            const safeOdooOrderName = encodeURIComponent(order.odooOrderName);
            const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
            const data = await resp.json();

            if (data.success && data.state) {
              let newStatus = order.status;
              if (['sale', 'done'].includes(data.state)) {
                newStatus = 'approved';
              } else if (data.state === 'cancel') {
                newStatus = 'rejected';
              }

              if (newStatus !== order.status) {
                console.log(`Syncing order ${order.odooOrderName}: Odoo state ${data.state} -> Firestore status ${newStatus}`);
                await updateDoc(doc(db, "orders", order.firebaseId), { status: newStatus });
              }
            }
          } catch (e) {
            console.error("Status sync error:", e);
          }
        }
      }
    };

    if (customerOrders.length === 0) return;

    // Run immediately, then keep polling so status changes in Odoo appear without page refresh.
    syncStatuses();
    const intervalId = setInterval(syncStatuses, 20000);
    return () => clearInterval(intervalId);
  }, [customerOrders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">My Orders</h1>
        <p className="text-gray-500 mt-2">Track your order status and purchase history.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Products</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Odoo ID</th>
              <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customerOrders.map((order) => (
              <tr key={order.firebaseId} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-6">
                  <span className="text-[10px] font-mono text-gray-400">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                </td>
                <td className="px-8 py-6 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="px-8 py-6">
                  <div className="flex flex-col space-y-1">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-xs text-brand-navy font-medium">{item.name} × {item.quantity}</span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 text-xs font-bold text-brand-navy">SAR {order.total.toLocaleString()}</td>
                <td className="px-8 py-6">
                  {order.odooOrderName ? (
                    <span className="text-xs font-mono font-bold text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-lg">
                      {order.odooOrderName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Processing Sync</span>
                  )}
                </td>
                <td className="px-8 py-6">
                  {(() => {
                    const { label, color } = getStatusDetails(order.status);
                    return (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${color}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {customerOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic">
                  No orders yet. Visit the shop to start shopping!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CustomerProfile = ({ user }: { user: User | null }) => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data());
      });
    }
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">My Profile</h1>
        <p className="text-gray-500 mt-2">Your registered facility details.</p>
      </div>

      <div className="max-w-2xl bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
        <div className="space-y-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-brand-orange/10 rounded-3xl flex items-center justify-center text-brand-orange">
              <UserIcon size={40} />
            </div>
            <div>
              <h3 className="text-xl font-serif text-brand-navy font-bold">{profile?.facilityName || 'Facility Name'}</h3>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Phone Number</label>
              <p className="text-brand-navy font-medium">{profile?.phoneNumber || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Address</label>
              <p className="text-brand-navy font-medium">{profile?.address || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Joined Date</label>
              <p className="text-brand-navy font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          <div className="bg-brand-cream/50 p-6 rounded-2xl border border-brand-orange/10 mt-8">
            <p className="text-[10px] text-brand-orange font-bold uppercase mb-2">Note</p>
            <p className="text-xs text-brand-navy/60 leading-relaxed">
              These details are verified by administration and cannot be changed manually. If you wish to update your information, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children, user, role }: { children: React.ReactNode, user: User | null, role: string | null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const adminMenuItems = [
    { name: "Overview", icon: <LayoutDashboard size={20} />, path: "/admin" },
    { name: "Orders", icon: <ShoppingBag size={20} />, path: "/admin/orders" },
    { name: "Customers", icon: <Users size={20} />, path: "/admin/customers" },
    { name: "Products", icon: <Package size={20} />, path: "/admin/products" },
    { name: "Odoo Sync", icon: <RefreshCw size={20} />, path: "/admin/odoo" },
    { name: "SEO Settings", icon: <Search size={20} />, path: "/admin/seo" },
    { name: "Blog (Coming Soon)", icon: <FileText size={20} />, path: "/admin/blog" },
    { name: "Settings", icon: <Settings size={20} />, path: "/admin/settings" },
  ];

  const customerMenuItems = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
    { name: "Shop Now", icon: <ShoppingBag size={20} />, path: "/dashboard/shop" },
    { name: "My Orders", icon: <Package size={20} />, path: "/dashboard/orders" },
    { name: "My Profile", icon: <UserIcon size={20} />, path: "/dashboard/profile" },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : customerMenuItems;

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-navy text-white flex flex-col fixed h-full z-20 left-0 shadow-2xl">
        <div className="p-8 border-b border-white/10">
          <div className="flex flex-col items-start">
            <span className="text-white font-serif text-xl tracking-widest font-bold">SHANI'S</span>
            <span className="text-white text-[10px] tracking-[0.3em] -mt-1 uppercase">
              {role === 'admin' ? 'Administration' : 'Customer Account'}
            </span>
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-xs border border-white/20">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold truncate">{user.displayName || 'User'}</p>
              <p className="text-[8px] text-white/40 truncate">{user.email}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                location.pathname === item.path 
                  ? "bg-brand-orange text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center space-x-3 p-3 w-full text-white/60 hover:text-white transition-colors"
          >
            <Eye size={20} />
            <span className="text-sm font-medium">{role === 'admin' ? 'View Website' : 'Back to Website'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 p-3 w-full text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen bg-gray-50">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 h-20 flex items-center justify-between px-10 sticky top-0 z-10">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              {location.pathname.startsWith('/admin') ? 'Administration' : 'Customer Account'}
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 pr-6 border-r border-gray-100">
              <div className="text-right">
                <p className="text-xs font-bold text-brand-navy leading-none">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-gray-400 mt-1">{user.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center text-brand-orange font-bold text-sm">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'A'}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="group flex items-center space-x-2 text-red-500 hover:text-red-600 transition-all font-bold text-[10px] tracking-widest uppercase"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

const OrderManager = ({ orders, setModalContent }: { orders: Order[], setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void }) => {
  console.log("[OrderManager] Rendering with orders:", orders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<'local' | 'odoo'>('local');
  const [odooOrders, setOdooOrders] = useState<any[]>([]);
  const [loadingOdoo, setLoadingOdoo] = useState(false);

  const fetchOdooOrders = async () => {
    setLoadingOdoo(true);
    try {
      const resp = await fetch(getApiUrl("/api/odoo/orders"));
      const data = await resp.json();
      if (data.success) {
        setOdooOrders(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOdoo(false);
    }
  };

  useEffect(() => {
    fetchOdooOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string, order: Order) => {
    try {
      await setDoc(doc(db, "orders", orderId), { status: newStatus }, { merge: true });
      
      // Trigger status update email
      try {
        console.log("Sending status update email request...");
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            type: "status_update",
            customerEmail: order.email,
            customerName: order.customerName,
            status: newStatus
          })
        });
        const result = await response.json();
        if (!response.ok) {
          console.error("Status Email API Error:", result);
        } else {
          console.log("Status Email API Success:", result);
        }
      } catch (e) {
        console.error("Status email notification failed:", e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'pending_payment': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'refunded': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'Pending Approval';
      case 'pending_payment': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return status;
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-3xl font-serif text-brand-navy font-bold">Order Management</h1>
            <span className="px-3 py-1 bg-brand-navy text-white text-[10px] font-bold rounded-full tracking-widest uppercase">Admin Mode</span>
          </div>
          <p className="text-gray-500">View and manage customer orders from store and Odoo.</p>
        </div>
        <button 
          onClick={fetchOdooOrders}
          className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all hover:bg-brand-orange-hover"
        >
          <RefreshCw size={14} className={loadingOdoo ? "animate-spin" : ""} />
          <span>SYNC WITH ODOO</span>
        </button>
      </div>

      <div className="flex space-x-4 mb-8 border-b border-gray-100">
        <button
          onClick={() => setView('local')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'local' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Store Orders ({orders.length})
        </button>
        <button
          onClick={() => setView('odoo')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'odoo' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Odoo ERP Orders ({odooOrders.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'local' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Odoo ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Payment</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.firebaseId} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono text-gray-400">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-brand-navy">{order.customerName}</span>
                        <span className="text-xs text-gray-400">{order.phone1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.odooOrderName ? (
                        <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-1 rounded">
                          {order.odooOrderName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No Sync</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-orange">SAR {order.total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-brand-navy hover:bg-brand-navy hover:text-white rounded-lg transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-gray-400 italic">
                      No store orders found in Firestore.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Odoo SO#</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {odooOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 px-8">
                      <span className="text-sm font-bold text-brand-navy">{o.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-600">{o.partner_id[1]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{new Date(o.date_order).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-orange">SAR {o.amount_total?.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        o.state === 'sale' ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {o.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-serif text-brand-navy font-bold">Order Details</h2>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">#{selectedOrder.firebaseId.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">Customer Info</h3>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-brand-navy">{selectedOrder.customerName}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.phone1}</p>
                      {selectedOrder.phone2 && <p className="text-sm text-gray-500">{selectedOrder.phone2}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">Delivery Address</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">{selectedOrder.address}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.city}, {selectedOrder.district}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">Order Items</h3>
                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-brand-navy">{item.name}</span>
                          <span className="text-xs text-gray-400">Quantity: {item.quantity}</span>
                        </div>
                        <span className="text-sm font-bold text-brand-navy">{item.price}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm font-bold text-brand-navy uppercase tracking-widest">Total</span>
                      <span className="text-xl font-serif font-bold text-brand-orange">SAR {selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">Update Status</h3>
                  
                  {selectedOrder.status === 'pending_approval' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'processing', selectedOrder)}
                      className="w-full mb-4 bg-green-500 text-white py-4 rounded-xl text-xs font-bold tracking-widest hover:bg-green-600 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                    >
                      <Check size={18} />
                      <span>APPROVE ORDER</span>
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    {['pending_approval', 'pending_payment', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.firebaseId, status, selectedOrder)}
                        className={`p-3 rounded-xl text-[10px] font-bold border transition-all ${
                          selectedOrder.status === status 
                            ? 'bg-brand-navy text-white border-brand-navy' 
                            : 'bg-white text-gray-400 border-gray-100 hover:border-brand-orange/30'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomerManager = ({ setModalContent }: { setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [view, setView] = useState<'local' | 'odoo'>('local');
  const [odooCustomers, setOdooCustomers] = useState<any[]>([]);
  const [loadingOdoo, setLoadingOdoo] = useState(false);

  const fetchOdooCustomers = async () => {
    setLoadingOdoo(true);
    try {
      const resp = await fetch(getApiUrl("/api/odoo/customers"));
      const data = await resp.json();
      if (data.success) {
        setOdooCustomers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOdoo(false);
    }
  };

  useEffect(() => {
    fetchOdooCustomers();
  }, []);

  const [newCustomer, setNewCustomer] = useState({
    facilityName: "",
    phoneNumber: "",
    address: "",
    email: ""
  });

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id
      }));
      setCustomers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      await updateDoc(doc(db, "users", editingCustomer.firebaseId), {
        facilityName: editingCustomer.facilityName || "",
        phoneNumber: editingCustomer.phoneNumber || "",
        address: editingCustomer.address || "",
        updatedAt: new Date().toISOString()
      });
      setEditingCustomer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingCustomer.firebaseId}`);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.phoneNumber || !newCustomer.facilityName) {
      setModalContent({
        title: "Alert",
        message: "Please enter facility name and phone number",
        type: 'error'
      });
      return;
    }

    try {
      // Create a document with a custom ID or let Firestore generate one
      // We'll use the phone number as a reference if needed, but Firestore ID is fine
      await addDoc(collection(db, "users"), {
        ...newCustomer,
        role: 'customer',
        createdAt: new Date().toISOString()
      });
      setNewCustomer({ facilityName: "", phoneNumber: "", address: "", email: "" });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "users");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-brand-navy font-bold">Customer Management</h1>
          <p className="text-gray-500 mt-2 text-sm">Manage website users and Odoo CRM customers.</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={fetchOdooCustomers}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all hover:bg-brand-orange-hover"
          >
            <RefreshCw size={14} className={loadingOdoo ? "animate-spin" : ""} />
            <span>SYNC CRM</span>
          </button>
          <button 
            onClick={async () => {
              try {
                const response = await fetch("/api/seed-demo", { method: "POST" });
                const data = await response.json();
                if (data.success) {
                  setModalContent({
                    title: "Success",
                    message: `Demo customer added successfully!\nPhone: ${data.phone}\nPassword: ${data.password}`,
                    type: 'success'
                  });
                } else {
                  setModalContent({
                    title: "Error",
                    message: "Failed to add customer: " + (data.error || "Unknown error"),
                    type: 'error'
                  });
                }
              } catch (e) {
                console.error(e);
                setModalContent({
                  title: "Error",
                  message: "Failed to add customer",
                  type: 'error'
                });
              }
            }}
            className="bg-brand-cream text-brand-navy px-6 py-3 rounded-xl text-xs font-bold border border-brand-navy/10 hover:bg-brand-navy hover:text-white transition-all"
          >
            SEED DEMO CUSTOMER
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-brand-orange-hover transition-all"
          >
            <Plus size={16} />
            <span>Add New Customer</span>
          </button>
          <button 
            className="bg-brand-navy text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-brand-orange transition-all"
            onClick={() => alert("Excel import will be enabled soon.")}
          >
            <Database size={16} />
            <span>Import from Excel</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-100 mb-8">
        <button
          onClick={() => setView('local')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'local' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Registered Users ({customers.length})
        </button>
        <button
          onClick={() => setView('odoo')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'odoo' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Odoo Customers ({odooCustomers.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {view === 'local' ? (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer / Facility</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Address</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined Date</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.firebaseId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-cream rounded-full flex items-center justify-center text-brand-orange font-bold">
                        {c.facilityName?.charAt(0) || c.displayName?.charAt(0) || c.phoneNumber?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-brand-navy block">{c.facilityName || c.displayName || 'Anonymous User'}</span>
                        <span className="text-[10px] text-gray-400">{c.email || 'No email provided'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-gray-600 font-medium">{c.phoneNumber || 'N/A'}</td>
                  <td className="px-8 py-4 text-sm text-gray-600">{c.address || 'N/A'}</td>
                  <td className="px-8 py-4 text-sm text-gray-400">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button 
                      onClick={() => setEditingCustomer(c)}
                      className="text-gray-400 hover:text-brand-navy transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">
                    No customers registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Odoo Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {odooCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="font-bold text-brand-navy text-sm">{c.name}</div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="text-xs text-gray-600">{c.email || 'No email'}</div>
                    <div className="text-[10px] text-brand-orange font-bold uppercase">{c.phone || c.mobile || 'No phone'}</div>
                  </td>
                  <td className="px-8 py-4 text-xs text-gray-500">
                    {c.city || 'N/A'}
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-[10px] font-mono text-gray-400">ID: #{c.id}</span>
                  </td>
                </tr>
              ))}
              {odooCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">
                    No Odoo customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-serif text-brand-navy font-bold mb-6">Add New Customer</h3>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Facility Name *</label>
                  <input 
                    required
                    type="text"
                    value={newCustomer.facilityName}
                    onChange={e => setNewCustomer({...newCustomer, facilityName: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                    placeholder="Enter facility name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Phone Number *</label>
                  <input 
                    required
                    type="text"
                    value={newCustomer.phoneNumber}
                    onChange={e => setNewCustomer({...newCustomer, phoneNumber: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                    placeholder="966XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Email (Optional)</label>
                  <input 
                    type="email"
                    value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Address</label>
                  <textarea 
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange min-h-[80px]"
                    placeholder="District, Street, City"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-brand-navy text-white py-3 rounded-xl text-xs font-bold hover:bg-brand-orange transition-all"
                  >
                    Add Customer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCustomer(null)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-serif text-brand-navy font-bold mb-6">Edit Customer Details</h3>
              <form onSubmit={handleUpdateCustomer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Facility Name</label>
                  <input 
                    type="text"
                    value={editingCustomer.facilityName || ""}
                    onChange={e => setEditingCustomer({...editingCustomer, facilityName: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Phone Number</label>
                  <input 
                    type="text"
                    value={editingCustomer.phoneNumber || ""}
                    onChange={e => setEditingCustomer({...editingCustomer, phoneNumber: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Address</label>
                  <textarea 
                    value={editingCustomer.address || ""}
                    onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange min-h-[80px]"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-brand-navy text-white py-3 rounded-xl text-xs font-bold hover:bg-brand-orange transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardOverview = ({ products, orders }: { products: Product[], orders: Order[] }) => {
  const [odooStats, setOdooStats] = useState({ prodCount: 0, orderCount: 0, custCount: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prod, ord, cust] = await Promise.all([
          fetch(getApiUrl("/api/odoo/products")).then(res => res.json()),
          fetch(getApiUrl("/api/odoo/orders")).then(res => res.json()),
          fetch(getApiUrl("/api/odoo/customers")).then(res => res.json())
        ]);
        setOdooStats({
          prodCount: prod.success ? prod.data.length : 0,
          orderCount: ord.success ? ord.data.length : 0,
          custCount: cust.success ? cust.data.length : 0
        });
      } catch (e) {
        console.error("Failed to fetch Odoo stats for overview", e);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { name: "Store Orders", value: orders.length, icon: <ShoppingBag className="text-brand-orange" />, sub: `Live from Firestore` },
    { name: "Odoo ERP", value: odooStats.orderCount, icon: <RefreshCw className="text-blue-500" />, sub: "Synced Quotations" },
    { name: "Total Customers", value: odooStats.custCount, icon: <Users className="text-purple-500" />, sub: "CRM Synced" },
    { name: "Completed", value: orders.filter(o => o.status === 'completed').length, icon: <Check className="text-emerald-500" />, sub: "Store goal" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">Dashboard Overview</h1>
        <p className="text-gray-500 mt-2 text-sm">Welcome back, Chef Shani. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">{stat.icon}</div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stats</span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.name}</h3>
            <p className="text-2xl font-bold text-brand-navy mt-1">{stat.value}</p>
            {stat.sub && <p className="text-[10px] text-brand-orange font-bold uppercase mt-2 tracking-widest">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-brand-navy mb-6">Recent Products</h3>
          <div className="space-y-4">
            {products.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center space-x-4">
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                  <div>
                    <p className="text-sm font-bold text-brand-navy">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.price}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-brand-navy mb-6">Recent Orders</h3>
          <div className="space-y-4">
            {orders.slice(0, 4).map((order) => (
              <div key={order.firebaseId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-brand-cream rounded-lg flex items-center justify-center text-brand-orange font-bold text-xs">
                    {order.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-navy">{order.customerName}</p>
                    <p className="text-xs text-gray-400">SAR {order.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">{order.status.replace('_', ' ')}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No orders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductManager = ({ products, setModalContent }: { products: Product[], setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: "", description: "", price: "", image: "" });

  const handleSeed = async () => {
    if (confirm("This will upload sample data to help you see the layout. If you want only Odoo data, don't use this. Continue?")) {
      try {
        // We filter out any 'Combo' products even from the sample seed if they were there
        const samples = INITIAL_PRODUCTS.filter(p => !p.name.toLowerCase().includes('combo'));
        for (const product of samples) {
          await addDoc(collection(db, "products"), {
            ...product,
            isOdoo: false, // Mark as manual/sample
            createdAt: new Date().toISOString()
          });
        }
        setModalContent({
          title: "Success",
          message: "Sample products seeded successfully!",
          type: 'success'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "products");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleAdd = async () => {
    if (newProduct.name && newProduct.price) {
      try {
        await addDoc(collection(db, "products"), {
          id: Date.now(),
          name: newProduct.name,
          description: newProduct.description || "",
          price: newProduct.price,
          image: newProduct.image || "https://picsum.photos/seed/spice/400/400",
          createdAt: new Date().toISOString()
        });
        setNewProduct({ name: "", description: "", price: "", image: "" });
        setIsAdding(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "products");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-brand-navy font-bold">Product Management</h1>
          <p className="text-gray-500 mt-2 text-sm">Add, edit, or remove products from your collection.</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={handleSeed}
            className="border border-brand-navy text-brand-navy px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-gray-50 transition-all"
          >
            <Database size={16} />
            <span>SEED DATA</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-brand-orange-hover transition-all"
          >
            <Plus size={16} />
            <span>ADD PRODUCT</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl border border-brand-orange/20"
        >
          <h3 className="text-lg font-bold text-brand-navy mb-6">New Product Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Product Name</label>
              <input 
                type="text" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                placeholder="e.g. Royal Spice Mix"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Price</label>
              <input 
                type="text" 
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                placeholder="e.g. SAR 1,500.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
              <input 
                type="text" 
                value={newProduct.image}
                onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
              <textarea 
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange min-h-[100px]"
                placeholder="Enter detailed product description..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-4 mt-8">
            <button onClick={() => setIsAdding(false)} className="text-gray-400 text-xs font-bold px-6 py-3">CANCEL</button>
            <button onClick={handleAdd} className="bg-brand-navy text-white px-8 py-3 rounded-xl text-xs font-bold">SAVE PRODUCT</button>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
              <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center space-x-4">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                    <span className="text-sm font-bold text-brand-navy">{p.name}</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm text-gray-600 font-medium">{p.price}</td>
                <td className="px-8 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${p.isOdoo ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.isOdoo ? 'Odoo ERP' : 'Manual'}
                  </span>
                </td>
                <td className="px-8 py-4 text-right space-x-3">
                  <button className="text-gray-400 hover:text-brand-navy transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(p.firebaseId || "")} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OdooManager = ({ products, setModalContent, t }: { products: Product[], setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void, t: any }) => {
  const [odooProducts, setOdooProducts] = useState<any[]>([]);
  const [odooOrders, setOdooOrders] = useState<any[]>([]);
  const [odooCustomers, setOdooCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [view, setView] = useState<'products' | 'orders' | 'customers'>('products');

  const syncToStore = async (odooProduct: any) => {
    setSyncing(odooProduct.id);
    try {
      // Find if product already exists in firebase by Odoo ID or Name
      const existingProduct = products.find(p => p.id === odooProduct.id || p.name === odooProduct.name);
      
      // Handle Odoo Image (usually base64)
      let imageUrl = "https://picsum.photos/seed/product/400/400";
      if (odooProduct.image_1920) {
        // Ensure it has the correct prefix and no extra spaces
        const base64Str = odooProduct.image_1920.toString().replace(/\s/g, '');
        imageUrl = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
      } else if (existingProduct?.image) {
        imageUrl = existingProduct.image;
      }

      const productData = {
        id: odooProduct.id,
        name: odooProduct.name,
        description: odooProduct.description_sale || "Imported from Odoo ERP system.",
        price: `SAR ${(odooProduct.list_price || 0).toLocaleString()}`,
        image: imageUrl,
        isOdoo: true,
        updatedAt: new Date().toISOString()
      };

      if (existingProduct?.firebaseId) {
        await setDoc(doc(db, "products", existingProduct.firebaseId), productData, { merge: true });
      } else {
        await addDoc(collection(db, "products"), { ...productData, createdAt: new Date().toISOString() });
      }

      setModalContent({
        title: "Product Synced",
        message: `${odooProduct.name} is now updated in your store.`,
        type: 'success'
      });
    } catch (error: any) {
      console.error("Sync Error:", error);
      setModalContent({
        title: "Sync Error",
        message: "Failed to update product: " + (error.message.includes('Quota exceeded') ? 'Image too large for Firestore or Database Quota Exceeded.' : error.message),
        type: 'error'
      });
    } finally {
      setSyncing(null);
    }
  };

  const syncAllToStore = async () => {
    if (odooProducts.length === 0) return;
    setLoading(true);
    let successCount = 0;
    try {
      for (const op of odooProducts) {
        const existingProduct = products.find(p => p.id === op.id || p.name === op.name);
        
        // Image Handling
        let imageUrl = "https://picsum.photos/seed/product/400/400";
        if (op.image_1920) {
          const base64Str = op.image_1920.toString().replace(/\s/g, '');
          imageUrl = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
        } else if (existingProduct?.image) {
          imageUrl = existingProduct.image;
        }

        const productData = {
          id: op.id,
          name: op.name,
          description: op.description_sale || "Imported from Odoo ERP system.",
          price: `SAR ${(op.list_price || 0).toLocaleString()}`,
          image: imageUrl,
          isOdoo: true,
          updatedAt: new Date().toISOString()
        };

        if (existingProduct?.firebaseId) {
          await setDoc(doc(db, "products", existingProduct.firebaseId), productData, { merge: true });
        } else {
          await addDoc(collection(db, "products"), { ...productData, createdAt: new Date().toISOString() });
        }
        successCount++;
      }
      setModalContent({
        title: "Bulk Sync Complete",
        message: `Successfully synced ${successCount} products from Odoo to your store.`,
        type: 'success'
      });
    } catch (error: any) {
      setModalContent({
        title: "Partial Sync",
        message: `Synced ${successCount} products. Error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOdooData = async () => {
    setLoading(true);
    try {
      const prodRes = await fetch(getApiUrl("/api/odoo/products"));
      const prodContentType = prodRes.headers.get("content-type");
      if (!prodContentType || !prodContentType.includes("application/json")) {
        throw new Error(t.products.syncReminder);
      }
      
      const prodData = await prodRes.json();
      if (prodData.success) {
        setOdooProducts(prodData.data);
        if (prodData.isDemo) setIsDemoMode(true);
        else setIsDemoMode(false);
      } else {
        throw new Error(prodData.message || "Failed to fetch products");
      }

      const orderRes = await fetch(getApiUrl("/api/odoo/orders"));
      const orderData = await orderRes.json();
      if (orderData.success) {
        setOdooOrders(orderData.data);
      }

      const custRes = await fetch(getApiUrl("/api/odoo/customers"));
      const custData = await custRes.json();
      if (custData.success) {
        setOdooCustomers(custData.data);
      }

      setModalContent({
        title: prodData.isDemo ? "Demo Mode Active" : "Success",
        message: prodData.isDemo 
          ? "No Odoo credentials found. Showing sample data to demonstrate the integration."
          : "Data fetched from Odoo successfully",
        type: 'success'
      });
    } catch (error: any) {
      console.error("Odoo Fetch Error:", error);
      setModalContent({
        title: "Sync Error",
        message: error.message || "Failed to connect to Odoo.",
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOdooData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-brand-navy font-bold">Odoo Integration</h1>
          <div className="flex items-center space-x-3 mt-2">
            <p className="text-gray-500 text-sm">Sync your store with Odoo ERP database.</p>
            {isDemoMode && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">DEMO MODE</span>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          {view === 'products' && odooProducts.length > 0 && (
            <button 
              onClick={syncAllToStore}
              disabled={loading}
              className="bg-brand-navy text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-brand-orange transition-all disabled:opacity-50"
            >
              <ArrowUpCircle size={16} />
              <span>SYNC ALL TO STORE</span>
            </button>
          )}
          <button 
            onClick={fetchOdooData}
            disabled={loading}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-brand-orange-hover transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>SYNC NOW</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-100">
        <button
          onClick={() => setView('products')}
          className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'products' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Odoo Products ({odooProducts.length})
        </button>
        <button
          onClick={() => setView('orders')}
          className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'orders' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Odoo Sales Orders ({odooOrders.length})
        </button>
        <button
          onClick={() => setView('customers')}
          className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'customers' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Odoo Customers ({odooCustomers.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Connecting to Odoo...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {view === 'products' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Odoo ID</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {odooProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm font-bold text-brand-navy">{p.name}</td>
                    <td className="px-8 py-4 text-sm text-gray-400 font-mono">#{p.id}</td>
                    <td className="px-8 py-4 text-sm text-brand-orange font-bold">SAR {p.list_price?.toLocaleString()}</td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => syncToStore(p)}
                        disabled={syncing === p.id}
                        className="text-[10px] font-bold text-brand-orange hover:text-brand-navy transition-all flex items-center justify-end space-x-1 ml-auto"
                      >
                        {syncing === p.id ? <RefreshCw size={12} className="animate-spin" /> : <ArrowUpCircle size={12} />}
                        <span>{products.some(sp => sp.id === p.id) ? 'UPDATE PRICE' : 'SYNC TO STORE'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {odooProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-gray-400 italic">No products found in Odoo or configuration missing.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : view === 'orders' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order Reference</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {odooOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm font-bold text-brand-navy">{o.name}</td>
                    <td className="px-8 py-4 text-sm text-gray-600">{o.partner_id[1]}</td>
                    <td className="px-8 py-4 text-sm font-bold text-brand-navy">SAR {o.amount_total?.toLocaleString()}</td>
                    <td className="px-8 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        o.state === 'sale' ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {o.state}
                      </span>
                    </td>
                  </tr>
                ))}
                {odooOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400 italic">No orders found in Odoo or configuration missing.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {odooCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm font-bold text-brand-navy">{c.name}</td>
                    <td className="px-8 py-4 text-sm text-gray-600">
                      <div>{c.email || 'No email'}</div>
                      <div className="text-xs text-brand-orange font-bold uppercase mt-1">{c.phone || c.mobile || 'No phone'}</div>
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-500">
                      {c.city ? `${c.city}${c.street ? `, ${c.street}` : ''}` : 'Location unknown'}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button className="text-[10px] font-bold text-brand-navy hover:text-brand-orange transition-all uppercase tracking-widest">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {odooCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400 italic">No customers found in Odoo or configuration missing.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isDemoMode && (
        <div className="bg-brand-navy p-8 rounded-3xl text-white">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white/10 rounded-2xl text-brand-orange">
              <Settings size={24} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold mb-2">Sync Your Real Odoo Database</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
                You are currently viewing sample data because Odoo is not yet configured. To connect your real database, you need to provide your Odoo URL, database name, and credentials in the environment variables. 
                Odoo API access is enabled by default for all Odoo instances.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SEOManager = ({ seo, setModalContent }: { seo: SiteSettings["seo"], setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void }) => {
  const [activeTab, setActiveTab] = useState<keyof SiteSettings["seo"]>("home");
  const [tempData, setTempData] = useState(seo[activeTab]);

  useEffect(() => {
    setTempData(seo[activeTab]);
  }, [activeTab, seo]);

  const handleSave = async () => {
    try {
      const newSeo = { ...seo, [activeTab]: tempData };
      await setDoc(doc(db, "settings", "seo"), newSeo);
      setModalContent({
        title: "Success",
        message: "SEO settings saved successfully!",
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/seo");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-brand-navy font-bold">SEO Management</h1>
        <p className="text-gray-500 mt-2 text-sm">Optimize how your website appears in search engines.</p>
      </div>

      <div className="flex space-x-4 border-b border-gray-100">
        {(["home", "collection", "about"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === tab ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab} Page
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl">
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Meta Title</label>
            <input 
              type="text" 
              value={tempData.title}
              onChange={(e) => setTempData({...tempData, title: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange text-sm font-medium"
            />
            <p className="text-[10px] text-gray-400">Recommended: 50-60 characters. Current: {tempData.title.length}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Meta Description</label>
            <textarea 
              rows={4}
              value={tempData.description}
              onChange={(e) => setTempData({...tempData, description: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange text-sm font-medium"
            />
            <p className="text-[10px] text-gray-400">Recommended: 150-160 characters. Current: {tempData.description.length}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Keywords (Comma separated)</label>
            <input 
              type="text" 
              value={tempData.keywords}
              onChange={(e) => setTempData({...tempData, keywords: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brand-orange text-sm font-medium"
            />
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end">
            <button 
              onClick={handleSave}
              className="bg-brand-navy text-white px-10 py-4 rounded-xl text-xs font-bold flex items-center space-x-3 hover:bg-brand-orange transition-all"
            >
              <Save size={16} />
              <span>SAVE SEO SETTINGS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Preview Simulation */}
      <div className="max-w-3xl">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Google Search Preview</h3>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[#1a0dab] text-xl font-medium hover:underline cursor-pointer mb-1">{tempData.title}</p>
          <p className="text-[#006621] text-sm mb-1">https://shanisflavorlab.com › {activeTab}</p>
          <p className="text-[#4d5156] text-sm line-clamp-2">{tempData.description}</p>
        </div>
      </div>
    </div>
  );
};

const Testimonials = () => {
  const reviews = [
    {
      stars: 5,
      text: "Exceptional quality and authentic flavour — my go-to spices for every meal!",
      author: "Sumudu Aththanayake"
    },
    {
      stars: 5,
      text: "Shani's blends make home cooking feel like a restaurant experience.",
      author: "Shyamali Perera"
    },
    {
      stars: 5,
      text: "The Royal Biryani Mix is a game changer! The aroma is exactly like the traditional ones we find in high-end restaurants.",
      author: "Priyantha Perera"
    },
    {
      stars: 5,
      text: "High quality Pink Salt. Use it daily now for all my cooking. Highly recommended for health-conscious people.",
      author: "Nilanthi Silva"
    },
    {
      stars: 5,
      text: "The Island Fire Chili mix has the perfect kick. Authentic Sri Lankan taste at its best. Simply amazing!",
      author: "Saman Kumara"
    }
  ];

  return (
    <section className="py-24 bg-brand-cream relative overflow-hidden">
      {/* Quote marks background */}
      <div className="absolute top-10 left-10 text-brand-navy/5 font-serif text-[200px] leading-none pointer-events-none">“</div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="h-[1px] w-8 bg-brand-orange" />
            <span className="text-brand-orange text-[10px] tracking-[0.3em] uppercase font-bold">Testimonials</span>
            <div className="h-[1px] w-8 bg-brand-orange" />
          </div>
          <h2 className="text-brand-navy text-5xl font-serif">What Our Customers Say</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {reviews.slice(0, 4).map((r, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-brand-navy/5">
              <div className="flex space-x-1 mb-6">
                {[...Array(r.stars)].map((_, i) => (
                  <Star key={i} size={12} className="fill-brand-orange text-brand-orange" />
                ))}
              </div>
              <p className="text-brand-navy/80 text-sm leading-relaxed mb-8 italic">"{r.text}"</p>
              <div className="flex items-center space-x-3">
                <div className="h-[1px] w-4 bg-brand-orange" />
                <span className="text-brand-navy text-[10px] tracking-widest font-bold">{r.author}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-brand-navy/5">
          <h3 className="text-brand-navy text-2xl font-serif mb-8 text-center">Share Your Experience</h3>
          <form className="space-y-4">
            <input 
              type="text" 
              placeholder="Your Name" 
              className="w-full bg-gray-50 border border-gray-100 p-4 text-brand-navy text-sm focus:outline-none focus:border-brand-orange transition-colors rounded-xl"
            />
            <textarea 
              placeholder="Your Review" 
              rows={4}
              className="w-full bg-gray-50 border border-gray-100 p-4 text-brand-navy text-sm focus:outline-none focus:border-brand-orange transition-colors rounded-xl"
            />
            <button className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white py-4 text-[10px] tracking-[0.3em] font-bold transition-all rounded-xl shadow-lg shadow-brand-orange/20">
              POST REVIEW
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center mb-12">
          <span className="text-brand-navy font-serif text-3xl tracking-widest font-bold">SHANI'S</span>
          <span className="text-brand-navy text-sm tracking-[0.4em] -mt-1 font-medium">FLAVOR LAB</span>
          <span className="text-brand-navy text-[8px] tracking-[0.2em] opacity-60">DESIGNED TO DELIGHT</span>
        </div>

        <h2 className="text-brand-navy text-4xl md:text-5xl font-serif mb-10 leading-tight">
          Shani's Flavor Lab – Where Authentic Sri <br />
          Lankan Flavours Meet Refined Culinary <br />
          Craftsmanship
        </h2>

        <div className="space-y-6 text-brand-navy/70 text-sm leading-relaxed mb-16">
          <p>
            Welcome to Shani's Flavor Lab, where authentic Sri Lankan flavours meet refined culinary craftsmanship. Founded and led by Chef Shani, a professional chef and culinary content creator, our brand is built on a deep passion for celebrating the rich heritage of Sri Lankan cuisine while presenting it with a modern, premium touch.
          </p>
          <p>
            At Shani's Flavor Lab, we carefully craft premium spice blends and specialty products designed to bring bold, vibrant flavour to every kitchen. Each product is thoughtfully developed using high-quality ingredients to ensure exceptional aroma, authentic taste, and consistent quality.
          </p>
          <p>
            Our mission is to transform everyday cooking into a memorable culinary experience. From signature spice blends to distinctive condiments, each product is crafted with precision and passion, bringing the essence of Sri Lankan cooking to food lovers who appreciate authenticity, quality, and sophistication.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 text-left">
          <div>
            <h3 className="text-brand-navy font-serif text-2xl mb-8 text-center md:text-left">Our Commitments</h3>
            <ul className="space-y-6">
              {[
                "Supporting Local Farmers — We work hand-in-hand with small Sri Lankan farmers, ensuring they are fairly compensated and that their communities thrive through sustainable, ethical practices.",
                "100% Natural & Artisanal — Every product is free from artificial additives and carefully hand-selected, delivering the authentic flavours of Sri Lanka in every spice, blend, and creation.",
                "Committed to Sustainability — From farm to kitchen, we prioritize eco-conscious sourcing and packaging, making sure every step is responsible, sustainable, and kind to the planet."
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-4">
                  <div className="mt-1 text-brand-orange">
                    <Check size={16} />
                  </div>
                  <span className="text-brand-navy/80 text-xs leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-brand-navy font-serif text-2xl mb-8 text-center md:text-left">Why Choose Shani's Flavor Lab?</h3>
            <ul className="space-y-4">
              {[
                "Authentic Sri Lankan spice blends",
                "High-quality, natural ingredients",
                "Crafted by a professional chef",
                "Easy-to-use cooking solutions",
                "Islandwide free delivery in Sri Lanka"
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-4">
                  <div className="text-brand-orange">
                    <Check size={16} />
                  </div>
                  <span className="text-brand-navy/80 text-xs font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 bg-brand-cream p-12 rounded-2xl border border-brand-navy/5">
          <p className="text-brand-navy font-serif text-xl italic">
            "Shani's Flavor Lab is more than just a spice brand — It's where passion for cooking meets authentic Sri Lankan flavor."
          </p>
        </div>
      </div>
    </section>
  );
};

const Chef = () => {
  return (
    <section id="chef" className="py-24 bg-brand-cream">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute -inset-4 border border-brand-orange/30 rounded-sm" />
          <img 
            src="https://i.postimg.cc/QdpB8XPT/SHANI.jpg" 
            alt="Chef Shani" 
            className="w-full h-auto rounded-sm shadow-2xl relative z-10"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-brand-navy text-6xl font-serif mb-2">Meet Chef Shani</h2>
          <p className="text-brand-orange text-[10px] tracking-[0.3em] font-bold mb-10 uppercase">
            CHEF, RESTAURATEUR & CULINARY ARTIST
          </p>
          
          <div className="space-y-6 text-brand-navy/70 text-sm leading-relaxed mb-10">
            <p>
              For over 20 years, Chef Shani has been immersed in the art of cooking, blending the rich traditions of Sri Lankan cuisine with the inspiration of global culinary experiences. A professional chef, restaurateur, and graduate in Commercial Cookery and Hospitality Management, she has explored flavors from every corner of the world, yet remains deeply connected to the dishes of her heritage.
            </p>
            <p>
              At the heart of Shani's approach is a love for authenticity and craftsmanship. Every spice blend, every jar of sauce, and every creation from Shani's Flavor Lab reflects a careful balance of traditional techniques, premium ingredients, and contemporary culinary artistry.
            </p>
            <p>
              More than a chef, Shani is a curator of flavour experiences. Her mission: to help every home cook discover the beauty, aroma, and passion of authentic Sri Lankan cuisine, transforming everyday meals into extraordinary experiences.
            </p>
            <p>
              With Shani's Flavor Lab, luxury is in every detail — from the hand-selected ingredients to the artisanal care in every blend — offering a culinary journey that is as refined as it is unforgettable.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const SocialSection = () => {
  return (
    <section className="bg-white py-12 border-t border-brand-navy/5">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-end gap-4">
        {/* Simplified and cleaner social buttons */}
        <button className="bg-[#2d79f3] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-blue-500/10">
          Chef Shani FB
        </button>
        <button className="bg-[#2d79f3] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-blue-500/10">
          Shanis Flavor Lab FB
        </button>
        <button className="bg-[#ff0000] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-red-500/10">
          YouTube Channel
        </button>
      </div>
    </section>
  );
};

const Footer = ({ onOpenTerms, onOpenPrivacy, onOpenRefund, t }: { 
  onOpenTerms: () => void,
  onOpenPrivacy: () => void,
  onOpenRefund: () => void,
  t: any
}) => {
  return (
    <footer className="bg-brand-cream pt-24 pb-12 text-brand-navy relative border-t border-brand-navy/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-16 mb-24">
          {/* Column 1 */}
          <div>
            <div className="flex items-center space-x-3 space-x-reverse mb-8">
              <div className="w-12 h-12 bg-brand-navy rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-navy/5">
                <Leaf size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-brand-navy font-serif font-bold text-xl leading-none tracking-tight uppercase">SHANI'S</span>
                <span className="text-brand-orange text-[9px] font-bold tracking-[0.4em] uppercase mt-1">Flavor Lab</span>
              </div>
            </div>
            <p className="text-brand-slate text-sm leading-relaxed mb-8 font-medium">
              Premium Sri Lankan flavors and signature blends crafted with precision. Delivering trusted quality for every kitchen.
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-brand-navy font-serif text-xl font-bold mb-10">{t.nav.collection}</h4>
            <ul className="space-y-4 text-brand-slate text-sm font-medium">
              <li><a href="#" className="hover:text-brand-orange transition-colors">{t.nav.home}</a></li>
              <li><a href="#collection" className="hover:text-brand-orange transition-colors">{t.nav.collection}</a></li>
              <li><a href="#about" className="hover:text-brand-orange transition-colors">{t.nav.about}</a></li>
              <li>
                <button 
                  onClick={onOpenTerms}
                  className="hover:text-brand-orange transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenPrivacy}
                  className="hover:text-brand-orange transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenRefund}
                  className="hover:text-brand-orange transition-colors text-left"
                >
                  Refund & Return Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-brand-navy font-serif text-xl font-bold mb-10">Contact</h4>
            <div className="space-y-6 text-brand-slate text-sm font-medium">
              <p><span className="text-brand-navy font-bold">WhatsApp:</span> +94 77 000 0000</p>
              <p><span className="text-brand-navy font-bold">Email:</span> info@shanisflavorlab.com</p>
              <p>
                <span className="text-brand-navy font-bold">Address:</span><br />
                Shani's Flavor Lab, No: 78, Kirimetiyana East, Lunuwila, Sri Lanka.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-brand-navy/5 text-center">
          <p className="text-brand-navy/40 text-[10px] tracking-widest font-bold">
            © 2026 SHANI'S FLAVOR LAB. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>

      {/* Floating Cart Button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 bg-brand-navy text-white p-4 rounded-full shadow-2xl z-40 hover:bg-brand-orange transition-colors"
      >
        <ShoppingBag size={24} />
      </motion.button>
    </footer>
  );
};

// --- Main App Components ---

const Home = ({ 
  products, 
  onAddToCart, 
  cartCount, 
  onOpenCart,
  onOpenAuth,
  onOpenTerms,
  onOpenPrivacy,
  onOpenRefund,
  onViewProduct,
  user,
  userRole,
  lang,
  onToggleLang,
  t
}: { 
  products: Product[], 
  onAddToCart: (p: Product) => void,
  cartCount: number,
  onOpenCart: () => void,
  onOpenAuth: () => void,
  onOpenTerms: () => void,
  onOpenPrivacy: () => void,
  onOpenRefund: () => void,
  onViewProduct: (p: Product) => void,
  user: User | null,
  userRole: string | null,
  lang: Language,
  onToggleLang: () => void,
  t: any
}) => {
  return (
    <>
      <Navbar 
        cartCount={cartCount} 
        onOpenCart={onOpenCart} 
        onOpenAuth={onOpenAuth} 
        user={user} 
        userRole={userRole}
        lang={lang}
        onToggleLang={onToggleLang}
        t={t}
      />
      <Hero t={t} />
      <FeaturesBar t={t} />
      <Products products={products} onOrder={onAddToCart} onViewProduct={onViewProduct} user={user} userRole={userRole} onOpenAuth={onOpenAuth} t={t} />
      <Testimonials />
      <About />
      <Chef />
      <SocialSection />
      <Footer onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy} onOpenRefund={onOpenRefund} t={t} />
    </>
  );
};

export default function App() {
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

  const [products, setProducts] = useState<Product[]>([]);
  const [seo, setSeo] = useState<SiteSettings["seo"]>(INITIAL_SEO);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [showOfferPopup, setShowOfferPopup] = useState(false);

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const claims = idTokenResult.claims;

          if (user.email === 'atoubou39@gmail.com' || claims.admin === true) {
            setUserRole('admin');
          } else if (claims.odooCustomer === true) {
            setUserRole('customer');
          } else {
            // Fallback to Firestore just in case
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              setUserRole(userDoc.data().role || 'customer');
            } else {
              setUserRole('customer');
            }
          }
        } catch (error) {
          console.error("Error fetching user claims:", error);
          setUserRole('customer');
        }
      } else {
        setUserRole(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let allProducts = snapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id
      })) as any[];
      
      // Prefer Odoo-tagged products, but gracefully fall back to any Firestore products.
      // This is important on static hosting where /api/odoo/* is unavailable.
      let filtered = allProducts.filter(p => p.isOdoo === true);
      if (filtered.length === 0 && allProducts.length > 0) {
        filtered = allProducts;
      }
      
      // Attempt to fetch fresh data from Odoo API only in local/dev environments.
      const isLocalRuntime = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocalRuntime && filtered.length < 29) {
        console.log("Fetching real products from Odoo database...");
        try {
          const resp = await fetch(getApiUrl("/api/odoo/products"));
          
          // Check if response is JSON
          const contentType = resp.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await resp.json();
            if (data.success && data.data) {
              const odooMapped = data.data.map((op: any) => ({
                id: op.id,
                name: op.name,
                description: op.description_sale || "Product imported from Odoo ERP.",
                price: `SAR ${(op.list_price || 0).toLocaleString()}`,
                image: op.image_1920 ? (op.image_1920.toString().startsWith('data:') ? op.image_1920 : `data:image/png;base64,${op.image_1920}`) : "https://picsum.photos/seed/product/400/400",
                isOdoo: true
              }));
              
              // Merge real Odoo products into the list
              const existingIds = new Set(filtered.map(p => p.id));
              const newProducts = odooMapped.filter((p: any) => !existingIds.has(p.id));
              filtered = [...filtered, ...newProducts];
            }
          } else {
            console.warn("Odoo API returned non-JSON response.");
          }
        } catch (e) {
          console.error("Odoo API connection failed:", e);
        }
      }

      // If STILL no products found after filtering, show nothing or empty state
      if (filtered.length === 0) {
        console.warn("No Odoo products found in Firestore. Please sync from localhost.");
      }

      setProducts(filtered.slice(0, 50));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "products");
      setProducts(INITIAL_PRODUCTS);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "seo"), (snapshot) => {
      if (snapshot.exists()) {
        setSeo(snapshot.data() as SiteSettings["seo"]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/seo");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    console.log(`[Order Sync] Setting up listener. Role: ${userRole}, User: ${user?.email || 'Guest'}`);

    let q;
    try {
      if (userRole === 'admin') {
        // Admin: Explicitly query all orders from the "orders" collection
        console.log("[Order Sync] Admin detected. Fetching all orders...");
        q = query(collection(db, "orders"));
      } else if (user) {
        // Customer: Query by userId OR email.
        const userEmail = (user.email || "").toLowerCase().trim();
        const userId = user.uid;
        
        console.log(`[Order Sync] Customer detected. Fetching orders for: ${userEmail} or UID: ${userId}`);
        q = query(
          collection(db, "orders"), 
          or(
            where("userId", "==", userId),
            where("email", "==", userEmail)
          )
        );
      } else {
        console.log("[Order Sync] Guest mode. No orders to fetch.");
        setOrders([]);
        return;
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`[Firestore Orders Snapshot] Source: ${snapshot.metadata.fromCache ? 'Cache' : 'Server'}, Size: ${snapshot.size}`);
        
        if (snapshot.empty) {
          console.warn("[Firestore Orders] No orders found in the 'orders' collection for this query.");
        }

        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            firebaseId: doc.id
          };
        }) as any[];
        
        // Sort manually by date (newest first)
        ordersData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        console.log(`[Firestore Orders] Loaded ${ordersData.length} orders successfully.`);
        setOrders(ordersData);
      }, (error) => {
        console.error("[Firestore Orders] snapshot error:", error);
        if (user) {
          handleFirestoreError(error, OperationType.LIST, "orders");
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("[Order Sync] Error setting up query:", err);
    }
  }, [isAuthReady, user, userRole]);

  useEffect(() => {
    if (!isAuthReady) return;

    // Offer Popup Logic
    const hasSeenOffer = sessionStorage.getItem('hasSeenOffer');
    if (!hasSeenOffer && user && userRole === 'customer') {
      const offersQuery = query(collection(db, "offers"), where("active", "==", true));
      const unsubscribeOffers = onSnapshot(offersQuery, (snapshot) => {
        if (!snapshot.empty) {
          const offerData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Offer;
          setActiveOffer(offerData);
          setShowOfferPopup(true);
          sessionStorage.setItem('hasSeenOffer', 'true');
        }
      });
      return () => unsubscribeOffers();
    }
  }, [isAuthReady, user, userRole]);

  useEffect(() => {
    document.title = seo.home.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seo.home.description);
  }, [seo]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      {activeOffer && (
        <OffersPopup 
          isOpen={showOfferPopup} 
          onClose={() => setShowOfferPopup(false)} 
          offer={activeOffer} 
        />
      )}
      <Routes>
        <Route path="/" element={
          <Home 
            products={products} 
            onAddToCart={addToCart} 
            cartCount={cart.length}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenTerms={() => setIsTermsOpen(true)}
            onOpenPrivacy={() => setIsPrivacyOpen(true)}
            onOpenRefund={() => setIsRefundOpen(true)}
            onViewProduct={handleViewProduct}
            user={user}
            userRole={userRole}
            lang={lang}
            onToggleLang={toggleLang}
            t={t}
          />
        } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth" element={<CustomerLoginPage />} />
        <Route path="/pending-activation" element={<PendingActivation />} />
        <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-navy font-serif text-2xl" dir="rtl">غير مصرح لك بالدخول، التسجيل حصري لعملاء المتجر</div>} />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <DashboardOverview products={products} orders={orders} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <ProductManager products={products} setModalContent={setModalContent} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/odoo" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <OdooManager products={products} setModalContent={setModalContent} t={t} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <OrderManager orders={orders} setModalContent={setModalContent} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/customers" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <CustomerSyncDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/seo" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <SEOManager seo={seo} setModalContent={setModalContent} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/blog" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <div className="text-center py-20">
                <FileText size={64} className="mx-auto text-gray-200 mb-6" />
                <h1 className="text-3xl font-serif text-brand-navy font-bold">Blog Management</h1>
                <p className="text-gray-500 mt-2">This feature is coming soon in the next update.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <div className="text-center py-20">
                <Settings size={64} className="mx-auto text-gray-200 mb-6" />
                <h1 className="text-3xl font-serif text-brand-navy font-bold">General Settings</h1>
                <p className="text-gray-500 mt-2">Configure your store's general information here.</p>
              </div>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <CustomerDashboardOverview orders={orders} user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/shop" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <CustomerShop products={products} onAddToCart={addToCart} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/orders" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <CustomerOrders orders={orders} user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/profile" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole}>
              <CustomerProfile user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
      </Routes>
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        t={t}
      />
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        items={cart} 
        onClearCart={() => setCart([])}
        user={user}
        setModalContent={setModalContent}
      />
      <TermsModal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
      />
      <PrivacyModal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
      />
      <RefundModal 
        isOpen={isRefundOpen} 
        onClose={() => setIsRefundOpen(false)} 
      />
      <ProductDetailModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        product={selectedProduct}
        onAddToCart={addToCart}
        t={t}
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Global Message Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6"
          >
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${modalContent.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
              {modalContent.type === 'success' ? <Check size={40} /> : <X size={40} />}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-brand-navy">{modalContent.title}</h3>
              <p className="text-gray-500 whitespace-pre-line">{modalContent.message}</p>
            </div>
            <button 
              onClick={() => setModalContent(null)}
              className="w-full bg-brand-navy text-white py-4 rounded-2xl font-bold hover:bg-brand-orange transition-all"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </BrowserRouter>
  );
}
