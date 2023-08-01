import { Title } from "solid-start";
import styled from "@suid/system/styled";
import { Box } from "@suid/material";
import { For } from "solid-js";
import { IconButton } from "@suid/material";
import DeleteIcon from "@suid/icons-material/Delete";
import { ListOfSymbolsAndNotations } from "~/configuration/japanesehandbook";

const StyledBox = styled(Box)({
  color: "darkslategray",
  backgroundColor: "aliceblue",
  padding: 8,
  borderRadius: 4,
});

export default function JapaneseHandbook() {

  return (
    <StyledBox>
      <Title>Japanese Handbook</Title>
      <IconButton>
        <DeleteIcon />
      </IconButton>
      <For each={Object.entries(ListOfSymbolsAndNotations)}>{([key, value]) => {
        return (
          <>
            <h1>
              {key}
            </h1>
            <p>
              {value.meaning}
            </p>
            <ul>
              <For each={value.examples}>{(example) => {
                return (
                  <li>
                    {example}
                  </li>
                );
              }}</For>
            </ul>
          </>
          
        );}}
      </For>
      {/* <div use:tooltip="top" title="the title!">
        hover me!
      </div> */}
    </StyledBox>
  );
}
