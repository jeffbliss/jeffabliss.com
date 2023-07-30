import { Title } from "solid-start";
import styled from "@suid/system/styled";
import { Box } from "@suid/material";
import { TextField } from "@suid/material";
import { createSignal } from "solid-js";

const StyledBox = styled(Box)({
  color: "darkslategray",
  backgroundColor: "aliceblue",
  padding: 8,
  borderRadius: 4,
});

const [answer, setAnswer] = createSignal('42');

export default function About() {
  return (
    <StyledBox>
      <Title>About Page</Title>
      <TextField
        id="outlined-basic"
        label="Outlined"
        variant="outlined"
        onChange={(e) => setAnswer(e.target.value)}
      />
      <p>
        {answer()}
      </p>
    </StyledBox>
  );
}
