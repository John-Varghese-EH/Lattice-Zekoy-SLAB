import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Box, Search, Sun, Moon, Network, Settings, Zap, Send, CornerDownRight, MessageSquare, PlusCircle, Brain, Terminal, Bot, GitBranch } from 'lucide-react';
import { Canvas } from './Canvas';
import { AIMind } from './AIMind';
import { StorageManager } from '../background/storage_manager';
import { exportDossier } from './DossierExporter';
import { SettingsPanel } from '../sidepanel/SettingsPanel';
import { NodeDrawer } from './NodeDrawer';
import { initializeTheme, toggleTheme } from '../lib/theme';
import { Starfield, GridBackground } from '../components/BackgroundEffects';
import { AiAvatar, AgentLogo } from '../components/AiAvatar';
import browser from 'webextension-polyfill';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('grid');
  const [theme, setTheme] = useState('system');
  const [view, setView] = useState('chat'); // 'chat' | 'stats' | 'memory'
  const [canvasView, setCanvasView] = useState('mesh'); // 'mesh' | 'aimind'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const handleNodeDragStop = async (node) => {
    try {
      const db = await StorageManager.getDB();
      const rawNode = await db.get('mindMap', node.id);
      if (rawNode) {
        rawNode.position = node.position;
        await db.put('mindMap', rawNode);
      }
    } catch (e) {
      console.error("Error saving node position:", e);
    }
  };

  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const endRef = useRef(null);

  const generateEdges = (nodesList) => {
    const generatedEdges = [];
    for (let i = 0; i < nodesList.length; i++) {
      for (let j = i + 1; j < nodesList.length; j++) {
        const n1 = nodesList[i];
        const n2 = nodesList[j];
        let score = 0;
        
        try {
          const u1 = new URL(n1.data.url);
          const u2 = new URL(n2.data.url);
          if (u1.hostname === u2.hostname) score += 2;
        } catch(e) {}

        const k1 = n1.data.keywords || [];
        const k2 = n2.data.keywords || [];
        const sharedKeywords = k1.filter(k => k2.includes(k));
        if (sharedKeywords.length >= 2) score += 1;

        if (n1.parentNodeId === n2.id || n2.parentNodeId === n1.id) {
          score += 10;
        }

        if (score > 0) {
          generatedEdges.push({
            id: `edge-${n1.id}-${n2.id}`,
            source: n1.id,
            target: n2.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'var(--accent)', strokeWidth: Math.min(score, 3) }
          });
        }
      }
    }
    return generatedEdges;
  };

  const loadGraph = async () => {
    setLoading(true);
    try {
      const storedNodes = await StorageManager.getMindMapNodes();
      const mappedNodes = storedNodes.map(n => ({
        id: n.id,
        type: 'custom',
        parentNodeId: n.parentNodeId,
        position: n.position || { x: 0, y: 0 },
        data: {
          ...n.data,
          type: n.type || 'tab',
          nodeNumber: n.nodeNumber
        }
      }));
      setNodes(mappedNodes);
      
      const generated = generateEdges(mappedNodes);
      const customEdges = await StorageManager.getMindMapEdges();
      
      // Merge generated edges and custom edges (custom override if same id)
      const edgeMap = new Map();
      generated.forEach(e => edgeMap.set(e.id, e));
      customEdges.forEach(e => edgeMap.set(e.id, { ...e, type: 'smoothstep', animated: true, style: { stroke: 'var(--accent)', strokeWidth: 3 } }));
      
      setEdges(Array.from(edgeMap.values()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdgeConnect = async (edge) => {
    try {
      await StorageManager.saveMindMapEdge(edge);
      setEdges(prev => {
        const edgeMap = new Map();
        prev.forEach(e => edgeMap.set(e.id, e));
        edgeMap.set(edge.id, { ...edge, type: 'smoothstep', animated: true, style: { stroke: 'var(--accent)', strokeWidth: 3 } });
        return Array.from(edgeMap.values());
      });
    } catch (e) {
      console.error("Failed to save custom edge", e);
    }
  };

  useEffect(() => {
    setTheme(initializeTheme());
    loadGraph();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  const handleThemeToggle = () => {
    setTheme(toggleTheme());
  };

  const handleExport = async () => {
    await exportDossier(nodes, edges);
  };

  const handleLayoutCycle = () => {
    setLayoutMode(m => {
      if (m === 'grid') return 'layered';
      if (m === 'layered') return 'radial';
      return 'grid';
    });
  };

  const handleImportTabs = async () => {
    try {
      await browser.runtime.sendMessage({ type: 'IMPORT_TABS' });
      // Reload graph after a short delay to allow nodes to be saved
      setTimeout(loadGraph, 500);
    } catch (e) {
      console.error("Failed to import tabs", e);
    }
  };

  const handleAIMindToggle = () => {
    setCanvasView(prev => {
      const next = prev === 'mesh' ? 'aimind' : 'mesh';
      if (next === 'aimind') {
        setView('memory');
      } else if (view === 'memory') {
        setView('chat');
      }
      return next;
    });
  };

  const executePlan = async (planMsgId, planSteps) => {
    for (let i = 0; i < planSteps.length; i++) {
      const step = planSteps[i];
      setMessages(prev => prev.map(m => m.id === planMsgId ? { ...m, currentStepIndex: i } : m));
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulated thinking time

      let execRes;
      if (step.action && step.action.type) {
        if (step.action.type === 'create_node') {
          execRes = await browser.runtime.sendMessage({
            type: 'AUTONODE_EXEC_STEP',
            action: { type: 'CREATE_NODE', ...step.action }
          });
          loadGraph(); // Refresh graph to see nodes
        } else if (step.action.type === 'chat') {
          // Just add a chat message from the assistant after
          setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'assistant', content: step.action.message || step.thought }]);
          execRes = { status: 'success' };
        } else {
          // webcmd, navigate, etc. We could send a generic agent action execution request if we had one.
          execRes = { status: 'success' }; // stub for other actions
        }
      }

      if (execRes && execRes.status === 'error') {
        setMessages(prev => prev.map(m => m.id === planMsgId ? { ...m, error: execRes.error, completed: true } : m));
        return; // Stop execution on error
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setMessages(prev => prev.map(m => m.id === planMsgId && !m.error ? { ...m, completed: true } : m));
  };

  const handleApprovePlan = (msgId, planSteps) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, approved: true } : m));
    executePlan(msgId, planSteps);
  };

  const handleSendChat = async () => {
    if (!input.trim() || isChatLoading) return;
    
    const text = input.trim();
    const newMessages = [...messages, { id: Date.now(), role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsChatLoading(true);

    try {
      const response = await browser.runtime.sendMessage({
        type: 'CHAT_COMPLETION',
        messages: newMessages.map(m => ({ role: m.role, content: m.content }))
      });

      setIsChatLoading(false); // Stop loading early so user can see plan and approve

      if (response && response.status === 'success' && response.data) {
        const payload = response.data;
        
        if (payload.plan && Array.isArray(payload.plan)) {
          // Check if any action requires approval (e.g. webcmd or anything that isn't just a chat response or internal node creation)
          const requiresApproval = payload.plan.some(step => step.action && !['chat', 'create_node'].includes(step.action.type));
          
          const planMsg = {
            id: Date.now() + 1,
            role: 'agent_plan',
            thought: payload.thought,
            plan: payload.plan,
            strategy: payload.strategy || 'AUTONOMOUS',
            currentStepIndex: -1,
            completed: false,
            requiresApproval,
            approved: !requiresApproval
          };
          
          setMessages(prev => [...prev, planMsg]);

          if (!requiresApproval) {
            executePlan(planMsg.id, payload.plan);
          }
            const step = payload.plan[i];
            setMessages(prev => prev.map(m => m.id === planMsg.id ? { ...m, currentStepIndex: i } : m));
        } else {
          // Fallback if not a valid JSON plan format
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: typeof response.data === 'string' ? response.data : JSON.stringify(response.data) }]);
        }
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Error: ${response?.error || 'Unknown error'}` }]);
      }
    } catch (e) {
      setIsChatLoading(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Extension Error: ${e.message}` }]);
    }
  };

  // Compute Stats
  const topDomains = React.useMemo(() => {
    const counts = {};
    nodes.forEach(n => {
      if (n.data.url) {
        try {
          const host = new URL(n.data.url).hostname.replace(/^www\./, '');
          counts[host] = (counts[host] || 0) + 1;
        } catch(e) {}
      }
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
  }, [nodes]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-ink overflow-hidden transition-colors font-sans relative">
      
      {/* Icon Rail */}
      <AnimatePresence>
        {!isFocusMode && (
          <motion.div 
            initial={{ opacity: 0, width: 0, scale: 0.9 }} 
            animate={{ opacity: 1, width: 'auto', scale: 1 }} 
            exit={{ opacity: 0, width: 0, scale: 0.9 }} 
            className="w-full md:w-14 h-14 md:h-full shrink-0 flex flex-row md:flex-col items-center justify-between md:justify-start px-4 md:px-0 py-0 md:py-4 bg-black/75 border-r border-white/5 z-20 relative origin-left"
          >
            <div className="p-1 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center overflow-hidden w-8 h-8 md:mb-6 shrink-0 shadow-[0_2px_10px_rgba(var(--accent-rgb),0.1)]">
              <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-row md:flex-col gap-3 flex-1 md:flex-none justify-center">
              <button onClick={() => { setView('chat'); setCanvasView('mesh'); }} className={`relative p-2.5 rounded-xl transition-all ${view === 'chat' && canvasView === 'mesh' ? 'bg-accent text-accent-ink shadow-md shadow-accent/30' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'}`} title="Agent Chat">
                <MessageSquare className="w-5 h-5" />
              </button>
              <button onClick={() => { setView('stats'); setCanvasView('mesh'); }} className={`relative p-2.5 rounded-xl transition-all ${view === 'stats' && canvasView === 'mesh' ? 'bg-accent text-accent-ink shadow-md shadow-accent/20' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'}`} title="Graph Stats">
                <Box className="w-5 h-5" />
              </button>
              
              <div className="hidden md:block h-px bg-line/80 w-6 mx-auto my-1" />
              <div className="md:hidden w-px bg-line/80 h-6 mx-1 my-auto" />
              
              <button onClick={handleAIMindToggle} className={`relative p-2.5 rounded-xl transition-all ${canvasView === 'aimind' ? 'bg-accent text-accent-ink shadow-md shadow-accent/30' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'}`} title="AI Mind">
                <Brain className="w-5 h-5" />
              </button>
              <button onClick={handleLayoutCycle} className="relative p-2.5 rounded-xl transition-all text-ink-muted hover:bg-surface-hover hover:text-ink" title="Cycle Layout">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-row md:flex-col gap-3 shrink-0 mt-auto">
              <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl text-ink-muted hover:bg-surface-hover hover:text-ink transition-all" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleThemeToggle} className="p-2.5 rounded-xl text-ink-muted hover:bg-surface-hover hover:text-ink transition-all" title="Toggle Theme">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel (Chat or Stats) */}
      <AnimatePresence>
        {!isFocusMode && (
          <motion.div 
            initial={{ opacity: 0, width: 0 }} 
            animate={{ opacity: 1, width: '300px' }} 
            exit={{ opacity: 0, width: 0 }} 
            className="hidden md:flex shrink-0 bg-black/75 border-r border-white/5 flex-col relative z-10 transition-all overflow-hidden origin-left"
          >
            <header className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-line/50 bg-transparent">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-md shadow-accent/20">
                  {view === 'chat' ? <Zap className="w-4 h-4 text-accent-ink" /> : view === 'stats' ? <Box className="w-4 h-4 text-accent-ink" /> : <Brain className="w-4 h-4 text-accent-ink" />}
                </div>
                <h1 className="font-semibold text-[15px] tracking-tight text-ink">
                  {view === 'chat' ? 'Lattice AI' : view === 'stats' ? 'Mesh Analytics' : 'Graph Memory'}
                </h1>
              </div>
            </header>

            {view === 'chat' ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5">
                  <AnimatePresence mode="popLayout">
                    {messages.length === 0 && !isChatLoading ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full items-center justify-center text-center py-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 relative bg-background border border-line shadow-sm text-accent">
                          <Bot size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2 text-ink tracking-tight">How can I help?</h2>
                        <p className="text-[14px] text-ink-muted max-w-[280px] mb-8 leading-relaxed">
                          I have full semantic context of your browsing mesh. Ask me anything.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                          {[
                            { text: "Summarize session", icon: <Box className="w-4 h-4 text-accent shrink-0" /> },
                            { text: "Find coding tabs", icon: <Search className="w-4 h-4 text-accent shrink-0" /> },
                            { text: "Extract actions", icon: <Zap className="w-4 h-4 text-accent shrink-0" /> },
                            { text: "Map my research", icon: <Network className="w-4 h-4 text-accent shrink-0" /> }
                          ].map((s, i) => (
                            <button 
                              key={i} 
                              onClick={() => setInput(s.text)} 
                              className="group relative flex flex-col items-start gap-2 p-3 sm:p-4 text-left text-[13px] text-ink-muted hover:text-ink squircle bg-background border border-line hover:border-accent/50 shadow-sm hover:shadow-md hover:shadow-accent/10 transition-all overflow-hidden w-full"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                              {s.icon}
                              <span className="font-medium break-words w-full">{s.text}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col gap-5 pb-4">
                        {messages.map((msg) => (
                          <motion.div layout key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'user' ? (
                              <div className="max-w-[85%] px-4 py-3 squircle rounded-tr-sm text-[14px] bg-accent text-accent-ink shadow-md shadow-accent/10 break-words">
                                {msg.content}
                              </div>
                            ) : msg.role === 'agent_plan' ? (
                              <div className="flex flex-col gap-3 max-w-[95%] w-full">
                                <div className="flex items-center gap-2 text-[12px] font-mono font-medium text-accent">
                                  <Terminal className="w-4 h-4 animate-pulse" />
                                  <span>[WebCMD] Active Execution</span>
                                  {msg.strategy && (
                                    <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] tracking-wider uppercase">
                                      STRATEGY: {msg.strategy}
                                    </span>
                                  )}
                                </div>
                                <div className="p-4 rounded-xl bg-[#0F111A]/90 backdrop-blur-md border border-[#1F2233] shadow-inner font-mono w-full overflow-hidden relative group transition-all hover:border-[#2A2E45]">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                                  <p className="text-[12px] text-gray-400 mb-4 whitespace-pre-wrap leading-relaxed">
                                    <span className="text-accent/80">$</span> {msg.thought}
                                  </p>
                                  <div className="flex flex-col gap-2.5">
                                    {msg.plan.map((step, i) => {
                                      const isPast = i < msg.currentStepIndex;
                                      const isCurrent = i === msg.currentStepIndex;
                                      return (
                                        <div key={i} className={`flex items-start gap-3 text-[12px] transition-all duration-300 ${isPast ? 'text-green-400/70' : isCurrent ? 'text-accent font-medium glow-text' : 'text-gray-600'}`}>
                                          <div className="shrink-0 font-bold mt-px w-4 text-center">
                                            {isPast ? "✓" : isCurrent ? ">" : "-"}
                                          </div>
                                          <div className="flex flex-col leading-tight">
                                            <span>{step.thought}</span>
                                            {step.action && step.action.type && (
                                              <span className="text-[10px] opacity-60 mt-0.5">[{step.action.type.toUpperCase()}] {step.action.intent || step.action.url || step.action.endpoint || step.action.selector || ''}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                      {msg.error && (
                                        <div className="mt-3 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-[12px] flex items-start gap-2">
                                          <span className="shrink-0 mt-0.5">⚠️</span>
                                          <span className="break-words">{msg.error}</span>
                                        </div>
                                      )}
                                      
                                      {msg.requiresApproval && !msg.approved && (
                                        <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-[#1F2233]">
                                          <div className="text-[11px] text-yellow-500 font-medium">⚠️ Action Requires Human Approval</div>
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => handleApprovePlan(msg.id, msg.plan)}
                                              className="px-4 py-1.5 bg-accent/20 hover:bg-accent text-accent hover:text-accent-ink rounded-lg text-[12px] transition-all font-medium border border-accent/40 hover:border-transparent shadow-sm"
                                            >
                                              Approve Execution
                                            </button>
                                            <button 
                                              onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, error: "Execution cancelled by user.", completed: true, approved: true } : m))}
                                              className="px-4 py-1.5 bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200 rounded-lg text-[12px] transition-all border border-transparent hover:border-white/10"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-3 items-start max-w-[90%]">
                                <div className="shrink-0 mt-0.5">
                                  <AiAvatar size={28} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="px-4 py-3 squircle rounded-tl-sm text-[14px] bg-surface/60 backdrop-blur-2xl border border-line text-ink shadow-sm whitespace-pre-wrap leading-relaxed hover:shadow-md transition-all">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                  </div>
                                  <div className="flex justify-start px-2">
                                    <button 
                                      onClick={() => {}}
                                      className="flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-accent transition-colors py-1"
                                      title="Branch to Graph Node"
                                    >
                                      <GitBranch className="w-3 h-3" />
                                      Branch to Node
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                        {isChatLoading && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
                            <div className="shrink-0 mt-0.5">
                              <AiAvatar size={28} />
                            </div>
                            <div className="w-24 h-11 squircle rounded-tl-sm skeleton border border-line" />
                          </motion.div>
                        )}
                        <div ref={endRef} />
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="shrink-0 p-4 sm:p-5 bg-transparent border-t border-line/50">
                  <div className="flex flex-col bg-surface/80 backdrop-blur-3xl squircle border transition-all shadow-sm border-line focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20 relative group">
                    <textarea 
                      value={input} 
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                      placeholder="Tell the agent what to do or /cmd..."
                      className="w-full px-4 pt-4 pb-12 bg-transparent text-[14px] text-ink placeholder:text-ink-muted resize-none scrollbar-hide focus:outline-none"
                      style={{ minHeight: '88px', maxHeight: '200px' }}
                    />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 squircle text-[11px] font-medium transition-all bg-accent text-accent-ink shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Agent Mode
                      </button>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button onClick={handleSendChat} disabled={!input.trim() || isChatLoading} className={`w-8 h-8 flex items-center justify-center squircle transition-all ${input.trim() && !isChatLoading ? 'bg-accent text-accent-ink hover:bg-accent-hover shadow-md' : 'bg-background border border-line text-ink-muted opacity-60'}`}>
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : view === 'memory' ? (
              <div className="flex-1 overflow-y-auto scrollbar-hide p-5 flex flex-col gap-4">
                <p className="text-[13px] text-ink-muted leading-relaxed">
                  This panel shows contextual memory nodes extracted from your browsing session.
                </p>
                {nodes.length === 0 ? (
                  <div className="text-center py-10 text-ink-faint text-[13px]">No nodes active in memory.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {nodes.slice(0, 10).map((n, i) => (
                      <div key={n.id} className="squircle bg-background border border-line p-3 hover:border-accent/30 transition-colors shadow-sm">
                        <div className="text-[12px] font-semibold text-ink truncate">{n.data.label || n.data.title || n.id}</div>
                        {n.data.url && <div className="text-[10px] text-accent font-mono truncate mt-1">{new URL(n.data.url).hostname}</div>}
                        <div className="text-[11px] text-ink-muted mt-2 line-clamp-2">{n.data.summary || 'No summary'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto scrollbar-hide p-5 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background border border-line squircle p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Total Nodes</span>
                    <span className="text-2xl font-bold text-ink">{nodes.length}</span>
                  </div>
                  <div className="bg-background border border-line squircle p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Connections</span>
                    <span className="text-2xl font-bold text-ink">{edges.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-[13px] font-semibold text-ink">Top Domains</h3>
                  <div className="flex flex-col gap-3 bg-background border border-line squircle p-4">
                    {topDomains.length > 0 ? topDomains.map(([domain, count], i) => (
                      <div key={domain} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[12px]">
                          <span className="text-ink truncate pr-2">{domain}</span>
                          <span className="text-ink-muted font-medium">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${(count / topDomains[0][1]) * 100}%` }} 
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full bg-accent"
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-[13px] text-ink-muted text-center py-4">No data available yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-[13px] font-semibold text-ink">Mesh Health</h3>
                  <div className="bg-background border border-line squircle p-4 flex items-center justify-between">
                    <span className="text-[13px] text-ink-muted">Connectivity Score</span>
                    <span className="text-[14px] font-bold text-accent">
                      {nodes.length > 0 ? Math.round((edges.length / nodes.length) * 100) : 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col min-w-0 bg-transparent overflow-hidden">
        {/* We keep backgrounds inside the main area so the sidebar rests *over* or *next* to them */}
        <Starfield />
        <GridBackground />
        
        {canvasView === 'mesh' && (
          <header className="absolute top-4 left-4 right-4 z-10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 glass-panel rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <span className="font-semibold tracking-tight text-[14px]">Lattice Canvas</span>
              <div className="hidden sm:block h-5 w-px bg-line/80" />
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-surface/50 border border-line/50 text-ink-muted shrink-0">
                {nodes.length} Nodes • {edges.length} Edges
              </span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide w-full lg:w-auto pb-1 lg:pb-0">
              <div className="flex items-center bg-surface/80 backdrop-blur border border-line/60 rounded-xl px-3 py-1.5 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10 transition-all shrink-0">
                <Search className="w-4 h-4 text-ink-muted mr-2" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-[13px] w-20 sm:w-32 md:w-48 focus:outline-none text-ink placeholder:text-ink-muted" />
              </div>
              <button onClick={handleImportTabs} className="h-8 px-3 flex items-center gap-1.5 rounded-xl bg-surface/80 backdrop-blur border border-line/60 hover:bg-surface hover:border-accent/30 text-ink transition-all duration-300 text-[13px] font-medium shrink-0 shadow-sm" title="Import Open Tabs">
                <PlusCircle className="w-4 h-4 text-accent" /> <span className="hidden sm:inline">Import Tabs</span>
              </button>
              <button onClick={handleLayoutCycle} className="h-8 px-3 flex items-center gap-1.5 rounded-xl bg-surface/80 backdrop-blur border border-line/60 hover:bg-surface text-ink transition-all duration-300 text-[13px] font-medium shrink-0 shadow-sm">
                <Network className="w-4 h-4" /> <span className="hidden sm:inline capitalize">Layout: {layoutMode}</span>
              </button>
              <button onClick={() => setIsFocusMode(prev => !prev)} className={`h-8 px-3 flex items-center gap-1.5 rounded-xl transition-all duration-300 text-[13px] font-medium shrink-0 ${isFocusMode ? 'bg-accent text-accent-ink shadow-md shadow-accent/30' : 'bg-surface/80 backdrop-blur border border-line/60 hover:bg-surface text-ink shadow-sm'}`}>
                <Box className="w-4 h-4" /> <span className="hidden sm:inline">{isFocusMode ? 'Exit Focus' : 'Focus'}</span>
              </button>
              <button onClick={handleExport} className="h-8 px-3 flex items-center gap-1.5 rounded-xl bg-surface/80 backdrop-blur border border-line/60 hover:bg-surface text-ink transition-all duration-300 text-[13px] font-medium shrink-0 shadow-sm">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </header>
        )}

        {canvasView === 'mesh' ? (
          <Canvas initialNodes={nodes} initialEdges={edges} layoutMode={layoutMode} searchQuery={searchQuery} onNodeClick={setSelectedNode} onNodeDragStop={handleNodeDragStop} onConnectEdge={handleEdgeConnect} />
        ) : (
          <AIMind />
        )}
        
        <AnimatePresence>
          {selectedNode && (
            <NodeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} onBranch={(node) => console.log('Branch node:', node)} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
