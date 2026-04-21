"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Gavel, Settings,
    User, LogOut, Menu, FileText, BarChart3,
    ShieldCheck, ChevronDown, ClipboardList,
    BarChart2, Briefcase,
    TrendingUp, History, Tag as TagIcon,
    CalendarDays, Users, HelpCircle, Radio, UserSearch, PlayCircle, Puzzle,
    CreditCard,
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
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { SupportDrawer } from "@/components/SupportDrawer";
import { Logo } from "@/components/logo";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { CanAccessFeature } from "@/components/billing/CanAccessFeature";
import { FeatureLockModal } from "@/components/billing/FeatureLockModal";

/* ─── Types ──────────────────────────────────────────────── */
interface SubItem { label: string; href: string; icon?: any; feature?: string; }
interface NavItem { label: string; icon: any; href: string; subItems?: SubItem[]; emDesenvolvimento?: boolean; }
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
                    { label: "Licitações", href: "/licitacoes", icon: Gavel },
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
                    { label: "Produtos", href: "/analise/produtos", icon: TagIcon },
                    { label: "Concorrentes", href: "/analise/concorrentes", icon: UserSearch, feature: "analytics_concorrencia" },
                ]
            },
            {
                label: "Negócios", icon: Briefcase, href: "/negocios",
                subItems: [
                    { label: "Funil de licitações (Kanban)", href: "/negocios/funil", icon: TrendingUp },
                    { label: "Agenda", href: "/negocios/agenda", icon: CalendarDays },
                    { label: "Pregões (Central)", href: "/negocios/pregoes", icon: Gavel },
                    { label: "Monitoramento", href: "/monitoramento", icon: Radio, feature: "monitoramento" },
                    { label: "Disputa ao vivo", href: "/disputa", icon: PlayCircle, feature: "disputa_ao_vivo" },
                ]
            },
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
                    ? "bg-accent text-foreground dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}>
                {item.label}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", open ? "rotate-180" : "")} />
            </button>

            {open && item.subItems && (
                <div
                    className="absolute left-0 top-full z-[99] mt-1.5 min-w-[200px] rounded-xl border border-border bg-popover py-2 text-popover-foreground shadow-none"
                    onMouseEnter={show}
                    onMouseLeave={hide}
                >
                    <p className="section-label mb-1 border-b border-border px-4 pb-2">{item.label}</p>
                    {item.subItems.map((sub) => {
                        const subActive = pathname === sub.href;
                        const Icon = sub.icon;
                        const link = (
                            <Link href={sub.href}
                                className={cn(
                                    "flex items-center gap-2.5 mx-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                                    subActive
                                        ? "bg-accent text-foreground dark:bg-white/10 dark:text-white"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                                onClick={() => setOpen(false)}
                            >
                                {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", subActive ? "text-foreground dark:text-white" : "text-muted-foreground")} />}
                                {sub.label}
                            </Link>
                        );
                        return sub.feature ? (
                            <CanAccessFeature key={sub.href} feature={sub.feature}>
                                {link}
                            </CanAccessFeature>
                        ) : (
                            <div key={sub.href}>{link}</div>
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
                    ? "bg-accent text-foreground dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            {item.label}
        </Link>
    );
}

/* ─── Nav item "Em desenvolvimento" (abre popup em vez de navegar) ─── */
function NavItemEmDesenvolvimento({ item, onOpen }: { item: NavItem; onOpen: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
        >
            {item.label}
        </button>
    );
}

/* ─── Mobile sidebar content ─────────────────────────────── */
function MobileSidebarContent({
    pathname, user, logout, onOpenEmDev,
}: {
    pathname: string;
    user: any;
    logout: () => void;
    onOpenEmDev?: () => void;
}) {
    const isEmpresaAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

    const toggleSubmenu = (key: string) => {
        setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex h-full flex-col bg-background">
            <div className="border-b border-border px-4 py-4">
                <div className="flex items-center gap-3">
                    <Logo size="sm" />
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {navGroups.map(group => (
                    <div key={group.group} className="mb-3">
                        <p className="section-label px-2 mb-1">{group.group}</p>
                        {group.items.map(item => {
                            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                            const hasSubItems = Boolean(item.subItems?.length);
                            const isSubItemActive = item.subItems?.some(
                                (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
                            );
                            const isSubmenuOpen = openSubmenus[item.label] ?? Boolean(isSubItemActive);

                            return (
                                <div key={item.href}>
                                    {hasSubItems ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleSubmenu(item.label)}
                                            className={cn(
                                                "flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
                                                isActive || isSubItemActive
                                                    ? "bg-accent text-foreground dark:bg-white/10 dark:text-white"
                                                    : "text-muted-foreground hover:bg-accent dark:hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className={cn("w-4 h-4 shrink-0", isActive || isSubItemActive ? "text-foreground dark:text-white" : "text-muted-foreground")} />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isSubmenuOpen ? "rotate-180" : "")} />
                                        </button>
                                    ) : item.emDesenvolvimento && onOpenEmDev ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenEmDev()}
                                            className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                                                "text-muted-foreground hover:bg-accent dark:hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            {item.label}
                                        </button>
                                    ) : (
                                        <Link href={item.href}
                                            className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
                                                isActive
                                                    ? "bg-accent text-foreground dark:bg-white/10 dark:text-white"
                                                    : "text-muted-foreground hover:bg-accent dark:hover:bg-white/5"
                                            )}>
                                            <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-foreground dark:text-white" : "text-muted-foreground")} />
                                            {item.label}
                                        </Link>
                                    )}
                                    {hasSubItems && isSubmenuOpen && (
                                        <div className="ml-9 mt-0.5 space-y-0.5">
                                            {(item.subItems ?? []).map(sub => {
                                                const subLink = (
                                                    <Link href={sub.href}
                                                        className={cn("block px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                                                            pathname === sub.href
                                                                ? "text-foreground dark:text-white"
                                                                : "text-muted-foreground hover:text-foreground dark:hover:text-white"
                                                        )}>
                                                        {sub.label}
                                                    </Link>
                                                );
                                                return sub.feature ? (
                                                    <CanAccessFeature key={sub.href} feature={sub.feature}>
                                                        {subLink}
                                                    </CanAccessFeature>
                                                ) : (
                                                    <div key={sub.href}>{subLink}</div>
                                                );
                                            })}
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
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Usuários
                        </Link>
                    </div>
                )}
                {user?.role === "SUPER_ADMIN" && (
                    <div className="mb-3">
                        <p className="section-label mb-1 px-2 text-muted-foreground">Admin</p>
                        <Link href="/admin/clientes"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            Gerenciar Clientes
                        </Link>
                    </div>
                )}
            </nav>
            <div className="border-t border-border p-3">
                <button onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10">
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
    const [supportOpen, setSupportOpen] = useState(false);
    const [emDevDialogOpen, setEmDevDialogOpen] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);
    const { user, logout } = useAuth();
    const isEmpresaAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    /* Flatten all groups into topbar-ready structure */
    const principalItems = navGroups.find(g => g.group === "Principal")?.items ?? [];
    const moduleItems = navGroups.find(g => g.group === "Módulos")?.items ?? [];

    return (
        <div className="flex min-h-screen flex-col bg-background">

            {/* ── Topbar ─────────────────────────────────────── */}
            <header
                className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background px-4"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center shrink-0 mr-2 md:mr-4">
                    <Logo size="sm" />
                </Link>

                {/* Desktop nav */}
                <nav className="hidden lg:flex items-center justify-center gap-0.5 flex-1">
                    {/* Simple items */}
                    {principalItems.map(item => (
                        item.emDesenvolvimento
                            ? <NavItemEmDesenvolvimento key={item.label} item={item} onOpen={() => setEmDevDialogOpen(true)} />
                            : item.subItems
                                ? <NavDropdown key={item.label} item={item} pathname={pathname} />
                                : <NavLink key={item.href} item={item} pathname={pathname} />
                    ))}

                    {/* Divider */}
                    <div className="mx-1.5 h-5 w-px bg-border" />

                    {/* Module items with dropdowns */}
                    {moduleItems.map(item => (
                        item.emDesenvolvimento
                            ? <NavItemEmDesenvolvimento key={item.label} item={item} onOpen={() => setEmDevDialogOpen(true)} />
                            : item.subItems
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
                    <div className="mx-1 hidden h-5 w-px bg-border md:block" />
                    <AlertsDropdown />
                    <div className="mx-1 hidden h-5 w-px bg-border md:block" />

                    {/* User dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-accent">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                                        {user?.name?.substring(0, 2).toUpperCase() || "US"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden sm:flex flex-col items-start">
                                    <span className="text-[12px] font-semibold leading-none text-foreground">{user?.name || "Usuário"}</span>
                                    <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">{user?.role || "Acesso"}</span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuLabel className="section-label">Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link href="/perfil"><User className="mr-2 h-4 w-4" /> Perfil</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link href="/configuracoes"><Settings className="mr-2 h-4 w-4" /> Configurações</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link href="/extensao"><Puzzle className="mr-2 h-4 w-4" /> Extensão Chrome</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                                <Link href="/planos"><CreditCard className="mr-2 h-4 w-4" /> Planos</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="rounded-lg cursor-pointer"
                                onSelect={() => setSupportOpen(true)}
                            >
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Suporte
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="rounded-lg cursor-pointer"
                                onSelect={() => setTourOpen(true)}
                            >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Tour do sistema
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="rounded-lg text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" /> Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile menu */}
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px] border-0">
                            <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle></SheetHeader>
                            <MobileSidebarContent
                                pathname={pathname}
                                user={user}
                                logout={logout}
                                onOpenEmDev={() => { setEmDevDialogOpen(true); setIsMobileOpen(false); }}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* Popup "Em desenvolvimento" (ex.: Disputa) */}
            <Dialog open={emDevDialogOpen} onOpenChange={setEmDevDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center space-y-2">
                        <DialogTitle className="text-base font-semibold text-center">Em manutenção</DialogTitle>
                        <DialogDescription className="text-center">
                            O módulo de Disputa está em desenvolvimento. Estamos organizando a arquitetura do robô de lances. Em breve você poderá criar e acompanhar disputas automatizadas por aqui.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="justify-center">
                        <Button variant="outline" onClick={() => setEmDevDialogOpen(false)}>
                            Entendi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Page content ────────────────────────────────── */}
            <main className={cn("flex-1 overflow-y-auto", fullWidth ? "p-4" : "p-5 md:p-7")}>
                <div className={cn("mx-auto space-y-6 animate-fade-in", fullWidth ? "max-w-none px-2" : "max-w-screen-xl")}>
                    {children}
                </div>
            </main>
            <SupportDrawer open={supportOpen} onClose={() => setSupportOpen(false)} />
            <OnboardingModal forceOpen={tourOpen} onForceClose={() => setTourOpen(false)} />
            <FeatureLockModal />
        </div>
    );
}
