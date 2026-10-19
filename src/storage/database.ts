import Dexie, { type EntityTable } from 'dexie';
import type {
  Annotation,
  CatalogItem,
  DataSource,
  Profile,
  Series,
  Shot,
  FieldDefinition,
  Tag,
  Attachment,
  AttachmentContent,
} from '../domain/model';

/** Own the versioned local schema; imported records and user annotations use separate tables. */
export class WorkspaceDatabase extends Dexie {
  sources!: EntityTable<DataSource, 'id'>;
  catalog!: EntityTable<CatalogItem, 'id'>;
  series!: EntityTable<Series, 'id'>;
  shots!: EntityTable<Shot, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  annotations!: EntityTable<Annotation, 'entityId'>;
  fieldDefinitions!: EntityTable<FieldDefinition, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  attachments!: EntityTable<Attachment, 'id'>;
  attachmentContents!: EntityTable<AttachmentContent, 'id'>;

  /** Allow isolated test databases; future schema changes must add migrations, never reset data. */
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
    // Additive migration preserves version-one measurements and legacy annotation values.
    this.version(2).stores({
      fieldDefinitions: 'id, order',
      tags: 'id',
      attachments: 'id, seriesId',
      attachmentContents: 'id',
    });
  }
}

/** Shared browser workspace connection; tests may inject a separate instance into operations. */
export const db = new WorkspaceDatabase();
