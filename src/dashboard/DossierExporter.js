/**
 * Generates and downloads a markdown dossier from the knowledge graph.
 */
export async function exportDossier(nodes, edges) {
  let markdown = `# Lattice: Research Dossier\n\n`;
  markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  markdown += `## 📚 Explored Contexts (${nodes.length})\n\n`;
  
  nodes.forEach(node => {
    markdown += `### [${node.data.label}](${node.data.url})\n`;
    markdown += `- **Status**: ${node.data.status}\n`;
    // In a real implementation, we would query the full text or summary from DB here.
    markdown += `- *Full context stored in local database.*\n\n`;
  });

  markdown += `## 🔗 Connections (${edges.length})\n\n`;
  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source)?.data?.label || edge.source;
    const target = nodes.find(n => n.id === edge.target)?.data?.label || edge.target;
    markdown += `- **${source}** → **${target}**\n`;
  });

  // Create Blob and trigger download
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lattice_Dossier_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
