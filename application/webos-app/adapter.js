/* ES5. Contract verified against local-media-server-main server.ts and API routes. */
(function (root) {
  'use strict';
  function list(data, key) {
    if (!data) { return []; }
    if (Array.isArray(data)) { return data; }
    if (key && Array.isArray(data[key])) { return data[key]; }
    if (data.data) { return list(data.data, key); }
    return data.items || data.media || data.results || [];
  }
  function flatten(data) {
    var items = list(data), result = [], groups, key;
    if (Array.isArray(items) && items.length) { return items; }
    groups = data && (data.groups || data);
    for (key in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, key) && Array.isArray(groups[key])) {
        result = result.concat(groups[key]);
      }
    }
    return result;
  }
  function number(value) { value = Number(value); return isFinite(value) && value >= 0 ? value : 0; }
  function id(item) { return item && (item.id !== undefined ? item.id : item.mediaId); }
  function progress(item) {
    return { position: number(item && item.watch_progress), duration: number(item && (item.exactDuration || item.duration || number(item.runtime) * 60)) };
  }
  root.VidLockAPI = {
    list: list, flatten: flatten, id: id, number: number, progress: progress,
    title: function (item) { return item.title || item.name || 'Untitled'; },
    detail: function (data) { return data.media || data.data || data; },
    genres: function (item) {
      var value = item.genres || item.genre || [];
      if (typeof value === 'string') { value = value.split(','); }
      return value.map(function (g) { return typeof g === 'string' ? g.trim() : g.name; });
    },
    poster: function (item) { return item.poster || item.posterPath || item.poster_path || ''; },
    backdrop: function (item) { return item.backdrop || item.backdropPath || item.backdrop_path || item.backdrop_url || ''; },
    plot: function (item) { return item.plot || item.overview || item.description || ''; },
    paths: {
      recent: '/api/recently-added', continuing: '/api/continue-watching', favorites: '/api/favorites',
      media: '/api/media', genres: '/api/genres', progress: '/api/watch-progress',
      detail: function (mediaId) { return '/api/media?id=' + encodeURIComponent(mediaId); },
      tracks: function (kind, mediaId) { return '/api/' + kind + '?id=' + encodeURIComponent(mediaId); },
      direct: function (mediaId) { return '/api/stream?id=' + encodeURIComponent(mediaId); },
      hls: function (mediaId, audio, start) {
        return '/api/hls/' + encodeURIComponent(mediaId) + '/' + encodeURIComponent(audio) + '/' + Math.floor(start) + '/playlist.m3u8';
      }
    },
    /* HLS start is assumed to reset the video timeline to zero. Change to false
       if the server retains the full file's presentation timeline. */
    hlsRelativeTimeline: true,
    progressBody: function (mediaId, position, duration) {
      return { id: mediaId, currentTime: position, duration: duration };
    },
    socketOptions: { path: '/socket.io', transports: ['polling', 'websocket'], timeout: 10000 },
    events: { create: 'create-room', join: 'join-room', playback: 'playback-event',
      sync: 'playback-sync', chat: 'chat-message' },
    roomPayload: function (code, name) { return { roomCode: code, guestName: name }; },
    roomCode: function (data) { return typeof data === 'string' ? data : data && (data.roomCode || data.code); },
    playbackPayload: function (room, mediaId, action, position) {
      return { roomCode: room, type: action, currentTime: position };
    },
    sync: function (data) {
      return { roomCode: data.roomCode, mediaId: data.mediaId, action: data.action || data.type,
        position: number(data.currentTime !== undefined ? data.currentTime : data.position), paused: data.paused };
    },
    chatPayload: function (room, message) { return { roomCode: room, text: message }; },
    group: function (items) {
      var seen = {}, result = [];
      items.forEach(function (item) {
        var key = item.type === 'show' ? 'show:' + (item.omdb_id || item.title) : 'id:' + item.id;
        if (!seen[key]) { seen[key] = true; result.push(item); }
      });
      return result;
    },
    episodes: function (media, items) {
      return items.filter(function (item) {
        return item.type === 'show' && (media.omdb_id ? item.omdb_id === media.omdb_id : item.title === media.title);
      }).sort(function (a, b) { return number(a.season) - number(b.season) || number(a.episode_start) - number(b.episode_start); });
    },
    preferDirect: function (info) {
      return /^(mp4|m4v|mov)$/.test(info.container) && /^(h264|avc)$/.test(info.videoCodec) && /^(aac|mp3)$/.test(info.audioCodec);
    }
  };
}(window));
