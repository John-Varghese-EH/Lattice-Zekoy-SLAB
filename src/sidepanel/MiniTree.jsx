import React, { useEffect, useState } from 'react';
import { StorageManager } from '../background/storage_manager';
import { Network, MessageCircle, FileText } from 'lucide-react';

export function MiniTree({ activeNodeId, onSelectNode, onBranch }) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    loadNodes();
    // In a real app we'd listen for storage changes
    const interval = setInterval(loadNodes, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadNodes = async () => {
    const allNodes = await StorageManager.getMindMapNodes();
    setNodes(allNodes);
  };

  // Build hierarchy
  const buildTree = (parentId) => {
    return nodes
      .filter(n => n.parentNodeId === parentId)
      .map(n => (
        <TreeNode 
          key={n.id} 
          node={n} 
          children={buildTree(n.id)} 
          activeNodeId={activeNodeId}
          onSelectNode={onSelectNode}
          onBranch={onBranch}
        />
      ));
  };

  const rootNodes = buildTree(null);
  
  // Also get orphan nodes (if parent doesn't exist)
  const validParentIds = new Set([null, ...nodes.map(n => n.id)]);
  const orphans = nodes
    .filter(n => !validParentIds.has(n.parentNodeId))
    .map(n => (
      <TreeNode 
        key={n.id} 
        node={n} 
        children={buildTree(n.id)} 
        activeNodeId={activeNodeId}
        onSelectNode={onSelectNode}
        onBranch={onBranch}
      />
    ));

  return (
    <div className="w-1/3 min-w-[200px] border-r border-line bg-surface overflow-y-auto hidden md:block p-3">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Network className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold tracking-tight text-ink">Node Tree</h2>
      </div>
      <div className="flex flex-col gap-1">
        {rootNodes}
        {orphans}
        {rootNodes.length === 0 && orphans.length === 0 && (
          <p className="text-xs text-ink-3 px-2">No nodes available.</p>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, children, activeNodeId, onSelectNode, onBranch }) {
  const isActive = activeNodeId === node.id;
  const isChat = node.type === 'chat';

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => onSelectNode(node.id)}
        className={`group flex flex-col p-2 rounded-xl border text-left cursor-pointer transition-all ${
          isActive 
            ? 'bg-accent/10 border-accent text-ink shadow-sm' 
            : 'bg-transparent border-transparent hover:bg-hover text-ink-2 hover:text-ink'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-surface border border-line-strong text-[10px] font-bold">
            {node.nodeNumber ?? '?'}
          </span>
          {isChat ? <MessageCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          <span className="text-xs font-medium truncate flex-1" title={node.data?.label || node.data?.title}>
            {node.data?.label || node.data?.title || 'Unknown'}
          </span>
        </div>
        
        {isActive && (
          <div className="flex justify-end mt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onBranch(node); }}
              className="text-[10px] font-semibold bg-page border border-line px-2 py-1 rounded-md hover:border-accent hover:text-accent transition-colors"
            >
              Branch Chat
            </button>
          </div>
        )}
      </div>
      
      {children.length > 0 && (
        <div className="ml-3 pl-2 border-l-2 border-line/50 flex flex-col gap-1 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
