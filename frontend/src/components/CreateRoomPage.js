import React, { Component } from 'react';
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Collapse from "@mui/material/Collapse";
import Alert from "@mui/material/Alert";
import { Link, withRouter } from "react-router-dom";

class CreateRoomPage extends Component {
    static defaultProps = {
        votesToSkip: 2,
        guestCanPause: true,
        update: false,
        roomCode: null,
        updateCallback: () => {},
    }

    constructor(props) {
        super(props);
        this.state = {
            guestCanPause: this.props.guestCanPause,
            votesToSkip: this.props.votesToSkip,
            errorMsg: "",
            successMsg: "",
        };

        this.handleRoomButtonPressed = this.handleRoomButtonPressed.bind(this);
        this.handleVotesChange = this.handleVotesChange.bind(this);
        this.handleGuestCanPauseChange = this.handleGuestCanPauseChange.bind(this);
        this.handleUpdateButtonPressed = this.handleUpdateButtonPressed.bind(this);
        this.handlePauseButtonPressed = this.handlePauseButtonPressed.bind(this);
        this.handlePlayButtonPressed = this.handlePlayButtonPressed.bind(this);
    }

    handleVotesChange(e) {
        this.setState({
            votesToSkip: parseInt(e.target.value)
        });
    }

    handleGuestCanPauseChange(e) {
        this.setState({
            guestCanPause: e.target.value === 'true'
        });
    }

    handleRoomButtonPressed() {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                votes_to_skip: this.state.votesToSkip,
                guest_can_pause: this.state.guestCanPause,
            }),
        };
        fetch('/api/create-room', requestOptions)
            .then(response => response.json())
            .then(data => {
                this.props.history.push("/room/" + data.code);
            });
    }

    handleUpdateButtonPressed() {
        this.setState({ successMsg: "", errorMsg: "" });

        const requestOptions = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                votes_to_skip: this.state.votesToSkip,
                guest_can_pause: this.state.guestCanPause,
                code: this.props.roomCode
            }),
        };

        fetch('/api/update-room', requestOptions)
            .then(response => {
                if (response.ok) {
                    this.setState({ successMsg: "Room updated successfully!", errorMsg: "" });
                    this.props.updateCallback();
                } else {
                    this.setState({ errorMsg: "Error updating room...", successMsg: "" });
                }
            })
            .catch(error => {
                this.setState({ errorMsg: "Network error: " + error, successMsg: "" });
            });
    }

    getCSRFToken() {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
    }

    // --- PLAY / PAUSE BUTTONS ---
    handlePauseButtonPressed() {
        const csrftoken = this.getCSRFToken();

        fetch('/spotify/pause', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw data; });
            }
            return response.json();
        })
        .then(data => {
            console.log("Pause successful:", data);
            this.setState({ successMsg: "Paused successfully!", errorMsg: "" });
        })
        .catch(error => {
            console.error("Pause failed:", error);
            this.setState({ errorMsg: error.error || "Pause failed", successMsg: "" });
        });
    }

    handlePlayButtonPressed() {
        const csrftoken = this.getCSRFToken();

        fetch('/spotify/play', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw data; });
            }
            return response.json();
        })
        .then(data => {
            console.log("Play successful:", data);
            this.setState({ successMsg: "Playing successfully!", errorMsg: "" });
        })
        .catch(error => {
            console.error("Play failed:", error);
            this.setState({ errorMsg: error.error || "Play failed", successMsg: "" });
        });
    }

    renderCreateButtons() {
        return (
            <Grid container spacing={1}>
                <Grid item xs={12} align="center">
                    <Button
                        color="primary"
                        variant="contained"
                        onClick={this.handleRoomButtonPressed}
                    >
                        Create A Room
                    </Button>
                </Grid>
                <Grid item xs={12} align="center">
                    <Button color="secondary" variant="contained" to="/" component={Link}>
                        Back
                    </Button>
                </Grid>
            </Grid>
        );
    }

    renderUpdateButtons() {
        return (
            <Grid item xs={12} align="center">
                <Button
                    color="primary"
                    variant="contained"
                    onClick={this.handleUpdateButtonPressed}
                >
                    Update Room
                </Button>
            </Grid>
        );
    }

    render() {
        const { errorMsg, successMsg, votesToSkip } = this.state;
        const title = this.props.update ? "Update Room" : "Create a Room";

        return (
            <Grid container spacing={1}>
                <Grid item xs={12} align="center">
                    <Collapse in={errorMsg !== "" || successMsg !== ""}>
                        {successMsg !== "" ? (
                            <Alert severity="success" onClose={() => this.setState({ successMsg: "" })}>
                                {successMsg}
                            </Alert>
                        ) : (
                            <Alert severity="error" onClose={() => this.setState({ errorMsg: "" })}>
                                {errorMsg}
                            </Alert>
                        )}
                    </Collapse>
                </Grid>

                <Grid item xs={12} align="center">
                    <Typography component='h4' variant='h4'>
                        {title}
                    </Typography>
                </Grid>

                <Grid item xs={12} align="center">
                    <FormControl component="fieldset">
                        <FormHelperText>
                            <div align='center'>Guest Control of Playback State</div>
                        </FormHelperText>
                        <RadioGroup
                            row
                            defaultValue={this.props.guestCanPause.toString()}
                            onChange={this.handleGuestCanPauseChange}
                        >
                            <FormControlLabel
                                value="true"
                                control={<Radio color="primary" />}
                                label="Play/Pause"
                                labelPlacement="bottom"
                            />
                            <FormControlLabel
                                value="false"
                                control={<Radio color="secondary" />}
                                label="No Control"
                                labelPlacement="bottom"
                            />
                        </RadioGroup>
                    </FormControl>
                </Grid>

                <Grid item xs={12} align="center">
                    <FormControl>
                        <TextField
                            required
                            type="number"
                            onChange={this.handleVotesChange}
                            defaultValue={votesToSkip}
                            inputProps={{
                                min: 1,
                                style: { textAlign: "center" }
                            }}
                        />
                        <FormHelperText>
                            <div align="center">Votes Required To Skip Song</div>
                        </FormHelperText>
                    </FormControl>
                </Grid>

                {/* PLAY / PAUSE BUTTONS */}
                <Grid item xs={12} align="center">
                    <Button
                        color="primary"
                        variant="contained"
                        onClick={this.handlePlayButtonPressed}
                        style={{ marginRight: '10px' }}
                    >
                        Play
                    </Button>
                    <Button
                        color="secondary"
                        variant="contained"
                        onClick={this.handlePauseButtonPressed}
                    >
                        Pause
                    </Button>
                </Grid>

                {this.props.update
                    ? this.renderUpdateButtons()
                    : this.renderCreateButtons()}
            </Grid>
        );
    }
}

export default withRouter(CreateRoomPage);
