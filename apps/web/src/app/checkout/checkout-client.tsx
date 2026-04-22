"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { FlippableCreditCard } from "@/components/ui/credit-debit-card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PLANOS_URL = "https://limvex.com/licitacao#planos";

const CHECKOUT_PLANS = {
  start: { name: "Start", displayName: "START", prices: { semiannual: { monthly: 499, total: 2994, months: 6 }, annual: { monthly: 349, total: 4188, months: 12 } } },
  growth: { name: "Growth", displayName: "GROWTH", prices: { semiannual: { monthly: 799, total: 4794, months: 6 }, annual: { monthly: 599, total: 7188, months: 12 } } },
  scale: { name: "Scale", displayName: "SCALE", prices: { semiannual: { monthly: 1299, total: 7794, months: 6 }, annual: { monthly: 999, total: 11988, months: 12 } } },
} as const;

type PlanKey = keyof typeof CHECKOUT_PLANS;
type CycleKey = "semiannual" | "annual";
type PaymentMethod = "PIX" | "CREDIT_CARD";

interface PixResponse {
  paymentId: string;
  pixQrCode: string;
  pixCopiaECola: string;
}

interface CardResponse {
  paymentId: string;
  status: string;
}

interface StatusResponse {
  status: string;
}

interface CheckoutClientProps {
  initialPlan: PlanKey;
  initialCycle: CycleKey;
}

const cardShell = "flex flex-col gap-6 rounded-xl border border-[#222222] bg-[#111111] py-6 text-card-foreground shadow-none";
const cardInner = "p-6 sm:p-8";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function formatPhone(value: string) {
  return onlyDigits(value).slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function formatCardNumber(value: string) {
  return onlyDigits(value).slice(0, 19).replace(/(\d{4})/g, "$1 ").trim();
}
function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskedCardNumberPreview(digits: string): string {
  const d = digits.slice(0, 19);
  const slotCount = d.length <= 16 ? 16 : 19;
  let out = "";
  for (let i = 0; i < slotCount; i++) {
    if (i > 0 && i % 4 === 0) out += " ";
    out += i < d.length ? d[i] : "•";
  }
  return out;
}

function parseCheckoutApiMessage(json: unknown, status: number, fallback: string): string {
  if (json && typeof json === "object" && "message" in json) {
    const m = (json as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m)) {
      const parts = m.filter((x): x is string => typeof x === "string");
      if (parts.length) return parts.join(" ");
    }
  }
  if (status === 502 || status === 503) return "Serviço de pagamento indisponível. Tente em alguns minutos.";
  if (status >= 500) return "Erro no servidor. Se persistir, fale com o suporte.";
  if (status === 401 || status === 403) return "Acesso negado ao serviço de pagamento.";
  return fallback;
}

async function checkoutPix(data: unknown): Promise<PixResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/checkout/pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Sem conexão. Verifique sua internet e tente de novo.");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new Error(parseCheckoutApiMessage(json, res.status, "Não foi possível gerar o Pix."));
  return json as PixResponse;
}

async function checkoutCartao(data: unknown): Promise<CardResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/checkout/cartao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Sem conexão. Verifique sua internet e tente de novo.");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new Error(parseCheckoutApiMessage(json, res.status, "Não foi possível processar o cartão."));
  return json as CardResponse;
}

