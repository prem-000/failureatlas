import { LogoSize } from './logo.types';

export const LOGO_SIZE_MAP: Record<Exclude<LogoSize, number>, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  hero: 96,
};

export const DEFAULT_LOGO_SIZE = 32;

export function getLogoSize(size?: LogoSize): number {
  if (typeof size === 'number') {
    return size;
  }
  if (size && size in LOGO_SIZE_MAP) {
    return LOGO_SIZE_MAP[size as Exclude<LogoSize, number>];
  }
  return DEFAULT_LOGO_SIZE;
}
