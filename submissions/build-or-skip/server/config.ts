export function configuredSolariApiKey(value: string | undefined): string | undefined {
  const key = value?.trim();
  if (!key || /^(not[-_ ]?configured|your[_ -]?key|changeme)$/i.test(key)) return undefined;
  return key;
}
