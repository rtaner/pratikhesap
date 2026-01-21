import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Truck,
    Wallet,
    Settings,
    LogOut,
    FileBarChart
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export default function Sidebar() {
    const { profile, signOut } = useAuthStore();
    const [businessLogo, setBusinessLogo] = useState(null);
    const [businessName, setBusinessName] = useState('Pratik Hesap');
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    useEffect(() => {
        if (profile?.business_id) {
            fetchBusinessDetails();
        }
    }, [profile]);

    async function fetchBusinessDetails() {
        try {
            const { data } = await supabase
                .from('businesses')
                .select('name, logo_url')
                .eq('id', profile.business_id)
                .single();

            if (data) {
                if (data.logo_url) setBusinessLogo(data.logo_url);
                if (data.name) setBusinessName(data.name);
            }
        } catch (error) {
            console.error('Error fetching business details', error);
        }
    }

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Ana Sayfa', roles: ['admin', 'staff', 'super_admin'] },
        { path: '/sales', icon: ShoppingCart, label: 'Satış & POS', roles: ['admin', 'staff', 'super_admin'] },
        { path: '/stock', icon: Package, label: 'Stok Yönetimi', roles: ['admin', 'staff', 'super_admin'] },
        { path: '/purchases', icon: Truck, label: 'Alımlar (Fatura)', roles: ['admin', 'super_admin'] },
        { path: '/customers', icon: Users, label: 'Müşteriler (Cari)', roles: ['admin', 'staff', 'super_admin'] },
        { path: '/suppliers', icon: Truck, label: 'Tedarikçiler', roles: ['admin', 'super_admin'] }, // Moved Here
        { path: '/accounts', icon: Wallet, label: 'Hesaplar & Kasa', roles: ['admin', 'super_admin'] },
        { path: '/expenses', icon: Wallet, label: 'Giderler', roles: ['admin', 'super_admin'] },
        { path: '/reports', icon: FileBarChart, label: 'Raporlar', roles: ['admin', 'super_admin'] },
    ];

    // Filter items based on role
    const userRole = profile?.role || 'admin';
    const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 h-screen fixed left-0 top-0 overflow-y-auto z-50 shadow-xl">
            <div className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-blue-900/50 overflow-hidden">
                    {businessLogo ? (
                        <img src={businessLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <LayoutDashboard size={32} className="text-white" />
                    )}
                </div>
                <h1 className="font-bold text-lg tracking-tight">{businessName}</h1>
                <p className="text-xs text-slate-400 mt-1">Stok & Satış Yönetimi</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}

                {/* Super Admin Menu */}
                {profile?.role === 'super_admin' && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <span className="text-xl">👑</span>
                        <span className="font-medium">Süper Panel</span>
                    </NavLink>
                )}

                {/* Admin Management Menu */}
                {isAdmin && (
                    <div className="mt-8 pt-4 border-t border-slate-800">
                        <p className="px-4 text-xs font-semibold text-slate-500 mb-2">YÖNETİM</p>
                        {/* Settings Moved Here */}
                        <NavLink
                            to="/team"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <Users size={20} />
                            <span className="font-medium">Kullanıcılar</span>
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <Settings size={20} />
                            <span className="font-medium">Ayarlar</span>
                        </NavLink>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Çıkış Yap</span>
                </button>
            </div>
        </aside>
    );
}
