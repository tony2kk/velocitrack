import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  Expand,
  Lightbulb,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';
import { guides, groups, type Guide } from './content';
import './styles.css';

const base = import.meta.env.BASE_URL;
const icons = [Compass, ChartNoAxesCombined, Target, Download, ShieldCheck];

/** Read only the help route; this page never opens the user's workspace or authentication store. */
function currentRoute() {
  return window.location.hash.slice(1);
}

/** A captioned sequence of actual UI captures, with user-controlled playback and no autoplay. */
function Walkthrough({ guide }: { guide: Guide }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const enlarge = useRef<HTMLButtonElement>(null);
  const frame = guide.frames[index]!;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index + 1 === guide.frames.length) setPlaying(false);
      else setIndex(index + 1);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [playing, index, guide.frames.length]);
  useEffect(() => {
    if (!expanded) return;
    const returnFocus = enlarge.current;
    close.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
      // This lightbox has one control. Keep keyboard focus inside until it closes.
      if (e.key === 'Tab') {
        e.preventDefault();
        close.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      returnFocus?.focus();
    };
  }, [expanded]);
  /** Manual stepping pauses the sequence so the reader has time to inspect a detail. */
  function show(next: number) {
    setPlaying(false);
    setIndex(next);
  }
  return (
    <figure className="walkthrough">
      <div className="walkthrough-label">
        <span className="live-dot" /> SEE IT IN ACTION <span>Recorded in the demo workspace</span>
      </div>
      <button
        className="capture-button"
        ref={enlarge}
        onClick={() => {
          setPlaying(false);
          setExpanded(true);
        }}
        aria-label="Enlarge walkthrough image"
      >
        <img
          key={frame.image}
          src={`${base}help/media/${frame.image}.png`}
          alt={frame.caption}
          loading="lazy"
        />
        <span className="expand-label">
          <Expand size={15} /> Enlarge
        </span>
      </button>
      <figcaption aria-live={playing ? 'off' : 'polite'}>
        <span className="step-number">{index + 1}</span>
        {frame.caption}
      </figcaption>
      {guide.frames.length > 1 && (
        <div className="player-controls">
          <button
            className="play-button"
            onClick={() => {
              if (!playing && index === guide.frames.length - 1) setIndex(0);
              setPlaying(!playing);
            }}
            aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <div className="frame-steps">
            {guide.frames.map((f, i) => (
              <button
                key={f.image}
                onClick={() => show(i)}
                aria-label={`Step ${i + 1}: ${f.caption}`}
                aria-current={i === index ? 'step' : undefined}
                className={i === index ? 'active' : ''}
              />
            ))}
          </div>
          <span>
            {index + 1} / {guide.frames.length}
          </span>
          <button onClick={() => show(index - 1)} disabled={!index} aria-label="Previous step">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => show(index + 1)}
            disabled={index === guide.frames.length - 1}
            aria-label="Next step"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {expanded && (
        <div
          className="image-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Walkthrough image"
          onClick={() => setExpanded(false)}
        >
          <button ref={close} onClick={() => setExpanded(false)} aria-label="Close enlarged image">
            <X size={22} /> Close
          </button>
          <img src={`${base}help/media/${frame.image}.png`} alt={frame.caption} />
          <p>{frame.caption}</p>
        </div>
      )}
    </figure>
  );
}

