import useAuthStore from '@/store/AuthStore';
import { useAuthMutations } from './useAuthMutations';

export const useAuth = () => {
    const {
        user,
        isAuthenticated,
        isLoading,
        fetchUser,
        clearAuth
    } = useAuthStore();

    const { loginMutation, logoutMutation } = useAuthMutations();

    const login = async (email: string, password: string) => {
        return new Promise((resolve, reject) => {
            loginMutation.mutate(
                { email, password },
                {
                    onSuccess: () => resolve({ success: true, message: 'Login successful' }),
                    onError: (error) => reject({ success: false, message: error.message || 'Login failed' })
                }
            );
        });
    };

    const logout = async () => {
        return new Promise<void>((resolve) => {
            logoutMutation.mutate(undefined, {
                onSettled: () => resolve() // Always resolve, even on error
            });
        });
    };

    return {
        user,
        isAuthenticated,
        isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
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