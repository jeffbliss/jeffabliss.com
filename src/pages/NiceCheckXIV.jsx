import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Button,
  CircularProgress,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShareIcon from "@mui/icons-material/Share";
import IconButton from "@mui/material/IconButton";
import { FFXIV_SERVERS } from "../data/niceConstants.js";
import { calculateNiceScore } from "../data/niceScoring.js";
import { asheVilleDemo } from "../data/asheVilleDemo.js";
import NiceScoreRing from "../components/NiceScoreRing.jsx";
import NiceCategoryCard from "../components/NiceCategoryCard.jsx";
import NiceMultipleAlerts from "../components/NiceMultipleAlerts.jsx";

const WORKER_URL = "https://nice-check-xiv.jeff-a-bliss.workers.dev";

const LOADING_MESSAGES = [
  "Consulting the Lodestone...",
  "Scanning for niceness...",
  "Checking if 69 is in range...",
  "Counting nice numbers...",
  "Evaluating meme potential...",
];

const floatingPositions = [
  { top: "5%", left: "5%", rotate: -15 },
  { top: "15%", right: "8%", rotate: 20 },
  { top: "45%", left: "2%", rotate: -30 },
  { top: "60%", right: "3%", rotate: 10 },
  { top: "80%", left: "10%", rotate: 25 },
  { top: "30%", left: "50%", rotate: -5 },
];

const darkInputSx = {
  "& .MuiOutlinedInput-root": {
    color: "white",
    "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
    "&:hover fieldset": { borderColor: "rgba(187,134,252,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#bb86fc" },
  },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#bb86fc" },
  "& .MuiSelect-icon": { color: "rgba(255,255,255,0.5)" },
};

