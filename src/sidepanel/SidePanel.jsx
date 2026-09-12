import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Network, Settings, ExternalLink, Sun, Moon, Send, Zap, GitBranch, Terminal } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { StorageManager } from '../background/storage_manager';
import browser from 'webextension-polyfill';
import { initializeTheme, toggleTheme } from '../lib/theme';
import { AiAvatar } from '../components/AiAvatar';

export function SidePanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [theme, setTheme] = useState('system');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);

  const endRef = useRef(null);

  useEffect(() => {
    setTheme(initializeTheme());
    
    // Get current active tab
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        setActiveTab(tabs[0]);
        setActiveNodeId(`tab-${tabs[0].id}`);
      }
    });

    const handleTabActivated = async (activeInfo) => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        setActiveTab(tab);
        setActiveNodeId(`tab-${tab.id}`);
      } catch (e) {}
    };
    browser.tabs.onActivated.addListener(handleTabActivated);
    
    return () => { browser.tabs.onActivated.removeListener(handleTabActivated); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleThemeToggle = () => {
    const newTheme = toggleTheme();
    setTheme(newTheme);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const text = input.trim();
    const newMessages = [...messages, { id: Date.now(), role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      if (isAgentMode || text.startsWith('/cmd ')) {
        const cmd = text.startsWith('/cmd ') ? text.replace('/cmd ', '').trim() : text;
        const planResponse = await browser.runtime.sendMessage({
          type: 'WEBCMD_PLAN',
          tabId: activeTab?.id,
          command: cmd
        });

        if (planResponse && planResponse.status === 'success' && planResponse.data.plan) {
          const planMsg = {
            id: Date.now() + 1,
            role: 'agent_plan',
            thought: planResponse.data.thought,
            plan: planResponse.data.plan,
            currentStepIndex: -1,
            completed: false
          };
          
          setMessages(prev => [...prev, planMsg]);

          for (let i = 0; i < planResponse.data.plan.length; i++) {
            const step = planResponse.data.plan[i];
            setMessages(prev => prev.map(m => m.id === planMsg.id ? { ...m, currentStepIndex: i } : m));
            await new Promise(resolve => setTimeout(resolve, 800));

            const execRes = await browser.runtime.sendMessage({
              type: 'WEBCMD_EXEC_STEP',
              tabId: activeTab?.id,
              action: step.action
            });
            
            if (execRes && execRes.status === 'error') {
              setMessages(prev => prev.map(m => m.id === planMsg.id ? { ...m, error: execRes.error, completed: true } : m));
              break; // Stop execution on error
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          setMessages(prev => prev.map(m => m.id === planMsg.id && !m.error ? { ...m, completed: true } : m));

        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Could not formulate a plan: ${planResponse?.error}` }]);
        }
      } else {
        const response = await browser.runtime.sendMessage({
          type: 'CHAT_COMPLETION',
          tabId: activeTab?.id,
          nodeId: activeNodeId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        });

        if (response && response.status === 'success') {
          const data = response.data;
          // Handle structured plan responses from the ReAct agent
          if (data && typeof data === 'object' && Array.isArray(data.plan)) {
            // Extract chat messages
            const chatMessages = data.plan
              .filter(step => step.action && step.action.type === 'chat' && step.action.message)
              .map(step => step.action.message);
            
            const replyText = chatMessages.length > 0 
              ? chatMessages.join('\n\n') 
              : (data.thought || 'Task completed.');
            
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: replyText }]);
            
            // Execute any non-chat actions
            const actionSteps = data.plan.filter(step => step.action && step.action.type !== 'chat');
            if (actionSteps.length > 0 && activeTab?.id) {
              for (const step of actionSteps) {
                await new Promise(r => setTimeout(r, 500));
                try {
                  await browser.runtime.sendMessage({
                    type: 'WEBCMD_EXEC_STEP',
                    tabId: activeTab.id,
                    action: step.action
                  });
                } catch (execErr) {
                  console.error('Action execution failed:', execErr);
                }
              }
            }
          } else {
            // Plain text response
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: text }]);
          }
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Error: ${response?.error || 'Unknown error'}` }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Extension Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchMessage = async (msgContent) => {
    try {
      await browser.runtime.sendMessage({
        type: 'BRANCH_MESSAGE',
        tabId: activeTab?.id,
        content: msgContent
      });
      // Could show a toast here in the future
    } catch (e) {
      console.error("Failed to branch message", e);
    }
  };

  const openDashboard = () => {
    browser.tabs.create({ url: 'dashboard.html' });
  };

  const SUGGESTIONS = [
    "Summarize what's on my current tab",
    "Switch to the GitHub tab",
    "/cmd scroll down"
  ];

  return (
    <div className="flex h-screen bg-background text-ink overflow-hidden transition-colors font-sans p-3 gap-3">
      
      {/* Icon Rail */}
      <div className="w-14 shrink-0 flex flex-col items-center py-4 bg-surface squircle border border-line shadow-sm z-20 relative">
        <div className="p-1 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden w-8 h-8 mb-6">
          <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <button className="relative p-2.5 rounded-xl transition-all bg-accent text-accent-ink shadow-md shadow-accent/20" title="Chat">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button onClick={openDashboard} className="relative p-2.5 rounded-xl transition-all text-ink-muted hover:bg-surface-hover hover:text-ink" title="Open Full Dashboard">
            <Network className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={handleThemeToggle} className="p-2.5 rounded-xl text-ink-muted hover:bg-surface-hover hover:text-ink transition-all" title="Toggle Theme">
            <AnimatePresence mode="wait">
              <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
          <button onClick={openDashboard} className="p-2.5 rounded-xl text-ink-muted hover:bg-surface-hover hover:text-ink transition-all" title="Open Full Dashboard">
            <ExternalLink className="w-5 h-5" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl text-ink-muted hover:bg-surface-hover hover:text-ink transition-all" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-surface squircle border border-line shadow-sm flex flex-col z-10 overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full bg-background relative z-10">
            
          {/* Header Banner */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-line bg-surface/90 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 h-6 px-3 squircle text-[11px] font-medium bg-background border border-line">
                <span className="font-mono text-ink-muted">Context</span>
                <span className="text-line-strong">|</span>
                <span className="truncate max-w-[150px] text-ink">{activeTab?.title || "Active Tab"}</span>
              </span>
            </div>
            <button className="h-6 px-3 squircle text-[11px] font-medium bg-background border border-line text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5 hover:bg-surface-hover">
              <GitBranch className="w-3 h-3" /> Connect Node
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center h-full pb-12">
                  <div className="relative mb-6">
                    <div className="w-14 h-14 squircle flex items-center justify-center bg-accent text-accent-ink shadow-lg shadow-accent/30">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div className="absolute inset-0 spin-slow opacity-20 squircle border-2 border-accent -m-2" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight-head mb-1 text-center text-ink">Active Tab Agent</h2>
                  <p className="text-[13px] text-center text-ink-muted max-w-[240px] mb-8 text-balance">
                    Ask me anything about your current tab, or type <span className="font-mono text-accent">/cmd</span> to execute actions.
                  </p>
                  <div className="flex flex-col w-full gap-2.5">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => setInput(s)} className="text-left px-4 py-3 squircle text-[13px] transition-all bg-background border border-line text-ink hover:bg-surface-hover hover:border-line-strong active:scale-95 flex items-center justify-between group">
                        {s}
                        <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-5 pb-4">
                  {messages.map((msg, idx) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'user' ? (
                        <div className="max-w-[85%] px-4 py-3 squircle rounded-tr-sm text-[14px] bg-accent text-accent-ink shadow-md shadow-accent/10">
                          {msg.content}
                        </div>
                      ) : msg.role === 'agent_plan' ? (
                        <div className="flex flex-col gap-3 max-w-[90%]">
                          <div className="flex items-center gap-2 text-[12px] font-mono text-accent">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Executing Action Plan</span>
                          </div>
                          <div className="p-4 squircle bg-surface border border-line shadow-sm">
                            <p className="text-[13px] text-ink-muted mb-4 italic leading-relaxed">"{msg.thought}"</p>
                            <div className="flex flex-col gap-3">
                              {msg.plan.map((step, i) => {
                                const isPast = i < msg.currentStepIndex;
                                const isCurrent = i === msg.currentStepIndex;
                                return (
                                  <div key={i} className={`flex items-start gap-2.5 text-[12px] transition-all duration-300 ${isPast ? 'opacity-40' : isCurrent ? 'text-accent font-medium' : 'text-ink-muted'}`}>
                                    <div className="mt-0.5 shrink-0 flex items-center justify-center w-3">
                                      {isPast ? "✓" : isCurrent ? <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-ping" /> : "•"}
                                    </div>
                                    <span className="leading-snug">{step.thought}</span>
                                  </div>
                                );
                              })}
                              
                              {msg.error && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="mt-2 p-3 bg-red-500/10 border border-red-500/20 squircle text-red-500 text-[12px] flex items-start gap-2"
                                >
                                  <span className="shrink-0 mt-0.5">⚠️</span>
                                  <span>{msg.error}</span>
                                </motion.div>
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
                            <div className="px-4 py-3 squircle rounded-tl-sm text-[14px] bg-background border border-line text-ink shadow-sm whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </div>
                            <div className="flex justify-start px-2">
                              <button 
                                onClick={() => handleBranchMessage(msg.content)}
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
                  {loading && (
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

          {/* Input Area */}
          <div className="shrink-0 p-4 bg-surface border-t border-line">
            <div className={`flex flex-col bg-background squircle border transition-all shadow-sm ${isAgentMode ? 'border-accent ring-2 ring-accent/20' : 'border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'} relative`}>
              <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isAgentMode ? "Tell the agent what to do..." : "Ask anything or /cmd..."}
                className="w-full px-4 pt-4 pb-12 bg-transparent text-[14px] text-ink placeholder:text-ink-muted resize-none scrollbar-hide focus:outline-none"
                style={{ minHeight: '88px', maxHeight: '200px' }}
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <button 
                  onClick={() => setIsAgentMode(!isAgentMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 squircle text-[11px] font-medium transition-all ${isAgentMode ? 'bg-accent text-accent-ink shadow-sm' : 'bg-surface border border-line text-ink-muted hover:text-ink'}`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Agent Mode
                </button>
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button onClick={handleSend} disabled={!input.trim() || loading} className={`w-8 h-8 flex items-center justify-center squircle transition-all ${input.trim() && !loading ? 'bg-accent text-accent-ink hover:bg-accent-hover' : 'bg-surface text-ink-muted'}`}>
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
