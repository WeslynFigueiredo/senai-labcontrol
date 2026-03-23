import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, 
  updateDoc, deleteDoc, doc, onSnapshot, query, where 
} from "firebase/firestore";
import { 
  LayoutDashboard, Package, Search, Plus, Wrench, 
  CheckCircle2, Filter, Trash2, Edit3, Menu, X, 
  User, Settings as SettingsIcon, AlertTriangle, Building2, Tags 
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE (MANTENHA SUAS CREDENCIAIS AQUI) ---
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
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
  
  // Modais e Estados de Formulário
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: '', lab: '', quantity: 0, minQuantity: 0, status: 'Operacional'
  });

  // --- BUSCA DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "items"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    const unsubLabs = onSnapshot(collection(db, "labs"), (snapshot) => {
      setLabs(snapshot.docs.map(doc => doc.data().name).sort());
    });
    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => doc.data().name).sort());
    });

    return () => { unsubItems(); unsubLabs(); unsubCats(); };
  }, []);

  // --- FUNÇÕES DE PERSISTÊNCIA (ITENS) ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.lab || !itemForm.category) {
      alert("Por favor, selecione um Laboratório e uma Categoria.");
      return;
    }
    try {
      if (editingItem) {
        await updateDoc(doc(db, "items", editingItem.id), itemForm);
      } else {
        await addDoc(collection(db, "items"), itemForm);
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (e) { console.error("Erro ao salvar:", e); }
  };

  const deleteItem = async (id) => {
    if(window.confirm("Deseja excluir este item permanentemente?")) {
      await deleteDoc(doc(db, "items", id));
    }
  };

  // --- FUNÇÕES DE CONFIGURAÇÃO (LABS/CATS) ---
  const addConfig = async (type, name) => {
    if (!name.trim()) return;
    await addDoc(collection(db, type), { name: name.trim() });
  };

  const deleteConfig = async (type, name) => {
    // Validação de Integridade: Verifica se o nome está em uso no inventário
    const isBeingUsed = items.some(item => 
      type === 'labs' ? item.lab === name : item.category === name
    );

    if (isBeingUsed) {
      alert(`Bloqueio de Segurança: Não é possível excluir "${name}" porque existem itens vinculados a ele no Inventário.`);
      return;
    }

    if (window.confirm(`Confirmar exclusão de ${type === 'labs' ? 'Laboratório' : 'Categoria'}: "${name}"?`)) {
      try {
        const querySnapshot = await getDocs(collection(db, type));
        const docToDelete = querySnapshot.docs.find(d => d.data().name === name);
        if (docToDelete) {
          await deleteDoc(doc(db, type, docToDelete.id));
        }
      } catch (e) { console.error("Erro ao excluir configuração:", e); }
    }
  };

  // --- LÓGICA DE FILTRO E STATS ---
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
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar Principal */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-blue-900 text-white transition-all duration-300 hidden md:flex flex-col border-r border-blue-800 shadow-xl`}>
        <div className="p-6 flex items-center gap-3 border-b border-blue-800/50">
          <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_Logo.svg" alt="SENAI" className="w-8" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight uppercase">LabControl</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} compact={!isSidebarOpen} />
          <NavItem icon={<Package size={20}/>} label="Inventário" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} compact={!isSidebarOpen} />
          <NavItem icon={<SettingsIcon size={20}/>} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} compact={!isSidebarOpen} />
        </nav>
      </aside>

      {/* Conteúdo da Aplicação */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">SENAI <span className="font-light text-slate-400 mx-2">|</span> Gestão de Laboratórios</h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Pesquisar ativos..." 
                className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm w-72 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors">
              <User size={22} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50">
          {activeTab === 'dashboard' && <Dashboard stats={stats} items={items} />}
          
          {activeTab === 'inventory' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                  <span className="pl-4 text-xs font-bold text-slate-400 uppercase">Filtrar:</span>
                  <select 
                    className="bg-transparent border-none rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-0"
                    value={filterLab} onChange={(e) => setFilterLab(e.target.value)}
                  >
                    <option value="Todos">Todos os Laboratórios</option>
                    {labs.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => { setEditingItem(null); setItemForm({ name: '', category: categories[0] || '', lab: labs[0] || '', quantity: 0, minQuantity: 0, status: 'Operacional' }); setIsItemModalOpen(true); }}
                  className="w-full sm:w-auto bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-xl shadow-blue-700/20 active:scale-95"
                >
                  <Plus size={22} /> Novo Ativo
                </button>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Item / Categoria</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Laboratório</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Estoque (Qtd/Mín)</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => {
                      const isLow = item.quantity <= item.minQuantity;
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-800 text-base">{item.name}</div>
                            <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider mt-0.5">{item.category}</div>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-600 font-medium">{item.lab}</td>
                          <td className="px-8 py-6 text-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${isLow ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-slate-50 text-slate-800'}`}>
                              <span className="font-black text-lg">{item.quantity}</span>
                              <span className="text-slate-300 font-light">/</span>
                              <span className="font-bold text-slate-400">{item.minQuantity}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${
                              item.status === 'Manutenção' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                              isLow ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                            }`}>
                              {isLow ? 'Reposição' : item.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItem(item); setItemForm(item); setIsItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"><Edit3 size={18}/></button>
                              <button onClick={() => deleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={18}/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-4xl mx-auto space-y-10">
                <ConfigSection 
                  title="Laboratórios" 
                  icon={<Building2 />} 
                  onAdd={(val) => addConfig("labs", val)} 
                  onDelete={(name) => deleteConfig("labs", name)}
                  list={labs} 
                />
                <ConfigSection 
                  title="Categorias" 
                  icon={<Tags />} 
                  onAdd={(val) => addConfig("categories", val)} 
                  onDelete={(name) => deleteConfig("categories", name)}
                  list={categories} 
                  color="purple" 
                />
             </div>
          )}
        </div>
      </main>

      {/* Modal de Formulário Estilizado */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{editingItem ? 'Editar Ativo' : 'Novo Equipamento'}</h3>
                <p className="text-blue-300 text-xs font-bold mt-1 uppercase tracking-widest">Controle de Patrimônio SENAI</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={28}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-10 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição do Ativo</label>
                  <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold" value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} placeholder="Ex: Multímetro Digital Hikari"/>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                    <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})}>
                      <option value="">-- Selecione --</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status Operacional</label>
                    <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" value={itemForm.status} onChange={(e) => setItemForm({...itemForm, status: e.target.value})}>
                      <option>Operacional</option>
                      <option>Manutenção</option>
                      <option>Crítico</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alocar para Laboratório</label>
                  <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" value={itemForm.lab} onChange={(e) => setItemForm({...itemForm, lab: e.target.value})}>
                    <option value="">-- Selecione o Local --</option>
                    {labs.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50/50 p-8 rounded-[2rem] grid grid-cols-2 gap-8 border-2 border-blue-100/50 mt-8">
                  <div>
                    <label className="block text-xs font-black text-blue-900 uppercase tracking-widest mb-2">Qtd. em Estoque</label>
                    <input type="number" min="0" className="w-full border-2 border-blue-100 rounded-2xl px-5 py-3 text-center text-xl font-black focus:ring-2 focus:ring-blue-600 outline-none" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}/>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-red-700 uppercase tracking-widest mb-2">Ponto de Alerta</label>
                    <input type="number" min="0" className="w-full border-2 border-red-100 rounded-2xl px-5 py-3 text-center text-xl font-black focus:ring-2 focus:ring-red-600 outline-none" value={itemForm.minQuantity} onChange={(e) => setItemForm({...itemForm, minQuantity: parseInt(e.target.value) || 0})}/>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-blue-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-800 shadow-xl shadow-blue-900/30 transition-all active:scale-95">Salvar Ativo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUBCOMPONENTES ---
const NavItem = ({ icon, label, active, onClick, compact }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
    active ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
  }`}>
    <span className="shrink-0">{icon}</span>
    {!compact && <span className="font-bold text-sm uppercase tracking-wide">{label}</span>}
  </button>
);

