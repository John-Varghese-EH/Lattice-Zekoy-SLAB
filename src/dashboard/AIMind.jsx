import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { StorageManager } from '../background/storage_manager';
import { motion } from 'framer-motion';
import { Database, Zap } from 'lucide-react';

export function AIMind() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  useEffect(() => {
    let network = null;

    const loadData = async () => {
      setLoading(true);
      try {
        const db = await StorageManager.getDB();
        
        // Fetch from both sources
        const memoryNodes = await db.getAll('enterprise_memory');
        const mindMapNodes = await db.getAll('mindMap');

        const nodes = new DataSet();
        const edges = new DataSet();

        // Premium Colors
        const memoryColor = { 
          background: '#8B5CF6', // Vibrant Purple
          border: '#7C3AED', 
          hover: { background: '#A78BFA', border: '#8B5CF6' },
          highlight: { background: '#C4B5FD', border: '#A78BFA' }
        };
        const tabColor = { 
          background: '#06B6D4', // Neon Cyan
          border: '#0891B2', 
          font: '#ffffff',
          hover: { background: '#22D3EE', border: '#06B6D4' },
          highlight: { background: '#67E8F9', border: '#22D3EE' }
        };

        // Process Memory Nodes
        memoryNodes.forEach(m => {
          nodes.add({
            id: m.id,
            label: m.metadata?.url ? new URL(m.metadata.url).hostname : 'Memory',
            title: m.pageContent ? m.pageContent.substring(0, 100) + '...' : 'Memory Block',
            color: memoryColor,
            font: { color: '#ffffff', face: 'Inter', size: 14, bold: true },
            size: 24,
            shadow: { enabled: true, color: 'rgba(139, 92, 246, 0.4)', size: 15, x: 0, y: 0 },
            _fullData: m
          });
        });

        // Process Mind Map Nodes
        mindMapNodes.forEach(m => {
          if (!nodes.get(m.id)) {
            nodes.add({
              id: m.id,
              label: m.data?.label || 'Node',
              title: m.data?.title || '',
              color: tabColor,
              font: { color: '#ffffff', face: 'Inter', size: 12 },
              size: 18,
              shadow: { enabled: true, color: 'rgba(6, 182, 212, 0.4)', size: 10, x: 0, y: 0 },
              _fullData: m
            });
          }
          if (m.parentNodeId && m.parentNodeId !== m.id) {
            edges.add({
              from: m.parentNodeId,
              to: m.id,
              color: { color: 'rgba(255, 255, 255, 0.15)', highlight: '#22D3EE', hover: '#67E8F9' },
              arrows: { to: { enabled: true, scaleFactor: 0.5 } }
            });
          }
        });

        // Add semantic edges based on keywords / urls
        mindMapNodes.forEach((n1, i) => {
          mindMapNodes.slice(i + 1).forEach(n2 => {
            let score = 0;
            if (n1.data?.url && n2.data?.url) {
              try { if (new URL(n1.data.url).hostname === new URL(n2.data.url).hostname) score += 1; } catch(e){}
            }
            const k1 = n1.data?.keywords || [];
            const k2 = n2.data?.keywords || [];
            if (k1.some(k => k2.includes(k))) score += 2;

            if (score > 0) {
              edges.add({
                from: n1.id,
                to: n2.id,
                color: { color: '#10B981', opacity: Math.min(score * 0.25, 0.9), highlight: '#34D399', hover: '#6EE7B7' },
                width: score * 1.5,
                smooth: { type: 'curvedCW', roundness: 0.2 }
              });
            }
          });
        });

        setStats({ nodes: nodes.length, edges: edges.length });

        const options = {
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -60,
              centralGravity: 0.005,
              springLength: 120,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 0.8,
            },
            stabilization: { iterations: 200, fit: true },
          },
          interaction: {
            hover: true,
            tooltipDelay: 100,
            hideEdgesOnDrag: true,
          },
          nodes: { shape: 'dot', borderWidth: 1.5, font: { face: 'Inter', size: 12 } },
          edges: { smooth: { type: 'continuous', roundness: 0.2 } },
        };

        network = new Network(containerRef.current, { nodes, edges }, options);

        network.once('stabilizationIterationsDone', () => {
          network.setOptions({ physics: { enabled: false } });
        });

        network.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            setSelectedNodeData(nodes.get(nodeId)._fullData);
          } else {
            setSelectedNodeData(null);
          }
        });

      } catch (e) {
        console.error("Failed to load AI Mind graph", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (network) network.destroy();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0A0B10] overflow-hidden z-0">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/10 via-[#0A0B10]/50 to-[#0A0B10]" />
      
      {/* Header */}
      <header className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-between bg-surface/40 backdrop-blur-3xl rounded-full px-5 py-2.5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/30">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-wide text-white text-[13px] uppercase">AI Mind Central</span>
          <div className="hidden sm:block h-4 w-px bg-white/20 mx-1" />
          <span className="text-[11px] font-mono font-medium px-2 py-1 rounded-full bg-white/5 text-gray-300 shrink-0">
            {stats.nodes} Nodes • {stats.edges} Edges
          </span>
        </div>
      </header>

      {/* Vis Network Container */}
      <div ref={containerRef} className="w-full h-full" style={{ outline: 'none' }} />

      {/* Info Panel Overlay */}
      {selectedNodeData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute right-6 top-24 bottom-6 w-80 bg-surface/70 backdrop-blur-3xl rounded-[20px] border border-white/10 p-5 shadow-[0_16px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-y-auto flex flex-col gap-4"
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent animate-pulse" />
            </div>
            <h3 className="font-semibold text-[15px] text-white">Node Details</h3>
          </div>
          
          <div className="flex flex-col gap-4 text-[13px]">
            {selectedNodeData.pageContent && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Content Snippet</span>
                <p className="p-3 bg-[#000000]/40 rounded-xl border border-white/5 text-gray-300 leading-relaxed shadow-inner line-clamp-6">{selectedNodeData.pageContent}</p>
              </div>
            )}
            {selectedNodeData.data?.url && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Source URL</span>
                <a href={selectedNodeData.data.url} target="_blank" className="p-2.5 bg-accent/10 rounded-xl border border-accent/20 text-accent hover:bg-accent/20 transition-colors hover:underline break-all block text-center font-medium shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]">{selectedNodeData.data.url}</a>
              </div>
            )}
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Raw Metadata</span>
              <pre className="p-3 bg-[#000000]/60 rounded-xl border border-white/5 text-[11px] font-mono overflow-x-auto text-green-400/80 shadow-inner max-h-48 custom-scrollbar">
                {JSON.stringify(selectedNodeData.metadata || selectedNodeData.data, null, 2)}
              </pre>
            </div>
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0B10]/80 backdrop-blur-md z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-accent blur-xl opacity-40 animate-pulse" />
              <Zap className="w-10 h-10 text-accent relative z-10 animate-bounce" />
            </div>
            <span className="font-medium text-white tracking-widest uppercase text-[12px] opacity-80 glow-text">Initializing Neural Web...</span>
          </div>
        </div>
      )}
    </div>
  );
}
