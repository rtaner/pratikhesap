import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Building2, Phone, MapPin, Globe, Mail, Save, Upload, Loader2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings() {
    const { user, profile, business } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        email: '',
        website: '',
        logo_url: ''
    });

    useEffect(() => {
        if (profile?.business_id) {
            fetchBusinessDetails();
        }
    }, [profile]);

    async function fetchBusinessDetails() {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', profile.business_id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    name: data.name || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    email: data.email || '',
                    website: data.website || '',
                    logo_url: data.logo_url || ''
                });
            }
        } catch (error) {
            console.error('Error fetching business:', error);
            toast.error('İşletme bilgileri yüklenemedi');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    address: formData.address,
                    email: formData.email,
                    website: formData.website,
                    logo_url: formData.logo_url
                })
                .eq('id', profile.business_id);

            if (error) throw error;
            toast.success('Ayarlar kaydedildi');

            // Force reload to update sidebar logo immediately if needed, 
            // or we could update a global state. For now toast is enough.
            window.location.reload();
        } catch (error) {
            console.error('Error updating business:', error);
            toast.error('Güncelleme başarısız');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogoUpload(e) {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.business_id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
            toast.success('Logo yüklendi');
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Logo yüklenirken hata oluştu');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-blue-600" />
                İşletme Ayarları
            </h1>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-semibold text-slate-800">İşletme Profili</h2>
                    <p className="text-sm text-slate-500">İşletmenizin iletişim ve profil bilgileri.</p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Logo Section */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 size={48} className="text-slate-300" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-blue-600" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-full cursor-pointer shadow hover:bg-blue-700 transition-colors">
                                <Upload size={16} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-slate-900">İşletme Logosu</h3>
                            <p className="text-sm text-slate-500 mt-1 mb-3">
                                JPG, PNG veya GIF formatında yükleyebilirsiniz.
                                <br />En iyi görünüm için kare (1:1) format önerilir.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6"></div>

                    {/* License Information Status */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-8">
                        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                            <span className="p-1 bg-blue-200 rounded-md"><Globe size={16} /></span>
                            Lisans & Abonelik Durumu
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Paket</p>
                                <p className="text-xl font-bold text-slate-800">{business?.plans?.name || 'Standart Paket'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Durum</p>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(business?.subscription_end_date && new Date(business.subscription_end_date) > new Date())
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {(business?.subscription_end_date && new Date(business.subscription_end_date) > new Date()) ? 'Aktif' : 'Süresi Dolmuş'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Bitiş Tarihi</p>
                                <p className="text-lg font-medium text-slate-700">
                                    {business?.subscription_end_date
                                        ? new Date(business.subscription_end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : '-'}
                                </p>
                                {business?.subscription_end_date && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Kalan Süre: {Math.ceil((new Date(business.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))} gün
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2"></div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                İşletme Adı <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="Örn: Demir Market"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Telefon Numarası
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="05..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                E-posta Adresi
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="ornek@sirket.com"
                                />
                            </div>
                        </div>

                        <div className="col-span-full">
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Adres
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <MapPin size={16} className="text-slate-400" />
                                </div>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[80px]"
                                    placeholder="İşletme açık adresi..."
                                />
                            </div>
                        </div>

                        <div className="col-span-full md:col-span-1">
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Web Sitesi
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Globe size={16} className="text-slate-400" />
                                </div>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="col-span-full pt-4 flex justify-end">
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Değişiklikleri Kaydet
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm">
                <Info className="shrink-0" size={20} />
                <p>Burada girdiğiniz bilgiler, işletme profilinizde ve ilgili belgelerde görünecektir.</p>
            </div>
        </div>
    );
}
