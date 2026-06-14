// app.jsx — root: state, routing, tweaks, modal, toasts
(function () {
  const { useState, useEffect, useCallback } = React;
  const Icon = window.Icon;
  const M = window.MOCK;
  const {
    Sidebar, Topbar, AddScreenModal, ToastHost, LoginScreen,
    Dashboard, ScreensPage, ContentPage, PlaylistsPage, SchedulesPage, GroupsPage, AuditPage, StreamsPage, SettingsPage,
    SwitchOrgModal, UserSettingsPage, InstanceAdmin,
    useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakRow, TweakToggle,
  } = window;

  const ORGS = [
    { id: 'example', name: 'ExampleOrg', role: 'Admin', grad: 'linear-gradient(135deg,#6d6cf6,#a855f7)' },
    { id: 'testorg2', name: 'TestOrg2', role: 'Admin', grad: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
  ];

  const ACCENTS = [['indigo', '#6d6cf6'], ['teal', '#14b8a6'], ['blue', '#3b82f6'], ['amber', '#f59e0b']];

  function AccentSwatches({ value, onChange }) {
    return (
      <TweakRow label="Accent">
        <div style={{ display: 'flex', gap: 8 }}>
          {ACCENTS.map(([name, hex]) => (
            <button key={name} type="button" title={name} onClick={() => onChange(name)}
              style={{ width: 26, height: 26, borderRadius: 8, cursor: 'pointer', background: hex,
                border: value === name ? '2px solid #fff' : '2px solid transparent',
                boxShadow: value === name ? `0 0 0 2px ${hex}` : 'none', display: 'grid', placeItems: 'center' }}>
                {value === name && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>}
            </button>
          ))}
        </div>
      </TweakRow>
    );
  }

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "dark",
    "accent": "indigo",
    "density": "regular",
    "dataState": "onboarding"
  }/*EDITMODE-END*/;

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [authed, setAuthed] = useState(() => localStorage.getItem('mns_authed') === '1');
    const [route, setRoute] = useState('dashboard');
    const [collapsed, setCollapsed] = useState(false);
    const [adminMode, setAdminMode] = useState(false);
    const [modal, setModal] = useState(null);
    const [toasts, setToasts] = useState([]);

    // account / organisation state
    const [orgId, setOrgId] = useState('example');
    const org = ORGS.find((o) => o.id === orgId) || ORGS[0];
    const [profile, setProfile] = useState({
      name: 'TestUser',
      email: 'test@example.com',
      gravatar: true,
      channels: { inApp: true, email: false, ntfy: false },
    });
    const user = { name: profile.name, email: profile.email, gravatar: profile.gravatar };

    const [seeded, setSeeded] = useState(t.dataState === 'filled');
    const [liveScreens, setLiveScreens] = useState([]);
    const [steps, setSteps] = useState({ screen: false, content: false, playlist: false, schedule: false });

    // sync theme/accent/density to <html>
    useEffect(() => {
      const r = document.documentElement;
      r.setAttribute('data-theme', t.theme);
      r.setAttribute('data-accent', t.accent);
      r.setAttribute('data-density', t.density);
    }, [t.theme, t.accent, t.density]);

    const signIn = useCallback(() => { localStorage.setItem('mns_authed', '1'); setAuthed(true); setRoute('dashboard'); }, []);
    const signOut = useCallback(() => { localStorage.removeItem('mns_authed'); setAuthed(false); }, []);

    const switchOrg = useCallback((id) => {
      setOrgId(id);
      setModal(null);
      const o = ORGS.find((x) => x.id === id);
      notify({ title: 'Switched organisation', desc: `Now managing ${o.name}`, tone: 'accent', icon: 'Building' });
    }, []);

    // sync dataState tweak -> seeded
    useEffect(() => { setSeeded(t.dataState === 'filled'); }, [t.dataState]);

    const notify = useCallback((toast) => {
      const id = 'tt' + Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ...toast }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3400);
    }, []);

    // derived collections
    const screens = seeded ? [...liveScreens, ...M.SCREENS] : liveScreens;
    const content = seeded ? M.CONTENT : [];
    const playlists = seeded ? M.PLAYLISTS : [];
    const schedules = seeded ? M.SCHEDULES : [];
    const activity = seeded ? M.ACTIVITY : [];
    const alerts = seeded ? M.ALERTS : [];

    const loadSample = useCallback(() => {
      setSeeded(true);
      setTweak('dataState', 'filled');
      setSteps({ screen: true, content: true, playlist: true, schedule: true });
      notify({ title: 'Sample workspace loaded', desc: '8 screens, content & schedules added', tone: 'accent', icon: 'Sparkle' });
    }, [setTweak, notify]);

    const addScreen = useCallback((s) => {
      setLiveScreens((prev) => [s, ...prev]);
      setSteps((prev) => ({ ...prev, screen: true }));
      notify({ title: 'Screen paired', desc: `“${s.name}” is now online`, tone: 'online', icon: 'CheckCircle' });
    }, [notify]);

    const completeStep = useCallback((key) => {
      if (key === 'screen') { setModal('addScreen'); return; }
      const labels = { content: ['Content uploaded', 'Sample media added to your library'], playlist: ['Playlist created', 'Your first playlist is ready'], schedule: ['Schedule published', 'Content is going live'] };
      setSteps((prev) => {
        const next = { ...prev, [key]: true };
        const allDone = next.screen && next.content && next.playlist && next.schedule;
        if (allDone) {
          setTimeout(() => {
            setSeeded(true); setTweak('dataState', 'filled');
            notify({ title: 'Setup complete!', desc: 'Welcome to your live dashboard', tone: 'online', icon: 'CheckCircle' });
          }, 650);
        }
        return next;
      });
      notify({ title: labels[key][0], desc: labels[key][1], tone: 'accent', icon: 'CheckCircle' });
    }, [notify, setTweak]);

    const counts = seeded ? {
      screens: screens.length, content: content.length, playlists: playlists.length, schedules: schedules.length,
    } : {};

    const common = { screens, content, playlists, schedules, activity, alerts, seeded,
      onAddScreen: () => setModal('addScreen'), onLoadSample: loadSample, setRoute, notify };

    const PAGES = {
      dashboard: <Dashboard {...common} steps={steps} onStep={completeStep} />,
      screens: <ScreensPage {...common} />,
      groups: <GroupsPage {...common} />,
      content: <ContentPage {...common} />,
      playlists: <PlaylistsPage {...common} />,
      schedules: <SchedulesPage {...common} />,
      streams: <StreamsPage {...common} />,
      audit: <AuditPage {...common} />,
      settings: <SettingsPage {...common} />,
      profile: <UserSettingsPage user={user} profile={profile} setProfile={setProfile}
        notify={notify} onBack={() => setRoute('dashboard')} onLogout={signOut} />,
    };

    if (!authed) {
      return (
        <React.Fragment>
          <LoginScreen onAuth={signIn} />
          <TweaksPanel>
            <TweakSection label="Appearance" />
            <TweakRadio label="Theme" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
            <AccentSwatches value={t.accent} onChange={(v) => setTweak('accent', v)} />
          </TweaksPanel>
        </React.Fragment>
      );
    }

    if (adminMode) {
      return (
        <React.Fragment>
          <InstanceAdmin user={user} theme={t.theme} setTheme={(v) => setTweak('theme', v)}
            onExit={() => setAdminMode(false)} onLogout={signOut} notify={notify} />
          <ToastHost toasts={toasts} />
          <TweaksPanel>
            <TweakSection label="Appearance" />
            <TweakRadio label="Theme" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
            <AccentSwatches value={t.accent} onChange={(v) => setTweak('accent', v)} />
            <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
          </TweaksPanel>
        </React.Fragment>
      );
    }

    return (
      <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar route={route} setRoute={setRoute} collapsed={collapsed} setCollapsed={setCollapsed} counts={counts} onLogout={signOut} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar theme={t.theme} setTheme={(v) => setTweak('theme', v)} alerts={alerts.length}
            onBell={() => setRoute('audit')} onSearch={() => {}}
            user={user} org={org}
            onProfile={() => setRoute('profile')}
            onSwitchOrg={() => setModal('switchOrg')}
            onInstanceAdmin={() => setAdminMode(true)}
            onLogout={signOut} />
          <main key={route + seeded} style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 48px' }}>
            <div style={{ maxWidth: 1320, margin: '0 auto', animation: 'fadeIn .3s ease both' }}>
              {PAGES[route]}
            </div>
          </main>
        </div>

        {modal === 'addScreen' && <AddScreenModal onClose={() => setModal(null)} onAdd={addScreen} />}
        {modal === 'switchOrg' && <SwitchOrgModal orgs={ORGS} current={orgId} onSwitch={switchOrg} onClose={() => setModal(null)} />}
        <ToastHost toasts={toasts} />

        <TweaksPanel>
          <TweakSection label="Appearance" />
          <TweakRadio label="Theme" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
          <AccentSwatches value={t.accent} onChange={(v) => setTweak('accent', v)} />
          <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
          <TweakSection label="Data" />
          <TweakRadio label="Dashboard" value={t.dataState} options={['onboarding', 'filled']} onChange={(v) => setTweak('dataState', v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
