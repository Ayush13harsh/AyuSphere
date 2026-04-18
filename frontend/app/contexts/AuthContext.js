'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');

        if (accessToken) {
            setUser({ accessToken, refreshToken });
            if (pathname === '/') {
                router.push('/dashboard');
            }
        } else {
            if (pathname !== '/') {
                router.push('/');
            }
        }
        setLoading(false);
    }, [pathname, router]);

    const login = useCallback((accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        setUser({ accessToken, refreshToken });
        router.push('/dashboard');
    }, [router]);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        router.push('/');
    }, [router]);

    const updateTokens = useCallback((accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        setUser(prev => ({ ...prev, accessToken, refreshToken: refreshToken || prev?.refreshToken }));
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateTokens }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
