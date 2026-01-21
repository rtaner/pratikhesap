import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Plus, Minus, X, Check, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function Sales() {
    const { business } = useAuthStore();

    // State
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]); // Customers list
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Selected customer for Veresiye
    const [search, setSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false); // New Customer Modal
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [lastSaleAmount, setLastSaleAmount] = useState(0);

    // Refs
    const searchInputRef = useRef(null);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
    }, []);

    async function fetchProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .gt('stock_quantity', 0) // Only show in-stock items? Maybe show all but warn
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    async function fetchCustomers() {
        try {
            const { data, error } = await supabase.from('customers').select('*').order('name');
            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }



    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        if (!newCustomerName) return;

        try {
            const payload = {
                business_id: business.id,
                name: newCustomerName.toUpperCase(),
                phone: newCustomerPhone,
                balance: 0
            };

            const { data, error } = await supabase.from('customers').insert(payload).select().single();
            if (error) throw error;

            // Success
            setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setSelectedCustomer(data); // Auto-select
            setIsNewCustomerModalOpen(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Müşteri oluşturulurken hata oluştu.');
        }
    };

    // --- CART LOGIC ---
    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);

        if (existing) {
            // Check stock limit
            //   if (existing.quantity + 1 > product.stock_quantity) {
            //       alert('Stok yetersiz!');
            //       return;
            //   }
            setCart(cart.map(item =>
                item.product_id === product.id
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.selling_price }
                    : item
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                selling_price: product.selling_price,
                quantity: 1,
                discount_amount: 0, // Changed from rate to amount
                total: product.selling_price,
                original_product: product
            }]);
        }
        setSearch(''); // Clear search after adding
        searchInputRef.current?.focus();
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                // Keeps the fixed discount amount, unless it exceeds total?
                // Let's ensure discount doesn't exceed price
                const rawTotal = item.selling_price * newQty;
                const safeDiscount = Math.min(item.discount_amount, rawTotal);

                return {
                    ...item,
                    quantity: newQty,
                    discount_amount: safeDiscount, // Update safe discount if needed
                    total: rawTotal - safeDiscount
                };
            }
            return item;
        }));
    };

    const updateDiscount = (productId, amount) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const rawTotal = item.selling_price * item.quantity;
                const cleanAmount = Math.min(rawTotal, Math.max(0, Number(amount))); // Cannot exceed total

                return {
                    ...item,
                    discount_amount: cleanAmount,
                    total: rawTotal - cleanAmount
                };
            }
            return item;
        }));
    };


    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const clearCart = () => setCart([]);

    const calculateTotal = () => cart.reduce((sum, item) => sum + item.total, 0);

    // --- CHECKOUT LOGIC ---
    const handleCheckout = async (paymentMethod) => {
        if (cart.length === 0) return;
        if (paymentMethod === 'on_account' && !selectedCustomer) {
            alert('Veresiye işlemi için lütfen bir müşteri seçin.');
            return;
        }

        setLoading(true);

        try {
            const totalAmount = calculateTotal();

            // 1. Create Sale Record
            const saleData = {
                business_id: business.id,
                total_amount: totalAmount,
                final_amount: totalAmount, // Discounts can be added later
                payment_method: paymentMethod,
                status: 'completed',
                customer_id: selectedCustomer ? selectedCustomer.id : null
            };

            const { data: sale, error: saleError } = await supabase.from('sales').insert(saleData).select().single();

            if (saleError) throw saleError;

            // 2. Create Sale Items
            const saleItems = cart.map(item => {
                // Calculate rate for record keeping if needed, or 0
                const rawTotal = item.selling_price * item.quantity;
                const discountRate = rawTotal > 0 ? (item.discount_amount / rawTotal) * 100 : 0;

                return {
                    sale_id: sale.id,
                    business_id: business.id,
                    product_id: item.product_id,
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.selling_price,
                    total: item.total, // Discounted total
                    discount_rate: Number(discountRate.toFixed(2)),
                    discount_amount: Number(item.discount_amount)
                };
            });

            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) throw itemsError;

            // 3. Update Stock & Log Movement
            for (const item of cart) {
                const { error: stockError } = await supabase.rpc('process_stock_movement', {
                    p_product_id: item.product_id,
                    p_amount: -item.quantity, // Negative for sales
                    p_type: 'sale',
                    p_document_id: sale.id,
                    p_description: `Satış #${sale.id.slice(0, 8)}`
                });
                if (stockError) console.error('Stock error', stockError);
            }

            // 4. Update Customer Balance (if Veresiye)
            if (paymentMethod === 'on_account' && selectedCustomer) {
                const { error: balanceError } = await supabase.rpc('increment_customer_balance', {
                    c_id: selectedCustomer.id,
                    amount: totalAmount
                });
                if (balanceError) console.error('Error updating customer balance:', balanceError);
            }

            setLastSaleAmount(totalAmount);
            setCart([]);
            setSelectedCustomer(null); // Reset customer selection
            setCustomerSearch('');
            setIsPaymentModalOpen(false);
            setIsSuccessModalOpen(true); // Show Success
            fetchProducts(); // Refresh stock counts

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Satış sırasında hata oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- SEARCH & BARCODE HANDLER ---
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && search) {
            // Find exact match (case insensitive for code)
            // 1. Check Exact Barcode first
            let exactMatch = products.find(p => p.barcode === search);

            // 2. If no barcode match, check Product Code (case insensitive)
            if (!exactMatch) {
                exactMatch = products.find(p => p.product_code?.toLowerCase() === search.toLowerCase());
            }

            if (exactMatch) {
                addToCart(exactMatch);
            } else {
                // Optional: Play error sound or alert if not found?
                // console.log('Product not found');
            }
        }
    };

    const filteredProducts = products.filter(p =>
        !search || // Show all if empty or...
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search) ||
        p.product_code?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 20); // Limit results for performance

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] md:flex-row gap-4">
            {/* LEFT: Product Grid & Search */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Barkod okutun veya ürün arayın... (Enter)"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus
                        />
                    </div>
                </div>
                {/* Product List Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Ürün Adı</th>
                                <th className="px-4 py-3 hidden md:table-cell">Kod</th>
                                <th className="px-4 py-3 text-right">Fiyat</th>
                                <th className="px-4 py-3 text-right">Stok</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map(product => (
                                <tr
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors active:bg-blue-100"
                                >
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {product.name}
                                        <div className="text-xs text-slate-400 md:hidden">{product.product_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                                        {product.product_code}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                                        {Number(product.selling_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full ${product.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.stock_quantity}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-10 text-center text-slate-400">
                                        Ürün bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div> {/* End Left Column */}

            {/* RIGHT: Cart & Checkout */}
            <div className="w-full md:w-96 bg-white flex flex-col border border-slate-200 shadow-lg rounded-xl overflow-hidden h-full">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart size={20} /> Sepet
                    </h2>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs text-red-500 hover:underline">
                            Sepeti Temizle
                        </button>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cart.map(item => (
                        <div key={item.product_id} className="flex flex-col p-3 bg-white border border-slate-100 rounded-lg shadow-sm gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800 text-sm line-clamp-1">{item.name}</p>
                                    <p className="text-xs text-slate-400">{item.selling_price} ₺ x {item.quantity}</p>
                                </div>
                                <button onClick={() => removeFromCart(item.product_id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><Minus size={14} /></button>
                                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><Plus size={14} /></button>
                                </div>

                                {/* Discount Input (TL) */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        className="w-16 p-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:border-blue-500"
                                        value={item.discount_amount > 0 ? item.discount_amount : ''}
                                        placeholder="İskonto"
                                        onChange={(e) => updateDiscount(item.product_id, e.target.value)}
                                    />
                                    <span className="text-xs text-slate-400">TL</span>
                                </div>

                                {/* Total Price */}
                                <div className="text-right w-20">
                                    {item.discount_amount > 0 && (
                                        <p className="text-xs text-slate-400 line-through">
                                            {(item.selling_price * item.quantity).toFixed(2)}
                                        </p>
                                    )}
                                    <p className={`font-bold ${item.discount_amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
                                        {item.total.toFixed(2)}
                                    </p>
                                </div>      </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                            <ShoppingCart size={48} className="opacity-20" />
                            <p>Sepetiniz boş</p>
                        </div>
                    )}
                </div>

                {/* Footer / Totals */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500">Genel Toplam</span>
                        <span className="text-3xl font-bold text-blue-600">
                            {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                    </div>

                    <Button
                        className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 h-auto gap-2"
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                    >
                        <CreditCard size={24} /> Satışı Tamamla
                    </Button>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Ödeme Yöntemi Seçin"
                size="md"
            >

                {/* Customer Selection Section */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Müşteri Seçimi (Veresiye İçin Zorunlu)</label>
                    {selectedCustomer ? (
                        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                                    <User size={16} />
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">{selectedCustomer.name}</p>
                                    <p className="text-xs text-blue-600">Bakiye: {selectedCustomer.balance?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                        </div>
                    ) : (


                        <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Müşteri ara..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                                {customerSearch && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                                            <div
                                                key={c.id}
                                                className="p-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 flex justify-between"
                                                onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                                            >
                                                <span>{c.name}</span>
                                                <span className={c.balance > 0 ? 'text-red-500' : 'text-slate-400'}>
                                                    {Number(c.balance).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button variant="outline" onClick={() => setIsNewCustomerModalOpen(true)} className="px-3">
                                <Plus size={18} />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 py-4">
                    <button
                        onClick={() => handleCheckout('cash')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-green-50 border-2 border-green-100 rounded-xl hover:border-green-500 hover:shadow-md transition-all group"
                    >
                        <Banknote size={32} className="text-green-600 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-green-800">Nakit</span>
                    </button>

                    <button
                        onClick={() => handleCheckout('credit_card')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-purple-50 border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:shadow-md transition-all group"
                    >
                        <CreditCard size={32} className="text-purple-600 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-purple-800">Kredi Kartı</span>
                    </button>

                    <button
                        onClick={() => handleCheckout('on_account')}
                        className={`flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-xl transition-all group ${!selectedCustomer ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed' : 'bg-blue-50 border-blue-100 hover:border-blue-500 hover:shadow-md'}`}
                        disabled={!selectedCustomer}
                    >
                        <User size={32} className={`${!selectedCustomer ? 'text-slate-400' : 'text-blue-600 group-hover:scale-110 transition-transform'}`} />
                        <span className={`font-bold ${!selectedCustomer ? 'text-slate-400' : 'text-blue-800'}`}>Veresiye</span>
                    </button>
                </div>

                <div className="text-center mt-4 border-t pt-4">
                    <p className="text-slate-500 text-sm">Toplam Tutar</p>
                    <p className="text-3xl font-bold text-slate-900">
                        {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                </div>
            </Modal >

            {/* SUCCESS MODAL */}
            < Modal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)
                }
                title="İşlem Başarılı"
                size="sm"
            >
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <Check size={40} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Satış Tamamlandı!</h3>
                        <p className="text-slate-500 mt-1">
                            Toplam Tutar: <span className="font-bold text-slate-800">{lastSaleAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                        </p>
                    </div>
                    <Button
                        className="w-full mt-4"
                        onClick={() => {
                            setIsSuccessModalOpen(false);
                            searchInputRef.current?.focus();
                        }}
                    >
                        Yeni Satış Yap
                    </Button>
                </div>
            </Modal >

            {/* NEW CUSTOMER MODAL */}
            < Modal
                isOpen={isNewCustomerModalOpen}
                onClose={() => setIsNewCustomerModalOpen(false)}
                title="Hızlı Müşteri Ekle"
                size="sm"
            >
                <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
                    <Input
                        label="Müşteri Adı"
                        placeholder="Ad Soyad"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        required
                        uppercase
                        autoFocus
                    />
                    <Input
                        label="Telefon (İsteğe bağlı)"
                        placeholder="05..."
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsNewCustomerModalOpen(false)}>İptal</Button>
                        <Button type="submit">Kaydet ve Seç</Button>
                    </div>
                </form>
            </Modal >
        </div >
    );
}
