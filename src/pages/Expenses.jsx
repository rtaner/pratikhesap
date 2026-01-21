import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Search, Pencil, Trash2, Wallet, Calendar } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Expenses() {
    const { business } = useAuthStore();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                business_id: business.id,
                title: formData.title.toUpperCase(),
                amount: parseFloat(formData.amount),
                date: formData.date, // Format: YYYY-MM-DD
                description: formData.description
            };

            if (editingId) {
                const { error } = await supabase
                    .from('expenses')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Kaydedilirken hata oluştu.');
        }
    };

    const handleEdit = (expense) => {
        setEditingId(expense.id);
        setFormData({
            title: expense.title,
            amount: expense.amount,
            date: expense.date ? expense.date.split('T')[0] : '',
            description: expense.description || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu gideri silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchExpenses();
        } catch (error) {
            console.error(error);
            alert('Silinirken hata oluştu.');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
        });
    };

    const filteredExpenses = expenses.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Giderler</h1>
                    <p className="text-slate-500">İşletme giderleri ve ödemeler</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
                    <Plus size={20} />
                    Yeni Gider
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                        <Input
                            placeholder="Gider adı ara..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Total Badge */}
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 font-medium">Toplam Gider</p>
                            <p className="text-xs text-red-400">Listelenen kayıtlar</p>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {totalExpenses.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Tarih</th>
                            <th className="px-6 py-4">Gider Başlığı</th>
                            <th className="px-6 py-4">Açıklama</th>
                            <th className="px-6 py-4 text-right">Tutar</th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-600 w-32">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        {new Date(expense.date).toLocaleDateString('tr-TR')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {expense.title}
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                    {expense.description || '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-red-600">
                                    - {Number(expense.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(expense)} className="p-2 hover:bg-slate-100 rounded text-slate-500 transition-colors">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-red-50 rounded text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                                    Kayıt bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Gider Düzenle" : "Yeni Gider Ekle"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Gider Başlığı"
                        placeholder="Örn: Kira, Elektrik, Yemek..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        uppercase
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tutar (TL)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                        <Input
                            label="Tarih"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>
                    <Input
                        label="Açıklama (İsteğe bağlı)"
                        placeholder="Detaylar..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
