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

export function DiscountsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [discountInputs, setDiscountInputs] = useState<DiscountInput>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Load products from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      orderBy("name", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        firebaseId: doc.id,
      })) as Product[];
      setProducts(productsData);

      // Initialize discount inputs
      const inputs: DiscountInput = {};
      productsData.forEach((p) => {
        if (p.discountPrice) {
          inputs[p.firebaseId || p.id.toString()] = p.discountPrice.replace(
            /[^\d.]/g,
            ""
          );
        }
      });
      setDiscountInputs(inputs);
    });

    return () => unsubscribe();
  }, []);

  const parsePrice = (priceStr: string): number => {
    return parseFloat(priceStr.replace(/[^\d.]/g, ""));
  };

  const formatPrice = (price: number): string => {
    return `⃁ ${price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculateDiscount = (
    originalPrice: number,
    discountPrice: number
  ): number => {
    if (originalPrice <= 0) return 0;
    return Math.round(
      ((originalPrice - discountPrice) / originalPrice) * 100
    );
  };

  const handleDiscountChange = (productId: string, value: string) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^\d.]/g, "");
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
          text: `التخفيض تم حذفه من "${product.name}"`,
        });
      } catch (error) {
        setMessage({ type: "error", text: "حدث خطأ في الحذف" });
      }
      return;
    }

    const discountPrice = parseFloat(discountValue);
    const originalPrice = parsePrice(product.price);

    if (isNaN(discountPrice) || discountPrice < 0) {
      setMessage({ type: "error", text: "السعر غير صحيح" });
      return;
    }

    if (discountPrice >= originalPrice) {
      setMessage({
        type: "error",
        text: "سعر التخفيض يجب أن يكون أقل من السعر الأصلي",
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
        text: `تم تعديل التخفيض على "${product.name}"`,
      });
      setExpandedProduct(null);
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ في الحفظ" });
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
          لا توجد منتجات
        </h3>
        <p className="text-brand-navy/60">
          يرجى مزامنة المنتجات من أودو أولاً
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 space-x-reverse mb-4">
          <div className="p-2 bg-brand-orange/10 rounded-lg">
            <Percent className="w-5 h-5 text-brand-orange" />
          </div>
          <h2 className="text-3xl font-serif text-brand-navy">
            إدارة التخفيضات
          </h2>
        </div>
        <p className="text-brand-navy/60">
          عيّن أسعار مخفضة للمنتجات. ستظهر الأسعار المخفضة للعملاء في الموقع وفي
          نظام أودو
        </p>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl flex items-start space-x-3 space-x-reverse ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm font-medium ${
                message.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }`}
            >
              {message.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="space-y-4">
        {products.map((product) => {
          const productId = product.firebaseId || product.id.toString();
          const currentDiscount = discountInputs[productId] || "";
          const originalPrice = parsePrice(product.price);
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
              className="bg-white border border-brand-navy/5 rounded-2xl overflow-hidden hover:border-brand-orange/20 transition-all"
            >
              {/* Product Header */}
              <button
                onClick={() =>
                  setExpandedProduct(isExpanded ? null : productId)
                }
                className="w-full p-6 flex items-start justify-between hover:bg-brand-cream/50 transition-colors"
              >
                <div className="flex items-start space-x-4 space-x-reverse flex-1 text-right">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-brand-navy mb-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <span className="text-brand-orange font-bold">
                        {product.price}
                      </span>
                      {product.discountPrice && (
                        <>
                          <span className="text-brand-navy/40 line-through">
                            السعر الأصلي
                          </span>
                          <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                            {calculateDiscount(
                              originalPrice,
                              parsePrice(product.discountPrice)
                            )}
                            % تخفيض
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-brand-navy/40 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expansion Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-brand-navy/5 bg-brand-cream/30"
                  >
                    <div className="p-6 space-y-6">
                      {/* Original Price Display */}
                      <div className="bg-white p-4 rounded-xl border border-brand-navy/5">
                        <label className="text-xs font-bold text-brand-navy/60 uppercase tracking-widest block mb-2">
                          السعر الأصلي
                        </label>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <DollarSign className="w-4 h-4 text-brand-navy/40" />
                          <span className="text-2xl font-bold text-brand-orange">
                            {product.price}
                          </span>
                        </div>
                      </div>

                      {/* Discount Price Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-brand-navy/60 uppercase tracking-widest block">
                          سعر التخفيض
                        </label>
                        <div className="flex items-center space-x-2">
                          <span className="text-brand-navy/40">⃁</span>
                          <input
                            type="number"
                            value={currentDiscount}
                            onChange={(e) =>
                              handleDiscountChange(productId, e.target.value)
                            }
                            placeholder="أدخل السعر المخفض"
                            className="flex-1 px-4 py-3 border-2 border-brand-navy/10 rounded-xl focus:outline-none focus:border-brand-orange transition-colors"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        {currentDiscount && !isNaN(parseFloat(currentDiscount)) && (
                          <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-brand-navy/60">
                                نسبة التخفيض:
                              </span>
                              <span className="font-bold text-red-600">
                                {discountPercent}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-brand-navy/60">
                                السعر بعد التخفيض:
                              </span>
                              <span className="font-bold text-green-600">
                                {formatPrice(parseFloat(currentDiscount))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-brand-navy/60">
                                المدخرات:
                              </span>
                              <span className="font-bold text-brand-orange">
                                {formatPrice(
                                  originalPrice - parseFloat(currentDiscount)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3 space-x-reverse pt-4">
                        <button
                          onClick={() => handleSaveDiscount(product)}
                          disabled={loading || !currentDiscount}
                          className="flex-1 flex items-center justify-center space-x-2 space-x-reverse bg-brand-orange hover:bg-brand-orange-hover disabled:bg-brand-orange/40 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>حفظ التخفيض</span>
                        </button>
                        {currentDiscount && (
                          <button
                            onClick={() => handleClearDiscount(product)}
                            className="px-4 py-3 border-2 border-red-200 hover:border-red-300 text-red-600 rounded-xl transition-all"
                            title="حذف"
                          >
                            <X className="w-4 h-4" />
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
            <p className="font-semibold mb-2">كيفية عمل التخفيضات:</p>
            <ul className="space-y-1 text-xs">
              <li>• العميل سيرى السعر المخفض في الموقع</li>
              <li>• الطلب سيُرسل إلى أودو بسعر التخفيض كسعر الوحدة</li>
              <li>• يمكنك تحديث أو حذف التخفيضات في أي وقت</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
