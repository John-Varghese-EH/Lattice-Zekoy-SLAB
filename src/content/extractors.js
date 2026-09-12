import { Readability } from '@mozilla/readability';

/**
 * Extracts page content using Readability.js.
 * @returns {Object} Extracted data {title, text} or null if failed
 */
function extractWithReadability() {
  try {
    // Clone document to avoid modifying the actual DOM
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone, { keepClasses: false });
    const article = reader.parse();
    
    if (article && article.textContent && article.textContent.trim().length > 100) {
      return {
        title: article.title,
        mainText: article.textContent.trim().replace(/\s+/g, ' '),
        method: 'readability'
      };
    }
  } catch (error) {
    console.warn('Readability extraction failed', error);
  }
  return null;
}

/**
 * Heuristic fallback extraction.
 * Takes the largest text blocks from the DOM, stripping scripts, styles, navs.
 */
function extractWithHeuristics() {
  const ignoreTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'NAV', 'FOOTER', 'HEADER', 'ASIDE'];
  let textContent = '';
  
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      if (node.nodeType === Node.ELEMENT_NODE && ignoreTags.includes(node.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let currentNode;
  while ((currentNode = walk.nextNode())) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const text = currentNode.textContent.trim();
      if (text.length > 0) {
        textContent += text + ' ';
      }
    }
  }

  return {
    title: document.title,
    mainText: textContent.trim().replace(/\s+/g, ' ').slice(0, 50000), // Cap length
    method: 'heuristic'
  };
}

/**
 * Orchestrates the extraction pipeline.
 */
export async function extractContent() {
  console.log('Lattice: Starting extraction pipeline');
  
  // 1. Try Readability (best for articles/docs)
  const readabilityResult = extractWithReadability();
  if (readabilityResult) return readabilityResult;

  // 2. Accessibility Tree (would require chrome.debugger permissions which are invasive, 
  // so we'll simulate its semantic properties in the heuristic fallback for standard permissions,
  // or use a lightweight axe-core approach if required. For now, skipping direct CDP).
  
  // 3. Heuristic Fallback
  console.log('Lattice: Falling back to heuristic extraction');
  return extractWithHeuristics();
}
