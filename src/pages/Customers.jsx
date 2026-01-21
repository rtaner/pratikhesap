import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Search, Pencil, Trash2, User, Phone, MapPin } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Customers() {
    const navigate = useNavigate();
    const { business } = useAuthStore();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        initial_balance: 0
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                business_id: business.id,
                name: formData.name.toUpperCase(),
                phone: formData.phone,
                email: formData.email,
                address: formData.address
            };

            if (editingId) {
                // Edit mode (don't update balance directly here, use transactions)
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create mode
                // If there is an initial balance, we might need to handle it? 
                // For now let's just allow setting balance if the column exists or rely on backend default 0.
                // We can add initial_balance to payload if we want to set it on create.
                if (formData.initial_balance) {
                    payload.balance = parseFloat(formData.initial_balance);
                }

                const { error } = await supabase
                    .from('customers')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Kaydedilirken hata oluştu.');
        }
    };

    const handleEdit = (customer) => {
        setEditingId(customer.id);
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            initial_balance: 0 // Only used for new customers
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCustomers();
        } catch (error) {
            console.error(error);
            alert('Silinirken hata oluştu.');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', phone: '', email: '', address: '', initial_balance: 0 });
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Müşteriler</h1>
                    <p className="text-slate-500">Müşteri listesi ve cari hesaplar</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
                    <Plus size={20} />
                    Yeni Müşteri
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <Input
                        placeholder="Müşteri adı veya telefon ara..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Müşteri Adı</th>
                            <th className="px-6 py-4">İletişim</th>
                            <th className="px-6 py-4">Adres</th>
                            <th className="px-6 py-4 text-right">Bakiye</th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map((customer) => (
                            <tr
                                key={customer.id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/customers/${customer.id}`)}
                            >
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        {customer.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {customer.phone || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={customer.address}>
                                    {customer.address || '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-bold">
                                    <span className={customer.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                                        {Number(customer.balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                    <div className="text-xs text-slate-400 font-normal">
                                        {customer.balance > 0 ? '(Borçlu)' : customer.balance < 0 ? '(Alacaklı)' : '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-slate-100 rounded text-slate-500 transition-colors">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)} className="p-2 hover:bg-red-50 rounded text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
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
                title={editingId ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Müşteri Adı"
                        placeholder="Ad Soyad veya Firma Adı"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        uppercase
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Telefon"
                            placeholder="05..."
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="E-posta"
                            type="email"
                            placeholder="ornek@mail.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <Input
                        label="Adres"
                        placeholder="Açık adres..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />

                    {!editingId && (
                        <Input
                            label="Devir Bakiyesi (Borç)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.initial_balance}
                            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                            title="Eğer eski bir borcu varsa buraya girin (+ Borç, - Alacak)"
                        />
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
