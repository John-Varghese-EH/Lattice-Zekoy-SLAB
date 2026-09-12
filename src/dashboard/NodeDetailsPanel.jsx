import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Tag } from 'lucide-react';

export function NodeDetailsPanel({ node, onClose }) {
  if (!node) return null;
  const { data } = node;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-96 bg-card/95 backdrop-blur-2xl border-l border-border/50 shadow-2xl p-6 overflow-y-auto z-50 flex flex-col"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/80 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <h2 className="text-xl font-bold pr-8 mb-2 leading-tight">{data.label}</h2>
        
        <a 
          href={data.url} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-accent hover:underline mb-6"
        >
          <ExternalLink className="w-4 h-4" />
          Visit Page
        </a>

        <div className="flex-1 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Summary</h3>
            <p className="text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-xl border border-border/30">
              {data.summary || 'No summary available. (Requires active LLM Provider)'}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {data.keywords && data.keywords.length > 0 ? (
                data.keywords.map((kw, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium border border-accent/20">
                    <Tag className="w-3 h-3" />
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None generated</span>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
