import { Box, Typography } from "@mui/material";
import { TIER_COLORS } from "../data/niceConstants.js";

function NiceCategoryCard({ name, score, maxScore, details, tier }) {
  const tierTextColor = tier === "MEH" ? "#aaa" : tier === "SAD" ? "#666" : "white";

  return (
    <Box
      sx={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(187,134,252,0.2)",
        borderRadius: 2,
        p: 2,
        height: "100%",
        transition: "all 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 0 20px ${TIER_COLORS[tier]}33`,
        },
        ...(tier === "LEGENDARY" && {
          boxShadow: "0 0 15px rgba(255,170,0,0.15)",
        }),
        ...(tier === "SAD" && {
          opacity: 0.6,
        }),
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "white" }}>
          {name}
        </Typography>
        <Box sx={{ display: "inline-block", background: TIER_COLORS[tier], px: 1, py: 0.25, borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: tierTextColor }}>
            {tier}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: TIER_COLORS[tier] }}>
          {score}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)" }}>
          /{maxScore}
        </Typography>
      </Box>
      <Box sx={{ height: 4, borderRadius: 2, background: "#1a0a2e", overflow: "hidden" }}>
        <Box
          sx={{
            width: `${(score / maxScore) * 100}%`,
            height: "100%",
            background: TIER_COLORS[tier],
            borderRadius: 2,
            transition: "width 1s ease-out",
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", mt: 1, display: "block" }}>
        {details}
      </Typography>
    </Box>
  );
}

export default NiceCategoryCard;
