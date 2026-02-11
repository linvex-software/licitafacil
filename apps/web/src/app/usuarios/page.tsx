"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CriarUsuarioModal } from "@/components/usuarios/criar-usuario-modal";
import { EditarUsuarioModal } from "@/components/usuarios/editar-usuario-modal";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Edit,
  UserX,
  UserCheck,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface Usuario {
  id: string;
  email: string;
  name: string;
  role: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
  ativo: boolean;
}

interface Limite {
  atual: number;
  limite: number;
  disponivel: number;
  percentual: number;
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  COLABORADOR: "Colaborador",
};

const roleBadgeClass: Record<string, string> = {
  SUPER_ADMIN: "bg-amber-100 text-amber-800 border-amber-200",
  ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  COLABORADOR: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function UsuariosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [limite, setLimite] = useState<Limite | null>(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(
    null,
  );

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [usuariosRes, limiteRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/limite").catch(() => ({ data: null })),
      ]);

      setUsuarios(usuariosRes.data);
      if (limiteRes.data) {
        setLimite(limiteRes.data);
      }
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      carregarDados();
    }
  }, [carregarDados, user, authLoading]);

  async function toggleAtivo(usuario: Usuario) {
    try {
      if (usuario.ativo) {
        await api.delete(`/users/${usuario.id}`);
        toast({
          title: "Usuário desativado",
          description: `${usuario.name} foi desativado.`,
        });
      } else {
        await api.post(`/users/${usuario.id}/reativar`);
        toast({
          title: "Usuário reativado",
          description: `${usuario.name} foi reativado.`,
        });
      }
      carregarDados();
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error.response?.data?.message || "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    }
  }

  async function deletarPermanente(usuario: Usuario) {
    const confirma = window.confirm(
      `ATENÇÃO: Esta ação é IRREVERSÍVEL.\n\nDeseja realmente excluir "${usuario.name}" (${usuario.email}) permanentemente?`,
    );
    if (!confirma) return;

    try {
      await api.delete(`/users/${usuario.id}/permanente`);
      toast({
        title: "Usuário excluído",
        description: `${usuario.name} foi removido permanentemente.`,
      });
      carregarDados();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description:
          error.response?.data?.message || "Não foi possível excluir.",
        variant: "destructive",
      });
    }
  }

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.name.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()),
  );

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const progressClass =
    (limite?.percentual ?? 0) >= 90
      ? "[&>div]:bg-red-500"
      : (limite?.percentual ?? 0) >= 80
        ? "[&>div]:bg-yellow-500"
        : "[&>div]:bg-green-500";

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">
            Carregando usuários...
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-8 w-8" />
              Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os usuários da sua empresa
            </p>
          </div>
          {isAdmin && (
            <CriarUsuarioModal
              onSuccess={carregarDados}
              limiteAtingido={limite?.disponivel === 0}
            />
          )}
        </div>

        {/* Card de Limite */}
        {limite && isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Limite de Usuários
                </CardTitle>
                <span className="text-2xl font-bold">
                  {limite.atual} / {limite.limite}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress
                value={Math.min(limite.percentual, 100)}
                className={`h-3 ${progressClass}`}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {limite.disponivel > 0
                  ? `${limite.disponivel} vaga${limite.disponivel !== 1 ? "s" : ""} disponível${limite.disponivel !== 1 ? "is" : ""}`
                  : ""}
              </p>
              {limite.percentual >= 90 && limite.disponivel > 0 && (
                <p className="text-xs text-yellow-600 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Limite quase atingido! Considere fazer upgrade do plano.
                </p>
              )}
              {limite.disponivel === 0 && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Limite atingido. Não é possível criar mais usuários.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Busca + Tabela */}
        <Card>
          <CardHeader>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 5 : 4}
                      className="text-center text-muted-foreground py-8"
                    >
                      {busca
                        ? "Nenhum usuário encontrado para essa busca"
                        : "Nenhum usuário cadastrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">
                        {usuario.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {usuario.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={roleBadgeClass[usuario.role] || ""}
                        >
                          {roleLabel[usuario.role] || usuario.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usuario.ativo ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-200"
                          >
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUsuarioEditando(usuario)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {usuario.id !== user?.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAtivo(usuario)}
                                  disabled={
                                    !usuario.ativo && limite?.disponivel === 0
                                  }
                                  title={
                                    !usuario.ativo && limite?.disponivel === 0
                                      ? "Limite atingido. Não é possível reativar."
                                      : usuario.ativo
                                        ? "Desativar"
                                        : "Reativar"
                                  }
                                >
                                  {usuario.ativo ? (
                                    <UserX className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletarPermanente(usuario)}
                                  className="hover:bg-red-50"
                                  title="Excluir permanentemente (irreversível)"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        {usuarioEditando && (
          <EditarUsuarioModal
            usuario={usuarioEditando}
            onClose={() => setUsuarioEditando(null)}
            onSuccess={() => {
              setUsuarioEditando(null);
              carregarDados();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
