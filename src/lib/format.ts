export function formatStorageSize(bytes: number | bigint): string {
  const numericBytes = Math.max(0, Number(bytes));

  if (numericBytes === 0) {
    return "0 B";
  }

  if (numericBytes < 1024) {
    return `${numericBytes} B`;
  }

  const kb = numericBytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}