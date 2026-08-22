import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-07-29.dahlia",
    typescript: true,
  });
}

export function getStripeClient() {
  return getStripe();
}

export const PRICE_ID = process.env.STRIPE_PRICE_ID || "price_test_monthly";

export async function createCheckoutSession(
  userId: string,
  email: string,
  customerId?: string
) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : email,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID || "price_test_monthly",
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?canceled=true`,
    subscription_data: {
      metadata: {
        user_id: userId,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

export async function createPortalSession(customerId: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
  });
  return session;
}

export async function getOrCreateCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string
) {
  const stripe = getStripe();
  
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
    },
  });

  return customer.id;
}