import React, { Component } from "react";
import { connect } from "./apiUtils.js";
import { Button, Card, Modal } from "react-materialize";
import queryString from "query-string";

class DepositForm extends Component {
	constructor(props) {
		super(props);
		this.state = {
			stellarAddress: "",
			response: "",
			reference: null,
			loginLink: null
		};

		this.handleChange = this.handleChange.bind(this);
	}

	componentDidMount() {
		const query = queryString.parse(window.location.search);
		if (query.code && query.code.length && query.code.length === 35) {
			window.$(document).ready(function() {
				window
					.$("#refModal")
					.modal({
						dismissible: false
					})
					.modal("open");
			});
			connect(query.code)
				.then(([reference, loginLink]) => {
					this.setState({
						reference: reference,
						loginLink: loginLink
					});
				})
				.catch(err => {
					console.log(err);
					this.setState({ reference: "FAIL" });
				});
		}
	}
	handleChange(event) {
		this.setState({ stellarAddress: event.target.value });
	}
	render() {
		return (
			<div>
				<Modal
					id="refModal"
					header={
						this.state.reference ? this.state.reference !==
						"FAIL" ? (
							"Your Stripe account is ready"
						) : (
							"There was a problem"
						) : (
							"Connecting your Stripe account..."
						)
					}
					modalOptions={{complete: () => {this.setState({transactionID: ""})}}}
					actions={[
						<Button
							waves="light"
							modal="close"
							flat
							disabled={!this.state.reference}
						>
							Close
						</Button>
					]}
				>
					<p>
						{this.state.reference ? this.state.reference !==
						"FAIL" ? (
							<span>
								Your Stripe account is connected and your
								withdrawal reference is{" "}
								<b>{this.state.reference}</b>
								<br /> Please take note of this. We are not
								responsible for incorrect references. <br />
								If you want to manage your Stripe account,
								including your balance, go to:<br />
								<a href={this.state.loginLink}>
									{this.state.loginLink}
								</a>{" "}
								<br />
								This link will expire soon.
							</span>
						) : (
							"Connecting with your Stripe account failed. Please try again."
						) : (
							"Your Stripe account is being processed and we are generating you a reference."
						)}
					</p>
				</Modal>
				<Card title="Withdrawal">
					<p>
						You must connect with Stripe and receive a withdrawal
						reference. <br />
						Currently Stripe will only allow US residents with a US
						mobile number. <br />
						Once you have a reference, send your withdrawal amount
						to: <br />
						<b style={{ wordWrap: "break-word" }}>
							{this.props.config.bridge.issuerID}
						</b>{" "}
						<br />
						Put your reference as a text memo in your withdrawal
						transaction. <br />
						Withdrawals are charged $2.25 + 2% to cover various
						Stripe fees, and the minimum withdrawal is $10. <br />
						Returning customers should click here to access their
						Stripe dashboard and view their balance
					</p>
					<div style={{ textAlign: "center" }}>
						<a
							href={
								"https://connect.stripe.com/express/oauth/authorize?stripe_landing=register&client_id=" +
								this.props.config.stripe.connectClientID
							}
						>
							<Button>Connect with Stripe</Button>
						</a>
					</div>
					{this.state.response}
				</Card>
			</div>
		);
	}
}

export default DepositForm;
