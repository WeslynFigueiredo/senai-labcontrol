import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, 
  updateDoc, deleteDoc, doc, onSnapshot, query, where 
} from "firebase/firestore";
import { 
  LayoutDashboard, Package, Search, Plus, Wrench, 
  CheckCircle2, Filter, Trash2, Edit3, Menu, X, 
  User, Settings as SettingsIcon, AlertTriangle, Building2, Tags, 
  AlertCircle, ArrowRight
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE (COLE SUAS CREDENCIAIS REAIS AQUI) ---
const firebaseConfig = {
  apiKey: "AIzaSyAYbbKirfXBbn4dmuUXTDEHiTLYEP1kYAs",
  authDomain: "senai-labcontrol.firebaseapp.com",
  projectId: "senai-labcontrol",
  storageBucket: "senai-labcontrol.firebasestorage.app",
  messagingSenderId: "731990552263",
  appId: "1:731990552263:web:e0c1690a64071eb069d8e2",
  measurementId: "G-2KDFTP7TXF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [labs, setLabs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLab, setFilterLab] = useState('Todos');
  
  // Modais e Estados
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', name: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: '', lab: '', quantity: 0, minQuantity: 0, status: 'Operacional'
  });

  // --- BUSCA EM TEMPO REAL (REAL-TIME SYNC) ---
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "items"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubLabs = onSnapshot(collection(db, "labs"), (snapshot) => {
      setLabs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a,b) => a.name.localeCompare(b.name)));
    });
    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a,b) => a.name.localeCompare(b.name)));
    });
    return () => { unsubItems(); unsubLabs(); unsubCats(); };
  }, []);

  // --- FUNÇÕES DE PERSISTÊNCIA ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, "items", editingItem.id), itemForm);
      } else {
        await addDoc(collection(db, "items"), itemForm);
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, "items", id));
  };

  const addConfig = async (type, name) => {
    if (!name.trim()) return;
    await addDoc(collection(db, type), { name: name.trim() });
  };

  const executeDeleteConfig = async () => {
    const { type, name, id } = confirmDelete;
    
    // Bloqueio de segurança: Verificação se está em uso
    const inUse = items.some(item => type === 'labs' ? item.lab === name : item.category === name);
    if (inUse) {
      alert(`O(A) ${name} está em uso no inventário e não pode ser removido.`);
      setConfirmDelete({ open: false, type: '', name: '' });
      return;
    }

    try {
      await deleteDoc(doc(db, type, id));
      setConfirmDelete({ open: false, type: '', name: '' });
    } catch (e) { console.error(e); }
  };

  // --- FILTROS E STATS ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLab = filterLab === 'Todos' || item.lab === filterLab;
      return matchesSearch && matchesLab;
    });
  }, [items, searchQuery, filterLab]);

  const stats = useMemo(() => ({
    total: items.length,
    lowStock: items.filter(i => i.quantity <= i.minQuantity).length,
    maintenance: items.filter(i => i.status === 'Manutenção').length,
    ok: items.filter(i => i.status === 'Operacional' && i.quantity > i.minQuantity).length
  }), [items]);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Sidebar Mobile Overlay */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(true)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 h-full ${isSidebarOpen ? 'w-72 -translate-x-full md:translate-x-0' : 'w-20 translate-x-0'} bg-blue-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}>
        <div className="p-6 flex items-center justify-between border-b border-blue-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-white p-2 rounded-xl shrink-0">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_Logo.svg" alt="SENAI" className="w-8" />
            </div>
            {isSidebarOpen && <span className="font-black text-xl tracking-tighter uppercase whitespace-nowrap">LabControl</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-blue-800 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <NavItem icon={<LayoutDashboard size={22}/>} label="Painel Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} compact={!isSidebarOpen} />
          <NavItem icon={<Package size={22}/>} label="Inventário" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} compact={!isSidebarOpen} />
          <NavItem icon={<SettingsIcon size={22}/>} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} compact={!isSidebarOpen} />
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-blue-800 text-blue-300 hidden md:flex">
             {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">SENAI <span className="text-blue-600">LabControl</span></h2>
          </div>
          
          <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
            <div className="relative group w-full max-w-xs">
              <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" placeholder="Buscar ativo..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shrink-0 shadow-sm">
              <User size={20} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10">
          {activeTab === 'dashboard' && <Dashboard stats={stats} items={items} />}
          
          {activeTab === 'inventory' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border shadow-sm w-full md:w-auto">
                  <Filter size={16} className="text-slate-400" />
                  <select 
                    className="bg-transparent border-none text-sm font-bold focus:ring-0 w-full"
                    value={filterLab} onChange={(e) => setFilterLab(e.target.value)}
                  >
                    <option value="Todos">Todos os Laboratórios</option>
                    {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setItemForm({ name: '', category: categories[0]?.name || '', lab: labs[0]?.name || '', quantity: 0, minQuantity: 0, status: 'Operacional' }); setIsItemModalOpen(true); }}
                  className="w-full md:w-auto bg-blue-700 text-white px-8 py-3.5 rounded-[1.2rem] font-black flex items-center justify-center gap-2 hover:bg-blue-800 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-900/20"
                >
                  <Plus size={22} /> NOVO ATIVO
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item / Categoria</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Localização</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estoque</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map(item => {
                        const isLow = item.quantity <= item.minQuantity;
                        return (
                          <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                            <td className="px-8 py-6">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{item.category}</div>
                            </td>
                            <td className="px-8 py-6 text-sm text-slate-600 font-medium">{item.lab}</td>
                            <td className="px-8 py-6 text-center">
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isLow ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                <span className={`text-lg font-black ${isLow && 'animate-pulse'}`}>{item.quantity}</span>
                                <span className="text-slate-300">/</span>
                                <span className="font-bold opacity-60">{item.minQuantity}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${
                                item.status === 'Manutenção' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                isLow ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                              }`}>
                                {isLow ? 'REPOSIÇÃO' : item.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingItem(item); setItemForm(item); setIsItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"><Edit3 size={18}/></button>
                                <button onClick={() => deleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={18}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-4xl mx-auto space-y-10">
                <ConfigSection 
                  title="Laboratórios" 
                  icon={<Building2 />} 
                  onAdd={(val) => addConfig("labs", val)} 
                  onDelete={(name, id) => setConfirmDelete({ open: true, type: 'labs', name, id })}
                  list={labs} 
                />
                <ConfigSection 
                  title="Categorias de Itens" 
                  icon={<Tags />} 
                  onAdd={(val) => addConfig("categories", val)} 
                  onDelete={(name, id) => setConfirmDelete({ open: true, type: 'categories', name, id })}
                  list={categories} 
                  color="purple" 
                />
             </div>
          )}
        </div>
      </main>

      {/* --- MODAIS (MODERNOS E RESPONSIVOS) --- */}

      {/* Confirmação de Exclusão */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 mb-8 leading-relaxed font-medium">Tem certeza que deseja remover <span className="text-red-600 font-bold">"{confirmDelete.name}"</span>? Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-3">
                <button onClick={executeDeleteConfig} className="w-full py-4 bg-red-600 text-white rounded-[1.2rem] font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 uppercase tracking-widest">Sim, excluir</button>
                <button onClick={() => setConfirmDelete({ open: false, type: '', name: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.2rem] font-black hover:bg-slate-200 transition-all uppercase tracking-widest">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Cadastro/Edição de Ativo */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingItem ? 'Editar Ativo' : 'Novo Ativo'}</h3>
                <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mt-1">Patrimônio SENAI Macapá</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Descrição do Ativo</label>
                  <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold" value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} placeholder="Ex: Osciloscópio Digital"/>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Categoria</label>
                    <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})}>
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Status</label>
                    <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none font-bold" value={itemForm.status} onChange={(e) => setItemForm({...itemForm, status: e.target.value})}>
                      <option>Operacional</option>
                      <option>Manutenção</option>
                      <option>Crítico</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Laboratório Destino</label>
                  <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={itemForm.lab} onChange={(e) => setItemForm({...itemForm, lab: e.target.value})}>
                    <option value="">Selecione o local...</option>
                    {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-[2rem] grid grid-cols-2 gap-6 border border-blue-100">
                  <div>
                    <label className="block text-[10px] font-black text-blue-900 uppercase mb-2">Qtd. Atual</label>
                    <input type="number" min="0" className="w-full border-2 border-blue-100 rounded-2xl px-5 py-3 text-center text-xl font-black focus:ring-2 focus:ring-blue-600 outline-none" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-red-700 uppercase mb-2">Qtd. Mínima</label>
                    <input type="number" min="0" className="w-full border-2 border-red-100 rounded-2xl px-5 py-3 text-center text-xl font-black focus:ring-2 focus:ring-red-600 outline-none" value={itemForm.minQuantity} onChange={(e) => setItemForm({...itemForm, minQuantity: parseInt(e.target.value) || 0})}/>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-blue-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-800 shadow-xl shadow-blue-900/30 transition-all">Salvar Ativo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const NavItem = ({ icon, label, active, onClick, compact }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span>
    {!compact && <span className="font-black text-xs uppercase tracking-wide whitespace-nowrap">{label}</span>}
  </button>
);

const ConfigSection = ({ title, icon, onAdd, onDelete, list, color="blue" }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => { if(val.trim()){ onAdd(val); setVal(''); } };
  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4 mb-8 font-black text-2xl text-slate-800 tracking-tight">
        <div className={`p-3 rounded-2xl ${color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{icon}</div>
        {title}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input 
          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
          placeholder={`Novo ${title.toLowerCase()}...`} 
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className={`px-8 py-4 sm:py-0 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 whitespace-nowrap uppercase tracking-widest ${color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-200'}`}>CADASTRAR</button>
      </div>
      <div className="flex flex-wrap gap-4">
        {list.map((item) => (
          <div key={item.id} className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50/20 transition-all group shadow-sm">
            <span className="font-bold text-slate-700">{item.name}</span>
            <button 
              onClick={() => onDelete(item.name, item.id)} 
              className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-400 font-medium italic p-4">Nenhum registro encontrado.</p>}
      </div>
    </div>
  );
};

const Dashboard = ({ stats, items }) => (
  <div className="space-y-10 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
      <StatCard title="Total Ativos" value={stats.total} icon={<Package size={26}/>} color="blue" />
      <StatCard title="Esq. Crítico" value={stats.lowStock} icon={<AlertTriangle size={26}/>} color="red" />
      <StatCard title="Manutenção" value={stats.maintenance} icon={<Wrench size={26}/>} color="yellow" />
      <StatCard title="Operacionais" value={stats.ok} icon={<CheckCircle2 size={26}/>} color="green" />
    </div>
    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="font-black text-2xl mb-8 text-slate-800 flex items-center gap-4 uppercase tracking-tighter">
          <AlertCircle size={30} className="text-red-600" /> Reposição Urgente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.filter(i => i.quantity <= i.minQuantity).map(item => (
            <div key={item.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white flex flex-col justify-between transition-all hover:scale-[1.03] hover:shadow-lg shadow-slate-200 shadow-sm">
              <div className="mb-4">
                <p className="font-black text-slate-900 text-lg leading-tight mb-1">{item.name}</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.lab}</p>
                </div>
              </div>
              <div className="flex items-end justify-between border-t border-slate-200 pt-4">
                <div>
                   <span className="text-3xl font-black text-red-600">{item.quantity}</span>
                   <span className="text-slate-400 text-xs font-bold block">No estoque</span>
                </div>
                <div className="text-right">
                   <span className="text-xl font-black text-slate-300">/ {item.minQuantity}</span>
                   <span className="text-slate-400 text-xs font-bold block">Mínimo</span>
                </div>
              </div>
            </div>
          ))}
          {items.filter(i => i.quantity <= i.minQuantity).length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-slate-500 font-bold text-lg italic">Tudo em ordem! Nenhum alerta de estoque.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, color }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green: 'bg-green-50 text-green-700 border-green-100'
  };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-xl hover:translate-y-[-4px] transition-all cursor-default group">
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-4xl font-black text-slate-800">{value}</p>
      </div>
      <div className={`p-4 rounded-[1.2rem] border transition-all group-hover:scale-110 shadow-sm ${styles[color]}`}>{icon}</div>
    </div>
  );
};

export default App;