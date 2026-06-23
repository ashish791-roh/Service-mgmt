/**
 * MotionButton — a drop-in replacement for <button> with:
 *   • Scale-down on press (0.96×)
 *   • Lift on hover (slight Y offset + shadow)
 *   • Loading state with inline spinner (no layout shift)
 *   • Success state with animated checkmark
 */

import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

type Variant = 'primary' | 'danger' | 'secondary' | 'ghost';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  variant?: Variant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  layout?: boolean;
  hapticFeedback?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-teal-600 hover:bg-teal-500 text-white border-transparent shadow-teal-600/20',
  danger:    'bg-rose-600  hover:bg-rose-500  text-white border-transparent shadow-rose-600/20',
  secondary: 'bg-white     hover:bg-gray-50   text-gray-700 border-gray-200',
  ghost:     'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent',
};

export const MotionButton: React.FC<Props> = ({
  loading = false,
  success = false,
  variant = 'secondary',
  icon,
  children,
  className = '',
  disabled,
  layout = false,
  hapticFeedback = false,
  onClick,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const controls = useAnimationControls();

  useEffect(() => {
    if (loading) {
      controls.start({
        rotate: 360,
        transition: { repeat: Infinity, duration: 0.8, ease: 'linear' },
      });
    } else {
      controls.stop();
    }
  }, [loading, controls]);

  const handleTap = (e: any) => {
    if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      layout={layout}
      whileHover={isDisabled ? {} : { y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
      whileTap={isDisabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      onClick={handleTap}
      data-motion-button
      data-variant={variant}
      style={{ willChange: 'transform', ...style }}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium
        transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${className}
      `}
      {...(props as any)}
    >
      {loading ? (
        <motion.span
          animate={controls}
          style={{ display: 'inline-flex' }}
        >
          <Loader2 size={14} />
        </motion.span>
      ) : success ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        >
          <Check size={14} />
        </motion.span>
      ) : icon}
      {children}
    </motion.button>
  );
};
