import { Box, Grid, Typography } from "@mui/material";

const staffMembers = [
  {
    name: "Karin Rogers",
    image: "/photos/nemac_staff/karin.png",
    title: "Director",
  },
  {
    name: "Greg Dobson",
    image: "/photos/nemac_staff/greg.jpeg",
    title: "Director of GIS and Engagement",
  },
  {
    name: "Dave Michelson",
    image: "/photos/nemac_staff/lol_dave.png",
    title: "Chief LOL Officer",
  },
  {
    name: "Jessica Orlando",
    image: "/photos/nemac_staff/jessica.jpeg",
    title: "Geospatial Research Scientist",
  },
  {
    name: "Ian Johnson",
    image: "/photos/nemac_staff/ian.jpeg",
    title: "Senior Geospatial Analyst",
  },
  {
    name: "Ashlyn Dunsworth",
    image: "/photos/nemac_staff/ashlyn.jpeg",
    title: "Science Editor",
  },
  {
    name: "Jeff Bliss",
    image: "/photos/nemac_staff/jeff.jpeg",
    title: "Senior Software Developer",
  },
  {
    name: "Grace Chien",
    image: "/photos/nemac_staff/grace.jpeg",
    title: "UX Designer",
  },
  {
    name: "Cynthia Fountain",
    image: "/photos/nemac_staff/cynthia.png",
    title: "Administrative Associate",
  },
  {
    name: "Dani Levy",
    image: "/photos/nemac_staff/dani.jpeg",
    title: "Software Developer",
  },
  {
    name: "Gina Martinez",
    image: "/photos/nemac_staff/gina.png",
    title: "UX Designer",
  },
];

function Claude_Code_Jeff() {
  return (
    <Box sx={{ padding: 4 }}>
      <Box
        sx={{
          textAlign: "center",
          marginBottom: 4,
          position: "relative",
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: "#f0b90b",
            fontWeight: "bold",
            marginBottom: 2,
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 3,
              background: "#f0b90b",
              borderRadius: "50px",
            },
          }}
        >
          About NEMAC
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {staffMembers.map((member, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={index}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 2,
              }}
            >
              <Box
                component="img"
                src={member.image}
                alt={member.name}
                sx={{
                  width: 300,
                  height: 300,
                  borderRadius: "16px",
                  border: "3px solid #28a745",
                  objectFit: "cover",
                  marginBottom: 2,
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "black",
                  textAlign: "center",
                  marginBottom: 1,
                }}
              >
                {member.name}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: "bold",
                  color: "#6c757d",
                  textAlign: "center",
                }}
              >
                {member.title}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Claude_Code_Jeff;