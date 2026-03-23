import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, 
  updateDoc, deleteDoc, doc, onSnapshot 
} from "firebase/firestore";
import { 
  LayoutDashboard, Package, Search, Plus, Wrench, 
  CheckCircle2, Filter, Trash2, Edit3, Menu, X, 
  User, Settings as SettingsIcon, AlertTriangle, Building2, Tags 
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE (COLE A SUA AQUI) ---
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
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: '', lab: '', quantity: 0, minQuantity: 0, status: 'Operacional'
  });

  // --- BUSCA DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    // Escutar Itens
    const unsubItems = onSnapshot(collection(db, "items"), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    // Escutar Laboratórios
    const unsubLabs = onSnapshot(collection(db, "labs"), (snapshot) => {
      setLabs(snapshot.docs.map(doc => doc.data().name));
    });
    // Escutar Categorias
    const unsubCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => doc.data().name));
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
    } catch (e) { console.error("Erro ao salvar:", e); }
  };

  const deleteItem = async (id) => {
    if(window.confirm("Deseja excluir este item?")) {
      await deleteDoc(doc(db, "items", id));
    }
  };

  const addConfig = async (type, name) => {
    if (!name) return;
    await addDoc(collection(db, type), { name });
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
      {/* Sidebar (Menu Lateral) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-blue-900 text-white transition-all duration-300 hidden md:flex flex-col border-r border-blue-800`}>
        <div className="p-6 flex items-center gap-3 border-b border-blue-800/50">
          <div className="bg-white p-1.5 rounded-lg shrink-0">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/8c/SENAI_Logo.svg" alt="SENAI" className="w-8" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">LabControl</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} compact={!isSidebarOpen} />
          <NavItem icon={<Package size={20}/>} label="Inventário" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} compact={!isSidebarOpen} />
          <NavItem icon={<SettingsIcon size={20}/>} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} compact={!isSidebarOpen} />
        </nav>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-700">SENAI | Gestão de Laboratórios</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Buscar ativo..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              <User size={20} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <Dashboard stats={stats} items={items} />}
          
          {activeTab === 'inventory' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <select 
                  className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
                  value={filterLab} onChange={(e) => setFilterLab(e.target.value)}
                >
                  <option value="Todos">Todos os Laboratórios</option>
                  {labs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button 
                  onClick={() => { setEditingItem(null); setItemForm({ name: '', category: categories[0] || '', lab: labs[0] || '', quantity: 0, minQuantity: 0, status: 'Operacional' }); setIsItemModalOpen(true); }}
                  className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20"
                >
                  <Plus size={20} /> Adicionar Ativo
                </button>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Item / Categoria</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Laboratório</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Qtd / Mín</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 group">
                        <td className="px-6 py-4">
                          <div className="font-bold">{item.name}</div>
                          <div className="text-[10px] text-blue-600 font-bold uppercase">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">{item.lab}</td>
                        <td className="px-6 py-4 text-sm font-bold">
                          <span className={item.quantity <= item.minQuantity ? "text-red-600 animate-pulse" : ""}>
                            {item.quantity} / {item.minQuantity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            item.status === 'Manutenção' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingItem(item); setItemForm(item); setIsItemModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-4xl mx-auto space-y-6">
                <ConfigSection title="Laboratórios" icon={<Building2 />} onAdd={(val) => addConfig("labs", val)} list={labs} />
                <ConfigSection title="Categorias" icon={<Tags />} onAdd={(val) => addConfig("categories", val)} list={categories} color="purple" />
             </div>
          )}
        </div>
      </main>

      {/* Modal de Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingItem ? 'Editar Ativo' : 'Novo Ativo'}</h3>
              <button onClick={() => setIsItemModalOpen(false)}><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-4">
              <input required className="w-full border rounded-xl px-4 py-2.5" placeholder="Nome do Item" value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full border rounded-xl px-4 py-2.5" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})}>
                  <option value="">Selecione Categoria</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="w-full border rounded-xl px-4 py-2.5" value={itemForm.lab} onChange={(e) => setItemForm({...itemForm, lab: e.target.value})}>
                  <option value="">Selecione Laboratório</option>
                  {labs.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="border rounded-xl px-4 py-2.5" placeholder="Qtd. Atual" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value)})}/>
                <input type="number" className="border rounded-xl px-4 py-2.5" placeholder="Qtd. Mínima" value={itemForm.minQuantity} onChange={(e) => setItemForm({...itemForm, minQuantity: parseInt(e.target.value)})}/>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all">Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUBCOMPONENTES ---
const NavItem = ({ icon, label, active, onClick, compact }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all ${active ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span> {!compact && <span className="font-semibold text-sm">{label}</span>}
  </button>
);

const Dashboard = ({ stats, items }) => (
  <div className="space-y-8 max-w-7xl mx-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="Total Ativos" value={stats.total} icon={<Package size={24}/>} color="blue" />
      <Card title="Esq. Crítico" value={stats.lowStock} icon={<AlertTriangle size={24}/>} color="red" />
      <Card title="Manutenção" value={stats.maintenance} icon={<Wrench size={24}/>} color="yellow" />
      <Card title="Operacionais" value={stats.ok} icon={<CheckCircle2 size={24}/>} color="green" />
    </div>
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h3 className="font-bold text-lg mb-4 text-red-600 flex items-center gap-2"><AlertTriangle size={20}/> Alertas Críticos</h3>
      {items.filter(i => i.quantity <= i.minQuantity).map(item => (
        <div key={item.id} className="p-3 bg-red-50 rounded-lg mb-2 border border-red-100 flex justify-between text-sm">
          <span className="font-bold">{item.name} ({item.lab})</span>
          <span className="font-bold text-red-700">Estoque: {item.quantity} / Mín: {item.minQuantity}</span>
        </div>
      ))}
    </div>
  </div>
);

const Card = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-start justify-between">
    <div><p className="text-slate-400 text-[10px] font-black uppercase mb-1">{title}</p><p className="text-3xl font-black">{value}</p></div>
    <div className={`p-3 rounded-xl ${color === 'red' ? 'bg-red-50 text-red-600' : color === 'green' ? 'bg-green-50 text-green-600' : color === 'yellow' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'}`}>{icon}</div>
  </div>
);

const ConfigSection = ({ title, icon, onAdd, list, color="blue" }) => {
  const [val, setVal] = useState('');

  const handleAdd = () => {
    if (val.trim()) {
      onAdd(val);
      setVal('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-6 font-bold text-xl text-slate-800">
        <div className={`p-2 rounded-lg ${color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
          {icon}
        </div>
        {title}
      </div>
      
      <div className="flex gap-3 mb-6">
        <input 
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
          placeholder={`Nome do novo ${title.toLowerCase()}...`} 
          value={val} 
          onChange={(e) => setVal(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd} 
          className={`px-6 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 ${
            color === 'purple' 
              ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
              : 'bg-blue-700 hover:bg-blue-800 shadow-blue-200'
          }`}
        >
          <Plus size={18} /> Cadastrar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {list.length > 0 ? list.map((item, index) => (
          <span key={index} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 flex items-center gap-2">
            {item}
          </span>
        )) : (
          <p className="text-slate-400 text-sm italic">Nenhum registro cadastrado.</p>
        )}
      </div>
    </div>
  );
}

export default App;