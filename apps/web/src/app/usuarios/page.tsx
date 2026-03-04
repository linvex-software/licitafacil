"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CriarUsuarioModal } from "@/components/usuarios/criar-usuario-modal";
import { EditarUsuarioModal } from "@/components/usuarios/editar-usuario-modal";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Edit,
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

interface LimiteUsuarios {
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
  SUPER_ADMIN: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  ADMIN: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800",
  COLABORADOR: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
};

export default function UsuariosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [limiteUsuarios, setLimiteUsuarios] = useState<LimiteUsuarios | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(
    null,
  );

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [usuariosRes, limiteRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/limite"),
      ]);

      setUsuarios(usuariosRes.data);
      setLimiteUsuarios(limiteRes.data);
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
  const limite = limiteUsuarios?.limite ?? 30;
  const totalUsuariosCriados = limiteUsuarios?.atual ?? usuarios.length;
  const percentualUso = limiteUsuarios?.percentual ?? Math.min(Math.round((totalUsuariosCriados / limite) * 100), 100);
  const limiteAtingido = totalUsuariosCriados >= limite;


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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
              limiteAtingido={limiteAtingido}
            />
          )}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Uso de usuários
              </span>
              <span className="text-muted-foreground">
                {totalUsuariosCriados} de {limite}
              </span>
            </div>
            <Progress value={totalUsuariosCriados} max={limite} />
            <p className="text-xs text-muted-foreground">
              {limiteAtingido
                ? "Limite de 30 usuários atingido. Para aumentar, será necessário ajuste personalizado."
                : `${percentualUso}% do limite utilizado.`}
            </p>
          </CardContent>
        </Card>

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
                            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                          >
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      {isAdmin && !(user?.role === 'ADMIN' && usuario.role === 'SUPER_ADMIN') && (
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletarPermanente(usuario)}
                              disabled={usuario.id === user?.id}
                              className="hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 disabled:opacity-50"
                              title={
                                usuario.id === user?.id
                                  ? "Você não pode remover sua própria conta"
                                  : "Remover permanentemente (irreversível)"
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
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
