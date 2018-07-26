import React, { Component } from "react";
import "./App.css";
import DepositForm from "./DepositForm";
import WithdrawalForm from "./WithdrawalForm";
import { Footer, Card } from "react-materialize";
import FontAwesome from "react-fontawesome";

class App extends Component {
  render() {
    return (
      <div>
        <nav className="light-blue">
          <div className="nav-wrapper container">
            <FontAwesome name="anchor" /> {this.props.config.UI.anchorName}
          </div>
        </nav>
        <div className="container">
          <Card>
            The first Stripe USD anchor for Stellar. <br /> Deposit and withdraw
            with a card, and we never have access to your payment details so
            you're totally secure.
          </Card>
          <DepositForm config={this.props.config} />
          <WithdrawalForm config={this.props.config} />
        </div>
        <Footer
          className="light-blue"
          copyrights={
            "We never have access to your payment details. Problems? Email " +
            this.props.config.UI.supportEmail
          }
        />
      </div>
    );
  }
}

export default App;
