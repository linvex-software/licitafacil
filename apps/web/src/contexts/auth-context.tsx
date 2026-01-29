"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@licitafacil/shared";
import { useRouter, usePathname } from "next/navigation";
import { getToken, getUser, setAuth, clearAuth } from "@/lib/auth";

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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

    const login = (newToken: string, newUser: User) => {
        setAuth(newToken, newUser);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        clearAuth();
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
