import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Users, UserPlus, Mail, Shield, Key, Trash2, Loader2, UserCheck, AlertCircle, Edit, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { toast } from 'react-hot-toast';

export default function Team() {
    const { profile, business } = useAuthStore();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        username: '',
        role: 'staff' // Default role
    });

    const [editingMember, setEditingMember] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (profile?.business_id) {
            fetchTeam();
        }
    }, [profile]);

    async function fetchTeam() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('business_id', profile.business_id)
                .order('role', { ascending: true }); // admin first

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching team:', error);
            toast.error('Ekip bilgileri yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMember(e) {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Call RPC to create user
            const { data, error } = await supabase.rpc('create_staff_member', {
                staff_email: formData.email,
                staff_password: formData.password,
                staff_name: formData.name,
                staff_username: formData.username || null,
                staff_role: formData.role
            });

            if (error) throw error;

            toast.success('Çalışan başarıyla eklendi!');
            setIsAddModalOpen(false);
            setFormData({ name: '', email: '', password: '', username: '', role: 'staff' });
            fetchTeam(); // Refresh list

        } catch (error) {
            console.error('Error adding member:', error);
            toast.error('Hata: ' + (error.message || 'Çalışan eklenemedi'));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdateRole(e) {
        e.preventDefault();
        if (!editingMember) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.rpc('update_staff_role', {
                target_user_id: editingMember.id,
                new_role: formData.role
            });

            if (error) throw error;

            toast.success('Yetki güncellendi!');
            setIsEditModalOpen(false);
            setEditingMember(null);
            fetchTeam();
        } catch (error) {
            toast.error('Güncelleme hatası: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    }

    function openEditModal(member) {
        setEditingMember(member);
        setFormData({
            ...formData,
            role: member.role
        });
        setIsEditModalOpen(true);
    }

    async function handleDeleteMember(userId) {
        if (!confirm('Bu çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            toast.success('Kullanıcı silindi');
            fetchTeam();
        } catch (error) {
            toast.error('Silme başarısız: ' + error.message);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-blue-600" />
                        Çalışan Yönetimi
                    </h1>
                    <p className="text-slate-500">İşletmenize çalışan ekleyin, rollerini yönetin.</p>
                </div>

                <Button onClick={() => {
                    setFormData({ name: '', email: '', password: '', username: '', role: 'staff' });
                    setIsAddModalOpen(true);
                }} className="gap-2">
                    <UserPlus size={18} />
                    Yeni Çalışan Ekle
                </Button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                <AlertCircle className="shrink-0" size={20} />
                <div>
                    <h4 className="font-semibold">Personel Yetkileri & Kullanıcı Adı</h4>
                    <p>Çalışanlarınız e-posta adresleri yerine <b>Kullanıcı Adı</b> ile de giriş yapabilirler. <br />Admin rolü tam yetkiye sahiptir, Staff rolü ise kısıtlıdır.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-slate-400">Yükleniyor...</div>
                ) : members.map((member) => (
                    <div key={member.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 
                                    ${member.role === 'admin' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                    {member.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{member.full_name}</h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                        ${member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {member.role === 'admin' ? 'Yönetici' : 'Personel (Staff)'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {member.id !== profile.id && (
                                <div className="flex items-center">
                                    <button
                                        onClick={() => openEditModal(member)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors p-2"
                                        title="Yetki Düzenle"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMember(member.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                        title="Kullanıcıyı Sil"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <User size={16} />
                                <span><b>Kullanıcı Adı:</b> {member.username || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <Mail size={16} />
                                <span className="truncate max-w-[200px]" title={member.email}>{member.email || '-'}</span>
                            </div>
                            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                                Kayıt: {new Date(member.created_at).toLocaleDateString('tr-TR')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Member Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Çalışan Ekle">
                <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg flex gap-2">
                        <Key size={16} className="shrink-0" />
                        <p>E-posta veya kullanıcı adıyla giriş yapabilirler. Şifreyi not etmeyi unutmayın.</p>
                    </div>

                    <Input
                        label="Ad Soyad"
                        placeholder="Örn: Ayşe Yılmaz"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        icon={UserCheck}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Kullanıcı Adı (Opsiyonel)"
                            placeholder="ayse123"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            icon={User}
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Yetki</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="staff">Personel (Staff)</option>
                                <option value="admin">Yönetici (Admin)</option>
                            </select>
                        </div>
                    </div>

                    <Input
                        label="E-posta Adresi (Gereklidir)"
                        type="email"
                        placeholder="ayse@sirket.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                        icon={Mail}
                    />
                    <Input
                        label="Şifre Belirle"
                        type="text"
                        placeholder="Örn: 123456"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                        icon={Key}
                    />

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>İptal</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Ekleniyor...' : 'Çalışanı Kaydet'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Role Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Yetki Düzenle">
                <form onSubmit={handleUpdateRole} className="space-y-4">
                    <p className="text-slate-600">
                        <span className="font-semibold">{editingMember?.full_name}</span> adlı kullanıcının yetkisini değiştiriyorsunuz.
                    </p>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Yeni Yetki</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="staff">Personel (Staff)</option>
                            <option value="admin">Yönetici (Admin)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>İptal</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Güncelleniyor...' : 'Kaydet'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
