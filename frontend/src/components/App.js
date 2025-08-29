import React, { Component } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import HomePage from "./HomePage";
import CreateRoomPage from "./CreateRoomPage";
import RoomJoinPage from "./RoomJoinPage";
import Room from "./Room";
import { startTransition } from "react";

export default class App extends Component {
  render() {
    return (
      <div className="center">
        <Router>
          <Switch>
            <Route exact path="/" component={HomePage} />
            <Route path="/create" component={CreateRoomPage} />
            <Route path="/join" component={RoomJoinPage} />
            <Route path="/room/:roomCode" component={Room} />
          </Switch>
        </Router>
      </div>
    );
  }
}

