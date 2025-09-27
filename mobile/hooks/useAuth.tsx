import useAuthStore from '@/store/AuthStore';
import { useAuthMutations } from './useAuthMutations';

export const useAuth = () => {
    const {
        user,
        isAuthenticated,
        fetchUser,
        clearAuth
    } = useAuthStore();

    const { loginMutation, logoutMutation } = useAuthMutations();

    const login = async (email: string, password: string) => {
        await loginMutation.mutateAsync({ email, password });
    };

    const logout = async () => {
        await logoutMutation.mutateAsync();
    };

    return {
        user,
        isAuthenticated,
        isLoading: loginMutation.isPending || logoutMutation.isPending,
        login,
        logout,
        refetchUser: fetchUser,
        clearAuth,
        // Expose mutation states for more granular control
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
        loginError: loginMutation.error,
        logoutError: logoutMutation.error,
    };
};