import useAuthStore from '@/store/AuthStore';

export const useAuth = () => {
    const {
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        fetchUser,
        clearAuth
    } = useAuthStore();

    return {
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refetchUser: fetchUser,
        clearAuth
    };
};