const ConfigSection = ({ title, icon, onAdd, onDelete, list, color="blue" }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => { if(val.trim()){ onAdd(val); setVal(''); } };
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4 mb-8 font-black text-2xl text-slate-800 tracking-tight">
        <div className={`p-3 rounded-2xl ${color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{icon}</div>
        {title}
      </div>
      <div className="flex gap-3 mb-8">
        <input 
          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
          placeholder={`Nome do novo ${title.toLowerCase()}...`} 
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className={`px-8 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-700 hover:bg-blue-800'}`}>CADASTRAR</button>
      </div>
      <div className="flex flex-wrap gap-3">
        {list.map((item, index) => (
          <div key={index} className="flex items-center gap-3 bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl border border-slate-200 group transition-all hover:border-red-300 hover:bg-red-50/30">
            <span className="font-bold">{item}</span>
            <button onClick={() => onDelete(item)} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ stats, items }) => (
  <div className="space-y-10 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard title="Total Ativos" value={stats.total} icon={<Package size={26}/>} color="blue" />
      <StatCard title="Esq. Crítico" value={stats.lowStock} icon={<AlertTriangle size={26}/>} color="red" />
      <StatCard title="Manutenção" value={stats.maintenance} icon={<Wrench size={26}/>} color="yellow" />
      <StatCard title="Operacionais" value={stats.ok} icon={<CheckCircle2 size={26}/>} color="green" />
    </div>
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="font-black text-xl mb-6 text-red-600 flex items-center gap-3 uppercase tracking-tighter">
          <AlertTriangle size={24} className="animate-bounce" /> Alertas Críticos de Reposição
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.filter(i => i.quantity <= i.minQuantity).map(item => (
            <div key={item.id} className="p-5 bg-red-50/50 rounded-[1.5rem] border border-red-100 flex justify-between items-center transition-all hover:scale-[1.02]">
              <div>
                <p className="font-black text-slate-800">{item.name}</p>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{item.lab}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-red-700">{item.quantity}</span>
                <span className="text-slate-400 text-xs font-bold block">Unidades</span>
              </div>
            </div>
          ))}
          {items.filter(i => i.quantity <= i.minQuantity).length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400 font-bold italic">Nenhum item abaixo do nível de segurança. Bom trabalho!</div>
          )}
        </div>
      </div>
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Package size={200} />
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
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-xl transition-all cursor-default group">
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-4xl font-black text-slate-800">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl border transition-all group-hover:scale-110 ${styles[color]}`}>{icon}</div>
    </div>
  );
};

export default App;