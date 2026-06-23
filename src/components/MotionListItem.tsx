/**
 * MotionListItem — wrap any list row/card with this to get:
 *   • Spring slide-up on mount
 *   • Fade + shrink on unmount (delete)
 *   • Stagger support via `index` prop
 */

import { motion } from 'framer-motion';
import React from 'react';

interface Props {
  children: React.ReactNode;
  index?: number;
  className?: string;
  layout?: boolean | 'position' | 'size';
  layoutId?: string;
  exitVariant?: 'delete' | 'navigate';
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const spring = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.8 };

const exitVariants = {
  delete: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } },
  navigate: { opacity: 0, x: 20, transition: { duration: 0.15 } },
};

export const MotionListItemComponent: React.FC<Props> = ({
  children,
  index = 0,
  className,
  layout = true,
  layoutId,
  exitVariant = 'delete',
  onClick,
}) => (
  <motion.div
    layout={layout}
    layoutId={layoutId}
    initial={{ opacity: 0, y: 16, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={exitVariants[exitVariant]}
    transition={{
      ...spring,
      delay: Math.min(index * 0.03, 0.12),
    }}
    onClick={onClick}
    className={className}
    data-list-item
  >
    {children}
  </motion.div>
);

export const MotionListItem = React.memo(MotionListItemComponent);
