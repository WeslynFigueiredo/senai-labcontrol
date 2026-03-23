import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { 
  LayoutDashboard, Package, Search, Plus, Wrench, CheckCircle2, Filter, Trash2, Edit3, 
  Menu, X, Settings as SettingsIcon, AlertTriangle, Building2, Tags, AlertCircle, 
  Download, Sun, Moon, Type, Contrast 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função Capitalize Melhorada
const capitalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [labs, setLabs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLab, setFilterLab] = useState('Todos');

  // ACESSIBILIDADE
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  // Modais e Estados de Exclusão
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', name: '', id: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category: '', lab: '', quantity: 0, minQuantity: 0, status: 'Operacional' });

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "items"), (s) => setItems(s.docs.map(d => ({ ...d.data(), id: d.id }))));
    const unsubLabs = onSnapshot(collection(db, "labs"), (s) => setLabs(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.name.localeCompare(b.name))));
    const unsubCats = onSnapshot(collection(db, "categories"), (s) => setCategories(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => a.name.localeCompare(b.name))));
    return () => { unsubItems(); unsubLabs(); unsubCats(); };
  }, []);

  // --- LOGICA DE CADASTRO COM REGRAS ESPECIFICAS ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    const data = { ...itemForm, name: capitalize(itemForm.name), quantity: Number(itemForm.quantity), minQuantity: Number(itemForm.minQuantity) };
    if (editingItem) await updateDoc(doc(db, "items", editingItem.id), data);
    else await addDoc(collection(db, "items"), data);
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const addConfig = async (type, name) => {
    let finalName = capitalize(name.trim());
    
    // Regra do Laboratório: Adiciona prefixo se não tiver
    if (type === 'labs' && !finalName.toLowerCase().startsWith('laboratório de')) {
      finalName = `Laboratório De ${finalName}`;
    }

    // Validação de Duplicados
    const list = type === 'labs' ? labs : categories;
    if (list.some(i => i.name.toLowerCase() === finalName.toLowerCase())) {
      alert("Este nome já está cadastrado!");
      return;
    }

    await addDoc(collection(db, type), { name: finalName });
  };

  const executeDelete = async () => {
    const { type, id, name } = confirmDelete;
    try {
      if (type === 'items') {
        await deleteDoc(doc(db, "items", id));
      } else {
        // Verifica se há itens vinculados antes de deletar lab ou categoria
        const hasLinks = items.some(item => type === 'labs' ? item.lab === name : item.category === name);
        if (hasLinks) {
          alert("Não é possível excluir: existem itens vinculados a este registro.");
          return;
        }
        await deleteDoc(doc(db, type, id));
      }
    } catch (e) { console.error(e); }
    setConfirmDelete({ open: false, type: '', name: '', id: '' });
  };

  const exportToPDF = (targetLab = 'Todos') => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();
    let reportData = targetLab === 'Todos' ? [...items] : items.filter(i => i.lab === targetLab);

    reportData.sort((a, b) => {
      const cmp = a.lab.localeCompare(b.lab);
      return cmp !== 0 ? cmp : a.category.localeCompare(b.category);
    });

    const totalUnidades = reportData.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const img = new Image(); img.src = 'logo_senai.png'; 

    const render = () => {
        doc.setFillColor(0, 51, 153); doc.rect(0, 0, 210, 45, 'F');
        try { doc.addImage(img, 'PNG', 85, 5, 40, 15); } catch(e) {}
        doc.setTextColor(255); doc.setFontSize(14); doc.text("CONTROLE LAB'S", 105, 30, { align: "center" });
        doc.setFontSize(8); doc.text(`EMISSÃO: ${dateStr} às ${timeStr}`, 195, 15, { align: "right" });
        doc.text("SENAI MACAPÁ - DR-AP", 195, 20, { align: "right" });

        const drawCard = (x, y, w, h, title, val, color) => {
            doc.setFillColor(255, 255, 255); doc.setDrawColor(200, 200, 200); doc.roundedRect(x, y, w, h, 3, 3, 'FD');
            doc.setFillColor(color[0], color[1], color[2]); doc.rect(x + 2, y + 5, 1.5, h - 10, 'F');
            doc.setTextColor(100, 100, 100); doc.setFontSize(7); doc.text(title.toUpperCase(), x + 6, y + 10);
            doc.setTextColor(0, 0, 0); doc.setFontSize(16); doc.text(val.toString(), x + 6, y + 20);
        };

        const tCrit = reportData.filter(i => i.quantity <= i.minQuantity).reduce((acc, curr) => acc + Number(curr.quantity), 0);
        drawCard(15, 55, 42, 28, "Total Unidades", totalUnidades, [0, 51, 153]);
        drawCard(62, 55, 42, 28, "Estoque Crítico", tCrit, [200, 0, 0]);

        autoTable(doc, {
            startY: 95,
            head: [['Ativo', 'Categoria', 'Local', 'Qtd', 'Status']],
            body: reportData.map(i => [i.name, i.category, i.lab, i.quantity, i.status]),
            headStyles: { fillColor: [0, 51, 153] }
        });

        const sigY = doc.lastAutoTable.finalY + 30;
        doc.line(60, sigY, 150, sigY);
        doc.text("Responsável Técnico / Instrutor", 105, sigY + 8, { align: "center" });
        doc.save(`Relatorio_${targetLab}.pdf`);
    };
    img.onload = render; img.onerror = render;
  };

  const stats = useMemo(() => ({
    total: items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    lowStock: items.filter(i => i.quantity <= i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    maintenance: items.filter(i => i.status === 'Manutenção').reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0),
    ok: items.filter(i => i.status === 'Operacional' && i.quantity > i.minQuantity).reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  }), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) && (filterLab === 'Todos' || item.lab === filterLab));
  }, [items, searchQuery, filterLab]);

  const pageNames = { dashboard: 'Painel Geral', inventory: 'Inventário de Ativos', settings: 'Configurações' };

  return (
    <div className={`h-screen flex font-sans transition-all duration-300 overflow-hidden ${isHighContrast ? 'bg-black text-white' : isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`} style={{ fontSize: fontSize + 'px' }}>
      
      {/* SIDEBAR */}
      <aside className={`fixed md:relative z-[100] h-screen transition-all duration-300 flex flex-col shadow-2xl shrink-0 
        ${isHighContrast ? 'bg-black border-r-2 border-white' : isDarkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-blue-900 text-white'} 
        ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full md:translate-x-0 md:w-24'}`}>
        
        <div className={`p-6 border-b flex flex-col items-start gap-4 shrink-0 ${isHighContrast ? 'border-white' : 'border-white/10'}`}>
          <div className="w-full flex justify-between items-center">
             <div className="w-24 h-12 flex items-center justify-start overflow-hidden rounded-lg">
                <img src={`${process.env.PUBLIC_URL}/logo_senai.png`} alt="SENAI" className="w-full h-full object-contain" style={{ filter: (!isDarkMode && !isHighContrast) ? 'invert(1)' : 'invert(0)' }} />
             </div>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 border-2 border-current rounded-xl"><X size={24}/></button>
          </div>
          {isSidebarOpen && <h1 className="font-black uppercase mt-2 tracking-tighter" style={{ fontSize: '1.2em' }}>Controle Lab's</h1>}
        </div>

        <nav className="flex-1 p-5 space-y-2 mt-4 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={24}/>} label="Painel" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} compact={!isSidebarOpen} isHC={isHighContrast} isDark={isDarkMode} />
          <NavItem icon={<Package size={24}/>} label="Inventário" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} compact={!isSidebarOpen} isHC={isHighContrast} isDark={isDarkMode} />
          <NavItem icon={<SettingsIcon size={24}/>} label="Config" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} compact={!isSidebarOpen} isHC={isHighContrast} isDark={isDarkMode} />
        </nav>

        <div className="p-5 hidden md:block">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`w-full flex items-center justify-center p-3 rounded-2xl border-2 transition-all ${isHighContrast ? 'border-white text-white' : 'border-transparent bg-white/10 text-white hover:bg-white/20'}`}>
             {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER */}
        <header className={`h-20 border-b flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-30 backdrop-blur-md ${isHighContrast ? 'bg-black border-white' : isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="w-1/4 flex items-center">
            <button className={`p-2 rounded-lg md:hidden ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
          </div>

          <h2 className={`w-2/4 text-center font-black uppercase tracking-widest ${isHighContrast ? 'text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`} style={{ fontSize: '1.1em' }}>
            {pageNames[activeTab]}
          </h2>
          
          <div className="w-1/4 flex justify-end gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-2xl ${isHighContrast ? 'border-2 border-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-white'}`}><Moon size={18}/></button>
              <button onClick={() => setFontSize(f => f >= 24 ? 16 : f + 4)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-white'}`}><Type size={18}/></button>
              <button onClick={() => setIsHighContrast(!isHighContrast)} className={`p-2 rounded-xl transition-all ${isHighContrast ? 'bg-yellow-400 text-black' : (isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-white')}`}><Contrast size={18}/></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 pb-20">
          {activeTab === 'dashboard' && <Dashboard stats={stats} items={items} isHC={isHighContrast} isDark={isDarkMode} onExport={() => exportToPDF('Todos')} />}
          
          {activeTab === 'inventory' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar ativo..." className={`w-full pl-10 pr-4 py-2 border-2 rounded-xl outline-none transition-all ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-500')}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <select className={`px-4 py-2 border-2 rounded-xl outline-none font-bold ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200')}`} value={filterLab} onChange={(e) => setFilterLab(e.target.value)}>
                    <option value="Todos">Todos Lab's</option>
                    {labs.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportToPDF(filterLab)} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 ${isHighContrast ? 'bg-white text-black border-white' : 'bg-slate-800 text-white border-transparent'}`}><Download size={18}/> PDF</button>
                  <button onClick={() => {setEditingItem(null); setItemForm({name:'', category:categories[0]?.name||'', lab:labs[0]?.name||'', quantity:0, minQuantity:0, status:'Operacional'}); setIsItemModalOpen(true);}} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 border-2 ${isHighContrast ? 'bg-yellow-400 text-black border-white' : 'bg-blue-700 text-white border-transparent'}`}><Plus size={18}/> NOVO</button>
                </div>
              </div>
              
              <div className={`rounded-3xl border-2 overflow-hidden shadow-xl transition-all ${isHighContrast ? 'border-white bg-black' : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className={isHighContrast ? 'bg-white text-black' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400')}>
                      <tr><th className="p-5 uppercase font-black text-xs">Item</th><th className="p-5 uppercase font-black text-xs text-center">Volume Físico</th><th className="p-5 uppercase font-black text-xs text-right">Ações</th></tr>
                    </thead>
                    <tbody className={`divide-y-2 ${isHighContrast ? 'divide-white' : (isDarkMode ? 'divide-slate-800' : 'divide-slate-100')}`}>
                      {filteredItems.map(item => (
                        <tr key={item.id} className={`${isHighContrast ? 'hover:bg-yellow-900' : (isDarkMode ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-blue-50/20 text-slate-700')}`}>
                          <td className="p-5 font-bold">
                            <div className={isDarkMode && !isHighContrast ? 'text-white' : ''}>{item.name}</div>
                            <span className={`block text-[0.7em] uppercase font-black ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`}>{item.category} • {item.lab}</span>
                          </td>
                          <td className="p-5 text-center font-black">
                            {item.quantity} / {item.minQuantity}
                            <div className={`text-[9px] uppercase mt-1 ${item.status === 'Manutenção' ? 'text-orange-500' : 'text-green-500'}`}>{item.status}</div>
                          </td>
                          <td className="p-5 text-right">
                             <button onClick={()=>{setItemForm(item); setEditingItem(item); setIsItemModalOpen(true);}} className="p-2 text-blue-500 hover:scale-110 transition-transform"><Edit3 size={18}/></button>
                             <button onClick={() => setConfirmDelete({open: true, type: 'items', id: item.id, name: item.name})} className="p-2 text-red-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-4xl mx-auto space-y-10">
                <ConfigSection title="Laboratórios" icon={<Building2 />} onAdd={(v)=>addConfig("labs", v)} onDelete={(n,id)=>setConfirmDelete({open:true, type:'labs', name:n, id})} list={labs} isHC={isHighContrast} isDark={isDarkMode} />
                <ConfigSection title="Categorias" icon={<Tags />} onAdd={(v)=>addConfig("categories", v)} onDelete={(n,id)=>setConfirmDelete({open:true, type:'categories', name:n, id})} list={categories} isHC={isHighContrast} isDark={isDarkMode} />
             </div>
          )}
        </div>
      </main>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDelete.open && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
           <div className={`max-w-sm w-full p-8 rounded-[2.5rem] text-center border-2 transition-all ${isHighContrast ? 'bg-black border-white' : (isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-transparent shadow-2xl')}`}>
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} className="text-red-600"/>
              </div>
              <h3 className={`text-xl font-black mb-2 uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Confirmar Exclusão?</h3>
              <p className={`mb-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Você está prestes a remover <strong>"{confirmDelete.name}"</strong>. Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-3">
                <button onClick={executeDelete} className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Sim, Excluir</button>
                <button onClick={()=>setConfirmDelete({open:false, type:'', name:'', id:''})} className={`p-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ITEM CADASTRO/EDIÇÃO */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden transition-all ${isHighContrast ? 'bg-black border-2 border-white' : isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'}`}>
            <div className="bg-blue-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest">Gestão de Ativo</h3>
              <button onClick={()=>setIsItemModalOpen(false)}><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <input required className={`w-full p-4 border-2 rounded-xl font-bold outline-none ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.name} onChange={e=>setItemForm({...itemForm, name:e.target.value})} placeholder="Nome do Ativo"/>
              <div className="grid grid-cols-2 gap-4">
                <select className={`p-4 border-2 rounded-xl font-bold ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.category} onChange={e=>setItemForm({...itemForm, category:e.target.value})}>{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
                <select className={`p-4 border-2 rounded-xl font-bold ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.lab} onChange={e=>setItemForm({...itemForm, lab:e.target.value})}>{labs.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}</select>
              </div>
              <select className={`w-full p-4 border-2 rounded-xl font-bold ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.status} onChange={e=>setItemForm({...itemForm, status:e.target.value})}>
                  <option value="Operacional">Operacional</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Reserva">Reserva</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" required className={`p-4 border-2 rounded-xl font-black ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.quantity} onChange={e=>setItemForm({...itemForm, quantity:e.target.value})} placeholder="Qtd Atual"/>
                <input type="number" required className={`p-4 border-2 rounded-xl font-black ${isHighContrast ? 'bg-black border-white text-white' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50')}`} value={itemForm.minQuantity} onChange={e=>setItemForm({...itemForm, minQuantity:e.target.value})} placeholder="Qtd Mínima"/>
              </div>
              <button type="submit" className={`w-full p-5 rounded-2xl font-black transition-all ${isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-900 text-white hover:bg-blue-800'}`}>SALVAR DADOS</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Componentes Auxiliares
const NavItem = ({ icon, label, active, onClick, compact, isHC, isDark }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 
    ${active 
      ? (isHC ? 'bg-yellow-400 text-black border-white' : (isDark ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-700 text-white border-transparent shadow-lg')) 
      : (isHC ? 'text-white border-white hover:bg-yellow-900' : (isDark ? 'text-slate-400 border-transparent hover:bg-white/5' : 'text-blue-200 border-transparent hover:bg-white/10'))}`}>
    <span className="shrink-0">{icon}</span> {!compact && <span className="font-black text-[0.85em] uppercase">{label}</span>}
  </button>
);

const ConfigSection = ({ title, icon, onAdd, onDelete, list, isHC, isDark }) => {
  const [val, setVal] = useState('');
  return (
    <div className={`p-8 rounded-[3rem] border-2 shadow-xl transition-all ${isHC ? 'bg-black border-white text-white' : (isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200')}`}>
      <div className="flex items-center gap-4 mb-8 font-black text-[1.5em]"><div className={`p-3 rounded-xl ${isHC ? 'bg-yellow-400 text-black' : 'bg-blue-100 text-blue-600'}`}>{icon}</div> {title}</div>
      <div className="flex gap-3 mb-8">
        <input className={`flex-1 p-4 border-2 rounded-2xl outline-none font-bold transition-all ${isHC ? 'bg-black border-white text-white' : (isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 focus:border-blue-500')}`} placeholder="Nome..." value={val} onChange={e=>setVal(e.target.value)}/>
        <button onClick={()=>{if(val.trim()){onAdd(val);setVal('');}}} className={`px-8 rounded-2xl font-black border-2 transition-all ${isHC ? 'bg-yellow-400 text-black border-white' : 'bg-blue-700 text-white border-transparent'}`}>ADD</button>
      </div>
      <div className="flex flex-wrap gap-3">
        {list.map(i => (
          <div key={i.id} className={`flex items-center gap-4 px-5 py-3 rounded-2xl border-2 transition-all ${isHC ? 'border-white hover:border-yellow-400' : (isDark ? 'border-slate-800 bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700')}`}>
            <span className="font-black text-[0.8em]">{i.name}</span>
            <button onClick={()=>onDelete(i.name, i.id)} className="text-red-500 hover:scale-125 transition-transform"><X size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ stats, items, isHC, isDark, onExport }) => (
  <div className="space-y-10 max-w-7xl mx-auto">
    <div className="flex justify-between items-center px-2">
        <h3 className={`font-black uppercase tracking-tighter ${isDark && !isHC ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: '1.5em' }}>Resumo Geral</h3>
        <button onClick={onExport} className={`p-4 rounded-2xl border-2 shadow-lg transition-all ${isHC ? 'bg-yellow-400 text-black border-white' : 'bg-slate-900 text-white border-transparent hover:bg-black'}`}><Download size={24}/></button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Unidades Totais" value={stats.total} icon={<Package size={26}/>} isHC={isHC} isDark={isDark} />
      <StatCard title="Estoque Crítico" value={stats.lowStock} icon={<AlertTriangle size={26}/>} isHC={isHC} isDark={isDark} />
      <StatCard title="Manutenção" value={stats.maintenance} icon={<Wrench size={26}/>} isHC={isHC} isDark={isDark} />
      <StatCard title="Operacionais" value={stats.ok} icon={<CheckCircle2 size={26}/>} isHC={isHC} isDark={isDark} />
    </div>
    <div className={`p-8 md:p-12 rounded-[3.5rem] border-2 shadow-2xl transition-all ${isHC ? 'bg-black border-white' : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}>
      <h3 className={`font-black mb-8 uppercase flex items-center gap-4 ${isHC ? 'text-yellow-400' : 'text-red-500'}`} style={{ fontSize: '1.5em' }}><AlertCircle size={32}/> Reposição Urgente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter(i => i.quantity <= i.minQuantity).map(item => (
          <div key={item.id} className={`p-6 rounded-[2.5rem] border-2 flex flex-col justify-between transition-all hover:scale-[1.03] ${isHC ? 'border-white bg-black' : (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 shadow-sm border-white')}`}>
            <div>
              <div className={`font-black text-[1.1em] ${isDark && !isHC ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
              <div className={`text-[0.6em] uppercase font-black tracking-widest ${isHC ? 'text-yellow-400' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{item.lab}</div>
            </div>
            <div className={`mt-4 pt-4 border-t-2 flex justify-between ${isHC ? 'border-white' : 'border-current opacity-20'}`}>
              <span className={`text-2xl font-black ${isHC ? 'text-yellow-400' : 'text-red-500'}`}>{item.quantity}</span>
              <span className={`text-[0.6em] font-black uppercase self-end ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mín: {item.minQuantity}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, isHC, isDark }) => (
  <div className={`p-8 rounded-[3rem] border-2 shadow-md flex items-start justify-between transition-all hover:shadow-xl ${isHC ? 'bg-black border-white' : (isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200')}`}>
    <div><p className={`text-[0.6em] font-black uppercase mb-3 ${isHC ? 'text-yellow-400' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{title}</p><p className={`font-black ${isDark && !isHC ? 'text-white' : ''}`} style={{ fontSize: '2.5em' }}>{value}</p></div>
    <div className={`p-5 rounded-[1.5rem] transition-all ${isHC ? 'bg-white text-black' : (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600')}`}>{icon}</div>
  </div>
);

export default App;