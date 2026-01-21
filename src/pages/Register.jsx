import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Lock, Mail, User, Loader2, Building2 } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        fullName: '',
        businessName: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        // business_name is used by the database trigger to create the business
                        business_name: formData.businessName
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Ideally show a success message or auto-login
            // For now, let's redirect to login with a message (or directly dashboard if auto-sign-in works)
            if (data.session) {
                navigate('/');
            } else {
                // Email confirmation case
                alert('Kayıt başarılı! Lütfen e-postanızı onaylayın.');
                navigate('/login');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8 text-center bg-slate-900 text-white">
                    <h1 className="text-2xl font-bold">Yeni Hesap Oluştur</h1>
                    <p className="text-slate-400 mt-2 text-sm">14 gün ücretsiz deneme ile başlayın</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ahmet Yılmaz"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">İşletme Adı</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Yılmaz Market"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="ornek@sirket.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="En az 6 karakter"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Kayıt Ol'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Zaten hesabınız var mı?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                            Giriş Yapın
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
