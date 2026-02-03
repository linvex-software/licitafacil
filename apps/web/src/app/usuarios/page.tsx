"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchUsers, fetchUsoPlano, createUser, type UsoPlano } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@licitafacil/shared";
import { UserPlus, Users, Loader2 } from "lucide-react";

function roleLabel(role: string) {
  return role === UserRole.ADMIN ? "Administrador" : "Colaborador";
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchUsers>>>([]);
  const [uso, setUso] = useState<UsoPlano | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.COLABORADOR,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, usoData] = await Promise.all([
        fetchUsers(),
        fetchUsoPlano(),
      ]);
      setUsers(usersData);
      setUso(usoData);
    } catch {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = user?.role === UserRole.ADMIN;
  const podeAdicionar = uso?.podeAdicionarUsuario ?? false;
  const showNovoUsuario = isAdmin && podeAdicionar;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresaId) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        empresaId: user.empresaId,
        role: form.role,
      });
      toast({ title: "Usuário criado com sucesso" });
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "", role: UserRole.COLABORADOR });
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const text =
        typeof msg === "string"
          ? msg
          : Array.isArray(msg) && msg.length
            ? msg[0]
            : "Erro ao criar usuário. Verifique o limite do plano.";
      setFormError(text);
      toast({ title: text, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Usuários
          </h1>
          <p className="text-slate-600">
            Gerencie os usuários da sua empresa. O número de usuários depende do
            plano contratado.
          </p>
        </div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Carregando...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Uso do plano */}
            {uso && (
              <Card className="mb-6 border-slate-200">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        {uso.usuariosAtivos} / {uso.limiteUsuarios} usuários
                        (plano {uso.plano.nome})
                      </span>
                    </div>
                    {showNovoUsuario && (
                      <Button
                        onClick={() => {
                          setFormError(null);
                          setDialogOpen(true);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Novo usuário
                      </Button>
                    )}
                    {isAdmin && !podeAdicionar && (
                      <p className="text-sm text-amber-600">
                        Limite do plano atingido. Altere o plano em
                        Configurações para adicionar mais usuários.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de usuários */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-heading">
                  Usuários da empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Nenhum usuário cadastrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{roleLabel(u.role)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog Novo usuário */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                  {formError}
                </div>
              )}
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                  minLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              </div>
              <div>
                <Label>Perfil</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as UserRole }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.COLABORADOR}>
                      Colaborador
                    </SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Criar usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
