const CASHTAG_PATTERN = /\$([A-Za-z][A-Za-z0-9]{0,9})/g;

export function sanitizeXPostText(text: string): string {
  let cashtagCount = 0;

  return text.replace(CASHTAG_PATTERN, (match, symbol: string, offset: number, fullText: string) => {
    const previousChar = offset > 0 ? fullText[offset - 1] : "";
    if (/[A-Za-z0-9_]/.test(previousChar)) {
      return match;
    }

    cashtagCount += 1;
    if (cashtagCount === 1) {
      return match;
    }

    return symbol;
  });
}
