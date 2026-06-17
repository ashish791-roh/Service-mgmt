/**
 * Shared GST validation utility.
 * Since this file contains no browser-specific or node-specific imports,
 * it is safe to import in both client-side components and server-side routes.
 */

export function validateGstinChecksum(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  const cleanGstin = gstin.toUpperCase();
  
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let totalSum = 0;
  for (let i = 0; i < 14; i++) {
    const char = cleanGstin[i];
    const val = chars.indexOf(char);
    if (val === -1) return false;
    
    const factor = (i % 2 === 0) ? 1 : 2;
    const product = val * factor;
    
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    totalSum += quotient + remainder;
  }
  
  const z = totalSum % 36;
  const cVal = (36 - z) % 36;
  const expectedChar = chars[cVal];
  
  return cleanGstin[14] === expectedChar;
}