async function checkPaymentStatus(paymentId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/checkout/status/${paymentId}`);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Resposta inválida ao consultar pagamento.");
  }
  if (!res.ok) throw new Error(parseCheckoutApiMessage(json, res.status, "Falha ao consultar pagamento."));
  return json as StatusResponse;
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="flex select-none items-center gap-2 text-sm font-medium leading-none text-[#999999]">
      {children}
      {required ? <span className="text-destructive">*</span> : null}
    </label>
  );
}

export function CheckoutClient({ initialPlan, initialCycle }: CheckoutClientProps) {
  const [plan] = useState<PlanKey>(initialPlan);
  const [cycle, setCycle] = useState<CycleKey>(initialCycle);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopiaECola, setPixCopiaECola] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30 * 60);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    emailConfirm: "",
    cpfCnpj: "",
    phone: "",
    holderName: "",
    cardNumber: "",
    expiry: "",
    ccv: "",
    postalCode: "",
    addressNumber: "",
    terms: false,
  });

  const planData = CHECKOUT_PLANS[plan];
  const priceData = planData.prices[cycle];

  const cardNumberPreview = useMemo(
    () => maskedCardNumberPreview(onlyDigits(form.cardNumber)),
    [form.cardNumber],
  );
  const cardholderPreview = form.holderName.toUpperCase();

  useEffect(() => {
    if (!paymentId || success || method !== "PIX") return;
    const interval = window.setInterval(async () => {
      try {
        const status = await checkPaymentStatus(paymentId);
        if (status.status === "CONFIRMED" || status.status === "RECEIVED") {
          setSuccess(true);
          window.clearInterval(interval);
        }
      } catch {
        // polling best-effort
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [paymentId, success, method]);

  useEffect(() => {
    if (!pixQrCode || success) return;
    const interval = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [pixQrCode, success]);

  const validationError = useMemo(() => {
    if (!form.name.trim()) return "Informe seu nome completo.";
    if (!form.email.trim() || !form.email.includes("@")) return "Informe um e-mail válido.";
    if (form.email !== form.emailConfirm) return "Os e-mails não conferem.";
    const doc = onlyDigits(form.cpfCnpj);
    if (![11, 14].includes(doc.length)) return "CPF/CNPJ inválido.";
    if (form.phone && ![10, 11].includes(onlyDigits(form.phone).length)) return "Telefone inválido.";
    if (!form.terms) return "Você precisa aceitar os termos para continuar.";
    if (method === "CREDIT_CARD") {
      if (![10, 11].includes(onlyDigits(form.phone).length)) return "Informe um telefone válido (cartão).";
      if (!form.holderName.trim()) return "Informe o nome impresso no cartão.";
      if (onlyDigits(form.cardNumber).length < 13) return "Número do cartão inválido.";
      if (!/^\d{2}\/\d{2}$/.test(form.expiry)) return "Validade inválida (MM/AA).";
      if (!/^\d{3,4}$/.test(form.ccv)) return "CVV inválido.";
      if (!/^\d{8}$/.test(onlyDigits(form.postalCode))) return "CEP inválido.";
      if (!form.addressNumber.trim()) return "Informe o número do endereço.";
    }
    return null;
  }, [form, method]);

  async function handleSubmit() {
    if (validationError) return setError(validationError);
    setError(null);
    setLoading(true);
    try {
      if (method === "PIX") {
        const res = await checkoutPix({ name: form.name.trim(), email: form.email.trim(), cpfCnpj: onlyDigits(form.cpfCnpj), phone: form.phone ? onlyDigits(form.phone) : undefined, plan, cycle });
        setPaymentId(res.paymentId);
        setPixQrCode(res.pixQrCode);
        setPixCopiaECola(res.pixCopiaECola);
        setCountdown(30 * 60);
      } else {
        const [expiryMonth, expiryYear] = form.expiry.split("/");
        const res = await checkoutCartao({
          name: form.name.trim(), email: form.email.trim(), cpfCnpj: onlyDigits(form.cpfCnpj), phone: onlyDigits(form.phone), plan, cycle,
          creditCard: { holderName: form.holderName.trim(), number: onlyDigits(form.cardNumber), expiryMonth, expiryYear, ccv: form.ccv },
          creditCardHolderInfo: { name: form.name.trim(), email: form.email.trim(), cpfCnpj: onlyDigits(form.cpfCnpj), postalCode: onlyDigits(form.postalCode), addressNumber: form.addressNumber.trim(), phone: onlyDigits(form.phone) },
        });
        setPaymentId(res.paymentId);
        if (res.status === "CONFIRMED" || res.status === "RECEIVED") setSuccess(true);
        else setError("Pagamento em análise. Aguarde a confirmação.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o pagamento.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#000000] text-white">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
          <div className={`${cardShell}`}>
            <div className={`${cardInner} space-y-6 text-center`}>
              <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
              <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
              <p className="text-[#999999]">
                Sua conta no{" "}
                <span className="font-limvex font-semibold uppercase tracking-tight text-white">LIMVEX LICITAÇÃO</span>{" "}
                está sendo criada. Você receberá um e-mail com seus dados de acesso em instantes.
              </p>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-md border-0 bg-white px-6 text-base font-semibold text-black transition-colors hover:bg-[#e0e0e0]">
                Ir para o login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#000000] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <header className="mb-10 text-center">
          <a href="https://limvex.com" target="_blank" rel="noopener noreferrer" className="inline-flex justify-center transition-opacity hover:opacity-90">
            <img src="/brand/logoBrancaBgPreto.png" alt="LIMVEX LICITAÇÃO" className="h-24 w-auto object-contain sm:h-28" />
          </a>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#999999]">Checkout</p>
          <h1 className="mt-3 text-center font-limvex text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            LIMVEX LICITAÇÃO
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-[#999999]">Plano {planData.displayName}</p>
          <a href={PLANOS_URL} className="mt-2 inline-flex items-center gap-1 text-sm text-[#767676] transition-opacity hover:opacity-90">
            <span aria-hidden className="select-none">←</span>
            Trocar de plano
          </a>
        </header>

        <div className="space-y-8">
          <div className={cardShell}>
            <div className={`${cardInner} space-y-8`}>
              <div className="space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999999]">Período do plano</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["semiannual", "annual"] as CycleKey[]).map((item) => {
                    const selected = cycle === item;
                    const p = planData.prices[item];
                    const months = p.months;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCycle(item)}
                        className={`relative rounded-xl border p-4 text-left transition-colors ${
                          selected ? "border-[#333333] bg-white text-black" : "border-[#333333] bg-[#111111] text-[#999999]"
                        }`}
                      >
                        {item === "annual" && (
                          <span className="absolute right-2 top-2 rounded bg-black px-2 py-0.5 text-[10px] font-bold uppercase leading-tight text-white">
                            Melhor preço
                          </span>
                        )}
                        <div className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-black" : "text-[#999999]"}`}>
                          {item === "annual" ? "Anual" : "Semestral"}
                        </div>
                        <div className={`mt-2 text-2xl font-semibold ${selected ? "text-black" : "text-white"}`}>
                          {money(p.monthly)}
                          <span className={`text-base font-normal ${selected ? "text-black/70" : "text-[#999999]"}`}>/mês</span>
                        </div>
                        <div className={`mt-1 text-sm ${selected ? "text-black/70" : "text-[#999999]"}`}>
                          Total ({months} meses): {money(p.total)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            noValidate
          >
            <div className={cardShell}>
              <div className={`${cardInner} space-y-6`}>
                <div className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999999]">Dados do cliente</h2>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="co-name" required>
                      Nome completo
                    </FieldLabel>
                    <input id="co-name" className="checkout-field" autoComplete="name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="co-email" required>
                      E-mail
                    </FieldLabel>
                    <input id="co-email" type="email" className="checkout-field" autoComplete="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="co-email2" required>
                      Confirme seu e-mail
                    </FieldLabel>
                    <input id="co-email2" type="email" className="checkout-field" autoComplete="email" value={form.emailConfirm} onChange={(e) => setForm((s) => ({ ...s, emailConfirm: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="co-doc" required>
                      CPF/CNPJ
                    </FieldLabel>
                    <input id="co-doc" className="checkout-field" value={form.cpfCnpj} onChange={(e) => setForm((s) => ({ ...s, cpfCnpj: formatCpfCnpj(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="co-phone">Telefone</FieldLabel>
                    <input id="co-phone" className="checkout-field" autoComplete="tel" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: formatPhone(e.target.value) }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className={cardShell}>
              <div className={`${cardInner} space-y-6`}>
                <div className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999999]">Forma de pagamento</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMethod("PIX")}
                      className={`rounded-xl border px-4 py-4 text-center text-sm font-semibold uppercase tracking-wide transition-colors ${
                        method === "PIX" ? "border-[#333333] bg-white text-black" : "border-[#333333] bg-[#111111] text-[#999999] hover:border-[#444444]"
                      }`}
                    >
                      Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("CREDIT_CARD")}
                      className={`rounded-xl border px-4 py-4 text-center text-sm font-semibold uppercase tracking-wide transition-colors ${
                        method === "CREDIT_CARD" ? "border-[#333333] bg-white text-black" : "border-[#333333] bg-[#111111] text-[#999999] hover:border-[#444444]"
                      }`}
                    >
                      Cartão de crédito
                    </button>
                  </div>
                  {method === "CREDIT_CARD" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-center">
                        <FlippableCreditCard
                          cardNumber={cardNumberPreview}
                          cardholderName={cardholderPreview}
                          expiryDate={form.expiry}
                          cvv={form.ccv}
                          flipped={cardFlipped}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="co-holder">Nome no cartão</FieldLabel>
                        <input id="co-holder" className="checkout-field" value={form.holderName} onChange={(e) => setForm((s) => ({ ...s, holderName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="co-card">Número do cartão</FieldLabel>
                        <input id="co-card" className="checkout-field" inputMode="numeric" value={form.cardNumber} onChange={(e) => setForm((s) => ({ ...s, cardNumber: formatCardNumber(e.target.value) }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <FieldLabel htmlFor="co-exp">Validade MM/AA</FieldLabel>
                          <input id="co-exp" className="checkout-field" value={form.expiry} onChange={(e) => setForm((s) => ({ ...s, expiry: formatExpiry(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="co-cvv">CVV</FieldLabel>
                          <input
                            id="co-cvv"
                            className="checkout-field"
                            value={form.ccv}
                            onChange={(e) => setForm((s) => ({ ...s, ccv: onlyDigits(e.target.value).slice(0, 4) }))}
                            onFocus={() => setCardFlipped(true)}
                            onBlur={() => setCardFlipped(false)}
                            autoComplete="cc-csc"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <FieldLabel htmlFor="co-cep">CEP</FieldLabel>
                          <input id="co-cep" className="checkout-field" inputMode="numeric" value={form.postalCode} onChange={(e) => setForm((s) => ({ ...s, postalCode: onlyDigits(e.target.value).slice(0, 8) }))} />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="co-num">Nº endereço</FieldLabel>
                          <input id="co-num" className="checkout-field" value={form.addressNumber} onChange={(e) => setForm((s) => ({ ...s, addressNumber: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={cardShell}>
              <div className={`${cardInner} space-y-6`}>
                <div className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999999]">Resumo</h2>
                  <div className="rounded-xl border border-[#222222] bg-[#111111] p-4 text-sm">
                    <div className="flex justify-between border-b border-[#222222] py-2 text-[#999999]">
                      <span>Produto</span>
                      <span className="text-right font-medium font-limvex uppercase text-white">LIMVEX LICITAÇÃO</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222222] py-2">
                      <span className="text-[#999999]">Plano</span>
                      <span className="font-medium text-white">{planData.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222222] py-2">
                      <span className="text-[#999999]">Período</span>
                      <span className="text-right text-white">{cycle === "annual" ? "Anual (12 meses)" : "Semestral (6 meses)"}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#222222] py-3">
                      <span className="text-[#999999]">Valor mensal</span>
                      <span className="text-right text-lg font-medium tracking-tight text-white">
                        {money(priceData.monthly)}
                        <span className="text-base font-normal text-[#999999]">/mês</span>
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#222222] py-3">
                      <span className="text-[#999999]">Total ({priceData.months} meses)</span>
                      <span className="font-medium text-white">{money(priceData.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {method === "PIX" && pixQrCode && (
              <div className={cardShell}>
                <div className={`${cardInner} space-y-4`}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999999]">Pagamento Pix</h2>
                  <img className="mx-auto w-52 rounded bg-white p-2" src={`data:image/png;base64,${pixQrCode}`} alt="QR Code Pix" />
                  <button
                    type="button"
                    className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-md border-0 bg-white text-base font-semibold text-black transition-colors hover:bg-[#e0e0e0]"
                    onClick={() => pixCopiaECola && void navigator.clipboard.writeText(pixCopiaECola)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar código Pix
                  </button>
                  <p className="text-center text-xs text-[#999999]">
                    Expira em {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[#999999]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 rounded border border-[#333333] bg-[#111111] text-white accent-white"
                  checked={form.terms}
                  onChange={(e) => {
                    setError(null);
                    setForm((s) => ({ ...s, terms: e.target.checked }));
                  }}
                />
                <span>
                  Li e concordo com os{" "}
                  <a href="https://limvex.com/termos-de-uso" className="text-white underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Termos de Uso
                  </a>
                  ,{" "}
                  <a href="https://limvex.com/politica-privacidade" className="text-white underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Política de Privacidade
                  </a>{" "}
                  e{" "}
                  <a href="https://limvex.com/termos-compra" className="text-white underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Termos de Compra
                  </a>{" "}
                  da{" "}
                  <span className="font-limvex font-semibold uppercase tracking-tight">LIMVEX</span>.
                </span>
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !form.terms}
              className={`inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-md border-0 text-base font-semibold transition-colors ${
                !form.terms
                  ? "cursor-not-allowed bg-[#999999] text-black hover:bg-[#999999]"
                  : "bg-white text-black hover:bg-[#e0e0e0] disabled:pointer-events-none disabled:opacity-60"
              }`}
            >
              {loading ? "Processando..." : method === "PIX" ? "Gerar Pix" : "Pagar com cartão"}
            </button>
          </form>

          <footer className="mt-16 border-t border-[#222222] pt-8 text-center text-xs text-[#999999]">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              <a href="https://limvex.com/termos-de-uso" className="hover:text-white" target="_blank" rel="noopener noreferrer">
                Termos de Uso
              </a>
              <a href="https://limvex.com/politica-privacidade" className="hover:text-white" target="_blank" rel="noopener noreferrer">
                Política de Privacidade
              </a>
              <a href="https://limvex.com/termos-compra" className="hover:text-white" target="_blank" rel="noopener noreferrer">
                Termos de Compra
              </a>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
