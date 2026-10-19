import type {
  Annotation,
  Attachment,
  CatalogItem,
  FieldDefinition,
  Profile,
  Series,
  Shot,
  Tag,
} from '../domain/model';
import { fieldDisplay, fieldUnit } from '../domain/customFields';
import { availableQuantities, rawPath } from '../domain/analysis';
import { projectileName } from '../domain/projectiles';
import { formatValue } from '../domain/units';
import { TagLabels } from './CustomizationManager';

/** Read a provider timestamp without assuming every numeric metadata field is a timestamp. */
export function providerTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)
        ? Number(value)
        : null;
  const date = new Date(
    numeric === null ? String(value) : numeric < 100_000_000_000 ? numeric * 1000 : numeric,
  );
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB') : '—';
}

/** Present imported context and local annotations together, retaining provider provenance and unit caveats. */
export function StringInfo({
  series,
  shots,
  profile,
  catalog,
  annotations,
  fields,
  tags,
  photos,
  onDetails,
}: {
  series: Series;
  shots: Shot[];
  profile: Profile;
  catalog: CatalogItem[];
  annotations: Annotation[];
  fields: FieldDefinition[];
  tags: Tag[];
  photos: Attachment[];
  onDetails?: (id: string) => void;
}) {
  const names = new Map(catalog.map((item) => [item.id, item.name]));
  const annotation = annotations.find((item) => item.entityId === series.id);
  const context = { seriesId: series.id };
  const quantities = availableQuantities(
    [context],
    [series],
    fields,
    annotations,
    profile.unitSystem,
  ).filter((item) => item.id.startsWith('source:') || item.id === 'projectileWeight');
  return (
    <section className="string-info">
      <header className="chart-heading">
        <h3>String info</h3>
        <button onClick={() => onDetails?.(series.id)}>
          Edit details / Photos ({photos.length})
        </button>
      </header>
      <dl className="info-grid">
        <dt>Name</dt>
        <dd>{series.name}</dd>
        <dt>Firearm</dt>
        <dd>{names.get(series.firearmId)}</dd>
        <dt>Projectile</dt>
        <dd>{projectileName(series, names, profile.showProjectileWeight ?? false)}</dd>
        <dt>Started</dt>
        <dd>{providerTime(series.startedAt)}</dd>
        <dt>Ended</dt>
        <dd>{providerTime(series.raw.endTimestamp)}</dd>
        <dt>Last changed at source</dt>
        <dd>{providerTime(series.raw.lastModifiedTimestamp)}</dd>
        <dt>Shots</dt>
        <dd>
          {shots.length} total · {shots.filter((shot) => shot.excluded).length} source excluded
        </dd>
        <dt>String notes (Caldwell)</dt>
        <dd className="preserve-lines">
          {(typeof series.raw.notes === 'string' && series.raw.notes) || '—'}
        </dd>
        {annotation?.notes && (
          <>
            <dt>Local notes</dt>
            <dd className="preserve-lines">{annotation.notes}</dd>
          </>
        )}
        <dt>Tags</dt>
        <dd>
          <TagLabels tags={tags.filter((tag) => annotation?.tagIds?.includes(tag.id))} />
        </dd>
        {fields.map((field) => (
          <div className="info-entry" key={field.id}>
            <dt>
              {field.name}
              {fieldUnit(field.type, profile.unitSystem)
                ? ` (${fieldUnit(field.type, profile.unitSystem)})`
                : ''}
            </dt>
            <dd className="preserve-lines">
              {fieldDisplay(annotation?.values?.[field.id], field.type, profile.unitSystem) || '—'}
            </dd>
          </div>
        ))}
        {quantities.map((item) => (
          <div className="info-entry" key={item.id}>
            <dt>{item.label}</dt>
            <dd>{formatValue(item.read(context))}</dd>
          </div>
        ))}
        {['cityName', 'weatherDescription', 'windSpeedDirection'].map((key) => {
          const value = rawPath(series.raw, `weatherData.${key}`);
          return typeof value === 'string' && value ? (
            <div className="info-entry" key={key}>
              <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
              <dd>{value}</dd>
            </div>
          ) : null;
        })}
      </dl>
      <details className="quality">
        <summary>Original Caldwell information</summary>
        <p className="muted">
          Original provider fields, including source statistics and technical metadata. Source units
          are shown where their meaning has not been confirmed.
        </p>
        <pre className="provider-info">{JSON.stringify(series.raw, null, 2)}</pre>
      </details>
      {shots.some((shot) => shot.raw.timestamp !== undefined || shot.raw.notes) && (
        <details className="quality">
          <summary>Shot times and Caldwell notes</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Shot</th>
                  <th>Time</th>
                  <th>Notes (Caldwell)</th>
                </tr>
              </thead>
              <tbody>
                {shots.map((shot) => (
                  <tr key={shot.id}>
                    <td>{shot.number}</td>
                    <td>{providerTime(shot.raw.timestamp)}</td>
                    <td className="preserve-lines">
                      {typeof shot.raw.notes === 'string' ? shot.raw.notes : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
