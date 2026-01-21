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
