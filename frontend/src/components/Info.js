import React, { useEffect, useState } from "react";
import { Grid, Button, Typography, IconButton } from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Link } from "react-router-dom";

const pages = [
  {
    key: "join",
    title: "Joining a Room",
    description:
      "Enter a room code shared by a friend to join their House Party session. You’ll be able to listen along and interact.",
  },
  {
    key: "create",
    title: "Creating a Room",
    description:
      "Start your own House Party session by creating a room. Share the code with your friends so they can join you.",
  },
];

export default function Info() {
  const [pageIndex, setPageIndex] = useState(0);
  const current = pages[pageIndex];

  const nextPage = () => setPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
  const prevPage = () => setPageIndex((prev) => Math.max(prev - 1, 0));

  useEffect(() => {
    console.log("Info page mounted");
    return () => console.log("Info page unmounted");
  }, []); // ✅ only run on mount/unmount

  return (
    <Grid container spacing={2}>
      {/* Title */}
      <Grid item xs={12} align="center">
        <Typography component="h4" variant="h4">
          What is House Party?
        </Typography>
      </Grid>

      {/* Page Title */}
      <Grid item xs={12} align="center">
        <Typography component="h5" variant="h5">
          {current.title}
        </Typography>
      </Grid>

      {/* Page Description */}
      <Grid item xs={12} align="center">
        <Typography variant="body1">{current.description}</Typography>
      </Grid>

      {/* Navigation Buttons */}
      <Grid item xs={12} align="center">
        <IconButton onClick={prevPage} disabled={pageIndex === 0}>
          <NavigateBeforeIcon />
        </IconButton>
        <IconButton onClick={nextPage} disabled={pageIndex === pages.length - 1}>
          <NavigateNextIcon />
        </IconButton>
      </Grid>

      {/* Back to Home */}
      <Grid item xs={12} align="center">
        <Button color="secondary" variant="contained" to="/" component={Link}>
          Back
        </Button>
      </Grid>
    </Grid>
  );
}
