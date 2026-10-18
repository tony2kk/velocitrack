import Dexie, { type EntityTable } from 'dexie';
import type { Annotation, CatalogItem, DataSource, Profile, Series, Shot } from '../domain/model';

export class WorkspaceDatabase extends Dexie {
  sources!: EntityTable<DataSource, 'id'>;
  catalog!: EntityTable<CatalogItem, 'id'>;
  series!: EntityTable<Series, 'id'>;
  shots!: EntityTable<Shot, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  annotations!: EntityTable<Annotation, 'entityId'>;

  constructor(name = 'velocitrack-local') {
    super(name);
    this.version(1).stores({
      sources: 'id',
      catalog: 'id, kind',
      series: 'id, sourceId, firearmId, projectileId',
      shots: 'id, sourceId, seriesId',
      profiles: 'id',
      annotations: 'entityId',
    });
  }
}

export const db = new WorkspaceDatabase();
