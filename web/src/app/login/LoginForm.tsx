"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { formatPhone } from "@/lib/format";
import { loginAction, type LoginState, type Mode } from "./actions";

const field = "h-12 rounded-[12px] bg-field px-3.5 text-base outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--fg)]";

function GoogleButton({ next, label }: { next: string; label: string }) {
  return (
    <a href={`/auth/google?next=${encodeURIComponent(next)}`} className="flex h-12 items-center justify-center gap-2.5 rounded-[12px] border border-line font-medium transition active:scale-[0.98]">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.1Z" />
        <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7A22 22 0 0 0 24 46Z" />
        <path fill="#FBBC05" d="M11.8 28.2a13.2 13.2 0 0 1 0-8.4v-5.7H4.5a22 22 0 0 0 0 19.8l7.3-5.7Z" />
        <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A21.9 21.9 0 0 0 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9Z" />
      </svg>
      {label}
    </a>
  );
}

export function LoginForm({ next, initialMode }: { next: string; initialMode: Mode }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "phone", mode: initialMode, phone: "", name: "", next });
  const [mode, setMode] = useState<Mode>(initialMode);
  const register = mode === "register";

  if (state.step === "code")
    return (
      <form key="code" action={action} className="animate-rise flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <h1 className="text-2xl font-medium tracking-tight">Код из СМС</h1>
        <p className="-mt-2 text-sm text-mut">
          Отправили на {formatPhone(state.phone)}.{" "}
          <button name="intent" value="change" className="pseudo text-fg">Другой номер</button>
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">Код из СМС</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="••••••" autoFocus required aria-label="Код из СМС"
            aria-invalid={!!state.error} aria-describedby={state.error ? "login-error" : undefined} className={`${field} num text-center text-2xl tracking-[0.5em]`} />
        </label>
        {state.error && <p id="login-error" role="alert" className="text-sm text-danger">{state.error}</p>}
        <button name="intent" value="verify" disabled={pending} className="h-12 rounded-[12px] bg-ink font-medium text-on-ink transition active:scale-[0.98] disabled:opacity-60">
          {pending ? "Проверяем…" : state.mode === "register" ? "Создать аккаунт" : "Войти"}
        </button>
        <button name="intent" value="resend" className="pseudo self-start text-sm">Отправить код ещё раз</button>
      </form>
    );

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Вход или регистрация" className="relative grid grid-cols-2 rounded-[12px] bg-field p-1 text-sm font-medium">
        <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[9px] bg-bg shadow-sm transition-transform duration-300 ease-out ${register ? "translate-x-full" : ""}`} />
        {(["login", "register"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`relative h-10 transition-colors ${mode === m ? "text-fg" : "text-mut"}`}>
            {m === "login" ? "Вход" : "Регистрация"}
          </button>
        ))}
      </div>

      <form key={mode} action={action} className="animate-rise flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        <h1 className="text-2xl font-medium tracking-tight">{register ? "Новый аккаунт" : "С возвращением"}</h1>
        <p className="-mt-2 text-sm text-mut">{register ? "Минута — и можно продавать, писать продавцам и сохранять объявления." : "Войдите по номеру — пароль не нужен, придёт код в СМС."}</p>
        {register && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-mut">Имя</span>
            <input name="name" defaultValue={state.name} autoComplete="given-name" maxLength={40} placeholder="Как к вам обращаться" className={field} />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-mut">Номер телефона</span>
          <span className="flex h-12 items-center gap-2 rounded-[12px] bg-field px-3.5 text-base transition-shadow focus-within:shadow-[0_0_0_2px_var(--fg)]">
            <span className="text-mut">+996</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="700 123 456" defaultValue={state.phone.replace("+996", "")} required autoFocus={!register}
              aria-label="Номер телефона" aria-invalid={!!state.error} aria-describedby={state.error ? "login-error" : undefined}
              className="h-full min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none" />
          </span>
        </label>
        {register && (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
            <span>Согласен с <Link href="/rules" className="link">правилами</Link> и <Link href="/privacy" className="link">обработкой персональных данных</Link></span>
          </label>
        )}
        {state.error && <p id="login-error" role="alert" className="text-sm text-danger">{state.error}</p>}
        <button name="intent" value="send" disabled={pending} className="h-12 rounded-[12px] bg-ink font-medium text-on-ink transition active:scale-[0.98] disabled:opacity-60">
          {pending ? "Отправляем код…" : "Получить код"}
        </button>
        <div className="flex items-center gap-3 text-xs text-mut"><span className="h-px flex-1 bg-line" />или<span className="h-px flex-1 bg-line" /></div>
        <GoogleButton next={next} label={register ? "Зарегистрироваться через Google" : "Войти через Google"} />
        <p className="text-center text-sm text-mut">
          {register ? "Уже есть аккаунт? " : "Впервые на Табыле? "}
          <button type="button" onClick={() => setMode(register ? "login" : "register")} className="pseudo text-fg">
            {register ? "Войти" : "Зарегистрироваться"}
          </button>
        </p>
      </form>
    </div>
  );
}
