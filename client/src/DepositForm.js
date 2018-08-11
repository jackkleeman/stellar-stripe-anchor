import React, { Component } from "react";
import { deposit } from "./apiUtils.js";
import { Button, Card, Modal } from "react-materialize";
import CurrencyInput from "react-currency-input";
import StripeCheckout from "react-stripe-checkout";

class DepositForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stellarAddress: "",
      amount: "0.00",
      centAmount: 0,
      transactionID: ""
    };
    this.handleAddressChange = this.handleAddressChange.bind(this);

    this.handleAmountChange = this.handleAmountChange.bind(this);
  }

  handleAddressChange(event) {
    this.setState({ stellarAddress: event.target.value });
  }
  handleAmountChange(event, maskedValue, floatValue) {
    this.setState({
      amount: event.target.value,
      centAmount: Math.round(floatValue * 100)
    });
  }
  onToken = token => {
    window.$(document).ready(function() {
      window
        .$("#depModal")
        .modal({
          dismissible: false
        })
        .modal("open");
    });
    deposit(token, this.state.stellarAddress, this.state.centAmount)
      .then(transactionID => {
        this.setState({ transactionID });
      })
      .catch(err => {
        console.log("caught");
        console.log(err);
        this.setState({ transactionID: "FAIL" });
      });
  };
  render() {
    console.log(this.state.transactionID);
    return (
      <div>
        <Modal
          id="depModal"
          header={
            this.state.transactionID
              ? this.state.transactionID !== "FAIL"
                ? "Deposit succeeded"
                : "Deposit failed"
              : "Processing deposit..."
          }
          modalOptions={{
            complete: () => {
              this.setState({ transactionID: "" });
            }
          }}
        >
          <p>
            {this.state.transactionID ? (
              this.state.transactionID !== "FAIL" ? (
                <div>
                  Your deposit has completed successfully with transaction ID:{" "}
                  <br />{" "}
                  <a
                    href={
                      "https://stellarchain.io/tx/" + this.state.transactionID
                    }
                  >
                    {this.state.transactionID}
                  </a>
                </div>
              ) : (
                "Your deposit did not complete successfully. If you have been charged, please contact support at " +
                this.props.config.UI.supportEmail
              )
            ) : (
              "Your deposit is being processed and we are attempting to send your funds."
            )}
          </p>
        </Modal>
        <Card title="Deposit">
          <p>
            To be able to receive your deposit, you must trust issuer: <br />
            <b style={{ wordWrap: "break-word" }}>
              {this.props.config.bridge.issuerID}
            </b>{" "}
            <br />
            Deposits are charged the Stripe fee of 2.9% + $0.30, and the minimum
            is $10.<br />
            We are not responsible for incorrect account IDs.
          </p>
          <div style={{ textAlign: "center" }}>
            <label>
              Deposit Quantity
              <CurrencyInput
                prefix="$"
                className="formInput"
                style={{ base: { fontSize: "18px" } }}
                onChangeEvent={this.handleAmountChange}
                value={this.state.amount}
              />
            </label>
            <label>
              Stellar Account ID
              <input
                className="formInput"
                style={{ base: { fontSize: "18px" } }}
                value={this.state.stellarAddress}
                onChange={this.handleAddressChange}
              />
            </label>
            <StripeCheckout
              name={this.props.config.anchorName}
              token={this.onToken}
              stripeKey={this.props.config.stripe.publishableAPIKey}
              billingAddress={true}
              amount={this.state.centAmount}
              zipCode={true}
            >
              <Button
                disabled={
                  this.state.centAmount < 1000 ||
                  this.state.stellarAddress.length !== 56
                }
              >
                Pay With Stripe
              </Button>
            </StripeCheckout>
          </div>
        </Card>
      </div>
    );
  }
}

export default DepositForm;
