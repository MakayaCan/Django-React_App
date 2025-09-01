import React, { Component } from 'react';
import RoomJoinPage from './RoomJoinPage';
import CreateRoomPage from './CreateRoomPage';
import Room from "./Room";
import { Grid, Button, ButtonGroup, Typography } from '@mui/material';
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from "react-router-dom";
import Info from './Info';

export default class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      roomCode: null,
    };
    this.clearRoomCode = this.clearRoomCode.bind(this);
  }

  async componentDidMount() {
    try {
      const response = await fetch('/api/user-in-room');
      const data = await response.json();
      this.setState({ roomCode: data.code });
    } catch (err) {
      console.error("Failed to fetch user room:", err);
    }
  }

  renderHomePage() {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} align='center'>
          <Typography variant="h3" component="h3">
            House Party
          </Typography>
        </Grid>
        <Grid item xs={12} align="center">
          <ButtonGroup disableElevation variant="contained" color="primary">
            <Button color="primary" to="/join" component={Link}>
              Join a Room
            </Button>
            <Button color="info" to="/info" component={Link}>
              Info
            </Button>
            <Button color="secondary" to="/create" component={Link}>
              Create a Room
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    );
  }

  clearRoomCode() {
    console.log("Clearing room code");
    this.setState({ roomCode: null });
  }

  render() {
    return (
      <Router>
        <Switch>
          <Route 
            exact path='/' 
            render={() => {
              return this.state.roomCode ? (
                <Redirect to={`/room/${this.state.roomCode}`} />
              ) : (
                this.renderHomePage()
              );
            }}
          />
          <Route path='/join' component={RoomJoinPage} />
          <Route path='/info' component={Info} />
          <Route path='/create' component={CreateRoomPage} />
          <Route 
            path="/room/:roomCode"
            render={(props) => (
              <Room {...props} leaveRoomCallback={this.clearRoomCode} />
            )}
          />
        </Switch>
      </Router>
    );
  }
}
