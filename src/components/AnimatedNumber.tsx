import { animate, useMotionValue, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
};

export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const unsubscribe = motionValue.on('change', setDisplayValue);

    if (reduceMotion) {
      motionValue.set(value);
      setDisplayValue(value);
      return unsubscribe;
    }

    const controls = animate(motionValue, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionValue, reduceMotion, value]);

  return <>{format(displayValue)}</>;
}
