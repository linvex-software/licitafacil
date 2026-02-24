"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileStack,
  FolderOpen,
  Search,
  Newspaper,
  TrendingUp,
  Scale,
  Settings,
  Users,
  LogOut,
  Menu,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { AlertsDropdown } from "@/components/AlertsDropdown";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

type NavItemData = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navSections: { group: string; items: NavItemData[] }[] = [
  {
    group: "Gestão",
    items: [
      { label: "Geral", icon: LayoutGrid, href: "/" },
      { label: "Processos", icon: FileStack, href: "/licitacoes" },
      { label: "Biblioteca", icon: FolderOpen, href: "/documentos" },
      { label: "Análises", icon: TrendingUp, href: "/relatorios" },
    ],
  },
  {
    group: "Integrações",
    items: [
      { label: "Buscas", icon: Search, href: "/integracoes/comprasnet" },
      { label: "Publicações", icon: Newspaper, href: "/integracoes/diarios" },
    ],
  },
  {
    group: "Inteligência",
    items: [
      { label: "Análise de Edital", icon: Sparkles, href: "/analise-edital" },
      { label: "Insights", icon: TrendingUp, href: "/analise-mercado" },
      { label: "Jurídico", icon: Scale, href: "/juridico" },
    ],
  },
  {
    group: "Configurações",
    items: [
      { label: "Equipe", icon: Users, href: "/usuarios" },
      { label: "Preferências", icon: Settings, href: "/configuracoes" },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "US";

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  function NavItem({
    item,
    compact,
  }: {
    item: NavItemData;
    compact: boolean;
  }) {
    const isActive = isItemActive(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group",
          isActive
            ? "bg-[#252837] text-white border-l-[3px] border-[#2563eb] pl-[10px]"
            : "text-gray-400 hover:text-white hover:bg-[#252837]",
          compact && "justify-center px-2.5"
        )}
        title={compact ? item.label : undefined}
      >
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive ? "text-[#2563eb]" : "text-gray-400 group-hover:text-white"
          )}
        >
          <item.icon className="w-4 h-4" />
        </span>
        {!compact && <span>{item.label}</span>}
      </Link>
    );
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const compact = mobile ? false : collapsed;
    return (
      <aside
        className={cn(
          "h-screen bg-[#1a1d2e] text-gray-300 flex flex-col transition-all duration-300 overflow-hidden",
          compact ? "w-16" : "w-64"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#252837] flex-shrink-0">
          {!compact ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#2563eb] rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">LX</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Limvex</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Licitações
                </p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-[#2563eb] rounded-md flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">LX</span>
            </div>
          )}

          {!mobile && (
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="p-1.5 hover:bg-[#252837] rounded-md transition-colors"
              aria-label={compact ? "Expandir menu" : "Recolher menu"}
            >
              {compact ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <nav className={cn("flex-1", compact ? "p-2" : "p-3")}>
          {navSections.map((section) => (
            <div key={section.group} className="mb-4">
              {!compact && (
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {section.group}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.href} item={item} compact={compact} />
                ))}
              </div>
            </div>
          ))}

          {user?.role === "SUPER_ADMIN" && (
            <div className="mb-4">
              {!compact && (
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  Administração
                </p>
              )}
              <NavItem
                item={{
                  href: "/admin/clientes",
                  icon: ShieldCheck,
                  label: "Clientes",
                }}
                compact={compact}
              />
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-[#252837] space-y-2 flex-shrink-0">
          {!compact && (
            <div className="flex items-center gap-3 px-1 pb-1">
              <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "Usuário"}
                </p>
                <p className="text-xs text-gray-400">{user?.role || "ACESSO"}</p>
              </div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-[#252837] transition-colors w-full",
              compact && "justify-center px-2.5"
            )}
            title={compact ? "Alternar tema" : undefined}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!compact && <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>}
          </button>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-300 hover:bg-[#252837] hover:text-white",
              compact && "justify-center px-2.5"
            )}
            onClick={logout}
            title={compact ? "Sair" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!compact && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-0 z-50 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen w-full min-w-0 transition-all duration-300",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <header className="h-16 bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-[#334155] sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-64 border-r-0 bg-[#1a1d2e]"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de Navegação</SheetTitle>
                </SheetHeader>
                <SidebarContent mobile />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <AlertsDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 hover:bg-gray-100 dark:hover:bg-[#252837]"
                >
                  <span className="w-8 h-8 rounded-full bg-[#2563eb] text-white text-xs font-semibold inline-flex items-center justify-center">
                    {initials}
                  </span>
                  <div className="hidden sm:flex flex-col items-start text-xs">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {user?.name || "Usuário"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 uppercase">
                      {user?.role || "Acesso"}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
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

        <main className="flex-1 p-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
