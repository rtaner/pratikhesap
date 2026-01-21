import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Search, Barcode, Tag, Pencil, Trash2, History, Folder } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StockHistoryModal from '../components/stock/StockHistoryModal';
import CategorySelect from '../components/stock/CategorySelect';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Stock() {
    const { business } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]); // Tedarikçiler
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        product_code: '',
        supplier_id: '',
        category_id: '', // Added category_id
        selling_price: '',
        buying_price: '',
        stock_quantity: 0
    });

    // Quick Add State
    const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', contact_person: '' });

    // History Modal
    const [historyProduct, setHistoryProduct] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchSuppliers();
    }, []);

    async function fetchSuppliers() {
        const { data } = await supabase.from('suppliers').select('id, name');
        setSuppliers(data || []);
    }

    async function fetchProducts() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*, suppliers(name), categories(name)') // Fetch supplier and category names
                .order('name', { ascending: true });

            if (error) throw error;
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.product_code) {
                alert('Ürün Kodu alanı zorunludur.');
                return;
            }

            if (!formData.supplier_id) {
                alert('Lütfen bir tedarikçi seçiniz.');
                return;
            }

            const payload = {
                business_id: business.id,
                name: formData.name.toUpperCase(),
                barcode: formData.barcode,
                product_code: formData.product_code.toUpperCase(), // Enforce Uppercase
                supplier_id: formData.supplier_id,
                category_id: formData.category_id || null, // Clean handle optional category
                selling_price: parseFloat(formData.selling_price) || 0,
                buying_price: parseFloat(formData.buying_price) || 0,
                stock_quantity: parseInt(formData.stock_quantity) || 0
            };

            if (editingId) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert(payload);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Kaydedilirken hata oluştu. Barkod veya Ürün Kodu benzersiz olmalı.');
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            barcode: product.barcode || '',
            product_code: product.product_code || '',
            supplier_id: product.supplier_id || '',
            category_id: product.category_id || '',
            selling_price: product.selling_price,
            buying_price: product.buying_price,
            stock_quantity: product.stock_quantity
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProducts();
        } catch (error) {
            console.error(error);
            alert('Silinirken hata oluştu.');
        }
    };

    const handleQuickSaveSupplier = async (e) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase.from('suppliers').insert({
                business_id: business.id,
                name: newSupplier.name.toUpperCase(),
                phone: newSupplier.phone,
                contact_person: newSupplier.contact_person
            }).select().single();

            if (error) throw error;

            await fetchSuppliers(); // Refresh list
            setFormData({ ...formData, supplier_id: data.id }); // Auto select
            setIsQuickSupplierOpen(false);
            setNewSupplier({ name: '', phone: '', contact_person: '' });

        } catch (err) {
            alert('Tedarikçi eklenirken hata: ' + err.message);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            barcode: '',
            product_code: '',
            supplier_id: '',
            selling_price: '',
            buying_price: '',
            stock_quantity: 0
        });
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search)) ||
        (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stok Yönetimi</h1>
                    <p className="text-slate-500">Ürün listesi ve stok takibi</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
                    <Plus size={20} />
                    Yeni Ürün
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <Input
                        placeholder="Ürün adı, barkod veya kod ara..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Ürün Adı</th>
                            <th className="px-4 py-3 hidden md:table-cell">Barkod / Kod</th>
                            <th className="px-4 py-3 hidden md:table-cell">Kategori</th>
                            <th className="px-4 py-3 text-right">Fiyat</th>
                            <th className="px-4 py-3 text-right">Stok</th>
                            <th className="px-4 py-3 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {product.name}
                                    <div className="text-xs text-slate-400 md:hidden">{product.product_code}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-0.5 rounded w-fit">
                                            <Barcode size={10} /> {product.barcode || '-'}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-0.5 rounded w-fit">
                                            <Tag size={10} /> {product.product_code || '-'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                        {product.categories?.name || '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                    {Number(product.selling_price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full ${product.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {product.stock_quantity}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2 items-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setHistoryProduct(product); }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Stok Geçmişi"
                                    >
                                        <History size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                    Ürün bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <Input
                        label="Ürün Adı"
                        placeholder="Örn: Coca Cola 330ml"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Ürün Kodu"
                            placeholder="Kola-330"
                            value={formData.product_code}
                            onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                            required
                            uppercase
                        />
                        <Input
                            label="Barkod"
                            placeholder="869..."
                            value={formData.barcode}
                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                            icon={Barcode}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Kategori
                            </label>
                            <CategorySelect
                                value={formData.category_id}
                                onChange={(value) => setFormData({ ...formData, category_id: value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Tedarikçi
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <select
                                        value={formData.supplier_id}
                                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                        className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 appearance-none text-slate-700 text-sm"
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {suppliers.map(sup => (
                                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickSupplierOpen(true)}
                                    className="h-10 w-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 hover:border-blue-200"
                                    title="Hızlı Tedarikçi Ekle"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Alış Fiyatı"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.buying_price}
                            onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                        />
                        <Input
                            label="Satış Fiyatı"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.selling_price}
                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Başlangıç Stok Adedi"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        disabled={!!editingId}
                        title="Stok düzeltmeleri için Stok Hareketi kullanın"
                    />
                    {editingId && <p className="text-xs text-amber-600">* Stok miktarını doğrudan değiştiremezsiniz, lütfen alım faturası veya stok sayımı yapın.</p>}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
                    </div>
                </form>
            </Modal>

            {/* QUICK ADD SUPPLIER MODAL */}
            <Modal
                isOpen={isQuickSupplierOpen}
                onClose={() => setIsQuickSupplierOpen(false)}
                title="Hızlı Tedarikçi Ekle"
                size="sm"
            >
                <form onSubmit={handleQuickSaveSupplier} className="space-y-4">
                    <Input
                        label="Firma Adı"
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                        required
                        uppercase
                        autoFocus
                    />
                    <Input
                        label="Telefon"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    />
                    <Input
                        label="Yetkili"
                        value={newSupplier.contact_person}
                        onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsQuickSupplierOpen(false)}>İptal</Button>
                        <Button type="submit">Hızlı Ekle</Button>
                    </div>
                </form>
            </Modal>

            {/* HISTORY MODAL */}
            <StockHistoryModal
                isOpen={!!historyProduct}
                onClose={() => setHistoryProduct(null)}
                product={historyProduct}
            />

        </div >
    );
}
