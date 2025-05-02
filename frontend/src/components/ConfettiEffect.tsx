import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  winner: 'X' | 'O' | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  fallDuration: number;
}

/**
 * Component for rendering a confetti celebration effect
 */
const ConfettiEffect: React.FC<ConfettiProps> = ({ winner }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    if (!winner) return;
    
    // Generate particles only when there's a winner
    const particleCount = 100;
    const newParticles: Particle[] = [];
    
    const colors = winner === 'X' 
      ? ['#FF5252', '#FF1493', '#FFD700', '#FF8C00', '#ffffff'] 
      : ['#4CAF50', '#2196F3', '#00BCD4', '#FFD700', '#ffffff'];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        fallDuration: Math.random() * 4 + 2
      });
    }
    
    setParticles(newParticles);
    
    // Clean up particles after animation is done
    const timer = setTimeout(() => {
      setParticles([]);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [winner]);
  
  return (
    <div className="confetti-container">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="confetti"
          style={{
            '--color': particle.color,
            '--fall-duration': `${particle.fallDuration}s`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
          } as React.CSSProperties}
          initial={{ y: -100, opacity: 1, scale: 1 }}
          animate={{ 
            y: window.innerHeight, 
            opacity: 0,
            scale: 0.5,
            rotate: Math.random() * 720 - 360,
            x: Math.random() * 200 - 100,
          }}
          transition={{ 
            duration: particle.fallDuration,
            ease: 'easeIn',
            delay: Math.random() * 0.5
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiEffect;