/** Extra publication boundary for the one explicitly authorized public demonstration package. */
export function inspectDemoPackage(content) {
  const failures = [];
  let sample;
  try {
    sample = JSON.parse(content);
  } catch {
    return ['invalid demo JSON'];
  }
  const allowed = [
    'format',
    'version',
    'date',
    'series',
    'shots',
    'catalog',
    'annotations',
    'fieldDefinitions',
    'tags',
    'attachments',
    'reportProfiles',
    'assets',
  ];
  if (
    !sample ||
    typeof sample !== 'object' ||
    Array.isArray(sample) ||
    sample.format !== 'velocitrack-demo' ||
    sample.version !== 1 ||
    Object.keys(sample).some((key) => !allowed.includes(key))
  )
    return ['invalid public demo contract'];
  /** Do not print matched content: a failed guard can itself contain private input. */
  function visit(value, inRaw = false) {
    if (typeof value === 'string') {
      const folded = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (
        /sternberk|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(
          folded,
        )
      )
        failures.push('private identity or location in demo');
    } else if (Array.isArray(value)) value.forEach((item) => visit(item, inRaw));
    else if (value && typeof value === 'object')
      for (const [key, item] of Object.entries(value)) {
        if (
          /^(sources|profile|connection|accountId|apiKey|projectId|password|token|email|mac|uid|userId|cityName|latitude|longitude|address|location|serialNumber|sunriseTimeInUnix|sunsetTimeInUnix)$/i.test(
            key,
          ) ||
          (inRaw && /^(id|stringId|_documentId|_stringId)$/.test(key))
        )
          failures.push('private field in demo');
        visit(item, inRaw || key === 'raw');
      }
  }
  visit(sample);
  return [...new Set(failures)];
}

/** The shared JPEG may carry only a minimal orientation tag, never camera, GPS or author metadata. */
export function inspectDemoJpeg(bytes) {
  const orientationOnly = Buffer.from(
    '45786966000049492a0008000000010012010300010000000600000000000000',
    'hex',
  );
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return ['invalid demo JPEG'];
  let position = 2;
  let orientation = 0;
  while (position + 4 <= bytes.length) {
    if (bytes[position] !== 0xff) return ['invalid JPEG segment'];
    const marker = bytes[position + 1];
    if (marker === 0xda) return orientation === 1 ? [] : ['missing or duplicate demo orientation'];
    const length = bytes.readUInt16BE(position + 2);
    if (length < 2 || position + length + 2 > bytes.length) return ['invalid JPEG segment length'];
    if (marker === 0xe1) {
      orientation++;
      if (!bytes.subarray(position + 4, position + length + 2).equals(orientationOnly))
        return ['private image metadata'];
    } else if ((marker >= 0xe2 && marker <= 0xef) || marker === 0xfe)
      return ['private image metadata'];
    position += length + 2;
  }
  return ['incomplete demo JPEG'];
}
