import React, { useEffect } from "react";
import { Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/UserContext";
import { useForm, Controller } from "react-hook-form";
import { router } from "expo-router";

export default function LoginScreen() {
    const { login, isAuthenticated } = useAuth();
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    useEffect(() => {
        if (isAuthenticated) {
            router.replace("/(screens)");
        }
    }, [isAuthenticated]);

    const onSubmit = async (data: { email: string; password: string }) => {
        if (!data.email || !data.password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        try {
            const result = await login(data.email, data.password);
            if (result.success) {
                Alert.alert("Success", result.message || "Login successful");
                router.replace("/(screens)");
            } else {
                Alert.alert("Login Failed", result.message || "Invalid credentials");
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white p-6">
            <View className="flex-1 justify-center">
                <Text className="text-3xl font-bold text-center mb-8">Login</Text>
                <Controller
                    control={control}
                    name="email"
                    rules={{ required: "Email is required" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            className="border border-gray-300 rounded-lg p-4 mb-4"
                            placeholder="Email"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    )}
                />
                {errors.email && (
                    <Text className="text-red-500 mb-2">{errors.email.message}</Text>
                )}

                <Controller
                    control={control}
                    name="password"
                    rules={{ required: "Password is required" }}
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            className="border border-gray-300 rounded-lg p-4 mb-6"
                            placeholder="Password"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            secureTextEntry
                        />
                    )}
                />
                {errors.password && (
                    <Text className="text-red-500 mb-2">{errors.password.message}</Text>
                )}

                <TouchableOpacity
                    className={`bg-blue-600 rounded-lg p-4 ${isSubmitting ? 'opacity-50' : ''}`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    <Text className="text-white text-center font-semibold">
                        {isSubmitting ? "Logging in..." : "Login"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}