import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, ShoppingCart, Package, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Dashboard() {
    const { business, profile } = useAuthStore();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentTransactions();
    }, []);

    async function fetchRecentTransactions() {
        try {
            // Fetch last 5 transactions from the finance view (Sales + Expenses)
            const { data, error } = await supabase
                .from('finance_transactions')
                .select('*')
                .order('date', { ascending: false })
                .limit(5);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hoş Geldin, {profile?.full_name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500">{business?.name || 'İşletmem'} - Genel Bakış</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <div
                    onClick={() => navigate('/sales')}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ShoppingCart size={28} />
                    </div>
                    <span className="font-semibold text-slate-700">Hızlı Satış</span>
                </div>

                <div
                    onClick={() => navigate('/stock')}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="p-4 bg-green-50 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <Package size={28} />
                    </div>
                    <span className="font-semibold text-slate-700">Stok Yönetimi</span>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400" />
                        Son Hareketler
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3">Tarih</th>
                                <th className="px-4 py-3">Tür</th>
                                <th className="px-4 py-3">Açıklama</th>
                                <th className="px-4 py-3 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((tx, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-500">
                                        {format(new Date(tx.date), 'd MMM HH:mm', { locale: tr })}
                                    </td>
                                    <td className="px-4 py-3">
                                        {tx.type === 'in' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <TrendingUp size={12} /> {tx.source_type === 'sale' ? 'Satış' : 'Gelir'}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                <TrendingDown size={12} /> {tx.source_type === 'expense' ? 'Gider' : 'Çıkış'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {tx.description || '-'}
                                        {tx.payment_method && <span className="text-slate-400 font-normal ml-2">({tx.payment_method})</span>}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'in' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                                        Henüz işlem yok.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
