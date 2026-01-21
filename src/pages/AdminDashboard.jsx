import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Building2, Search, Calendar, CheckCircle, XCircle, Edit, Save, Loader2, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
    const { profile } = useAuthStore();
    const [plans, setPlans] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editDate, setEditDate] = useState('');

    useEffect(() => {
        if (profile?.role === 'super_admin') {
            fetchBusinesses();
            fetchPlans();
        }
    }, [profile]);

    async function fetchPlans() {
        const { data } = await supabase.from('plans').select('*');
        if (data) setPlans(data);
    }

    async function fetchBusinesses() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*, plans(id, name)'); // Select plan id too

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            toast.error('İşletmeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdatePlan(businessId, newPlanId) {
        if (!confirm('Bu işletmenin paketini değiştirmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('businesses')
                .update({ plan_id: newPlanId })
                .eq('id', businessId);

            if (error) throw error;
            toast.success('Paket güncellendi');
            fetchBusinesses();
        } catch (error) {
            toast.error('Güncelleme hatası: ' + error.message);
        }
    }

    async function handleExtendLicense(businessId, days) {
        // ... (existing code)
        try {
            const business = businesses.find(b => b.id === businessId);
            const currentEnd = business.subscription_end_date ? new Date(business.subscription_end_date) : new Date();
            const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
            baseDate.setDate(baseDate.getDate() + days);

            const { error } = await supabase
                .from('businesses')
                .update({ subscription_end_date: baseDate.toISOString() })
                .eq('id', businessId);

            if (error) throw error;

            toast.success(`${days} gün eklendi`);
            fetchBusinesses();
        } catch (error) {
            toast.error('Hata: ' + error.message);
        }
    }

    // ... (handleSaveDate existing)

    async function handleSaveDate(businessId) {
        try {
            const { error } = await supabase
                .from('businesses')
                .update({ subscription_end_date: new Date(editDate).toISOString() })
                .eq('id', businessId);

            if (error) throw error;
            toast.success('Tarih güncellendi');
            setEditingId(null);
            fetchBusinesses();
        } catch (error) {
            toast.error('Hata: ' + error.message);
        }
    }

    if (profile?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <XCircle size={48} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Yetkisiz Erişim</h1>
                <p className="text-slate-500 mt-2">Bu sayfayı görüntülemek için "Süper Yönetici" yetkisine sahip olmalısınız.</p>
            </div>
        );
    }

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-3xl">👑</span> Süper Yönetici Paneli
                    </h1>
                    <p className="text-slate-500">Tüm işletmeleri ve lisans durumlarını yönetin.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="İşletme Ara..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">İşletme</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Paket Seçimi</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Durum</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Bitiş Tarihi</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Süre İşlemleri</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Yükleniyor...</td></tr>
                            ) : filteredBusinesses.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredBusinesses.map((biz) => {
                                    const isExpired = !biz.subscription_end_date || new Date(biz.subscription_end_date) < new Date();
                                    const daysLeft = biz.subscription_end_date ? Math.ceil((new Date(biz.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                                    return (
                                        <tr key={biz.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                                        {biz.name.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{biz.name}</p>
                                                        <p className="text-xs text-slate-500">{biz.email || 'No Email'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                                                    value={biz.plan_id || ''}
                                                    onChange={(e) => handleUpdatePlan(biz.id, e.target.value)}
                                                >
                                                    {plans.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {isExpired ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                            Süresi Dolmuş
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Aktif ({daysLeft} gün)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {editingId === biz.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="date"
                                                            className="border rounded p-1 text-xs"
                                                            value={editDate}
                                                            onChange={e => setEditDate(e.target.value)}
                                                        />
                                                        <button onClick={() => handleSaveDate(biz.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={16} /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><XCircle size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                                        setEditingId(biz.id);
                                                        setEditDate(biz.subscription_end_date ? biz.subscription_end_date.split('T')[0] : '');
                                                    }}>
                                                        <Calendar size={16} className="text-slate-400" />
                                                        {biz.subscription_end_date ? new Date(biz.subscription_end_date).toLocaleDateString('tr-TR') : '-'}
                                                        <Edit size={12} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleExtendLicense(biz.id, 30)} title="30 Gün Ekle">
                                                        +1 Ay
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleExtendLicense(biz.id, 365)} title="1 Yıl Ekle">
                                                        +1 Yıl
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
