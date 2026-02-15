import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export default function ImportModal({ isOpen, onClose, onSuccess }) {
    const { business } = useAuthStore();
    const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Importing
    const [fileData, setFileData] = useState(null);
    const [stats, setStats] = useState({ products: 0, categories: 0, suppliers: 0 });

    // Mapping State: { "old_id": { action: "existing" | "new", value: "selected_id" | "New Name" } }
    const [supplierMapping, setSupplierMapping] = useState({});
    const [uniqueSuppliers, setUniqueSuppliers] = useState([]);

    // Existing DB Data
    const [existingSuppliers, setExistingSuppliers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            reset();
            fetchExistingSuppliers();
        }
    }, [isOpen]);

    const reset = () => {
        setStep(1);
        setFileData(null);
        setSupplierMapping({});
        setStats({ products: 0, categories: 0, suppliers: 0 });
    };

    const fetchExistingSuppliers = async () => {
        const { data } = await supabase.from('suppliers').select('id, name');
        setExistingSuppliers(data || []);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (!json.products || !Array.isArray(json.products)) {
                    alert("Geçersiz format! Dosyanın 'products' listesi içermesi gerekir.");
                    return;
                }
                analyzeFile(json.products);
            } catch (err) {
                alert("JSON okunamadı: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const analyzeFile = (products) => {
        // Group by Supplier
        const supplierGroups = {};
        const categories = new Set();

        products.forEach(p => {
            const sid = p.supplierId || 'unknown';
            if (!supplierGroups[sid]) {
                supplierGroups[sid] = {
                    count: 0,
                    sampleProduct: p.name
                };
            }
            supplierGroups[sid].count++;
            if (p.category) categories.add(p.category);
        });

        const uniqueSups = Object.keys(supplierGroups).map(id => ({
            id,
            ...supplierGroups[id]
        }));

        setUniqueSuppliers(uniqueSups);
        setFileData(products);
        setStats({
            products: products.length,
            categories: categories.size,
            suppliers: uniqueSups.length
        });

        // Initialize Mapping
        const initialMap = {};
        uniqueSups.forEach(s => {
            initialMap[s.id] = { action: 'existing', value: '' };
        });
        setSupplierMapping(initialMap);

        setStep(2);
    };

    const handleMappingChange = (oldId, field, val) => {
        setSupplierMapping(prev => ({
            ...prev,
            [oldId]: { ...prev[oldId], [field]: val }
        }));
    };

    const getMappingError = () => {
        for (const sup of uniqueSuppliers) {
            const map = supplierMapping[sup.id];
            if (map.action === 'existing' && !map.value) return 'Lütfen tüm tedarikçiler için bir seçim yapın.';
            if (map.action === 'new' && !map.value.trim()) return 'Yeni tedarikçi ismi boş olamaz.';
        }
        return null;
    };

    const executeImport = async () => {
        const error = getMappingError();
        if (error) {
            alert(error);
            return;
        }

        if (!business) {
            alert("İşletme bilgileri bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
            return;
        }

        setStep(3);
        try {
            // 1. Process Suppliers (Create New ones)
            const finalSupplierMap = {}; // oldId -> realDbId

            for (const sup of uniqueSuppliers) {
                const map = supplierMapping[sup.id];
                if (map.action === 'existing') {
                    finalSupplierMap[sup.id] = map.value;
                } else {
                    // Create New
                    const { data, error } = await supabase.from('suppliers').insert({
                        business_id: business.id,
                        name: map.value.toUpperCase(),
                        phone: '-',
                        contact_person: 'Yedekten Aktarıldı'
                    }).select('id').single();

                    if (error) throw error;
                    finalSupplierMap[sup.id] = data.id;
                }
            }

            // 2. Process Categories
            const fileCategories = [...new Set(fileData.map(p => p.category).filter(Boolean))];
            const categoryMap = {}; // name -> id

            // Fetch existing
            const { data: existingCats } = await supabase.from('categories').select('id, name');
            existingCats.forEach(c => categoryMap[c.name.toLowerCase()] = c.id);

            // Create missing
            for (const catName of fileCategories) {
                if (!categoryMap[catName.toLowerCase()]) {
                    const { data } = await supabase.from('categories').insert({
                        business_id: business.id,
                        name: catName
                    }).select('id').single();
                    categoryMap[catName.toLowerCase()] = data.id;
                }
            }

            // 3. Process Products
            const productsToInsert = fileData.map(p => ({
                business_id: business.id,
                name: p.name.toUpperCase(),
                barcode: p.barcode || null,
                product_code: (p.productCode || p.barcode || 'GEN-' + Math.random().toString().slice(2, 8)).toUpperCase(),
                supplier_id: finalSupplierMap[p.supplierId || 'unknown'],
                category_id: p.category ? categoryMap[p.category.toLowerCase()] : null,
                buying_price: parseFloat(p.cost) || 0,
                selling_price: parseFloat(p.price) || 0,
                stock_quantity: parseInt(p.stock) || 0
            }));

            // Chunk insertion (Supabase limit safety)
            const chunkSize = 100;
            for (let i = 0; i < productsToInsert.length; i += chunkSize) {
                const chunk = productsToInsert.slice(i, i + chunkSize);
                const { error } = await supabase.from('products').insert(chunk);
                if (error) {
                    console.error("Chunk Error:", error);
                    // Continue best effort or throw? Let's throw to stop corruption.
                    throw error;
                }
            }

            alert("Başarıyla yüklendi!");
            onSuccess();
            onClose();

        } catch (err) {
            console.error(err);
            alert("İşlem sırasında hata: " + err.message);
            setStep(2); // Go back
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Yedek Dosyası Yükle</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">JSON Dosyasını Seçin</h3>
                            <p className="text-slate-500 mt-2">.json uzantılı yedek dosyasını buraya sürükleyin veya tıklayın</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.products}</div>
                                    <div className="text-xs text-slate-500">Ürün</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.categories}</div>
                                    <div className="text-xs text-slate-500">Kategori</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">{stats.suppliers}</div>
                                    <div className="text-xs text-slate-500">Eşleşecek Tedarikçi</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-600" />
                                    Tedarikçi Eşleştirme
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Dosyadaki eski tedarikçi kodlarını, yeni sistemdeki karşılıklarıyla eşleştirin.
                                </p>

                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 text-left">
                                            <tr>
                                                <th className="px-4 py-3">Eski Kod (Dosyadaki)</th>
                                                <th className="px-4 py-3">İçerik</th>
                                                <th className="px-4 py-3">İşlem</th>
                                                <th className="px-4 py-3">Hedef</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {uniqueSuppliers.map(sup => (
                                                <tr key={sup.id}>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                        {sup.id.slice(0, 8)}...
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{sup.count} Ürün</div>
                                                        <div className="text-xs text-slate-400">Örn: {sup.sampleProduct}</div>
                                                    </td>
                                                    <td className="px-4 py-3 w-40">
                                                        <select
                                                            className="w-full p-2 border rounded-lg text-sm"
                                                            value={supplierMapping[sup.id]?.action}
                                                            onChange={(e) => handleMappingChange(sup.id, 'action', e.target.value)}
                                                        >
                                                            <option value="existing">Mevcut Seç</option>
                                                            <option value="new">Yeni Oluştur</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {supplierMapping[sup.id]?.action === 'existing' ? (
                                                            <select
                                                                className="w-full p-2 border rounded-lg text-sm"
                                                                value={supplierMapping[sup.id]?.value}
                                                                onChange={(e) => handleMappingChange(sup.id, 'value', e.target.value)}
                                                            >
                                                                <option value="">Seçiniz...</option>
                                                                {existingSuppliers.map(es => (
                                                                    <option key={es.id} value={es.id}>{es.name}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <Input
                                                                placeholder="Yeni Tedarikçi Adı Girin"
                                                                value={supplierMapping[sup.id]?.value}
                                                                onChange={(e) => handleMappingChange(sup.id, 'value', e.target.value)}
                                                                uppercase
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={reset}>Vazgeç</Button>
                                <Button onClick={executeImport} className="gap-2">
                                    İçe Aktar <ArrowRight size={18} />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-16">
                            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <h3 className="text-xl font-bold text-slate-800">Ürünler Aktarılıyor...</h3>
                            <p className="text-slate-500">Lütfen sayfayı kapatmayın.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
