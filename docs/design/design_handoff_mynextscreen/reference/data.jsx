// data.jsx — mock content for myNextScreen prototype
(function () {
  // gradient "thumbnails" simulating now-playing content on screens
  const grad = (a, b, ang = 135) => `linear-gradient(${ang}deg, ${a}, ${b})`;

  const SCREENS = [
    { id: 's1', name: 'Lobby — Main Wall', loc: 'HQ · Ground Floor', status: 'online', orient: 'landscape', res: '3840×2160', uptime: '14d', playing: 'Brand Showreel Q2', thumb: grad('#6d6cf6', '#a855f7'), res2: '4K', lastSeen: 'now' },
    { id: 's2', name: 'Reception Portrait', loc: 'HQ · Ground Floor', status: 'online', orient: 'portrait', res: '1080×1920', uptime: '14d', playing: 'Welcome Loop', thumb: grad('#0ea5e9', '#22d3ee'), res2: 'FHD', lastSeen: 'now' },
    { id: 's3', name: 'Cafeteria Menu', loc: 'HQ · Level 2', status: 'online', orient: 'landscape', res: '1920×1080', uptime: '6d', playing: 'Daily Menu', thumb: grad('#f59e0b', '#f97316'), res2: 'FHD', lastSeen: 'now' },
    { id: 's4', name: 'Store #14 Window', loc: 'Downtown Retail', status: 'warning', orient: 'landscape', res: '1920×1080', uptime: '2d', playing: 'Spring Sale', thumb: grad('#ec4899', '#f43f5e'), res2: 'FHD', lastSeen: '3 min ago' },
    { id: 's5', name: 'Meeting Room Aspen', loc: 'HQ · Level 3', status: 'offline', orient: 'landscape', res: '1920×1080', uptime: '—', playing: '—', thumb: grad('#334155', '#1e293b'), res2: 'FHD', lastSeen: '2 h ago' },
    { id: 's6', name: 'Warehouse Board', loc: 'Logistics Center', status: 'online', orient: 'landscape', res: '1920×1080', uptime: '31d', playing: 'Safety + KPIs', thumb: grad('#14b8a6', '#22d3ee'), res2: 'FHD', lastSeen: 'now' },
    { id: 's7', name: 'Store #22 Counter', loc: 'Westside Mall', status: 'online', orient: 'portrait', res: '1080×1920', uptime: '9d', playing: 'Promo Reel', thumb: grad('#8b5cf6', '#6366f1'), res2: 'FHD', lastSeen: 'now' },
    { id: 's8', name: 'Event Stage LED', loc: 'Conference Hall', status: 'online', orient: 'landscape', res: '5760×1080', uptime: '1d', playing: 'Sponsor Loop', thumb: grad('#10b981', '#84cc16'), res2: 'LED', lastSeen: 'now' },
  ];

  const CONTENT = [
    { id: 'c1', name: 'Brand Showreel Q2', type: 'video', dur: '01:20', size: '248 MB', thumb: grad('#6d6cf6', '#a855f7'), screens: 3,
      orig: 248, renditions: [{ label: '2160p · H.264', size: 96 }, { label: '1080p · H.264', size: 42 }, { label: 'Video wall 2×2 · 4 tiles', size: 88 }], usedPlaylists: ['HQ Lobby Mix'] },
    { id: 'c2', name: 'Welcome Loop', type: 'video', dur: '00:32', size: '88 MB', thumb: grad('#0ea5e9', '#22d3ee'), screens: 1,
      orig: 88, renditions: [{ label: '1080p · H.264', size: 38 }, { label: '720p · H.264', size: 18 }], usedPlaylists: ['HQ Lobby Mix'] },
    { id: 'c3', name: 'Daily Menu Board', type: 'image', dur: '—', size: '4.2 MB', thumb: grad('#f59e0b', '#f97316'), screens: 1,
      orig: 4.2, renditions: [{ label: '1080p · WebP', size: 1.1 }, { label: 'Thumbnail', size: 0.2 }], usedPlaylists: ['Cafeteria Daily'] },
    { id: 'c4', name: 'Spring Sale 50%', type: 'image', dur: '—', size: '6.1 MB', thumb: grad('#ec4899', '#f43f5e'), screens: 4,
      orig: 6.1, renditions: [{ label: '2160p · WebP', size: 2.4 }, { label: '1080p · WebP', size: 1.2 }, { label: 'Thumbnail', size: 0.2 }], usedPlaylists: ['Retail Promotions'] },
    { id: 'c5', name: 'Safety Briefing', type: 'video', dur: '02:10', size: '410 MB', thumb: grad('#14b8a6', '#22d3ee'), screens: 1,
      orig: 410, renditions: [{ label: '1080p · H.264', size: 120 }, { label: '720p · H.264', size: 64 }], usedPlaylists: ['Warehouse Ops'] },
    { id: 'c6', name: 'Quarterly KPIs', type: 'image', dur: '—', size: '2.8 MB', thumb: grad('#10b981', '#84cc16'), screens: 2,
      orig: 2.8, renditions: [{ label: '1080p · WebP', size: 0.9 }, { label: 'Thumbnail', size: 0.2 }], usedPlaylists: [] },
    { id: 'c7', name: 'Sponsor Loop 2026', type: 'video', dur: '03:00', size: '512 MB', thumb: grad('#8b5cf6', '#6366f1'), screens: 1,
      orig: 512, renditions: [{ label: '2160p · H.264', size: 180 }, { label: '1080p · H.264', size: 96 }, { label: 'Video wall 1×3 · 3 tiles', size: 150 }], usedPlaylists: [] },
    { id: 'c8', name: 'Promo Reel — May', type: 'video', dur: '00:45', size: '120 MB', thumb: grad('#f43f5e', '#fb7185'), screens: 2,
      orig: 120, renditions: [{ label: '1080p · H.264', size: 52 }, { label: '720p · H.264', size: 26 }], usedPlaylists: ['Retail Promotions'] },
  ];

  const PLAYLISTS = [
    { id: 'p1', name: 'HQ Lobby Mix', items: 5, dur: '06:30', screens: 2, color: '#6d6cf6' },
    { id: 'p2', name: 'Retail Promotions', items: 8, dur: '11:15', screens: 3, color: '#ec4899' },
    { id: 'p3', name: 'Cafeteria Daily', items: 3, dur: '02:40', screens: 1, color: '#f59e0b' },
    { id: 'p4', name: 'Warehouse Ops', items: 4, dur: '08:00', screens: 1, color: '#14b8a6' },
  ];

  const SCHEDULES = [
    { id: 'sc1', time: '08:00', day: 'Daily', name: 'Morning Welcome', target: 'Reception Portrait', playlist: 'HQ Lobby Mix', color: '#6d6cf6', in: 'in 2 h' },
    { id: 'sc2', time: '11:30', day: 'Daily', name: 'Lunch Menu Switch', target: 'Cafeteria Menu', playlist: 'Cafeteria Daily', color: '#f59e0b', in: 'in 5 h' },
    { id: 'sc3', time: '12:00', day: 'Mon–Sat', name: 'Spring Sale Push', target: '3 retail screens', playlist: 'Retail Promotions', color: '#ec4899', in: 'in 6 h' },
    { id: 'sc4', time: '17:00', day: 'Daily', name: 'Evening Showreel', target: 'Lobby — Main Wall', playlist: 'HQ Lobby Mix', color: '#6d6cf6', in: 'in 11 h' },
  ];

  const ACTIVITY = [
    { id: 'a1', who: 'Mara K.', action: 'published', target: 'Spring Sale Push', icon: 'Schedules', tone: 'accent', t: '12 min ago' },
    { id: 'a2', who: 'System', action: 'flagged offline', target: 'Meeting Room Aspen', icon: 'WifiOff', tone: 'offline', t: '38 min ago' },
    { id: 'a3', who: 'Jon D.', action: 'uploaded', target: 'Promo Reel — May', icon: 'Upload', tone: 'info', t: '1 h ago' },
    { id: 'a4', who: 'Mara K.', action: 'created playlist', target: 'Retail Promotions', icon: 'Playlists', tone: 'accent', t: '2 h ago' },
    { id: 'a5', who: 'System', action: 'transcoded', target: 'Brand Showreel Q2', icon: 'Refresh', tone: 'online', t: '3 h ago' },
    { id: 'a6', who: 'Lena V.', action: 'paired screen', target: 'Event Stage LED', icon: 'Screens', tone: 'online', t: '5 h ago' },
  ];

  const GROUPS = [
    { id: 'g1', name: 'HQ Building', color: '#6d6cf6', icon: 'MapPin', mode: 'split', rows: 2, cols: 2,
      screenIds: ['s1', 's3', 's2', 's5'], content: { label: 'BRAND Q2', bg: grad('#6d6cf6', '#a855f7'), type: 'video' } },
    { id: 'g2', name: 'Retail Stores', color: '#ec4899', icon: 'Globe', mode: 'mirror', rows: 1, cols: 1,
      screenIds: ['s4', 's7'], content: { label: 'SALE 50%', bg: grad('#ec4899', '#f43f5e'), type: 'image' } },
    { id: 'g3', name: 'Logistics', color: '#14b8a6', icon: 'Layers', mode: 'mirror', rows: 1, cols: 1,
      screenIds: ['s6'], content: { label: 'SAFETY', bg: grad('#14b8a6', '#22d3ee'), type: 'video' } },
    { id: 'g4', name: 'Events', color: '#f59e0b', icon: 'Sparkle', mode: 'split', rows: 1, cols: 3,
      screenIds: ['s8'], content: { label: 'SPONSORS', bg: grad('#10b981', '#84cc16'), type: 'video' } },
  ];

  const STREAMS = [
    { id: 'ls1', name: 'Lobby Camera', source: 'rtmp://ingest.mynextscreen.tv/live/lobby-cam', protocol: 'RTMP', quality: '1080p', fps: 30, bitrate: 6.2, latency: 2.1, audio: true, status: 'live', targetMode: 'screens', screenIds: ['s1', 's2'], groupIds: [], uptimeSec: 8073, thumb: grad('#1d4e6b', '#0a1c2e', 150) },
    { id: 'ls2', name: 'Town Hall — Main Stage', source: 'https://cdn.mynextscreen.tv/hls/townhall/index.m3u8', protocol: 'HLS', quality: '1080p', fps: 60, bitrate: 8.4, latency: 4.6, audio: true, status: 'offline', targetMode: 'all', screenIds: [], groupIds: [], uptimeSec: 0, thumb: grad('#43215f', '#160a26', 150) },
    { id: 'ls3', name: 'Warehouse Floor', source: 'srt://10.0.4.22:9000?streamid=floor', protocol: 'SRT', quality: '720p', fps: 30, bitrate: 3.1, latency: 0.8, audio: false, status: 'connecting', targetMode: 'groups', screenIds: [], groupIds: ['g3'], uptimeSec: 0, thumb: grad('#14463d', '#06201c', 150) },
    { id: 'ls4', name: 'Store #14 Window Cam', source: 'rtmp://ingest.mynextscreen.tv/live/store14', protocol: 'RTMP', quality: '720p', fps: 25, bitrate: 0, latency: 0, audio: false, status: 'offline', targetMode: 'screens', screenIds: [], groupIds: [], uptimeSec: 0, thumb: grad('#222a38', '#10141c', 150) },
  ];

  const ALERTS = [
    { id: 'al1', tone: 'offline', title: 'Meeting Room Aspen offline', desc: 'No heartbeat for 2 hours', t: '2 h ago' },
    { id: 'al2', tone: 'warn', title: 'Store #14 Window low signal', desc: 'Reconnecting · 64% uptime today', t: '3 min ago' },
    { id: 'al3', tone: 'warn', title: 'Transcode queue backed up', desc: '2 items pending · est. 4 min', t: '8 min ago' },
  ];

  // ---------- Audit Log ----------
  const A_NOW = new Date(2026, 5, 14, 12, 30, 0); // fixed "now": Jun 14 2026, 12:30
  const mins = (m) => new Date(A_NOW.getTime() - m * 60000);

  const AUDIT_USERS = {
    alex: { name: 'Alex Mercer',  initials: 'AM', grad: grad('#6d6cf6', '#a855f7'), role: 'Admin',      system: false },
    mara: { name: 'Mara Kessler', initials: 'MK', grad: grad('#0ea5e9', '#22d3ee'), role: 'Editor',     system: false },
    jon:  { name: 'Jon Daley',    initials: 'JD', grad: grad('#ec4899', '#f43f5e'), role: 'Editor',     system: false },
    lena: { name: 'Lena Vogt',    initials: 'LV', grad: grad('#10b981', '#84cc16'), role: 'Viewer',     system: false },
    sys:  { name: 'System',       initials: 'SY', grad: grad('#64748b', '#334155'), role: 'Automation', system: true },
  };

  // [offsetMinutes, actorKey, action, resourceType, resource, mono, details, ip, resourceId]
  const A_ROWS = [
    [2,    'mara', 'content.upload',    'Content',      'PXL_20260611_191308598.mp4',     true,  { type: 'video/mp4', size: '192.8 MB' },        '10.0.2.41',   'cnt_9f3a21'],
    [4,    'mara', 'content.upload',    'Content',      'Bildschirmfoto 2026-04-24.png',  true,  { type: 'image/png', size: '34.8 KB' },         '10.0.2.41',   'cnt_9f3a1e'],
    [13,   'mara', 'schedule.publish',  'Schedule',     'Spring Sale Push',               false, { target: '3 retail screens', window: 'Mon–Sat · 12:00' }, '10.0.2.41', 'sch_2c77b0'],
    [19,   'jon',  'playlist.create',   'Playlist',     'Retail Promotions',              false, null,                                            '10.0.5.12',   'pl_b4e019'],
    [27,   'sys',  'content.transcode', 'Content',      'Brand Showreel Q2',              false, { renditions: '3 created', output: '226 MB' },   '127.0.0.1',   'cnt_71aa04'],
    [42,   'sys',  'screen.offline',    'Screen',       'Meeting Room Aspen',             false, { reason: 'no heartbeat · 2 h' },                '127.0.0.1',   'scr_5e0d33'],
    [56,   'lena', 'stream.start',      'Live Stream',  'Lobby Camera',                   false, { protocol: 'RTMP', quality: '1080p' },          '10.0.8.3',    'str_ls1a09'],
    [71,   'jon',  'playlist.update',   'Playlist',     'HQ Lobby Mix',                   false, { change: 'reordered 5 items' },                 '10.0.5.12',   'pl_a1c200'],
    [96,   'lena', 'screen.pair',       'Screen',       'Event Stage LED',                false, { code: '4F2-9KQ', orientation: 'landscape' },   '10.0.8.3',    'scr_8c91ff'],
    [132,  'jon',  'content.upload',    'Content',      'Promo_Reel_May.mp4',             true,  { type: 'video/mp4', size: '120 MB' },           '10.0.5.12',   'cnt_44de77'],
    [176,  'mara', 'schedule.update',   'Schedule',     'Evening Showreel',               false, { change: '17:00 → 18:00' },                     '10.0.2.41',   'sch_91b3aa'],
    [212,  'alex', 'settings.update',   'Settings',     'Default screen behaviour',       false, { change: 'auto-reconnect → on' },               '10.0.1.2',    'set_behav01'],
    [863,  'alex', 'org.update',        'Organisation', 'ExampleOrg',                     false, { change: 'billing email updated' },             '10.0.1.2',    'e2d5722b-7f14-4c0a-9d2e'],
    [881,  'alex', 'user.role',         'User',         'jon@exampleorg.com',             false, { change: 'Editor → Admin' },                    '10.0.1.2',    'usr_jon7711'],
    [1042, 'sys',  'screen.register',   'Screen',       'Warehouse Board',                false, null,                                            '127.0.0.1',   'scr_6b22e1'],
    [1100, 'alex', 'user.invite',       'User',         'test2@example.com',              false, { role: 'editor' },                              '10.0.1.2',    'usr_inv2207'],
    [1182, 'mara', 'content.delete',    'Content',      'Old_Q1_Reel.mp4',                true,  { size: '310 MB freed' },                        '10.0.2.41',   'cnt_01ff90'],
    [1262, 'jon',  'group.update',      'Screen Group', 'Retail Stores',                  false, { change: 'added Store #22 Counter' },           '10.0.5.12',   'grp_2_re77'],
    [1322, 'lena', 'user.login',        'Session',      'lena@exampleorg.com',            false, { device: 'Chrome · macOS' },                    '84.114.20.7', 'ses_lv4410'],
    [1722, 'lena', 'stream.stop',       'Live Stream',  'Town Hall — Main Stage',         false, { duration: '1 h 12 m' },                        '10.0.8.3',    'str_ls2b71'],
    [1860, 'mara', 'playlist.update',   'Playlist',     'Cafeteria Daily',                false, { change: 'swapped menu image' },                '10.0.2.41',   'pl_c3da55'],
    [2010, 'jon',  'content.upload',    'Content',      'Safety_Briefing.mp4',            true,  { type: 'video/mp4', size: '410 MB' },           '10.0.5.12',   'cnt_c5ee10'],
    [2210, 'jon',  'screen.update',     'Screen',       'Store #14 Window',               false, { change: 'orientation → landscape' },           '10.0.5.12',   'scr_4w1408'],
    [2420, 'mara', 'user.login',        'Session',      'mara@exampleorg.com',            false, { device: 'Firefox · Windows' },                 '10.0.2.41',   'ses_mk3320'],
    [2920, 'mara', 'content.upload',    'Content',      'Sponsor_Loop_2026.mov',          true,  { type: 'video/quicktime', size: '512 MB' },     '10.0.2.41',   'cnt_7sp026'],
    [3110, 'mara', 'schedule.publish',  'Schedule',     'Lunch Menu Switch',              false, { target: 'Cafeteria Menu' },                    '10.0.2.41',   'sch_lm1102'],
    [3320, 'alex', 'group.update',      'Screen Group', 'HQ Building',                    false, { change: 'split layout → 2×2' },                '10.0.1.2',    'grp_1_hq01'],
    [3500, 'alex', 'settings.update',   'Settings',     'Storage & transcoding',          false, { change: 'retention 30 → 60 days' },            '10.0.1.2',    'set_stor02'],
  ];

  const AUDIT = A_ROWS.map((r, i) => ({
    id: 'evt' + String(i + 1).padStart(3, '0'),
    eid: 'evt_' + (r[8] ? r[8].replace(/[^a-f0-9]/gi, '').slice(0, 10) : ('x' + i)),
    ts: mins(r[0]),
    actorKey: r[1],
    action: r[2],
    rtype: r[3],
    resource: r[4],
    mono: r[5],
    details: r[6],
    ip: r[7],
    resourceId: r[8],
  }));

  window.MOCK = { SCREENS, CONTENT, PLAYLISTS, SCHEDULES, GROUPS, STREAMS, ACTIVITY, ALERTS, AUDIT, AUDIT_USERS, A_NOW, grad };
})();
