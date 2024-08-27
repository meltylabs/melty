export type SearchReplace = {
  readonly filePath: string;
  readonly search: string;
  readonly replace: string;
};

export function create(
  filePath: string,
  search: string,
  replace: string
): SearchReplace {
  return { filePath, search, replace };
}
