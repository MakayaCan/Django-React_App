import React, { Component } from "react";
import { render } from "react-dom";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import HomePage from "./HomePage";
import CreateRoomPage from "./CreateRoomPage";
import RoomJoinPage from "./RoomJoinPage";
import Room from "./Room";

export default class App extends Component {
  constructor(props) {
    super(props);
  }

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

const appDiv = document.getElementById("app");
render(<App />, appDiv);
