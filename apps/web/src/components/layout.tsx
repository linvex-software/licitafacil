"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Gavel, Settings,
    User, LogOut, Menu, FileText, BarChart3,
    Globe, ShieldCheck, ChevronDown, ClipboardList,
    BarChart2, Swords, Briefcase,
    Building2,
    TrendingUp, History, Tag as TagIcon,
    CalendarDays, Users, HelpCircle,
} from "lucide-react";

import { AlertsDropdown } from "@/components/AlertsDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */
interface SubItem { label: string; href: string; icon?: any; }
interface NavItem { label: string; icon: any; href: string; subItems?: SubItem[]; }
interface NavGroup { group: string; items: NavItem[]; }

/* ─── Nav structure ──────────────────────────────────────── */
const navGroups: NavGroup[] = [
    {
        group: "Principal",
        items: [
            { label: "Dashboard", icon: LayoutDashboard, href: "/" },
            {
                label: "Gestão", icon: ClipboardList, href: "/licitacoes",
                subItems: [
                    { label: "Minhas Licitações", href: "/licitacoes", icon: Gavel },
                    { label: "Documentos", href: "/documentos", icon: FileText },
                    { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
                ]
            },
        ]
    },
    {
        group: "Módulos",
        items: [
            {
                label: "Análise", icon: BarChart2, href: "/analise",

                subItems: [
                    { label: "Histórico de Compras", href: "/analise/historico-compras", icon: History },
                    { label: "Concorrentes", href: "/analise/concorrentes", icon: Building2 },
                    { label: "Produtos", href: "/analise/produtos", icon: TagIcon },
                ]
            },
            {
                label: "Simulador", icon: Swords, href: "/disputa",
                subItems: [
                    { label: "Comprasnet", href: "/integracoes/comprasnet", icon: Globe },
                ]
            },
            {
                label: "Negócios", icon: Briefcase, href: "/negocios",
                subItems: [
                    { label: "Funil de licitações (Kanban)", href: "/negocios/funil", icon: TrendingUp },
                    { label: "Agenda", href: "/negocios/agenda", icon: CalendarDays },
                ]
            },
        ]
    },
    {
        group: "Outros",
        items: [
            { label: "Suporte", icon: HelpCircle, href: "/suporte" }
        ]
    },
];

/* ─── Dropdown Nav Item ──────────────────────────────────── */
function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
        || item.subItems?.some(s => pathname === s.href || pathname.startsWith(s.href + "/"));

    const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
    const hide = () => { timer.current = setTimeout(() => setOpen(false), 120); };

    return (
        <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
            <button className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            )}>
                {item.label}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", open ? "rotate-180" : "")} />
            </button>

            {open && item.subItems && (
                <div
                    className="absolute top-full left-0 mt-1.5 z-[99] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 min-w-[200px]"
                    onMouseEnter={show}
                    onMouseLeave={hide}
                >
                    <p className="section-label px-4 pb-2 mb-1 border-b border-gray-50 dark:border-gray-800">{item.label}</p>
                    {item.subItems.map((sub) => {
                        const subActive = pathname === sub.href;
                        const Icon = sub.icon;
                        return (
                            <Link key={sub.href} href={sub.href}
                                className={cn(
                                    "flex items-center gap-2.5 mx-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                                    subActive
                                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                                )}
                                onClick={() => setOpen(false)}
                            >
                                {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", subActive ? "text-primary" : "text-gray-400 dark:text-gray-500")} />}
                                {sub.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ─── Simple Nav Link ────────────────────────────────────── */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
    return (
        <Link href={item.href}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            )}
        >
            {item.label}
        </Link>
    );
}

/* ─── Mobile sidebar content ─────────────────────────────── */
function MobileSidebarContent({ pathname, user, logout }: { pathname: string; user: any; logout: () => void }) {
    const isEmpresaAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#0078D1,#0062ab)", boxShadow: "0 2px 8px rgba(0,120,209,.35)" }}>
                        <Gavel className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-[14px] text-gray-900 dark:text-gray-100 leading-tight">LicitaFácil</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Plataforma B2B</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {navGroups.map(group => (
                    <div key={group.group} className="mb-3">
                        <p className="section-label px-2 mb-1">{group.group}</p>
                        {group.items.map(item => {
                            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                            return (
                                <div key={item.href}>
                                    <Link href={item.href}
                                        className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300"
                                                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                                        )}>
                                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary dark:text-primary-300" : "text-gray-400 dark:text-gray-500")} />
                                        {item.label}
                                    </Link>
                                    {item.subItems && (
                                        <div className="ml-9 mt-0.5 space-y-0.5">
                                            {item.subItems.map(sub => (
                                                <Link key={sub.href} href={sub.href}
                                                    className={cn("block px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                                                        pathname === sub.href
                                                            ? "text-primary dark:text-primary-300"
                                                            : "text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-200"
                                                    )}>
                                                    {sub.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
                {isEmpresaAdmin && (
                    <div className="mb-3">
                        <p className="section-label px-2 mb-1">Equipe</p>
                        <Link href="/usuarios"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary-300">
                            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            Usuários
                        </Link>
                    </div>
                )}
                {user?.role === "SUPER_ADMIN" && (
                    <div className="mb-3">
                        <p className="section-label px-2 mb-1 text-amber-600">Admin</p>
                        <Link href="/admin/clientes"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-700 dark:hover:text-amber-400">
                            <ShieldCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            Gerenciar Clientes
                        </Link>
                    </div>
                )}
            </nav>
            <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    <LogOut className="w-4 h-4" /> Sair da conta
                </button>
            </div>
        </div>
    );
}

/* ─── Layout ─────────────────────────────────────────────── */
export function Layout({ children, fullWidth = false }: {
    children: React.ReactNode;
    fullWidth?: boolean;
}) {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, logout } = useAuth();
    const isEmpresaAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    /* Flatten all groups into topbar-ready structure */
    const principalItems = navGroups.find(g => g.group === "Principal")?.items ?? [];
    const moduleItems = navGroups.find(g => g.group === "Módulos")?.items ?? [];
    const outrosItems = navGroups.find(g => g.group === "Outros")?.items ?? [];

    return (
        <div className="min-h-screen flex flex-col bg-[#f6f7f9] dark:bg-gray-950">

            {/* ── Topbar ─────────────────────────────────────── */}
            <header
                className="h-14 bg-white dark:bg-gray-900 sticky top-0 z-50 flex items-center px-4 gap-3 border-b border-gray-100 dark:border-gray-800"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-4 group">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-95"
                        style={{ background: "linear-gradient(135deg,#0078D1,#0062ab)", boxShadow: "0 2px 6px rgba(0,120,209,.35)" }}
                    >
                        <Gavel className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-bold text-[14px] text-gray-900 dark:text-gray-100 hidden sm:block">LicitaFácil</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden lg:flex items-center justify-center gap-0.5 flex-1">
                    {/* Simple items */}
                    {principalItems.map(item => (
                        item.subItems
                            ? <NavDropdown key={item.label} item={item} pathname={pathname} />
                            : <NavLink key={item.href} item={item} pathname={pathname} />
                    ))}

                    {/* Divider */}
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1.5" />

                    {/* Module items with dropdowns */}
                    {moduleItems.map(item => (
                        <NavDropdown key={item.label} item={item} pathname={pathname} />
                    ))}

                    {/* Divider */}
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1.5" />

                    {/* Other items */}
                    {outrosItems.map(item => (
                        item.subItems
                            ? <NavDropdown key={item.label} item={item} pathname={pathname} />
                            : <NavLink key={item.href} item={item} pathname={pathname} />
                    ))}

                    {isEmpresaAdmin && (
                        <NavLink
                            item={{ label: "Usuários", icon: Users, href: "/usuarios" }}
                            pathname={pathname}
                        />
                    )}

                    {/* Admin */}
                    {user?.role === "SUPER_ADMIN" && (
                        <NavLink
                            item={{ label: "Admin", icon: ShieldCheck, href: "/admin/clientes" }}
                            pathname={pathname}
                        />
                    )}
                </nav>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                    <ThemeToggle />
                    <div className="h-5 w-px bg-gray-100 dark:bg-gray-800 mx-1" />
                    <AlertsDropdown />
                    <div className="h-5 w-px bg-gray-100 dark:bg-gray-800 mx-1" />

                    {/* User dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-[10px] font-bold bg-primary text-white">
                                        {user?.name?.substring(0, 2).toUpperCase() || "US"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:flex flex-col items-start">
                                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 leading-none">{user?.name || "Usuário"}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">{user?.role || "Acesso"}</span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuLabel className="section-label">Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg"><User className="mr-2 h-4 w-4" /> Perfil</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg"><Settings className="mr-2 h-4 w-4" /> Configurações</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 rounded-lg">
                                <LogOut className="mr-2 h-4 w-4" /> Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile menu */}
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px] border-0">
                            <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle></SheetHeader>
                            <MobileSidebarContent pathname={pathname} user={user} logout={logout} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* ── Page content ────────────────────────────────── */}
            <main className={cn("flex-1 overflow-y-auto", fullWidth ? "p-4" : "p-5 md:p-7")}>
                <div className={cn("mx-auto space-y-6 animate-fade-in", fullWidth ? "max-w-none px-2" : "max-w-screen-xl")}>
                    {children}
                </div>
            </main>
        </div>
    );
}
