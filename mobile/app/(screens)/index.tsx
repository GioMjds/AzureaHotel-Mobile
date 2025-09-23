import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";

export default function IndexScreen() {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace("/(auth)/login");
    };

    return (
        <SafeAreaView className="flex-1 bg-background p-6">
            <View>
                <Text className="text-2xl font-bold mb-4 text-white">
                    Welcome, {user?.first_name} {user?.last_name}!
                </Text>

                <Text className="text-gray-400 mb-6">Email: {user?.email}</Text>

                <Image source={{ uri: user?.profile_image }} className="w-32 h-32 rounded-full self-center mb-4" />

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