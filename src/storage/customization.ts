import type { FieldDefinition, Tag } from '../domain/model';
import { FIELD_TYPES, validFieldValue } from '../domain/customFields';
import { db } from './database';

/** Reject blank or duplicate names while allowing any number of definitions. */
function checkName(name: string, id: string, items: { id: string; name: string }[]): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new Error('Use a name of 1–100 characters.');
  if (items.some((item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase()))
    throw new Error('This name already exists.');
  return trimmed;
}

/** Keep canonical values on rename; switching weight units changes presentation only. */
export async function saveField(field: FieldDefinition, database = db) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(field.id) ||
    ['__proto__', 'constructor', 'prototype'].includes(field.id)
  )
    throw new Error('Invalid field identity.');
  if (!Number.isSafeInteger(field.order) || field.order < 0)
    throw new Error('Invalid field order.');
  if (field.showInNavigator !== undefined && typeof field.showInNavigator !== 'boolean')
    throw new Error('Invalid string panel preference.');
  await database.transaction('rw', [database.fieldDefinitions, database.annotations], async () => {
    if (!Object.hasOwn(FIELD_TYPES, field.type)) throw new Error('Unknown field type.');
    const name = checkName(field.name, field.id, await database.fieldDefinitions.toArray());
    const old = await database.fieldDefinitions.get(field.id);
    if (
      old &&
      old.type !== field.type &&
      ![old.type, field.type].every((type) =>
        ['weight', 'weight-grams', 'weight-grains'].includes(type),
      ) &&
      (await database.annotations.filter((a) => Object.hasOwn(a.values ?? {}, field.id)).count())
    )
      throw new Error('A field with saved values cannot change type. Create a new field instead.');
    await database.fieldDefinitions.put({ ...field, name });
  });
}

/** Delete a definition and only its associated values/column preference in one transaction. */
export async function removeField(id: string, database = db) {
  await database.transaction(
    'rw',
    [database.fieldDefinitions, database.annotations, database.profiles],
    async () => {
      await database.fieldDefinitions.delete(id);
      await database.annotations.toCollection().modify((a) => {
        if (a.values) delete a.values[id];
      });
      await database.profiles.toCollection().modify((p) => {
        p.visibleFieldIds = p.visibleFieldIds?.filter((value) => value !== id);
        p.tableColumns = p.tableColumns?.filter((value) => value !== `field:${id}`);
        p.tableColumnOrder = p.tableColumnOrder?.filter((value) => value !== `field:${id}`);
        if (p.tableSort?.columnId === `field:${id}`) delete p.tableSort;
        if (p.analysis)
          for (const mode of ['simple', 'dual', 'compare'] as const) {
            if (p.analysis[mode].quantity === `field:${id}`) p.analysis[mode].quantity = 'velocity';
            if (p.analysis[mode].secondary === `field:${id}`) p.analysis[mode].secondary = 'g1';
          }
      });
    },
  );
}

/** Reorder against the current list so concurrent edits cannot create duplicate positions. */
export async function moveField(id: string, direction: -1 | 1, database = db) {
  await database.transaction('rw', database.fieldDefinitions, async () => {
    const items = await database.fieldDefinitions.orderBy('order').toArray();
    const index = items.findIndex((item) => item.id === id);
    const other = index + direction;
    if (index < 0 || other < 0 || other >= items.length) return;
    [items[index], items[other]] = [items[other]!, items[index]!];
    await database.fieldDefinitions.bulkPut(items.map((item, order) => ({ ...item, order })));
  });
}

/** Store a reusable label with a safe CSS color and a unique name. */
export async function saveTag(tag: Tag, database = db) {
  await database.transaction('rw', database.tags, async () => {
    if (!/^#[0-9a-f]{6}$/i.test(tag.color)) throw new Error('Choose a valid tag color.');
    const name = checkName(tag.name, tag.id, await database.tags.toArray());
    await database.tags.put({ ...tag, name });
  });
}

/** Remove assignments and saved filter criteria, never imported measurements. */
export async function removeTag(id: string, database = db) {
  await database.transaction(
    'rw',
    [database.tags, database.annotations, database.profiles],
    async () => {
      await database.tags.delete(id);
      await database.annotations.toCollection().modify((a) => {
        a.tagIds = a.tagIds?.filter((value) => value !== id);
      });
      await database.profiles.toCollection().modify((p) => {
        p.filters.tagIds = p.filters.tagIds?.filter((value) => value !== id);
      });
    },
  );
}

/** Merge edited fields only, preserving untouched precision, legacy notes and concurrent unrelated edits. */
export async function saveSeriesDetails(
  seriesId: string,
  patch: Record<string, string | number | undefined>,
  tagIds: string[] | undefined,
  database = db,
) {
  await database.transaction(
    'rw',
    [database.series, database.annotations, database.fieldDefinitions, database.tags],
    async () => {
      if (!(await database.series.get(seriesId))) throw new Error('This series no longer exists.');
      const annotation = (await database.annotations.get(seriesId)) ?? {
        entityId: seriesId,
        notes: '',
        fields: {},
      };
      const values = { ...annotation.values };
      for (const [id, value] of Object.entries(patch)) {
        const definition = await database.fieldDefinitions.get(id);
        if (!definition) throw new Error('A field was removed. Reopen this series to continue.');
        if (value === undefined) delete values[id];
        else {
          if (!validFieldValue(definition.type, value))
            throw new Error(`Invalid value for ${definition.name}.`);
          values[id] = value;
        }
      }
      if (tagIds && (await database.tags.bulkGet(tagIds)).some((tag) => !tag))
        throw new Error('A tag was removed. Reopen this series to continue.');
      await database.annotations.put({
        ...annotation,
        values,
        tagIds: tagIds ? [...new Set(tagIds)] : annotation.tagIds,
      });
    },
  );
}
