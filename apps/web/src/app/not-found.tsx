import { Card, CardContent } from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Card className="w-full max-w-md mx-4 shadow-lg border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                    <div className="flex mb-4 gap-2">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">404 - Página Não Encontrada</h1>
                    </div>

                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        A página que você está procurando não existe ou foi movida.
                    </p>

                    <div className="mt-6">
                        <Link href="/" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                            Voltar para o Dashboard
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
