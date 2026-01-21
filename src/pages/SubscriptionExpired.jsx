import React from 'react';
import { Lock, Phone, CreditCard } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function SubscriptionExpired() {
    const { business, signOut } = useAuthStore();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-center">
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl max-w-lg w-full border border-red-100">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-red-600" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Lisans Süresi Doldu</h1>
                <p className="text-slate-500 mb-8">
                    <span className="font-semibold text-slate-700">{business?.name}</span> işletmesinin kullanım lisansı
                    <span className="font-bold text-red-600 mx-1">
                        {business?.subscription_end_date ? new Date(business.subscription_end_date).toLocaleDateString('tr-TR') : 'Belirsiz'}
                    </span>
                    tarihinde sona ermiştir.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left text-sm text-slate-600 space-y-2">
                    <div className="flex items-start gap-3">
                        <Phone size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <p>Hizmete devam etmek için lütfen sistem yöneticinizle veya müşteri temsilcinizle iletişime geçin.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Sayfayı Yenile
                    </button>
                    <button
                        onClick={signOut}
                        className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>
            <p className="mt-8 text-xs text-slate-400">Pratik Hesap © 2026</p>
        </div>
    );
}
