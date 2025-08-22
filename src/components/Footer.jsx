import {
  Box,
  IconButton,
  Tooltip,
  Popover,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { HelpOutline, ExpandMore } from "@mui/icons-material";
import { useState } from "react";
import { prompts } from "../prompts";

const Footer = ({ pagePrompts = "No prompts available for this page" }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const open = Boolean(anchorEl);

  return (
    <Box
      component="footer"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#228B22",
        padding: 1,
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <Tooltip title="See prompt used">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ color: "white" }}
        >
          <HelpOutline />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        disablePortal
        sx={{
          "& .MuiPopover-paper": {
            position: "fixed",
            width: "500px",
            height: "400px",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
          <Accordion
            expanded={expanded === "thisPage"}
            onChange={handleAccordionChange("thisPage")}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Prompts used in this page</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {pagePrompts}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === "general"}
            onChange={handleAccordionChange("general")}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Prompts used for general development</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {prompts.general}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === "footer"}
            onChange={handleAccordionChange("footer")}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Prompts used for Footer component</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {prompts.Footer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Popover>
    </Box>
  );
};

export default Footer;
