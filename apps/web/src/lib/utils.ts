import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Formata valor numérico para moeda BRL (R$)
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, "");
    return clean.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5",
    );
}

/**
 * Formata data ISO para exibição pt-BR (dd/mm/aaaa)
 */
export function formatDate(date: string): string {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

/**
 * Aplica máscara de CNPJ conforme digitação
 */
export function maskCNPJ(value: string): string {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 18);
}
