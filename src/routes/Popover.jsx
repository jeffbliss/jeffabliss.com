import { Popover, Typography } from "@suid/material";
import { createSignal } from "solid-js";
import { ListOfSymbolsAndNotations } from "~/configuration/japanesehandbook";
import { For } from "solid-js";

export default function MouseOverPopover() {
  const [anchorEl, setAnchorEl] = createSignal(null);

  const handlePopoverOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = () => Boolean(anchorEl());

  return (
    <div>
      <For each={Object.entries(ListOfSymbolsAndNotations)}>{([key, value]) => {
        return (
          <Typography
            aria-owns={open() ? "mouse-over-popover" : undefined}
            aria-haspopup="true"
            onMouseEnter={handlePopoverOpen}
            onMouseLeave={handlePopoverClose}
          >
            <h1>
              {key}
            </h1>
            <Popover
              id="mouse-over-popover"
              sx={{ pointerEvents: "none" }}
              open={open()}
              anchorEl={anchorEl()}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              onClose={handlePopoverClose}
              disableRestoreFocus
            >
              <Typography sx={{ p: 1 }}>{value.meaning}</Typography>
              <ul>
                <For each={value.examples}>{(example) => {
                  return (
                    <li>
                      {example}
                    </li>
                  );
                }}</For>
              </ul>
            </Popover>
          </Typography>
          
        );}}
      </For>
    </div>
  );
}