import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Menu
} from 'lucide-react';

// For mobile, we only show primary actions to save space.
const BottomNav = () => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-slate-400'
                        }`
                    }
                >
                    <LayoutDashboard size={24} />
                    <span className="text-[10px] mt-1 font-medium">Ana Sayfa</span>
                </NavLink>

                <NavLink
                    to="/sales"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-slate-400'
                        }`
                    }
                >
                    <div className="bg-blue-600 text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-slate-50">
                        <ShoppingCart size={24} />
                    </div>
                    <span className="text-[10px] mt-1 font-medium text-blue-600">Satış</span>
                </NavLink>

                <NavLink
                    to="/stock"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-slate-400'
                        }`
                    }
                >
                    <Package size={24} />
                    <span className="text-[10px] mt-1 font-medium">Stok</span>
                </NavLink>

                {/* More Menu for Accounts, Customers etc */}
                <NavLink
                    to="/menu"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-blue-600' : 'text-slate-400'
                        }`
                    }
                >
                    <Menu size={24} />
                    <span className="text-[10px] mt-1 font-medium">Diğer</span>
                </NavLink>
            </div>
        </nav>
    );
};

export default BottomNav;
