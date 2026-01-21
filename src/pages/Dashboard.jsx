import React from 'react';
import { useAuthStore } from '../store/auth';

export default function Dashboard() {
    const { business, profile } = useAuthStore();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hoş Geldin, {profile?.full_name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500">{business?.name || 'İşletmem'} - Genel Bakış</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* We will add buttons here later */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                    </div>
                    <span className="font-semibold text-slate-700">Hızlı Satış</span>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-green-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    </div>
                    <span className="font-semibold text-slate-700">Ürün Ekle</span>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[300px] flex items-center justify-center text-slate-400">
                <p>Son İşlemler Tablosu Buraya Gelecek</p>
            </div>
        </div>
    );
}
