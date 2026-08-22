"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка оформления подписки");
      }

      const stripe = await stripePromise;
      if (stripe && data.url) {
        window.location.href = data.url;
      } else {
        setError("Не удалось перенаправить на страницу оплаты");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    setMessage("Подписка оформлена! Проверьте email для подтверждения.");
  };

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const success = urlParams?.get("success") === "true";
  const canceled = urlParams?.get("canceled") === "true";

  if (success) {
    handleSuccess();
  }

  return (
    <main className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-5">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight mb-4">Тарифы</h1>
          <p className="text-slate-600 mb-8">
            Пробный тариф для поддержки проекта и получения будущих функций.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl bg-tide/10 p-4 text-center text-tide">
            {message}
          </div>
        )}

        {canceled && (
          <div className="mb-6 rounded-xl bg-coral/10 p-4 text-center text-coral">
            Оплата отменена
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-center text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-3xl border-2 border-tide bg-white p-8 shadow-glow">
          <div className="text-center">
            <h2 className="text-2xl font-black mb-2">Luma Pro</h2>
            <div className="my-4">
              <span className="text-5xl font-black text-tide">99₽</span>
              <span className="text-slate-500">/месяц</span>
            </div>
            <p className="text-slate-600 mb-6">
              Поддержать проект и получить доступ к продвинутым функциям.
            </p>

            <div className="mb-6 text-left">
              <ul className="space-y-3">
                <li className="flex items-center text-slate-700">
                  <span className="mr-2 text-tide">✓</span>
                  Все функции карты
                </li>
                <li className="flex items-center text-slate-700">
                  <span className="mr-2 text-tide">✓</span>
                  Поддержка проекта
                </li>
                <li className="flex items-center text-slate-700">
                  <span className="mr-2 text-tide">✓</span>
                  Будущие премиум-фичи
                </li>
              </ul>
            </div>

            {!success && (
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full rounded-xl bg-tide px-6 py-4 text-lg font-black text-ink hover:shadow-glow transition disabled:opacity-50"
              >
                {isLoading ? "Перенаправление..." : "Оформить подписку"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Безопасные платежи через Stripe. Отменить подписку в любой момент.
        </p>
      </div>
    </main>
  );
}