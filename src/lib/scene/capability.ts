/**
 * Whether this device should be given the 3D scene at all. The page is complete without it (a still picture
 * of the same scene stands in), so anything that would make it a bad experience just gets the picture.
 */
export function canRunScene(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false; // the visitor asked for less data
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 1) return false; // very low memory
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) return false; // an old, slow processor
  return true; // WebGL support is checked by trying: creating the renderer throws if there is none
}
