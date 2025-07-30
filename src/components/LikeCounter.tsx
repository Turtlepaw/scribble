import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

interface LikeCounterProps {
  count: number;
  className?: string;
}

function LikeCounter({ count, className = "" }: LikeCounterProps) {
  const [displayCount, setDisplayCount] = useState<number>(count);
  const [previousCount, setPreviousCount] = useState<number>(count);
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    if (count !== displayCount) {
      setPreviousCount(displayCount);
      setDirection(count > displayCount ? "up" : "down");
      setDisplayCount(count);
    }
  }, [count, displayCount]);

  return (
    <div
      className={`relative inline-block overflow-hidden h-[1.2em] ${className}`}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
      }}
    >
      <motion.div
        key={`${previousCount}-${displayCount}`}
        className="flex flex-col"
        initial={{
          y: direction === "up" ? "0%" : "-50%",
        }}
        animate={{
          y: direction === "up" ? "-50%" : "0%",
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 200,
          duration: 0.4,
        }}
      >
        {/* Old number (what we're transitioning FROM) */}
        <div className="flex items-center justify-center h-[1.2em]">
          {String(direction == "down" ? displayCount : previousCount)}
        </div>
        {/* New number (what we're transitioning TO) */}
        <div className="flex items-center justify-center h-[1.2em]">
          {String(direction == "up" ? displayCount : previousCount)}
        </div>
      </motion.div>
    </div>
  );
}

export default LikeCounter;
