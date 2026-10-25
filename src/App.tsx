import {
  startTransition,
  useCallback,
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
  ChevronRight,
  CircleHelp,
  Database,
  FolderPlus,
  FileDown,
  ArchiveRestore,
  Library,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { SeriesDetails } from './components/SeriesDetails';
import { BackupDialog } from './components/BackupDialog';
import { ReportDialog } from './components/ReportDialog';
import type { ReportHandle, ReportInput } from './reports/types';
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
import { SeriesNavigator } from './components/SeriesNavigator';
import { RefreshProgress } from './components/RefreshProgress';
import { useNotification } from './hooks/useNotification';
import { useShotSelection } from './hooks/useShotSelection';
import { useTheme } from './hooks/useTheme';
import { saveAnalysis } from './storage/analysis';
import { setShotInvalid } from './storage/shots';
import { displayCatalog, projectileName } from './domain/projectiles';
import type { AnalysisMode } from './domain/model';

/** Subscribe to one consistent local workspace snapshot and handle storage startup failures. */
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

/** Coordinate persisted filters, transient comparison selection and workspace dialogs. */
function WorkspaceApp({ workspace }: { workspace: Workspace }) {
  const {
    sources,
    catalog,
    profile,
    series,
    shots,
    annotations,
    fieldDefinitions,
    tags,
    attachments,
  } = workspace;
  const dark = useTheme(profile.theme);
  const [detailId, setDetailId] = useState<string | null>(null);
  const reportHandle = useRef<ReportHandle>(null);
  const [report, setReport] = useState<ReportInput | null>(null);
  const detailSeries = series.find((item) => item.id === detailId);
  const [dialog, setDialog] = useState<
    'sources' | 'refresh' | 'profile' | 'catalog' | 'backup' | null
  >(null);
  const [selected, setSelected] = useState<string[]>([]);
  const { message, showMessage, dismissMessage } = useNotification();
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [activeShotIds, setActiveShotIds] = useState<string[]>([]);
  const activeShotId = activeShotIds[0] ?? null;
  const setActiveShotId = useCallback((id: string | null) => setActiveShotIds(id ? [id] : []), []);
  const [filters, setOptimisticFilters] = useOptimistic(profile.filters);
  const startupHandled = useRef(false);
  const refreshing = useSyncExternalStore(subscribeToRefresh, getRefreshingSources);
  const filtered = useMemo(
    () => filterSeries(series, filters, new Date(), annotations),
    [series, filters, annotations],
  );
  const selectedSeries = useMemo(
    () => filtered.filter((item) => selected.includes(item.id)),
    [filtered, selected],
  );
  const colorOrder = useMemo(
    () => series.map((item) => item.id).sort((a, b) => a.localeCompare(b)),
    [series],
  );
  const invalidShots = useMemo(
    () => new Set(annotations.filter((item) => item.invalid).map((item) => item.entityId)),
    [annotations],
  );
  const { hiddenShots, seriesShots, selectedShots, toggleShot, toggleShots, resetSelection } =
    useShotSelection(shots, selectedSeries, invalidShots);
  /** Undo returns a shot to the transient Analyze selection; provider exclusions still apply. */
  async function invalidateShot(id: string, invalid: boolean) {
    try {
      await setShotInvalid(id, invalid);
      if (!invalid) toggleShot(id, true);
      setActiveShotId(null);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Shot status could not be saved.');
    }
  }
  const catalogNames = new Map(catalog.map((item) => [item.id, item.name]));
  const projectileNames = new Map(
    series.map((item) => [
      item.id,
      projectileName(item, catalogNames, profile.showProjectileWeight ?? false),
    ]),
  );
  const sourceNames = new Map(sources.map((item) => [item.id, item.name]));
  const lastUpdate = sources
    .map((source) => source.lastSuccessAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);
  const awaiting = sources.filter((source) => source.enabled && source.status !== 'ready').length;

  useEffect(() => {
    // Live-query updates must not start another automatic refresh after the initial load.
    if (startupHandled.current) return;
    startupHandled.current = true;
    if (profile.refreshOnStart)
      void refreshEnabledSources(showMessage).catch(() =>
        showMessage('Refresh could not start. Check local storage.'),
      );
  }, [profile.refreshOnStart, showMessage]);

  /** Apply filters immediately, drop hidden selections, then persist the local preference. */
  function changeFilters(next: Filters) {
    const visible = new Set(
      filterSeries(series, next, new Date(), annotations).map((item) => item.id),
    );
    setSelected((current) => current.filter((id) => visible.has(id)));
    startTransition(async () => {
      setOptimisticFilters(next);
      try {
        await saveProfile({ filters: next });
      } catch {
        showMessage('Filters could not be saved. Check local storage.');
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
            title="Manage your local profile, units, display, tags and custom fields."
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
            title="Open VelociTrack help on GitHub in a new tab."
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
            <button
              title="Add, edit or connect data sources stored in this browser."
              onClick={() => setDialog('sources')}
            >
              <Database size={16} />
              Sources
            </button>
            <button
              disabled={refreshingAll || refreshing.length > 0}
              title="Refresh all enabled sources, regardless of the current filters."
              onClick={async () => {
                setRefreshingAll(true);
                try {
                  const needsAttention = await refreshEnabledSources(showMessage);
                  if (needsAttention || !sources.some((source) => source.enabled))
                    setDialog('refresh');
                } catch {
                  showMessage('Refresh could not start. Check local storage.');
                } finally {
                  setRefreshingAll(false);
                }
              }}
            >
              <RefreshCw size={16} />
              {refreshingAll || refreshing.length ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              className="icon-button"
              aria-label="Manage local catalogs"
              title="Manage the shared local firearm and projectile catalogs."
              onClick={() => setDialog('catalog')}
            >
              <Library size={18} />
            </button>
          </div>
        </div>
        <FilterBar
          tags={tags}
          filters={filters}
          sources={sources}
          catalog={displayCatalog(catalog, series, profile.showProjectileWeight ?? false)}
          onChange={changeFilters}
        />
        <div className="toolbar-group analysis-group">
          <label className="group-label" htmlFor="analysis-mode">
            ANALYSIS
          </label>
          <select
            id="analysis-mode"
            aria-label="Analysis"
            title="Choose a single chart, a dual chart, string comparison or recorded string information."
            value={profile.analysis?.mode ?? 'simple'}
            onChange={(event) =>
              void saveAnalysis(event.target.value as AnalysisMode).catch(() =>
                showMessage('Analysis preference could not be saved.'),
              )
            }
          >
            <option value="simple">Simple chart</option>
            <option value="dual">Dual chart</option>
            <option value="compare">String compare</option>
            <option value="info">String info</option>
          </select>
        </div>
        <div className="toolbar-group tools-group">
          <span className="group-label">TOOLS</span>
          <div className="group-controls">
            <button
              title="Download a local workspace backup or preview a ZIP archive before restoring it."
              className="icon-button"
              aria-label="Backup / Restore"
              onClick={() => setDialog('backup')}
            >
              <ArchiveRestore size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Create PDF report"
              title="Generate a PDF from the selected strings, shots and current chart zoom. Configure sections in Profile → Report."
              disabled={!selectedSeries.length}
              onClick={() => {
                try {
                  if (reportHandle.current) setReport(reportHandle.current.capture());
                } catch (error) {
                  showMessage(
                    error instanceof Error ? error.message : 'The report could not be prepared.',
                  );
                }
              }}
            >
              <FileDown size={20} />
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
          <SeriesNavigator
            series={filtered}
            shots={shots}
            selected={selected}
            onSelectOnly={(id) => setSelected([id])}
            catalogNames={catalogNames}
            projectileNames={projectileNames}
            sourceNames={sourceNames}
            onToggleSeries={(id, checked) =>
              setSelected((current) =>
                checked ? [...current, id] : current.filter((value) => value !== id),
              )
            }
            annotations={annotations}
            tags={tags}
            fields={fieldDefinitions}
            unitSystem={profile.unitSystem}
            showGroupSize={profile.showGroupSize}
            showCaldwellNotes={profile.showCaldwellNotes}
            onDetails={setDetailId}
          />
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
        <AnalysisPanel
          ref={reportHandle}
          series={selectedSeries}
          shots={selectedShots}
          view="chart"
          allShots={seriesShots}
          hiddenShots={hiddenShots}
          onToggleShot={toggleShot}
          onToggleShots={toggleShots}
          invalidShots={invalidShots}
          onInvalidateShot={(id, invalid) => void invalidateShot(id, invalid)}
          fields={fieldDefinitions}
          annotations={annotations}
          tags={tags}
          profile={profile}
          activeShotId={activeShotId}
          activeShotIds={activeShotIds}
          onHoverShots={setActiveShotIds}
          onHoverShot={setActiveShotId}
          unitSystem={profile.unitSystem}
          dark={dark}
          colorOrder={colorOrder}
          catalog={catalog}
          attachments={attachments}
          onDetails={setDetailId}
        />
      </main>
      {report && <ReportDialog input={report} onClose={() => setReport(null)} />}
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
        <UpdateNotice />
        <span className="unofficial">Unofficial community project</span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={dismissMessage}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {detailSeries && (
        <SeriesDetails
          key={detailSeries.id}
          series={detailSeries}
          firearmName={catalogNames.get(detailSeries.firearmId)}
          projectileName={projectileNames.get(detailSeries.id)}
          annotation={annotations.find((a) => a.entityId === detailSeries.id)}
          fields={fieldDefinitions}
          tags={tags}
          photos={attachments.filter((photo) => photo.seriesId === detailSeries.id)}
          units={profile.unitSystem}
          onClose={() => setDetailId(null)}
        />
      )}
      {dialog === 'backup' && (
        <BackupDialog
          refreshing={refreshingAll || refreshing.length > 0}
          onClose={() => setDialog(null)}
          onRestored={() => {
            setSelected([]);
            resetSelection();
            setDetailId(null);
            setActiveShotId(null);
            setDialog(null);
            showMessage('Workspace restored. Sign in again to refresh connected sources.');
          }}
        />
      )}
      {dialog === 'profile' && (
        <ProfileDialog
          profile={profile}
          fields={fieldDefinitions}
          tags={tags}
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
          onMessage={showMessage}
        />
      )}
      {dialog === 'catalog' && <CatalogDialog items={catalog} onClose={() => setDialog(null)} />}
      {(refreshingAll || refreshing.length > 0) && (
        <RefreshProgress sourceNames={refreshing.map((id) => sourceNames.get(id) ?? 'source')} />
      )}
    </div>
  );
}
