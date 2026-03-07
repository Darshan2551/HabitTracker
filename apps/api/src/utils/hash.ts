import { createHash, randomBytes } from 'node:crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function timingSafeHashCompare(a: string, b: string): boolean {
  return sha256(a) === sha256(b);
}
