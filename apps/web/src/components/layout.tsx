"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Gavel,
    Settings,
    Search,
    User,
    LogOut,
    Menu,
    FileText,
    BarChart3,
    AlertTriangle,
    ClipboardList,
    HelpCircle,
    ShieldCheck,
    Globe,
} from "lucide-react";
import { AlertsDropdown } from "@/components/AlertsDropdown";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
    {
        group: "Gestão",
        items: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/" },
            { label: "Licitações", icon: Gavel, href: "/licitacoes" },
            { label: "Documentos", icon: FileText, href: "/documentos" },
        ]
    },
    {
        group: "Inteligência",
        items: [
            { label: "Análises", icon: BarChart3, href: "/analises" },
            { label: "Riscos", icon: AlertTriangle, href: "/riscos" },
            { label: "Relatórios", icon: ClipboardList, href: "/relatorios" },
        ]
    },
    {
        group: "Integrações",
        items: [
            { label: "ComprasNet", icon: Globe, href: "/integracoes/comprasnet" },
        ]
    },
    {
        group: "Sistema",
        items: [
            { label: "Usuários", icon: User, href: "/usuarios" },
            { label: "Configurações", icon: Settings, href: "/configuracoes" },
        ]
    }
];

import { useAuth } from "@/contexts/auth-context";

export function Layout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, logout } = useAuth();

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-100">
            <div className="p-6">
                <div className="flex items-center gap-3">

                    <div>
                        <span className="font-heading font-bold text-lg tracking-tight text-white block leading-none">LicitaFácil</span>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Plataforma de Licitações</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-3 space-y-8 overflow-y-auto pb-6">
                {navItems.map((group) => (
                    <div key={group.group} className="space-y-1 text-slate-400">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                            {group.group}
                        </p>
                        {group.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                                        ${isActive
                                            ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"}
                                    `}
                                >
                                    <div className={`
                                        flex items-center justify-center rounded transition-colors
                                        ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}
                                    `}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    {item.label}
                                    {isActive && (
                                        <div className="ml-auto w-1 h-4 bg-emerald-500 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}

                {/* Seção Admin — visível apenas para SUPER_ADMIN */}
                {user?.role === "SUPER_ADMIN" && (
                    <div className="space-y-1 text-slate-400">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-amber-500/80 mb-2">
                            Administração
                        </p>
                        {[
                            { label: "Gerenciar Clientes", icon: ShieldCheck, href: "/admin/clientes" },
                        ].map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                                        ${isActive
                                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"}
                                    `}
                                >
                                    <div className={`
                                        flex items-center justify-center rounded transition-colors
                                        ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}
                                    `}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    {item.label}
                                    {isActive && (
                                        <div className="ml-auto w-1 h-4 bg-amber-500 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-4 mt-auto border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors h-11"
                    onClick={logout}
                >
                    <LogOut className="w-4 h-4" />
                    Sair do Sistema
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 fixed inset-y-0 z-50">
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden">
                                    <Menu className="w-5 h-5 text-slate-600" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-64 border-r-slate-800 bg-slate-900">
                                <SheetHeader className="sr-only">
                                    <SheetTitle>Menu de Navegação</SheetTitle>
                                </SheetHeader>
                                <SidebarContent />
                            </SheetContent>
                        </Sheet>

                        <div className="relative group hidden md:block max-w-md w-full">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            </div>
                            <Input
                                placeholder="Pesquisar..."
                                className="pl-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 focus-visible:bg-white transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <AlertsDropdown />

                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-600 hover:bg-slate-100">
                            <HelpCircle className="w-5 h-5" />
                        </Button>

                        <div className="h-6 w-px bg-slate-200 mx-1" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="pl-2 pr-1 h-10 gap-2 hover:bg-slate-100">
                                    <Avatar className="h-8 w-8 border border-slate-200">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=10b981&color=fff`} />
                                        <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start text-xs hidden sm:flex">
                                        <span className="font-semibold text-slate-900">{user?.name || "Usuário"}</span>
                                        <span className="text-slate-500 uppercase">{user?.role || "Acesso"}</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configurações
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
