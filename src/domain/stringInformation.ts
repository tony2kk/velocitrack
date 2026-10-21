import type { Annotation, FieldDefinition, Series, Tag } from './model';

/** Complete string-scoped records for local inspection/export; connection and profile data are absent. */
export function stringInformation(
  series: Series,
  annotations: readonly Annotation[],
  fields: readonly FieldDefinition[],
  tags: readonly Tag[],
) {
  const annotation = annotations.find((item) => item.entityId === series.id) ?? null;
  return {
    string: series,
    annotation,
    fieldDefinitions: fields.filter((field) => Object.hasOwn(annotation?.values ?? {}, field.id)),
    tags: tags.filter((tag) => annotation?.tagIds?.includes(tag.id)),
  };
}
