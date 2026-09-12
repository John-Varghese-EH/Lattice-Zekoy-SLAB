import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import { FileText, MessageCircle, MoreHorizontal, ExternalLink, Trash2, GitBranch, Edit2, Globe } from 'lucide-react';

const elk = new ELK();

// Premium Custom Node
const CustomNode = ({ data, id, selected }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const isChat = data.type === 'chat';
  const isTab = !isChat;
  const opacityClass = data.isSearchMatch === false ? 'opacity-40 scale-[0.98] grayscale-[0.5]' : 'opacity-100 scale-100';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`group relative flex flex-col gap-2 p-3 transition-all duration-300 w-[200px] backdrop-blur-3xl shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] ${opacityClass}`}
      style={{
        boxShadow: selected ? "0 0 0 2.5px rgba(255,255,255,0.1), 0 8px 30px -4px rgba(0,0,0,0.5)" : undefined,
        borderColor: selected ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.08)",
        borderWidth: "1.5px",
        borderStyle: "solid",
        background: selected ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
        borderRadius: '12px'
      }}
    >
      {/* Animated gradient ring on select */}
      {selected && (
        <div className="absolute inset-0 -z-10 rounded-[inherit] p-[2px] overflow-hidden opacity-100">
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] opacity-40 blur-[2px]" />
        </div>
      )}

      {/* 2 Target Inputs (Top, Left) */}
      <Handle type="target" position={Position.Top} id="in-top" className="w-3 h-3 rounded-full border-[1.5px] border-line bg-surface transition-transform hover:scale-125 hover:bg-accent hover:border-accent shadow-sm" style={{ zIndex: 10, top: -6 }} />
      <Handle type="target" position={Position.Left} id="in-left" className="w-3 h-3 rounded-full border-[1.5px] border-line bg-surface transition-transform hover:scale-125 hover:bg-accent hover:border-accent shadow-sm" style={{ zIndex: 10, left: -6 }} />
      


      {/* Top row / Header */}
      <div className="flex items-start gap-2.5">
        {!isTab ? (
          <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center shadow-sm border bg-accent/10 text-accent border-accent/20">
            <MessageCircle className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-white/5 border border-white/10 text-white/70 shadow-inner">
            <Globe className="w-3.5 h-3.5 opacity-80" />
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className={`text-[12px] font-semibold leading-tight truncate ${selected ? "text-ink" : "text-white/90 group-hover:text-white transition-colors"}`} title={data.label || data.title}>
            {data.label || data.title}
          </p>
          {data.url && (
            <p className="text-[9px] font-mono font-medium text-accent/90 mt-0.5 tracking-wider truncate">
              {data.url.replace(/^https?:\/\//, "").split("/")[0]}
            </p>
          )}
        </div>
        
        {/* Three-dot menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-6 h-6 squircle flex items-center justify-center hover:bg-surface-active transition-colors text-ink-faint hover:text-ink">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-7 z-50 squircle overflow-hidden w-36 shadow-2xl bg-surface/95 backdrop-blur-xl border border-line p-1.5">
                <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-hover squircle transition-colors flex items-center gap-2.5 text-ink">
                  <GitBranch className="w-3.5 h-3.5 text-ink-muted" /> Branch
                </button>
                <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-hover squircle transition-colors flex items-center gap-2.5 text-ink">
                  <Edit2 className="w-3.5 h-3.5 text-ink-muted" /> Rename
                </button>
                {isTab && data.url && (
                  <button onClick={() => window.open(data.url, "_blank")} className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-hover squircle transition-colors flex items-center gap-2.5 text-ink">
                    <ExternalLink className="w-3.5 h-3.5 text-ink-muted" /> Open Tab
                  </button>
                )}
                <div className="h-px bg-line my-1" />
                <button className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-500/10 squircle transition-colors flex items-center gap-2.5 text-red-500">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Summary */}
      <div className="flex-1 relative">
        <p className="text-[10px] leading-snug line-clamp-3 text-white/50 font-medium">
          {data.summary || 'No summary available.'}
        </p>
      </div>

      {/* 2 Source Outputs (Bottom, Right) */}
      <Handle type="source" position={Position.Bottom} id="out-bot" className="w-3 h-3 rounded-full border-[1.5px] border-line bg-surface transition-transform hover:scale-125 hover:bg-accent hover:border-accent shadow-sm" style={{ zIndex: 10, bottom: -6 }} />
      <Handle type="source" position={Position.Right} id="out-right" className="w-3 h-3 rounded-full border-[1.5px] border-line bg-surface transition-transform hover:scale-125 hover:bg-accent hover:border-accent shadow-sm" style={{ zIndex: 10, right: -6 }} />
    </motion.div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const getLayoutedElements = async (nodes, edges, layoutMode) => {
  if (layoutMode === 'free') {
    return { layoutedNodes: nodes, layoutedEdges: edges };
  }

  if (layoutMode === 'grid') {
    // 4 side-by-side nodes grid layout
    const cols = 4;
    const xSpacing = 280;
    const ySpacing = 160;
    
    return {
      layoutedNodes: nodes.map((n, i) => ({
        ...n,
        position: n.position && (n.position.x !== 0 || n.position.y !== 0) ? n.position : {
          x: (i % cols) * xSpacing,
          y: Math.floor(i / cols) * ySpacing
        }
      })),
      layoutedEdges: edges
    };
  }

  const isRadial = layoutMode === 'radial';
  
  const elkGraph = {
    id: 'root',
    layoutOptions: isRadial ? {
      'elk.algorithm': 'radial',
      'elk.radial.radius': '150',
      'elk.spacing.nodeNode': '40'
    } : { 
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80'
    },
    children: nodes.map(n => ({ id: n.id, width: 250, height: 100 })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
  };

  const layoutedGraph = await elk.layout(elkGraph);

  const layoutedNodes = nodes.map(node => {
    const layoutNode = layoutedGraph.children.find(n => n.id === node.id);
    return {
      ...node,
      position: { x: layoutNode.x, y: layoutNode.y }
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

export function Canvas({ initialNodes, initialEdges, onNodeClick, onNodeDragStop, onConnectEdge, searchQuery, layoutMode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply search filtering
  const filteredNodes = useMemo(() => {
    if (!searchQuery) {
      return initialNodes.map(n => ({ ...n, data: { ...n.data, isSearchMatch: true } }));
    }
    
    const query = searchQuery.toLowerCase();
    return initialNodes.map(n => {
      const d = n.data;
      const textToSearch = `${d.label || ''} ${d.title || ''} ${d.url || ''} ${(d.keywords || []).join(' ')}`.toLowerCase();
      const isMatch = textToSearch.includes(query);
      return { ...n, data: { ...n.data, isSearchMatch: isMatch } };
    });
  }, [initialNodes, searchQuery]);

  // Layout when nodes/edges/mode change
  useEffect(() => {
    if (filteredNodes.length > 0) {
      getLayoutedElements(filteredNodes, initialEdges, layoutMode).then(({ layoutedNodes }) => {
        setNodes(layoutedNodes);
        setEdges(initialEdges);
      });
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [filteredNodes, initialEdges, layoutMode, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => {
      const newEdge = { ...params, id: `e-${params.source}-${params.target}` };
      setEdges((eds) => addEdge({ ...newEdge, animated: true, style: { stroke: 'var(--accent)' } }, eds));
      if (onConnectEdge) onConnectEdge(newEdge);
    },
    [setEdges, onConnectEdge],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => onNodeClick && onNodeClick(node)}
        onNodeDragStop={(event, node) => onNodeDragStop && onNodeDragStop(node)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--ink-faint)" gap={24} size={1.5} variant="dots" style={{ opacity: 0.2 }} />
        <Controls className="bg-surface border-line shadow-sm squircle overflow-hidden fill-ink text-ink" />
        <MiniMap 
          nodeColor="var(--accent)" 
          maskColor="var(--surface)"
          className="squircle overflow-hidden border border-line shadow-sm bg-background"
        />
      </ReactFlow>
    </div>
  );
}
