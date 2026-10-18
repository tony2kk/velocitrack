import {
  Bytes,
  collection,
  documentId,
  DocumentReference,
  getDocs,
  GeoPoint,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore/lite';
import type { RawRecord } from '../../domain/model';
import { MAX_IMPORT_BYTES, MAX_SERIES, MAX_SHOTS, parseVelociRadarRecords } from '../velociradar';
import { CaldwellError } from './errors';

/** Provider document identity plus a plain, locally storable representation of its fields. */
export interface CloudDocument {
  id: string;
  data: RawRecord;
}
export type ReadCollection = (path: string[], maximum: number) => Promise<CloudDocument[]>;
type ReadPage = (after: string | undefined, size: number) => Promise<CloudDocument[]>;

/** Read document-ID-ordered pages, rejecting limit overruns and repeated IDs rather than truncating. */
export async function readPages(readPage: ReadPage, maximum: number) {
  const documents: CloudDocument[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  let bytes = 0;
  for (;;) {
    // The extra record distinguishes an exactly-full collection from one exceeding the budget.
    const size = Math.min(200, maximum - documents.length + 1);
    const page = await readPage(cursor, size);
    for (const item of page) {
      bytes += new TextEncoder().encode(JSON.stringify(item.data)).length;
      if (documents.length >= maximum || bytes > MAX_IMPORT_BYTES)
        throw new CaldwellError(
          'The source exceeds the supported import size. Nothing was imported.',
          'import',
        );
      if (seen.has(item.id))
        throw new CaldwellError(
          'The source changed during pagination. Please refresh again.',
          'import',
        );
      seen.add(item.id);
      documents.push(item);
    }
    if (page.length < size) return documents;
    cursor = page.at(-1)?.id;
  }
}

/** Convert Firestore-specific values to plain data; document references are preserved, never followed. */
function plainValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return value.path;
  if (value instanceof Bytes) return value.toBase64();
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainValue(item)]));
  return value;
}

/** Adapt read-only Firestore Lite queries to the bounded pagination contract. */
export function createCollectionReader(database: Firestore): ReadCollection {
  return async (path, maximum) => {
    const [root, ...segments] = path;
    if (!root) throw new CaldwellError('Invalid collection path.', 'import');
    const reference = collection(database, root, ...segments);
    return readPages(async (cursor, size) => {
      const constraints: QueryConstraint[] = [orderBy(documentId()), limit(size)];
      if (cursor) constraints.push(startAfter(cursor));
      const page = await getDocs(query(reference, ...constraints));
      return page.docs.map((item) => ({ id: item.id, data: plainValue(item.data()) as RawRecord }));
    }, maximum);
  };
}

/**
 * Read and validate the signed-in owner's complete supported session/shot hierarchy.
 * Only an authenticated SDK user's UID may be supplied by the caller.
 */
export async function readAccount(uid: string, readCollection: ReadCollection) {
  if (!uid || uid.includes('/'))
    throw new CaldwellError('A valid signed-in account is required.', 'sign-in');
  const root = ['Users', uid, 'Strings'];
  const strings = await readCollection(root, MAX_SERIES);
  const seriesRows: RawRecord[] = [];
  const shotRows: RawRecord[] = [];
  let bytes = 0;
  /** Enforce a shared budget across sessions and all of their separate shot collections. */
  const countBytes = (row: RawRecord) => {
    bytes += new TextEncoder().encode(JSON.stringify(row)).length;
    if (bytes > MAX_IMPORT_BYTES)
      throw new CaldwellError(
        'The source exceeds the 20 MB import limit. Nothing was imported.',
        'import',
      );
  };
  for (const series of strings) {
    if (!series.id || series.id.includes('/'))
      throw new CaldwellError('An invalid series identifier was returned.', 'import');
    // Path-derived IDs override payload fields so a document cannot redirect the import relationship.
    const row = { ...series.data, _documentId: series.id };
    countBytes(row);
    seriesRows.push(row);
    const shots = await readCollection([...root, series.id, 'Shots'], MAX_SHOTS - shotRows.length);
    for (const shot of shots) {
      const row = { ...shot.data, _documentId: shot.id, _stringId: series.id };
      countBytes(row);
      shotRows.push(row);
    }
  }
  try {
    return parseVelociRadarRecords(seriesRows, shotRows);
  } catch {
    throw new CaldwellError(
      'Caldwell returned an unsupported measurement format. Nothing was imported.',
      'import',
    );
  }
}
