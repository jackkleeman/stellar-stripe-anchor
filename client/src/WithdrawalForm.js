import React, { Component } from "react";
import { deposit } from "./apiUtils.js";
import { Button, Card, Row, Col } from "react-materialize";
import {
	Elements,
	CardElement,
	PostalCodeElement
} from "react-stripe-elements";
import CurrencyInput from 'react-currency-input';


class DepositForm extends Component {
	constructor(props) {
		super(props);
		this.state = { stellarAddress: "", response: "" };

		this.handleChange = this.handleChange.bind(this);

		this.handleSubmit = this.handleSubmit.bind(this);
	}
	handleSubmit(event) {
		event.preventDefault();
		deposit(this.state.stellarAddress)
			.then(ref => {
				this.setState({ response: ref });
			})
			.catch(err => console.log(err));
	}
	handleChange(event) {
		this.setState({ stellarAddress: event.target.value });
	}
	render() {
		return (
			<Card s={12} title="Withdrawal">
				<p>
					You must register with Stripe, verify your identity, and receive a withdrawal reference. <br />
					Currently Stripe will only allow US residents with a US mobile number. <br />
					Once you have a reference, send your withdrawal amount to: <br />
					<b style={{wordWrap: "break-word"}}>{this.props.config.bridge.receivingAccountID}</b> <br />
					Put your reference as a text memo in your withdrawal transaction. 
				</p>
				<Button>Connect with Stripe</Button>
				{this.state.response}
			</Card>
		);
	}
}

export default DepositForm;
