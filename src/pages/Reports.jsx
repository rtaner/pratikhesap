import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export default function Reports() {
    const { business } = useAuthStore();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalCost: 0,
        totalExpenses: 0,
        netProfit: 0,
        saleCount: 0
    });
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!business) return;
        fetchReportData();
    }, [business]);

    async function fetchReportData() {
        setLoading(true);
        try {
            // 1. Fetch Sales (Completed only)
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('id, final_amount, date')
                .eq('business_id', business.id)
                .eq('status', 'completed');

            if (salesError) throw salesError;

            // 2. Fetch Sale Items (to calculate Cost of Goods Sold)
            const { data: saleItems, error: itemsError } = await supabase
                .from('sale_items')
                .select('product_id, quantity, product_name, total')
                .eq('business_id', business.id);

            if (itemsError) throw itemsError;

            // 3. Fetch Expenses
            const { data: expenses, error: expenseError } = await supabase
                .from('expenses')
                .select('amount')
                .eq('business_id', business.id);

            if (expenseError) throw expenseError;

            // 4. Fetch Products (to get current buying_price)
            // Note: This is an approximation. Ideally, cost should be snapshot at sale time.
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, buying_price, name');

            if (productsError) throw productsError;

            // --- CALCULATIONS ---

            // A. Revenue
            const revenue = sales.reduce((sum, s) => sum + Number(s.final_amount), 0);

            // B. Cost of Goods Sold (COGS)
            // Map product costs
            const productCostMap = {};
            products.forEach(p => {
                productCostMap[p.id] = Number(p.buying_price || 0);
            });

            let cogs = 0;
            const productSalesCount = {}; // For top selling

            saleItems.forEach(item => {
                const cost = productCostMap[item.product_id] || 0;
                cogs += cost * Number(item.quantity);

                // Track top selling
                if (!productSalesCount[item.product_name]) productSalesCount[item.product_name] = 0;
                productSalesCount[item.product_name] += Number(item.quantity);
            });

            // C. Expenses
            const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

            // D. Net Profit
            const profit = revenue - cogs - totalExp;

            setStats({
                totalRevenue: revenue,
                totalCost: cogs,
                totalExpenses: totalExp,
                netProfit: profit,
                saleCount: sales.length
            });

            // E. Top Products
            const sortedProducts = Object.entries(productSalesCount)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            setTopProducts(sortedProducts);

        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    }

    const StatCard = ({ title, value, icon: Icon, colorClass, subValue }) => (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClass}`}>
                <Icon size={24} />
            </div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-slate-400">Raporlar yükleniyor...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Finansal Raporlar</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Toplam Ciro"
                    value={stats.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    subValue={`${stats.saleCount} Satıştan`}
                    icon={DollarSign}
                    colorClass="bg-blue-100 text-blue-600"
                />
                <StatCard
                    title="Mal Maliyeti"
                    value={stats.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    subValue="Satılan ürünlerin alış fiyatı"
                    icon={Wallet}
                    colorClass="bg-orange-100 text-orange-600"
                />
                <StatCard
                    title="İşletme Giderleri"
                    value={stats.totalExpenses.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    subValue="Kira, fatura vb."
                    icon={TrendingDown}
                    colorClass="bg-red-100 text-red-600"
                />
                <StatCard
                    title="Net Kar"
                    value={stats.netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    subValue="Ciro - (Maliyet + Gider)"
                    icon={TrendingUp}
                    colorClass={stats.netProfit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">En Çok Satan Ürünler</h3>
                    <div className="space-y-4">
                        {topProducts.map((p, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-500">
                                        {i + 1}
                                    </span>
                                    <span className="text-slate-700 font-medium">{p.name}</span>
                                </div>
                                <span className="text-slate-900 font-bold">{p.qty} Adet</span>
                            </div>
                        ))}
                        {topProducts.length === 0 && <p className="text-slate-400 text-sm">Veri yok</p>}
                    </div>
                </div>

                {/* Quick Analysis (Placeholder for Chart) */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-lg">
                    <h3 className="font-bold text-lg mb-2">Finansal Özet</h3>
                    <p className="text-slate-300 text-sm mb-6">
                        Şu anki karlılık durumunuz:
                    </p>

                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-4xl font-bold">
                            {((stats.netProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}%
                        </span>
                        <span className="text-sm text-slate-400 mb-2">Kar Marjı</span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${stats.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (stats.netProfit / (stats.totalRevenue || 1)) * 100))}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        * Bu oran Ciro üzerinden hesaplanmıştır.
                    </p>
                </div>
            </div>
        </div>
    );
}
