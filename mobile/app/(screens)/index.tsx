import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/UserContext";
import { router } from "expo-router";

export default function IndexScreen() {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace("/(auth)/login");
    };

    return (
        <SafeAreaView className="flex-1 bg-white p-6">
            <View className="flex-1">
                <Text className="text-2xl font-bold mb-4">
                    Welcome, {user?.first_name} {user?.last_name}!
                </Text>
                
                <Text className="text-gray-600 mb-6">Email: {user?.email}</Text>
                
                <TouchableOpacity
                    className="bg-red-600 rounded-lg p-4"
                    onPress={handleLogout}
                >
                    <Text className="text-white text-center font-semibold">Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}