import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuthStore } from '../store/authStore';
import { SUPER_ADMIN_EMAIL } from '../utils/tenantUtils';
import { Plus, Building2, ToggleLeft, ToggleRight, Edit, ChevronLeft, Users, Settings, Shield } from 'lucide-react';

const MasterAdminPage = ({ onBack }) => {
  const { user, isSuperAdmin } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [newTenant, setNewTenant] = useState({ name: '', id: '', adminEmail: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('churches');
  const [globalUsers, setGlobalUsers] = useState([]);

  // Carregar igrejas da coleção global "tenants"
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTenants(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Carregar usuários globais
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'global_users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
      list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setGlobalUsers(list);
    });
    return () => unsub();
  }, []);

  // Verificação de segurança
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Acesso Negado</h2>
          <p className="text-gray-500 mt-2">Apenas o Super Admin pode acessar esta página.</p>
        </div>
      </div>
    );
  }

  const generateTenantId = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name.trim()) return;
    setSaving(true);
    try {
      const tenantId = newTenant.id.trim() || generateTenantId(newTenant.name);
      
      if (editingTenant) {
        await updateDoc(doc(db, 'tenants', editingTenant.docId), {
          name: newTenant.name.trim(),
          adminEmail: newTenant.adminEmail.trim() || ''
        });
        if (newTenant.adminEmail.trim()) {
            const email = newTenant.adminEmail.trim().toLowerCase();
            const existingUser = globalUsers.find(u => u.email === email);
            if (existingUser) {
              const updatedTenants = [...new Set([...(existingUser.tenants || []), tenantId])];
              await updateDoc(doc(db, 'global_users', existingUser.docId), { tenants: updatedTenants });
            } else {
              await addDoc(collection(db, 'global_users'), { email: email, tenants: [tenantId], isSuperAdmin: false });
            }
        }
      } else {
        const existing = tenants.find(t => t.id === tenantId);
        if (existing) {
          alert('Já existe uma igreja com esse ID!');
          setSaving(false);
          return;
        }
        await addDoc(collection(db, 'tenants'), {
          id: tenantId, name: newTenant.name.trim(), adminEmail: newTenant.adminEmail.trim() || '',
          logoUrl: newTenant.logoUrl.trim() || '', status: 'active', createdAt: new Date().toISOString()
        });
        if (newTenant.adminEmail.trim()) {
          const email = newTenant.adminEmail.trim().toLowerCase();
          const existingUser = globalUsers.find(u => u.email === email);
          if (existingUser) {
            const updatedTenants = [...new Set([...(existingUser.tenants || []), tenantId])];
            await updateDoc(doc(db, 'global_users', existingUser.docId), { tenants: updatedTenants });
          } else {
            await addDoc(collection(db, 'global_users'), { email: email, tenants: [tenantId], isSuperAdmin: false });
          }
        }
      }
      setNewTenant({ name: '', id: '', adminEmail: '', logoUrl: '' });
      setEditingTenant(null);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erro ao salvar igreja:', error);
      alert('Erro ao salvar igreja: ' + error.message);
    }
    setSaving(false);
  };

  const handleToggleTenantStatus = async (tenant) => {
    const newStatus = tenant.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = newStatus === 'inactive'
      ? `Deseja realmente DESATIVAR a igreja "${tenant.name}"? Os usuários não poderão mais acessar os dados.`
      : `Deseja realmente REATIVAR a igreja "${tenant.name}"?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await updateDoc(doc(db, 'tenants', tenant.docId), { status: newStatus });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status: ' + error.message);
    }
  };

  const handleSwitchToTenant = (tenantId, tenantData) => {
    useAuthStore.getState().setTenant(tenantId, tenantData);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="hover:bg-slate-700 p-2 rounded-lg transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center space-x-3">
                  <Settings size={28} />
                  <span>Painel Mestre — SaaS</span>
                </h1>
                <p className="text-slate-300 text-sm mt-1">Gerencie todas as igrejas da plataforma</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-amber-500 text-black font-bold px-3 py-1 rounded-full">SUPER ADMIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mt-6 px-4">
        <div className="flex space-x-1 bg-white rounded-lg shadow p-1">
          <button
            onClick={() => setActiveTab('churches')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'churches' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 size={16} />
            <span>Igrejas ({tenants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-colors flex items-center justify-center space-x-2 ${
              activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            <span>Usuários Globais ({globalUsers.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto mt-6 px-4 pb-8">
        {activeTab === 'churches' && (
          <>
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Igrejas Cadastradas</h2>
              <div className="flex items-center space-x-2">
                {!tenants.find(t => t.id === 'tenda-church-app') && (
                  <button
                    onClick={async () => {
                      try {
                        const tenantId = 'tenda-church-app';
                        const adminEmail = 'tendachurchgbi@batistavida.com.br';
                        
                        await addDoc(collection(db, 'tenants'), {
                          id: tenantId,
                          name: 'Tenda Church Guanambi',
                          adminEmail: adminEmail,
                          logoUrl: '',
                          status: 'active',
                          createdAt: new Date().toISOString()
                        });

                        await addDoc(collection(db, 'global_users'), {
                          email: adminEmail,
                          tenants: [tenantId],
                          isSuperAdmin: false
                        });
                        alert('Base Original configurada com sucesso!');
                      } catch (error) {
                        alert('Erro: ' + error.message);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm transition-colors mr-2"
                  >
                    <Settings size={16} />
                    <span>Configurar Base Original</span>
                  </button>
                )}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 text-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>{editingTenant ? 'Editar Igreja' : 'Nova Igreja'}</span>
                </button>
              </div>
            </div>

            {/* Churches List */}
            {loading ? (
              <div className="text-center py-12 text-gray-500">Carregando igrejas...</div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma igreja cadastrada ainda.</p>
                <p className="text-gray-400 text-sm mt-1">Clique em "Nova Igreja" para começar.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tenants.map(tenant => (
                  <div key={tenant.docId} className={`bg-white rounded-xl shadow-md border-l-4 p-5 transition-all ${
                    tenant.status === 'active' ? 'border-l-green-500' : 'border-l-gray-300 opacity-70'
                  }`}>
                    <div className="flex flex-wrap justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-bold text-gray-800">{tenant.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            tenant.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {tenant.status === 'active' ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          <p><span className="font-medium">ID:</span> {tenant.id}</p>
                          {tenant.adminEmail && <p><span className="font-medium">Admin:</span> {tenant.adminEmail}</p>}
                          {tenant.createdAt && <p><span className="font-medium">Criada em:</span> {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <button
                          onClick={() => {
                              setEditingTenant(tenant);
                              setNewTenant({ name: tenant.name, id: tenant.id, adminEmail: tenant.adminEmail || '', logoUrl: tenant.logoUrl || '' });
                              setShowCreateModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors mr-1"
                          title="Editar"
                        >
                          <Edit size={20} />
                        </button>
                        {tenant.status === 'active' && (
                          <button
                            onClick={() => handleSwitchToTenant(tenant.id, tenant)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                          >
                            Acessar
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`p-2 rounded-lg transition-colors ${
                            tenant.status === 'active'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={tenant.status === 'active' ? 'Desativar' : 'Reativar'}
                        >
                          {tenant.status === 'active' ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Usuários Globais</h2>
            {globalUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhum usuário global cadastrado ainda.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Igrejas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {globalUsers.map(gu => (
                      <tr key={gu.docId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800">{gu.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {(gu.tenants || []).map(t => {
                              const tenantInfo = tenants.find(tn => tn.id === t);
                              return (
                                <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                  {tenantInfo?.name || t}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {gu.isSuperAdmin ? (
                            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">SIM</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Criar Igreja */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <Building2 size={22} />
              <span>{editingTenant ? 'Editar Igreja' : 'Nova Igreja'}</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Igreja *</label>
                <input
                  type="text"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({
                    ...newTenant, 
                    name: e.target.value,
                    id: generateTenantId(e.target.value)
                  })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Ex: Igreja Batista Central"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID (gerado automaticamente)</label>
                <input
                  type="text"
                  value={newTenant.id}
                  onChange={(e) => setNewTenant({ ...newTenant, id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-600 focus:ring-2 focus:ring-slate-500" disabled={!!editingTenant}
                  placeholder="gerado-automaticamente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Administrador</label>
                <input
                  type="email"
                  value={newTenant.adminEmail}
                  onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-500"
                  placeholder="admin@igreja.com"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setEditingTenant(null); setNewTenant({ name: '', id: '', adminEmail: '', logoUrl: '' }); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={saving || !newTenant.name.trim()}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg disabled:bg-gray-400 transition-colors"
              >
                {saving ? 'Salvando...' : (editingTenant ? 'Salvar Igreja' : 'Criar Igreja')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminPage;

