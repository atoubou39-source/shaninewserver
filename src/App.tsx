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
  ChevronLeft,
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
  ArrowUpCircle,
  Percent,
  ShoppingCart,
  AlertTriangle
} from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  or,
  deleteField
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendPasswordResetEmail,
  signOut, 
  deleteUser,
  User 
} from "firebase/auth";
import { db, auth, googleProvider } from "./firebase";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PendingActivation } from "./pages/PendingActivation";
import { CustomerSyncDashboard } from "./components/admin/CustomerSyncDashboard";
import { DiscountsManager } from "./components/admin/DiscountsManager";
import { useAuth } from "./hooks/useAuth";

import { translations, Language } from "./translations";
import { usePushNotifications } from "./hooks/usePushNotifications";


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
  discountPrice?: string;
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
  odooState?: string;
  invoiceName?: string;
  lastSyncAt?: string;
  salesRep?: string;
  salespersonId?: number | null;
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
    "price": "⃁ 295",
    "image": "https://picsum.photos/seed/23/400/400",
    "isOdoo": true
  },
  {
    "id": 37,
    "name": "Booking Fees",
    "description": "Premium Sri Lankan Selection.",
    "price": "⃁ 50",
    "image": "https://picsum.photos/seed/37/400/400",
    "isOdoo": true
  },
  {
    "id": 15,
    "name": "Cabinet with Doors",
    "description": "Premium Sri Lankan Selection.",
    "price": "⃁ 140",
    "image": "https://picsum.photos/seed/15/400/400",
    "isOdoo": true
  },
  {
    "id": 50,
    "name": "Cable Management Box",
    "description": "Premium Sri Lankan Selection.",
    "price": "⃁ 120",
    "image": "https://picsum.photos/seed/50/400/400",
    "isOdoo": true
  },
  {
    "id": 49,
    "name": "Cable Management Box",
    "description": "Premium Sri Lankan Selection.",
    "price": "⃁ 100",
    "image": "https://picsum.photos/seed/49/400/400",
    "isOdoo": true
  },
  {
    "id": 36,
    "name": "Chair floor protection",
    "description": "Office chairs can harm your floor: protect it.",
    "price": "⃁ 12",
    "image": "https://picsum.photos/seed/36/400/400",
    "isOdoo": true
  },
  {
    "id": 16,
    "name": "Conference Chair",
    "description": "Premium Selection.",
    "price": "⃁ 33",
    "image": "https://picsum.photos/seed/16/400/400",
    "isOdoo": true
  },
  {
    "id": 18,
    "name": "Corner Desk Left Sit",
    "description": "Premium Selection.",
    "price": "⃁ 85",
    "image": "https://picsum.photos/seed/18/400/400",
    "isOdoo": true
  },
  {
    "id": 10,
    "name": "Corner Desk Right Sit",
    "description": "Premium Selection.",
    "price": "⃁ 147",
    "image": "https://picsum.photos/seed/10/400/400",
    "isOdoo": true
  },
  {
    "id": 9,
    "name": "Customizable Desk",
    "description": "160x80cm, with large legs.",
    "price": "⃁ 750",
    "image": "https://picsum.photos/seed/9/400/400",
    "isOdoo": true
  }
];

const INITIAL_SEO: SiteSettings["seo"] = {
  home: {
    title: "Hakkal Trading Company | شركة حقال للتجارة",
    description: "شركة حقال للتجارة - وجهتك الأولى للمنتجات عالية الجودة.",
    keywords: "حقال, شركة حقال للتجارة, أدوات صحية, منتجات, متجر الكتروني",
  },
  collection: {
    title: "المجموعات | Hakkal Trading Company",
    description: "استكشف مجموعتنا المتميزة من المنتجات عالية الجودة.",
    keywords: "مجموعة حقال، شراء منتجات عبر الإنترنت",
  },
  about: {
    title: "من نحن | Hakkal Trading Company",
    description: "تعرف على رحلة شركة حقال للتجارة والتزامنا بالجودة والتميز.",
    keywords: "شركة حقال للتجارة، عن حقال، الجودة والتميز",
  }
};

// --- Helpers ---

