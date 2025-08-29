import React, { Component } from "react";
import {
  Grid,
  Typography,
  Card,
  IconButton,
  LinearProgress,
  Tooltip,
  Alert,
  Box,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PauseIcon from "@mui/icons-material/Pause";

export default class MusicPlayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      premiumRequired: false, // Track if user is non-Premium
      errorMessage: "", // Track other errors (e.g. no active device)
    };
  }

  // Get CSRF token from cookies
  getCSRFToken = () => {
    const csrftoken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
    return csrftoken;
  };

  handleResponse = async (response, action) => {
    try {
      const data = await response.json();

      if (!response.ok) {
        console.error(`Spotify API ${action} error:`, data);

        if (data.error?.reason === "PREMIUM_REQUIRED") {
          this.setState({
            premiumRequired: true,
            errorMessage: "Spotify Premium is required to control playback.",
          });
        } else {
          this.setState({
            errorMessage: data.error?.message || "An error occurred.",
          });
        }
      } else {
        console.log(`${action} response:`, data);
        this.setState({ errorMessage: "" }); // clear old errors if success
      }
    } catch (err) {
      console.error(`${action} error:`, err);
      this.setState({
        errorMessage: "Network error. Please try again.",
      });
    }
  };

  skipSong = () => {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.getCSRFToken(),
      },
    };

    fetch("/spotify/skip/", requestOptions).then((res) =>
      this.handleResponse(res, "Skip")
    );
  };

  pauseSong = () => {
    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.getCSRFToken(),
      },
    };

    fetch("/spotify/pause/", requestOptions).then((res) =>
      this.handleResponse(res, "Pause")
    );
  };

  playSong = () => {
    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.getCSRFToken(),
      },
    };

    fetch("/spotify/play/", requestOptions).then((res) =>
      this.handleResponse(res, "Play")
    );
  };

  render() {
    const songProgress = (this.props.time / this.props.duration) * 100;
    const { premiumRequired, errorMessage } = this.state;

    return (
      <Card sx={{ p: 2, position: "relative" }}>
        {errorMessage && (
          <Box mb={2}>
            <Alert severity="warning">{errorMessage}</Alert>
          </Box>
        )}

        <Grid container alignItems="center">
          <Grid item align="center" xs={4}>
            <img
              src={this.props.image_url}
              height="100%"
              width="100%"
              alt="Album Art"
            />
          </Grid>
          <Grid item align="center" xs={8}>
            <Typography component="h5" variant="h5">
              {this.props.title}
            </Typography>
            <Typography color="textSecondary" variant="subtitle1">
              {this.props.artist}
            </Typography>
            <div>
              <Tooltip
                title={
                  premiumRequired
                    ? "Spotify Premium is required for playback control"
                    : ""
                }
              >
                <span>
                  <IconButton
                    onClick={() =>
                      this.props.is_playing
                        ? this.pauseSong()
                        : this.playSong()
                    }
                    disabled={premiumRequired}
                  >
                    {this.props.is_playing ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  premiumRequired
                    ? "Spotify Premium is required for playback control"
                    : ""
                }
              >
                <span>
                  <IconButton
                    onClick={() => this.skipSong()}
                    disabled={premiumRequired}
                    >
                    {this.props.votes} / {" "} 
                    {this.props.votes_required} 
                   <SkipNextIcon />                    
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </Grid>
        </Grid>
        <LinearProgress
          variant="determinate"
          value={songProgress}
          sx={{ mt: 2 }}
        />
      </Card>
    );
  }
}
