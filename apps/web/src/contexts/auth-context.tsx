"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@licitafacil/shared";
import { useRouter, usePathname } from "next/navigation";
import { getToken, getUser, setAuth, clearAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { PLAN_HIERARCHY, type PlanEnum } from "@/constants/plans";

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
    markOnboardingComplete: () => void;
    userPlan: PlanEnum;
    planLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parsePlanEnum(value: string | undefined): PlanEnum {
    if (value && (PLAN_HIERARCHY as readonly string[]).includes(value)) {
        return value as PlanEnum;
    }
    return "STARTER";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userPlan, setUserPlan] = useState<PlanEnum>("STARTER");
    const [planLoading, setPlanLoading] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const savedToken = getToken();
        const savedUser = getUser();

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(savedUser);
        } else if (pathname !== "/login") {
            // router.push("/login"); // Optional: auto-redirect if not logged in
        }
        setIsLoading(false);
    }, [pathname, router]);

    useEffect(() => {
        if (!user || !token) {
            setUserPlan("STARTER");
            setPlanLoading(false);
            return;
        }
        let cancelled = false;
        setPlanLoading(true);
        api
            .get<{ plano: string }>("/empresas/me/plano")
            .then(({ data }) => {
                if (!cancelled) setUserPlan(parsePlanEnum(data?.plano));
            })
            .catch(() => {
                if (!cancelled) setUserPlan("STARTER");
            })
            .finally(() => {
                if (!cancelled) setPlanLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user, token]);

    const login = (newToken: string, newUser: User) => {
        setAuth(newToken, newUser);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        clearAuth();
        setToken(null);
        setUser(null);
        setUserPlan("STARTER");
        router.push("/login");
    };

    const markOnboardingComplete = () => {
        if (!user) return;
        const updatedUser: User = { ...user, onboardingConcluido: true };
        setUser(updatedUser);
        if (token) setAuth(token, updatedUser);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isLoading,
                markOnboardingComplete,
                userPlan,
                planLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