const getStatusDetails = (status: string, t: any) => {
  const statusKey = status as keyof typeof t.orders.statuses;
  const label = t.orders.statuses[statusKey] || status;
  
  switch (status) {
    case 'pending_approval': 
      return { label, color: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'approved': 
    case 'sale':
      return { label: t.orders.statuses.approved || label, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'rejected': 
    case 'cancel':
      return { label: t.orders.statuses.rejected || label, color: 'bg-red-50 text-red-700 border-red-200' };
    case 'shipped':
    case 'done':
      return { label: t.orders.statuses.shipped || label, color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'completed': 
      return { label: t.orders.statuses.completed || label, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'pending_payment':
      return { label, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'processing':
      return { label, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    default: 
      return { label, color: 'bg-gray-50 text-gray-700 border-gray-200' };
  }
};

const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // In production (served from the same origin), relative paths are best and work everywhere
  if (import.meta.env.PROD) {
    return cleanPath;
  }

  // In development, handle localhost switching
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
  if (isLocalhost) {
    // Try to match the backend port (3000 is our new default)
    return `http://localhost:3000${cleanPath}`;
  }

  // Fallback to whatever is in env if provided, else relative
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envBase && envBase.startsWith('http')) {
    return `${envBase.replace(/\/$/, '')}${cleanPath}`;
  }

  return cleanPath;
};

// Helper to get full URL for logging/debugging
const getFullUrl = (path: string) => {
  const apiUrl = getApiUrl(path);
  if (apiUrl.startsWith('http')) return apiUrl;
  if (typeof window === 'undefined') return apiUrl;
  return `${window.location.origin}${apiUrl}`;
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
        <div className="flex items-center group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img
            src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png"
            alt="Hakkal Logo"
            className="h-16 md:h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
          />
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
              to="/admin/login" 
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    "https://i.postimg.cc/rshF2439/6.png",
    "https://i.postimg.cc/rshF2439/6.png",
    "https://i.postimg.cc/rshF2439/6.png",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen bg-white overflow-hidden pt-20">
      {/* Slider Background */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/40 z-10" />
            <img 
              src={slides[currentSlide]} 
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover md:object-contain select-none"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slider Navigation Dots */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex space-x-3 space-x-reverse">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              currentSlide === i ? "bg-brand-orange w-8" : "bg-brand-navy/20"
            }`}
          />
        ))}
      </div>

      {/* Manual Navigation Arrows */}
      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-between px-4 md:px-10">
        <button 
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/30 text-brand-navy backdrop-blur-sm transition-all group"
          aria-label="Previous slide"
        >
          <ChevronRight className="group-hover:-translate-x-1 transition-transform" size={24} />
        </button>
        <button 
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/30 text-brand-navy backdrop-blur-sm transition-all group"
          aria-label="Next slide"
        >
          <ChevronRight className="rotate-180 group-hover:translate-x-1 transition-transform" size={24} />
        </button>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-10">
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
  cart,
  onOrder,
  onUpdateQuantity,
  onSetManualQuantity,
  onRemoveFromCart,
  onViewProduct,
  user,
  userRole,
  onOpenAuth,
  lang,
  t
}: { 
  products: Product[], 
  cart: CartItem[],
  onOrder: (p: Product) => void,
  onUpdateQuantity: (id: number, delta: number) => void,
  onSetManualQuantity: (id: number, val: string) => void,
  onRemoveFromCart: (id: number) => void,
  onViewProduct: (p: Product) => void,
  user: User | null,
  userRole: string | null,
  onOpenAuth: () => void,
  lang: Language,
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 mb-16">
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
                    <span>{t.products.syncFromOdoo}</span>
                  </Link>
                )}
              </div>
            ) : (
              visibleProducts.map((p) => {
                const cartItem = cart.find(ci => ci.id === p.id);
                return (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-xl transition-all group border border-white hover:border-brand-orange/20 cursor-pointer flex flex-col h-full relative"
                >
                  <div className="aspect-square mb-3 md:mb-6 overflow-hidden rounded-xl md:rounded-2xl bg-[#f3f3f3] relative">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    {p.discountPrice && (
                      <div className="absolute top-3 start-3 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                        {Math.round((1 - parseFloat(p.discountPrice.replace(/[^\d.]/g, '')) / parseFloat(p.price.replace(/[^\d.]/g, ''))) * 100)}% {t.products.off || 'OFF'}
                      </div>
                    )}
                    
                    {!cartItem && (
                      <div className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white text-brand-navy p-4 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <Eye size={20} />
                        </div>
                      </div>
                    )}
                    
                    {/* Brand Logo */}
                    <div className="absolute bottom-3 start-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm px-2.5 py-1.5 flex items-center justify-center border border-brand-navy/5">
                      <img
                        src="https://i.ibb.co/FTqMcyG/Untitled-design.png"
                        alt="Brand Logo"
                        className="h-10 w-auto object-contain mix-blend-multiply contrast-125"
                      />
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
                          <div className="mb-6">
                            {p.discountPrice ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-brand-orange font-serif font-bold text-lg">
                                  {t.products.pricePrefix}{p.discountPrice.replace(/[^\d.]/g, '')}
                                </span>
                                <span className="text-gray-400 font-serif text-xs line-through">
                                  {t.products.pricePrefix}{p.price.replace(/[^\d.]/g, '')}
                                </span>
                              </div>
                            ) : (
                              <p className="text-brand-orange font-serif font-bold text-lg">
                                {t.products.pricePrefix}{p.price.replace(/[^\d.]/g, '')}
                              </p>
                            )}
                          </div>
                          
                          {cartItem ? (
                             <div className="flex items-center justify-center">
                               {activePill === p.id ? (
                                 <div className="w-full bg-brand-navy rounded-xl py-3 flex items-center justify-between px-6 shadow-lg border border-white/10">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, -1); }}
                                     className="p-1 hover:bg-white/10 text-white transition-colors"
                                   >
                                     <Minus size={18} />
                                   </button>
                                   <input 
                                     type="number"
                                     value={cartItem.quantity}
                                     onChange={(e) => { e.stopPropagation(); onSetManualQuantity(p.id, e.target.value); }}
                                     onClick={(e) => e.stopPropagation()}
                                     onBlur={() => setActivePill(null)}
                                     autoFocus
                                     className="bg-transparent text-white font-bold text-lg w-12 text-center border-none focus:ring-0 p-0"
                                   />
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, 1); }}
                                     className="p-1 hover:bg-white/10 text-white transition-colors"
                                   >
                                     <Plus size={18} />
                                   </button>
                                 </div>
                               ) : (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setActivePill(p.id); }}
                                   className="relative w-12 h-12 bg-brand-navy text-white rounded-xl flex items-center justify-center hover:bg-brand-orange transition-all shadow-lg group/cart"
                                 >
                                   <ShoppingCart size={24} />
                                   <div className="absolute -top-2 -right-2 bg-brand-orange text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                     {cartItem.quantity}
                                   </div>
                                 </button>
                               )}
                             </div>
                           ) : (
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onOrder(p);
                               }}
                               className="w-full bg-[#0f172a] text-white py-4 rounded-xl text-[11px] tracking-[0.1em] font-bold flex items-center justify-center space-x-2 space-x-reverse hover:bg-brand-orange transition-all duration-300"
                             >
                               <ShoppingBag size={16} />
                               <span className={lang === 'ar' ? "font-action-arabic" : ""}>{t.products.addToCart}</span>
                             </button>
                           )}
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
                );
              })
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

const AdminLogin = () => {
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
  const [step, setStep] = useState<'login' | 'phone' | 'otp' | 'set-password'>('phone');
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
      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate("/admin");
      } else {
        await auth.signOut();
        setError("Access denied. Admin privileges required.");
      }
    } catch (err: any) {
      console.error("Admin Login error:", err);
      setError("Invalid admin credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [checking, setChecking] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      // Step 1: Check if phone exists in Firebase
      const response = await fetch(getApiUrl(`/api/check-phone?phone=${encodeURIComponent(phone)}`));
      const data = await response.json();
      
      if (data.exists) {
        // User exists, ask for password
        setStep('login');
      } else {
        // User not in Firebase, check Odoo and send OTP
        handleSendOTP(e);
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (data.success) {
        setStep('otp');
      } else {
        const errorMsg = data.debug ? `${data.error} (Debug: ${data.debug})` : (data.error || "Failed to send verification code");
        setError(errorMsg);
      }
    } catch (err) {
      setError("Connection error. Please check your Render server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Sanitize phone for email
      const justDigits = phone.replace(/\D/g, "");
      const email = `${justDigits}@hakkal.com`;
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = "فشل تسجيل الدخول. تأكد من بياناتك.";
      if (err.code === 'auth/wrong-password') msg = "كلمة المرور غير صحيحة";
      if (err.code === 'auth/user-not-found') msg = "هذا الحساب غير موجود. يرجى تفعيل جوالك أولاً.";
      
      setError(`${msg} (Debug: ${err.code || err.message})`);
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
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();
      if (data.success && data.uid) {
        setTempUid(data.uid);
        setStep('set-password');
      } else {
        setError(data.error || "كود التحقق غير صحيح");
      }
    } catch (err) {
      setError("فشل التحقق. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setError("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password: newPassword }),
      });
      const data = await response.json();
      if (data.success && data.uid && data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
        navigate("/dashboard");
      } else {
        setError(data.error || "حدث خطأ أثناء الحفظ");
      }
    } catch (err) {
      setError("فشلت العملية. حاول مرة أخرى.");
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
              className="w-full bg-brand-navy text-white py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-brand-orange transition-all flex items-center justify-center gap-2"
            >
              <span>BACK TO SHOPPING</span>
            </Link>
            <button 
              onClick={() => signOut(auth)}
              className="w-full bg-red-50 text-red-500 py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
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
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-orange/10 rounded-3xl mb-6">
             {step === 'login' ? <UserIcon className="text-brand-orange" size={40} /> : 
              step === 'phone' ? <Phone className="text-brand-orange" size={40} /> :
              step === 'otp' ? <Key className="text-brand-orange" size={40} /> :
              <Lock className="text-brand-orange" size={40} />}
           </div>
        </div>

        {step === 'login' && (
          <form onSubmit={handleLoginWithPassword} className="space-y-6">
            <div className="text-center p-4 bg-brand-navy/5 rounded-2xl mb-6">
              <p className="text-[10px] font-bold text-brand-navy uppercase tracking-widest mb-1">تسجيل الدخول لـ</p>
              <p className="text-lg font-serif text-brand-orange">{phone}</p>
              <button onClick={() => setStep('phone')} className="text-[10px] text-gray-400 underline uppercase mt-2 font-bold hover:text-brand-orange transition-colors">تغيير الرقم</button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Lock size={12} className="mr-2 text-brand-orange" />
                كلمة المرور
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
            {error && <p className="text-red-500 text-xs text-center font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] font-bold hover:bg-brand-orange transition-all shadow-xl shadow-brand-navy/10"
            >
              {loading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
            <button type="button" onClick={() => handleSendOTP(null as any)} className="w-full text-brand-orange text-[10px] font-bold uppercase tracking-widest hover:underline text-center">
              نسيت كلمة المرور؟ الدخول عبر SMS
            </button>
          </form>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-brand-navy mb-2">تسجيل الدخول عبر الجوال</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">أدخل رقم جوالك لتصلك رسالة كود التحقق</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Phone size={12} className="mr-2" />
                رقم الجوال
              </label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                placeholder="966XXXXXXXXX"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
            >
              {loading ? "جاري التحقق من الرقم..." : "متابعة"}
            </button>
            <div className="bg-brand-cream/30 p-4 rounded-xl text-center">
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">ملاحظة: الدخول متاح فقط لعملاء شركة حقال المسجلين مسبقاً</p>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-brand-navy mb-2">تأكيد الرمز</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">أدخل الكود المرسل لجوالك</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                <Key size={12} className="mr-2" />
                كود التحقق
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
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
            >
              {loading ? "جاري التأكد..." : "تحقق من الكود"}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-brand-orange text-[10px] font-bold uppercase tracking-widest hover:underline">تغيير الرقم</button>
          </form>
        )}

        {step === 'set-password' && (
          <form onSubmit={handleVerifyAndSetPassword} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif text-brand-navy mb-2">إنشاء كلمة المرور</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">حدد كلمة مرور لحسابك الجديد</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                  <Lock size={12} className="mr-2" />
                  كلمة المرور الجديدة
                </label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center">
                  <Lock size={12} className="mr-2" />
                  تأكيد كلمة المرور
                </label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all shadow-xl shadow-brand-navy/10"
            >
              {loading ? "جاري الحفظ والمزامنة..." : "إكمال التسجيل ودخول الموقع"}
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
  onClose,
  t
}: { 
  isOpen: boolean, 
  onClose: () => void,
  t: any
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
      const email = identifier.includes("@") ? identifier : `${identifier}@hakkal.com`;
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t.auth.invalidCredentials);
      } else {
        setError(t.auth.authFailed);
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
            <h2 className="text-2xl font-serif text-brand-navy mb-2">{t.auth.welcomeBack}</h2>
            <p className="text-gray-500 text-sm mb-8">{user.email || user.phoneNumber}</p>
            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-500 py-4 rounded-2xl text-xs font-bold tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              <span>{t.auth.logout}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange/10 rounded-2xl mb-6">
                <Lock className="text-brand-orange" size={32} />
              </div>
              <h2 className="text-3xl font-serif text-brand-navy mb-2">{t.auth.login}</h2>
              <p className="text-gray-400 text-sm">{t.auth.enterCredentials}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon size={12} />
                  {t.auth.usernameOrEmail}
                </label>
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange transition-all"
                  placeholder={t.auth.usernamePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Key size={12} />
                  {t.auth.password}
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
                {loading ? t.auth.verifying : t.auth.login}
              </button>

              <div className="text-center">
                <Link 
                  to="/auth" 
                  onClick={onClose}
                  className="text-brand-orange text-[10px] font-bold tracking-widest uppercase hover:underline"
                >
                  {t.auth.firstTimeOrForgot}
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
    const priceStr = item.discountPrice || item.price;
    const price = parseFloat(priceStr.replace(/[^\d.]/g, ''));
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
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-brand-navy font-bold text-sm truncate pe-4">{item.name}</h3>
                          <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-gray-400 text-[10px] mb-3">
                          {item.discountPrice ? (
                            <><span className="text-brand-orange font-bold">{t.products.pricePrefix}{item.discountPrice.replace(/[^\d,.]/g, '')}</span> <span className="line-through">{t.products.pricePrefix}{item.price.replace(/[^\d,.]/g, '')}</span></>
                          ) : (
                            <>{t.products.pricePrefix}{item.price.replace(/[^\d,.]/g, '')} {t.products.priceSuffix || ''}</>
                          )}
                        </p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center border border-gray-100 rounded-lg overflow-hidden">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-1.5 hover:bg-gray-50 text-gray-400 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <input 
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                if (val) onUpdateQuantity(item.id, parseInt(val) - item.quantity);
                              }}
                              className="w-10 text-center text-xs font-bold text-brand-navy bg-transparent border-none focus:outline-none focus:ring-0"
                            />
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-1.5 hover:bg-gray-50 text-gray-400 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-brand-orange font-bold text-sm">{t.products.pricePrefix}{(item.discountPrice || item.price).replace(/[^\d.]/g, '')}</span>
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
                  className="w-full bg-brand-orange text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold flex items-center justify-center gap-3 hover:bg-brand-orange-hover transition-all shadow-lg shadow-brand-orange/20"
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

const CheckoutModal = ({ isOpen, onClose, items, onClearCart, user, setModalContent, t, lang }: { isOpen: boolean, onClose: () => void, items: CartItem[], onClearCart: () => void, user: User | null, setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void, t: any, lang: string }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone1: "",
    phone2: "",
    address: "",
    city: "",
    district: "",
    salesRep: "",
    salespersonId: null as number | null,
    paymentMethod: "deferred_invoice" as string,
    agreed: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState("");

  // Fetch user profile data from Firestore + Odoo
  useEffect(() => {
    if (user && isOpen) {
      const val = (v: any) => (v && v !== false && v !== "false") ? String(v) : "";
      
      const fetchProfile = async () => {
        console.log("[Checkout] fetchProfile START", { uid: user.uid, email: user.email });
        
        // Step 1: Initial population from Auth
        setFormData(prev => {
          console.log("[Checkout] Step 1: Initial population", { currentSalesRep: prev.salesRep });
          return {
            ...prev,
            customerName: prev.customerName || user.displayName || "",
            email: prev.email || user.email || "",
            phone1: prev.phone1 || user.phoneNumber || "",
            salesRep: (lang === 'ar' ? "جاري التحميل..." : "Loading..."),
          };
        });

        // Step 2: Enrich from Firestore
        let firestoreData: any = {};
        try {
          console.log("[Checkout] Step 2: Fetching Firestore user doc...");
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            firestoreData = userDocSnap.data();
            console.log("[Checkout] Firestore data found:", firestoreData);
            setFormData(prev => ({
              ...prev,
              customerName: firestoreData.facilityName || prev.customerName,
              email: firestoreData.email || prev.email,
              phone1: firestoreData.phoneNumber || prev.phone1,
              address: firestoreData.address || prev.address,
              city: firestoreData.city || prev.city,
              district: firestoreData.district || prev.district,
              phone2: firestoreData.phone2 || prev.phone2,
            }));
          } else {
            console.log("[Checkout] No Firestore user doc found");
          }
        } catch (e) {
          console.error("[Checkout] Firestore error:", e);
        }

        // Step 3: Enrich from Odoo
        const email = (firestoreData.email || user.email || "").toLowerCase().trim();
        const phone = (firestoreData.phoneNumber || user.phoneNumber || "").trim();
        
        console.log("[Checkout] Step 3: Odoo enrichment starting...", { email, phone });
        
        if (email || phone) {
          console.log("[Checkout] Initiating Odoo enrichment...", { email, phone });
          setFormData(prev => ({ ...prev, salesRep: t.orders.dashboard.loading }));
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn("[Checkout] Odoo fetch timed out after 15s");
              controller.abort();
            }, 15000); 
            
            const apiUrl = getApiUrl("/api/auth/verify-odoo-customer");
            console.log("[Checkout] Calling API:", apiUrl);
            
            const odooRes = await fetch(apiUrl, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              mode: "cors",
              cache: "no-cache",
              signal: controller.signal,
              body: JSON.stringify({ phone, email })
            });
            
            clearTimeout(timeoutId);
            console.log("[Checkout] API Response status:", odooRes.status);
            
            const odooResult = await odooRes.json();
            console.log("[Checkout] API Result success:", odooResult.success);
            
            if (odooResult.success && odooResult.customer) {
              const c = odooResult.customer;
              console.log("[Checkout] Customer found:", c.name, "Salesperson:", c.salesperson_name);
              
              // Map salesperson name to Arabic if needed
              let salesRepDisplay = val(c.salesperson_name);
              if (!salesRepDisplay || salesRepDisplay === "Not Assigned") {
                salesRepDisplay = lang === 'ar' ? "غير معين" : "Not Assigned";
              }

              setFormData(prev => ({
                ...prev,
                customerName: val(c.name) || prev.customerName,
                email: val(c.email) || prev.email,
                phone1: val(c.phone) || prev.phone1,
                phone2: val(c.mobile) || prev.phone2,
                address: val(c.street) || prev.address,
                city: val(c.city) || prev.city,
                district: val(c.district) || prev.district,
                salesRep: salesRepDisplay,
                salespersonId: c.salesperson_id || null,
              }));
              
              if (c.sale_warn === 'block') {
                setIsBlocked(true);
                setBlockedMsg(val(c.sale_warn_msg) || "");
                console.log("[Checkout] BLOCKED:", c.sale_warn_msg);
              } else {
                setIsBlocked(false);
                setBlockedMsg("");
              }
            } else {
              console.log("[Checkout] No customer data returned from Odoo or search failed");
              setFormData(prev => ({ 
                ...prev, 
                salesRep: lang === 'ar' ? "غير معين" : "Not Assigned" 
              }));
            }
          } catch (e: any) {
            console.error("[Checkout] Odoo fetch error:", e);
            const errorDetail = e.name === 'AbortError' ? (lang === 'ar' ? "انتهت المهلة" : "Timeout") : (e.message || "Unknown");
            setFormData(prev => ({ 
              ...prev, 
              salesRep: lang === 'ar' ? `غير متوفر (${errorDetail})` : `Not Available (${errorDetail})` 
            }));
          }
        } else {
          console.log("[Checkout] No email or phone to search Odoo with");
          setFormData(prev => ({ 
            ...prev, 
            salesRep: lang === 'ar' ? "غير معين" : "Not Assigned" 
          }));
        }
      };
      fetchProfile();
    }
  }, [user, isOpen]);

  if (items.length === 0 && !isSuccess) return null;

  const total = items.reduce((sum, item) => {
    const priceStr = item.discountPrice || item.price;
    const price = parseFloat(priceStr.replace(/[^\d.]/g, ''));
    return sum + (price * item.quantity);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setModalContent({
        title: t.checkout.customerBlocked,
        message: blockedMsg || t.checkout.customerBlockedMsg,
        type: 'error'
      });
      return;
    }
    
    if (!formData.agreed) {
      setModalContent({
        title: t.checkout.alert,
        message: t.checkout.agreeTerms,
        type: 'error'
      });
      return;
    }
    
    if (!formData.phone1?.trim()) {
      setModalContent({
        title: t.checkout.alert,
        message: (lang === 'ar' ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number"),
        type: 'error'
      });
      return;
    }
    
    setIsSubmitting(true);
    const orderStart = Date.now();
    console.log("[Checkout] START order submission...");
    
    let cleanOrderData: any = null;
    try {
      // Validate mandatory fields (Phone is essential)
      if (!formData.phone1?.trim()) {
        throw new Error("Missing required field: phone1");
      }

      // Robust total calculation to avoid NaN
      const safeTotal = items.reduce((sum, item) => {
        try {
          const priceStr = String(item.discountPrice || item.price || "0");
          const price = parseFloat(priceStr.replace(/[^\d.]/g, '')) || 0;
          return sum + (price * (item.quantity || 1));
        } catch (e) {
          console.warn("[Checkout] Error calculating item price:", item.name, e);
          return sum;
        }
      }, 0);

      const orderData = {
        userId: user?.uid || null,
        customerName: (formData.customerName || "").trim() || (lang === 'ar' ? "عميل جديد" : "New Customer"),
        email: (formData.email || "").trim(),
        phone1: formData.phone1.trim(),
        phone2: (formData.phone2 || "").trim(),
        address: (formData.address || "").trim(),
        city: formData.city?.trim() || "Not Provided",
        district: formData.district?.trim() || "Not Provided",
        salesRep: (formData.salesRep === t.orders.dashboard.loading || formData.salesRep === (lang === 'ar' ? "جاري التحميل..." : "Loading...")) 
          ? (lang === 'ar' ? "غير معين" : "Not Assigned") 
          : (formData.salesRep || ""),
        salespersonId: formData.salespersonId || null,
        paymentMethod: formData.paymentMethod || "deferred_invoice",
        items: items.map(item => ({
          id: item.id || 0,
          name: item.name || "Unknown Product",
          price: String(item.price || "0"),
          discountPrice: item.discountPrice ? String(item.discountPrice) : null,
          quantity: item.quantity || 1,
          isOdoo: !!item.isOdoo
        })),
        total: safeTotal,
        status: 'pending_approval',
        createdAt: new Date().toISOString()
      };

      // Final sanitization: Remove any accidental undefined values that might crash Firestore
      cleanOrderData = JSON.parse(JSON.stringify(orderData, (key, value) => 
        value === undefined ? null : value
      ));

      // Check network status
      if (!window.navigator.onLine) {
        throw new Error("Offline: Please check your internet connection.");
      }

      console.log("[Firebase] Project ID being used:", db.app.options.projectId);
      console.log("[Checkout] Final sanitized data to send:", JSON.stringify(cleanOrderData, null, 2));
      // Use setDoc instead of addDoc for better reliability
      const ordersCol = collection(db, "orders");
      const docRef = doc(ordersCol); // Manually create a doc reference with a new ID

      try {
        console.log(`[Checkout] [${Date.now() - orderStart}ms] Saving to Firestore (5s timeout)...`);
        
        // Wrap setDoc in a 5-second timeout to trigger Emergency Mode if it hangs
        const savePromise = setDoc(docRef, cleanOrderData);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("quota-exceeded-timeout")), 5000)
        );

        await Promise.race([savePromise, timeoutPromise]);
        console.log(`[Checkout] [${Date.now() - orderStart}ms] Saved to Firestore successfully. ID: ${docRef.id}`);
      } catch (saveError: any) {
        const errorMsg = saveError.message || String(saveError);
        const isQuota = errorMsg.includes("resource-exhausted") || 
                        errorMsg.includes("quota-exceeded") || 
                        errorMsg === "quota-exceeded-timeout";

        if (isQuota) {
          console.warn("[Checkout] Firestore Quota Exceeded or Timeout! Using Emergency Mode...");
          // Emergency Odoo Sync...
          const syncUrl = getApiUrl("/api/odoo/orders");
          try {
            const odooResponse = await fetch(syncUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerEmail: formData.email,
                customerName: formData.customerName,
                phone: formData.phone1,
                items: cleanOrderData.items,
                address: `${formData.address}, ${formData.city}, ${formData.district}`,
                salespersonId: formData.salespersonId,
                salesRepName: formData.salesRep || ""
              })
            });

            if (odooResponse.ok) {
              const odooResult = await odooResponse.json();
              if (odooResult.success) {
                setModalContent({
                  title: t.checkout.orderReceived + " (Emergency Mode)",
                  message: t.checkout.orderCreatedSuccess.replace('{orderName}', odooResult.orderName || "NEW") + "\n\n(ملاحظة: تم إرسال الطلب مباشرة لنظام Odoo بسبب امتلاء حصة Firebase)",
                  type: 'success'
                });
                setIsSuccess(true);
                onClearCart();
                setIsSubmitting(false);
                return; 
              }
            }
          } catch (e) {
            console.error("[Emergency Mode] Sync failed:", e);
          }
        }
        throw saveError;
      }
      
      // Trigger Odoo Order Creation
      let odooOrderName = "";
      
      // Try to sync to Odoo, but don't let it block the success flow if it fails
      try {
        const syncUrl = getApiUrl("/api/odoo/orders");
        console.log(`[Checkout] [${Date.now() - orderStart}ms] Syncing to Odoo...`, syncUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn("[Checkout] Odoo sync timed out after 60s");
          controller.abort();
        }, 60000); 
        
        const odooResponse = await fetch(syncUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          mode: "cors", 
          cache: "no-cache",
          signal: controller.signal,
          body: JSON.stringify({
            customerEmail: formData.email,
            customerName: formData.customerName,
            phone: formData.phone1,
            items: cleanOrderData.items,
            address: `${formData.address}, ${formData.city}, ${formData.district}`,
            salespersonId: formData.salespersonId,
            salesRepName: formData.salesRep || ""
          })
        });
        
        clearTimeout(timeoutId);
        console.log(`[Checkout] [${Date.now() - orderStart}ms] Odoo sync response status: ${odooResponse.status}`);
        
        if (odooResponse.ok) {
          const odooResult = await odooResponse.json();
          console.log(`[Checkout] [${Date.now() - orderStart}ms] Odoo sync result success: ${odooResult.success}`);
          
          if (odooResult.success) {
            odooOrderName = odooResult.orderName || `SO-${odooResult.orderId || 'NEW'}`;
            const updateData: any = { 
              odooOrderName,
              invoiceName: odooResult.invoiceName || null,
              syncStatus: 'success',
              syncedAt: new Date().toISOString()
            };
            if (odooResult.orderId) {
              updateData.odooOrderId = odooResult.orderId;
            }
            
            // Filter out undefined values to prevent Firestore crash
            const cleanUpdateData = Object.fromEntries(
              Object.entries(updateData).filter(([_, v]) => v !== undefined)
            );
            
            await updateDoc(docRef, cleanUpdateData);
            
            setModalContent({
              title: t.checkout.orderReceived,
              message: t.checkout.orderCreatedSuccess.replace('{orderName}', odooOrderName) + "\n\n" + t.checkout.orderReviewNotice,
              type: 'success'
            });
          } else {
            console.error("Odoo sync returned failure:", odooResult.error);
            await updateDoc(docRef, { 
              syncStatus: 'failed',
              syncError: odooResult.error
            });
            // Show success for website but warning for Odoo
            setModalContent({
              title: t.checkout.orderReceived,
              message: t.checkout.orderSentMessage + "\n\n(Odoo Sync: " + (odooResult.error || "Failed") + ")",
              type: 'success'
            });
          }
        } else if (odooResponse.status === 403) {
          // Blocked or Not Found in Odoo - This is a hard failure for the user
          const odooResult = await odooResponse.json().catch(() => ({ message: "عذراً، لا يمكن إتمام الطلب في الوقت الحالي." }));
          console.error("Odoo sync blocked (403):", odooResult);
          
          // DO NOT delete from Firestore anymore - keep the record locally
          await updateDoc(docRef, { 
            syncStatus: 'failed',
            syncError: odooResult.message || 'Odoo 403 Access Denied'
          });
          
          setModalContent({
            title: "تنبيه من النظام",
            message: odooResult.message || "عذراً، حسابك محظور من إنشاء طلبات جديدة في النظام. يرجى التواصل مع الإدارة.",
            type: 'error'
          });
          setIsSubmitting(false);
          return; // Stop the flow here
        } else {
          const errorText = await odooResponse.text().catch(() => "Unknown error");
          console.error("Odoo API returned non-ok status:", odooResponse.status, errorText);
          throw new Error(`Server Error (${odooResponse.status}): ${errorText.slice(0, 50)}`);
        }
      } catch (e: any) {
        const isTimeout = e.name === 'AbortError';
        const errorMsg = isTimeout ? "Request Timeout" : (e.message || "Connection Failed");
        const fullSyncUrl = getFullUrl("/api/odoo/orders");
        
        console.error("Failed to sync order to Odoo:", {
          error: e,
          message: e.message,
          name: e.name,
          url: fullSyncUrl,
          stack: e.stack
        });
        
        // Detailed error analysis
        let detailedError = errorMsg;
        if (errorMsg === "Failed to fetch") {
          detailedError = "Failed to fetch (Network Error or CORS). Please check if the backend is running and allows requests from this origin.";
        }
        
        await updateDoc(docRef, { 
          syncStatus: 'failed',
          syncError: `${detailedError} | URL: ${fullSyncUrl}`
        });
        
        // We still show success for the website order even if Odoo sync fails
        setModalContent({
          title: t.checkout.orderReceived,
          message: t.checkout.orderSentMessage + "\n\nOdoo Sync Status: " + detailedError + "\nAPI URL: `" + fullSyncUrl + "`",
          type: 'success'
        });
      }

      // Trigger email notification
      try {
        console.log("Sending email request to server for order:", docRef.id);
        await fetch(getApiUrl("/api/send-email"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: docRef.id,
            type: "order_confirmation",
            customerEmail: formData.email,
            customerName: formData.customerName,
            total: safeTotal,
            items: cleanOrderData.items
          })
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      setIsSuccess(true);
      onClearCart();
    } catch (error: any) {
      console.error("CRITICAL: Order Save Failed:", error);
      
      const firestoreError = error.message || String(error);
      const isQuotaExceeded = firestoreError.includes("resource-exhausted") || firestoreError.includes("quota-exceeded");

      // --- EMERGENCY MODE ---
      // If Firestore is full (quota exceeded), try to send DIRECTLY to Odoo anyway
      if (isQuotaExceeded) {
        console.warn("[Checkout] Firestore Quota Exceeded. Entering EMERGENCY MODE (Direct Odoo Sync)...");
        try {
          const syncUrl = getApiUrl("/api/odoo/orders");
          const odooResponse = await fetch(syncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerEmail: formData.email,
              customerName: formData.customerName,
              phone: formData.phone1,
              items: cleanOrderData.items,
              address: `${formData.address}, ${formData.city}, ${formData.district}`,
              salespersonId: formData.salespersonId,
              salesRepName: formData.salesRep || ""
            })
          });

          if (odooResponse.ok) {
            const odooResult = await odooResponse.json();
            if (odooResult.success) {
              setModalContent({
                title: t.checkout.orderReceived + " (Emergency Mode)",
                message: t.checkout.orderCreatedSuccess.replace('{orderName}', odooResult.orderName || "NEW") + "\n\n(ملاحظة: تم إرسال الطلب مباشرة لنظام Odoo بسبب امتلاء حصة Firebase)",
                type: 'success'
              });
              setIsSuccess(true);
              onClearCart();
              setIsSubmitting(false);
              return; // Success in emergency mode!
            }
          }
        } catch (e) {
          console.error("[Emergency Mode] Direct Odoo sync failed too:", e);
        }
      }
      
      // Original error handling if not quota or if emergency mode fails
      let errorMessage = t.checkout.orderSaveError;
      if (isQuotaExceeded) {
        errorMessage = lang === 'ar' 
          ? "عذراً، تم تجاوز الحصة المجانية لليوم في Firebase. يرجى التواصل مع الإدارة لترقية الحساب." 
          : "Firebase Quota Exceeded. Please upgrade your plan or wait until tomorrow.";
      } else if (firestoreError.includes("permission-denied")) {
        errorMessage = lang === 'ar' 
          ? "عذراً، ليس لديك صلاحية لإتمام الطلب." 
          : "Permission Denied: You don't have permission to place this order.";
      }

      setModalContent({
        title: t.checkout.orderError,
        message: errorMessage,
        type: 'error'
      });
      
      try {
        handleFirestoreError(error, OperationType.CREATE, "orders");
      } catch (e) {}
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
                  {isSuccess ? t.checkout.orderPlaced : t.checkout.title}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isSuccess 
                    ? t.checkout.thankYou
                    : t.checkout.reviewOrder}
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
                  <h3 className="text-2xl font-serif text-brand-navy mb-4">{t.checkout.orderPlaced}</h3>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">
                    {t.checkout.orderSentMessage}
                  </p>
                  <button 
                    onClick={onClose}
                    className="bg-brand-navy text-white px-10 py-4 rounded-xl text-[10px] tracking-[0.2em] font-bold hover:bg-brand-orange transition-all"
                  >
                    {t.checkout.backToStore}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Order Summary */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">{t.checkout.orderSummary}</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="bg-brand-cream/50 rounded-2xl p-6">
                      <div className="space-y-4 mb-4 pb-4 border-b border-brand-orange/10">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <span className="text-brand-navy font-medium">{item.name}</span>
                            <span className="text-gray-500 text-sm">× {item.quantity} {t.products.pricePrefix}{item.price.replace(/[^\d.]/g, '')}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] tracking-[0.2em] font-bold text-brand-navy uppercase">{t.checkout.totalAmount}</span>
                        <span className="text-2xl font-serif font-bold text-brand-orange">{t.products.pricePrefix}{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Your Details */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">{t.checkout.yourDetails}</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.facilityName}</label>
                        <input 
                          readOnly
                          type="text" 
                          placeholder={t.checkout.facilityPlaceholder} 
                          value={formData.customerName}
                          className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.emailLabel}</label>
                        <input 
                          readOnly
                          type="email" 
                          placeholder={t.checkout.emailPlaceholder} 
                          value={formData.email}
                          className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.phoneLabel}</label>
                          <input 
                            readOnly
                            type="text" 
                            placeholder={t.checkout.phonePlaceholder}
                            value={formData.phone1}
                            className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.secondaryPhone}</label>
                          <input 
                            readOnly
                            type="text" 
                            placeholder={t.checkout.phonePlaceholder}
                            value={formData.phone2}
                            className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.addressLabel}</label>
                        <input 
                          readOnly
                          type="text" 
                          placeholder={t.checkout.addressPlaceholder} 
                          value={formData.address}
                          className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.cityLabel}</label>
                          <input 
                            readOnly
                            type="text" 
                            placeholder={t.checkout.cityPlaceholder} 
                            value={formData.city}
                            className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.districtLabel}</label>
                          <input 
                            readOnly
                            type="text" 
                            placeholder={t.checkout.districtPlaceholder} 
                            value={formData.district}
                            className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-brand-navy uppercase mb-2 ms-1">{t.checkout.salesRepLabel}</label>
                        <input 
                          readOnly
                          type="text" 
                          placeholder={t.checkout.salesRepPlaceholder}
                          value={formData.salesRep || (lang === 'ar' ? "غير معين" : "Not Assigned")}
                          className="w-full p-4 bg-gray-100 border border-gray-100 rounded-xl text-brand-navy font-bold cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-orange">{t.checkout.paymentMethod}</span>
                      <div className="h-[1px] flex-1 bg-gray-100" />
                    </div>
                    <div className="flex items-center justify-center gap-3 p-4 border-2 border-brand-orange bg-brand-orange/5 rounded-xl">
                      <Building2 size={20} className="text-brand-orange" />
                      <span className="text-xs font-bold text-brand-navy">{t.checkout.deferredInvoice}</span>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="mb-8 flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <input 
                      required
                      type="checkbox" 
                      checked={formData.agreed}
                      onChange={e => setFormData({...formData, agreed: e.target.checked})}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" 
                    />
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {t.checkout.termsAgree} <span className="text-brand-orange underline">{t.checkout.termsLink}</span>, <span className="text-brand-orange underline">{t.checkout.privacyLink}</span>, <span className="text-brand-orange underline">{t.checkout.refundLink}</span> {t.checkout.ofBrand}
                    </p>
                  </div>

                  {/* Blocked Status Warning - Moved here to be near the submit button */}
                  {isBlocked && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4"
                    >
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Lock className="text-red-500" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-red-900 font-bold text-sm mb-1">
                          {t.orders.dashboard.accountBlocked}
                        </h4>
                        <p className="text-red-700 text-xs leading-relaxed">
                          {blockedMsg || t.orders.dashboard.accountBlockedDescription}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Confirm Button */}
                  <button 
                    disabled={isSubmitting || isBlocked}
                    type="submit"
                    className={`w-full ${isBlocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-navy hover:bg-brand-orange shadow-brand-navy/10'} text-white py-5 rounded-2xl text-[11px] tracking-[0.2em] font-bold flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-50`}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isBlocked ? (
                      <>
                        <Lock size={14} className="text-white" />
                        <span>{t.orders.dashboard.accountBlockedBadge}</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-green-500 rounded-full p-0.5">
                          <Check size={14} className="text-white" />
                        </div>
                        <span>{t.checkout.confirmOrder}</span>
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
  lang,
  t
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  product: Product | null, 
  onAddToCart: (p: Product) => void,
  lang: Language,
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
                  <span className="text-brand-orange text-[10px] tracking-[0.3em] uppercase font-bold">{t.products.premiumSelection}</span>
                </div>
                <h2 className="text-brand-navy text-4xl font-serif font-bold mb-4 leading-tight">
                  {product.name}
                </h2>
                {product.discountPrice ? (
                  <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <span className="text-brand-orange font-serif font-bold text-2xl">
                      {t.products.pricePrefix}{product.discountPrice.replace(/[^\d.]/g, '')}
                    </span>
                    <span className="text-gray-400 font-serif text-lg line-through">
                      {t.products.pricePrefix}{product.price.replace(/[^\d.]/g, '')}
                    </span>
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {Math.round((1 - parseFloat(product.discountPrice.replace(/[^\d.]/g, '')) / parseFloat(product.price.replace(/[^\d.]/g, ''))) * 100)}% {t.products.off}
                    </span>
                  </div>
                ) : (
                  <p className="text-brand-orange font-serif font-bold text-2xl mb-6">
                    {t.products.pricePrefix}{product.price.replace(/[^\d.]/g, '')}
                  </p>
                )}
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
                  <span className={lang === 'ar' ? "font-action-arabic" : ""}>{t.products.addToCart}</span>
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

const TermsModal = ({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: any }) => {
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
                <h2 className="text-2xl font-serif text-brand-navy font-bold">{t.modals.termsTitle}</h2>
                <img src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" alt="Hakkal Logo" className="h-10 w-auto object-contain mt-1 mix-blend-multiply" />
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
                  {t.modals.termsIntro}
                </p>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">1</span>
                      {t.modals.general}
                    </h3>
                    <p className="ps-11">{t.modals.generalText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">2</span>
                      {t.modals.orders}
                    </h3>
                    <p className="ps-11">{t.modals.ordersText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">3</span>
                      {t.modals.pricing}
                    </h3>
                    <p className="ps-11">{t.modals.pricingText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">4</span>
                      {t.modals.payment}
                    </h3>
                    <p className="ps-11">{t.modals.paymentText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">5</span>
                      {t.modals.deliveryShipping}
                    </h3>
                    <p className="ps-11">{t.modals.deliveryShippingText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">6</span>
                      {t.modals.returnsRefunds}
                    </h3>
                    <div className="ps-11 space-y-2">
                      <p>{t.modals.returnsRefundsText1}</p>
                      <p>{t.modals.returnsRefundsText2}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">7</span>
                      {t.modals.allergens}
                    </h3>
                    <p className="ps-11">{t.modals.allergensText}</p>
                  </section>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">{t.footer.contact}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">Info@hakkal-est.com</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.management}: +966 57 5151 506</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.middleArea}: +966 57 5151 507</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.westernArea}: +966 57 5151 508</span>
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
                {t.modals.iUnderstand}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PrivacyModal = ({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: any }) => {
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
                <h2 className="text-2xl font-serif text-brand-navy font-bold">{t.modals.privacyTitle}</h2>
                <img src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" alt="Hakkal Logo" className="h-10 w-auto object-contain mt-1 mix-blend-multiply" />
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
                  <p className="leading-relaxed">{t.modals.privacyText1}</p>
                  <p className="leading-relaxed">{t.modals.privacyText2}</p>
                  <p className="leading-relaxed">{t.modals.privacyText3}</p>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">{t.footer.contact}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">Info@hakkal-est.com</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.management}: +966 57 5151 506</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.middleArea}: +966 57 5151 507</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">{t.contactInfo.westernArea}: +966 57 5151 508</span>
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
                {t.modals.iUnderstand}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const RefundModal = ({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: any }) => {
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
                <h2 className="text-2xl font-serif text-brand-navy font-bold">{t.modals.refundTitle}</h2>
                <img src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" alt="Hakkal Logo" className="h-10 w-auto object-contain mt-1 mix-blend-multiply" />
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
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">1</span>
                      {t.modals.finalSales}
                    </h3>
                    <p className="ps-11">{t.modals.finalSalesText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">2</span>
                      {t.modals.reportingIssues}
                    </h3>
                    <p className="ps-11">{t.modals.reportingIssuesText}</p>
                  </section>

                  <section>
                    <h3 className="text-brand-navy font-bold text-lg mb-3 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs me-3">3</span>
                      {t.modals.verification}
                    </h3>
                    <p className="ps-11">{t.modals.verificationText}</p>
                  </section>

                  <section className="bg-brand-cream p-6 rounded-2xl border border-brand-navy/5">
                    <h3 className="text-brand-navy font-bold text-lg mb-4">{t.footer.contact}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📧</div>
                        <span className="font-medium">Info@hakkal-est.com</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">Management: +966 57 5151 506</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">Middle Area: +966 57 5151 507</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">📞</div>
                        <span className="font-medium">Western Area: +966 57 5151 508</span>
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
                {t.modals.iUnderstand}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Customer Dashboard Components ---
const DashboardCarousel = ({ lang, t }: { lang: Language, t: any }) => {
  const banners = [
    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=1200"
  ];
  
  const isRtl = lang === 'ar';
  const bannerCount = banners.length;
  
  // 3 sets of banners for seamless infinite scroll
  const extendedBanners = [...banners, ...banners, ...banners];
  const [index, setIndex] = useState(bannerCount);
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
      setIsTransitioning(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setIsTransitioning(true);
    setIndex(prev => prev + 1);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setIndex(prev => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (index >= bannerCount * 2) {
      setIsTransitioning(false);
      setIndex(index - bannerCount);
    } else if (index < bannerCount) {
      setIsTransitioning(false);
      setIndex(index + bannerCount);
    }
  };

  const activeDot = index % bannerCount;

  return (
    <div className="relative w-full mb-12 select-none group">
      <div className="relative h-52 md:h-96 overflow-hidden rounded-[2.5rem]">
        <motion.div 
          className="flex h-full"
          style={{ 
            gap: '16px',
            paddingLeft: '7.5%',
            paddingRight: '7.5%'
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 50) prevSlide();
            else if (info.offset.x < -50) nextSlide();
          }}
          animate={{ 
            x: isRtl 
              ? `calc(${index} * (85% + 16px))` 
              : `calc(-${index} * (85% + 16px))` 
          }}
          transition={isTransitioning ? { type: "spring", stiffness: 150, damping: 25 } : { duration: 0 }}
          onAnimationComplete={handleTransitionEnd}
        >
          {extendedBanners.map((src, i) => (
            <motion.div 
              key={i} 
              className="relative min-w-[85%] h-full flex-shrink-0 rounded-[2.5rem] overflow-hidden shadow-xl border-2 border-white/50 bg-gray-50"
              animate={{ 
                scale: (index === i) ? 1 : 0.92,
                opacity: (index === i) ? 1 : 0.6,
              }}
              transition={{ duration: 0.5 }}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation Arrows */}
        <div className="absolute inset-0 flex items-center justify-between px-4 md:px-10 pointer-events-none">
          <button 
            onClick={prevSlide}
            className="pointer-events-auto p-3 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          >
            {isRtl ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <button 
            onClick={nextSlide}
            className="pointer-events-auto p-3 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          >
            {isRtl ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </div>
      </div>
      
      {/* Dots */}
      <div className="flex justify-center space-x-3 space-x-reverse mt-6">
        {banners.map((_, i) => (
          <button 
            key={i}
            onClick={() => {
              setIsTransitioning(true);
              setIndex(bannerCount + i);
            }}
            className={`h-2 rounded-full transition-all duration-500 ${
              activeDot === i 
                ? "bg-brand-orange w-8 shadow-md shadow-brand-orange/20" 
                : "bg-gray-300 w-2 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const CustomerDashboardOverview = ({ orders, user, t, lang, onViewHistory }: { orders: Order[], user: User | null, t: any, lang: Language, onViewHistory: (orderName: string, firebaseId?: string, status?: string, createdAt?: string) => void }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const isRtl = lang === 'ar';
  
  const customerOrders = useMemo(() => orders.filter(o => 
    o.userId === user?.uid || 
    o.email?.toLowerCase() === user?.email?.toLowerCase()
  ), [orders, user]);

  const downloadInvoicePDF = (order: Order) => {
    const dir = isRtl ? 'rtl' : 'ltr';
    const date = new Date(order.createdAt).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceNum = order.invoiceName || order.odooOrderName || `#${order.firebaseId.slice(0,8).toUpperCase()}`;
    const html = `<!DOCTYPE html><html dir="${dir}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoiceNum}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: ${isRtl ? "'Tajawal', Arial" : "Arial"}, sans-serif; background:#fff; color:#1a1a2e; padding:40px; direction:${dir}; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:3px solid #FF6B35; }
    .logo-block { display:flex; align-items:center; gap:12px; }
    .logo-block img { height:60px; object-fit:contain; }
    .company-name { font-size:20px; font-weight:800; color:#1a1a2e; }
    .company-sub { font-size:11px; color:#888; margin-top:2px; }
    .inv-meta { text-align:${isRtl ? 'left' : 'right'}; }
    .inv-title { font-size:28px; font-weight:900; color:#FF6B35; letter-spacing:2px; }
    .inv-num { font-size:13px; color:#666; margin-top:4px; font-family:monospace; }
    .inv-date { font-size:12px; color:#999; margin-top:2px; }
    .section { margin-bottom:28px; }
    .section-title { font-size:11px; font-weight:700; color:#FF6B35; text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
    .info-box { background:#f8f9fa; border-radius:12px; padding:16px 20px; }
    .info-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; }
    .info-label { color:#888; font-weight:600; }
    .info-value { color:#1a1a2e; font-weight:700; font-family:monospace; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:#1a1a2e; color:#fff; padding:12px 16px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    td { padding:12px 16px; border-bottom:1px solid #f0f0f0; font-size:13px; }
    tr:last-child td { border-bottom:none; }
    .total-row { background:#FF6B35; color:#fff; }
    .total-row td { font-size:16px; font-weight:800; padding:16px; }
    .footer-note { margin-top:40px; text-align:center; font-size:11px; color:#bbb; }
    .status-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#e8f5e9; color:#2e7d32; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-block">
      <img src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" alt="Logo"/>
      <div>
        <div class="company-name">${isRtl ? 'شركة حقال للتجارة' : 'Hakkal Trading Company'}</div>
        <div class="company-sub">Info@hakkal-est.com</div>
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">${isRtl ? 'فاتورة' : 'INVOICE'}</div>
      <div class="inv-num">${invoiceNum}</div>
      <div class="inv-date">${date}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isRtl ? 'تفاصيل الطلب' : 'Order Details'}</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">${isRtl ? 'رقم الطلب' : 'Order Number'}</span><span class="info-value">${order.odooOrderName || '-'}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'رقم الفاتورة' : 'Invoice Number'}</span><span class="info-value">${invoiceNum}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'تاريخ الطلب' : 'Order Date'}</span><span class="info-value">${date}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'الحالة' : 'Status'}</span><span class="status-badge">${order.status}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${isRtl ? 'المنتجات' : 'Products'}</div>
    <table>
      <thead><tr>
        <th>${isRtl ? 'المنتج' : 'Product'}</th>
        <th>${isRtl ? 'الكمية' : 'Qty'}</th>
        <th>${isRtl ? 'السعر' : 'Price'}</th>
        <th>${isRtl ? 'المجموع' : 'Total'}</th>
      </tr></thead>
      <tbody>
        ${(order.items || []).map((item: any) => `
          <tr>
            <td>${item.name || item.productName || '-'}</td>
            <td>${item.quantity || item.qty || 1}</td>
            <td>${item.price?.toLocaleString() || '-'} ⃁</td>
            <td>${((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString()} ⃁</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="3">${isRtl ? 'الإجمالي' : 'TOTAL'}</td>
          <td>${order.total?.toLocaleString()} ⃁</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer-note">
    ${isRtl ? 'شكراً لتعاملكم معنا — شركة حقال للتجارة' : 'Thank you for your business — Hakkal Trading Company'}
    <br/>Info@hakkal-est.com
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const syncStatuses = useCallback(async (manual = false) => {
    if (customerOrders.length === 0) {
      if (manual) alert(t.orders.dashboard.noOrdersToSync);
      return;
    }
    if (isSyncing && !manual) return;
    
    setIsSyncing(true);
    if (manual) {
      alert(lang === 'ar' ? 'بدأ عملية المزامنة... يرجى الانتظار' : 'Syncing started... please wait');
    }
    
    try {
      // Batch processing: max 3 requests at a time, 2s gap between batches
      const batchSize = 3;
      const ordersToSync = customerOrders.filter(o => o.odooOrderName);
      
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        const batch = ordersToSync.slice(i, i + batchSize);
        await Promise.all(batch.map(async (order) => {
          try {
            const safeOdooOrderName = encodeURIComponent(order.odooOrderName!);
            const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
            const data = await resp.json();
            
            if (data.success && data.state) {
              let newStatus = order.status;
              if (data.isDelivered) newStatus = 'completed';
              else if (data.isShipped) newStatus = 'shipped';
              else if (data.isApproved) newStatus = 'approved';
              else if (['cancel', 'rejected'].includes(data.state)) newStatus = 'rejected';

              if (newStatus !== order.status || data.state !== order.odooState || data.invoiceName !== order.invoiceName) {
                await updateDoc(doc(db, "orders", order.firebaseId), { 
                  status: newStatus,
                  odooState: data.state,
                  invoiceName: data.invoiceName || null,
                  lastSyncAt: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            console.error(`[Status Sync] Error for ${order.odooOrderName}:`, e);
          }
        }));
        
        if (i + batchSize < ordersToSync.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      if (manual) {
        alert(t.orders.dashboard.statusesUpdated);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [customerOrders, isSyncing, lang]);

  useEffect(() => {
    // Throttle: only auto-sync once every 30 minutes to save Vercel function invocations
    const THROTTLE_KEY = `last_sync_dashboard_${user?.uid}`;
    const lastSync = localStorage.getItem(THROTTLE_KEY);
    const thirtyMin = 30 * 60 * 1000;
    if (!lastSync || Date.now() - parseInt(lastSync) > thirtyMin) {
      syncStatuses();
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingOrders = customerOrders.filter(o => o.status === 'pending_approval' || o.status === 'pending_payment' || o.status === 'processing');
  
  return (
    <div className="space-y-8">

      <div className="flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={lang === 'ar' ? 'text-right' : 'text-left'}
        >
          <h1 className="text-3xl font-serif text-brand-navy font-bold">{t.orders.dashboard.title}</h1>
          <p className="text-gray-500 mt-2">{t.orders.dashboard.subtitle}</p>
        </motion.div>

        <button 
          onClick={() => syncStatuses(true)}
          disabled={isSyncing}
          className={`flex items-center space-x-2 space-x-reverse px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg ${
            isSyncing 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-brand-orange text-white hover:bg-brand-orange-hover shadow-brand-orange/20 hover:scale-105 active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? t.orders.dashboard.updating : t.orders.dashboard.syncStatus}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {[
          { 
            label: t.orders.dashboard.totalOrders, 
            value: customerOrders.length, 
            icon: ShoppingBag, 
            bg: 'bg-brand-orange/10', 
            text: 'text-brand-orange' 
          },
          { 
            label: t.orders.dashboard.pendingOrders, 
            value: pendingOrders.length, 
            icon: Package, 
            bg: 'bg-blue-50', 
            text: 'text-blue-600' 
          },
          { 
            label: t.orders.dashboard.completedOrders, 
            value: customerOrders.filter(o => ['approved', 'shipped', 'completed'].includes(o.status)).length, 
            icon: Check, 
            bg: 'bg-emerald-50', 
            text: 'text-emerald-600' 
          }
        ].map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 md:w-12 md:h-12 ${card.bg} rounded-xl md:rounded-2xl flex items-center justify-center ${card.text}`}>
                <card.icon size={20} className="md:w-6 md:h-6" />
              </div>
              <span className="text-xl md:text-2xl font-serif font-bold text-brand-navy">{card.value}</span>
            </div>
            <p className={`text-gray-400 text-[10px] font-bold uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 p-5 md:p-8"
      >
        <div className={`flex items-center justify-between mb-6 md:mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-lg md:text-xl font-serif text-brand-navy font-bold">{t.orders.dashboard.recentOrders}</h3>
          <button 
            onClick={() => window.location.href = '/dashboard/orders'}
            className="text-brand-orange text-[10px] font-bold uppercase tracking-widest hover:underline"
          >
            {t.orders.dashboard.viewAll}
          </button>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className={`pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.orderId}</th>
                <th className={`pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.date}</th>
                <th className={`pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.invoiceId}</th>
                <th className={`pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.total}</th>
                <th className={`pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customerOrders.slice(0, 5).map((order) => (
                <tr key={order.firebaseId} className="group hover:bg-gray-50/50 transition-colors">
                  <td className={`py-5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className={`py-5 text-xs text-gray-500 ${isRtl ? 'text-right' : 'text-left'}`}>{new Date(order.createdAt).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US')}</td>
                  <td className={`py-5 ${isRtl ? 'text-right' : 'text-left'}`} style={{ minWidth: '140px' }}>
                    <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                      {order.invoiceName ? (
                        <span className="text-[10px] font-mono font-bold text-brand-navy bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 leading-tight">
                          {order.invoiceName}
                        </span>
                      ) : order.odooOrderName ? (
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-dashed border-gray-200 leading-tight" title={t.orders.dashboard.invoiceNotIssued}>
                          {order.odooOrderName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">-</span>
                      )}
                      <button
                        onClick={() => downloadInvoicePDF(order)}
                        title={t.orders.dashboard.downloadInvoicePdf}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-navy text-white text-[10px] font-bold hover:bg-brand-orange transition-all shadow-sm flex-shrink-0"
                      >
                        <FileText size={11} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                  <td className={`py-5 text-xs font-bold text-brand-navy ${isRtl ? 'text-right' : 'text-left'}`}>{t.products.pricePrefix}{order.total.toLocaleString()}</td>
                  <td className={`py-5 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {(() => {
                      const { label, color } = getStatusDetails(order.status, t);
                      return (
                        <button
                          onClick={() => onViewHistory(order.odooOrderName || '', order.firebaseId, order.status, order.createdAt)}
                          className={`px-5 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 inline-block whitespace-normal max-w-[250px] leading-relaxed text-center cursor-pointer ${color}`}
                          title={t.orders.dashboard.viewSequence}
                        >
                          {label}
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-4">
          {customerOrders.slice(0, 5).map((order) => {
            const { label, color } = getStatusDetails(order.status, t);
            return (
              <div key={order.firebaseId} className="p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className={`flex justify-between items-start ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                    <p className={`text-[10px] text-gray-500 mt-1 ${isRtl ? 'text-right' : 'text-left'}`}>{new Date(order.createdAt).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US')}</p>
                  </div>
                  <button
                    onClick={() => onViewHistory(order.odooOrderName || '', order.firebaseId, order.status, order.createdAt)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border shadow-sm ${color}`}
                  >
                    {label}
                  </button>
                </div>
                <div className={`flex justify-between items-end ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={isRtl ? 'text-right' : 'text-left'}>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">{t.orders.dashboard.total}</p>
                    <p className="text-sm font-bold text-brand-navy">{t.products.pricePrefix}{order.total.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => downloadInvoicePDF(order)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-brand-navy text-[10px] font-bold hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    <FileText size={14} className="text-brand-orange" />
                    <span>{isRtl ? 'الفاتورة' : 'Invoice'} PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {customerOrders.length === 0 && (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <ShoppingBag size={24} />
              </div>
              <p className="text-gray-400 italic text-xs">{t.orders.dashboard.noOrders}</p>
            </div>
          </div>
        )}
      </motion.div>

    </div>
  );
};

const CustomerShop = ({ products, cart, onAddToCart, onUpdateQuantity, onSetManualQuantity, onRemoveFromCart, onCheckout, t, lang }: { products: Product[], cart: CartItem[], onAddToCart: (p: Product) => void, onUpdateQuantity: (id: number, delta: number) => void, onSetManualQuantity: (id: number, val: string) => void, onRemoveFromCart: (id: number) => void, onCheckout: () => void, t: any, lang: Language }) => {
  const isRtl = lang === 'ar';
  const [search, setSearch] = useState('');
  const [showOffer, setShowOffer] = useState(true);
  const navigate = useNavigate();

  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = parseFloat((item.discountPrice || item.price).replace(/[^\d.]/g, ''));
      return sum + (p * item.quantity);
    }, 0);
  }, [cart]);

  return (
    <div className="space-y-6 pb-24">
      {/* Offers Modal Popup */}
      <AnimatePresence>
        {showOffer && (() => {
          const discounted = products.filter(p => p.discountPrice);
          if (discounted.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowOffer(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', damping: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-brand-orange to-amber-400 p-6 flex-shrink-0">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
                  </div>
                  <div className={`relative flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <h2 className="text-white font-bold text-xl">
                        🔥 {isRtl ? 'عروض حصرية!' : 'Special Offers!'}
                      </h2>
                      <p className="text-white/80 text-sm mt-1">
                        {isRtl
                          ? `${discounted.length} منتج بخصم خاص لك`
                          : `${discounted.length} products with special discount`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOffer(false)}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Discounted Products */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                  {discounted.map(p => {
                    const cartItem = cart.find(ci => ci.id === p.id);
                    const orig = parseFloat(p.price.replace(/[^\d.]/g, ''));
                    const disc = parseFloat(p.discountPrice!.replace(/[^\d.]/g, ''));
                    const pct  = Math.round((1 - disc / orig) * 100);
                    return (
                      <div key={p.id} className={`flex items-center gap-4 bg-gray-50 rounded-2xl p-3 hover:bg-orange-50 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 shadow-sm">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <p className="text-brand-navy font-bold text-sm line-clamp-1">{p.name}</p>
                          <div className={`flex items-center gap-2 mt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className="text-brand-orange font-bold text-base">{t.products.pricePrefix}{disc.toLocaleString()}</span>
                            <span className="text-gray-400 text-xs line-through">{t.products.pricePrefix}{orig.toLocaleString()}</span>
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{pct}%</span>
                          </div>
                        </div>
                        
                        {cartItem ? (
                           <div className="flex items-center bg-brand-navy rounded-xl p-1 gap-2">
                             <button onClick={() => onRemoveFromCart(p.id)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white"><Trash2 size={14}/></button>
                             <input 
                               type="number"
                               value={cartItem.quantity}
                               onChange={(e) => { e.stopPropagation(); onSetManualQuantity(p.id, e.target.value); }}
                               onClick={(e) => e.stopPropagation()}
                               className="bg-white/10 text-white font-bold text-sm w-10 text-center border-none focus:ring-0 rounded-lg"
                             />
                             <button onClick={() => onUpdateQuantity(p.id, 1)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white"><Plus size={14}/></button>
                           </div>
                        ) : (
                          <button
                            onClick={() => onAddToCart(p)}
                            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-brand-navy text-white hover:bg-brand-orange transition-all shadow-md"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => setShowOffer(false)}
                    className="w-full bg-brand-navy text-white py-3 rounded-2xl font-bold text-sm hover:bg-brand-orange transition-all"
                  >
                    {isRtl ? 'تصفح جميع المنتجات' : 'Browse All Products'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Header + Search */}
      <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <h1 className="text-2xl font-serif text-brand-navy font-bold">{t.orders.dashboard.shopNow}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} {isRtl ? 'منتج' : 'products'}</p>
        </div>

        <div className={`relative flex-shrink-0 w-full sm:w-72`}>
          <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRtl ? 'ابحث عن منتج...' : 'Search products...'}
            className={`w-full bg-white border border-gray-200 rounded-2xl py-2.5 text-sm text-brand-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all ${isRtl ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4 text-left'}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isRtl ? 'left-3' : 'right-3'}`}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{isRtl ? 'لا توجد نتائج' : 'No results found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((p, i) => {
            const cartItem = cart.find(ci => ci.id === p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-orange/20 transition-all group flex flex-col overflow-hidden relative"
              >
                <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '1/1' }}>
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Brand badge */}
                  <div className="absolute bottom-1.5 start-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-1">
                    <img
                      src="https://i.ibb.co/FTqMcyG/Untitled-design.png"
                      alt="Brand"
                      className="h-5 w-auto object-contain mix-blend-multiply"
                    />
                  </div>

                  {!cartItem && (
                    <button
                      onClick={() => onAddToCart(p)}
                      className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <div className="bg-white text-brand-navy rounded-full p-2.5 shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                        <ShoppingCart size={20} />
                      </div>
                    </button>
                  )}
                </div>

                <div className={`p-2.5 flex flex-col flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <p className="text-brand-navy font-bold text-[11px] leading-snug line-clamp-2 mb-1 group-hover:text-brand-orange transition-colors">
                    {p.name}
                  </p>
                  <div className={`flex items-center justify-between mt-auto pt-1.5 border-t border-gray-50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-brand-orange font-bold text-sm">
                      {t.products.pricePrefix}{String(p.price).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}
                    </span>
                    {!cartItem ? (
                      <button
                        onClick={() => onAddToCart(p)}
                        className="w-7 h-7 bg-brand-navy text-white rounded-xl flex items-center justify-center hover:bg-brand-orange hover:scale-110 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {activePill === p.id ? (
                          <div className="bg-brand-navy rounded-lg flex items-center p-0.5 shadow-md border border-white/10 scale-110">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, -1); }}
                              className="p-1 hover:bg-white/10 text-white transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <input 
                              type="number"
                              value={cartItem.quantity}
                              onChange={(e) => { e.stopPropagation(); onSetManualQuantity(p.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setActivePill(null)}
                              autoFocus
                              className="bg-transparent text-white font-bold text-[11px] w-7 text-center border-none focus:ring-0 p-0"
                            />
                            <button 
                              onClick={(e) => { e.stopPropagation(); onUpdateQuantity(p.id, 1); }}
                              className="p-1 hover:bg-white/10 text-white transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActivePill(p.id); }}
                            className="relative w-8 h-8 bg-brand-navy text-white rounded-lg flex items-center justify-center hover:bg-brand-orange transition-all shadow-md group/cart"
                          >
                            <ShoppingCart size={14} />
                            <div className="absolute -top-1.5 -right-1.5 bg-brand-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                              {cartItem.quantity}
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* STICKY CHECKOUT BAR */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-brand-navy/10 p-4 pb-8 md:pb-4 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isRtl ? 'إجمالي السلة' : 'Total Basket'}</p>
                <p className="text-xl font-serif font-bold text-brand-navy">
                  {t.products.pricePrefix}{cartTotal.toLocaleString()}
                </p>
              </div>
              <button
                onClick={onCheckout}
                className="flex-1 max-w-sm bg-brand-navy text-white py-4 rounded-2xl font-bold text-sm tracking-widest hover:bg-brand-orange transition-all shadow-xl shadow-brand-navy/10 flex items-center justify-center gap-2"
              >
                <ShoppingBag size={18} />
                <span>{isRtl ? 'إتمام الطلب الآن' : 'CHECKOUT NOW'}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{cart.length}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomerOrders = ({ orders, user, t, lang, onViewHistory, loadingHistory, historyOrder }: { 
  orders: Order[], 
  user: User | null, 
  t: any, 
  lang: Language, 
  onViewHistory: (orderName: string, firebaseId?: string, status?: string, createdAt?: string) => void,
  loadingHistory: boolean,
  historyOrder: Order | null
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingIndividual, setIsSyncingIndividual] = useState<string | null>(null);

  const customerOrders = useMemo(() => orders.filter(o => 
    o.userId === user?.uid || 
    o.email?.toLowerCase() === user?.email?.toLowerCase()
  ), [orders, user]);

  const isRtl = lang === 'ar';

  const downloadInvoicePDF = (order: Order) => {
    const dir = isRtl ? 'rtl' : 'ltr';
    const date = new Date(order.createdAt).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceNum = order.invoiceName || order.odooOrderName || `#${order.firebaseId.slice(0,8).toUpperCase()}`;
    const html = `<!DOCTYPE html><html dir="${dir}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoiceNum}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: ${isRtl ? "'Tajawal', Arial" : 'Arial'}, sans-serif; background:#fff; color:#1a1a2e; padding:40px; direction:${dir}; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:3px solid #FF6B35; }
    .logo-block { display:flex; align-items:center; gap:12px; }
    .logo-block img { height:60px; object-fit:contain; }
    .company-name { font-size:20px; font-weight:800; color:#1a1a2e; }
    .company-sub { font-size:11px; color:#888; margin-top:2px; }
    .inv-meta { text-align:${isRtl ? 'left' : 'right'}; }
    .inv-title { font-size:28px; font-weight:900; color:#FF6B35; letter-spacing:2px; }
    .inv-num { font-size:13px; color:#666; margin-top:4px; font-family:monospace; }
    .inv-date { font-size:12px; color:#999; margin-top:2px; }
    .section { margin-bottom:28px; }
    .section-title { font-size:11px; font-weight:700; color:#FF6B35; text-transform:uppercase; letter-spacing:2px; margin-bottom:10px; }
    .info-box { background:#f8f9fa; border-radius:12px; padding:16px 20px; }
    .info-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; }
    .info-label { color:#888; font-weight:600; }
    .info-value { color:#1a1a2e; font-weight:700; font-family:monospace; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:#1a1a2e; color:#fff; padding:12px 16px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    td { padding:12px 16px; border-bottom:1px solid #f0f0f0; font-size:13px; }
    .total-row { background:#FF6B35; color:#fff; }
    .total-row td { font-size:16px; font-weight:800; padding:16px; }
    .footer-note { margin-top:40px; text-align:center; font-size:11px; color:#bbb; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-block">
      <img src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" alt="Logo"/>
      <div>
        <div class="company-name">${isRtl ? 'شركة حقال للتجارة' : 'Hakkal Trading Company'}</div>
        <div class="company-sub">Info@hakkal-est.com</div>
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">${isRtl ? 'فاتورة' : 'INVOICE'}</div>
      <div class="inv-num">${invoiceNum}</div>
      <div class="inv-date">${date}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">${isRtl ? 'تفاصيل الطلب' : 'Order Details'}</div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">${isRtl ? 'رقم الطلب' : 'Order Number'}</span><span class="info-value">${order.odooOrderName || '-'}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'رقم الفاتورة' : 'Invoice Number'}</span><span class="info-value">${invoiceNum}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'تاريخ الطلب' : 'Order Date'}</span><span class="info-value">${date}</span></div>
      <div class="info-row"><span class="info-label">${isRtl ? 'الحالة' : 'Status'}</span><span class="info-value">${order.status}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">${isRtl ? 'المنتجات' : 'Products'}</div>
    <table>
      <thead><tr>
        <th>${isRtl ? 'المنتج' : 'Product'}</th>
        <th>${isRtl ? 'الكمية' : 'Qty'}</th>
        <th>${isRtl ? 'السعر' : 'Price'}</th>
        <th>${isRtl ? 'المجموع' : 'Total'}</th>
      </tr></thead>
      <tbody>
        ${(order.items || []).map((item: any) => `
          <tr><td>${item.name || item.productName || '-'}</td><td>${item.quantity || item.qty || 1}</td><td>${item.price?.toLocaleString() || '-'} ⃁</td><td>${((item.price||0)*(item.quantity||item.qty||1)).toLocaleString()} ⃁</td></tr>
        `).join('')}
        <tr class="total-row"><td colspan="3">${isRtl ? 'الإجمالي' : 'TOTAL'}</td><td>${order.total?.toLocaleString()} ⃁</td></tr>
      </tbody>
    </table>
  </div>
  <div class="footer-note">${isRtl ? 'شكراً لتعاملكم معنا — شركة حقال للتجارة' : 'Thank you for your business — Hakkal Trading Company'}<br/>Info@hakkal-est.com</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const syncIndividualOrder = useCallback(async (order: Order) => {
    if (!order.odooOrderName) return;
    
    setIsSyncingIndividual(order.firebaseId);
    try {
      const safeOdooOrderName = encodeURIComponent(order.odooOrderName);
      const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
      
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      
      const data = await resp.json();
      if (data.success && data.state) {
        let newStatus = order.status;
        if (data.isDelivered) newStatus = 'completed';
        else if (data.isShipped) newStatus = 'shipped';
        else if (data.isApproved) newStatus = 'approved';
        else if (['cancel', 'rejected'].includes(data.state)) newStatus = 'rejected';

        if (newStatus !== order.status || data.state !== order.odooState || data.invoiceName !== order.invoiceName) {
          const orderRef = doc(db, "orders", order.firebaseId);
          await updateDoc(orderRef, { 
            status: newStatus,
            odooState: data.state,
            invoiceName: data.invoiceName || null,
            lastSyncAt: new Date().toISOString()
          });
          
          const statusLabels: any = {
            approved: t.orders.statuses.approved,
            shipped: t.orders.statuses.shipped,
            completed: t.orders.statuses.completed
          };
          
          /* Removed alert for better UX */
        } else {
          /* Removed alert for better UX */
        }
      }
    } catch (e: any) {
      console.error("[Individual Sync] Error:", e);
      /* Removed alert for better UX */
    } finally {
      setIsSyncingIndividual(null);
    }
  }, [lang]);

  const syncStatuses = useCallback(async (manual = false) => {
    if (manual) {
      console.log(lang === 'ar' ? 'بدأ عملية المزامنة... يرجى الانتظار' : 'Syncing started... please wait');
    }
    
    if (customerOrders.length === 0) {
      if (manual) console.log(lang === 'ar' ? 'لا يوجد طلبات للمزامنة' : 'No orders to sync');
      return;
    }
    if (isSyncing && !manual) return;
    
    setIsSyncing(true);
    console.log(`[Status Sync] ${manual ? 'Manual' : 'Auto'} sync checking ${customerOrders.length} orders...`);
    
    try {
      if (manual) {
        console.log(`[Status Sync] Starting manual sync for ${customerOrders.length} orders.`);
      }

      for (const order of customerOrders) {
        const hasOdooName = !!order.odooOrderName;
        
        // Allow manual sync to check any order, but auto-sync skips non-terminal statuses unless invoice is missing
        const shouldSync = manual || (
          hasOdooName && (
            ['pending_approval', 'processing', 'approved', 'shipped'].includes(order.status) || 
            (order.status === 'completed' && !order.invoiceName)
          )
        );

        if (manual && !hasOdooName) {
          console.warn(`[Status Sync] Order ${order.firebaseId} is missing Odoo Order Name. Cannot sync.`);
          continue;
        }

        if (hasOdooName && shouldSync) {
          try {
            const safeOdooOrderName = encodeURIComponent(order.odooOrderName);
            const statusUrl = getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`);
            
            console.log(`[Status Sync] Fetching status for ${order.odooOrderName} from: ${statusUrl}`);
            const resp = await fetch(statusUrl);
            
            if (!resp.ok) {
              let errorMessage = `HTTP Error ${resp.status}`;
              try {
                const errorData = await resp.json();
                if (errorData.message) errorMessage = errorData.message;
                else if (errorData.error) errorMessage = errorData.error;
              } catch (e) {
                // Use text fallback if JSON parsing fails
                try {
                  const text = await resp.text();
                  if (text && text.length < 200) errorMessage = text;
                } catch (e2) {}
              }
              
              console.error(`[Status Sync] ${errorMessage} for ${order.odooOrderName}`);
              /* Removed alert for better UX */
              continue;
            }

            const data = await resp.json();
            console.log(`[Status Sync] Received data for ${order.odooOrderName}:`, data);
            
            if (data.debug) {
              console.log(`[Status Sync] Debug info for ${order.odooOrderName}:`, {
                state: data.state,
                isApproved: data.isApproved,
                isShipped: data.isShipped,
                isDelivered: data.isDelivered,
                pickings: data.debug.pickings
              });
            }

            if (data.success && data.state) {
              let newStatus = order.status;
              
              // Map Odoo data to Website statuses - CHECK IN THIS ORDER:
              // 1. delivered (done) → completed (تم التسليم)
              // 2. shipped (assigned/in_pack) → shipped (تم الشحن)
              // 3. approved (sale/done) → approved (تم الموافقة)
              if (data.isDelivered) {
                newStatus = 'completed'; // تم التسليم
              } else if (data.isShipped) {
                newStatus = 'shipped'; // تم الشحن
              } else if (data.isApproved) {
                newStatus = 'approved'; // تم الموافقة
              } else if (['cancel', 'rejected'].includes(data.state)) {
                newStatus = 'rejected';
              }

              const hasStatusChanged = newStatus !== order.status;
              const hasStateChanged = data.state !== order.odooState;
              const hasInvoiceChanged = data.invoiceName !== order.invoiceName;

              if (hasStatusChanged || hasStateChanged || hasInvoiceChanged) {
                console.log(`[Status Sync] ${order.odooOrderName}: Updating Firestore (Status: ${order.status}->${newStatus}, State: ${order.odooState}->${data.state})`);
                const orderRef = doc(db, "orders", order.firebaseId);
                await updateDoc(orderRef, { 
                  status: newStatus,
                  odooState: data.state,
                  invoiceName: data.invoiceName || null,
                  lastSyncAt: new Date().toISOString()
                });
                
                if (manual && hasStatusChanged) {
                  /* Removed alert for better UX */
                } else if (manual) {
                  /* Removed alert for better UX */
                }
              } else if (manual) {
                /* Removed alert for better UX */
              }
            } else if (manual) {
              /* Removed alert for better UX */
            }
          } catch (e: any) {
            console.error(`[Status Sync] Exception for ${order.odooOrderName}:`, e);
            if (manual) {
              /* Removed alert for better UX */
            }
          }
        } 
        // Case 2: Missing Odoo name
        else if (!order.odooOrderName && order.status === 'pending_approval') {
          try {
            console.log(`[Status Sync] Looking up missing Odoo ID for: ${order.firebaseId}`);
            const lookupResp = await fetch(getApiUrl("/api/odoo/lookup-order"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: order.email,
                total: order.total,
                createdAt: order.createdAt
              })
            });
            const lookupData = await lookupResp.json();
            
            if (lookupData.success && lookupData.data) {
              console.log(`[Status Sync] Found match: ${lookupData.data.name}`);
              await updateDoc(doc(db, "orders", order.firebaseId), {
                odooOrderName: lookupData.data.name,
                odooOrderId: lookupData.data.id,
                syncStatus: 'success',
                syncedAt: new Date().toISOString()
              });
            } else {
              console.warn(`[Status Sync] No Odoo match found for order ${order.firebaseId}`);
            }
          } catch (e) {
            console.error("[Status Sync] Lookup error:", e);
          }
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [customerOrders, isSyncing, lang]);

  useEffect(() => {
    // Throttle: only auto-sync once every 30 minutes to save Vercel function invocations
    const THROTTLE_KEY = `last_sync_orders_${user?.uid}`;
    const lastSync = localStorage.getItem(THROTTLE_KEY);
    const thirtyMin = 30 * 60 * 1000;
    if (!lastSync || Date.now() - parseInt(lastSync) > thirtyMin) {
      syncStatuses();
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={lang === 'ar' ? 'text-right' : 'text-left'}
        >
          <h1 className="text-3xl font-serif text-brand-navy font-bold">{t.orders.dashboard.myOrders}</h1>
          <p className="text-gray-500 mt-2">{t.orders.dashboard.ordersSubtitle}</p>
        </motion.div>
        
        <button 
          onClick={() => syncStatuses(true)}
          disabled={isSyncing}
          className={`flex items-center space-x-2 space-x-reverse px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg ${
            isSyncing 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-brand-orange text-white hover:bg-brand-orange-hover shadow-brand-orange/20 hover:scale-105 active:scale-95'
          }`}
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? t.orders.dashboard.updating : t.orders.dashboard.syncStatus}</span>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.orderId}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.date}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.products}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.total}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.odooId}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.invoiceId}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.status}</th>
                <th className={`px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.orders.dashboard.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customerOrders.map((order) => (
                <tr key={order.firebaseId} className="hover:bg-gray-50/50 transition-colors group">
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className={`px-8 py-6 text-xs text-gray-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US')}</td>
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="flex flex-col space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className={`flex items-center space-x-2 ${lang === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <span className="text-xs text-brand-navy font-bold">{item.quantity}×</span>
                          <span className="text-xs text-gray-600">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className={`px-8 py-6 text-xs font-bold text-brand-navy ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.products.pricePrefix}{order.total.toLocaleString()}</td>
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    {order.odooOrderName ? (
                      <button 
                        onClick={async () => {
                          const newWindow = window.open('', '_blank');
                          if (!newWindow) {
                            alert(t.orders.dashboard.allowPopups);
                            return;
                          }
                          newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;">${t.orders.dashboard.loadingQuotation}</div>`);
                          try {
                            const resp = await fetch(getApiUrl(`/api/odoo/order-portal/${encodeURIComponent(order.odooOrderName!)}`));
                            const data = await resp.json();
                            if (data.success && data.url) {
                              newWindow.location.href = data.url;
                            } else {
                              newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationNotFound}</div>`);
                            }
                          } catch(e) {
                            newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationError}</div>`);
                          }
                        }}
                        title={t.orders.dashboard.viewQuotation}
                        className="text-[10px] font-mono font-bold text-brand-orange bg-brand-orange/10 px-3 py-1.5 rounded-lg border border-brand-orange/20 hover:bg-brand-orange hover:text-white transition-colors cursor-pointer"
                      >
                        {order.odooOrderName}
                      </button>
                    ) : (
                      <div className={`flex items-center space-x-2 ${lang === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
                        <span className="text-[10px] text-gray-400 italic">{t.orders.dashboard.syncing}</span>
                      </div>
                    )}
                  </td>
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`} style={{ minWidth: '160px' }}>
                    <div className={`flex items-center gap-2 flex-wrap ${lang === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                      {order.invoiceName ? (
                        <span className="text-[10px] font-mono font-bold text-brand-navy bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 leading-tight">
                          {order.invoiceName}
                        </span>
                      ) : order.odooOrderName ? (
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-dashed border-gray-200 leading-tight">
                          {order.odooOrderName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">-</span>
                      )}
                      <button
                        onClick={() => downloadInvoicePDF(order)}
                        title={t.orders.dashboard.downloadPdf}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-navy text-white text-[10px] font-bold hover:bg-brand-orange transition-all shadow-sm flex-shrink-0"
                      >
                        <FileText size={11} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    {(() => {
                      const { label, color } = getStatusDetails(order.status, t);
                      return (
                        <button
                          onClick={() => onViewHistory(order.odooOrderName || '', order.firebaseId, order.status, order.createdAt)}
                          className={`px-5 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 inline-block whitespace-normal max-w-[250px] leading-relaxed text-center cursor-pointer ${color}`}
                          title={t.orders.dashboard.viewSequence}
                        >
                          {label}
                        </button>
                      );
                    })()}
                  </td>
                  <td className={`px-8 py-6 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                    <div className={`flex items-center ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
                      {order.odooOrderName && (
                        <button 
                          onClick={() => syncIndividualOrder(order)}
                          disabled={isSyncingIndividual === order.firebaseId}
                          title={t.orders.dashboard.updateStatus}
                          className={`p-2.5 rounded-xl transition-all ${
                            isSyncingIndividual === order.firebaseId
                              ? 'bg-gray-50 text-gray-300'
                              : 'text-brand-orange hover:bg-brand-orange/10 active:scale-95'
                          }`}
                        >
                          <RefreshCw size={18} className={isSyncingIndividual === order.firebaseId ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customerOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                        <ShoppingBag size={40} />
                      </div>
                      <p className="text-gray-400 italic text-sm">{t.orders.dashboard.noOrdersYet}</p>
                      <button className="bg-brand-navy text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-orange transition-colors">
                        {t.orders.dashboard.shopNow}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {customerOrders.map((order) => {
            const { label, color } = getStatusDetails(order.status, t);
            return (
              <div key={order.firebaseId} className="p-6 space-y-4">
                <div className={`flex justify-between items-start ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{order.firebaseId.slice(0, 8).toUpperCase()}</span>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US')}
                    </div>
                  </div>
                  <button
                    onClick={() => onViewHistory(order.odooOrderName || '', order.firebaseId, order.status, order.createdAt)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold border shadow-sm transition-all ${color}`}
                  >
                    {label}
                  </button>
                </div>

                <div className={`space-y-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <div className="space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className={`flex items-center space-x-2 ${lang === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <span className="text-xs text-brand-navy font-bold">{item.quantity}×</span>
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{t.orders.dashboard.total}</span>
                    <span className="text-sm font-bold text-brand-navy">{t.products.pricePrefix}{order.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-2 flex-wrap ${lang === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {order.odooOrderName ? (
                    <button 
                      onClick={async () => {
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;">${t.orders.dashboard.loadingQuotation}</div>`);
                          try {
                            const resp = await fetch(getApiUrl(`/api/odoo/order-portal/${encodeURIComponent(order.odooOrderName!)}`));
                            const data = await resp.json();
                            if (data.success && data.url) newWindow.location.href = data.url;
                            else newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationNotFound}</div>`);
                          } catch(e) {
                            newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationError}</div>`);
                          }
                        }
                      }}
                      className="text-[10px] font-mono font-bold text-brand-orange bg-brand-orange/10 px-3 py-1.5 rounded-lg border border-brand-orange/20"
                    >
                      {order.odooOrderName}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1 space-x-reverse bg-gray-50 px-3 py-1.5 rounded-lg border border-dashed border-gray-200">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
                      <span className="text-[10px] text-gray-400 italic">{t.orders.dashboard.syncing}</span>
                    </div>
                  )}

                  {order.invoiceName && (
                    <span className="text-[10px] font-mono font-bold text-brand-navy bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200">
                      {order.invoiceName}
                    </span>
                  )}

                  <button
                    onClick={() => downloadInvoicePDF(order)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-navy text-white text-[10px] font-bold"
                  >
                    <FileText size={11} />
                    <span>PDF</span>
                  </button>

                  {order.odooOrderName && (
                    <button 
                      onClick={() => syncIndividualOrder(order)}
                      disabled={isSyncingIndividual === order.firebaseId}
                      className={`p-2 rounded-lg border border-gray-100 ${
                        isSyncingIndividual === order.firebaseId ? 'bg-gray-50 text-gray-300' : 'text-brand-orange bg-white'
                      }`}
                    >
                      <RefreshCw size={14} className={isSyncingIndividual === order.firebaseId ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {customerOrders.length === 0 && (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mx-auto">
                <ShoppingBag size={32} />
              </div>
              <p className="text-gray-400 italic text-sm">{t.orders.dashboard.noOrdersYet}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CustomerProfile = ({ user, t, lang }: { user: User | null, t: any, lang: Language }) => {
  const [profile, setProfile] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data());
      });
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // 1. Delete user doc from Firestore
      await deleteDoc(doc(db, "users", user.uid));
      // 2. Delete user from Firebase Auth
      await deleteUser(user);
      // Success - user will be signed out automatically and redirected
      window.location.href = '/';
    } catch (error: any) {
      console.error("Delete account error:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert(lang === 'ar' ? 'يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى لإتمام هذه العملية (يتطلب ابل واجهزة الاندرويد مصادقة حديثة لعمليات الحذف).' : 'Please log out and log back in to perform this action (Apple and Android devices require a recent login for account deletion).');
      } else {
        alert(lang === 'ar' ? 'فشل حذف الحساب. يرجى المحاولة لاحقاً.' : 'Failed to delete account. Please try again later.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={lang === 'ar' ? 'text-right' : 'text-left'}
      >
        <h1 className="text-3xl font-serif text-brand-navy font-bold">{t.orders.dashboard.myProfile}</h1>
        <p className="text-gray-500 mt-2">{t.orders.dashboard.profileSubtitle}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl bg-white rounded-[2rem] shadow-sm border border-gray-100 p-10"
      >
        <div className="space-y-10">
          <div className={`flex items-center gap-6 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="w-20 h-20 bg-brand-orange/10 rounded-3xl flex items-center justify-center text-brand-orange flex-shrink-0">
              <UserIcon size={40} />
            </div>
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <h3 className="text-xl font-serif text-brand-navy font-bold">{profile?.facilityName || t.orders.dashboard.facilityName}</h3>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 pt-10 border-t border-gray-50">
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.orders.dashboard.phone}</label>
              <p className="text-brand-navy font-medium">{profile?.phoneNumber || 'N/A'}</p>
            </div>
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.orders.dashboard.address}</label>
              <p className="text-brand-navy font-medium">{profile?.address || 'N/A'}</p>
            </div>
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.orders.dashboard.city}</label>
              <p className="text-brand-navy font-medium">{profile?.city || 'N/A'}</p>
            </div>
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.orders.dashboard.joinedDate}</label>
              <p className="text-brand-navy font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US') : 'N/A'}</p>
            </div>
          </div>

          <div className="bg-brand-cream/50 p-6 rounded-2xl border border-brand-orange/10">
            <div className={`flex items-center gap-2 mb-3 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
              <p className="text-[10px] text-brand-orange font-bold uppercase tracking-widest">{t.orders.dashboard.note}</p>
            </div>
            <p className={`text-xs text-brand-navy/60 leading-relaxed ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              {t.orders.dashboard.profileNote}
            </p>
          </div>

          {/* Account Management Section */}
          <div className="pt-10 border-t border-gray-100 mt-8">
            <h4 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              {t.orders.dashboard.deleteAccountTitle}
            </h4>
            
            <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-[1.5rem] bg-red-50/30 border border-red-100 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                <p className="text-sm font-bold text-red-600 mb-1">{t.orders.dashboard.deleteAccount}</p>
                <p className="text-xs text-red-500/70 max-w-sm">{t.orders.dashboard.deleteAccountWarning}</p>
              </div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-white text-red-600 border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all duration-300 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm"
              >
                {t.orders.dashboard.deleteAccountBtn}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 max-w-md w-full overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mb-6">
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-serif text-brand-navy font-bold mb-4">
                  {t.orders.dashboard.deleteAccount}
                </h3>
                <p className="text-gray-500 leading-relaxed mb-8">
                  {t.orders.dashboard.deleteAccountConfirm}
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        {lang === 'ar' ? 'جاري الحذف...' : 'DELETING...'}
                      </>
                    ) : t.orders.dashboard.deleteAccountBtn}
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                  >
                    {t.orders.dashboard.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardLayout = ({ children, user, role, t, lang, onToggleLang, cartCount, onOpenCart, onOpenTerms, onOpenPrivacy, onOpenRefund }: { children: React.ReactNode, user: User | null, role: string | null, t: any, lang: Language, onToggleLang: () => void, cartCount?: number, onOpenCart?: () => void, onOpenTerms?: () => void, onOpenPrivacy?: () => void, onOpenRefund?: () => void }) => {
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data());
      });
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const adminMenuItems = [
    { name: t.orders.dashboard.overview, icon: <LayoutDashboard size={20} />, path: "/admin" },
    { name: t.orders.dashboard.orders, icon: <ShoppingBag size={20} />, path: "/admin/orders" },
    { name: t.orders.dashboard.products, icon: <Package size={20} />, path: "/admin/products" },
    { name: t.orders.dashboard.discounts, icon: <Percent size={20} />, path: "/admin/discounts" },
    { name: t.orders.dashboard.odooSync, icon: <RefreshCw size={20} />, path: "/admin/odoo" },
    { name: t.orders.dashboard.seoSettings, icon: <Search size={20} />, path: "/admin/seo" },
    { name: t.orders.dashboard.blog, icon: <FileText size={20} />, path: "/admin/blog" },
    { name: t.orders.dashboard.settings, icon: <Settings size={20} />, path: "/admin/settings" },
  ];

  const customerMenuItems = [
    { name: t.orders.dashboard.dashboardMenu, icon: <LayoutDashboard size={20} />, path: "/dashboard" },
    { name: t.orders.dashboard.shopNow, icon: <ShoppingBag size={20} />, path: "/dashboard/shop" },
    { name: t.orders.dashboard.myOrders, icon: <Package size={20} />, path: "/dashboard/orders" },
    { name: t.orders.dashboard.myProfile, icon: <UserIcon size={20} />, path: "/dashboard/profile" },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : customerMenuItems;

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  const isRtl = lang === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-brand-navy text-white flex flex-col fixed h-full z-[70] ${isRtl ? 'right-0' : 'left-0'} shadow-2xl transition-transform duration-300 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')
      }`}>
        <div className="p-8 border-b border-white/10">
        <div className="flex justify-between items-start">
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png"
                  alt="Hakkal Logo"
                  className="h-14 w-auto object-contain flex-shrink-0"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-base leading-tight">
                    {lang === 'ar' ? 'شركة حقال للتجارة' : 'Hakkal Trading'}
                  </span>
                  <span className="text-white/50 text-[10px] font-medium leading-tight mt-0.5">
                    {lang === 'ar' ? 'شركة' : 'Company'}
                  </span>
                </div>
              </div>
              <span className="text-white font-bold text-sm bg-white/10 px-3 py-2 rounded-lg w-full text-center">
                {role === 'admin' ? t.orders.dashboard.administration : (lang === 'ar' ? 'صفحة حساب العميل' : 'Customer Account Page')}
              </span>
            </div>
            <button className="md:hidden text-white/50 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className={`mt-6 flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-lg border border-white/20">
              {profile?.facilityName?.charAt(0) || user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-bold text-white truncate">{profile?.facilityName || (lang === 'ar' ? 'منشأة غير محددة' : 'Unknown Facility')}</p>
              <p className="text-[10px] text-white/60 truncate mt-0.5">{profile?.phoneNumber || user.email}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center p-3 rounded-lg transition-all ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'} ${
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
            className={`flex items-center p-3 w-full text-white/60 hover:text-white transition-colors ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}
          >
            <Eye size={20} />
            <span className="text-sm font-medium">{role === 'admin' ? t.orders.dashboard.viewWebsite || 'View Website' : t.orders.dashboard.backToWebsite}</span>
          </button>
          <button 
            onClick={handleLogout}
            className={`flex items-center p-3 w-full text-red-400 hover:text-red-300 transition-colors ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">{t.orders.dashboard.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen bg-gray-50 ${isRtl ? 'md:mr-64' : 'md:ml-64'} pb-24 md:pb-0`}>
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 h-16 md:h-20 flex items-center justify-between px-4 md:px-10 sticky top-0 z-10" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-4">
            <button className="md:hidden text-brand-navy p-2" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
              {location.pathname.startsWith('/admin') ? t.orders.dashboard.administration : t.orders.dashboard.customerAccount}
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            {/* Language Switcher */}
            <button 
              onClick={onToggleLang}
              className="flex items-center gap-2 text-brand-navy hover:text-brand-orange transition-colors border-gray-100"
            >
              <Globe size={18} />
              <span className="text-[11px] font-black tracking-widest uppercase">{lang}</span>
            </button>

            {/* Cart Button */}
            {role !== 'admin' && onOpenCart && (
              <button 
                onClick={onOpenCart}
                className={`relative flex items-center gap-2 bg-brand-navy text-white hover:bg-brand-orange transition-all duration-200 px-4 py-2.5 rounded-2xl shadow-md ${isRtl ? 'md:ml-4' : 'md:mr-4'}`}
              >
                <ShoppingCart size={20} />
                <span className="text-xs font-bold hidden md:inline">
                  {isRtl ? 'عربية التسوق' : 'Cart'}
                </span>
                {(cartCount || 0) > 0 && (
                  <span className="bg-brand-orange text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white absolute -top-1.5 -right-1.5">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            <div className={`hidden md:flex items-center gap-3 ${isRtl ? 'pl-6 border-l' : 'pr-6 border-r'} border-gray-100`}>
              {isRtl ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center text-brand-orange font-bold text-sm">
                    {profile?.facilityName?.charAt(0) || user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-brand-navy leading-none">{profile?.facilityName || (isRtl ? 'منشأة غير محددة' : 'Unknown Facility')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{user.displayName || user.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right">
                    <p className="text-xs font-bold text-brand-navy leading-none">{profile?.facilityName || (isRtl ? 'منشأة غير محددة' : 'Unknown Facility')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{user.displayName || user.email}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center text-brand-orange font-bold text-sm">
                    {profile?.facilityName?.charAt(0) || user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-red-500 hover:text-red-600 transition-all font-bold text-[10px] tracking-widest uppercase"
            >
              <LogOut size={16} className={`${isRtl ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'} transition-transform hidden md:block`} />
              <span className="hidden md:inline">{t.orders.dashboard.logout}</span>
            </button>
          </div>
        </header>

        <div className="p-10">
          {role !== 'admin' && <DashboardCarousel lang={lang} t={t} />}
          {children}
        </div>

        {/* Full Footer */}
        <Footer
          onOpenTerms={onOpenTerms || (() => {})}
          onOpenPrivacy={onOpenPrivacy || (() => {})}
          onOpenRefund={onOpenRefund || (() => {})}
          onOpenCart={onOpenCart || (() => {})}
          t={t}
        />
      </main>
    </div>
  );
};

const OrderManager = ({ 
  orders, 
  setModalContent, 
  t, 
  lang,
  historyOrder,
  setHistoryOrder,
  historyData,
  setHistoryData,
  loadingHistory,
  setLoadingHistory,
  fetchOrderHistory
}: { 
  orders: Order[], 
  setModalContent: (content: { title: string; message: string; type: 'success' | 'error' } | null) => void, 
  t: any, 
  lang: Language,
  historyOrder: Order | null,
  setHistoryOrder: (order: Order | null) => void,
  historyData: any[],
  setHistoryData: (data: any[]) => void,
  loadingHistory: boolean,
  setLoadingHistory: (loading: boolean) => void,
  fetchOrderHistory: (orderName: string, firebaseId?: string) => void
}) => {
  console.log("[OrderManager] Rendering with orders:", orders);
  const isRtl = lang === 'ar';
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<'local' | 'odoo'>('local');
  const [odooOrders, setOdooOrders] = useState<any[]>([]);
  const [loadingOdoo, setLoadingOdoo] = useState(false);
  const [isSyncingIndividual, setIsSyncingIndividual] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const syncAllStoreOrders = async () => {
    const ordersToSync = orders.filter(o => o.odooOrderName && ['pending_approval', 'processing', 'approved', 'shipped'].includes(o.status));
    if (ordersToSync.length === 0) {
      alert(t.orders.dashboard.noActiveOrdersFound);
      return;
    }

    setIsSyncingAll(true);
    let updatedCount = 0;
    
    try {
      // Batch processing to avoid overwhelming Odoo
      const batchSize = 3;
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        const batch = ordersToSync.slice(i, i + batchSize);
        await Promise.all(batch.map(async (order) => {
          try {
            const safeOdooOrderName = encodeURIComponent(order.odooOrderName!);
            const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
            const data = await resp.json();
            
            if (data.success && data.state) {
              let newStatus = order.status;
              if (data.isDelivered) newStatus = 'completed';
              else if (data.isShipped) newStatus = 'shipped';
              else if (data.isApproved) newStatus = 'approved';
              else if (['cancel', 'rejected'].includes(data.state)) newStatus = 'rejected';

              if (newStatus !== order.status || data.state !== order.odooState || data.invoiceName !== order.invoiceName) {
                const orderRef = doc(db, "orders", order.firebaseId);
                await updateDoc(orderRef, { 
                  status: newStatus,
                  odooState: data.state,
                  invoiceName: data.invoiceName || null,
                  lastSyncAt: new Date().toISOString()
                });
                updatedCount++;
              }
            }
          } catch (e) {
            console.error(`Error syncing order ${order.odooOrderName}:`, e);
          }
        }));
        if (i + batchSize < ordersToSync.length) {
          await new Promise(r => setTimeout(r, 2000)); // 2s gap between batches
        }
      }
      alert(t.orders.dashboard.syncCompleted.replace('{count}', updatedCount.toString()));
    } finally {
      setIsSyncingAll(false);
    }
  };

  const syncIndividualOrder = async (order: Order) => {
    if (!order.odooOrderName) {
      alert(t.orders.dashboard.noOdooReference);
      return;
    }
    
    setIsSyncingIndividual(true);
    try {
      const safeOdooOrderName = encodeURIComponent(order.odooOrderName);
      const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
      const data = await resp.json();
      
      if (data.success && data.state) {
        let newStatus = order.status;
        if (data.isDelivered) newStatus = 'completed';
        else if (data.isShipped) newStatus = 'shipped';
        else if (data.isApproved) newStatus = 'approved';
        else if (['cancel', 'rejected'].includes(data.state)) newStatus = 'rejected';

        if (newStatus !== order.status || data.state !== order.odooState || data.invoiceName !== order.invoiceName) {
          const orderRef = doc(db, "orders", order.firebaseId);
          await updateDoc(orderRef, { 
            status: newStatus,
            odooState: data.state,
            invoiceName: data.invoiceName || null,
            lastSyncAt: new Date().toISOString()
          });
          
          // Update the selected order in the modal to reflect changes
          setSelectedOrder({
            ...order,
            status: newStatus,
            odooState: data.state,
            invoiceName: data.invoiceName || null
          });
          
          alert(t.orders.dashboard.statusUpdatedFromOdoo.replace('{status}', data.state));
        } else {
          alert(t.orders.dashboard.statusAlreadyUpToDate);
        }
      } else {
        alert(t.orders.dashboard.syncFailedWithError.replace('{error}', data.error || (isRtl ? 'خطأ غير معروف' : 'Unknown error')));
      }
    } catch (e) {
      console.error("[Status Sync] Error:", e);
      alert(t.orders.dashboard.syncFailed);
    } finally {
      setIsSyncingIndividual(false);
    }
  };

  const fetchOdooOrders = async () => {
    setLoadingOdoo(true);
    try {
      const url = getApiUrl("/api/odoo/orders");
      console.log(`[Odoo Sync] Fetching orders from: ${url}`);
      
      const resp = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      if (!resp.ok) {
        throw new Error(`HTTP Error: ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json();
      if (data.success) {
        setOdooOrders(data.data);
      } else {
        console.error("[Odoo Sync] API returned success:false", data);
      }
    } catch (e) {
      console.error("[Odoo Sync] Fetch failed:", e);
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
        const response = await fetch(getApiUrl("/api/send-email"), {
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
    return t.orders.statuses[status] || status;
  };

  return (
    <div className="p-8">
      <div className={`flex justify-between items-center mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={isRtl ? 'text-right' : 'text-left'}>
          <div className={`flex items-center space-x-3 mb-1 ${isRtl ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <h1 className="text-3xl font-serif text-brand-navy font-bold">{t.orders.dashboard.orderManagement}</h1>
            <span className="px-3 py-1 bg-brand-navy text-white text-[10px] font-bold rounded-full tracking-widest uppercase">{t.orders.dashboard.adminMode}</span>
          </div>
          <p className="text-gray-500">{t.orders.dashboard.adminDescription}</p>
        </div>
        <div className={`flex ${isRtl ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button 
            onClick={syncAllStoreOrders}
            disabled={isSyncingAll}
            className="bg-brand-navy text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all hover:bg-brand-navy-hover disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncingAll ? "animate-spin" : ""} />
            <span>{t.orders.dashboard.syncAllStatuses}</span>
          </button>
          <button 
            onClick={fetchOdooOrders}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all hover:bg-brand-orange-hover"
          >
            <RefreshCw size={14} className={loadingOdoo ? "animate-spin" : ""} />
            <span>{t.orders.dashboard.syncWithOdoo}</span>
          </button>
        </div>
      </div>

      <div className={`flex space-x-4 mb-8 border-b border-gray-100 ${isRtl ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <button
          onClick={() => setView('local')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'local' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          {t.orders.dashboard.storeOrders} ({orders.length})
        </button>
        <button
          onClick={() => setView('odoo')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
            view === 'odoo' ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          {t.orders.dashboard.odooErpOrders} ({odooOrders.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'local' ? (
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.orderId}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.customer}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.date}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.odooId}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.invoiceId}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.total}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.payment}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.status}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-left' : 'text-right'}`}>{t.orders.dashboard.actions}</th>
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
                      <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.odooOrderName ? (
                        <button 
                          onClick={async () => {
                            const newWindow = window.open('', '_blank');
                            if (!newWindow) {
                              alert(t.orders.dashboard.allowPopups);
                              return;
                            }
                            newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;">${t.orders.dashboard.loadingQuotation}</div>`);
                            try {
                              const resp = await fetch(getApiUrl(`/api/odoo/order-portal/${encodeURIComponent(order.odooOrderName!)}`));
                              const data = await resp.json();
                              if (data.success && data.url) {
                                newWindow.location.href = data.url;
                              } else {
                                newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationNotFound}</div>`);
                              }
                            } catch(e) {
                              newWindow.document.write(`<div style="font-family:sans-serif;padding:20px;text-align:center;color:red;">${t.orders.dashboard.quotationError}</div>`);
                            }
                          }}
                          title={t.orders.dashboard.viewQuotation}
                          className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-1 rounded hover:bg-brand-orange hover:text-white transition-colors cursor-pointer"
                        >
                          {order.odooOrderName}
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">{t.orders.dashboard.noSync}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.invoiceName ? (
                        <span className="text-[10px] font-mono font-bold text-brand-navy bg-gray-100 px-2 py-1 rounded">
                          {order.invoiceName}
                        </span>
                      ) : order.odooOrderName ? (
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                          {order.odooOrderName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-orange">⃁ {order.total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {order.paymentMethod === 'cod' ? t.orders.dashboard.cashOnDelivery : t.orders.dashboard.bankTransfer}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border inline-flex items-center space-x-1 space-x-reverse ${getStatusColor(order.status)}`}
                      >
                        <span>{getStatusLabel(order.status)}</span>
                      </span>
                    </td>
                    <td className={`px-6 py-4 ${isRtl ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center space-x-2 ${isRtl ? 'justify-start space-x-reverse' : 'justify-end'}`}>
                        {order.odooOrderName && (
                          <button 
                            onClick={() => syncIndividualOrder(order)}
                            disabled={isSyncingIndividual}
                            title={t.orders.dashboard.updateStatus}
                            className="p-2 text-brand-orange hover:bg-brand-orange hover:text-white rounded-lg transition-all disabled:opacity-50"
                          >
                            <RefreshCw size={18} className={isSyncingIndividual ? "animate-spin" : ""} />
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-brand-navy hover:bg-brand-navy hover:text-white rounded-lg transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-gray-400 italic">
                      {t.orders.dashboard.noOrdersFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.odooSo}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.customer}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.date}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-right' : 'text-left'}`}>{t.orders.dashboard.total}</th>
                  <th className={`px-6 py-4 text-[10px] font-bold text-brand-navy uppercase tracking-widest ${isRtl ? 'text-left' : 'text-right'}`}>{t.orders.dashboard.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {odooOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-navy">{o.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-600">{o.partner_id[1]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{new Date(o.date_order).toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory' : 'en-US')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-brand-orange">⃁ {o.amount_total?.toLocaleString()}</span>
                    </td>
                    <td className={`px-6 py-4 ${isRtl ? 'text-left' : 'text-right'}`}>
                      <span 
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border inline-flex items-center ${
                          o.state === 'sale' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <span>{o.state}</span>
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
                  <h2 className="text-2xl font-serif text-brand-navy font-bold">{t.orders.dashboard.orderDetails}</h2>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">#{selectedOrder.firebaseId.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">{t.orders.dashboard.customerInfo}</h3>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-brand-navy">{selectedOrder.customerName}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.phone1}</p>
                      {selectedOrder.phone2 && <p className="text-sm text-gray-500">{selectedOrder.phone2}</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">{t.orders.dashboard.deliveryAddress}</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">{selectedOrder.address}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.city}, {selectedOrder.district}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-4">{t.orders.dashboard.orderItems}</h3>
                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-brand-navy">{item.name}</span>
                          <span className="text-xs text-gray-400">{t.orders.dashboard.quantity}: {item.quantity}</span>
                        </div>
                        <span className="text-sm font-bold text-brand-navy">{t.products.pricePrefix}{String(item.price).replace(/[^\d.]/g, '')}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm font-bold text-brand-navy uppercase tracking-widest">{t.orders.dashboard.total}</span>
                      <span className="text-xl font-serif font-bold text-brand-orange">{t.products.pricePrefix}{selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className={`flex justify-between items-center mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">{t.orders.dashboard.updateStatus}</h3>
                    <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                      {selectedOrder.odooOrderName && (
                        <>
                          <button 
                            onClick={() => fetchOrderHistory(selectedOrder.odooOrderName || '', selectedOrder.firebaseId)}
                            className="flex items-center space-x-1 space-x-reverse text-[10px] font-bold px-3 py-1.5 rounded-lg bg-brand-navy/5 text-brand-navy hover:bg-brand-navy hover:text-white transition-all"
                          >
                            <FileText size={12} />
                            <span>{t.orders.dashboard.history}</span>
                          </button>
                          <button 
                            onClick={() => syncIndividualOrder(selectedOrder)}
                            disabled={isSyncingIndividual}
                            className={`flex items-center space-x-1 space-x-reverse text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                              isSyncingIndividual 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white'
                            }`}
                          >
                            <RefreshCw size={12} className={isSyncingIndividual ? 'animate-spin' : ''} />
                            <span>{isSyncingIndividual ? t.orders.dashboard.syncing : t.orders.dashboard.syncWithOdoo}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedOrder.status === 'pending_approval' && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'processing', selectedOrder)}
                      className="w-full mb-4 bg-green-500 text-white py-4 rounded-xl text-xs font-bold tracking-widest hover:bg-green-600 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                    >
                      <Check size={18} />
                      <span>{t.orders.dashboard.approveOrder}</span>
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
                const response = await fetch(getApiUrl("/api/seed-demo"), { method: "POST" });
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
        const fetchWithCors = (path: string) => fetch(getApiUrl(path), {
          mode: 'cors',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        }).then(res => res.json());

        const [prod, ord, cust] = await Promise.all([
          fetchWithCors("/api/odoo/products"),
          fetchWithCors("/api/odoo/orders"),
          fetchWithCors("/api/odoo/customers")
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
        <p className="text-gray-500 mt-2 text-sm">Welcome back, Hakkal Admin. Here's what's happening today.</p>
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
                    <p className="text-xs text-gray-400">{String(p.price).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}</p>
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
                    <p className="text-xs text-gray-400">⃁ {order.total.toLocaleString()}</p>
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
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState("");

  const handleSaveDiscount = async (product: Product) => {
    try {
      const fbId = product.firebaseId;
      if (!fbId) return;
      const trimmed = discountValue.trim();
      if (trimmed === "" || trimmed === "0") {
        await updateDoc(doc(db, "products", fbId), { discountPrice: deleteField() });
        setModalContent({ title: "Updated", message: `Discount removed from ${product.name}`, type: 'success' });
      } else {
        const numVal = parseFloat(trimmed.replace(/[^\d.]/g, ''));
        if (isNaN(numVal) || numVal <= 0) {
          setModalContent({ title: "Error", message: "Invalid discount price", type: 'error' });
          return;
        }
        await updateDoc(doc(db, "products", fbId), { discountPrice: `⃁ ${numVal.toLocaleString()}` });
        setModalContent({ title: "Updated", message: `Discount set for ${product.name}: ⃁ ${numVal.toLocaleString()}`, type: 'success' });
      }
      setEditingDiscount(null);
      setDiscountValue("");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.firebaseId}`);
    }
  };

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
                placeholder="e.g. ⃁ 1,500.00"
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
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Discount Price</th>
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
                <td className="px-8 py-4 text-sm text-gray-600 font-medium">{String(p.price).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}</td>
                <td className="px-6 py-4">
                  {editingDiscount === (p.firebaseId || String(p.id)) ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="e.g. 1200"
                        className="w-24 p-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-orange"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDiscount(p); if (e.key === 'Escape') setEditingDiscount(null); }}
                      />
                      <button onClick={() => handleSaveDiscount(p)} className="text-green-500 hover:text-green-700"><Check size={16} /></button>
                      <button onClick={() => setEditingDiscount(null)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setEditingDiscount(p.firebaseId || String(p.id)); setDiscountValue(p.discountPrice ? p.discountPrice.replace(/[^\d.]/g, '') : ''); }}>
                      {p.discountPrice ? (
                        <span className="text-sm font-bold text-red-500">{String(p.discountPrice).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No discount</span>
                      )}
                      <Edit size={12} className="text-gray-300" />
                    </div>
                  )}
                </td>
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
        price: `⃁ ${String(odooProduct.list_price || 0).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}`,
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
          price: `⃁ ${String(op.list_price || 0).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}`,
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
    // Throttle admin Odoo fetch: once per 60 minutes
    const THROTTLE_KEY = 'last_admin_odoo_fetch';
    const lastFetch = localStorage.getItem(THROTTLE_KEY);
    const oneHour = 60 * 60 * 1000;
    if (!lastFetch || Date.now() - parseInt(lastFetch) > oneHour) {
      fetchOdooData();
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    }
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
                    <td className="px-8 py-4 text-sm text-brand-orange font-bold">⃁ {p.list_price?.toLocaleString()}</td>
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
                    <td className="px-8 py-4 text-sm font-bold text-brand-navy">⃁ {o.amount_total?.toLocaleString()}</td>
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
          <p className="text-[#006621] text-sm mb-1">https://hakkal.com › {activeTab}</p>
          <p className="text-[#4d5156] text-sm line-clamp-2">{tempData.description}</p>
        </div>
      </div>
    </div>
  );
};

const Testimonials = ({ t }: { t: any }) => {
  return (
    <section className="py-24 bg-brand-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="max-w-xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-brand-navy/5">
          <h3 className="text-brand-navy text-2xl font-serif mb-8 text-center">{t.testimonials.shareTitle}</h3>
          <form className="space-y-4">
            <input 
              type="text" 
              placeholder={t.testimonials.namePlaceholder}
              className="w-full bg-gray-50 border border-gray-100 p-4 text-brand-navy text-sm focus:outline-none focus:border-brand-orange transition-colors rounded-xl"
            />
            <textarea 
              placeholder={t.testimonials.reviewPlaceholder}
              rows={4}
              className="w-full bg-gray-50 border border-gray-100 p-4 text-brand-navy text-sm focus:outline-none focus:border-brand-orange transition-colors rounded-xl"
            />
            <button className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white py-4 text-[10px] tracking-[0.3em] font-bold transition-all rounded-xl shadow-lg shadow-brand-orange/20 text-center">
              {t.testimonials.postReview}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const About = ({ t }: { t: any }) => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center mb-12">
          <span className="text-brand-navy font-serif text-3xl tracking-widest font-bold">HAKKAL</span>
          <span className="text-brand-navy text-sm tracking-[0.4em] -mt-1 font-medium">TRADING COMPANY</span>
          <span className="text-brand-navy text-[8px] tracking-[0.2em] opacity-60">{t.about.brandTagline}</span>
        </div>

        <h2 className="text-brand-navy text-4xl md:text-5xl font-serif mb-10 leading-tight">
          {t.about.title}
        </h2>

        <div className="space-y-6 text-brand-navy/70 text-sm leading-relaxed mb-16">
          <p>{t.about.paragraph1}</p>
          <p>{t.about.paragraph2}</p>
          <p>{t.about.paragraph3}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-brand-navy font-serif text-2xl mb-8 text-center md:text-start">{t.about.commitmentsTitle}</h3>
            <ul className="space-y-6">
              {[t.about.commitment1, t.about.commitment2, t.about.commitment3].map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="mt-1 text-brand-orange flex-shrink-0">
                    <Check size={16} />
                  </div>
                  <span className="text-brand-navy/80 text-xs leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-brand-navy font-serif text-2xl mb-8 text-center md:text-start">{t.about.whyChooseTitle}</h3>
            <ul className="space-y-4">
              {[t.about.why1, t.about.why2, t.about.why3, t.about.why4, t.about.why5].map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-4">
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
            {t.about.quote}
          </p>
        </div>
      </div>
    </section>
  );
};

const Chef = ({ t }: { t: any }) => {
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
            src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png" 
            alt="Hakkal Company" 
            className="w-full h-auto rounded-sm shadow-2xl relative z-10"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-brand-navy text-6xl font-serif mb-2">{t.chef.title}</h2>
          <p className="text-brand-orange text-[10px] tracking-[0.3em] font-bold mb-10 uppercase">
            {t.chef.subtitle}
          </p>
          
          <div className="space-y-6 text-brand-navy/70 text-sm leading-relaxed mb-10">
            <p>{t.chef.paragraph1}</p>
            <p>{t.chef.paragraph2}</p>
            <p>{t.chef.paragraph3}</p>
            <p>{t.chef.paragraph4}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const SocialSection = ({ t }: { t: any }) => {
  return (
    <section className="bg-white py-12 border-t border-brand-navy/5">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-end gap-4">
        {/* Simplified and cleaner social buttons */}
        <button className="bg-[#2d79f3] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-blue-500/10">
          {t.social.chefFB}
        </button>
        <button className="bg-[#2d79f3] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-blue-500/10">
          {t.social.brandFB}
        </button>
        <button className="bg-[#ff0000] text-white px-8 py-4 text-[10px] tracking-wider font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-red-500/10">
          {t.social.youtube}
        </button>
      </div>
    </section>
  );
};

const Footer = ({ onOpenTerms, onOpenPrivacy, onOpenRefund, onOpenCart, t }: { 
  onOpenTerms: () => void,
  onOpenPrivacy: () => void,
  onOpenRefund: () => void,
  onOpenCart: () => void,
  t: any
}) => {
  return (
    <footer className="bg-brand-cream pt-24 pb-12 text-brand-navy relative border-t border-brand-navy/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-16 mb-24">
          {/* Column 1 */}
          <div>
            <div className="mb-8">
              <img
                src="https://i.ibb.co/xKkzXtmz/Untitled-design-1.png"
                alt="Hakkal Logo"
                className="h-28 md:h-32 w-auto object-contain mix-blend-multiply"
              />
            </div>
            <p className="text-brand-slate text-sm leading-relaxed mb-8 font-medium">
              {t.footer.description}
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
                  className="hover:text-brand-orange transition-colors text-start"
                >
                  {t.footer.termsConditions}
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenPrivacy}
                  className="hover:text-brand-orange transition-colors text-start"
                >
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenRefund}
                  className="hover:text-brand-orange transition-colors text-start"
                >
                  {t.footer.refundPolicy}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-brand-navy font-serif text-xl font-bold mb-10">{t.footer.contact}</h4>
            <div className="space-y-6 text-brand-slate text-sm font-medium">
              <p><span className="text-brand-navy font-bold">{t.contactInfo.management}:</span> <span dir="ltr">+966 57 5151 506</span></p>
              <p><span className="text-brand-navy font-bold">{t.contactInfo.middleArea}:</span> <span dir="ltr">+966 57 5151 507</span></p>
              <p><span className="text-brand-navy font-bold">{t.contactInfo.westernArea}:</span> <span dir="ltr">+966 57 5151 508</span></p>
              <p><span className="text-brand-navy font-bold">{t.contactInfo.email}:</span> Info@hakkal-est.com</p>
              <p>
                <span className="text-brand-navy font-bold">{t.contactInfo.address}:</span><br />
                {t.contactInfo.jeddah}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-brand-navy/5 text-center">
          <p className="text-brand-navy/40 text-[10px] tracking-widest font-bold">
            {t.footer.copyright}
          </p>
        </div>
      </div>

      {/* Floating Buttons Container */}
      <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-40">
        {/* WhatsApp Button */}
        <motion.a 
          href="https://wa.me/966575151506"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#128C7E] transition-colors flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </motion.a>

        {/* Floating Cart Button */}
        <motion.button 
          onClick={onOpenCart}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="bg-brand-navy text-white p-4 rounded-full shadow-2xl hover:bg-brand-orange transition-colors flex items-center justify-center"
        >
          <ShoppingBag size={24} />
        </motion.button>
      </div>
    </footer>
  );
};

// --- Main App Components ---

const Home = ({ 
  products, 
  cart,
  onAddToCart, 
  onUpdateQuantity,
  onSetManualQuantity,
  onRemoveFromCart,
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
  cart: CartItem[],
  onAddToCart: (p: Product) => void,
  onUpdateQuantity: (id: number, delta: number) => void,
  onSetManualQuantity: (id: number, val: string) => void,
  onRemoveFromCart: (id: number) => void,
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
      <Products 
        products={products} 
        cart={cart}
        onOrder={onAddToCart} 
        onUpdateQuantity={onUpdateQuantity}
        onSetManualQuantity={onSetManualQuantity}
        onRemoveFromCart={onRemoveFromCart}
        onViewProduct={onViewProduct} 
        user={user} 
        userRole={userRole} 
        onOpenAuth={onOpenAuth} 
        lang={lang} 
        t={t} 
      />
      
      <Testimonials t={t} />
      <About t={t} />
      <Chef t={t} />
      <Footer onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy} onOpenRefund={onOpenRefund} onOpenCart={onOpenCart} t={t} />
    </>
  );
};

export default function App() {
  usePushNotifications();

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });
  const t = translations[lang];
  const isRtl = lang === 'ar';

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
  const [isSyncing, setIsSyncing] = useState(false);

  const syncStatuses = useCallback(async () => {
    if (orders.length === 0 || isSyncing) return;
    
    // Throttle: only auto-sync once every 15 minutes
    const THROTTLE_KEY = `auto_sync_main_${user?.uid}`;
    const lastSync = localStorage.getItem(THROTTLE_KEY);
    if (lastSync && Date.now() - parseInt(lastSync) < 15 * 60 * 1000) return;

    const ordersToSync = orders.filter(o => 
      o.odooOrderName && 
      ['pending_approval', 'processing', 'approved', 'shipped'].includes(o.status)
    );

    if (ordersToSync.length === 0) return;

    setIsSyncing(true);
    console.log(`[App Sync] Checking ${ordersToSync.length} orders...`);

    try {
      const batchSize = 3;
      for (let i = 0; i < ordersToSync.length; i += batchSize) {
        const batch = ordersToSync.slice(i, i + batchSize);
        await Promise.all(batch.map(async (order) => {
          try {
            const safeOdooOrderName = encodeURIComponent(order.odooOrderName!);
            const resp = await fetch(getApiUrl(`/api/odoo/order-status/${safeOdooOrderName}`));
            const data = await resp.json();
            
            if (data.success && data.state) {
              let newStatus = order.status;
              if (data.isDelivered) newStatus = 'completed';
              else if (data.isShipped) newStatus = 'shipped';
              else if (data.isApproved) newStatus = 'approved';
              else if (['cancel', 'rejected'].includes(data.state)) newStatus = 'rejected';

              if (newStatus !== order.status || data.state !== order.odooState || data.invoiceName !== order.invoiceName) {
                await updateDoc(doc(db, "orders", order.firebaseId), { 
                  status: newStatus,
                  odooState: data.state,
                  invoiceName: data.invoiceName || null,
                  lastSyncAt: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            console.error(`[App Sync] Error for ${order.odooOrderName}:`, e);
          }
        }));
        if (i + batchSize < ordersToSync.length) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    } finally {
      setIsSyncing(false);
    }
  }, [orders, isSyncing, user?.uid]);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<'not_found' | 'error' | 'no_history' | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);

  const fetchOrderHistory = async (orderName: string, firebaseId?: string, orderStatus?: string, orderCreatedAt?: string) => {
    const isRtl = lang === 'ar';
    if (!orderName) {
      alert(t.orders.dashboard.notLinkedToOdoo);
      return;
    }

    console.log(`[Order History] Fetching for: ${orderName}`);
    setHistoryOrder({ odooOrderName: orderName, firebaseId: firebaseId || 'odoo', status: orderStatus, createdAt: orderCreatedAt } as any);
    setLoadingHistory(true);
    setHistoryData([]);
    setHistoryError(null);
    setHistoryErrorMessage(null);

    try {
      const safeOdooOrderName = encodeURIComponent(orderName);
      const url = getApiUrl(`/api/odoo/order-history/${safeOdooOrderName}`);
      console.log(`[Order History] Requesting URL: ${url}`);
      
      const resp = await fetch(url);
      console.log(`[Order History] HTTP Response Status: ${resp.status}`);
      
      if (resp.status === 404) {
        setHistoryError('not_found');
        return;
      }

      const data = await resp.json();
            console.log(`[Order History] API Data Received:`, data);
            
            if (data.debug) {
              console.log(`[Order History] API Debug Info:`, data.debug);
            }

            if (!resp.ok) {
              setHistoryError('error');
              setHistoryErrorMessage(data.error || data.message || `HTTP ${resp.status}`);
              return;
            }

            if (data.success && data.history) {
              if (data.history.length === 0) {
                console.warn(`[Order History] Success but history is empty for: ${orderName}. Debug info:`, data.debug);
                setHistoryError('no_history');
              } else {
                setHistoryData(data.history);
              }
            } else {
        console.error(`[Order History] API Logic Error:`, data.message || 'Unknown error');
        setHistoryError('error');
        setHistoryErrorMessage(data.message || 'API success: false');
      }
    } catch (e: any) {
      console.error(`[Order History] Fetch Exception:`, e);
      setHistoryError('error');
      setHistoryErrorMessage(e.message || 'Network error');
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const setManualQuantity = (id: number, value: string) => {
    const qty = parseInt(value);
    if (isNaN(qty)) return;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, qty) };
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
    // 1. Independent Odoo Fetch (Runs regardless of Firestore status)
    const fetchOdooProducts = async () => {
      const isLocalRuntime = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isLocalRuntime) return;
      
      console.log("[Odoo] Attempting fresh product fetch...");
      try {
        const resp = await fetch(getApiUrl("/api/odoo/products"));
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await resp.json();
          if (data.success && data.data) {
            const odooMapped = data.data.map((op: any) => ({
              id: op.id,
              name: op.name,
              description: op.description_sale || "Product imported from Odoo ERP.",
              price: `⃁ ${String(op.list_price || 0).replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim()}`,
              image: op.image_1920 ? (op.image_1920.toString().startsWith('data:') ? op.image_1920 : `data:image/png;base64,${op.image_1920}`) : "https://picsum.photos/seed/product/400/400",
              isOdoo: true
            }));
            
            setProducts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = odooMapped.filter((p: any) => !existingIds.has(p.id));
              return [...prev, ...newItems].slice(0, 50);
            });
            console.log(`[Odoo] Loaded ${odooMapped.length} products successfully.`);
          }
        }
      } catch (e) {
        console.error("[Odoo] API fetch failed:", e);
      }
    };

    fetchOdooProducts();

    // 2. Firestore Listener (Will fail gracefully if quota exceeded)
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allProducts = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          ...data,
          // Remove SAR, ر.س and other non-numeric chars (except dot) from prices coming from DB
          price: (data.price || "").toString().replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim(),
          discountPrice: data.discountPrice ? data.discountPrice.toString().replace(/SAR|ر\.س|SR|ريال/gi, "").replace(/[^\d.]/g, "").trim() : undefined,
          firebaseId: doc.id
        };
      }) as any[];
      
      if (allProducts.length > 0) {
        setProducts(prev => {
          const odooProducts = prev.filter(p => p.isOdoo && !allProducts.some(ap => ap.id === p.id));
          return [...allProducts, ...odooProducts].slice(0, 50);
        });
      }
    }, (error) => {
      console.warn("[Firestore] Product sync failed (likely quota):", error.message);
      // If we have no products yet, show initial ones as safety
      setProducts(prev => prev.length === 0 ? INITIAL_PRODUCTS : prev);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "seo"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteSettings["seo"];
        // Ensure no old brand names leak through from Firebase
        const sanitized = JSON.parse(
          JSON.stringify(data)
            .replace(/Shani's Flavor Lab/g, "Hakkal Trading Company")
            .replace(/شاني فليفر لاب/g, "شركة حقال للتجارة")
            .replace(/Haqqal/g, "Hakkal")
            .replace(/هكال التجارية/g, "شركة حقال للتجارة")
            .replace(/حقال/g, "حقال")
            .replace(/هكال/g, "حقال")
            .replace(/حقال للتجارة/g, "شركة حقال للتجارة")
            .replace(/شركة شركة حقال للتجارة/g, "شركة حقال للتجارة")
            .replace(/Authentic Sri Lankan Spices/g, "شركة حقال للتجارة")
        );
        setSeo(sanitized);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/seo");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only set up listener if user is authenticated and on a dashboard/orders route
    const isDashboardRoute = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/my-orders');
    if (!isAuthReady || !user || !isDashboardRoute) {
      if (!user) setOrders([]);
      return;
    }

    console.log(`[Order Sync] Setting up listener for: ${user.email || user.uid}`);

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

        // Background Sync for Odoo status if logged in as customer
        if (user && userRole === 'customer') {
          syncStatuses();
        }
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
    const title = seo.home.title || "Hakkal Trading Company | شركة حقال للتجارة";
    document.title = title;
    
    // Update Meta Tags
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seo.home.description);
    
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metaKeywords.setAttribute("content", seo.home.keywords);
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", seo.home.description);
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
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth" element={<CustomerLoginPage />} />
        <Route path="/pending-activation" element={<PendingActivation />} />
        <Route path="/unauthorized" element={<div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-navy font-serif text-2xl" dir="rtl">غير مصرح لك بالدخول، التسجيل حصري لعملاء المتجر</div>} />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <DashboardOverview products={products} orders={orders} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <ProductManager products={products} setModalContent={setModalContent} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/discounts" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <DiscountsManager />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/odoo" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <OdooManager products={products} setModalContent={setModalContent} t={t} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <OrderManager 
                orders={orders} 
                setModalContent={setModalContent} 
                t={t} 
                lang={lang}
                historyOrder={historyOrder}
                setHistoryOrder={setHistoryOrder}
                historyData={historyData}
                setHistoryData={setHistoryData}
                loadingHistory={loadingHistory}
                setLoadingHistory={setLoadingHistory}
                fetchOrderHistory={fetchOrderHistory}
              />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/seo" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <SEOManager seo={seo} setModalContent={setModalContent} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/blog" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
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
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
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
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <CustomerDashboardOverview 
                orders={orders} 
                user={user} 
                t={t} 
                lang={lang} 
                onViewHistory={fetchOrderHistory}
              />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/shop" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <CustomerShop 
                products={products} 
                cart={cart}
                onAddToCart={addToCart} 
                onUpdateQuantity={updateQuantity}
                onSetManualQuantity={setManualQuantity}
                onRemoveFromCart={removeFromCart}
                onCheckout={handleCheckout}
                t={t} 
                lang={lang} 
              />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/orders" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <CustomerOrders 
                orders={orders} 
                user={user} 
                t={t} 
                lang={lang} 
                onViewHistory={fetchOrderHistory}
                loadingHistory={loadingHistory}
                historyOrder={historyOrder}
              />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/profile" element={
          <ProtectedRoute>
            <DashboardLayout user={user} role={userRole} t={t} lang={lang} onToggleLang={toggleLang} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} onOpenRefund={() => setIsRefundOpen(true)}>
              <CustomerProfile user={user} t={t} lang={lang} />
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
        t={t}
        lang={lang}
      />
      <TermsModal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)}
        t={t}
      />
      <PrivacyModal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)}
        t={t}
      />
      <RefundModal 
        isOpen={isRefundOpen} 
        onClose={() => setIsRefundOpen(false)}
        t={t}
      />
      <ProductDetailModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        product={selectedProduct}
        onAddToCart={addToCart}
        lang={lang}
        t={t}
      />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        t={t}
      />

      {/* Global Message Modal */}
      {modalContent && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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

      {/* Order History Modal */}
      <AnimatePresence>
        {historyOrder && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryOrder(null)}
              className="absolute inset-0 bg-brand-navy/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header */}
              <div className={`px-7 pt-7 pb-5 border-b border-gray-100 flex justify-between items-start ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <h2 className="text-2xl font-serif text-brand-navy font-bold">{t.orders.dashboard.operationSequence}</h2>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-1">
                    {(historyOrder as any).odooOrderName || `#${(historyOrder as any).firebaseId?.toUpperCase().slice(0, 8)}`}
                  </p>
                </div>
                <button onClick={() => setHistoryOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Progress Stepper */}
              {(() => {
                const statusVal = (historyOrder as any).status || '';
                const isCancelled = statusVal === 'cancel' || statusVal === 'rejected';
                const steps = t.orders.dashboard.sequenceSteps;
                const currentStep =
                  isCancelled ? -1 :
                  statusVal === 'completed' ? 4 :
                  statusVal === 'shipped' ? 3 :
                  (statusVal === 'approved' || statusVal === 'processing') ? 2 :
                  statusVal === 'pending_approval' ? 1 : 0;

                return (
                  <>
                    {isCancelled && (
                      <div className="bg-red-50 px-7 py-3 border-b border-red-100 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <X size={14} className="text-white" />
                        </div>
                        <p className="text-sm font-bold text-red-700">
                          {t.orders.dashboard.cancelledBanner}
                        </p>
                      </div>
                    )}
                    <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
                      <div className={`flex items-start ${isRtl ? 'flex-row-reverse' : ''} gap-0`}>
                      {steps.map((step: string, idx: number) => {
                        const done = idx < currentStep;
                        const active = idx === currentStep - 1;
                        const upcoming = idx >= currentStep;
                        return (
                          <div key={idx} className={`flex-1 flex flex-col items-center relative ${isRtl ? '' : ''}`}>
                            {/* Connector line */}
                            {idx > 0 && (
                              <div className={`absolute top-[14px] ${isRtl ? 'right-1/2 left-0' : 'left-0 right-1/2'} h-0.5 ${
                                done || active ? 'bg-brand-orange' : 'bg-gray-200'
                              }`} />
                            )}
                            {idx < steps.length - 1 && (
                              <div className={`absolute top-[14px] ${isRtl ? 'left-1/2 right-auto' : 'left-1/2'} right-0 h-0.5 ${
                                done ? 'bg-brand-orange' : 'bg-gray-200'
                              }`} />
                            )}
                            {/* Dot */}
                            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                              done
                                ? 'bg-brand-orange border-brand-orange text-white'
                                : active
                                ? 'bg-white border-brand-orange text-brand-orange ring-4 ring-brand-orange/20'
                                : 'bg-white border-gray-200 text-gray-300'
                            }`}>
                              {done ? (
                                <Check size={12} />
                              ) : (
                                <div className={`w-2 h-2 rounded-full ${
                                  active ? 'bg-brand-orange' : 'bg-gray-300'
                                }`} />
                              )}
                            </div>
                            {/* Label */}
                            <span className={`mt-2 text-[10px] leading-tight text-center font-semibold px-1 ${
                              done ? 'text-brand-orange' :
                              active ? 'text-brand-navy' :
                              'text-gray-400'
                            }`} style={{ maxWidth: 64 }}>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

              {/* History Items */}
              <div className="p-7 overflow-y-auto custom-scrollbar flex-1">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <RefreshCw size={40} className="text-brand-orange animate-spin" />
                    <p className="text-sm text-gray-400 font-bold tracking-widest uppercase">
                      {t.orders.dashboard.fetchingHistory}
                    </p>
                  </div>
                ) : (() => {
                  const statusVal = (historyOrder as any).status || '';
                  const isCancelled = statusVal === 'cancel' || statusVal === 'rejected';
                  // Use 5 for completed so all 4 steps show as "Done"
                  const currentStep =
                    isCancelled ? -2 :
                    statusVal === 'completed' ? 5 :
                    statusVal === 'shipped' ? 3 :
                    (statusVal === 'approved' || statusVal === 'processing') ? 2 : 1;

                  const firebaseCreatedAt = (historyOrder as any).createdAt;

                  const createdEvent   = historyData.find((i: any) => i.type === 'created')
                                       || (firebaseCreatedAt ? { date: firebaseCreatedAt, title: null } : null);
                  const preparingEvent = historyData.find((i: any) => i.type === 'preparing' || i.type === 'status_change')
                                       || (firebaseCreatedAt ? { date: firebaseCreatedAt, title: null } : null);
                  const shippedEvent   = historyData.find((i: any) => i.type === 'shipped')
                                       || (firebaseCreatedAt ? { date: firebaseCreatedAt, title: null } : null);
                  const deliveredEvent = (statusVal === 'completed' && historyData.length > 0) ? historyData[0]
                                       : (firebaseCreatedAt ? { date: firebaseCreatedAt, title: null } : null);

                  const stages = [
                    { key: 'pending',   labelAr: 'بانتظار موافقة قسم المبيعات', labelEn: 'Pending Sales Approval',          icon: <RefreshCw size={16} className="text-white" />, color: 'bg-amber-500',   event: createdEvent },
                    { key: 'approved',  labelAr: 'تمت الموافقة وجاري تجهيز الطلب', labelEn: 'Approved & Being Prepared',    icon: <Package   size={16} className="text-white" />, color: 'bg-blue-500',    event: preparingEvent },
                    { key: 'shipped',   labelAr: 'تم الشحن',                      labelEn: 'Shipped',                        icon: <Truck     size={16} className="text-white" />, color: 'bg-purple-500',  event: shippedEvent },
                    { key: 'completed', labelAr: 'تم التسليم',                    labelEn: 'Delivered',                      icon: <Check     size={16} className="text-white" />, color: 'bg-emerald-500', event: deliveredEvent },
                  ];

                  if (isCancelled) {
                    stages.push({
                      key: 'cancelled',
                      labelAr: 'تم إلغاء الطلب',
                      labelEn: 'Order Cancelled',
                      icon: <X size={16} className="text-white" />,
                      color: 'bg-red-500',
                      event: historyData.find((i: any) => i.type === 'status_change' && (i.new_status === 'cancel' || i.new_status === 'rejected')) || { date: new Date().toISOString(), title: t.orders.dashboard.cancelledBySystem }
                    });
                  }

                  return (
                    <div className="relative">
                      <div className={`absolute top-6 bottom-6 w-0.5 bg-gray-100 ${isRtl ? 'right-[22px]' : 'left-[22px]'}`} />
                      <div className="space-y-0">
                        {stages.map((stage, idx) => {
                          const step = idx + 1;
                          const isCancelledStage = stage.key === 'cancelled';
                          
                          let isDone, isActive, isUpcoming;
                          
                          if (isCancelled) {
                            if (isCancelledStage) {
                              isDone = false;
                              isActive = true;
                              isUpcoming = false;
                            } else {
                              // For non-cancelled stages when order is cancelled
                              // We can try to guess if they were done based on history
                              isDone = !!stage.event?.title || (idx === 0 && !!stage.event?.date); 
                              isActive = false;
                              isUpcoming = !isDone;
                            }
                          } else {
                            isDone = step < currentStep;
                            isActive = step === currentStep;
                            isUpcoming = step > currentStep;
                          }

                          return (
                            <div key={stage.key} className={`relative flex items-start gap-4 py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              {/* Circle */}
                              <div className={`flex-shrink-0 z-10 w-11 h-11 rounded-full flex items-center justify-center shadow-md ${
                                isDone   ? `${stage.color} ring-4 ring-offset-2 ring-emerald-100` :
                                isActive ? `${stage.color} ring-4 ring-offset-2 ring-orange-100 animate-pulse` :
                                           'bg-gray-100 border-2 border-gray-200'
                              }`}>
                                {isDone   ? <Check size={18} className="text-white" /> :
                                 isActive ? stage.icon :
                                            <div className="w-3 h-3 rounded-full bg-gray-300" />}
                              </div>

                              {/* Text */}
                              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${isUpcoming ? 'opacity-40' : ''}`}>
                                <p className={`text-base font-bold leading-snug ${isDone ? 'text-emerald-700' : isActive ? 'text-brand-navy' : 'text-gray-400'}`}>
                                  {isRtl ? stage.labelAr : stage.labelEn}
                                </p>
                                {(isDone || isActive) && stage.event?.date ? (
                                  <div className="mt-0.5">
                                    <p className="text-sm font-semibold text-gray-600">
                                      {new Date(stage.event.date).toLocaleString(isRtl ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {!stage.event.title && firebaseCreatedAt && stage.event.date === firebaseCreatedAt && idx > 0 && (
                                      <p className="text-[10px] text-gray-400 italic">{t.orders.dashboard.approximateDate}</p>
                                    )}
                                  </div>
                                ) : isActive ? (
                                  <p className="text-xs font-semibold text-brand-orange mt-0.5">● {t.orders.dashboard.currentStatus}</p>
                                ) : isUpcoming ? (
                                  <p className="text-xs text-gray-400 mt-0.5">{t.orders.dashboard.pendingEllipsis}</p>
                                ) : null}
                                {(isDone || isActive) && stage.event?.title && (
                                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">
                                    {isRtl ? (stage.event.title_ar || stage.event.title) : stage.event.title}
                                  </p>
                                )}
                              </div>

                              {/* Badge */}
                              {isDone && (
                                <span className="flex-shrink-0 self-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                  {t.orders.dashboard.doneCheck}
                                </span>
                              )}
                              {isActive && (
                                <span className={`flex-shrink-0 self-center text-[10px] font-bold px-2 py-1 rounded-full border animate-pulse ${
                                  isCancelledStage 
                                    ? 'text-red-600 bg-red-50 border-red-100' 
                                    : 'text-brand-orange bg-orange-50 border-orange-100'
                                }`}>
                                  {isCancelledStage 
                                    ? t.orders.dashboard.cancelledBadge
                                    : t.orders.dashboard.activeBadge}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {historyError && (
                        <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                          <p className="text-xs text-amber-600 font-medium">
                            {t.orders.dashboard.odooFetchError}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>


              {/* Footer */}
              <div className="px-7 pb-7 pt-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setHistoryOrder(null)}
                  className="w-full bg-brand-navy text-white py-4 rounded-2xl text-sm tracking-widest font-bold hover:bg-brand-orange transition-all shadow-lg"
                >
                  {t.orders.dashboard.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </BrowserRouter>
  );
}
