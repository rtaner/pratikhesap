import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { ArrowLeft, Phone, Calendar, ArrowUpRight, ArrowDownLeft, Wallet, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { business } = useAuthStore();
    const [customer, setCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount: '',
        method: 'cash', // cash, credit_card
        description: ''
    });

    useEffect(() => {
        if (id && business) {
            fetchCustomerData();
        }
    }, [id, business]);

    async function fetchCustomerData() {
        setLoading(true);
        try {
            // 1. Fetch Customer Info
            const { data: customerData, error: custError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (custError) throw custError;

            // 2. Fetch Sales (Debts)
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('id, date, final_amount, payment_method')
                .eq('customer_id', id)
                //.eq('payment_method', 'on_account') // Show all sales? Or only Veresiye? Let's show all for history.
                .order('date', { ascending: false });

            if (salesError) throw salesError;

            // 3. Fetch Payments (Collections)
            const { data: payments, error: payError } = await supabase
                .from('customer_payments')
                .select('id, date, amount, payment_method, description')
                .eq('customer_id', id)
                .order('date', { ascending: false });

            if (payError) throw payError;

            // Merge and Sort Transactions
            const combined = [
                ...sales.map(s => ({ ...s, type: 'sale' })),
                ...payments.map(p => ({ ...p, type: 'payment' }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            setCustomer(customerData);
            setTransactions(combined);

        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Müşteri bilgileri alınamadı.');
        } finally {
            setLoading(false);
        }
    }

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        try {
            const amount = parseFloat(paymentData.amount);
            if (!amount || amount <= 0) {
                alert('Geçerli bir tutar giriniz.');
                return;
            }

            const { data, error } = await supabase.rpc('process_customer_payment', {
                p_customer_id: id,
                p_amount: amount,
                p_method: paymentData.method,
                p_description: paymentData.description
            });

            if (error) throw error;

            setIsPaymentModalOpen(false);
            setPaymentData({ amount: '', method: 'cash', description: '' });
            fetchCustomerData(); // Refresh all data

        } catch (error) {
            console.error('Payment error:', error);
            alert('Tahsilat kaydedilirken hata oluştu: ' + error.message);
        }
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;
    if (!customer) return <div className="p-10 text-center">Müşteri bulunamadı.</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/customers')} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
                    <div className="flex items-center gap-4 text-slate-500 text-sm">
                        {customer.phone && (
                            <div className="flex items-center gap-1">
                                <Phone size={14} /> {customer.phone}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">Güncel Bakiye</p>
                    <p className={`text-2xl font-bold ${customer.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {customer.balance?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <p className="text-slate-600 font-medium">İşlemler</p>
                <div className="flex gap-2">
                    {/* Could add 'Edit' or 'Send Statement' buttons later */}
                    <span className='text-xs text-slate-400 self-center hidden sm:inline'>Borç eklemek için "Satış" ekranını kullanın.</span>
                    <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => setIsPaymentModalOpen(true)}>
                        <ArrowDownLeft size={18} />
                        Tahsilat Ekle (Ödeme)
                    </Button>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-2">
                    <Calendar size={18} />
                    İşlem Geçmişi
                </div>

                <div className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                        <div key={`${tx.type}-${tx.id}`} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${tx.type === 'sale' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                    {tx.type === 'sale' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">
                                        {tx.type === 'sale' ? 'Satış / Borçlanma' : 'Tahsilat / Ödeme'}
                                    </p>
                                    <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-slate-500">
                                        <span>{new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {tx.payment_method && <span className="capitalize">({tx.payment_method === 'on_account' ? 'Veresiye' : tx.payment_method})</span>}
                                        {tx.description && <span>- {tx.description}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className={`font-bold ${tx.type === 'sale' ? 'text-red-500' : 'text-green-600'}`}>
                                {tx.type === 'sale' ? '+' : '-'}
                                {Number(tx.type === 'sale' ? tx.final_amount : tx.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            Henüz işlem kaydı yok.
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Tahsilat Ekle (Ödeme Al)"
                size="sm"
            >
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4">
                        Bu işlem müşterinin bakiyesinden düşülecektir.
                    </div>

                    <Input
                        label="Tutar (TL)"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        required
                        autoFocus
                    />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ödeme Yöntemi</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentData({ ...paymentData, method: 'cash' })}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${paymentData.method === 'cash'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <Wallet size={20} />
                                <span className="text-sm font-medium">Nakit</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentData({ ...paymentData, method: 'credit_card' })}
                                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${paymentData.method === 'credit_card'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <CreditCard size={20} />
                                <span className="text-sm font-medium">Kredi Kartı</span>
                            </button>
                        </div>
                    </div>

                    <Input
                        label="Açıklama (Opsiyonel)"
                        placeholder="Örn: Şubat Taksiti"
                        value={paymentData.description}
                        onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>İptal</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700">Tahsil Et</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
