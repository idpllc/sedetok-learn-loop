import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TriviaCategory } from "@/hooks/useTriviaGame";
import { motion } from "framer-motion";

interface TriviaWheelProps {
  categories: TriviaCategory[];
  onCategorySelected: (category: TriviaCategory) => void;
  disabled?: boolean;
}

export const TriviaWheel = ({ categories, onCategorySelected, disabled = false }: TriviaWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<TriviaCategory | null>(null);

  const spinWheel = () => {
    if (isSpinning || categories.length === 0 || disabled) return;

    setIsSpinning(true);
    setSelectedCategory(null);

    // Random category
    const randomIndex = Math.floor(Math.random() * categories.length);
    const selected = categories[randomIndex];

    // Calculate rotation (multiple full spins + position)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const segmentAngle = 360 / categories.length;
    const targetAngle = randomIndex * segmentAngle;
    const totalRotation = spins * 360 + targetAngle;

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedCategory(selected);
      setTimeout(() => {
        onCategorySelected(selected);
      }, 1000);
    }, 4000);
  };

  const segmentAngle = 360 / categories.length;

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 space-y-6">
      <h2 className="text-2xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        ¡Gira la Ruleta!
      </h2>

      <Card className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full overflow-hidden shadow-2xl">
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: "easeOut" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {categories.map((category, index) => {
              const startAngle = index * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);

              const largeArc = segmentAngle > 180 ? 1 : 0;

              return (
                <g key={category.id}>
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={category.color}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                  <text
                    x="50"
                    y="50"
                    fill="white"
                    fontSize="6"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(${index * segmentAngle + segmentAngle / 2} 50 50) translate(0 -25)`}
                  >
                    {category.icon}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-yellow-400" />
        </div>

        {/* Center button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-lg" />
        </div>
      </Card>

      {selectedCategory && !isSpinning && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-2"
        >
          <div className="text-4xl">{selectedCategory.icon}</div>
          <h3 className="text-xl md:text-2xl font-bold" style={{ color: selectedCategory.color }}>
            {selectedCategory.name}
          </h3>
          <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
        </motion.div>
      )}

      <Button
        size="lg"
        onClick={spinWheel}
        disabled={isSpinning || disabled}
        className="text-lg font-bold px-8 py-6 rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        {isSpinning ? "Girando..." : disabled ? "Esperando turno..." : "¡Girar Ruleta!"}
      </Button>
    </div>
  );
};
