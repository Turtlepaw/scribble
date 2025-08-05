export function paramAsString(str: string | string[]): string {
  if (Array.isArray(str)) {
    return str[0];
  }
  return str;
}
