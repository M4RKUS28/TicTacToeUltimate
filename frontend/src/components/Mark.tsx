import React from 'react';
import { motion } from 'framer-motion';
import { CellValue } from '../types/GameTypes';
import { xMarkVariants, oMarkVariants } from '../utils/AnimationVariants';

interface MarkProps {
  type: CellValue;
  size?: string;
  animated?: boolean;
  delay?: number;
}

/**
 * Component for rendering X and O marks with animations
 */
const Mark: React.FC<MarkProps> = ({ 
  type, 
  size = '100%', 
  animated = true,
  delay = 0 
}) => {
  if (!type) return null;
  
  if (type === 'X') {
    return (
      <div className="mark x-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          {animated ? (
            <>
              <motion.path
                d="M 5 5 L 19 19"
                stroke="#FF5252"
                strokeWidth="3"
                strokeLinecap="round"
                variants={xMarkVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ delay }}
              />
              <motion.path
                d="M 19 5 L 5 19"
                stroke="#FF5252"
                strokeWidth="3"
                strokeLinecap="round"
                variants={xMarkVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ delay: delay + 0.1 }}
              />
            </>
          ) : (
            <>
              <path
                d="M 5 5 L 19 19"
                stroke="#FF5252"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 19 5 L 5 19"
                stroke="#FF5252"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </div>
    );
  }
  
  if (type === 'O') {
    return (
      <div className="mark o-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width="100%" height="100%">
          {animated ? (
            <motion.circle
              cx="12"
              cy="12"
              r="7"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="3"
              variants={oMarkVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ delay }}
            />
          ) : (
            <circle
              cx="12"
              cy="12"
              r="7"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="3"
            />
          )}
        </svg>
      </div>
    );
  }
  
  return null;
};

export default Mark;