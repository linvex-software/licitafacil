"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, Copy } from "lucide-react";

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

async function checkoutPix(data: unknown): Promise<PixResponse> {
  const res = await fetch(`${API_URL}/checkout/pix`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Falha ao gerar Pix");
  return json;
}
async function checkoutCartao(data: unknown): Promise<CardResponse> {
  const res = await fetch(`${API_URL}/checkout/cartao`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Falha ao processar cartão");
  return json;
}
async function checkPaymentStatus(paymentId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/checkout/status/${paymentId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Falha ao consultar pagamento");
  return json;
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
  const [form, setForm] = useState({ name: "", email: "", emailConfirm: "", cpfCnpj: "", phone: "", holderName: "", cardNumber: "", expiry: "", ccv: "", postalCode: "", addressNumber: "", terms: false });

  const planData = CHECKOUT_PLANS[plan];
  const priceData = planData.prices[cycle];

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

  if (success) return <main className="min-h-screen bg-zinc-950 px-4 py-14 text-zinc-100"><div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /><h1 className="mt-4 text-2xl font-bold">Pagamento confirmado!</h1><p className="mt-3 text-zinc-300">Sua conta no Limvex Licitação está sendo criada. Você receberá um e-mail com seus dados de acesso em instantes.</p><Link href="/login" className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black">Ir para o login</Link></div></main>;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-md space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Checkout</p><h1 className="mt-1 text-2xl font-bold">LIMVEX LICITAÇÃO</h1><p className="mt-2 text-sm text-zinc-300">Plano {planData.displayName}</p><a className="mt-3 inline-block text-sm text-[#58a6ff] hover:underline" href={PLANOS_URL}>Trocar de plano</a></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs uppercase tracking-wider text-zinc-400">Período do plano</p><div className="mt-4 grid grid-cols-2 gap-3">{(["semiannual", "annual"] as CycleKey[]).map((item) => { const selected = cycle === item; const p = planData.prices[item]; return <button key={item} type="button" onClick={() => setCycle(item)} className={`rounded-xl border p-3 text-left ${selected ? "border-[#0078D1]" : "border-zinc-700"}`}><p className="text-xs uppercase text-zinc-400">{item === "annual" ? "Anual" : "Semestral"}</p>{item === "annual" && <span className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-[10px] font-medium text-black">Melhor preço</span>}<p className="mt-2 text-sm font-semibold">{money(p.monthly)}/mês</p><p className="text-xs text-zinc-400">Total {money(p.total)}</p></button>; })}</div></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs uppercase tracking-wider text-zinc-400">Dados do cliente</p><div className="mt-4 space-y-3"><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Nome completo *" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="E-mail *" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Confirme seu e-mail *" value={form.emailConfirm} onChange={(e) => setForm((s) => ({ ...s, emailConfirm: e.target.value }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="CPF/CNPJ *" value={form.cpfCnpj} onChange={(e) => setForm((s) => ({ ...s, cpfCnpj: formatCpfCnpj(e.target.value) }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Telefone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: formatPhone(e.target.value) }))} /></div></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs uppercase tracking-wider text-zinc-400">Forma de pagamento</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMethod("PIX")} className={`rounded-lg border px-3 py-2 text-sm ${method === "PIX" ? "border-[#0078D1]" : "border-zinc-700"}`}>Pix</button><button type="button" onClick={() => setMethod("CREDIT_CARD")} className={`rounded-lg border px-3 py-2 text-sm ${method === "CREDIT_CARD" ? "border-[#0078D1]" : "border-zinc-700"}`}>Cartão de crédito</button></div>{method === "CREDIT_CARD" && <div className="mt-4 space-y-3"><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Nome no cartão" value={form.holderName} onChange={(e) => setForm((s) => ({ ...s, holderName: e.target.value }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Número do cartão" value={form.cardNumber} onChange={(e) => setForm((s) => ({ ...s, cardNumber: formatCardNumber(e.target.value) }))} /><div className="grid grid-cols-2 gap-3"><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Validade MM/AA" value={form.expiry} onChange={(e) => setForm((s) => ({ ...s, expiry: formatExpiry(e.target.value) }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="CVV" value={form.ccv} onChange={(e) => setForm((s) => ({ ...s, ccv: onlyDigits(e.target.value).slice(0, 4) }))} /></div><div className="grid grid-cols-2 gap-3"><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="CEP" value={form.postalCode} onChange={(e) => setForm((s) => ({ ...s, postalCode: onlyDigits(e.target.value).slice(0, 8) }))} /><input className="w-full rounded-lg bg-white px-3 py-2 text-black" placeholder="Nº endereço" value={form.addressNumber} onChange={(e) => setForm((s) => ({ ...s, addressNumber: e.target.value }))} /></div></div>}</section>
        {method === "PIX" && pixQrCode && <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs uppercase tracking-wider text-zinc-400">Pagamento Pix</p><img className="mx-auto mt-4 w-52 rounded bg-white p-2" src={`data:image/png;base64,${pixQrCode}`} alt="QR Code Pix" /><button type="button" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black" onClick={() => pixCopiaECola && navigator.clipboard.writeText(pixCopiaECola)}><Copy className="h-4 w-4" />Copiar código Pix</button><p className="mt-2 text-center text-xs text-zinc-400">Expira em {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</p></section>}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-xs uppercase tracking-wider text-zinc-400">Resumo</p><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-zinc-400">Produto</span><span>LIMVEX Licitação</span></div><div className="flex justify-between"><span className="text-zinc-400">Plano</span><span>{planData.name}</span></div><div className="flex justify-between"><span className="text-zinc-400">Período</span><span>{cycle === "annual" ? "Anual (12 meses)" : "Semestral (6 meses)"}</span></div><div className="flex justify-between"><span className="text-zinc-400">Valor mensal</span><span>{money(priceData.monthly)}</span></div><div className="flex justify-between border-t border-zinc-800 pt-2 font-semibold"><span>Total</span><span>{money(priceData.total)}</span></div></div></section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"><label className="flex items-start gap-2 text-sm text-zinc-300"><input type="checkbox" checked={form.terms} onChange={(e) => setForm((s) => ({ ...s, terms: e.target.checked }))} />Li e concordo com os Termos de Uso, Política de Privacidade e Termos de Compra.</label>{error && <p className="mt-3 text-sm text-red-400">{error}</p>}<button type="button" disabled={loading} onClick={handleSubmit} className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">{loading ? "Processando..." : method === "PIX" ? "Gerar Pix" : "Pagar com cartão"}</button></section>
        <footer className="pb-6 text-center text-xs text-zinc-400"><a href="https://limvex.com/termos-de-uso" className="hover:underline">Termos de uso</a>{" · "}<a href="https://limvex.com/politica-de-privacidade" className="hover:underline">Política de privacidade</a>{" · "}<a href="https://limvex.com/termos-de-compra" className="hover:underline">Termos de compra</a></footer>
      </div>
    </main>
  );
}
