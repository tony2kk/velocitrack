import Papa from 'papaparse';
import type { RawRecord } from '../domain/model';

export interface ExportFile {
  name: string;
  text: string;
}

export interface ImportedReference {
  remoteId: string;
  name: string;
}

export interface ImportedSeries {
  remoteId: string;
  name: string;
  startedAt: string | null;
  firearm: ImportedReference;
  projectile: ImportedReference;
  raw: RawRecord;
}

export interface ImportedShot {
  remoteId: string;
  seriesRemoteId: string;
  number: number;
  muzzleVelocity: number | null;
  ballisticCoefficientG1: number | null;
  ballisticCoefficientG7: number | null;
  distances: number[];
  velocities: number[];
  excluded: boolean;
  rawUnit: string;
  raw: RawRecord;
}

export interface ImportBundle {
  series: ImportedSeries[];
  shots: ImportedShot[];
}

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
export const MAX_SERIES = 10_000;
export const MAX_SHOTS = 50_000;
const MAX_POINTS = 5_000;
const MAX_TOTAL_POINTS = 1_000_000;

function record(value: unknown, description: string): RawRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${description} must be an object.`);
  return value as RawRecord;
}

function text(value: unknown, description: string, fallback?: string): string {
  if ((value === undefined || value === null || value === '') && fallback !== undefined)
    return fallback;
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new Error(`${description} is missing or invalid.`);
  const result = String(value).trim();
  if (!result || result.length > 500) throw new Error(`${description} is empty or too long.`);
  return result;
}

function number(value: unknown, description: string): number | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && !value.trim())
  )
    return null;
  if (typeof value !== 'number' && typeof value !== 'string')
    throw new Error(`${description} must be a number.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${description} contains an invalid number.`);
  return parsed;
}

function boolean(value: unknown, description: string): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'False')
    return false;
  throw new Error(`${description} must be true or false.`);
}

function structured(value: unknown, description: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${description} must contain valid JSON.`);
  }
}

function numbers(value: unknown, description: string): number[] {
  if (value === undefined || value === null || value === '') return [];
  const items = structured(value, description);
  if (!Array.isArray(items) || items.length > MAX_POINTS)
    throw new Error(`${description} must be an array with at most ${MAX_POINTS} points.`);
  return items.map((item) => {
    const result = number(item, description);
    if (result === null) throw new Error(`${description} contains an empty value.`);
    return result;
  });
}

function reference(value: unknown, kind: string): ImportedReference {
  const item = record(structured(value, kind), kind);
  const name = text(item.name, `${kind} name`);
  return { remoteId: text(item.id, `${kind} ID`, `name:${name}`), name };
}

function timestamp(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  let milliseconds: number;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
    const numeric = Number(value);
    // The study exporter uses Unix seconds; also accept explicitly recognizable millisecond epochs.
    milliseconds = numeric < 100_000_000_000 ? numeric * 1000 : numeric;
  } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    milliseconds = Date.parse(value);
  } else throw new Error('Series start time must be a Unix timestamp or ISO date-time.');
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > Date.UTC(2100, 0, 1))
    throw new Error('Series start time is outside the supported range.');
  return new Date(milliseconds).toISOString();
}

function parseSeries(value: unknown): ImportedSeries {
  const row = record(value, 'Series');
  const remoteId = text(row._documentId ?? row.id ?? row.stringId, 'Series ID');
  return {
    remoteId,
    name: text(row.name, 'Series name', 'Untitled series'),
    startedAt: timestamp(row.startTimestamp),
    firearm: reference(row.firearm, 'Firearm'),
    projectile: reference(row.projectile, 'Projectile'),
    raw: row,
  };
}

function parseShot(value: unknown, index: number): ImportedShot {
  const row = record(value, 'Shot');
  if (!('muzzleVelocity' in row) && !('velocities' in row))
    throw new Error('The shot export is missing measurement fields.');
  return {
    remoteId: text(row._documentId ?? row.id, 'Shot ID'),
    seriesRemoteId: text(row._stringId ?? row.stringId, 'Shot series ID'),
    number: number(row.number ?? row.stringNumber, 'Shot number') ?? index + 1,
    muzzleVelocity: number(row.muzzleVelocity, 'Muzzle velocity'),
    ballisticCoefficientG1: number(row.ballisticCoefficientG1, 'G1 coefficient'),
    ballisticCoefficientG7: number(row.ballisticCoefficientG7, 'G7 coefficient'),
    distances: numbers(row.distances, 'Distances'),
    velocities: numbers(row.velocities, 'Velocities'),
    excluded: boolean(row.exclude, 'Exclude'),
    rawUnit: text(row.unit, 'Unit code', 'unknown'),
    raw: row,
  };
}

