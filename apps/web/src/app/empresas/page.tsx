"use client"

import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Building2 } from "lucide-react";

export default function EmpresasPage() {
    const { data: _empresa, isLoading } = useQuery({
        queryKey: ["empresa-principal"],
        queryFn: async () => {
            // In this setup, we usually get the user's company
            // The API doesn't seem to have a /empresa/:id list for everyone, usually it's tenant isolated
            // Let's try to get current user info and extract company
            const { data } = await api.get("/auth/me").catch(() => api.get("/users"));
            return data;
        },
    });

    return (
        <Layout>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">Empresas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão das empresas e unidades do grupo.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-heading flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            Empresa Principal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-4 animate-pulse bg-slate-50">Carregando...</TableCell>
                                    </TableRow>
                                ) : (
                                    <TableRow>
                                        <TableCell className="font-medium">Empresa de Teste DEV</TableCell>
                                        <TableCell><span className="text-emerald-600 font-medium">Ativa</span></TableCell>
                                        <TableCell className="text-gray-400 dark:text-gray-500 font-mono text-xs">00000000-0000-0000-0000-000000000001</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
