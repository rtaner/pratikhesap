import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import { ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function StockHistoryModal({ isOpen, onClose, product }) {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && product) {
            fetchHistory();
        }
    }, [isOpen, product]);

    async function fetchHistory() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('product_id', product.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMovements(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }

    if (!product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Stok Geçmişi: ${product.name}`} size="lg">
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-sm text-slate-500">Mevcut Stok</span>
                    <span className={`font-bold text-lg ${product.stock_quantity <= product.critical_stock_level ? 'text-red-500' : 'text-slate-800'}`}>
                        {product.stock_quantity}
                    </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-4 py-2">Tarih</th>
                                <th className="px-4 py-2">İşlem</th>
                                <th className="px-4 py-2">Miktar</th>
                                <th className="px-4 py-2">Açıklama</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-4 text-center">Yükleniyor...</td></tr>
                            ) : movements.length === 0 ? (
                                <tr><td colSpan="4" className="p-4 text-center text-slate-400">Kayıt bulunamadı.</td></tr>
                            ) : (
                                movements.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-600">
                                            {format(new Date(m.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {m.amount > 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                                {m.type === 'sale' ? 'Satış' :
                                                    m.type === 'purchase' ? 'Alım' :
                                                        m.type === 'return' ? 'İade' :
                                                            m.type === 'adjustment' ? 'Düzeltme' : m.type}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-2 font-bold ${m.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.amount > 0 ? '+' : ''}{m.amount}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">
                                            {m.description || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
