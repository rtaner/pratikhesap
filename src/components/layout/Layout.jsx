import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuthStore } from '../../store/auth';
import SubscriptionExpired from '../../pages/SubscriptionExpired';

const Layout = () => {
    const { user, isLoading, business, profile } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Safety check: User is logged in but business data is missing
    if (!business && !isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center">
                <div className="bg-red-100 p-4 rounded-full text-red-600 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <h1 className="text-xl font-bold text-slate-800">İşletme Bilgileri Yüklenemedi</h1>
                <p className="text-slate-500 max-w-md">
                    Kullanıcı oturumunuz açık ancak işletme detaylarına ulaşılamadı.
                    İnternet bağlantınızı kontrol edip sayfayı yenileyiniz.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Sayfayı Yenile
                </button>
                <button
                    onClick={() => {
                        // Hard logout
                        localStorage.clear();
                        window.location.href = '/login';
                    }}
                    className="text-sm text-slate-400 hover:text-red-500 underline"
                >
                    Çıkış Yap ve Tekrar Dene
                </button>
            </div>
        );
    }

    // License Check
    // useAuthStore is already called at top, we need to destructure there.
    const isSuperAdmin = profile?.role === 'super_admin';
    const isExpired = business?.subscription_end_date && new Date(business.subscription_end_date) < new Date();

    // If expired and NOT super admin, block access
    // We allow access if no subscription date is set (Free tier or infinite default) to avoid locking out accidentally
    if (isExpired && !isSuperAdmin) {
        return <SubscriptionExpired />;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 h-full overflow-y-auto pb-20 md:pb-0">
                <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
};

export default Layout;
