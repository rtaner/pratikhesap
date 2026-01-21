import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Search, Phone, Mail, User, Building2, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Suppliers() {
    const { business } = useAuthStore();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        balance: 0
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    async function fetchSuppliers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                business_id: business.id, // RLS handles this but good to be explicit for INSERT
                name: formData.name.toUpperCase(), // Enforce Uppercase
                contact_person: formData.contact_person,
                phone: formData.phone,
                email: formData.email,
                balance: formData.balance || 0
            };

            if (editingId) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchSuppliers();
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Kaydedilirken hata oluştu.');
        }
    };

    const handleEdit = (supplier) => {
        setEditingId(supplier.id);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            balance: supplier.balance || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchSuppliers();
        } catch (error) {
            console.error(error);
            alert('Silinirken hata oluştu.');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', contact_person: '', phone: '', email: '', balance: 0 });
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tedarikçiler</h1>
                    <p className="text-slate-500">Tedarikçi listesi ve bakiye takibi</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
                    <Plus size={20} />
                    Yeni Tedarikçi
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <Input
                        placeholder="Firma adı veya yetkili ara..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm group">
                        <div className="flexjustify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{supplier.name}</h3>
                                    {supplier.contact_person && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                            <User size={12} /> {supplier.contact_person}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                            {supplier.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" /> {supplier.phone}
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" /> {supplier.email}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400">Bakiye</p>
                                <p className={`font-bold ${supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {Number(supplier.balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(supplier)} className="p-2 hover:bg-slate-100 rounded text-slate-500">
                                    <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(supplier.id)} className="p-2 hover:bg-red-50 rounded text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Tedarikçi Düzenle" : "Yeni Tedarikçi Ekle"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Firma Adı"
                        placeholder="ÖRNEK A.Ş."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        uppercase
                        autoFocus
                    />
                    <Input
                        label="Yetkili Kişi"
                        placeholder="Ahmet Yılmaz"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Telefon"
                            placeholder="0555..."
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="E-posta"
                            type="email"
                            placeholder="info@..."
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
