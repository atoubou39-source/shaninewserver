import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Percent,
  Save,
  X,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Trash2,
  Package,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

interface DiscountInput {
  [key: string]: string;
}

export function DiscountsManager({ products, t, lang }: { products: Product[], t: any, lang: 'en' | 'ar' }) {
  if (!t || !t.orders) return <div className="p-10 text-center animate-pulse text-brand-navy font-bold">Loading Discounts...</div>;
  const isRtl = lang === 'ar';

  const [discountInputs, setDiscountInputs] = useState<DiscountInput>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    // Initialize discount inputs
    const inputs: DiscountInput = {};
    products.forEach((p) => {
      if (p.discountPrice) {
        inputs[p.firebaseId || p.id.toString()] = String(p.discountPrice).replace(
          /[^\d.]/g,
          ""
        );
      }
    });
    setDiscountInputs(inputs);
  }, [products]);


  const parsePrice = (priceStr: any): number => {
    if (!priceStr || priceStr === "undefined" || priceStr === "null") return 0;
    const cleaned = String(priceStr).replace(/[^\d.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatPrice = (price: number): string => {
    return `⃁ ${price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculateDiscount = (
    originalPrice: number,
    discountPrice: number | null | undefined
  ): number => {
    if (!originalPrice || originalPrice <= 0 || !discountPrice || isNaN(discountPrice)) return 0;
    return Math.round(
      ((originalPrice - discountPrice) / originalPrice) * 100
    );
  };

  const handleDiscountChange = (productId: string, value: string) => {
    // Only allow numbers and decimal point
    const cleaned = String(value).replace(/[^\d.]/g, "");
    setDiscountInputs((prev) => ({
      ...prev,
      [productId]: cleaned,
    }));
  };

  const handleSaveDiscount = async (product: Product) => {
    const productId = product.firebaseId || product.id.toString();
    const discountValue = discountInputs[productId];

    if (!discountValue || discountValue === "") {
      // Clear discount
      try {
        await updateDoc(doc(db, "products", productId), {
          discountPrice: null,
        });
        setMessage({
          type: "success",
          text: t.orders.dashboard.discountDeleted || `Discount removed from "${product.name}"`,
        });
      } catch (error) {
        setMessage({ type: "error", text: t.orders.dashboard.errorDeleting || "Error deleting discount" });
      }
      return;
    }

    const discountPrice = parseFloat(discountValue);
    const originalPrice = parsePrice(product.price);

    if (isNaN(discountPrice) || discountPrice < 0) {
      setMessage({ type: "error", text: t.orders.dashboard.invalidPrice || "Invalid price" });
      return;
    }

    if (discountPrice >= originalPrice) {
      setMessage({
        type: "error",
        text: t.orders.dashboard.discountPriceHigher || "Discount price must be lower than original price",
      });
      return;
    }

    setLoading(true);

    try {
      await updateDoc(doc(db, "products", productId), {
        discountPrice: formatPrice(discountPrice),
      });

      setMessage({
        type: "success",
        text: t.orders.dashboard.discountSaved || `Discount updated for "${product.name}"`,
      });
      setExpandedProduct(null);
    } catch (error) {
      setMessage({ type: "error", text: t.orders.dashboard.errorSaving || "Error saving discount" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDiscount = (product: Product) => {
    const productId = product.firebaseId || product.id.toString();
    setDiscountInputs((prev) => ({
      ...prev,
      [productId]: "",
    }));
  };

  if (products.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl text-center">
        <AlertCircle className="w-12 h-12 text-brand-orange/40 mx-auto mb-4" />
        <h3 className="text-lg font-serif text-brand-navy mb-2">
          {t.orders.dashboard.noProductsFound || 'No products found'}
        </h3>
        <p className="text-brand-navy/60">
          {t.orders.dashboard.syncProductsFirst || 'Please sync products from the system first'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-orange/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-brand-navy/5 rounded-full blur-[100px]" />
      </div>

      {/* Luxury Header */}
      <div className="relative" dir={isRtl ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="space-y-4">
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="h-[2px] w-12 bg-brand-orange" />
              <span className="text-brand-orange text-[10px] tracking-[0.4em] uppercase font-black">
                Luxury Management
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-serif text-brand-navy font-bold leading-tight">
              {t.orders.dashboard.discounts}
            </h1>
            <p className="text-brand-navy/60 max-w-xl text-lg leading-relaxed">
              {t.orders.dashboard.discountsDescription}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-brand-navy/5 text-center min-w-[140px]">
              <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest mb-2">Total Products</p>
              <p className="text-3xl font-serif font-bold text-brand-navy">{products.length}</p>
            </div>
            <div className="bg-brand-orange p-6 rounded-[2rem] shadow-xl shadow-brand-orange/20 text-center min-w-[140px] text-white">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">On Sale</p>
              <p className="text-3xl font-serif font-bold">{products.filter(p => p.discountPrice).length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-6 rounded-[2rem] flex items-center gap-4 shadow-2xl backdrop-blur-xl ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-800"
                : "bg-red-500/10 border border-red-500/20 text-red-800"
            }`}
          >
            <div className={`p-2 rounded-full ${message.type === "success" ? "bg-green-500" : "bg-red-500"} text-white`}>
              {message.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            </div>
            <p className="font-bold">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => {
          const productId = product.firebaseId || product.id.toString();
          const currentDiscount = discountInputs[productId] || "";
          const originalPrice = parsePrice(String(product.price || "0"));
          const discountPrice = currentDiscount
            ? parseFloat(currentDiscount)
            : null;
          const discountPercent =
            discountPrice && discountPrice > 0
              ? calculateDiscount(originalPrice, discountPrice)
              : 0;
          const isExpanded = expandedProduct === productId;

          return (
            <motion.div
              key={productId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative bg-white rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${
                isExpanded 
                ? "border-brand-orange shadow-2xl scale-[1.02] z-10" 
                : "border-transparent shadow-xl hover:shadow-2xl hover:border-brand-orange/20"
              }`}
            >
              {/* Image & Main Info Area */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Badges */}
                <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} flex flex-col gap-2`}>
                  {product.discountPrice && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md animate-pulse">
                      {calculateDiscount(originalPrice, parsePrice(product.discountPrice))}% OFF
                    </div>
                  )}
                  {product.isOdoo && (
                    <div className="bg-blue-500/80 text-white text-[8px] font-bold px-2 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">
                      Odoo ERP
                    </div>
                  )}
                </div>

                <div className={`absolute bottom-4 ${isRtl ? 'right-4' : 'left-4'} ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-white font-serif font-bold text-xl mb-1 drop-shadow-md">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-white/90 font-bold">{product.price}</span>
                    {product.discountPrice && (
                      <span className="text-white/40 text-xs line-through">{product.price}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : productId)}
                  className="absolute bottom-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center text-white transition-all group-hover:scale-110"
                >
                  <Percent className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Editor Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-6 bg-gradient-to-b from-white to-brand-cream/10"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.2em]">
                          {t.orders.dashboard.discountPrice}
                        </label>
                        <button 
                          onClick={() => setExpandedProduct(null)}
                          className="text-brand-navy/20 hover:text-red-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-navy/20 group-focus-within/input:text-brand-orange transition-colors">
                          <DollarSign size={20} />
                        </div>
                        <input
                          type="number"
                          value={currentDiscount}
                          onChange={(e) => handleDiscountChange(productId, e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-brand-navy/5 rounded-2xl focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all text-xl font-bold text-brand-navy"
                        />
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-brand-navy/60 uppercase">
                          <span>{t.orders.dashboard.discountRate}</span>
                          <span className="text-red-500">{discountPercent}%</span>
                        </div>
                        <div className="h-2 bg-brand-navy/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${discountPercent}%` }}
                            className="h-full bg-gradient-to-r from-brand-orange to-red-500"
                          />
                        </div>
                      </div>

                      {/* Price Comparison Summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white border border-brand-navy/5 shadow-sm">
                          <p className="text-[9px] font-bold text-brand-navy/40 uppercase mb-1">Final Price</p>
                          <p className="text-lg font-black text-green-600">
                            {formatPrice(parseFloat(currentDiscount || "0"))}
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-brand-navy/5 shadow-sm">
                          <p className="text-[9px] font-bold text-brand-navy/40 uppercase mb-1">You Save</p>
                          <p className="text-lg font-black text-brand-orange">
                            {formatPrice(Math.max(0, originalPrice - parseFloat(currentDiscount || "0")))}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveDiscount(product)}
                          disabled={loading || !currentDiscount}
                          className="flex-1 bg-brand-navy text-white py-4 rounded-2xl font-bold hover:bg-brand-orange transition-all duration-300 shadow-xl hover:shadow-brand-orange/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save size={18} />}
                          {t.orders.dashboard.saveDiscount}
                        </button>
                        {currentDiscount && (
                          <button
                            onClick={() => handleClearDiscount(product)}
                            className="w-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
        <div className="flex space-x-4 space-x-reverse">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">{t.orders.dashboard.howDiscountsWork || 'How discounts work:'}</p>
            <ul className="space-y-1 text-xs">
              <li>• {t.orders.dashboard.discountTip1 || 'Customers will see the discounted price on the website'}</li>
              <li>• {t.orders.dashboard.discountTip2 || 'Orders will be sent to the system with the discounted price as the unit price'}</li>
              <li>• {t.orders.dashboard.discountTip3 || 'You can update or delete discounts at any time'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