function NiceCheckXIV() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialName = searchParams.get("name") || "";
  const initialServer = searchParams.get("server") || "";
  const [characterName, setCharacterName] = useState(initialName);
  const [selectedServer, setSelectedServer] = useState(initialServer);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [copied, setCopied] = useState(false);
  const loadingTimerRef = useRef(null);
  const autoLookedUp = useRef(false);

  if (initialName && initialServer && !autoLookedUp.current && !result && !loading) {
    autoLookedUp.current = true;
    setTimeout(() => handleLookup(initialName, initialServer), 0);
  }

  const handleDemo = () => {
    setError(null);
    clearInterval(loadingTimerRef.current);
    setLoading(false);
    const scoreResult = calculateNiceScore(
      asheVilleDemo.character,
      asheVilleDemo.totals,
    );
    setResult({
      character: asheVilleDemo.character,
      scoreResult,
      isDemo: true,
    });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/ffxiv69?name=${encodeURIComponent(characterName.trim())}&server=${encodeURIComponent(selectedServer)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLookup = async (nameOverride, serverOverride) => {
    const name = nameOverride || characterName.trim();
    const server = serverOverride || selectedServer;
    if (!name || !server) {
      setError("Enter a character name and select a server.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingMsg(LOADING_MESSAGES[0]);
    let msgIndex = 0;
    loadingTimerRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIndex]);
    }, 2000);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(
        `${WORKER_URL}/api/character?name=${encodeURIComponent(name)}&server=${encodeURIComponent(server)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const data = await res.json();
      if (data.ok) {
        const scoreResult = calculateNiceScore(data.character, data.totals);
        setResult({ character: data.character, scoreResult, isDemo: false });
        setSearchParams({ name, server }, { replace: true });
      } else if (data.error === "not_found") {
        setError("Character not found. Check the spelling and server.");
      } else {
        handleDemo();
      }
    } catch {
      handleDemo();
    }
    clearInterval(loadingTimerRef.current);
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minHeight: "100dvh",
        background:
          "linear-gradient(180deg, #1a0a2e 0%, #16082b 50%, #1e0633 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {floatingPositions.map((pos, i) => (
        <Typography
          key={i}
          sx={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            right: pos.right,
            opacity: 0.04,
            fontSize: { xs: "6rem", md: "12rem" },
            color: "white",
            pointerEvents: "none",
            userSelect: "none",
            transform: `rotate(${pos.rotate}deg)`,
            lineHeight: 1,
          }}
        >
          69
        </Typography>
      ))}

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          px: { xs: 1.5, sm: 3, md: 4 },
          py: { xs: 2, md: 4 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <IconButton
          onClick={() => navigate("/")}
          sx={{ color: "white", mb: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "1.5rem", sm: "1.8rem", md: "2.5rem" },
            background: "linear-gradient(135deg, #bb86fc, #ff79c6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
            mb: 0.5,
          }}
        >
          NICE CHECK XIV
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "#888",
            textAlign: "center",
            mb: { xs: 2, md: 3 },
            fontSize: { xs: "0.8rem", md: "0.875rem" },
          }}
        >
          How nice is your character? Let's find out.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: { xs: 1.5, md: 2 },
            justifyContent: "center",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "flex-end" },
            mb: { xs: 3, md: 4 },
          }}
        >
          <TextField
            label="Character Name"
            variant="outlined"
            size="small"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            sx={{ ...darkInputSx, minWidth: { md: 220 } }}
            slotProps={{ htmlInput: { autoComplete: "off" } }}
          />
          <FormControl
            size="small"
            sx={{ minWidth: { xs: "100%", md: 200 }, ...darkInputSx }}
          >
            <InputLabel>Server</InputLabel>
            <Select
              variant="outlined"
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              label="Server"
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 300,
                    bgcolor: "#1a0a2e",
                    "& .MuiMenuItem-root": { color: "white" },
                    "& .MuiMenuItem-root:hover": {
                      bgcolor: "rgba(187,134,252,0.15)",
                    },
                    "& .MuiMenuItem-root.Mui-selected": {
                      bgcolor: "rgba(187,134,252,0.25)",
                    },
                  },
                },
              }}
            >
              {FFXIV_SERVERS.map((group) => [
                <ListSubheader
                  key={group.dc}
                  sx={{
                    color: "#ffaa00",
                    fontWeight: "bold",
                    backgroundColor: "#1a0a2e",
                    lineHeight: "32px",
                  }}
                >
                  {group.dc} ({group.region})
                </ListSubheader>,
                ...group.servers.map((server) => (
                  <MenuItem key={server} value={server}>
                    {server}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: { xs: "row", md: "row" },
            }}
          >
            <Button
              variant="contained"
              onClick={() => handleLookup()}
              disabled={loading}
              sx={{
                background: "linear-gradient(135deg, #bb86fc, #ff79c6)",
                fontWeight: 700,
                px: 3,
                flex: { xs: 1, md: "none" },
                minHeight: 40,
                "&:hover": {
                  background: "linear-gradient(135deg, #a06cd5, #e56eb3)",
                },
              }}
            >
              Check Niceness
            </Button>
            <Button
              variant="outlined"
              onClick={handleDemo}
              sx={{
                borderColor: "rgba(255,255,255,0.3)",
                color: "rgba(255,255,255,0.7)",
                minHeight: 40,
                "&:hover": {
                  borderColor: "#bb86fc",
                  color: "#bb86fc",
                },
              }}
            >
              Demo
            </Button>
          </Box>
        </Box>

        {error && (
          <Typography
            sx={{
              color: "#f44336",
              textAlign: "center",
              mb: 2,
              fontSize: { xs: "0.85rem", md: "1rem" },
            }}
          >
            {error}
          </Typography>
        )}

        {loading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              mt: 4,
            }}
          >
            <CircularProgress sx={{ color: "#bb86fc" }} />
            <Typography sx={{ color: "#888", fontSize: { xs: "0.85rem", md: "1rem" } }}>
              {loadingMsg}
            </Typography>
          </Box>
        )}

        {result && (
          <Box>
            {result.isDemo && (
              <Box
                sx={{
                  background: "rgba(255,121,198,0.1)",
                  border: "1px solid rgba(255,121,198,0.3)",
                  borderRadius: 2,
                  p: { xs: 1.5, md: 2 },
                  mb: 3,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "#ff79c6", fontSize: { xs: "0.8rem", md: "0.875rem" } }}
                >
                  Lodestone is sleeping. Showing demo for Ashe Ville @
                  Ultros.
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.5, md: 2 },
                justifyContent: "center",
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              {result.character.portrait && (
                <Box
                  component="img"
                  src={result.character.portrait}
                  alt={result.character.name}
                  sx={{
                    width: { xs: 56, md: 80 },
                    height: { xs: 56, md: 80 },
                    borderRadius: 1,
                    border: "2px solid rgba(187,134,252,0.3)",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                <Typography
                  variant="h5"
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: { xs: "1.2rem", md: "1.5rem" },
                  }}
                >
                  {result.character.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#888", fontSize: { xs: "0.75rem", md: "0.875rem" } }}
                >
                  {result.character.server} [{result.character.datacenter}]
                  {result.character.activeJob?.level &&
                    ` \u2022 ${result.character.activeJob.name ? result.character.activeJob.name : ""} Lv.${result.character.activeJob.level}`}
                </Typography>
                {result.character.title && (
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {result.character.title}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: { xs: 2, md: 4 },
              }}
            >
              <NiceScoreRing
                score={result.scoreResult.totalScore}
                maxScore={420}
                tier={result.scoreResult.overallTier}
              />
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.5)",
                textAlign: "center",
                mb: { xs: 2, md: 3 },
                fontStyle: "italic",
                fontSize: { xs: "0.8rem", md: "0.875rem" },
              }}
            >
              {result.scoreResult.overallTier.tagline}
            </Typography>

            {!result.isDemo && (
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  sx={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#bb86fc",
                      color: "#bb86fc",
                    },
                  }}
                >
                  {copied ? "Link copied!" : "Share results"}
                </Button>
              </Box>
            )}

            <Grid container spacing={{ xs: 1.5, md: 2 }}>
              {result.scoreResult.categories.map((cat) => (
                <Grid key={cat.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <NiceCategoryCard
                    name={cat.name}
                    score={cat.score}
                    maxScore={cat.maxScore}
                    details={cat.details}
                    tier={cat.tier}
                  />
                </Grid>
              ))}
            </Grid>

            <NiceMultipleAlerts
              alerts={result.scoreResult.niceMultiples}
            />

            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: "center",
                color: "rgba(255,255,255,0.2)",
                mt: 4,
                pb: 2,
                fontSize: { xs: "0.65rem", md: "0.75rem" },
              }}
            >
              nice check xiv &bull; not affiliated with Square Enix &bull;
              for memes only
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default NiceCheckXIV;
