// Team codes are short, human-typeable identifiers participants enter to
// join (no personal password). Alphabet excludes visually ambiguous
// characters (0/O, 1/I/L) since these get read off a screen or whiteboard.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCodigo(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function normalizeCodigo(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
