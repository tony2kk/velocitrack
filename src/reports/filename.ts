/** Keep Unicode names readable while removing control characters and Windows path punctuation. */
export function safeFilename(value: string): string {
  return Array.from(value.normalize('NFC'), (character) =>
    character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
  )
    .join('')
    .trim()
    .replace(/[. ]+$/g, '');
}
