import React from 'react';

export function MiniBrowserPreview({ url }) {
  const widths = [75, 90, 55, 80];
  
  return (
    <div style={{ 
      background: "rgba(0,0,0,0.45)", 
      borderRadius: 5, 
      overflow: "hidden", 
      border: "1px solid rgba(255,255,255,0.05)", 
      flexShrink: 0,
      marginTop: 4
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 3, 
        padding: "3px 6px", 
        background: "rgba(255,255,255,0.025)", 
        borderBottom: "1px solid rgba(255,255,255,0.04)" 
      }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: c, opacity: 0.6 }} />
        ))}
        {url && (
          <div style={{ 
            flex: 1, 
            marginLeft: 3, 
            height: 6, 
            borderRadius: 2, 
            background: "rgba(255,255,255,0.05)", 
            overflow: "hidden", 
            display: "flex", 
            alignItems: "center", 
            paddingLeft: 3 
          }}>
            <span style={{ 
              fontSize: 4.5, 
              color: "rgba(255,255,255,0.25)", 
              fontFamily: "monospace", 
              whiteSpace: "nowrap" 
            }}>
              {url.replace(/^https?:\/\//, "").split("/")[0]}
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 2.5 }}>
        {widths.map((w, i) => (
          <div 
            key={i} 
            style={{ 
              height: i === 0 ? 3 : 2, 
              borderRadius: 1.5, 
              background: `rgba(255,255,255,${i === 0 ? 0.14 : 0.05})`, 
              width: `${w}%` 
            }} 
          />
        ))}
      </div>
    </div>
  );
}
