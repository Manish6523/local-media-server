(function () {
  'use strict';
  var API = window.VidLockAPI, Focus = window.TVFocus;
  var app = document.getElementById('app'), modal = document.getElementById('modal');
  var state = { server: '', screen: '', generation: 0, home: null, detail: null, player: null,
    library: [], hero: [], heroIndex: 0, homeFocus: null, detailFocus: null, party: null,
    socket: null, chat: [], modalReturn: null, pendingCode: null, clockOffset: 0,
    activeSection: 'home', catalogReady: false, collections: {}, browse: null, browseFocus: null, detailOrigin: 'home' };
  var toastTimer, heroTimer, syncTimer, roomTimer, roomBusy = false, roomGeneration = 0;

  function el(tag, cls, text, parent) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = String(text); }
    if (parent) { parent.appendChild(node); }
    return node;
  }
  function button(text, parent, fn, row, cls) {
    var node = el('button', cls || '', text, parent);
    node.type = 'button'; node.setAttribute('data-focusable', ''); node.tabIndex = -1;
    if (row) { node.setAttribute('data-row', row); }
    node.onclick = fn; return node;
  }
  function input(label, value, parent, max) {
    var wrap = el('label', 'field', label, parent), node = el('input', '', null, wrap);
    node.type = 'text'; node.value = value || ''; node.maxLength = max || 500;
    node.setAttribute('data-focusable', ''); node.tabIndex = -1;
    node.onclick = function () { node.focus(); };
    return node;
  }
  function toast(message) {
    var node = document.getElementById('toast');
    node.textContent = message; node.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { node.classList.add('hidden'); }, 6500);
  }
  function url(path) {
    if (!path) { return ''; }
    if (/^https?:\/\//i.test(path)) { return path; }
    if (/^\/\//.test(path) || /^[a-z]+:/i.test(path)) { return ''; }
    return state.server + '/' + path.replace(/^\/+/, '');
  }
  function request(path, method, body, done, raw) {
    var xhr = new XMLHttpRequest(), finished = false;
    function finish(error, data) { if (!finished) { finished = true; done(error, data); } }
    xhr.open(method || 'GET', url(path), true); xhr.timeout = 25000;
    if (body) { xhr.setRequestHeader('Content-Type', 'application/json'); }
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) { finish(new Error(path + ': HTTP ' + xhr.status)); return; }
      try { finish(null, raw ? xhr.responseText : (xhr.responseText ? JSON.parse(xhr.responseText) : {})); }
      catch (error) { finish(new Error(path + ': invalid JSON')); }
    };
    xhr.onerror = function () { finish(new Error(path + ': network/CORS failure')); };
    xhr.ontimeout = function () { finish(new Error(path + ': timed out')); };
    xhr.send(body ? JSON.stringify(body) : null); return xhr;
  }
  function image(path, parent, cls, fallback) {
    var node = el('img', cls || '', null, parent), source = url(path);
    node.alt = ''; node.onerror = function () {
      if (fallback && url(fallback) !== node.src) { node.src = url(fallback); fallback = ''; }
      else { node.classList.add('hidden'); }
    };
    if (source) {
      node.src = source;
      node.setAttribute('loading', 'lazy');
    } else { node.classList.add('hidden'); }
    return node;
  }
  function clock(seconds) {
    seconds = Math.floor(API.number(seconds));
    return Math.floor(seconds / 3600) + ':' + ('0' + Math.floor(seconds / 60) % 60).slice(-2) + ':' + ('0' + seconds % 60).slice(-2);
  }
  function hideModal() {
    modal.classList.add('hidden'); modal.innerHTML = '';
    if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
    var scope = state.screen === 'player' && state.player ? state.player.controls : app;
    Focus.scope(scope, state.modalReturn); state.modalReturn = null;
    if (state.player) { scheduleHide(); }
  }
  function dialog(title) {
    if (modal.classList.contains('hidden')) { state.modalReturn = Focus.current(); }
    modal.innerHTML = ''; modal.classList.remove('hidden');
    modal.classList.toggle('player-dialog-layer', state.screen === 'player');
    if (state.player) { clearTimeout(state.player.hideTimer); }
    var cls = 'dialog scroller' + (state.screen === 'player' ? ' player-modal' : '');
    var box = el('section', cls, null, modal);
    if (state.screen === 'player') { el('p', 'eyebrow', 'PLAYBACK OPTIONS', box); }
    el('h2', '', title, box); return box;
  }
  function switchScreen(name) {
    state.generation += 1; state.screen = name;
    modal.classList.add('hidden'); modal.innerHTML = '';
    app.innerHTML = ''; app.className = name;
  }

  function icon(name, parent) {
    var paths = {
      home: 'M3 10L12 3l9 7v11h-6v-7H9v7H3z',
      search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
      movies: 'M3 5h18v15H3zM3 10h18M7 5l3 5M14 5l3 5',
      shows: 'M3 5h18v13H3zM8 22h8M12 18v4',
      favorites: 'M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13z',
      party: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 4a4 4 0 0 1 0 8M18 15a4 4 0 0 1 4 4v2',
      settings: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
      refresh: 'M20 8a9 9 0 1 0 0 9M20 2v6h-6',
      play: 'M7 3l15 9L7 21z', info: 'M12 11v6M12 7v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
      back: 'M15 4l-8 8 8 8', check: 'M4 12l5 5L20 6', close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      pause: 'M6 4h4v16H6zm8 0h4v16h-4z',
      rewind: 'M11 19l-9-7 9-7v14zm11 0l-9-7 9-7v14z',
      forward: 'M13 19l9-7-9-7v14zM2 19l9-7-9-7v14z',
      cc: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM10 10H7v4h3M18 10h-3v4h3',
      audio_track: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
      chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', paths[name] || paths.play); svg.appendChild(path); parent.appendChild(svg); return svg;
  }
  function action(label, parent, fn, group, cls, symbol) {
    var node = button('', parent, fn, group, cls); node.setAttribute('aria-label', label); icon(symbol, node); el('span', '', label, node); return node;
  }
  function header(parent) {
    var bar = el('aside', 'sidebar', null, parent);
    var brand = el('div', 'brand-mark', '', bar);
    var logo = el('img', 'brand-icon', null, brand);
    logo.src = 'icon.png'; logo.alt = 'VidLock';
    var nav = el('nav', 'main-nav', null, bar); nav.setAttribute('aria-label', 'Main navigation');
    function entry(name, label, fn, target) {
      var node = button('', target || nav, fn, null, 'nav-item' + (state.activeSection === name ? ' active' : ''));
      node.setAttribute('aria-label', label); node.setAttribute('data-nav', name);
      if (state.activeSection === name) { node.setAttribute('aria-current', 'page'); }
      icon(name, node); el('span', 'nav-label', label, node);
    }
    entry('search', 'Search', function () { showCollection('search'); });
    entry('home', 'Home', function () { showHome(); });
    entry('movies', 'Movies', function () { showCollection('movies'); });
    entry('shows', 'TV Shows', function () { showCollection('shows'); });
    entry('favorites', 'Favorites', function () { showCollection('favorites'); });
    entry('party', 'Watch Party', function () { partyMenu(); });
    var bottom = el('div', 'nav-bottom', null, bar);
    entry('refresh', 'Refresh', function () { loadHome(state.activeSection); }, bottom);
    entry('settings', 'Settings', config, bottom);
    entry('close', 'Exit', function () { window.close(); }, bottom);
  }
  function masthead(parent, title) {
    var top = el('div', 'masthead', null, parent);
    el('span', 'wordmark', 'VIDLOCK', top); el('span', 'masthead-divider', '/', top);
    el('span', 'page-label', title, top);
    var right = el('span', 'masthead-right', '', top);
    el('span', 'connection-dot', '', right); el('span', '', 'YOUR PERSONAL CINEMA', right);
  }
  function metadata(item, parent) {
    var node = el('div', 'metadata', null, parent);
    if (item.rating) { el('span', 'rating', '★ ' + String(item.rating).split('/')[0], node); }
    if (item.year) { el('span', '', item.year, node); }
    el('span', 'type-badge', item.type === 'show' ? 'SERIES' : 'FILM', node);
    if (item.runtime) { el('span', '', item.runtime + ' min', node); }
    el('span', 'meta-genres', API.genres(item).slice(0, 3).join(' · '), node);
  }
  function config() {
    state.activeSection = 'settings'; switchScreen('config');
    if (state.server) { header(app); }
    var scene = el('div', 'setup-scene', '', app);
    if (state.library.length) { image(API.backdrop(state.library[0]), scene, 'setup-art'); }
    var box = el('section', 'setup', null, app);
    el('div', 'brand', 'VIDLOCK', box); el('p', 'eyebrow', 'WELCOME TO YOUR BIG SCREEN', box);
    el('h1', '', 'Bring your library home.', box);
    el('p', 'muted', 'Enter your media server address. Use the computer\'s LAN IP, including its port.', box);
    var field = input('Server address', state.server || 'http://192.168.1.100:2886', box);
    var error = el('p', 'error', '', box);
    button('Auto-fill Subnet', box, function () {
      try {
        var pc = new window.RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(function(offer) { return pc.setLocalDescription(offer); });
        pc.onicecandidate = function(ice) {
          if (!ice || !ice.candidate || !ice.candidate.candidate) { return; }
          var match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (match) {
            var parts = match[1].split('.');
            if (parts.length === 4) { field.value = 'http://' + parts[0] + '.' + parts[1] + '.' + parts[2] + '.'; }
            pc.onicecandidate = null; pc.close();
            toast('Found TV IP: ' + match[1] + '. Complete the server address.');
          }
        };
        setTimeout(function() { pc.close(); }, 3000);
      } catch (e) { toast('Could not fetch IP automatically.'); }
    });
    button('Connect to library', box, function () {
      var value = field.value.trim().replace(/\/+$/, ''), parsed = document.createElement('a');
      parsed.href = value;
      if (!/^https?:\/\/[^\s]+$/i.test(value) || !parsed.hostname || parsed.search || parsed.hash || parsed.username || parsed.password) {
        error.textContent = 'Enter an HTTP or HTTPS base URL without query, fragment, or credentials.'; return;
      }
      try { localStorage.setItem('vidlock_server_url', value); }
      catch (e) { error.textContent = 'The TV could not save this address. Check available storage.'; return; }
      leaveParty(); state.server = value; state.home = null; state.library = []; state.catalogReady = false; state.browse = null; loadHome();
    }, null, 'primary');
    if (state.server) { button('Cancel', box, showHome); }
    el('p', 'hint', 'OK edits a field. OK again finishes editing. Arrows select a button.', box);
    Focus.scope(app);
  }
  function card(item, rail, row, continuing, landscape) {
    var node = button('', rail, function () { showDetail(item.id); }, row, 'card' + (landscape ? ' landscape' : ''));
    node.setAttribute('aria-label', API.title(item));
    var visual = el('span', 'card-visual', '', node);
    el('span', 'poster-fallback', API.title(item), visual);
    
    var imgNode = image(landscape ? API.backdrop(item) || API.poster(item) : API.poster(item), visual, 'poster', API.poster(item));
    if (continuing && item.type === 'show') {
      if (item.episode_thumbnail) {
        imgNode.src = url(item.episode_thumbnail);
      } else {
        request('/api/episode-thumbnail?id=' + item.id, 'GET', null, function(err, data) {
          if (!err && data && data.thumbnail) {
            item.episode_thumbnail = data.thumbnail;
            imgNode.src = url(data.thumbnail);
          }
        });
      }
    }

    var affordance = el('span', 'card-play', '', visual); icon(continuing ? 'play' : 'info', affordance);
    if (item.rating) { el('span', 'card-rating', '★ ' + String(item.rating).split('/')[0], visual); }
    el('span', 'card-title', API.title(item), node);
    el('span', 'card-meta', (item.type === 'show' ? 'Series' : 'Film') + (item.year ? ' · ' + item.year : '') + (continuing && item.episode_start ? ' · S' + (item.season || 1) + ' E' + item.episode_start : ''), node);
    if (continuing) {
      var p = API.progress(item), track = el('span', 'progress', null, visual), fill = el('span', '', null, track);
      fill.style.width = p.duration ? Math.min(100, p.position / p.duration * 100) + '%' : '0%';
      el('span', 'remaining', p.duration ? Math.max(0, Math.ceil((p.duration - p.position) / 60)) + ' min left' : clock(p.position) + ' watched', visual);
    }
  }
  function row(title, items, parent, key, continuing) {
    var landscape = continuing || key === 'recent';
    var section = el('section', 'media-row' + (landscape ? ' wide-row' : ''), null, parent);
    var heading = el('div', 'row-heading', '', section);
    el('h2', '', title, heading); el('span', 'row-count', items.length + (items.length === 1 ? ' TITLE' : ' TITLES'), heading);
    if (!items.length) { el('p', 'muted empty', continuing ? 'Your next movie night starts here. Pick something to watch.' : 'Your collection is waiting to grow.', section); return; }
    var rail = el('div', 'rail', null, section), loaded = 0;
    function batch() {
      var end = Math.min(items.length, loaded + 30), more = rail.querySelector('.more');
      if (more) { rail.removeChild(more); }
      for (; loaded < end; loaded += 1) { card(items[loaded], rail, key, continuing, landscape); }
      if (loaded < items.length) { button('Show more', rail, function () {
        var index = loaded; batch(); Focus.set(rail.children[index]);
      }, key, 'card more'); }
    }
    batch();
  }
  function renderHero() {
    var node = state.home && state.home.querySelector('.hero');
    if (!node || !state.hero.length) { return; }
    var item = state.hero[state.heroIndex % state.hero.length];
    node.innerHTML = ''; image(API.backdrop(item) || API.poster(item), node, 'hero-art', API.poster(item));
    var copy = el('div', 'hero-copy', null, node);
    el('p', 'eyebrow', 'THE SPOTLIGHT', copy); el('h1', '', API.title(item), copy);
    metadata(item, copy);
    el('p', 'hero-plot', API.plot(item), copy);
    var actions = el('div', 'hero-actions', '', copy);
    action('Explore title', actions, function () { showDetail(item.id); }, 'hero', 'primary', 'play');
    action('Watch Party', actions, function () { partyMenu(item); }, 'hero', 'secondary', 'party');
    var pagination = el('div', 'hero-pagination', '', node);
    state.hero.forEach(function (unused, index) { el('span', index === state.heroIndex ? 'current' : '', '', pagination); });
    el('span', 'hero-count', ('0' + (state.heroIndex + 1)).slice(-2) + ' / ' + ('0' + state.hero.length).slice(-2), node);
  }
  function loadHome(destination) {
    destination = typeof destination === 'string' ? destination : 'home'; state.activeSection = 'home';
    switchScreen('home'); var generation = state.generation;
    header(app); el('p', 'loading', 'Opening your library…', app);
    Focus.scope(app); var results = {}, errors = [], remaining = 5;
    ['recent', 'continuing', 'favorites', 'media', 'genres'].forEach(function (key) {
      request(API.paths[key], 'GET', null, function (error, data) {
        if (generation !== state.generation) { return; }
        results[key] = error ? [] : API.list(data);
        if (error) { errors.push(error.message); }
        remaining -= 1;
        if (remaining) { return; }
        app.innerHTML = ''; state.library = results.media; state.collections = results; state.catalogReady = true; state.browse = null;
        state.home = el('div', 'home-view', null, app); header(state.home);
        var scroll = el('div', 'scroller home-scroll', null, state.home);
        masthead(scroll, 'Home');
        el('section', 'hero', null, scroll);
        var featured = API.group(results.recent.concat(results.media));
        var withArt = featured.filter(function (item) { return API.backdrop(item) && item.available !== 0; });
        state.hero = (withArt.length ? withArt : featured).slice(0, 6); state.heroIndex = 0; renderHero();
        if (!state.hero.length) {
          var blank = scroll.querySelector('.hero');
          var copy = el('div', 'hero-copy', '', blank); el('p', 'eyebrow', 'MAKE YOURSELF AT HOME', copy);
          el('h1', '', 'A screen for your stories.', copy); el('p', 'hero-plot', 'Add movies and shows to your VidLock server, then refresh your library.', copy);
          button('Refresh', copy, loadHome, 'hero', 'primary');
        }
        if (errors.length) {
          var warning = el('div', 'warning', 'Some sections could not load. ' + errors.join(' · '), scroll);
          button('Retry', warning, loadHome);
        }
        row('Continue Watching', results.continuing, scroll, 'continue', true);
        row('Recently Added', API.group(results.recent), scroll, 'recent');
        row('Favorites', API.group(results.favorites), scroll, 'favorites');
        row('Your Library', API.group(results.media), scroll, 'library');
        results.genres.forEach(function (genre, index) {
          var name = typeof genre === 'string' ? genre : genre.name;
          var items = API.group(results.media.filter(function (item) { return API.genres(item).indexOf(name) >= 0; }));
          if (items.length) { row(name, items, scroll, 'genre-' + index); }
        });
        Focus.scope(app, app.querySelector('.hero button')); flushProgress();
        if (destination !== 'home' && destination !== 'settings') { showCollection(destination); }
      });
    });
  }
  function showHome() {
    state.activeSection = 'home';
    if (!state.server) { config(); return; }
    if (!state.home) { loadHome(); return; }
    switchScreen('home'); app.appendChild(state.home); Focus.scope(app, state.homeFocus);
  }
  function showCollection(section) {
    if (!state.catalogReady) { loadHome(section); return; }
    state.activeSection = section; switchScreen('browse');
    var titles = { movies: 'Movies', shows: 'TV Shows', favorites: 'Favorites', search: 'Search' };
    var descriptions = { movies: 'For the love of cinema.', shows: 'One more episode.', favorites: 'The ones worth keeping.', search: 'Find your next favorite.' };
    var items = section === 'favorites' ? state.collections.favorites || [] : state.library;
    items = API.group(items.filter(function (item) { return section === 'movies' ? item.type === 'movie' : section === 'shows' ? item.type === 'show' : true; }));
    state.browse = el('div', 'browse-view', '', app); header(state.browse);
    var scroll = el('div', 'scroller browse-scroll', '', state.browse); masthead(scroll, titles[section] || 'Library');
    var banner = el('div', 'collection-banner', '', scroll);
    var featured = items.filter(function (item) { return API.backdrop(item); })[0];
    if (featured && section !== 'search') { image(API.backdrop(featured), banner, 'collection-art'); }
    var copy = el('div', 'collection-copy', '', banner);
    el('p', 'eyebrow', section === 'favorites' ? 'SAVED FOR YOU' : 'YOUR COLLECTION', copy);
    el('h1', '', descriptions[section], copy);
    var count = el('p', 'muted collection-count', items.length + ' titles, ready when you are.', copy);
    var form, query = '', genre = 'All genres';
    if (section === 'search') {
      form = input('Search your library', '', copy, 120);
      form.placeholder = 'Titles, genres, or a year';
      form.setAttribute('aria-label', 'Search your library');
      form.oninput = function () { query = form.value.trim().toLowerCase(); render(); };
    }
    var filters = el('div', 'collection-filters', '', scroll);
    var genreButton = button('All genres', filters, function () {
      var box = dialog('Choose a genre');
      ['All genres'].concat(state.collections.genres || []).forEach(function (name) {
        if (typeof name !== 'string') { name = name.name; }
        button(name, box, function () { genre = name; genreButton.textContent = name; hideModal(); render(); });
      });
      button('Cancel', box, hideModal); Focus.scope(modal);
    }, 'filters', 'filter-button');
    var sort = 'title';
    var sortButton = button('Title: A–Z', filters, function () {
      sort = sort === 'title' ? 'year' : 'title'; sortButton.textContent = sort === 'title' ? 'Title: A–Z' : 'Newest first'; render();
    }, 'filters', 'filter-button');
    var grid = el('div', 'catalog-grid', '', scroll);
    function render() {
      var filtered = items.filter(function (item) {
        return (genre === 'All genres' || API.genres(item).indexOf(genre) >= 0) && (!query || (API.title(item) + ' ' + API.genres(item).join(' ') + ' ' + (item.year || '')).toLowerCase().indexOf(query) >= 0);
      }).sort(function (a, b) { return sort === 'year' ? (b.year || 0) - (a.year || 0) : API.title(a).localeCompare(API.title(b)); });
      grid.innerHTML = ''; count.textContent = filtered.length + (filtered.length === 1 ? ' title' : ' titles') + (query ? ' found.' : ', ready when you are.');
      if (!filtered.length) {
        var empty = el('div', 'empty-state', '', grid); icon(section === 'favorites' ? 'favorites' : 'search', empty);
        el('h2', '', query || genre !== 'All genres' ? 'No matches this time.' : 'Your collection starts here.', empty);
        el('p', 'muted', query || genre !== 'All genres' ? 'Try a different title or genre.' : section === 'favorites' ? 'Save favorites in the VidLock web app. They will appear here after a refresh.' : 'Add titles on your media server, then refresh.', empty);
      }
      var loaded = 0;
      function batch() {
        var end = Math.min(loaded + 30, filtered.length);
        for (; loaded < end; loaded += 1) { card(filtered[loaded], grid, 'catalog-' + Math.floor(loaded / 6), false, false); }
        if (loaded < filtered.length) {
          var more = button('Show more titles', grid, function () { var next = loaded; grid.removeChild(more); batch(); Focus.set(grid.children[next]); }, 'catalog-more', 'load-more');
        }
      }
      batch();
    }
    render(); Focus.scope(app, form || grid.querySelector('button') || genreButton);
  }
  function returnToBrowse() {
    if (state.detailOrigin === 'browse' && state.browse) {
      switchScreen('browse'); app.appendChild(state.browse); Focus.scope(app, state.browseFocus);
    } else { showHome(); }
  }
  function showDetail(id) {
    if (state.screen === 'home') { state.homeFocus = Focus.current(); }
    if (state.screen === 'browse') { state.browseFocus = Focus.current(); }
    state.detailOrigin = state.screen === 'browse' ? 'browse' : 'home';
    switchScreen('detail'); var generation = state.generation;
    header(app); el('p', 'loading', 'Loading title…', app); Focus.scope(app);
    request(API.paths.detail(id), 'GET', null, function (error, data) {
      if (state.generation !== generation) { return; }
      if (error) {
        app.innerHTML = ''; el('p', 'warning', error.message, app);
        button('Retry', app, function () { showDetail(id); }); button('Home', app, showHome); Focus.scope(app); return;
      }
      state.detail = API.detail(data); renderDetail();
    });
  }
  function renderDetail() {
    switchScreen('detail'); header(app);
    var item = state.detail, scroll = el('div', 'scroller detail-scroll', null, app);
    var top = el('section', 'detail-top', null, scroll);
    image(API.backdrop(item) || API.poster(item), top, 'detail-backdrop', API.poster(item));
    var detailNav = el('div', 'detail-nav', '', top);
    action('Back to library', detailNav, returnToBrowse, 'detail-back', 'back-button', 'back');
    image(API.poster(item), top, 'detail-poster');
    var copy = el('div', 'detail-copy', null, top);
    el('p', 'eyebrow', item.type === 'show' ? 'VIDLOCK SERIES' : 'VIDLOCK CINEMA', copy);
    el('h1', '', API.title(item), copy);
    metadata(item, copy);
    el('p', 'plot', API.plot(item) || 'No description available.', copy);
    var actions = el('div', 'actions', null, copy);
    if (item.available === 0) { el('p', 'warning', 'This file is offline. Connect its drive to your server.', copy); }
    else {
      action(item.watch_progress > 5 ? 'Resume ' + clock(item.watch_progress) : 'Play', actions, function () { startPlayer(item.id); }, 'detail-actions', 'primary', 'play');
      action('Play from start', actions, function () { startPlayer(item.id, 0); }, 'detail-actions', 'secondary', 'refresh');
      action('Watch Party', actions, function () { partyMenu(item); }, 'detail-actions', 'secondary', 'party');
    }
    if (item.type === 'show') {
      var episodes = API.episodes(item, state.library), seasons = {};
      episodes.forEach(function (episode) {
        var season = episode.season || 1;
        if (!seasons[season]) { seasons[season] = []; }
        seasons[season].push(episode);
      });
      Object.keys(seasons).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (season) {
        var seasonHeader = el('div', 'season-heading', '', scroll);
        el('h2', 'season-title', 'Season ' + season, seasonHeader);
        el('span', 'row-count', seasons[season].length + ' EPISODES', seasonHeader);
        var grid = el('div', 'episode-grid', null, scroll);
        seasons[season].forEach(function (episode, index) {
          var tile = button('', grid, function () { startPlayer(episode.id); }, 'season-' + season + '-row-' + Math.floor(index / 4), 'episode');
          var shot = el('span', 'episode-visual', '', tile);
          var img = image(episode.episode_thumbnail || API.backdrop(episode) || API.backdrop(item) || API.poster(item), shot, 'episode-art', API.poster(item));
          if (!episode.episode_thumbnail) {
            request('/api/episode-thumbnail?id=' + episode.id, 'GET', null, function(err, data) {
              if (!err && data && data.thumbnail) {
                episode.episode_thumbnail = data.thumbnail;
                img.src = url(data.thumbnail);
              }
            });
          }
          var play = el('span', 'episode-play', '', shot); icon('play', play);
          el('span', 'eyebrow', 'EPISODE ' + (episode.episode_start || index + 1) + (episode.episode_end && episode.episode_end !== episode.episode_start ? '–' + episode.episode_end : ''), tile);
          el('span', 'episode-name', episode.episode_title || 'Episode ' + (episode.episode_start || index + 1), tile);
          if (episode.watch_progress) { el('small', 'muted', clock(episode.watch_progress) + ' watched', tile); }
        });
      });
    }
    if (item.type !== 'show') {
      var related = API.group(state.library.filter(function (other) {
        return other.id !== item.id && other.type === item.type && API.genres(other).some(function (g) { return API.genres(item).indexOf(g) >= 0; });
      }));
      if (related.length) { row('More like this', related, scroll, 'related'); }
    }
    Focus.scope(app, app.querySelector('.detail-copy button'));
  }
  function position() {
    var p = state.player;
    return p ? (p.loading ? p.target : API.number(p.video.currentTime) + p.offset) : 0;
  }
  function duration() {
    var p = state.player;
    return p ? p.duration || API.number(p.video.duration) + p.offset : 0;
  }
  function safePlay() {
    var p = state.player, result;
    if (!p || document.hidden) { return; }
    result = p.video.play();
    if (result && result.catch) { result.catch(function () { toast('Press OK to start playback.'); }); }
  }
  function pendingProgress() {
    try { return JSON.parse(localStorage.getItem('vidlock_pending_progress') || '{}'); } catch (e) { return {}; }
  }
  function flushProgress() {
    var pending = pendingProgress(), server = state.server;
    Object.keys(pending).forEach(function (key) {
      var record = pending[key];
      if (record.server !== server) { return; }
      request(API.paths.progress, 'PUT', record.body, function (error) {
        if (error) { return; }
        var latest = pendingProgress();
        if (latest[key] && latest[key].stamp === record.stamp) {
          delete latest[key]; try { localStorage.setItem('vidlock_pending_progress', JSON.stringify(latest)); } catch (e) { /* best effort */ }
        }
      });
    });
  }
  function saveProgress() {
    var p = state.player, pos = position(), total = duration();
    if (!p || !total || pos < 5) { return; }
    var pending = pendingProgress(), key = state.server + '|' + p.media.id;
    pending[key] = { server: state.server, stamp: Date.now(), body: API.progressBody(p.media.id, pos, total) };
    try { localStorage.setItem('vidlock_pending_progress', JSON.stringify(pending)); }
    catch (e) { toast('Local progress backup unavailable.'); }
    request(API.paths.progress, 'PUT', pending[key].body, function (error) {
      if (error) { toast('Progress saved on TV; server retry will happen automatically.'); return; }
      var latest = pendingProgress();
      if (latest[key] && latest[key].stamp === pending[key].stamp) {
        delete latest[key]; try { localStorage.setItem('vidlock_pending_progress', JSON.stringify(latest)); } catch (e) { /* best effort */ }
      }
    });
    state.library.forEach(function (item) { if (item.id === p.media.id) { item.watch_progress = pos; } });
    if (state.detail && state.detail.id === p.media.id) { state.detail.watch_progress = pos; }
    state.home = null;
  }
  function source(start, play) {
    var p = state.player;
    if (!p) { return; }
    clearTimeout(p.loadTimer);
    p.target = Math.max(0, Math.floor(start)); p.loading = true; p.wantPlay = play;
    p.video.pause();
    p.offset = p.mode === 'hls' && API.hlsRelativeTimeline ? p.target : 0;
    p.video.src = url(p.mode === 'hls' ? API.paths.hls(p.media.id, p.audio, p.target) : API.paths.direct(p.media.id));
    p.video.load();
    p.status.textContent = 'Loading ' + (p.mode === 'hls' ? 'native HLS' : 'direct stream') + '…';
    p.loadTimer = setTimeout(function () {
      if (state.player !== p || !p.loading) { return; }
      if (p.mode === 'direct') { p.mode = 'hls'; toast('Direct playback timed out. Trying HLS.'); source(p.target, p.wantPlay); }
      else { p.status.textContent = 'Stream timed out. Press Up for Retry or Back to exit.'; showControls(); }
    }, 30000);
  }
  function seek(target) {
    var p = state.player, total = duration(), local, ranges, i;
    if (!p) { return; }
    target = Math.max(0, total ? Math.min(total - 0.25, target) : target);
    local = target - p.offset; ranges = p.video.seekable;
    if (!p.loading && local >= 0) {
      for (i = 0; i < ranges.length; i += 1) {
        if (local >= ranges.start(i) && local <= ranges.end(i)) {
          p.target = target; p.video.currentTime = local; return;
        }
      }
    }
    source(target, p.wantPlay);
  }
  function playerAction(type, target) {
    var p = state.player;
    if (!p) { return; }
    if (state.party) {
      if (!state.socket || !state.socket.connected) { toast('Party connection lost; waiting to reconnect.'); return; }
      if (!state.party.isHost) { toast('The host controls party playback.'); return; }
      state.socket.emit('playback-event', API.playbackPayload(state.party.code, p.media.id, type, type === 'seek' ? target : position()));
      return; /* Apply the server broadcast, including ready checks. */
    }
    if (type === 'seek') { seek(target); }
    else { p.wantPlay = type === 'play'; if (p.wantPlay) { safePlay(); } else { p.video.pause(); saveProgress(); } }
  }
  function showControls() {
    if (!state.player) { return; }
    app.classList.add('controls-visible');
    state.player.controls.classList.remove('hidden'); Focus.scope(state.player.controls, state.player.playBtn); scheduleHide();
  }
  function scheduleHide() {
    var p = state.player;
    if (!p) { return; }
    clearTimeout(p.hideTimer);
    if (!modal.classList.contains('hidden')) { return; }
    p.hideTimer = setTimeout(function () { if (state.player === p && modal.classList.contains('hidden')) { hideControls(); } }, 6000);
  }
  function hideControls() {
    if (!state.player) { return; }
    clearTimeout(state.player.hideTimer);
    app.classList.remove('controls-visible');
    state.player.controls.classList.add('hidden'); Focus.scope(state.player.controls);
  }
  function startPlayer(id, start, partyState) {
    if (state.party && Number(id) !== Number(state.party.mediaId)) { toast('Leave this party before playing another title.'); return; }
    state.detailFocus = Focus.current();
    switchScreen('player'); var generation = state.generation;
    el('p', 'loading', 'Preparing playback…', app);
    button('Back', app, function () { if (state.detail) { renderDetail(); } else { showHome(); } }); Focus.scope(app);
    request(API.paths.detail(id), 'GET', null, function (error, data) {
      if (state.generation !== generation) { return; }
      if (error) { toast(error.message); if (state.detail) { renderDetail(); } else { showHome(); } return; }
      var media = API.detail(data);
      if (media.available === 0) { toast('This media is offline.'); if (state.detail) { renderDetail(); } else { showHome(); } return; }
      if (!state.detail) { state.detail = media; }
      request('/api/media-info?id=' + encodeURIComponent(id), 'GET', null, function (probeError, info) {
        if (state.generation !== generation) { return; }
        buildPlayer(media, start === undefined ? API.progress(media).position : start, 'direct', partyState);
      });
    });
  }
  function buildPlayer(media, start, mode, partyState) {
    app.innerHTML = '';
    var video = el('video', 'video', null, app);
    video.preload = 'auto'; video.setAttribute('playsinline', '');
    var controls = el('section', 'controls player-overlay', null, app);
    var topBar = el('div', 'player-topbar', null, controls);
    action('Exit player', topBar, exitPlayer, 'player-top', 'player-back-btn', 'back');
    var titleContainer = el('div', 'player-title-box', null, topBar);
    el('p', 'eyebrow', 'NOW PLAYING', titleContainer); el('h2', '', API.title(media), titleContainer);
    var centerBox = el('div', 'player-center', null, controls);
    var status = el('p', 'player-status muted', '', centerBox);
    var bottomBar = el('div', 'player-bottombar', null, controls);
    var timelineBox = el('div', 'player-timeline-box', null, bottomBar);
    var time = el('p', 'time', '', timelineBox);
    var bar = el('div', 'progress large', null, timelineBox), fill = el('span', '', null, bar);
    bar.setAttribute('data-focusable', 'true');
    bar.setAttribute('data-row', 'player-timeline'); bar.setAttribute('role', 'slider');
    bar.setAttribute('aria-label', 'Playback position'); bar.setAttribute('aria-valuemin', '0');
    bar.onclick = function (e) {
      if (!e.clientX && !e.clientY) { return; }
      var rect = bar.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      playerAction('seek', pct * duration());
    };
    var buttons = el('div', 'player-actions', null, bottomBar);
    state.player = { video: video, media: media, mode: mode, audio: 0, subtitles: [], audioTracks: [],
      offset: 0, target: start, duration: API.progress(media).duration, controls: controls, status: status,
      loading: true, wantPlay: !state.party, captions: [], captionIndex: -1, bar: bar };
    var p = state.player;
    p.caption = el('div', 'captions', '', app);
    action('Subtitles', buttons, function () { trackMenu('subtitles'); }, 'controls', 'circle-btn', 'cc');
    action('Audio', buttons, function () { trackMenu('audio'); }, 'controls', 'circle-btn', 'audio_track');
    action('Chat', buttons, chatMenu, 'controls', 'circle-btn', 'chat');
    action('−10 seconds', buttons, function () { playerAction('seek', Math.max(0, position() - 10)); }, 'controls', 'circle-btn', 'rewind');
    p.playBtn = action('Play / Pause', buttons, function () { playerAction(p.wantPlay ? 'pause' : 'play'); }, 'controls', 'circle-btn', p.wantPlay ? 'pause' : 'play');
    action('+10 seconds', buttons, function () { playerAction('seek', Math.min(duration() || 86400, position() + 10)); }, 'controls', 'circle-btn', 'forward');
    action('Playback mode', buttons, modeMenu, 'controls', 'circle-btn', 'settings');
    action('Restart HLS', buttons, function () {
      var pos = position(); p.mode = 'hls'; toast('Restarting HLS stream...'); source(pos, p.wantPlay);
    }, 'controls', 'circle-btn', 'refresh');
    if (state.detail && state.detail.type === 'show') { action('Episodes', buttons, episodeMenu, 'controls', 'circle-btn', 'movies'); }
    action('Close controls', buttons, hideControls, 'controls', 'circle-btn', 'close');
    p.wakeControls = function () {
      if (state.player !== p || !modal.classList.contains('hidden')) { return; }
      if (p.controls.classList.contains('hidden')) { showControls(); }
      scheduleHide();
    };
    document.addEventListener('mousemove', p.wakeControls);
    p.wakeControls();
    // hint removed
    video.addEventListener('loadedmetadata', function () {
      if (state.player !== p) { return; }
      if (p.mode === 'direct' && p.target) { try { video.currentTime = p.target; } catch (e) { /* retry on canplay */ } }
      if (p.mode === 'direct' && isFinite(video.duration)) { p.duration = video.duration; }
    });
    video.addEventListener('canplay', function () {
      if (state.player !== p) { return; }
      clearTimeout(p.loadTimer);
      if (p.loading && p.mode === 'direct' && Math.abs(video.currentTime - p.target) > 1) {
        try { video.currentTime = p.target; } catch (e) { /* seekability depends on file */ }
      }
      p.loading = false; p.status.textContent = '';
      if (state.party && state.socket && state.socket.connected) {
        state.socket.emit('member-ready', { roomCode: state.party.code });
        if (state.party.startOnReady) { state.party.startOnReady = false; playerAction('play'); }
      }
      if (p.wantPlay) { safePlay(); }
    });
    video.addEventListener('seeked', function () {
      if (state.party && state.socket && state.socket.connected && video.readyState >= 3) {
        state.socket.emit('member-ready', { roomCode: state.party.code });
      }
    });
    video.addEventListener('timeupdate', function () {
      if (state.player !== p) { return; }
      var pos = position(), total = duration();
      fill.style.width = total ? Math.min(100, pos / total * 100) + '%' : '0%';
      time.textContent = clock(pos) + ' / ' + clock(total);
      bar.setAttribute('aria-valuemax', String(total)); bar.setAttribute('aria-valuenow', String(Math.floor(pos)));
      renderCaptions(pos);
    });
    video.addEventListener('waiting', function () { status.textContent = 'Buffering…'; });
    video.addEventListener('playing', function () { 
      status.textContent = '';
      if (p.playBtn) { p.playBtn.innerHTML = ''; icon('pause', p.playBtn); el('span', '', 'Pause', p.playBtn); }
    });
    video.addEventListener('pause', function () { 
      if (p.playBtn) { p.playBtn.innerHTML = ''; icon('play', p.playBtn); el('span', '', 'Play', p.playBtn); }
    });
    video.addEventListener('ended', function () { saveProgress(); p.wantPlay = false; showControls(); status.textContent = 'Playback finished'; });
    video.addEventListener('error', function () {
      if (state.player !== p) { return; }
      clearTimeout(p.loadTimer);
      console.error('[VidLock] Media error', video.error && video.error.code, video.currentSrc);
      if (p.mode === 'direct') { p.mode = 'hls'; toast('Direct playback failed. Trying native HLS.'); source(position(), p.wantPlay); }
      else { status.textContent = 'Native HLS failed (media error ' + (video.error && video.error.code) + '). Check the server and TV inspector.'; showControls(); }
    });
    ['subtitles', 'audio-tracks'].forEach(function (kind) {
      request(API.paths.tracks(kind, media.id), 'GET', null, function (error, data) {
        if (state.player !== p) { return; }
        if (error) { toast(error.message); return; }
        if (kind === 'subtitles') { p.subtitles = API.list(data); } else { p.audioTracks = API.list(data); }
      });
    });
    source(start, !state.party);
    if (partyState) { receiveSync({ type: partyState.isPlaying ? 'play' : 'pause', currentTime: partyState.currentTime }); }
    if (state.party && state.party.latest) { receiveSync(state.party.latest); }
    hideControls();
  }
  function exitPlayer() {
    var p = state.player;
    if (!p) { return; }
    saveProgress();
    if (p.wakeControls) {
      document.removeEventListener('mousemove', p.wakeControls);
      document.removeEventListener('keydown', p.wakeControls);
      clearTimeout(p.hideTimer);
    }
    if (state.party && state.party.isHost && state.socket && state.socket.connected) {
      state.socket.emit('playback-event', API.playbackPayload(state.party.code, p.media.id, 'pause', position()));
    }
    clearTimeout(p.loadTimer); clearTimeout(syncTimer);
    state.player = null; p.video.pause(); p.video.removeAttribute('src'); p.video.load();
    if (state.party) { leaveParty(); }
    if (state.detail) { renderDetail(); } else { showHome(); }
  }
  function episodeMenu() {
    if (!state.detail || state.detail.type !== 'show') { return; }
    var box = dialog('Select Episode');
    var scroll = el('div', 'episode-grid scroller', null, box);
    var episodes = API.episodes(state.detail, state.library);
    if (!episodes.length) { el('p', 'muted', 'No episodes found.', box); return; }
    episodes.forEach(function (episode, index) {
      var tile = button('', scroll, function () { hideModal(); startPlayer(episode.id); }, 'episode-popup-' + Math.floor(index / 4), 'episode');
      var shot = el('span', 'episode-visual', '', tile);
      var img = image(episode.episode_thumbnail || API.backdrop(episode) || API.poster(state.detail), shot, 'episode-art');
      if (!episode.episode_thumbnail) {
        request('/api/episode-thumbnail?id=' + episode.id, 'GET', null, function(err, data) {
          if (!err && data && data.thumbnail) {
            episode.episode_thumbnail = data.thumbnail;
            img.src = url(data.thumbnail);
          }
        });
      }
      var play = el('span', 'episode-play', '', shot); icon('play', play);
      el('span', 'eyebrow', 'EPISODE ' + (episode.episode_start || index + 1), tile);
      el('span', 'episode-name', episode.episode_title || 'Episode ' + (episode.episode_start || index + 1), tile);
    });
    Focus.scope(modal);
  }
  function modeMenu() {
    var box = dialog('Playback mode');
    el('p', 'muted', 'Direct avoids encoding when the TV supports the file. HLS uses the server\'s compatibility pipeline.', box);
    ['direct', 'hls'].forEach(function (mode) {
      var option = button(mode === 'direct' ? 'Try direct streaming' : 'Native HLS', box, function () {
        var pos = position(), p = state.player; p.mode = mode; hideModal(); source(pos, p.wantPlay);
      });
      if (state.player.mode === mode) { option.classList.add('selected'); option.setAttribute('aria-pressed', 'true'); }
    });
    button('Cancel', box, hideModal); Focus.scope(modal);
  }
  function trackMenu(kind) {
    var p = state.player, box = dialog(kind === 'audio' ? 'Audio tracks' : 'Subtitles'), tracks = kind === 'audio' ? p.audioTracks : p.subtitles;
    if (kind !== 'audio') {
      var off = button('Off', box, function () { p.subtitleUrl = ''; p.captions = []; p.caption.textContent = ''; p.subtitleVersion = (p.subtitleVersion || 0) + 1; hideModal(); });
      if (!p.subtitleUrl) { off.classList.add('selected'); off.setAttribute('aria-pressed', 'true'); }
      
      button('Search Online (OpenSubtitles)', box, function () {
        hideModal();
        searchOpenSubtitles();
      });
    }
    if (!tracks.length) { el('p', 'muted', 'No tracks available yet. Close and retry after loading.', box); }
    tracks.forEach(function (track) {
      var option = button(track.label || track.language || ('Track ' + track.index), box, function () {
        hideModal();
        if (kind === 'audio') {
          var pos = position(); p.audio = track.index; p.mode = 'hls'; source(pos, p.wantPlay);
        } else {
          p.subtitleVersion = (p.subtitleVersion || 0) + 1; var version = p.subtitleVersion;
          request(track.url, 'GET', null, function (error, text) {
            if (state.player !== p || p.subtitleVersion !== version) { return; }
            if (error) { toast('Subtitle load failed. Bitmap subtitles require server conversion or burn-in.'); return; }
            p.subtitleUrl = track.url; p.captions = parseVTT(text); p.caption.textContent = '';
            if (!p.captions.length) { toast('No WebVTT cues found in this subtitle track.'); }
          }, true);
        }
      });
      if (kind === 'audio' ? Number(p.audio) === Number(track.index) : p.subtitleUrl === track.url) { option.classList.add('selected'); option.setAttribute('aria-pressed', 'true'); }
    });
    button('Close', box, hideModal); Focus.scope(modal);
  }
  
  function searchOpenSubtitles() {
    var p = state.player;
    var box = dialog('Searching OpenSubtitles...');
    el('p', 'muted', 'Searching for subtitles...', box);
    button('Cancel', box, hideModal);
    Focus.scope(modal);

    request('/api/subtitles/search?id=' + p.media.id, 'GET', null, function (err, data) {
      if (err || data.error) {
        hideModal();
        toast('OpenSubtitles error: ' + (data && data.error ? data.error : 'Unknown error'));
        return;
      }
      
      hideModal();
      var resultBox = dialog('OpenSubtitles Results');
      
      if (!data.results || !data.results.length) {
        el('p', 'muted', 'No subtitles found.', resultBox);
        button('Close', resultBox, hideModal);
        Focus.scope(modal);
        return;
      }

      data.results.forEach(function(sub) {
        var lang = sub.language || 'Unknown';
        var name = sub.name || 'Subtitle';
        var fileId = sub.file_id;
        
        if (fileId) {
          button('[' + lang + '] ' + name, resultBox, function() {
            hideModal();
            toast('Downloading subtitle to server...');
            
            var body = {
              mediaId: p.media.id,
              file_id: fileId,
              language: lang,
              subName: name
            };
            
            request('/api/subtitles/download', 'POST', body, function (error, resData) {
              if (error || (resData && resData.error)) { 
                toast('Failed to download subtitle: ' + (resData && resData.error ? resData.error : 'Unknown error'));
                return;
              }
              
              toast('Subtitle downloaded! Refreshing tracks...');
              request('/api/subtitles?id=' + p.media.id, 'GET', null, function (err, tracksData) {
                if (!err && tracksData) {
                  p.subtitles = Array.isArray(tracksData) ? tracksData : [];
                  toast('Subtitle ready! You can now select it from the Subtitles menu.');
                }
              });
            });
          });
        }
      });
      button('Close', resultBox, hideModal);
      Focus.scope(modal);
    });
  }
  
  /* Render WebVTT against absolute file time: native <track> timing is wrong
     after an HLS restart at /start/. Cue markup is removed, never injected. */
  function parseVTT(text) {
    var cues = [];
    function seconds(value) {
      var parts = value.replace(',', '.').split(':'), result = 0;
      parts.forEach(function (part) { result = result * 60 + Number(part); }); return result;
    }
    text.replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split('\n'), index, match;
      for (index = 0; index < lines.length; index += 1) {
        match = lines[index].match(/^([\d:.]+)\s+-->\s+([\d:.]+)/);
        if (match) {
          cues.push({ start: seconds(match[1]), end: seconds(match[2]), text: lines.slice(index + 1).join('\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim() }); break;
        }
      }
    });
    return cues.sort(function (a, b) { return a.start - b.start; });
  }
  function renderCaptions(pos) {
    var p = state.player, lines = [], i;
    for (i = 0; i < p.captions.length; i += 1) {
      if (p.captions[i].start > pos) { break; }
      if (p.captions[i].end > pos) { lines.push(p.captions[i].text); }
    }
    var text = lines.join('\n'); if (p.caption.textContent !== text) { p.caption.textContent = text; }
  }

  function connectSocket(done) {
    if (state.socket && state.socket.connected) { done(); return; }
    if (!window.io) { toast('Socket.IO bundle missing. Check vendor/socket.io.min.js.'); done(new Error('Missing Socket.IO')); return; }
    if (state.socket) { state.socket.disconnect(); }
    var socket = window.io(state.server, API.socketOptions), completed = false;
    state.socket = socket;
    var connectTimer = setTimeout(function () { if (!completed) { completed = true; done(new Error('Party connection timed out')); } }, 12000);
    socket.on('connect', function () {
      clearTimeout(connectTimer);
      var sent = Date.now(); socket.emit('ping');
      socket.once('pong', function (serverTime) { state.clockOffset = Number(serverTime) - (sent + Date.now()) / 2; });
      if (!completed) { completed = true; done(); }
      else if (state.party) {
        var code = state.party.code;
        socket.emit('rejoin-room', { roomCode: code, name: state.party.name }, function (reply) {
          if (!state.party || state.party.code !== code) { return; }
          if (!reply.success) { toast(reply.error || 'Room expired'); leaveParty(); return; }
          state.party.isHost = reply.isHost; state.party.members = reply.members;
          receiveSync({ type: reply.state.isPlaying ? 'play' : 'pause', currentTime: reply.state.currentTime });
          if (state.player && state.player.video.readyState >= 3) { socket.emit('member-ready', { roomCode: code }); }
          toast('Reconnected to party.');
        });
      }
    });
    socket.on('connect_error', function (error) { console.error('[VidLock] Socket connection', error.message); });
    socket.on('disconnect', function () {
      if (state.party) {
        if (state.player) { state.player.wantPlay = false; state.player.video.pause(); }
        toast('Party disconnected. Playback paused while reconnecting.');
      }
    });
    socket.on('playback-sync', receiveSync);
    socket.on('sync-tick', function (data) {
      if (state.party && !state.party.isHost) { receiveSync({ type: data.isPlaying ? 'play' : 'pause', currentTime: data.currentTime, tick: true }); }
    });
    socket.on('waiting-for-ready', function () {
      if (state.player && state.party) {
        state.player.wantPlay = false; state.player.video.pause(); state.player.status.textContent = 'Waiting for party members to buffer…';
        if (!state.player.loading && !state.player.video.seeking && state.player.video.readyState >= 3) {
          socket.emit('member-ready', { roomCode: state.party.code });
        }
      }
    });
    socket.on('all-ready', function (data) {
      receiveSync({ type: data.state.isPlaying ? 'play' : 'pause', currentTime: data.state.currentTime });
    });
    socket.on('party-started', function () { if (state.party) { state.party.started = true; startPartyPlayback(); } });
    socket.on('join-approved', function (data) {
      if (!state.pendingCode) { return; }
      acceptParty(state.pendingCode, data, false, true);
    });
    socket.on('join-declined', function (data) { state.pendingCode = null; toast('Join request ' + data.reason); if (!modal.classList.contains('hidden')) { hideModal(); } });
    socket.on('join-requested', function (data) {
      if (!state.party || !state.party.isHost) { return; }
      state.party.requests = state.party.requests || []; state.party.requests.push(data); showJoinRequest();
    });
    socket.on('join-request-cancelled', function (data) {
      if (!state.party) { return; }
      state.party.requests = (state.party.requests || []).filter(function (r) { return r.requestId !== data.requestId; });
      if (modal.getAttribute('data-request') === data.requestId) { hideModal(); modal.removeAttribute('data-request'); showJoinRequest(); }
    });
    socket.on('you-are-host', function (data) { if (state.party) { state.party.isHost = true; state.party.members = data.members; toast('You are now the party host.'); } });
    ['member-joined', 'member-left', 'host-changed', 'member-ready-update'].forEach(function (event) {
      socket.on(event, function (data) { if (state.party) { state.party.members = data.members; updateMembers(); } });
    });
    socket.on('new-message', function (data) { state.chat.push(data); state.chat = state.chat.slice(-50); updateChat(); });
  }
  function receiveSync(data) {
    if (!state.party) { return; }
    state.party.latest = data;
    var p = state.player;
    if (!p) { return; }
    clearTimeout(syncTimer);
    var sync = API.sync(data), delay = data.playAtServerTime ? Math.max(0, Math.min(1000, data.playAtServerTime - (Date.now() + state.clockOffset))) : 0;
    function apply() {
      if (state.player !== p || !state.party) { return; }
      if (sync.action === 'seek') { p.wantPlay = false; p.video.pause(); seek(sync.position); }
      else {
        p.wantPlay = sync.action === 'play';
        if (Math.abs(position() - sync.position) > (data.tick ? 2 : 0.75)) { seek(sync.position); }
        if (p.wantPlay && !p.loading) { safePlay(); } else if (!p.wantPlay) { p.video.pause(); }
      }
    }
    /* Seek/pause must take effect before the immediately following ready event. */
    if (sync.action === 'play' && delay) { syncTimer = setTimeout(apply, delay); } else { apply(); }
  }
  function leaveParty() {
    roomGeneration += 1;
    clearTimeout(syncTimer); clearTimeout(roomTimer); roomBusy = false;
    state.party = null; state.pendingCode = null; state.chat = [];
    if (state.socket) { state.socket.disconnect(); state.socket = null; }
  }
  function roomCall(event, payload, done) {
    if (roomBusy) { return; } roomBusy = true;
    var generation = roomGeneration;
    connectSocket(function (error) {
      if (generation !== roomGeneration) { return; }
      if (error) { roomBusy = false; toast(error.message); return; }
      var finished = false;
      roomTimer = setTimeout(function () { if (!finished) { finished = true; roomBusy = false; toast('Room request timed out. Try again.'); leaveParty(); } }, 12000);
      state.socket.emit(event, payload, function (reply) {
        if (finished || generation !== roomGeneration) { return; } finished = true; clearTimeout(roomTimer); roomBusy = false; done(reply);
      });
    });
  }
  function partyMenu(selected) {
    var box = dialog('Watch Party');
    if (state.party) {
      el('div', 'room-code', state.party.code, box);
      el('p', 'muted', state.party.isHost ? 'You are the host. Share this code with your friends.' : 'The host controls playback.', box);
      el('p', 'members', '', box); updateMembers();
      if (state.party.isHost) { button('Start watching', box, function () { state.socket.emit('party-started', { roomCode: state.party.code }); }); }
      else if (state.party.started) { button('Return to player', box, startPartyPlayback); }
      button('Leave party', box, function () { leaveParty(); hideModal(); });
      button('Close', box, hideModal); Focus.scope(modal); return;
    }
    var name = input('Your name', 'TV-' + Math.floor(1000 + Math.random() * 9000), box, 32);
    var code = input('Room code', '', box, 6);
    button('Join room', box, function () {
      var value = code.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(value) || !name.value.trim()) { toast('Enter your name and a six-character room code.'); return; }
      state.partyName = name.value.trim();
      roomCall('join-room', API.roomPayload(value, state.partyName), function (reply) {
        if (reply.status === 'pending') {
          state.pendingCode = value; var waiting = dialog('Waiting for host approval');
          el('p', 'muted', 'Your request was sent to the host.', waiting);
          button('Cancel request', waiting, function () { leaveParty(); hideModal(); }); Focus.scope(modal);
        } else if (!reply.success) { toast(reply.error || 'Could not join room'); }
        else { acceptParty(value, reply, false, false); }
      });
    });
    button(selected && selected.id ? 'Create party for this title' : 'Choose a title to host', box, function () {
      if (!name.value.trim()) { toast('Enter your name.'); return; }
      state.partyName = name.value.trim();
      if (selected && selected.id) { createParty(selected); return; }
      var choose = dialog('Choose what to watch'), items = API.group(state.library), index = 0;
      function addChoices() {
        var end = Math.min(index + 30, items.length);
        for (; index < end; index += 1) { (function (item) { button(API.title(item), choose, function () { createParty(item); }); }(items[index])); }
        if (index < items.length) { var more = button('More titles', choose, function () { choose.removeChild(more); addChoices(); Focus.scope(modal); }); }
      }
      if (!items.length) { el('p', 'muted', 'Load your library first.', choose); }
      addChoices(); button('Cancel', choose, hideModal); Focus.scope(modal);
    });
    button('Close', box, hideModal); Focus.scope(modal);
  }
  function createParty(item) {
    roomCall('create-room', { mediaId: item.id, hostName: state.partyName }, function (reply) {
      if (!reply.success) { toast(reply.error || 'Could not create party'); return; }
      acceptParty(reply.roomCode, { mediaId: reply.room.mediaId, members: reply.room.members }, true, false);
    });
  }
  function acceptParty(code, data, host, started) {
    state.pendingCode = null;
    state.party = { code: code, mediaId: data.mediaId, name: state.partyName, isHost: host,
      members: data.members || [], started: started, latest: data.state ? { type: data.state.isPlaying ? 'play' : 'pause', currentTime: data.state.currentTime } : null };
    state.chat = data.messages || [];
    if (started) { startPartyPlayback(); } else { partyMenu(); }
  }
  function startPartyPlayback() {
    if (!state.party) { return; }
    if (state.player) { hideModal(); return; }
    var latest = state.party.latest;
    if (state.party.isHost && !latest) { state.party.latest = { type: 'play', currentTime: 0 }; }
    hideModal(); startPlayer(state.party.mediaId, latest ? latest.currentTime : 0);
    /* canplay initiates host play after the media is ready. */
    state.party.startOnReady = state.party.isHost && !latest;
  }
  function updateMembers() {
    var node = modal.querySelector('.members');
    if (node && state.party) { node.textContent = state.party.members.map(function (m) { return m.name + (m.isHost ? ' (host)' : ''); }).join(' · '); }
  }
  function showJoinRequest() {
    if (!state.party || !(state.party.requests || []).length) { return; }
    var req = state.party.requests[0], box = dialog('Join request');
    modal.setAttribute('data-request', req.requestId); el('p', '', req.guestName + ' wants to join your party.', box);
    function answer(event) {
      if (!state.party) { return; }
      state.socket.emit(event, { roomCode: state.party.code, requestId: req.requestId });
      state.party.requests.shift(); hideModal(); modal.removeAttribute('data-request'); showJoinRequest();
    }
    button('Allow', box, function () { answer('approve-join'); });
    button('Decline', box, function () { answer('decline-join'); }); Focus.scope(modal);
  }
  function chatMenu() {
    if (!state.party) { toast('Join or create a Watch Party to chat.'); return; }
    if (modal.querySelector('.chat-log')) { hideModal(); return; }
    var box = dialog('Party chat · ' + state.party.code);
    el('div', 'chat-log scroller', '', box); updateChat();
    var field = input('Message', '', box, 200);
    button('Send', box, function () {
      var text = field.value.trim();
      if (!state.socket || !state.socket.connected) { toast('Chat is offline.'); return; }
      if (text) { state.socket.emit('chat-message', API.chatPayload(state.party.code, text)); field.value = ''; }
    });
    button('Close', box, hideModal); Focus.scope(modal);
  }
  function updateChat() {
    var log = modal.querySelector('.chat-log');
    if (!log) { return; }
    log.innerHTML = '';
    state.chat.forEach(function (message) { el('p', '', (message.name || '') + ': ' + (message.text || ''), log); });
    log.scrollTop = log.scrollHeight;
  }

  document.addEventListener('keydown', function (event) {
    var key = event.keyCode, active = document.activeElement;
    if (active && /INPUT|TEXTAREA/.test(active.tagName)) {
      if (key === 13 || key === 461 || key === 27) { event.preventDefault(); active.blur(); Focus.set(active); }
      return;
    }
    if (key === 406) { event.preventDefault(); chatMenu(); return; }
    if (!modal.classList.contains('hidden')) {
      if (key === 461 || key === 27) {
        event.preventDefault();
        if (state.pendingCode || roomBusy) { leaveParty(); }
        hideModal();
      } else if (key >= 37 && key <= 40) { event.preventDefault(); Focus.move(key); }
      else if (key === 13) { event.preventDefault(); Focus.click(); }
      return;
    }
    if (state.screen === 'player' && state.player) {
      if (!state.player.controls.classList.contains('hidden')) { scheduleHide(); }
      if (key === 415 || key === 19) { event.preventDefault(); playerAction(key === 415 ? 'play' : 'pause'); return; }
      if (key === 461 || key === 27) { 
        event.preventDefault(); 
        if (!state.player.controls.classList.contains('hidden')) { hideControls(); } 
        else { exitPlayer(); }
        return; 
      }
      if (state.player.controls.classList.contains('hidden')) {
        if (key === 13) { event.preventDefault(); playerAction(state.player.wantPlay ? 'pause' : 'play'); }
        else if (key === 37 || key === 39) { event.preventDefault(); playerAction('seek', Math.max(0, Math.min(duration() || 86400, position() + (key === 37 ? -10 : 10)))); }
        else if (key === 38 || key === 40) { event.preventDefault(); showControls(); }
        return;
      }
    }
    if (key >= 37 && key <= 40) {
      if (state.screen === 'player' && state.player && state.player.bar.classList.contains('focused') && (key === 37 || key === 39)) {
        event.preventDefault(); playerAction('seek', Math.max(0, Math.min(duration() || 86400, position() + (key === 37 ? -15 : 15)))); return;
      }
      event.preventDefault(); Focus.move(key);
    }
    else if (key === 13) { event.preventDefault(); Focus.click(); }
    else if (key === 461 || key === 27) {
      event.preventDefault();
      if (state.screen === 'detail') { returnToBrowse(); }
      else if (state.screen === 'browse' || state.screen === 'config' || state.screen === 'player') { showHome(); }
      else {
        var box = dialog('Exit VidLock?');
        button('Stay', box, hideModal); button('Exit', box, function () { leaveParty(); window.close(); }); Focus.scope(modal);
      }
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.player) {
      saveProgress();
      if (state.party && state.party.isHost) { playerAction('pause'); }
      state.player.wantPlay = false; state.player.video.pause();
    }
    if (!document.hidden) { flushProgress(); }
  });
  window.addEventListener('beforeunload', function () { saveProgress(); leaveParty(); });
  heroTimer = setInterval(function () {
    var focused = Focus.current(), hero = state.home && state.home.querySelector('.hero');
    if (state.screen !== 'home' || document.hidden || !modal.classList.contains('hidden') || !hero || (focused && hero.contains(focused))) { return; }
    if (state.hero.length) { state.heroIndex = (state.heroIndex + 1) % state.hero.length; renderHero(); }
  }, 8000);
  setInterval(function () { if (state.player) { saveProgress(); } else { flushProgress(); } }, 15000);
  try { state.server = localStorage.getItem('vidlock_server_url') || ''; } catch (e) { /* show setup */ }
  /* Read-only diagnostics for the TV Web Inspector. */
  window.VidLock = { state: state, parseVTT: parseVTT, position: position, duration: duration };
  if (state.server) { loadHome(); } else { config(); }
}());
