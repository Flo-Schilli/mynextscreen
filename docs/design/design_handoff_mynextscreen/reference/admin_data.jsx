// admin_data.jsx — instance-wide mock data for the Instance Admin area.
// Numbers reconcile with the live screenshot: 3 users (2 verified / 1 pending),
// 2 organisations, originals 183.9 MB / 6.0 GB, transcoded 75.1 MB / 6.0 GB,
// host disk 85.2 GB used of 474.4 GB.
(function () {
  const grad = window.MOCK.grad;
  const GB = 1024; // MB per GB

  // ---- Organisations (per-org allocation: 3 GB originals + 3 GB transcoded) ----
  const ORGS = [
    {
      id: 'example', name: 'ExampleOrg', grad: grad('#6d6cf6', '#a855f7'),
      created: 'Jan 8, 2026', plan: 'Business', status: 'active',
      users: 2, screens: 8, screensOnline: 6,
      origUsed: 152.1, origMax: 3 * GB, transUsed: 61.2, transMax: 3 * GB,
      owner: 'alex@exampleorg.com',
    },
    {
      id: 'testorg2', name: 'TestOrg2', grad: grad('#0ea5e9', '#22d3ee'),
      created: 'Jun 11, 2026', plan: 'Trial', status: 'active',
      users: 1, screens: 2, screensOnline: 1,
      origUsed: 31.8, origMax: 3 * GB, transUsed: 13.9, transMax: 3 * GB,
      owner: 'test2@example.com',
    },
  ];

  // ---- Users across the whole instance ----
  const USERS = [
    { id: 'iu1', name: 'Alex Reyes', email: 'alex@exampleorg.com', orgId: 'example',
      role: 'admin', verified: true, instanceAdmin: true, lastActive: '2 min ago', joined: 'Jan 8, 2026', grad: grad('#6d6cf6', '#a855f7') },
    { id: 'iu2', name: 'Mara Okafor', email: 'mara@exampleorg.com', orgId: 'example',
      role: 'editor', verified: true, instanceAdmin: false, lastActive: '1 h ago', joined: 'Feb 2, 2026', grad: grad('#10b981', '#34d399') },
    { id: 'iu3', name: null, email: 'test2@example.com', orgId: 'testorg2',
      role: 'admin', verified: false, instanceAdmin: false, lastActive: '—', joined: 'Jun 11, 2026', grad: grad('#0ea5e9', '#22d3ee') },
  ];

  // ---- Host disk (mount /app/media) ----
  const HOST = {
    mount: '/app/media',
    totalGB: 474.4,
    usedGB: 85.2,
    freeGB: 389.2,
    // breakdown of the used portion (sums to usedGB)
    breakdown: [
      { label: 'Media (originals + transcoded)', gb: 0.25, color: 'var(--accent)' },
      { label: 'Database & system', gb: 12.4, color: 'var(--info)' },
      { label: 'Other host data', gb: 72.55, color: 'var(--text-faint)' },
    ],
  };

  // ---- Instance meta ----
  const META = {
    version: 'v2.8.1',
    channel: 'stable',
    uptime: '23 d 14 h',
    region: 'eu-central-1',
    nodeHealth: 'healthy',
    lastBackup: '4 h ago',
  };

  // ---- Instance-scoped audit (org-level events live in the per-org audit log) ----
  // [minutesAgo, actor, action, tone, icon, org, resource, detail]
  const AUDIT_ROWS = [
    [6,    'Alex Reyes',  'user.invite',      'accent',  'Mail',       'TestOrg2',   'test2@example.com',      'role: Org Admin'],
    [54,   'Alex Reyes',  'org.create',       'online',  'Building',   'TestOrg2',   'TestOrg2',               'plan: Trial · owner test2@example.com'],
    [180,  'Alex Reyes',  'storage.limit',    'warning', 'Storage',    'ExampleOrg', 'Originals + Transcoded', '5.0 GB → 6.0 GB per bucket'],
    [262,  'System',      'transcode.worker', 'info',    'Refresh',    '—',          'Worker pool',            'scaled 2 → 3 workers'],
    [410,  'Alex Reyes',  'instance.settings','info',    'Settings',   '—',          'SMTP relay',             'host smtp.mynextscreen.tv:587'],
    [720,  'System',      'backup.run',       'online',  'Download',   '—',          'Nightly snapshot',       '85.2 GB · 4 m 12 s'],
    [1290, 'Mara Okafor', 'user.verify',      'online',  'CheckCircle','ExampleOrg', 'mara@exampleorg.com',    'email verified'],
    [2150, 'Alex Reyes',  'instance.login',   'neutral', 'Lock',       '—',          'Superuser session',      'Chrome · macOS · 10.0.1.2'],
    [3120, 'System',      'host.disk',        'info',    'Storage',    '—',          '/app/media',             'usage 17.4% → 18.0%'],
    [4880, 'Alex Reyes',  'org.update',       'info',    'Building',   'ExampleOrg', 'ExampleOrg',             'plan: Business'],
    [7320, 'Alex Reyes',  'org.create',       'online',  'Building',   'ExampleOrg', 'ExampleOrg',             'plan: Business · owner alex@exampleorg.com'],
  ];

  // ---- System load over the last 24 hours (hourly samples, oldest → newest) ----
  // CPU spikes correlate with transcoding windows; RAM rises and holds during them.
  const LOAD = {
    hours: 24,
    cores: 8,
    ramTotalGB: 16,
    cpu:  [21, 18, 20, 24, 27, 33, 29, 25, 24, 57, 84, 73, 41, 30, 27, 26, 31, 45, 71, 89, 60, 37, 33, 28, 34],
    ram:  [44, 43, 45, 47, 49, 52, 53, 52, 50, 58, 65, 67, 61, 57, 55, 54, 56, 62, 67, 72, 68, 61, 59, 57, 60],
    // index ranges (into the arrays above) where transcode jobs were running
    transcodeWindows: [[9, 12], [17, 20]],
  };
  LOAD.cpuNow = LOAD.cpu[LOAD.cpu.length - 1];
  LOAD.ramNow = LOAD.ram[LOAD.ram.length - 1];
  LOAD.cpuPeak = Math.max(...LOAD.cpu);
  LOAD.ramPeak = Math.max(...LOAD.ram);

  const NOW = new Date(2026, 5, 14, 16, 44, 0);
  const AUDIT = AUDIT_ROWS.map((r, i) => ({
    id: 'ia' + String(i + 1).padStart(2, '0'),
    t: new Date(NOW.getTime() - r[0] * 60000),
    actor: r[1], action: r[2], tone: r[3], icon: r[4],
    org: r[5], resource: r[6], detail: r[7],
  }));

  window.ADMIN_MOCK = { ORGS, USERS, HOST, META, LOAD, AUDIT, NOW, GB };
})();
