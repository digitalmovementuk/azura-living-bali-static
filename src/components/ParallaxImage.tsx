import { motion, useReducedMotion, useScroll, useTransform, type HTMLMotionProps } from 'framer-motion';
import { useRef } from 'react';

type ParallaxImageProps = Omit<HTMLMotionProps<'img'>, 'ref'> & {
  strength?: number;
};

export function ParallaxImage({ strength = 4, className = '', style, ...props }: ParallaxImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: imageRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${strength}%`, `-${strength}%`]);

  return (
    <motion.img
      ref={imageRef}
      {...props}
      className={`parallax-image ${className}`}
      style={reduceMotion ? style : { ...style, y, scale: 1.08 }}
    />
  );
}