/** The landing page groups topics around outcomes rather than implementation or menus. */
function Home({ query }: { query: string }) {
  const term = query.trim().toLowerCase();
  const filtered = guides.filter(
    (g) =>
      !term ||
      [
        g.title,
        g.description,
        ...g.steps,
        ...g.tips.map((t) => t.text),
        ...(g.details ?? []).flatMap((d) => d.text),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
  );
  return (
    <>
      {!term && (
        <section className="hero">
          <div>
            <p className="eyebrow">YOUR MEASUREMENTS. YOUR WORKSPACE.</p>
            <h1>
              A little guidance.
              <br />A lot to discover.
            </h1>
            <p>
              From your first import to a report worth keeping. Short visual guides help you find
              the next useful thing to do.
            </p>
            <a className="primary-link" href="#welcome">
              Start with demo data <ArrowRight size={18} />
            </a>
            <span className="hero-note">No account needed · About two minutes</span>
          </div>
          <a className="hero-visual" href="#compare" aria-label="Learn to compare sessions">
            <img
              src={`${base}help/media/compare-string.png`}
              alt="Example group-size comparison with one colored bar per string"
            />
            <span>
              <ChartNoAxesCombined size={18} /> See the story in your measurements{' '}
              <ArrowRight size={18} />
            </span>
          </a>
        </section>
      )}
      {term && (
        <header className="search-results">
          <p className="eyebrow">FIND A GUIDE</p>
          <h1>
            {filtered.length
              ? `${filtered.length} topics for “${query}”`
              : 'No matching topics yet'}
          </h1>
          <p>Try “target”, “units”, “PDF”, “columns” or “backup”.</p>
        </header>
      )}
      {groups.map((group, index) => {
        const items = filtered.filter((g) => g.group === group);
        const Icon = icons[index]!;
        return items.length ? (
          <section className="topic-group" key={group}>
            <div className="group-heading">
              <span className={`group-icon tone-${index}`}>
                <Icon size={23} />
              </span>
              <h2>{group}</h2>
              <span className="group-count">{items.length} guides</span>
            </div>
            <div className="topic-grid">
              {items.map((g) => (
                <a className="topic-card" href={`#${g.id}`} key={g.id}>
                  <span className="reading-time">{g.minutes} min</span>
                  <h3>{g.title}</h3>
                  <p>{g.description}</p>
                  <span className="card-link">
                    Show me how <ArrowRight size={17} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null;
      })}
    </>
  );
}

/** Each goal starts with a visual, followed by the shortest useful procedure and practical tips. */
function Topic({ guide }: { guide: Guide }) {
  return (
    <article className="topic">
      <a className="back-link" href="#">
        <ArrowLeft size={16} /> All guides
      </a>
      <header className="topic-heading">
        <p className="eyebrow">
          {guide.group} <span> / {guide.minutes} MIN</span>
        </p>
        <h1>{guide.title}</h1>
        <p>{guide.description}</p>
      </header>
      <Walkthrough key={guide.id} guide={guide} />
      <div className="topic-body">
        <section className="steps">
          <h2>Your next steps</h2>
          <ol>
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <aside className="tips">
          {guide.tips.map((t) => (
            <div key={t.title} className={`tip ${t.kind ?? ''}`}>
              <Lightbulb size={21} />
              <div>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
      {!!guide.details?.length && (
        <section className="further">
          <h2>A little more detail</h2>
          {guide.details.map((d) => (
            <details key={d.title}>
              <summary>{d.title}</summary>
              {d.text.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </details>
          ))}
        </section>
      )}
      {guide.id === 'file-import' && (
        <details className="format-example">
          <summary>See a minimal JSON example</summary>
          <p>This example is invented. Values use ft/s and ft.</p>
          <pre>
            {JSON.stringify(
              {
                strings: [
                  {
                    _documentId: 'example-string',
                    name: 'Example session',
                    startTimestamp: '2026-01-01T10:00:00Z',
                    firearm: { id: 'example-firearm', name: 'Example firearm' },
                    projectile: { id: 'example-projectile', name: 'Example projectile' },
                  },
                ],
                shots: [
                  {
                    _documentId: 'example-shot',
                    _stringId: 'example-string',
                    number: 1,
                    muzzleVelocity: 310,
                    ballisticCoefficientG1: 0.111,
                    ballisticCoefficientG7: 0.055,
                    distances: [0, 10, 20, 0],
                    velocities: [310, 300, 292, 0],
                    exclude: false,
                  },
                ],
              },
              null,
              2,
            )}
          </pre>
          <a
            href="https://github.com/tony2kk/velocitrack/blob/main/docs/IMPORT_FORMAT.md"
            target="_blank"
            rel="noreferrer"
          >
            Complete file-format reference ↗
          </a>
        </details>
      )}
      <section className="related">
        <h2>Where next?</h2>
        <div>
          {guide.related.map((id) => {
            const next = guides.find((g) => g.id === id)!;
            return (
              <a key={id} href={`#${id}`}>
                {next.title}
                <ArrowRight size={17} />
              </a>
            );
          })}
        </div>
      </section>
    </article>
  );
}

/** A separate static entry keeps help usable without opening or changing local application data. */
export function HelpApp() {
  const [route, setRoute] = useState(currentRoute);
  const [query, setQuery] = useState('');
  const main = useRef<HTMLElement>(null);
  const guide = guides.find((g) => g.id === route);
  useEffect(() => {
    const change = () => {
      setRoute(currentRoute());
      setQuery('');
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title = guide ? `${guide.title} · VelociTrack guide` : 'VelociTrack guide';
  }, [guide]);
  return (
    <>
      <a
        className="skip-link"
        href="#guide-main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to guide
      </a>
      <header className="site-header">
        <a className="brand" href="#" onClick={() => setQuery('')}>
          <img src={`${base}brand/favicon.svg`} alt="" width="34" height="34" />
          VelociTrack<span>guide</span>
        </a>
        <a className="open-app" href={base}>
          <ArrowLeft size={16} /> Open workspace
        </a>
      </header>
      <nav className="guide-nav" aria-label="Guide navigation">
        <a href="#" onClick={() => setQuery('')}>
          <BookOpen size={17} /> All guides
        </a>
        <label className="search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search guides"
            placeholder="What would you like to do?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </nav>
      <main ref={main} id="guide-main" tabIndex={-1}>
        {query || !route ? (
          <Home query={query} />
        ) : guide ? (
          <Topic key={guide.id} guide={guide} />
        ) : (
          <section className="search-results">
            <h1>Let’s find your guide</h1>
            <p>
              This topic has moved. <a href="#">Browse all guides</a> or use search.
            </p>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>VelociTrack {__APP_VERSION__} · Learn at your own pace.</span>
        <p>An unofficial community project. Independent of Caldwell and American Outdoor Brands.</p>
        <a href="#privacy">Your data stays yours</a>
        <a href="https://github.com/tony2kk/velocitrack" target="_blank" rel="noreferrer">
          Project on GitHub ↗
        </a>
      </footer>
    </>
  );
}
