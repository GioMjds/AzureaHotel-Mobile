import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/UserContext";
import { Redirect } from "expo-router";
import { ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
    requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, fallback, requireAuth }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
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