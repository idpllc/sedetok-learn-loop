import { Crown } from "lucide-react";
import { motion } from "framer-motion";

interface StreakIndicatorProps {
  streak: number;
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const segments = 3;
  
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="relative w-64 h-24">
        {/* Crown icon in the center */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10">
          <div className="bg-card rounded-full p-2 border-4 border-background shadow-lg">
            <Crown className="w-6 h-6 text-yellow-500" fill="currentColor" />
          </div>
        </div>
        
        {/* Arc segments */}
        <svg
          viewBox="0 0 200 100"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#FCD34D', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#F59E0B', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 30 90 Q 30 30, 100 20 Q 170 30, 170 90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Progress segments */}
          {[0, 1, 2].map((index) => {
            const startAngle = 180 - (index * 50 + 10);
            const endAngle = 180 - ((index + 1) * 50 - 10);
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const radius = 70;
            const centerX = 100;
            const centerY = 90;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY - radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY - radius * Math.sin(endRad);
            
            const isFilled = index < streak;
            
            return (
              <motion.path
                key={index}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={isFilled ? "url(#goldGradient)" : "hsl(var(--muted))"}
                strokeWidth="12"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: isFilled ? 1 : 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            );
          })}
          
          {/* Dividers */}
          {[1, 2].map((index) => {
            const angle = 180 - (index * 50);
            const rad = (angle * Math.PI) / 180;
            
            const innerRadius = 64;
            const outerRadius = 76;
            const centerX = 100;
            const centerY = 90;
            
            const x1 = centerX + innerRadius * Math.cos(rad);
            const y1 = centerY - innerRadius * Math.sin(rad);
            const x2 = centerX + outerRadius * Math.cos(rad);
            const y2 = centerY - outerRadius * Math.sin(rad);
            
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--background))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        
        {/* Streak counter text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            {streak}/3
          </p>
        </div>
      </div>
    </div>
  );
}
