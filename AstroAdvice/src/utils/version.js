export function compareVersions(a, b) {
  if (!a || !b) return 0;
  const partsA = String(a).split('.').map((x) => parseInt(x, 10));
  const partsB = String(b).split('.').map((x) => parseInt(x, 10));
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i += 1) {
    const va = Number.isFinite(partsA[i]) ? partsA[i] : 0;
    const vb = Number.isFinite(partsB[i]) ? partsB[i] : 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

