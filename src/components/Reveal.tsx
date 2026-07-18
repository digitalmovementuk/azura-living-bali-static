import { motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

type RevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  as?: 'div' | 'article' | 'section';
  variant?: 'lift' | 'fade' | 'clip' | 'slide';
}>;

const revealVariants = {
  lift: {
    hidden: { opacity: 0, y: 34 },
    visible: { opacity: 1, y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  clip: {
    hidden: { opacity: 0, clipPath: 'inset(0 0 14% 0)', scale: 0.985 },
    visible: { opacity: 1, clipPath: 'inset(0 0 0% 0)', scale: 1 },
  },
  slide: {
    hidden: { opacity: 0, x: 34 },
    visible: { opacity: 1, x: 0 },
  },
};

export function Reveal({ children, className = '', delay = 0, as = 'div', variant = 'lift' }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={revealVariants[variant]}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: variant === 'clip' ? 1.05 : 0.78, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
