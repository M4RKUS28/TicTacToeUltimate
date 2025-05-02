import { Variants } from 'framer-motion';

// Animation variants for the Ultimate Tic Tac Toe game

// Container animations
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.5,
      when: 'beforeChildren',
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      when: 'afterChildren',
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Game board animations
export const gameBoardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 20,
      stiffness: 100,
      duration: 0.7
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.3 }
  }
};

// Small board animations
export const boardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 15,
      stiffness: 150,
      delayChildren: 0.2,
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 }
  },
  active: {
    boxShadow: '0 0 15px rgba(255, 215, 0, 0.7)',
    scale: 1.02,
    transition: { duration: 0.3 }
  },
  inactive: {
    boxShadow: '0 0 0px rgba(255, 215, 0, 0)',
    scale: 1,
    transition: { duration: 0.3 }
  },
  won: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    transition: { duration: 0.5 }
  },
  lost: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    transition: { duration: 0.5 }
  },
  draw: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    transition: { duration: 0.5 }
  }
};

// Cell animations
export const cellVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring', 
      damping: 12,
      stiffness: 200
    }
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.2 }
  },
  hover: {
    scale: 1.1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

// X mark animations
export const xMarkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      pathLength: { duration: 0.4, ease: 'easeOut' },
      opacity: { duration: 0.2 }
    }
  },
  exit: {
    pathLength: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// O mark animations
export const oMarkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      pathLength: { duration: 0.5, ease: 'easeOut' },
      opacity: { duration: 0.2 }
    }
  },
  exit: {
    pathLength: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Win line animations
export const winLineVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 0.7,
    transition: { 
      pathLength: { duration: 0.8, ease: 'easeOut' },
      opacity: { duration: 0.4 }
    }
  },
  exit: {
    pathLength: 0,
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Button animations
export const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      damping: 10,
      stiffness: 100
    }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 }
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.95,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    transition: { duration: 0.1 }
  }
};

// Text animations
export const textVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      damping: 12,
      stiffness: 100
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 }
  }
};

// Winner announcement animations
export const winnerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 8,
      stiffness: 80
    }
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.3 }
  }
};

// Menu animations
export const menuVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.5,
      when: 'beforeChildren',
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Page transition animations
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  in: { 
    opacity: 1,
    transition: { duration: 0.5 }
  },
  out: { 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Notification animations
export const notificationVariants: Variants = {
  hidden: { opacity: 0, y: -50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      damping: 15,
      stiffness: 200
    }
  },
  exit: {
    opacity: 0,
    y: -50,
    transition: { duration: 0.2 }
  }
};

// Particle animations (for celebrations)
export const particleVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.4
    }
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.2 }
  }
};