function readRows(file: ExportFile): unknown {
  const content = file.text.replace(/^\uFEFF/, '');
  const extension = file.name.toLowerCase().split('.').at(-1);
  if (extension === 'json' || (extension === 'txt' && /^\s*[[{]/.test(content))) {
    try {
      return JSON.parse(content);
    } catch {
      throw new Error('A selected file is not valid JSON.');
    }
  }
  if (extension === 'csv' || extension === 'txt') {
    const result = Papa.parse<RawRecord>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
    });
    if (
      result.errors.length ||
      (result.meta.renamedHeaders && Object.keys(result.meta.renamedHeaders).length)
    ) {
      throw new Error('Invalid CSV: check duplicate headers, quoting and column counts.');
    }
    return result.data;
  }
  throw new Error('Choose JSON or CSV export files (.json, .csv or .txt).');
}

export function parseVelociRadarExport(files: ExportFile[]): ImportBundle {
  if (!files.length || files.length > 2)
    throw new Error('Choose the strings and shots exports, or one combined JSON export.');
  if (
    files.reduce((total, file) => total + new TextEncoder().encode(file.text).length, 0) >
    MAX_IMPORT_BYTES
  ) {
    throw new Error('The selected exports exceed the 20 MB limit.');
  }
  let seriesRows: unknown[] | undefined;
  let shotRows: unknown[] | undefined;
  for (const file of files) {
    const value = readRows(file);
    if (!Array.isArray(value)) {
      const combined = record(value, 'Export');
      if (
        files.length !== 1 ||
        !Array.isArray(combined.strings) ||
        !Array.isArray(combined.shots)
      ) {
        throw new Error('A combined export must contain strings[] and shots[].');
      }
      seriesRows = combined.strings;
      shotRows = combined.shots;
    } else {
      const first = value[0] === undefined ? null : record(value[0], 'Export row');
      const isSeries = first
        ? 'firearm' in first && 'projectile' in first
        : /strings/i.test(file.name);
      const isShots = first
        ? 'muzzleVelocity' in first || 'velocities' in first
        : /shots/i.test(file.name);
      if (isSeries && !seriesRows) seriesRows = value;
      else if (isShots && !shotRows) shotRows = value;
      else
        throw new Error(
          'Select one strings export and one shots export. The points export is not needed.',
        );
    }
  }
  if (!seriesRows || !shotRows) throw new Error('Both strings and shots are required.');
  return parseVelociRadarRecords(seriesRows, shotRows);
}

/** File and online sources share the same validation and local import contract. */
export function parseVelociRadarRecords(seriesRows: unknown[], shotRows: unknown[]): ImportBundle {
  if (seriesRows.length > MAX_SERIES || shotRows.length > MAX_SHOTS)
    throw new Error('The export contains too many records.');

  const series = seriesRows.map(parseSeries);
  const shots = shotRows.map(parseShot);
  const seriesIds = new Set(series.map((item) => item.remoteId));
  if (seriesIds.size !== series.length) throw new Error('Duplicate series IDs in the export.');
  const shotIds = new Set<string>();
  let totalPoints = 0;
  for (const shot of shots) {
    if (!seriesIds.has(shot.seriesRemoteId))
      throw new Error('A shot references a series missing from the strings export.');
    const key = JSON.stringify([shot.seriesRemoteId, shot.remoteId]);
    if (shotIds.has(key)) throw new Error('Duplicate shot IDs in one series.');
    shotIds.add(key);
    totalPoints += Math.max(shot.distances.length, shot.velocities.length);
    if (totalPoints > MAX_TOTAL_POINTS)
      throw new Error('The export contains too many measurement points.');
  }
  return { series, shots };
}

export async function readExportFiles(files: FileList | File[]): Promise<ImportBundle> {
  const selected = Array.from(files);
  if (selected.reduce((total, file) => total + file.size, 0) > MAX_IMPORT_BYTES)
    throw new Error('The selected exports exceed the 20 MB limit.');
  return parseVelociRadarExport(
    await Promise.all(selected.map(async (file) => ({ name: file.name, text: await file.text() }))),
  );
}
