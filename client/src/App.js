import React, { Component } from "react";
import "./App.css";
import DepositForm from "./DepositForm.js";
import WithdrawalForm from "./WithdrawalForm.js";
import { StripeProvider } from "react-stripe-elements";
import { Footer, Card } from "react-materialize";


class App extends Component {
  render() {
    return (
      <div className="App">
      <h1 className="App-title">Welcome to {this.props.config.UI.anchorName}</h1>
        <Card >
          The first Stripe anchor for Stellar. <br /> Deposit and withdraw with a card, and we never have access to your payment details so you're totally secure. 
        </Card>
        <StripeProvider apiKey="pk_test_12345">
          <div>
            <DepositForm config={this.props.config} />
            <WithdrawalForm config={this.props.config} />
          </div>
        </StripeProvider>
        <Footer copyrights="We never have access to your payment details.">
        </Footer>
      </div>
    );
  }
}

export default App;
