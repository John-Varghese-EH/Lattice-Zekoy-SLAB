import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

export function ChatThread({ messages }) {
  const renderAgentPlan = (msg) => {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2">
          {msg.completed ? (
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            {msg.completed ? 'Task Completed' : 'Agent Executing...'}
          </span>
        </div>
        
        <p className="text-sm italic text-ink-2">"{msg.thought}"</p>
        
        <div className="flex flex-col gap-2 mt-2 border-l-2 border-line/50 pl-3">
          {msg.plan.map((step, idx) => {
            const isDone = idx < msg.currentStepIndex || msg.completed;
            const isCurrent = idx === msg.currentStepIndex && !msg.completed;
            const isPending = idx > msg.currentStepIndex && !msg.completed;

            return (
              <div key={idx} className={`flex items-start gap-2 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                <div className="mt-0.5 shrink-0">
                  {isDone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {isCurrent && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                  {isPending && <Circle className="w-4 h-4 text-ink-3" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm ${isCurrent ? 'font-medium text-ink' : 'text-ink-2'}`}>
                    {step.thought}
                  </span>
                  {(isDone || isCurrent) && (
                    <span className="font-mono text-[10px] text-ink-3 mt-0.5">
                      {step.action.type.toUpperCase()}: {step.action.url || step.action.selector}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = (content) => {
    if (typeof content === 'string') {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
    }
    // Fallback for older message formats
    if (content?.thought && content?.action) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm italic text-ink-2">"{content.thought}"</p>
          <div className="p-3 bg-inset rounded-xl border border-line-strong font-mono text-xs text-ink overflow-x-auto shadow-inner">
            <span className="text-green font-bold">EXEC:</span> {content.action.type} {'->'} {content.action.selector}
          </div>
        </div>
      );
    }
    return <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-ink-3 mt-10"
          >
            <p className="text-sm">No messages yet. Ask something or try /cmd!</p>
          </motion.div>
        )}
        
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isPlan = msg.role === 'agent_plan';
          
          return (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
                  isUser 
                    ? 'bg-accent text-white rounded-tr-sm shadow-btn' 
                    : 'liquid-glass text-ink rounded-tl-sm shadow-card w-full'
                }`}
              >
                {isPlan ? renderAgentPlan(msg) : renderContent(msg.content)}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
