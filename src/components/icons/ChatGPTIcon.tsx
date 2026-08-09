import React from 'react';

export interface ChatGPTIconProps extends React.SVGProps<SVGSVGElement> {
  size?: 16 | 20 | 24 | 32 | number;
  className?: string;
  color?: string;
  'aria-label'?: string;
}

/**
 * ChatGPT / OpenAI SVG Visual Mark Icon Component.
 * Supports sizes 16px, 20px, 24px, 32px or custom numeric values.
 * Uses `currentColor` for fill/stroke compatibility across light/dark surfaces.
 */
export const ChatGPTIcon: React.FC<ChatGPTIconProps> = ({
  size = 24,
  className = '',
  color,
  'aria-label': ariaLabel = 'ChatGPT',
  style,
  ...props
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(String(size), 10);

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        color: color || 'currentColor',
        ...style,
      }}
      {...props}
    >
      <path
        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 23.99a6.0462 6.0462 0 0 0 5.76-4.09 5.9847 5.9847 0 0 0 3.9977-2.9001 6.0558 6.0558 0 0 0-.7348-7.1788zm-9.022 12.6081a4.4042 4.4042 0 0 1-2.8628-1.0406l.1429-.0832 4.7573-2.7471a.8407.8407 0 0 0 .4204-.7283v-6.7029l2.0084 1.1593a.0759.0759 0 0 1 .042.0628v5.6713a4.4233 4.4233 0 0 1-4.5082 4.4087zm-9.8055-4.4851a4.409 4.409 0 0 1-.5347-3.0033l.1428.0832 4.7574 2.7471a.8407.8407 0 0 0 .8407 0l5.8053-3.3518v2.3186a.0759.0759 0 0 1-.0333.0675l-4.9108 2.834a4.4233 4.4233 0 0 1-6.0674-1.6953zm-1.1278-10.748a4.4042 4.4042 0 0 1 2.328-2.0032v5.6618a.8407.8407 0 0 0 .4203.7283l5.8054 3.3518-2.0084 1.1593a.0759.0759 0 0 1-.0752.0047l-4.9109-2.834a4.4233 4.4233 0 0 1-1.5592-6.0687zm16.5925 3.7381-5.8053-3.3518 2.0084-1.1593a.0759.0759 0 0 1 .0752-.0047l4.9109 2.834a4.4233 4.4233 0 0 1 1.5592 6.0687 4.4042 4.4042 0 0 1-2.328 2.0032v-5.6618a.8407.8407 0 0 0-.4204-.7285zm1.9083-3.1491-.1428-.0832-4.7574-2.7471a.8407.8407 0 0 0-.8407 0L8.2831 8.8052V6.4866a.0759.0759 0 0 1 .0333-.0675l4.9108-2.834a4.4281 4.4281 0 0 1 6.6022 4.6986zm-10.6387 4.966-2.0084-1.1593a.0759.0759 0 0 1-.042-.0628V5.8174a4.4233 4.4233 0 0 1 7.371-3.3681l-.1429.0832-4.7573 2.7471a.8407.8407 0 0 0-.4204.7283v6.7029zm-1.0089-3.2384L12 8.7845l2.8796 1.6626v3.3252L12 15.4349l-2.8796-1.6626V10.447z"
        fill="currentColor"
      />
    </svg>
  );
};

export default ChatGPTIcon;
