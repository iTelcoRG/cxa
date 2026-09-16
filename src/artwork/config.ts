export const artworkLimits = {
  maxFileBytes: Math.max(1, Number(process.env.CXA_ARTWORK_MAX_FILE_MB ?? 20)) * 1024 * 1024,
  maxFilesPerQuote: Math.max(1, Number(process.env.CXA_ARTWORK_MAX_FILES_PER_QUOTE ?? 10)),
  maxTotalBytesPerQuote: Math.max(1, Number(process.env.CXA_ARTWORK_MAX_TOTAL_MB ?? 100)) * 1024 * 1024,
  temporaryLifetimeHours: Math.max(1, Number(process.env.CXA_ARTWORK_TEMP_HOURS ?? 24)),
} as const;

