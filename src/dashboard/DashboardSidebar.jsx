import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Hash, Tag, Globe, MessageCircle } from 'lucide-react';

export function DashboardSidebar({ nodes }) {
  const stats = useMemo(() => {
    let tabs = 0;
    let chats = 0;
    let online = 0;
    const kwMap = new Map();

    nodes.forEach(n => {
      const d = n.data;
      if (n.type === 'custom') { // legacy check
        if (d?.url) tabs++;
        else chats++;
      } else if (n.type === 'chat') {
        chats++;
      } else {
        tabs++;
      }

      if (d?.status === 'online') online++;

      if (d?.keywords && Array.isArray(d.keywords)) {
        d.keywords.forEach(kw => {
          kwMap.set(kw, (kwMap.get(kw) || 0) + 1);
        });
      }
    });

    const topKeywords = Array.from(kwMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return { tabs, chats, online, topKeywords };
  }, [nodes]);

  return (
    <motion.div 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 border-r border-line bg-surface/50 backdrop-blur-md p-4 flex flex-col gap-6 overflow-y-auto hidden md:flex"
    >
      <div>
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Graph Analytics
        </h2>
        
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<Globe className="w-4 h-4" />} label="Tabs" value={stats.tabs} />
          <StatCard icon={<MessageCircle className="w-4 h-4" />} label="Chats" value={stats.chats} />
          <StatCard icon={<Activity className="w-4 h-4 text-green-500" />} label="Online" value={stats.online} />
          <StatCard icon={<Hash className="w-4 h-4" />} label="Total" value={nodes.length} />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="w-3.5 h-3.5" />
          Top Topics
        </h2>
        
        <div className="flex flex-wrap gap-2">
          {stats.topKeywords.length > 0 ? (
            stats.topKeywords.map(([kw, count], idx) => {
              const size = Math.max(0.7, Math.min(1.2, 0.7 + (count * 0.1)));
              return (
                <span 
                  key={idx} 
                  style={{ transform: `scale(${size})`, transformOrigin: 'left center' }}
                  className="px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-medium whitespace-nowrap"
                >
                  {kw} <span className="opacity-50 ml-1">{count}</span>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-ink-3 italic">No AI topics extracted yet.</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="flex flex-col p-3 bg-inset rounded-xl border border-line-strong">
      <div className="flex items-center gap-2 text-ink-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold text-ink">{value}</span>
    </div>
  );
}
