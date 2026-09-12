import browser from 'webextension-polyfill';

let hasInjected = false;

function initInjector() {
  if (hasInjected) return;
  
  // Look for common AI chat inputs
  // ChatGPT: #prompt-textarea
  // Claude: .ProseMirror
  // Gemini: rich-textarea
  
  const findChatBox = () => {
    return document.querySelector('#prompt-textarea') || 
           document.querySelector('.ProseMirror') || 
           document.querySelector('rich-textarea');
  };

  const chatBox = findChatBox();
  
  if (!chatBox) {
    // Retry if not loaded yet
    setTimeout(initInjector, 1000);
    return;
  }
  
  hasInjected = true;
  
  // Create an overlay button
  const injectBtn = document.createElement('button');
  injectBtn.innerText = '🧠 Inject Persona';
  injectBtn.style.cssText = `
    position: absolute;
    bottom: 60px;
    right: 20px;
    z-index: 9999;
    background: #4f46e5;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    font-family: system-ui, sans-serif;
  `;
  
  document.body.appendChild(injectBtn);
  
  injectBtn.addEventListener('click', async () => {
    const draftText = chatBox.innerText || chatBox.value || chatBox.textContent;
    if (!draftText.trim()) {
      alert("Lattice: Please type a draft prompt first!");
      return;
    }
    
    injectBtn.innerText = '⏳ Retrieving Context...';
    
    try {
      const response = await browser.runtime.sendMessage({
        type: 'FETCH_MEMORY_CONTEXT',
        query: draftText
      });
      
      if (response && response.status === 'success' && response.data.long_term) {
        let injectedContext = "\n\n---\nSystem Context (Persona/Memory):\n";
        response.data.long_term.forEach((item, idx) => {
          if (idx < 2) { // Just take top 2 to avoid huge prompts
            injectedContext += `- ${item.content}\n`;
          }
        });
        
        // Inject into the box
        if (chatBox.value !== undefined) {
          chatBox.value += injectedContext;
        } else {
          chatBox.innerText += injectedContext;
        }
        
        // Trigger input event for React/Angular to detect change
        chatBox.dispatchEvent(new Event('input', { bubbles: true }));
        chatBox.dispatchEvent(new Event('change', { bubbles: true }));
        
        injectBtn.innerText = '✅ Context Injected';
        setTimeout(() => { injectBtn.innerText = '🧠 Inject Persona'; }, 3000);
      } else {
        injectBtn.innerText = '❌ Failed';
        setTimeout(() => { injectBtn.innerText = '🧠 Inject Persona'; }, 3000);
      }
    } catch (e) {
      console.error(e);
      injectBtn.innerText = '❌ Error';
      setTimeout(() => { injectBtn.innerText = '🧠 Inject Persona'; }, 3000);
    }
  });
}

// Start
initInjector();
