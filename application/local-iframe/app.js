(function () {
  'use strict';
  
  const input = document.getElementById('url');
  const load = document.getElementById('load');
  const home = document.getElementById('home');
  const fullscreen = document.getElementById('fullscreen');
  const frame = document.getElementById('frame');
  const status = document.getElementById('status');
  const statusWrap = document.getElementById('status-container');
  const empty = document.getElementById('empty');
  const fsIcon = document.getElementById('fs-icon');
  
  const focusables = [input, load, home, fullscreen, frame];
  let current = 0;
  const storageKey = 'local_iframe_url';
  let fullscreenMode = false;
  let statusTimeout;

  function setFocus(index) {
    const next = focusables[index];
    if (!next) return;
    
    if (focusables[current] && focusables[current].classList) {
      focusables[current].classList.remove('focused');
    }
    
    current = index;
    
    if (next.classList) {
      next.classList.add('focused');
    }
    
    if (next !== input && document.activeElement === input) {
      input.blur();
    }
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = 'status' + (isError ? ' error' : '');
    statusWrap.classList.remove('hidden');
    
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusWrap.classList.add('hidden');
    }, 4000);
  }

  function normalizeUrl(value) {
    let url = (value || '').trim();
    if (!url) return '';
    // If it's just an IP or localhost with optional port, prepend http://
    if (/^([a-zA-Z0-9.-]+)(:\d+)?(\/.*)?$/.test(url) && !/^[a-zA-Z]+:\/\//.test(url)) {
      url = 'http://' + url;
    }
    return url;
  }

  function loadPage() {
    const value = normalizeUrl(input.value);
    
    if (!value || !/^https?:\/\/[^\s]+$/i.test(value)) {
      showStatus('Please enter a valid URL or IP address.', true);
      setFocus(0);
      return;
    }
    
    input.value = value;
    try {
      localStorage.setItem(storageKey, value);
    } catch (e) {}
    
    empty.classList.add('hidden');
    frame.classList.remove('loaded');
    showStatus('Loading ' + value + '...');
    
    frame.src = value;
    setFocus(4); // Focus frame directly
  }

  function sendRemoteKey(keyCode) {
    try {
      frame.contentWindow.postMessage({ type: 'local-iframe-key', keyCode: keyCode }, '*');
    } catch (e) {}
  }

  function toggleFullscreen() {
    fullscreenMode = !fullscreenMode;
    document.body.className = fullscreenMode ? 'fullscreen-mode' : '';
    fullscreen.setAttribute('aria-pressed', fullscreenMode ? 'true' : 'false');
    
    if (fullscreenMode) {
      fsIcon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>`;
      showStatus('Fullscreen enabled. Press ESC or Back to exit.');
      setFocus(4);
    } else {
      fsIcon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>`;
      showStatus('Fullscreen disabled.');
      setFocus(3); // Focus fullscreen button
    }
  }

  // Event Listeners
  input.addEventListener('focus', () => setFocus(0));
  load.addEventListener('click', loadPage);
  function getLocalIP(callback) {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (event) => {
        if (event && event.candidate && event.candidate.candidate) {
          const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(event.candidate.candidate);
          if (match) {
            callback(match[1]);
            pc.onicecandidate = null;
          }
        }
      };
      setTimeout(() => callback(null), 1000);
    } catch (e) {
      callback(null);
    }
  }

  home.addEventListener('click', () => {
    let host = window.location.hostname;
    
    // If not accessed via a remote IP, try to detect the local network IP dynamically
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '') {
      getLocalIP((ip) => {
        const finalHost = ip || '127.0.0.1';
        input.value = 'http://' + finalHost;
        loadPage();
      });
    } else {
      input.value = 'http://' + host;
      loadPage();
    }
  });
  fullscreen.addEventListener('click', toggleFullscreen);
  
  frame.addEventListener('load', () => {
    if (frame.src && frame.src !== 'about:blank') {
      frame.classList.add('loaded');
      showStatus('Page loaded successfully.');
    }
  });
  
  frame.addEventListener('error', () => {
    showStatus('Failed to load page. Check connection.', true);
  });

  // Restore previous URL
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) input.value = saved;
  } catch (e) {}

  // Spatial Navigation (Mouse + D-pad)
  document.addEventListener('mouseover', (event) => {
    let node = event.target;
    // Walk up to find focusable if clicked inside button
    while (node && node !== document.body) {
      const index = focusables.indexOf(node);
      if (index >= 0) {
        setFocus(index);
        break;
      }
      node = node.parentNode;
    }
  });

  document.addEventListener('keydown', (event) => {
    const key = event.keyCode;
    
    // If typing in input
    if (document.activeElement === input) {
      if (key === 13) { // Enter
        event.preventDefault();
        input.blur();
        loadPage();
      } else if (key === 461 || key === 27) { // Back or ESC
        event.preventDefault();
        input.blur();
        setFocus(0);
      }
      // Let other keys type normally
      return;
    }
    
    // D-Pad Left / Right
    if (key === 37 || key === 39) {
      event.preventDefault();
      // If frame is focused, pass event
      if (current === 4) {
        sendRemoteKey(key);
        return;
      }
      // Horizontal navigation: Input(0) <-> Load(1) <-> Home(2) <-> FS(3)
      if (key === 37) { // Left
        setFocus(Math.max(0, current - 1));
      } else { // Right
        setFocus(Math.min(3, current + 1));
      }
    } 
    // D-Pad Up / Down
    else if (key === 38 || key === 40) {
      event.preventDefault();
      if (current === 4) {
        // If in frame and going UP, and not in fullscreen, focus toolbar
        if (key === 38 && !fullscreenMode) {
          setFocus(0);
        } else {
          sendRemoteKey(key);
        }
        return;
      }
      // If in toolbar and going DOWN, focus frame
      if (key === 40) {
        setFocus(4);
      }
    } 
    // Enter / OK
    else if (key === 13) {
      event.preventDefault();
      if (current === 4) {
        sendRemoteKey(key);
      } else if (current === 1) {
        loadPage();
      } else if (current === 2) {
        home.click();
      } else if (current === 3) {
        toggleFullscreen();
      } else if (current === 0) {
        input.focus();
        input.select();
      }
    } 
    // Back / Return / ESC
    else if (key === 461 || key === 27) {
      event.preventDefault();
      if (fullscreenMode) {
        toggleFullscreen();
      } else if (current === 4) {
        setFocus(0); // Focus input when leaving frame
      } else {
        setFocus(0); // Default to input
      }
    } 
    // Play/Pause etc (Remote keys)
    else if (key === 406 || key >= 412) {
      event.preventDefault();
      sendRemoteKey(key);
    }
  }, true);

  // Initialize focus
  setFocus(0);
  
  // Hide status initially
  setTimeout(() => {
    statusWrap.classList.add('hidden');
  }, 2000);
})();
