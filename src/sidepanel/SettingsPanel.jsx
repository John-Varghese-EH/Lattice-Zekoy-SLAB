import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Key, Shield, Database } from 'lucide-react';
import browser from 'webextension-polyfill';

export function SettingsPanel({ isOpen, onClose }) {
  const [provider, setProvider] = useState('gemini');
  const [keys, setKeys] = useState({ gemini: '', openai: '', anthropic: '', ollamaUrl: '' });
  const [blacklist, setBlacklist] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await browser.storage.local.get(['llmSettings', 'privacySettings']);
    if (settings.llmSettings) {
      setProvider(settings.llmSettings.provider || 'gemini');
      setKeys({
        gemini: settings.llmSettings.apiKey || '',
        openai: settings.llmSettings.openaiKey || '',
        anthropic: settings.llmSettings.anthropicKey || '',
        ollamaUrl: settings.llmSettings.ollamaUrl || ''
      });
    }
    if (settings.privacySettings?.blacklist) {
      setBlacklist(settings.privacySettings.blacklist.join('\n'));
    }
  };

  const handleSave = async () => {
    const blacklistArray = blacklist.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    await browser.storage.local.set({
      llmSettings: { 
        provider, 
        apiKey: keys.gemini, 
        openaiKey: keys.openai, 
        anthropicKey: keys.anthropic,
        ollamaUrl: keys.ollamaUrl
      },
      privacySettings: { blacklist: blacklistArray }
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearData = async () => {
    if (confirm("Are you sure you want to clear all Lattice local data? This cannot be undone.")) {
      await browser.storage.local.clear();
      alert("Local data cleared.");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute inset-0 z-50 bg-surface/95 backdrop-blur-xl flex flex-col"
      >
          <div className="flex items-center justify-between p-4 border-b border-line">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-ink">
              <Shield className="w-5 h-5 text-accent" />
              Settings & Privacy
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-ink">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {/* API Key Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2 uppercase tracking-wider">
                <Key className="w-4 h-4" />
                BYOK (Bring Your Own Key) Configuration
              </h3>
              
              <div className="space-y-3 bg-surface border border-line rounded-xl p-4 shadow-sm">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Active Provider</label>
                  <select 
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-field border border-line-strong rounded-xl px-3 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none cursor-pointer"
                  >
                    <option value="gemini">Google Gemini (Recommended)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="ollama">Ollama (Local / Open Source)</option>
                  </select>
                </div>

                <div className="h-px bg-line/60 my-2"></div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Google Gemini API Key</label>
                  <input 
                    type="password"
                    value={keys.gemini}
                    onChange={(e) => setKeys(prev => ({...prev, gemini: e.target.value}))}
                    placeholder="AIzaSy..."
                    className="w-full bg-field border border-line-strong rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-ink-faint"
                  />
                  <p className="text-[10px] text-ink-faint mt-1">Leave empty to use built-in free tier (rate limited).</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">OpenAI API Key</label>
                  <input 
                    type="password"
                    value={keys.openai}
                    onChange={(e) => setKeys(prev => ({...prev, openai: e.target.value}))}
                    placeholder="sk-..."
                    className="w-full bg-field border border-line-strong rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-ink-faint"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Anthropic API Key</label>
                  <input 
                    type="password"
                    value={keys.anthropic}
                    onChange={(e) => setKeys(prev => ({...prev, anthropic: e.target.value}))}
                    placeholder="sk-ant-..."
                    className="w-full bg-field border border-line-strong rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-ink-faint"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink-muted uppercase tracking-wider">Ollama Base URL (Local)</label>
                  <input 
                    type="text"
                    value={keys.ollamaUrl}
                    onChange={(e) => setKeys(prev => ({...prev, ollamaUrl: e.target.value}))}
                    placeholder="http://localhost:11434"
                    className="w-full bg-field border border-line-strong rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-ink-faint"
                  />
                </div>
              </div>
              <p className="text-[11px] text-ink-muted italic">All keys and data are stored securely in local extension storage and never sent anywhere else.</p>
            </section>

            {/* Privacy Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-ink-2 flex items-center gap-2 uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Privacy Blacklist
              </h3>
              <div className="space-y-1">
                <label className="text-xs text-ink-3">Domains to ignore (one per line). Supports wildcards (*://*.bank.com/*)</label>
                <textarea 
                  value={blacklist}
                  onChange={(e) => setBlacklist(e.target.value)}
                  rows={4}
                  placeholder="*://*.chase.com/*&#10;*://*.paypal.com/*"
                  className="w-full bg-field border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
                />
              </div>
            </section>

            {/* Data Management Section */}
            <section className="space-y-3 pt-4 border-t border-line">
              <h3 className="text-sm font-medium text-ink-2 flex items-center gap-2 uppercase tracking-wider">
                <Database className="w-4 h-4" />
                Data Management
              </h3>
              <button 
                onClick={clearData}
                className="w-full py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium"
              >
                Clear All Knowledge Graph Data
              </button>
            </section>
          </div>

          <div className="p-4 border-t border-line bg-surface">
            <button 
              onClick={handleSave}
              className="w-full py-3 bg-accent text-white rounded-xl font-medium shadow-btn flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Save className="w-4 h-4" />
              {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </motion.div>
    </AnimatePresence>
  );
}
