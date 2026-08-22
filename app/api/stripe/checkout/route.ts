import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Требуется вход в аккаунт" }, { status: 401 });
    }

    const { customerId } = await request.json();

    const stripeCustomerId = await getOrCreateCustomer(
      user.id,
      user.email || "",
      customerId
    );

    const session = await createCheckoutSession(user.id, user.email || "", stripeCustomerId);

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("user_id", user.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error", error);
    return NextResponse.json(
      { error: "Не удалось создать сессию оплаты" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}