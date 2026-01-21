import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Plus, Search, Calendar, User, ShoppingCart, Trash2, Save, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import CategorySelect from '../components/stock/CategorySelect';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { format } from 'date-fns';

export default function Purchases() {
    const { business } = useAuthStore();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Data for Selects
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        supplier_id: '',
        invoice_no: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
    });

    // Simple Product Search in Modal
    const [productSearch, setProductSearch] = useState('');

    // --- QUICK ADD STATE ---
    const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
    const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

    // Quick Add Forms
    const [newProduct, setNewProduct] = useState({ name: '', product_code: '', barcode: '', buying_price: '', selling_price: '', stock_quantity: 0, category_id: '' });
    const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', contact_person: '' });

    useEffect(() => {
        fetchPurchases();
        fetchSuppliers();
        fetchProducts();
    }, []);

    async function fetchPurchases() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('purchases')
                .select(`
          *,
          suppliers (name)
        `)
                .order('date', { ascending: false });

            if (error) throw error;
            setPurchases(data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchSuppliers() {
        const { data } = await supabase.from('suppliers').select('id, name');
        setSuppliers(data || []);
    }

    async function fetchProducts() {
        const { data } = await supabase.from('products').select('id, name, buying_price, stock_quantity');
        setProducts(data || []);
    }

    const handleAddItem = (product) => {
        const exists = formData.items.find(i => i.product_id === product.id);
        if (exists) {
            alert('Bu ürün zaten listede var.');
            return;
        }

        const newItem = {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            buying_price: product.buying_price || 0,
        };

        setFormData({
            ...formData,
            items: [...formData.items, newItem]
        });
        setProductSearch('');
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.buying_price)), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.supplier_id) return alert('Lütfen tedarikçi seçin.');
        if (formData.items.length === 0) return alert('Lütfen en az bir ürün ekleyin.');

        try {
            const totalAmount = calculateTotal();

            // 1. Create Purchase Record
            const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    business_id: business.id,
                    supplier_id: formData.supplier_id,
                    invoice_no: formData.invoice_no,
                    date: formData.date,
                    total_amount: totalAmount
                })
                .select()
                .single();

            if (purchaseError) throw purchaseError;

            // 2. Create Purchase Items 
            const purchaseItems = formData.items.map(item => ({
                purchase_id: purchase.id,
                business_id: business.id,
                product_id: item.product_id,
                quantity: Number(item.quantity),
                cost_price: Number(item.buying_price),
                total: Number(item.quantity) * Number(item.buying_price)
            }));

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems);

            if (itemsError) throw itemsError;

            // 3. Update Product Stock & Log Movement
            for (const item of formData.items) {
                const { error: stockError } = await supabase.rpc('process_stock_movement', {
                    p_product_id: item.product_id,
                    p_amount: Number(item.quantity), // Positive for purchases
                    p_type: 'purchase',
                    p_document_id: purchase.id,
                    p_description: `Alım Faturası: ${formData.invoice_no}`
                });
                if (stockError) console.error("Stock update error", stockError);

                // Update buying price if needed (Optional: could add logic here to update product cost)
            }

            // 4. Update Supplier Balance
            await supabase.rpc('increment_supplier_balance', {
                s_id: formData.supplier_id,
                amount: totalAmount
            });

            setIsModalOpen(false);
            setFormData({ supplier_id: '', invoice_no: '', date: new Date().toISOString().split('T')[0], items: [] });
            fetchPurchases();

        } catch (error) {
            console.error('Error saving purchase:', error);
            alert('Kaydedilirken hata oluştu: ' + error.message);
        }
    };

    // --- QUICK SAVE HANDLERS ---
    const handleQuickSaveProduct = async (e) => {
        e.preventDefault();
        try {
            if (!newProduct.product_code || !newProduct.barcode) {
                alert('Ürün Kodu ve Barkod alanları zorunludur.');
                return;
            }

            const { data, error } = await supabase.from('products').insert({
                business_id: business.id,
                name: newProduct.name.toUpperCase(),
                product_code: newProduct.product_code,
                barcode: newProduct.barcode,
                buying_price: Number(newProduct.buying_price),
                selling_price: Number(newProduct.selling_price),
                stock_quantity: Number(newProduct.stock_quantity),
                category_id: newProduct.category_id || null
            }).select().single();

            if (error) throw error;

            await fetchProducts(); // Refresh list
            handleAddItem(data); // Auto add to invoice items
            setIsQuickProductOpen(false);
            setNewProduct({ name: '', product_code: '', barcode: '', buying_price: '', selling_price: '', stock_quantity: 0, category_id: '' });

        } catch (err) {
            alert('Ürün eklenirken hata: ' + err.message);
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

    // Filter products for search
    const filteredProducts = productSearch.length > 0 ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())) : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Alım Faturası Girişi</h1>
                    <p className="text-slate-500">Tedarikçi faturalarını ve stok girişlerini yönetin</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus size={20} />
                    Yeni Fatura Girişi
                </Button>
            </div>

            {/* List of past purchases */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Tarih</th>
                            <th className="px-4 py-3">Tedarikçi</th>
                            <th className="px-4 py-3">Fatura No</th>
                            <th className="px-4 py-3 text-right">Tutar</th>
                            <th className="px-4 py-3 text-right">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {purchases.map((purchase) => (
                            <tr key={purchase.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-600">
                                    {format(new Date(purchase.date), 'dd.MM.yyyy')}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {purchase.suppliers?.name}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    {purchase.invoice_no}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                    {Number(purchase.total_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        Tamamlandı
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {purchases.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                                    Henüz hiç alım yapılmamış.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Main Invoice Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Yeni Alım Faturası"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tedarikçi</label>
                            <div className='flex gap-2'>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.supplier_id}
                                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seçiniz...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickSupplierOpen(true)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Yeni Tedarikçi Ekle"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <Input
                                label="Fatura No"
                                value={formData.invoice_no}
                                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                                placeholder="FAT-001"
                                required
                            />
                        </div>
                        <div className="md:col-span-1">
                            <Input
                                label="Tarih"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Add Items Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <ShoppingCart size={18} /> Ürünler
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsQuickProductOpen(true)}
                                className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                            >
                                <Plus size={16} /> Yeni Ürün Tanımla
                            </button>
                        </div>

                        {/* Product Search & Add */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                            <Input
                                placeholder="Listeye eklemek için ürün adı yazın..."
                                className="pl-10"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            {/* Dropdown Results */}
                            {productSearch && (
                                <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                                            onClick={() => handleAddItem(p)}
                                        >
                                            <span className="font-medium text-slate-800">{p.name}</span>
                                            <span className="text-xs text-slate-500">Stok: {p.stock_quantity}</span>
                                        </div>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <div className="px-4 py-3 text-slate-400 text-sm flex justify-between items-center">
                                            <span>Ürün bulunamadı.</span>
                                            <button
                                                type="button"
                                                onClick={() => setIsQuickProductOpen(true)}
                                                className="text-blue-600 font-semibold hover:underline"
                                            >
                                                + Yeni Oluştur
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Ürün</th>
                                        <th className="px-3 py-2 w-24">Miktar</th>
                                        <th className="px-3 py-2 w-32">Birim Fiyat</th>
                                        <th className="px-3 py-2 w-32 text-right">Toplam</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {formData.items.map((item, idx) => (
                                        <tr key={item.product_id + idx}>
                                            <td className="px-3 py-2 font-medium">{item.product_name}</td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full p-1 border rounded"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full p-1 border rounded"
                                                    value={item.buying_price}
                                                    onChange={(e) => updateItem(idx, 'buying_price', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                                {(Number(item.quantity) * Number(item.buying_price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <tr><td colSpan="5" className="p-4 text-center text-slate-400 italic">Henüz ürün eklenmedi.</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold">
                                    <tr>
                                        <td colSpan="3" className="px-3 py-2 text-right text-slate-600">Genel Toplam:</td>
                                        <td className="px-3 py-2 text-right text-lg text-blue-600">
                                            {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100 mt-auto">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit" variant="primary" className="px-8">
                            <Save size={18} className="mr-2" /> Kaydet
                        </Button>
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

            {/* QUICK ADD PRODUCT MODAL */}
            <Modal
                isOpen={isQuickProductOpen}
                onClose={() => setIsQuickProductOpen(false)}
                title="Hızlı Ürün Tanımla"
            >
                <form onSubmit={handleQuickSaveProduct} className="space-y-4">
                    <Input
                        label="Ürün Adı"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        required
                        uppercase
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Barkod (Zorunlu)"
                            value={newProduct.barcode}
                            onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                            placeholder="869..."
                            required
                        />
                        <Input
                            label="Ürün Kodu (Zorunlu)"
                            value={newProduct.product_code}
                            onChange={(e) => setNewProduct({ ...newProduct, product_code: e.target.value })}
                            placeholder="KOD001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Kategori
                        </label>
                        <CategorySelect
                            value={newProduct.category_id}
                            onChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Alış Fiyatı"
                            type="number" step="0.01"
                            value={newProduct.buying_price}
                            onChange={(e) => setNewProduct({ ...newProduct, buying_price: e.target.value })}
                        />
                        <Input
                            label="Satış Fiyatı"
                            type="number" step="0.01"
                            value={newProduct.selling_price}
                            onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Mevcut Stok Miktarı"
                        type="number"
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                        title="Faturadaki miktar ile toplanacaktır"
                    />

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsQuickProductOpen(false)}>İptal</Button>
                        <Button type="submit">Hızlı Ekle ve Seç</Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
