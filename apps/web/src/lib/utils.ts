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

export const getFileUrl = (url: string | null | undefined): string | null => {
    if (!url || url === "pendente" || url.trim() === "") return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    if (url.startsWith("/uploads/")) return `${apiBase}${url}`;
    if (url.startsWith("/")) return `${apiBase}${url}`;
    return `${apiBase}/uploads/${url}`;
}

/**
 * Retorna label amigavel do tipo de arquivo baseado em MIME type
 * e, em fallback, extensao do nome do arquivo.
 */
export function getFileTypeLabel(mimeType: string, fileName?: string): string {
    const normalizedMime = (mimeType || "").toLowerCase().trim();
    const knownTypes: Record<string, string> = {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (.docx)",
        "application/msword": "Word (.doc)",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (.xlsx)",
        "application/vnd.ms-excel": "Excel (.xls)",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint (.pptx)",
        "application/vnd.ms-powerpoint": "PowerPoint (.ppt)",
        "application/pdf": "PDF (.pdf)",
        "image/jpeg": "Imagem (.jpg)",
        "image/png": "Imagem (.png)",
        "text/plain": "Texto (.txt)",
        "text/csv": "CSV (.csv)",
    };

    if (knownTypes[normalizedMime]) {
        return knownTypes[normalizedMime];
    }

    const extensionFromName = fileName
        ?.split(".")
        .pop()
        ?.trim()
        .toLowerCase();

    if (extensionFromName) {
        return `Arquivo (.${extensionFromName})`;
    }

    return "Arquivo";
}
