import { View, Text, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/UserContext";
import { Redirect } from "expo-router";
import { ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4">Loading...</Text>
            </View>
        );
    }

    if (!isAuthenticated) {
        return fallback || <Redirect href="/(auth)/login" />;
    }

    return <>{children}</>;
}