import React from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, GitBranch, Link as LinkIcon, MessageCircle, FileText, Tag } from 'lucide-react';

export function NodeDrawer({ node, onClose, onBranch }) {
  if (!node) return null;

  const data = node.data;
  const isChat = data.type === 'chat';

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-0 right-0 bottom-0 w-[350px] bg-surface/90 backdrop-blur-2xl border-l border-line shadow-2xl z-50 flex flex-col"
    >
      <header className="flex items-center justify-between p-4 border-b border-line/50">
        <div className="flex items-center gap-2">
           <div className={`w-8 h-8 squircle flex items-center justify-center shadow-inner ${isChat ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-background border border-line text-ink-muted'}`}>
             {isChat ? <MessageCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
           </div>
           <div>
             <h2 className="font-semibold text-ink text-[14px]">Node Details</h2>
             <p className="text-[10px] font-mono text-ink-faint">ID: {node.id}</p>
           </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center squircle hover:bg-surface-hover text-ink-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-hide">
        <div>
          <h3 className="text-lg font-bold text-ink leading-tight mb-2">
            {data.title || data.label || 'Untitled Node'}
          </h3>
          {data.url && (
            <a href={data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:underline mb-4 break-all">
              <LinkIcon className="w-3 h-3 shrink-0" />
              {data.url}
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-ink-faint flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> AI Summary
          </span>
          <p className="text-[13px] text-ink-muted leading-relaxed bg-background/50 p-3 squircle border border-line/50">
            {data.summary || 'No summary generated for this node yet.'}
          </p>
        </div>

        {data.keywords && data.keywords.length > 0 && (
          <div className="flex flex-col gap-2">
             <span className="text-[11px] font-semibold tracking-wider uppercase text-ink-faint flex items-center gap-1.5">
               <Tag className="w-3.5 h-3.5" /> Extracted Keywords
             </span>
             <div className="flex flex-wrap gap-1.5">
               {data.keywords.map((kw, i) => (
                 <span key={i} className="px-2 py-1 bg-accent/5 text-accent border border-accent/10 squircle text-[11px] font-medium">
                   {kw}
                 </span>
               ))}
             </div>
          </div>
        )}
      </div>

      <footer className="p-4 border-t border-line/50 bg-background/50 backdrop-blur-md flex gap-2">
        {data.url && (
          <button onClick={() => window.open(data.url, '_blank')} className="flex-1 flex items-center justify-center gap-2 h-9 squircle bg-accent text-accent-ink shadow-md hover:shadow-lg transition-all text-[13px] font-medium">
            <ExternalLink className="w-4 h-4" /> Open Tab
          </button>
        )}
        <button onClick={() => onBranch?.(node)} className="flex-1 flex items-center justify-center gap-2 h-9 squircle bg-surface border border-line text-ink hover:bg-surface-hover transition-all text-[13px] font-medium shadow-sm">
          <GitBranch className="w-4 h-4 text-ink-muted" /> Branch
        </button>
      </footer>
    </motion.div>
  );
}
