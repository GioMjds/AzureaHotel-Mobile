import { View, Text, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { ReactNode } from "react";
import useAuthStore from "@/store/AuthStore";

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
    requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, fallback, requireAuth }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading, isInitialized } = useAuthStore();

    if (!isInitialized || isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#6F00FF" />
                <Text className="mt-4">Loading...</Text>
            </View>
        );
    }

    if (requireAuth) {
        if (!isAuthenticated) {
            return fallback || <Redirect href="/(auth)/login" />;
        }
    } else {
        if (isAuthenticated) {
            return <Redirect href="/(screens)" />;
        }
    }

    return <>{children}</>;
}