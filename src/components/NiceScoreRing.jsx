import { Box, Typography } from "@mui/material";
import { useState, useRef } from "react";

const NiceScoreRing = ({ score, maxScore = 420, tier }) => {
  const circumference = 2 * Math.PI * 90;
  const targetOffset = circumference - (score / maxScore) * circumference;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const [displayScore, setDisplayScore] = useState(0);
  const hasAnimated = useRef(false);

  if (!hasAnimated.current && score > 0) {
    hasAnimated.current = true;
    setTimeout(() => setAnimatedOffset(targetOffset), 50);
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    let step = 0;
    const countUp = () => {
      step++;
      current = Math.min(Math.round(increment * step), score);
      setDisplayScore(current);
      if (current < score) {
        setTimeout(countUp, duration / steps);
      }
    };
    setTimeout(countUp, 100);
  }

  return (
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ position: "relative", width: { xs: 180, md: 220 }, height: { xs: 180, md: 220 } }}>
        <svg viewBox="0 0 220 220" width="100%" height="100%">
          <circle
            cx={110}
            cy={110}
            r={90}
            stroke="#2d1b4e"
            strokeWidth={12}
            fill="none"
          />
          <circle
            cx={110}
            cy={110}
            r={90}
            stroke={tier.color}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            transform="rotate(-90 110 110)"
            style={{
              transition: "stroke-dashoffset 1.5s ease-out",
              filter: `drop-shadow(0 0 15px ${tier.color})`,
            }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: "2.5rem", fontWeight: 900, color: tier.color }}>
            {displayScore}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>
            /420
          </Typography>
        </Box>
      </Box>
      <Typography
        sx={{
          letterSpacing: 3,
          fontWeight: 700,
          color: tier.color,
          textAlign: "center",
          mt: 1,
        }}
      >
        {tier.label}
      </Typography>
    </Box>
  );
};

export default NiceScoreRing;
