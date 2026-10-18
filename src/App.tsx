import {
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Database,
  FolderPlus,
  Library,
  RefreshCw,
  ShieldCheck,
  Table2,
  UserRound,
  X,
} from 'lucide-react';
import type { Filters } from './domain/model';
import { filterDateError, filterSeries, hasFilters } from './domain/filters';
import { loadWorkspace, saveProfile, type Workspace } from './storage/workspace';
import { getRefreshingSources, refreshEnabledSources, subscribeToRefresh } from './sources/refresh';
import { SourcesDialog } from './components/SourcesDialog';
import { ProfileDialog } from './components/ProfileDialog';
import { CatalogDialog } from './components/CatalogDialog';
import { FilterBar } from './components/FilterBar';
import { AnalysisPanel } from './components/AnalysisPanel';
import { UpdateNotice } from './components/UpdateNotice';

export default function App() {
  const result = useLiveQuery(async () => {
    try {
      return { workspace: await loadWorkspace(), error: false } as const;
    } catch {
      return { workspace: null, error: true } as const;
    }
  }, []);
  if (!result)
    return (
      <main className="loading-screen">
        <Activity size={28} />
        <p>Opening your local workspace…</p>
      </main>
    );
  if (result.error)
    return (
      <main className="loading-screen">
        <h1>Local storage is unavailable</h1>
        <p>
          Allow this site to use browser storage, then reload. Your source files have not been
          changed.
        </p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  return <WorkspaceApp workspace={result.workspace} />;
}

function WorkspaceApp({ workspace }: { workspace: Workspace }) {
  const { sources, catalog, profile, series, shots } = workspace;
  const [dialog, setDialog] = useState<'sources' | 'refresh' | 'profile' | 'catalog' | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [message, setMessage] = useState('');
  const [filters, setOptimisticFilters] = useOptimistic(profile.filters);
  const startupHandled = useRef(false);
  const refreshing = useSyncExternalStore(subscribeToRefresh, getRefreshingSources);
  const filtered = useMemo(() => filterSeries(series, filters), [series, filters]);
  const selectedSeries = useMemo(
    () => filtered.filter((item) => selected.includes(item.id)),
    [filtered, selected],
  );
  const selectedShots = useMemo(() => {
    const ids = new Set(selectedSeries.map((item) => item.id));
    return shots
      .filter((shot) => ids.has(shot.seriesId))
      .sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.number - b.number);
  }, [shots, selectedSeries]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const shot of shots) map.set(shot.seriesId, (map.get(shot.seriesId) ?? 0) + 1);
    return map;
  }, [shots]);
  const catalogNames = new Map(catalog.map((item) => [item.id, item.name]));
  const sourceNames = new Map(sources.map((item) => [item.id, item.name]));
  const lastUpdate = sources
    .map((source) => source.lastSuccessAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);
  const awaiting = sources.filter((source) => source.enabled && source.status !== 'ready').length;

  useEffect(() => {
    if (startupHandled.current) return;
    startupHandled.current = true;
    if (profile.refreshOnStart)
      void refreshEnabledSources().catch(() =>
        setMessage('Refresh could not start. Check local storage.'),
      );
  }, [profile.refreshOnStart]);

  function changeFilters(next: Filters) {
    const visible = new Set(filterSeries(series, next).map((item) => item.id));
    setSelected((current) => current.filter((id) => visible.has(id)));
    startTransition(async () => {
      setOptimisticFilters(next);
      try {
        await saveProfile({ filters: next });
      } catch {
        setMessage('Filters could not be saved. Check local storage.');
      }
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="VelociTrack home">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}brand/favicon.svg`}
            width="44"
            height="44"
            alt=""
          />
          VelociTrack<span className="brand-dot">.</span>
        </a>
        <span className="local-badge">
          <ShieldCheck size={13} />
          LOCAL WORKSPACE
        </span>
        <div className="header-actions">
          <button
            className="profile-button"
            aria-label="Open local profile"
            onClick={() => setDialog('profile')}
          >
            <span>{profile.nickname || 'Local profile'}</span>
            <UserRound size={18} />
          </button>
          <a
            className="icon-button"
            href="https://github.com/tony2kk/velocitrack/blob/main/help/README.md"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Help on GitHub (opens in a new tab)"
          >
            <CircleHelp size={20} />
          </a>
        </div>
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MEASURE. EXPLORE. UNDERSTAND.</p>
          <h1>Your range workspace</h1>
        </div>
        <span className="workspace-count">
          {series.length} series <span> / </span> {shots.length} shots
        </span>
      </div>
      <nav className="toolbar" aria-label="Workspace controls">
        <div className="toolbar-group">
          <span className="group-label">DATA</span>
          <div className="group-controls">
            <button onClick={() => setDialog('sources')}>
              <Database size={16} />
              Sources
            </button>
            <button
              disabled={refreshing.length > 0}
              onClick={async () => {
                setDialog('refresh');
                try {
                  await refreshEnabledSources();
                } catch {
                  setMessage('Refresh could not start. Check local storage.');
                }
              }}
            >
              <RefreshCw size={16} />
              {refreshing.length ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              className="icon-button"
              aria-label="Manage local catalogs"
              title="Local catalogs"
              onClick={() => setDialog('catalog')}
            >
              <Library size={18} />
            </button>
          </div>
        </div>
        <FilterBar filters={filters} sources={sources} catalog={catalog} onChange={changeFilters} />
        <div className="toolbar-group tools-group">
          <span className="group-label">TOOLS</span>
          <div className="segmented">
            <button aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
              <ChartNoAxesCombined size={16} />
              Chart
            </button>
            <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
              <Table2 size={16} />
              Table
            </button>
          </div>
        </div>
      </nav>
      {filterDateError(filters) && (
        <p className="error" role="alert">
          {filterDateError(filters)}
        </p>
      )}
      <main className="workspace-layout">
        <aside className="series-panel" aria-label="Available series">
          <header className="series-heading">
            <h2>
              Series <span>{filtered.length}</span>
            </h2>
            <button
              className="text-button"
              disabled={!filtered.length}
              onClick={() =>
                setSelected(
                  selectedSeries.length === filtered.length ? [] : filtered.map((item) => item.id),
                )
              }
            >
              {selectedSeries.length === filtered.length && filtered.length
                ? 'Clear'
                : 'Select all'}
            </button>
          </header>
          <div className="series-list">
            {filtered.map((item) => (
              <label
                className={`series-card ${selected.includes(item.id) ? 'selected' : ''}`}
                key={item.id}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                />
                <div className="series-card-content">
                  <div className="series-meta">
                    <span>
                      {item.startedAt
                        ? new Date(item.startedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Date unavailable'}
                    </span>
                    <span>{counts.get(item.id) ?? 0} shots</span>
                  </div>
                  <strong>{item.name}</strong>
                  <span>{catalogNames.get(item.firearmId)}</span>
                  <span className="projectile-name">{catalogNames.get(item.projectileId)}</span>
                  <small>
                    <span className="dot" />
                    {sourceNames.get(item.sourceId)}
                  </small>
                </div>
              </label>
            ))}
          </div>
          {!filtered.length && (
            <div className="sidebar-empty">
              <BookOpen size={28} strokeWidth={1.3} />
              <h3>{hasFilters(filters) ? 'No matching series' : 'A clean slate'}</h3>
              <p>
                {hasFilters(filters)
                  ? 'Adjust your filters to find more measurements.'
                  : 'Connect your Caldwell account or import local export files.'}
              </p>
              {!hasFilters(filters) && (
                <button className="primary" onClick={() => setDialog('sources')}>
                  <FolderPlus size={16} />
                  Add a source
                </button>
              )}
            </div>
          )}
          <footer className="series-footer">
            {selectedSeries.length} selected <ChevronRight size={14} />
          </footer>
        </aside>
        <AnalysisPanel series={selectedSeries} shots={selectedShots} view={view} />
      </main>
      <footer className="app-footer">
        <span>
          <span className="dot" />
          Saved on this device
        </span>
        <span>
          {refreshing.length
            ? 'Refreshing sources · '
            : awaiting
              ? `${awaiting} source${awaiting > 1 ? 's need' : ' needs'} attention · `
              : ''}
          {lastUpdate
            ? `Last import ${new Date(lastUpdate).toLocaleString('en-GB')}`
            : 'No imports yet'}
        </span>
        <span className="unofficial">Unofficial community project</span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setMessage('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <UpdateNotice />
      {dialog === 'profile' && (
        <ProfileDialog
          profile={profile}
          sources={sources}
          refreshing={refreshing.length > 0}
          onClose={() => setDialog(null)}
        />
      )}
      {(dialog === 'sources' || dialog === 'refresh') && (
        <SourcesDialog
          sources={sources}
          remember={profile.rememberSignIn}
          mode={dialog === 'sources' ? 'manage' : 'refresh'}
          onClose={() => setDialog(null)}
          onMessage={setMessage}
        />
      )}
      {dialog === 'catalog' && <CatalogDialog items={catalog} onClose={() => setDialog(null)} />}
    </div>
  );
}
