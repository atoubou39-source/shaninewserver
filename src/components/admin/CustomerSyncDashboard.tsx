import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../auth';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  RefreshCw,
  Mail,
  Shield,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Filter,
  UserPlus
} from 'lucide-react';

interface Customer {
  id: string;
  facilityName: string;
  email: string;
  phoneNumber: string;
  odooPartnerId?: number;
  accountActivated: boolean;
  createdAt: string;
  activatedAt?: string;
  role: string;
}



export const CustomerSyncDashboard = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'activated'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    odooId: ''
  });

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/odoo/webhook'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-odoo-secret': 'manual-sync' // Special bypass or just use the real one if known
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          odoo_id: parseInt(newCustomer.odooId),
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowAddForm(false);
        setNewCustomer({ name: '', email: '', phone: '', odooId: '' });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Add failed:", error);
      alert("فشل في إضافة العميل. تأكد من صحة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    // onSnapshot handles the real-time update, but we can manually trigger a small delay to show feedback
    setTimeout(() => setLoading(false), 500);
  };

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(data.filter(c => c.role === 'customer'));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleActivate = async (uid: string) => {
    setActionLoading(uid);
    try {
      const response = await fetch(getApiUrl('/api/admin/activate-customer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
    } catch (error) {
      console.error("Activation failed:", error);
      alert("فشل في تفعيل الحساب.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.facilityName?.toLowerCase().includes(search.toLowerCase()) || 
                          c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ? true : 
                         filter === 'activated' ? c.accountActivated : !c.accountActivated;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand-navy/5">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-brand-navy text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-navy/10">
              <Users size={24} />
            </div>
            <h1 className="text-3xl font-serif text-brand-navy font-bold">إدارة العملاء</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium pr-1">مزامنة وإدارة حسابات عملاء أودو في Firebase</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-brand-orange text-white px-6 py-3 rounded-2xl text-[10px] font-bold tracking-widest hover:bg-brand-navy transition-all shadow-lg shadow-brand-orange/10 flex items-center"
          >
            <UserPlus size={16} className="ml-2" />
            إضافة عميل يدوياً
          </button>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="البحث عن عميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-12 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-orange/10 focus:border-brand-orange transition-all w-64 text-sm"
              dir="rtl"
            />
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            {(['all', 'pending', 'activated'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                  filter === f ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد التفعيل' : 'مفعل'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'إجمالي العملاء', count: customers.length, icon: Users, color: 'brand-navy' },
          { label: 'بانتظار التفعيل', count: customers.filter(c => !c.accountActivated).length, icon: Clock, color: 'brand-orange' },
          { label: 'حسابات نشطة', count: customers.filter(c => c.accountActivated).length, icon: CheckCircle2, color: 'green-500' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2rem] border border-brand-navy/5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-4 bg-${stat.color}/10 rounded-2xl`}>
                <stat.icon className={`text-${stat.color}`} size={24} />
              </div>
              <span className="text-4xl font-serif font-bold text-brand-navy">{stat.count}</span>
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Manual Add Form Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl space-y-8"
              dir="rtl"
            >
              <div className="text-center">
                <h3 className="text-2xl font-serif text-brand-navy font-bold">إضافة عميل يدوياً</h3>
                <p className="text-gray-400 text-sm mt-2">أدخل بيانات العميل لمزامنته مع Firebase</p>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">الاسم</label>
                    <input 
                      required
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange text-sm"
                      placeholder="Azure Interior"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">رقم Odoo ID</label>
                    <input 
                      required
                      type="number"
                      value={newCustomer.odooId}
                      onChange={(e) => setNewCustomer({...newCustomer, odooId: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange text-sm"
                      placeholder="9999"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">البريد الإلكتروني</label>
                  <input 
                    required
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange text-sm"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                  <input 
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-orange text-sm"
                    placeholder="+966..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-brand-navy text-white py-4 rounded-2xl font-bold hover:bg-brand-orange transition-all"
                  >
                    إضافة العميل
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-brand-navy/5 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-serif text-brand-navy font-bold">كل العملاء</h3>
          <button 
            onClick={refreshData}
            className={`text-gray-400 hover:text-brand-navy transition-colors ${loading ? 'animate-spin' : ''}`}
            title="تحديث البيانات"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">العميل</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">معلومات Odoo</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">حالة الحساب</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">تاريخ الانضمام</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-orange mx-auto" />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="text-gray-400 space-y-3">
                      <Users size={48} className="mx-auto opacity-20" />
                      <p className="font-medium">لم يتم العثور على عملاء</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="w-12 h-12 bg-brand-cream rounded-2xl flex items-center justify-center font-serif text-brand-navy font-bold text-lg">
                          {customer.facilityName?.[0]}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-brand-navy">{customer.facilityName}</p>
                          <p className="text-xs text-brand-slate/60 flex items-center">
                            <Mail size={12} className="ml-1" />
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="inline-flex items-center px-3 py-1 bg-brand-navy/5 text-brand-navy rounded-lg text-[10px] font-bold">
                          ID: {customer.odooPartnerId}
                        </div>
                        <p className="text-xs text-gray-400 font-medium">#{customer.phoneNumber}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {customer.accountActivated ? (
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold">
                          <CheckCircle2 size={14} className="ml-1.5" />
                          مفعل
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-bold">
                          <Clock size={14} className="ml-1.5" />
                          قيد المراجعة
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-gray-400 font-medium tracking-tight">
                        {new Date(customer.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {!customer.accountActivated && (
                          <button 
                            onClick={() => handleActivate(customer.id)}
                            disabled={actionLoading === customer.id}
                            className="bg-brand-navy text-white px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-widest hover:bg-brand-orange transition-all disabled:opacity-50"
                          >
                            {actionLoading === customer.id ? "جاري..." : "تفعيل الحساب"}
                          </button>
                        )}
                        <button className="p-2 text-gray-400 hover:text-brand-navy transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
