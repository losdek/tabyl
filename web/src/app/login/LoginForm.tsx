"use client";
import { useActionState } from "react";
import { formatPhone } from "@/lib/format";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "phone", phone: "", next });
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.step === "phone" ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-mut">Номер телефона</span>
            <span className="flex h-12 items-center gap-2 rounded-[12px] bg-field px-3.5 text-base focus-within:outline-2 focus-within:outline-fg">
              <span className="text-mut">+996</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="700 123 456"
                defaultValue={state.phone.replace("+996", "")}
                required
                autoFocus
                aria-invalid={!!state.error}
                aria-describedby={state.error ? "login-error" : undefined}
                className="h-full min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none"
              />
            </span>
          </label>
          <button name="intent" value="send" disabled={pending} className="h-12 rounded-[12px] bg-ink font-medium text-on-ink disabled:opacity-60">
            {pending ? "Отправляем…" : "Получить код"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-mut">
            Отправили код на {formatPhone(state.phone)}.{" "}
            <button name="intent" value="change" className="pseudo text-fg">Изменить номер</button>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-mut">Код из СМС</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              autoFocus
              required
              aria-invalid={!!state.error}
              aria-describedby={state.error ? "login-error" : undefined}
              className="num h-12 rounded-[12px] bg-field px-3.5 text-lg tracking-[0.3em] outline-none focus:outline-2 focus:outline-fg"
            />
          </label>
          <button name="intent" value="verify" disabled={pending} className="h-12 rounded-[12px] bg-ink font-medium text-on-ink disabled:opacity-60">
            {pending ? "Проверяем…" : "Войти"}
          </button>
          <button name="intent" value="resend" className="pseudo self-start text-sm">Отправить код ещё раз</button>
        </>
      )}
      {state.error && (
        <p id="login-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {google && state.step === "phone" && (
        <a href={`/auth/google?next=${encodeURIComponent(next)}`} className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-line font-medium">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.1Z" />
            <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7A22 22 0 0 0 24 46Z" />
            <path fill="#FBBC05" d="M11.8 28.2a13.2 13.2 0 0 1 0-8.4v-5.7H4.5a22 22 0 0 0 0 19.8l7.3-5.7Z" />
            <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A21.9 21.9 0 0 0 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9Z" />
          </svg>
          Войти через Google
        </a>
      )}
    </form>
  );
}
