export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | number;

export type LogoVariant = 'icon' | 'mark' | 'wordmark' | 'stacked' | 'compact';

export type LogoAnimationMode = 'none' | 'idle' | 'draw' | 'hover';

export interface LogoBaseProps {
  size?: LogoSize;
  variant?: LogoVariant;
  animation?: LogoAnimationMode;
  className?: string;
  responsive?: boolean;
}

export interface LogoMarkProps extends Omit<LogoBaseProps, 'variant'> {
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  tabIndex?: number;
  role?: string;
}

export interface LogoProps extends LogoBaseProps {
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  onClick?: (event: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => void;
  interactive?: boolean;
}
