import { ArrowUpRight } from 'lucide-react';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';

type ButtonLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: 'light' | 'dark' | 'gold' | 'ghost';
    showIcon?: boolean;
  }
>;

export function ButtonLink({
  children,
  className = '',
  variant = 'dark',
  showIcon = true,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={`button button--${variant} ${className}`} {...props}>
      <span>{children}</span>
      {showIcon && <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />}
    </a>
  );
}
