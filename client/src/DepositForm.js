import React, { Component } from "react";
// import { deposit } from "./apiUtils.js";
import { Button, Card, Row, Col } from "react-materialize";
// import {
// 	Elements,
// 	CardElement,
// 	PostalCodeElement
// } from "react-stripe-elements";
import CurrencyInput from "react-currency-input";
import StripeCheckout from "react-stripe-checkout";

class DepositForm extends Component {
	constructor(props) {
		super(props);
		this.state = { stellarAddress: "", response: "", amount: "0.00" };
		this.handleAddressChange = this.handleAddressChange.bind(this);

		this.handleAmountChange = this.handleAmountChange.bind(this);
	}

	handleAddressChange(event) {
		this.setState({ stellarAddress: event.target.value });
	}
	handleAmountChange(event) {
		this.setState({ amount: event.target.value });
	}
	onToken(token) {

	}
	render() {
		return (
			<Card s={12} title="Deposit">
				<p>
					To be able to receive your deposit, you must trust issuer:{" "}
					<br />
					<b style={{ wordWrap: "break-word" }}>
						{this.props.config.bridge.issuerID}
					</b>{" "}
					<br />
				</p>
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
					Stellar Address
					<input
						className="formInput"
						style={{ base: { fontSize: "18px" } }}
						value={this.state.stellarAddress}
						onChange={this.handleAddressChange}
					/>
				</label>
				<StripeCheckout
					token={this.onToken}
					stripeKey={this.props.config.stripe.publishableAPIKey}
					billingAddress={true}
				>
					<Button>Pay With Stripe</Button>
				</StripeCheckout>
			</Card>
		);
	}
}

export default DepositForm;
