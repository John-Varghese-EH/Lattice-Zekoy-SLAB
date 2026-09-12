import browser from 'webextension-polyfill';
import { isBlacklisted } from './privacy_filter';
import { extractContent } from './extractors';

let hasExtracted = false;

async function runExtraction() {
  if (hasExtracted) return;

  const url = window.location.href;
  
  // 1. Check Privacy Blacklist
  const blocked = await isBlacklisted(url);
  if (blocked) {
    console.log('Lattice: Extraction disabled for this site (Blacklisted).');
    return;
  }

  // 2. Extract Content (optimized via idle callback)
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(async () => {
      await performAndSend();
    }, { timeout: 2000 });
  } else {
    setTimeout(performAndSend, 1000);
  }
}

async function performAndSend() {
  hasExtracted = true;
  const data = await extractContent();
  
  if (data) {
    try {
      await browser.runtime.sendMessage({
        type: 'EXTRACTED_CONTENT',
        payload: {
          url: window.location.href,
          title: data.title,
          mainText: data.mainText,
          method: data.method
        }
      });
    } catch (e) {
      console.error('Lattice: Failed to send extracted content to background', e);
    }
  }
}

// Run on page load
if (document.readyState === 'complete') {
  runExtraction();
} else {
  window.addEventListener('load', runExtraction);
}

// Also allow manual trigger and Agent actions
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'FORCE_EXTRACTION') {
    hasExtracted = false;
    runExtraction();
    return { status: 'success' };
  }

  if (request.type === 'GET_DOM_CONTEXT') {
    const elements = [];
    let idCounter = 1;
    
    // Select potentially interactive elements
    const interactables = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
    
    interactables.forEach(el => {
      // Check if element is reasonably visible
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) return;
      
      const agentId = idCounter++;
      el.setAttribute('data-agent-id', agentId);
      
      const tag = el.tagName.toLowerCase();
      let text = el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.name || '';
      text = text.trim().substring(0, 50); // limit length
      
      if (!text && tag !== 'input') return; // skip useless elements without text, unless input
      
      elements.push({
        id: agentId,
        tag: tag,
        type: el.type || undefined,
        name: el.name || undefined,
        text: text
      });
    });
    
    return { status: 'success', elements };
  }

  if (request.type === 'RUN_AGENT_ACTION' && request.action) {
    console.log('Lattice Agent Executing Action:', request.action);
    try {
      let el = null;
      if (request.action.agentId) {
        el = document.querySelector(`[data-agent-id="${request.action.agentId}"]`);
      } else if (request.action.selector) {
        el = document.querySelector(request.action.selector);
      }
      
      if (request.action.type === 'scroll') {
        const direction = request.action.direction || 'down';
        const amount = window.innerHeight * 0.8; // scroll 80% of viewport
        window.scrollBy({ top: direction === 'down' ? amount : -amount, behavior: 'smooth' });
        return { status: 'success' };
      }

      if (request.action.type === 'highlight') {
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const oldOutline = el.style.outline;
          el.style.outline = '3px solid #f5c40a';
          setTimeout(() => { el.style.outline = oldOutline; }, 3000);
        }
        return { status: 'success' };
      }

      if (request.action.type === 'select' && el) {
        el.value = request.action.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { status: 'success' };
      }

      if (request.action.type === 'wait') {
        const ms = request.action.duration || 1000;
        await new Promise(r => setTimeout(r, ms));
        return { status: 'success' };
      }

      if (request.action.type === 'extract_text') {
        const target = el || document.body;
        const text = target.innerText || target.textContent || '';
        return { status: 'success', data: text.substring(0, 10000) };
      }

      if (!el) {
        console.warn('Agent Action Failed: Element not found');
        return { status: 'error', error: 'Element not found' };
      }

      if (request.action.type === 'click') {
        el.click();
      } else if (request.action.type === 'type') {
        el.focus();
        el.value = request.action.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Flash the element to show the user the agent acted
      const oldBorder = el.style.border;
      const oldOutline = el.style.outline;
      el.style.border = '2px solid #0285ff';
      el.style.outline = '2px solid #0285ff';
      setTimeout(() => {
        el.style.border = oldBorder;
        el.style.outline = oldOutline;
      }, 1500);

      return { status: 'success' };
    } catch (e) {
      console.error('Agent Action Execution Error:', e);
      return { status: 'error', error: e.message };
    }
  }
});
