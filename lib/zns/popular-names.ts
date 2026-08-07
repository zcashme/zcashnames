/** Hard-coded popular names used for “Popular name” chips on search/action UIs. */
export const POPULAR_NAMES = new Set([
  "adam",
  "alex",
  "alice",
  "anna",
  "bob",
  "chris",
  "david",
  "emma",
  "ethan",
  "jack",
  "james",
  "john",
  "leo",
  "lucas",
  "maria",
  "max",
  "mike",
  "noah",
  "olivia",
  "satoshi",
]);

export function isPopularName(name: string): boolean {
  return POPULAR_NAMES.has(name.toLowerCase());
}
