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
  AlertCircle, Download, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURAÇÃO DO FIREBASE ---
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

const capitalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [labs, setLabs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLab, setFilterLab] = useState('Todos');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', name: '', id: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: '', lab: '', quantity: 0, minQuantity: 0, status: 'Operacional'
  });

  useEffect(() => {
    const titles = { dashboard: "Painel Geral | Controle Lab's", inventory: "Inventário | Controle Lab's", settings: "Configurações | Controle Lab's" };
    document.title = titles[activeTab] || "Controle Lab's";
  }, [activeTab]);

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "items"), (s) => setItems(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubLabs = onSnapshot(collection(db, "labs"), (s) => setLabs(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.name.localeCompare(b.name))));
    const unsubCats = onSnapshot(collection(db, "categories"), (s) => setCategories(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.name.localeCompare(b.name))));
    return () => { unsubItems(); unsubLabs(); unsubCats(); };
  }, []);

  // --- FUNÇÃO DE EXPORTAÇÃO TURBO (COM SOMA REAL E LOGO CENTRALIZADA) ---
  const exportToPDF = (targetLab = 'Todos') => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();
    
    // 1. Filtragem e Cálculos de Volume Real
    const reportData = targetLab === 'Todos' ? items : items.filter(i => i.lab === targetLab);
    const totalUnidades = reportData.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const totalCritico = reportData.filter(i => i.quantity <= i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const totalManutencao = reportData.filter(i => i.status === 'Manutenção').reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const totalOperacional = reportData.filter(i => i.status === 'Operacional' && i.quantity > i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    // --- CABEÇALHO INSTITUCIONAL ---
    doc.setFillColor(0, 51, 153); // Azul SENAI
    doc.rect(0, 0, 210, 45, 'F');
    
    // Logo Centralizada
    const imgLogo = new Image();
    imgLogo.src = 'logo_senai.png'; 
    try {
        doc.addImage(imgLogo, 'PNG', 85, 5, 40, 15); 
    } catch (e) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("SENAI", 105, 15, { align: "center" });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONTROLE LAB'S", 105, 30, { align: "center" });

    // Dados de Emissão no Canto Direito
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`EMISSÃO: ${dateStr} às ${timeStr}`, 195, 15, { align: "right" });
    doc.text("SENAI MACAPÁ - DR-AP", 195, 20, { align: "right" });
    doc.text(`FILTRO: ${targetLab.toUpperCase()}`, 195, 25, { align: "right" });

    // --- CARDS DO RESUMO (DASHBOARD NO PDF) ---
    const drawCard = (x, y, w, h, title, val, color) => {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(1);
        doc.line(x + 2, y + 5, x + 2, y + h - 5);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text(title.toUpperCase(), x + 5, y + 8);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(val.toString(), x + 5, y + 18);
    };

    drawCard(15, 55, 42, 25, "Total Unidades", totalUnidades, [0, 51, 153]);
    drawCard(62, 55, 42, 25, "Qtd. Crítica", totalCritico, [200, 0, 0]);
    drawCard(109, 55, 42, 25, "Qtd. Manutenção", totalManutencao, [255, 150, 0]);
    drawCard(156, 55, 42, 25, "Qtd. Operacional", totalOperacional, [0, 150, 0]);

    // --- TABELA: RESUMO POR CATEGORIA ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO POR CATEGORIA", 15, 95);

    const categoriesSum = {};
    reportData.forEach(i => {
      categoriesSum[i.category] = (categoriesSum[i.category] || 0) + Number(i.quantity);
    });
    const categoryRows = Object.keys(categoriesSum).map(cat => [cat, categoriesSum[cat]]);

    autoTable(doc, {
      startY: 100,
      head: [['Categoria', 'Soma das Unidades']],
      body: categoryRows,
      headStyles: { fillColor: [60, 60, 60] },
      styles: { fontSize: 9 }
    });

    // --- TABELA: LISTAGEM DETALHADA ---
    doc.setFontSize(12);
    doc.text(`LISTAGEM DETALHADA - ${targetLab}`, 15, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Ativo', 'Categoria', 'Laboratório', 'Qtd', 'Status']],
        body: reportData.map(i => [i.name, i.category, i.lab, i.quantity, i.status]),
        headStyles: { fillColor: [0, 51, 153] },
        styles: { fontSize: 8 },
        columnStyles: { 3: { halign: 'center' } }
    });

    // --- ASSINATURA ---
    const finalY = doc.lastAutoTable.finalY + 35;
    const signatureY = finalY > 270 ? 40 : finalY;
    if (finalY > 270) doc.addPage();
    
    doc.setDrawColor(0, 0, 0);
    doc.line(60, signatureY, 150, signatureY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Responsável Técnico / Instrutor", 105, signatureY + 8, { align: "center" });

    doc.save(`Relatorio_${targetLab}_${dateStr}.pdf`);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const data = { ...itemForm, name: capitalize(itemForm.name) };
    if (editingItem) await updateDoc(doc(db, "items", editingItem.id), data);
    else await addDoc(collection(db, "items"), data);
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const addConfig = async (type, name) => {
    if (!name.trim()) return;
    await addDoc(collection(db, type), { name: capitalize(name.trim()) });
  };

  const executeDeleteConfig = async () => {
    const { type, name, id } = confirmDelete;
    if (items.some(item => type === 'labs' ? item.lab === name : item.category === name)) {
      alert(`O(A) ${name} possui itens vinculados.`);
      return;
    }
    await deleteDoc(doc(db, type, id));
    setConfirmDelete({ open: false, type: '', name: '', id: '' });
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLab = filterLab === 'Todos' || item.lab === filterLab;
      return matchesSearch && matchesLab;
    });
  }, [items, searchQuery, filterLab]);

  // Estatísticas Reais para o Dashboard (Soma de quantidades)
  const stats = useMemo(() => ({
    total: items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    lowStock: items.filter(i => i.quantity <= i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    maintenance: items.filter(i => i.status === 'Manutenção').reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    ok: items.filter(i => i.status === 'Operacional' && i.quantity > i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  }), [items]);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 selection:bg-blue-100 font-sans">
      
      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 h-screen ${isSidebarOpen ? 'w-80' : 'w-24'} bg-blue-900 text-white transition-all flex flex-col shadow-2xl shrink-0 pt-2`}>
        <div className="p-6 pb-8 flex flex-col items-start border-b border-blue-800/50 shrink-0">
          <div className="flex items-center gap-4 w-full justify-between mb-4">
            <div className="bg-transparent rounded-xl shrink-0 w-32 h-16 flex items-center justify-start overflow-hidden">
              <img src={`${process.env.PUBLIC_URL}/logo_senai.png`} alt="SENAI" className="w-full h-full object-contain object-left scale-[1.8] origin-left" />
            </div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-blue-800 rounded-lg shrink-0"><X size={20} /></button>
          </div>
          {isSidebarOpen && (
            <div className="mt-6 space-y-1">
              <span className="font-black text-3xl tracking-tighter uppercase leading-none block">Controle Lab's</span>
              <span className="text-[11px] text-blue-400 font-bold uppercase tracking-[0.3em] block">SENAI Macapá</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-5 space-y-2 mt-4 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={24}/>} label="Painel Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} compact={!isSidebarOpen} />
          <NavItem icon={<Package size={24}/>} label="Inventário" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} compact={!isSidebarOpen} />
          <NavItem icon={<SettingsIcon size={24}/>} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} compact={!isSidebarOpen} />
        </nav>

        <div className="p-5 border-t border-blue-800/50 shrink-0 mb-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3.5 rounded-2xl hover:bg-blue-800 text-blue-300 hidden md:flex transition-colors">
             {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(false)}><Menu size={20} /></button>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">SENAI <span className="text-blue-600">Controle Lab's</span></h2>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
            <div className="relative group w-full max-w-xs">
              <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="text" placeholder="Buscar ativo..." className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shrink-0 shadow-sm cursor-pointer hover:bg-blue-200 transition-colors"><User size={20} /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10">
          {activeTab === 'dashboard' && <Dashboard stats={stats} items={items} onExport={() => exportToPDF('Todos')} />}
          
          {activeTab === 'inventory' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border shadow-sm w-full md:w-auto">
                  <Filter size={16} className="text-slate-400" />
                  <select className="bg-transparent border-none text-sm font-bold focus:ring-0 w-full cursor-pointer" value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
                    <option value="Todos">Todos os Laboratórios</option>
                    {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => exportToPDF(filterLab)} className="flex-1 md:flex-none bg-slate-800 text-white px-6 py-4 rounded-[1.2rem] font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest"><Download size={18} /> PDF {filterLab !== 'Todos' ? 'Filtrado' : ''}</button>
                  <button onClick={() => { setEditingItem(null); setItemForm({ name: '', category: categories[0]?.name || '', lab: labs[0]?.name || '', quantity: 0, minQuantity: 0, status: 'Operacional' }); setIsItemModalOpen(true); }} className="flex-1 md:flex-none bg-blue-700 text-white px-8 py-4 rounded-[1.2rem] font-black flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-xl active:scale-95 uppercase tracking-widest"><Plus size={22} /> NOVO ATIVO</button>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
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
                          <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors text-sm">
                            <td className="px-8 py-6 font-bold text-slate-900">{item.name}<div className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{item.category}</div></td>
                            <td className="px-8 py-6 text-slate-600 font-medium">{item.lab}</td>
                            <td className="px-8 py-6 text-center">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${isLow ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                <span className="text-lg font-black">{item.quantity}</span><span className="text-slate-300">/</span><span className="font-bold opacity-60">{item.minQuantity}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center font-black text-[10px] uppercase tracking-widest">
                               <span className={item.status === 'Manutenção' ? 'text-yellow-600' : 'text-slate-400'}>{item.status}</span>
                            </td>
                            <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItem(item); setItemForm(item); setIsItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl mr-2 transition-all"><Edit3 size={18}/></button>
                              <button onClick={() => deleteDoc(doc(db, "items", item.id))} className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={18}/></button>
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
                <ConfigSection title="Laboratórios" icon={<Building2 />} onAdd={(val) => addConfig("labs", val)} onDelete={(name, id) => setConfirmDelete({ open: true, type: 'labs', name, id })} list={labs} />
                <ConfigSection title="Categorias de Itens" icon={<Tags />} onAdd={(val) => addConfig("categories", val)} onDelete={(name, id) => setConfirmDelete({ open: true, type: 'categories', name, id })} list={categories} color="purple" />
             </div>
          )}
        </div>
      </main>

      {confirmDelete.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 mb-8 font-medium">Tem certeza que deseja remover <span className="text-red-600 font-bold">"{confirmDelete.name}"</span>?</p>
              <div className="flex flex-col gap-3">
                <button onClick={executeDeleteConfig} className="w-full py-4 bg-red-600 text-white rounded-[1.2rem] font-black uppercase tracking-widest transition-all">Sim, excluir</button>
                <button onClick={() => setConfirmDelete({ open: false, type: '', name: '', id: '' })} className="w-full py-4 bg-slate-100 text-slate-500 rounded-[1.2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
              <div><h3 className="text-2xl font-black uppercase">Ativo</h3><p className="text-blue-300 text-[10px] font-black uppercase mt-1">Gestão Controle Lab's</p></div>
              <button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-6">
              <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none font-bold focus:ring-2 focus:ring-blue-500" value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} placeholder="Ex: Osciloscópio Digital"/>
              <div className="grid grid-cols-2 gap-4">
                <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none font-bold" value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})}>
                  <option value="">Categoria...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none font-bold" value={itemForm.status} onChange={(e) => setItemForm({...itemForm, status: e.target.value})}>
                  <option>Operacional</option>
                  <option>Manutenção</option>
                  <option>Crítico</option>
                </select>
              </div>
              <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 outline-none font-bold" value={itemForm.lab} onChange={(e) => setItemForm({...itemForm, lab: e.target.value})}>
                <option value="">Laboratório...</option>
                {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
              <div className="bg-blue-50/50 p-6 rounded-[2rem] grid grid-cols-2 gap-6 border border-blue-100">
                <div><label className="text-[10px] font-black text-blue-900 uppercase mb-2 block">Qtd. Atual</label><input type="number" className="w-full rounded-2xl px-4 py-3 font-black text-center" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}/></div>
                <div><label className="text-[10px] font-black text-red-700 uppercase mb-2 block">Qtd. Mínima</label><input type="number" className="w-full rounded-2xl px-4 py-3 font-black text-center" value={itemForm.minQuantity} onChange={(e) => setItemForm({...itemForm, minQuantity: parseInt(e.target.value) || 0})}/></div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-900 text-white font-black uppercase rounded-2xl shadow-xl active:scale-95 transition-all">Salvar Ativo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, compact }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span> {!compact && <span className="font-bold text-sm uppercase tracking-wide whitespace-nowrap">{label}</span>}
  </button>
);

const ConfigSection = ({ title, icon, onAdd, onDelete, list, color="blue" }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => { if(val.trim()){ onAdd(val); setVal(''); } };
  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-4 mb-8 font-black text-2xl text-slate-800">
        <div className={`p-3 rounded-2xl ${color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{icon}</div> {title}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold" placeholder={`Nome...`} value={val} onChange={(e) => setVal(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdd()}/>
        <button onClick={handleAdd} className={`px-8 py-4 sm:py-0 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap ${color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-700 hover:bg-blue-800'}`}>CADASTRAR</button>
      </div>
      <div className="flex flex-wrap gap-4">
        {list.map((item) => (
          <div key={item.id} className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border-2 border-slate-100 hover:border-red-200 transition-all group shadow-sm">
            <span className="font-bold text-slate-700">{item.name}</span>
            <button onClick={() => onDelete(item.name, item.id)} className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ stats, items, onExport }) => (
  <div className="space-y-10 max-w-7xl mx-auto">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-2 gap-4">
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Status Operacional</h3>
        <button onClick={onExport} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest"><Download size={18} /> Relatório Geral</button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
      <StatCard title="Total Unidades" value={stats.total} icon={<Package size={26}/>} color="blue" />
      <StatCard title="Qtd. Crítica" value={stats.lowStock} icon={<AlertTriangle size={26}/>} color="red" />
      <StatCard title="Manutenção" value={stats.maintenance} icon={<Wrench size={26}/>} color="yellow" />
      <StatCard title="Operacionais" value={stats.ok} icon={<CheckCircle2 size={26}/>} color="green" />
    </div>
    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-xl relative overflow-hidden transition-all hover:shadow-2xl">
      <h3 className="font-black text-2xl mb-8 text-slate-800 flex items-center gap-4 uppercase tracking-tighter"><AlertCircle size={30} className="text-red-600" /> Reposição Urgente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter(i => i.quantity <= i.minQuantity).map(item => (
          <div key={item.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white flex flex-col justify-between transition-all hover:scale-[1.03] shadow-sm hover:shadow-lg">
            <div className="mb-4"><p className="font-black text-slate-900 text-lg mb-1">{item.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.lab}</p></div>
            <div className="flex items-end justify-between border-t border-slate-200 pt-4">
              <div><span className="text-3xl font-black text-red-600">{item.quantity}</span><span className="text-slate-400 text-xs font-bold block">No estoque</span></div>
              <div className="text-right"><span className="text-xl font-black text-slate-300">/ {item.minQuantity}</span><span className="text-slate-400 text-xs font-bold block">Mínimo</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, color }) => {
  const styles = { blue: 'bg-blue-50 text-blue-600 border-blue-100', red: 'bg-red-50 text-red-600 border-red-100', yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100', green: 'bg-green-50 text-green-700 border-green-100' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-xl hover:translate-y-[-4px] transition-all group cursor-default">
      <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p><p className="text-4xl font-black text-slate-800">{value}</p></div>
      <div className={`p-4 rounded-[1.2rem] border transition-all group-hover:scale-110 shadow-sm ${styles[color]}`}>{icon}</div>
    </div>
  );
};

export default App;