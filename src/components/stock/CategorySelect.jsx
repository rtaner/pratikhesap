import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Plus, X, Check, Loader2 } from 'lucide-react';

export default function CategorySelect({ value, onChange, className }) {
    const { business } = useAuthStore();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Inline Add State
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addingLoading, setAddingLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCategory(e) {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setAddingLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .insert({
                    business_id: business.id,
                    name: newCategoryName.trim().toUpperCase() // Force Uppercase
                })
                .select()
                .single();

            if (error) throw error;

            setCategories([...categories, data]);
            onChange(data.id); // Auto-select new category
            setIsAdding(false);
            setNewCategoryName('');
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Kategori eklenirken hata oluştu.');
        } finally {
            setAddingLoading(false);
        }
    }

    if (loading) return <div className="h-10 w-full bg-slate-100 animate-pulse rounded-lg"></div>;

    if (isAdding) {
        return (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                <input
                    autoFocus
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Yeni Kategori Adı"
                    className="flex-1 h-10 px-3 rounded-lg border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm uppercase"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory(e);
                        }
                        if (e.key === 'Escape') setIsAdding(false);
                    }}
                />
                <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addingLoading}
                    className="h-10 w-10 flex items-center justify-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    {addingLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                </button>
                <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="h-10 w-10 flex items-center justify-center bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="relative flex-1">
                <select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 appearance-none text-slate-700 text-sm"
                >
                    <option value="">Kategori Seçiniz</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg title="Select Check Icon" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="h-10 w-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 hover:border-blue-200 transition-colors"
                title="Yeni Kategori Ekle"
            >
                <Plus size={18} />
            </button>
        </div>
    );
}
