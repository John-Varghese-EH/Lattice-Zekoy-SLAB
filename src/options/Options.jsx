import React, { useState, useEffect } from 'react';
import browser from 'webextension-polyfill';
import { Shield, Key, Settings2, Save } from 'lucide-react';

export function Options() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('gemini-built-in');
  const [blacklist, setBlacklist] = useState('*.bank.com\n*.socialmedia.com');

  useEffect(() => {
    // Load settings on mount
    browser.storage.local.get(['llmSettings', 'privacySettings']).then((res) => {
      if (res.llmSettings) {
        setApiKey(res.llmSettings.apiKey || '');
        setProvider(res.llmSettings.provider || 'gemini-built-in');
      }
      if (res.privacySettings && res.privacySettings.blacklist) {
        setBlacklist(res.privacySettings.blacklist.join('\n'));
      }
    });
  }, []);

  const handleSave = async () => {
    await browser.storage.local.set({
      llmSettings: { apiKey, provider, model: 'gemini-3.5-flash' },
      privacySettings: { blacklist: blacklist.split('\n').filter(b => b.trim() !== '') }
    });
    alert('Settings saved!');
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans bg-background text-foreground min-h-screen">
      <header className="mb-10 flex items-center gap-4 border-b border-border/50 pb-6">
        <div className="p-3 bg-accent/10 rounded-2xl">
          <Settings2 className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lattice Preferences</h1>
          <p className="text-muted-foreground mt-1">Configure your AI model, privacy, and advanced behavior.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LLM Section */}
        <section className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">LLM Provider (BYOK)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-3 bg-muted/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-accent outline-none"
              >
                <option value="gemini-built-in">Gemini (Built-in Free Tier)</option>
                <option value="gemini">Google Gemini (Custom Key)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            
            {provider !== 'gemini-built-in' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-3 bg-muted/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-accent outline-none font-mono"
                />
              </div>
            )}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold">Privacy & Blacklist</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Blacklisted Sites (one per line)</label>
              <p className="text-xs text-muted-foreground mb-3">
                Lattice will completely ignore and never extract text from these domains.
              </p>
              <textarea 
                value={blacklist}
                onChange={(e) => setBlacklist(e.target.value)}
                rows={5}
                className="w-full p-3 bg-muted/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-accent outline-none font-mono text-sm resize-none"
                placeholder="*.bank.com&#10;example.com"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          <Save className="w-5 h-5" />
          Save Preferences
        </button>
      </div>
    </div>
  );
}
