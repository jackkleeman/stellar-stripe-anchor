import * as Stripe from 'stripe';
import { Config } from '../config';
export const stripe = new Stripe(Config.STRIPE_SECTRET_KEY);
