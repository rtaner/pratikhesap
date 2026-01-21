import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, MoreVertical, Pencil, Trash2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { format, subDays, startOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function Accounts() {
    const { business } = useAuthStore();
    const [loading, setLoading] = useState(true);

    // Data States
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [showDaySummary, setShowDaySummary] = useState(false);
    const [stats, setStats] = useState({
        todayTurnover: 0,
        yesterdayTurnover: 0,
        monthTurnover: 0,
        totalAssets: 0
    });

    // Modal States
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState('in'); // 'in' or 'out'

    // Form States
    const [accountForm, setAccountForm] = useState({ name: '', type: 'cash', balance: 0 }); // balance only for init
    const [transactionForm, setTransactionForm] = useState({
        account_id: '',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        await Promise.all([
            fetchAccounts(),
            fetchStats(),
            fetchTransactions()
        ]);
        setLoading(false);
    }

    async function fetchAccounts() {
        const { data } = await supabase.from('accounts').select('*').order('name');
        setAccounts(data || []);
        // Update total assets from accounts
        const total = data?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;
        setStats(prev => ({ ...prev, totalAssets: total }));
    }

    async function fetchStats() {
        const today = new Date();
        const yesterday = subDays(today, 1);
        const monthStart = startOfMonth(today);

        // Helper to get sales sum
        const getSalesSum = async (startDate, endDate) => {
            const { data } = await supabase
                .from('sales')
                .select('total_amount')
                .gte('date', startOfDay(startDate).toISOString())
                .lte('date', endOfDay(endDate).toISOString());
            return data?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
        };

        const [todaySal, yesterdaySal, monthSal] = await Promise.all([
            getSalesSum(today, today),
            getSalesSum(yesterday, yesterday),
            getSalesSum(monthStart, today)
        ]);

        setStats(prev => ({
            ...prev,
            todayTurnover: todaySal,
            yesterdayTurnover: yesterdaySal,
            monthTurnover: monthSal
        }));
    }

    async function fetchTransactions() {
        const { data, error } = await supabase
            .from('finance_transactions') // Use the new View
            .select('*')
            .order('date', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching transactions:', error);
            return;
        }
        setTransactions(data || []);
    }

    // --- Actions ---

    const [activeMenuId, setActiveMenuId] = useState(null);
    const [editingAccount, setEditingAccount] = useState(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                const { error } = await supabase.from('accounts')
                    .update({
                        name: accountForm.name,
                        type: accountForm.type
                        // Balance update handled via transactions usually, but maybe allow correction here? 
                        // For safety, let's not update balance directly here unless user explicitly wants to "Correction".
                        // Logic: If user changes balance here, we should create a correction transaction. 
                        // For simplicity V1: Only name/type update.
                    })
                    .eq('id', editingAccount.id);
                if (error) throw error;
                toast.success('Hesap güncellendi');
            } else {
                const { error } = await supabase.from('accounts').insert({
                    business_id: business.id,
                    name: accountForm.name,
                    type: accountForm.type,
                    balance: Number(accountForm.balance)
                });
                if (error) throw error;
                toast.success('Hesap oluşturuldu');
            }

            setIsAccountModalOpen(false);
            setEditingAccount(null);
            setAccountForm({ name: '', type: 'cash', balance: 0 });
            fetchAccounts();
        } catch (error) {
            toast.error('Hata: ' + error.message);
        }
    };

    const handleEditAccount = (acc) => {
        setEditingAccount(acc);
        setAccountForm({ name: acc.name, type: acc.type, balance: acc.balance });
        setIsAccountModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteAccount = async (id) => {
        if (!window.confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
        try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            if (error) throw error;
            toast.success('Hesap silindi');
            fetchAccounts();
        } catch (error) {
            toast.error('Hata: Hesabın işlem geçmişi olabilir. Önce işlemleri silin.');
        }
    };

    const handleCreateTransaction = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.rpc('process_account_transaction', {
                p_account_id: transactionForm.account_id,
                p_type: transactionType,
                p_amount: Number(transactionForm.amount),
                p_description: transactionForm.description,
                p_category: transactionForm.category,
                p_date: new Date(transactionForm.date)
            });

            if (error) throw error;

            toast.success('İşlem kaydedildi');
            setIsTransactionModalOpen(false);
            setTransactionForm({ account_id: '', amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0] });
            fetchData(); // Refresh all
        } catch (error) {
            console.error(error);
            toast.error('İşlem hatası: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hesaplar & Kasa</h1>
                    <p className="text-slate-500">Nakit akışı ve hesap yönetimi</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsAccountModalOpen(true)}>
                        <Plus size={18} className="mr-2" />
                        Yeni Hesap
                    </Button>
                    <Button variant="primary" onClick={() => { setTransactionType('in'); setIsTransactionModalOpen(true); }} className="bg-green-600 hover:bg-green-700">
                        <ArrowDownRight size={18} className="mr-2" />
                        Para Girişi
                    </Button>
                    <Button variant="primary" onClick={() => { setTransactionType('out'); setIsTransactionModalOpen(true); }} className="bg-red-600 hover:bg-red-700">
                        <ArrowUpRight size={18} className="mr-2" />
                        Para Çıkışı
                    </Button>
                    <Button variant="outline" onClick={() => setShowDaySummary(true)} className="ml-2 border-slate-300 text-slate-700">
                        <Calendar size={18} className="mr-2" />
                        Gün Sonu
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard title="Bugünün Cirosu" value={stats.todayTurnover} icon={Banknote} color="blue" />
                <StatsCard title="Dünün Cirosu" value={stats.yesterdayTurnover} icon={Calendar} color="slate" />
                <StatsCard title="Bu Ayın Cirosu" value={stats.monthTurnover} icon={Banknote} color="purple" />
                <StatsCard title="Toplam Varlık" value={stats.totalAssets} icon={Wallet} color="green" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Accounts List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Wallet size={20} />
                        Hesaplarım
                    </h2>
                    <div className="space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${acc.type === 'bank' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                            {acc.type === 'bank' ? <CreditCard size={20} /> : <Banknote size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900">{acc.name}</h3>
                                            <span className="text-xs text-slate-400 capitalize">{acc.type === 'pos' ? 'POS Cihazı' : acc.type === 'bank' ? 'Banka Hesabı' : 'Nakit Kasa'}</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === acc.id ? null : acc.id);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                        >
                                            <MoreVertical size={18} />
                                        </button>

                                        {activeMenuId === acc.id && (
                                            <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-slate-100 z-10 py-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditAccount(acc);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Pencil size={14} /> Düzenle
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteAccount(acc.id);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} /> Sil
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <span className="text-2xl font-bold text-slate-800">
                                        {Number(acc.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Transactions */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <ArrowUpRight size={20} />
                        Son Hareketler
                    </h2>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Tarih</th>
                                    <th className="px-4 py-3">Açıklama</th>
                                    <th className="px-4 py-3">Hesap</th>
                                    <th className="px-4 py-3">Kategori</th>
                                    <th className="px-4 py-3 text-right">Tutar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-500">
                                            {format(new Date(tx.date), 'dd.MM HH:mm')}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {tx.description}
                                            {tx.source_type && <span className="ml-2 text-xs text-slate-400">({tx.source_type})</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {tx.account_name || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                                                {tx.category || 'Genel'}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'in' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">
                                            Henüz işlem hareketi yok.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title="Yeni Hesap Oluştur">
                <form onSubmit={handleCreateAccount} className="space-y-4 pt-4">
                    <Input
                        label="Hesap Adı"
                        placeholder="Örn: Garanti Bankası"
                        value={accountForm.name}
                        onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hesap Türü</label>
                        <select
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                            value={accountForm.type}
                            onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}
                        >
                            <option value="cash">Nakit Kasa</option>
                            <option value="bank">Banka Hesabı</option>
                            <option value="pos">POS Hesabı</option>
                        </select>
                    </div>
                    <Input
                        label="Açılış Bakiyesi"
                        type="number"
                        value={accountForm.balance}
                        onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })}
                    />
                    <div className="flex justify-end pt-2">
                        <Button type="submit">Oluştur</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                title={transactionType === 'in' ? 'Para Girişi Ekle' : 'Para Çıkışı Ekle'}
            >
                <form onSubmit={handleCreateTransaction} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hesap Seçin</label>
                        <select
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                            value={transactionForm.account_id}
                            onChange={e => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                            required
                        >
                            <option value="">Seçiniz</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance} ₺)</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tutar"
                            type="number"
                            step="0.01"
                            value={transactionForm.amount}
                            onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                            required
                        />
                        <Input
                            label="Tarih"
                            type="date"
                            value={transactionForm.date}
                            onChange={e => setTransactionForm({ ...transactionForm, date: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Kategori"
                        placeholder={transactionType === 'in' ? 'Örn: Sermaye Ekleme' : 'Örn: Para Çekme'}
                        value={transactionForm.category}
                        onChange={e => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    />

                    <Input
                        label="Açıklama"
                        placeholder="Detay..."
                        value={transactionForm.description}
                        onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    />

                    <div className="flex justify-end pt-2">
                        <Button type="submit" className={transactionType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                            {transactionType === 'in' ? 'Girişi Kaydet' : 'Çıkışı Kaydet'}
                        </Button>
                    </div>
                </form>
            </Modal>


            {/* Day Summary Modal */}
            <Modal isOpen={showDaySummary} onClose={() => setShowDaySummary(false)} title="Gün Sonu Özeti (İcmal)">
                <DaySummaryContent onClose={() => setShowDaySummary(false)} />
            </Modal>
        </div >
    );
}

function DaySummaryContent({ onClose }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSummary() {
            const today = new Date();
            const start = startOfDay(today).toISOString();
            const end = endOfDay(today).toISOString();

            // Fetch all transactions for today from the View
            const { data } = await supabase
                .from('finance_transactions')
                .select('*')
                .gte('date', start)
                .lte('date', end);

            const txs = data || [];

            const totalIn = txs.filter(t => t.type === 'in').reduce((sum, t) => sum + Number(t.amount), 0);
            const totalOut = txs.filter(t => t.type === 'out').reduce((sum, t) => sum + Number(t.amount), 0);

            // Breakdown
            const cashIn = txs.filter(t => t.type === 'in' && t.account_name === 'Nakit Kasa').reduce((sum, t) => sum + Number(t.amount), 0);
            const cardIn = txs.filter(t => t.type === 'in' && t.account_name === 'Banka/POS').reduce((sum, t) => sum + Number(t.amount), 0);

            setSummary({
                totalIn,
                totalOut,
                net: totalIn - totalOut,
                cashIn,
                cardIn,
                txCount: txs.length
            });
            setLoading(false);
        }
        loadSummary();
    }, []);

    if (loading) return <div className="p-8 text-center">Hesaplanıyor...</div>;

    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-xs text-green-600 font-medium">Toplam Giriş</p>
                    <p className="text-lg font-bold text-green-700">+{summary.totalIn.toLocaleString('tr-TR')} ₺</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-600 font-medium">Toplam Çıkış</p>
                    <p className="text-lg font-bold text-red-700">-{summary.totalOut.toLocaleString('tr-TR')} ₺</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-600 font-medium">Net Değişim</p>
                    <p className="text-lg font-bold text-blue-700">{summary.net > 0 ? '+' : ''}{summary.net.toLocaleString('tr-TR')} ₺</p>
                </div>
            </div>

            <div className="space-y-2 border-t pt-4">
                <h4 className="font-medium text-slate-800 text-sm">Detaylar</h4>
                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                    <span className="text-slate-500">Nakit Satış/Giriş</span>
                    <span className="font-medium">{summary.cashIn.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-slate-50">
                    <span className="text-slate-500">Kredi Kartı/Banka</span>
                    <span className="font-medium">{summary.cardIn.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-500">İşlem Sayısı</span>
                    <span className="font-medium">{summary.txCount} Adet</span>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button onClick={onClose} variant="outline" className="w-full justify-center">
                    Kapat
                </Button>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        slate: 'bg-slate-50 text-slate-600',
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
                {/* Trend indicator could go here */}
            </div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </h3>
        </div>
    );
}
