import { Box, Typography } from "@mui/material";

function NiceMultipleAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <Box
      sx={{
        background: "rgba(255,121,198,0.06)",
        border: "1px solid rgba(255,121,198,0.2)",
        borderRadius: 2,
        p: 2,
        mt: 3,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: "#ff79c6", fontWeight: 700, mb: 1 }}>
        NICE MULTIPLE ALERTS
      </Typography>
      {alerts.map((alert, index) => (
        <Box key={index} sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "#ccc" }}>
            <Typography component="span" sx={{ fontWeight: "bold", color: "#ff79c6" }}>
              {alert.field}{" "}
            </Typography>
            {alert.value} = 69 x {alert.quotient}
            {alert.remainder === 0 ? " (exact!)" : ` (±${Math.abs(alert.remainder)})`}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default NiceMultipleAlerts;
