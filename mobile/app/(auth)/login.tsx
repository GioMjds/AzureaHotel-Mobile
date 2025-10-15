import { useState } from 'react';
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { router } from 'expo-router';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface LoginFormData {
    email: string;
    password: string;
}

export default function LoginScreen() {
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const { loginMutation } = useAuthMutations();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onSubmit',
    });

    const onSubmit: SubmitHandler<LoginFormData> = (data) => {
        loginMutation.mutate(data);
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    // Get error message
    const getErrorMessage = () => {
        if (loginMutation.error) {
            const error = loginMutation.error as any;
            return error?.response?.data?.error || 
                   error?.message || 
                   'Login failed. Please try again.';
        }
        return null;
    };

    const errorMessage = getErrorMessage();

    return (
        <View className="flex-1">
            {/* Background Gradient Overlay */}
            <View className="absolute inset-0">
                <LinearGradient
                    colors={['#6F00FF', '#E9B3FB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                />
                {/* Decorative Elements */}
                <View className="absolute top-20 right-8 w-32 h-32 rounded-full bg-brand-accent opacity-20" />
                <View className="absolute bottom-32 left-8 w-24 h-24 rounded-full bg-brand-accent opacity-25" />
            </View>

            <SafeAreaView className="flex-1 p-6 justify-center">
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Main Login Card */}
                    <View className="w-full max-w-md bg-surface-default/95 backdrop-blur-xl rounded-3xl p-8 self-center shadow-2xl border border-border-subtle">
                        {/* Logo and Branding Section */}
                        <View className="items-center mb-2">
                            <View className="bg-brand-primary/10 rounded-full p-4 mb-4">
                                <Image
                                    source={require('@/assets/images/logo.png')}
                                    className="w-16 h-16"
                                />
                            </View>
                            <Text className="text-3xl font-playfair-bold text-text-primary mb-2">
                                Azurea Hotel
                            </Text>
                            <View className="w-16 h-1 bg-brand-primary rounded-full" />
                        </View>

                        {/* Welcome Text */}
                        <View className="mb-8 text-center">
                            <Text className="text-text-secondary font-montserrat text-lg text-center leading-6">
                                Sign in to access your bookings and explore
                                luxury accommodations
                            </Text>
                        </View>

                        {/* Error Message Banner */}
                        {errorMessage && (
                            <View className="mb-6 bg-feedback-error-light border border-feedback-error-DEFAULT rounded-xl p-4">
                                <View className="flex-row items-center">
                                    <FontAwesome
                                        name="exclamation-circle"
                                        size={20}
                                        color="#DC2626"
                                    />
                                    <Text className="text-feedback-error-dark font-montserrat-bold text-sm ml-2 flex-1">
                                        {errorMessage}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Email Input */}
                        <View className="mb-6">
                            <Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
                                Email Address
                            </Text>
                            <Controller
                                control={control}
                                name="email"
                                rules={{
                                    required: 'Email is required',
                                    pattern: {
                                        value: /\S+@\S+\.\S+/,
                                        message:
                                            'Please enter a valid email address',
                                    },
                                }}
                                render={({
                                    field: { onChange, onBlur, value },
                                }) => (
                                    <View className="relative">
                                        <TextInput
                                            className={`bg-input-background border-2 ${errors.email ? 'border-input-border-error' : 'border-input-border'} focus:border-input-border-focus rounded-2xl p-4 pl-12 text-input-text font-montserrat text-lg`}
                                            placeholder="Enter your email"
                                            placeholderTextColor="#E9B3FB"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!loginMutation.isPending}
                                        />
                                        <View className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                            <FontAwesome
                                                name="envelope"
                                                size={20}
                                                color="#6F00FF"
                                            />
                                        </View>
                                    </View>
                                )}
                            />
                            {errors.email && (
                                <View className="flex-row items-center mt-2 ml-1">
                                    <FontAwesome
                                        name="exclamation-circle"
                                        size={16}
                                        color="#EF4444"
                                    />
                                    <Text className="text-feedback-error-DEFAULT font-montserrat text-sm ml-2">
                                        {errors.email.message}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Password Input */}
                        <View className="mb-6">
                            <Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
                                Password
                            </Text>
                            <View className="relative">
                                <Controller
                                    control={control}
                                    name="password"
                                    rules={{
                                        required: 'Password is required',
                                        minLength: {
                                            value: 6,
                                            message:
                                                'Password must be at least 6 characters',
                                        },
                                    }}
                                    render={({
                                        field: { onChange, onBlur, value },
                                    }) => (
                                        <TextInput
                                            className={`bg-input-background border-2 ${errors.password ? 'border-input-border-error' : 'border-input-border'} focus:border-input-border-focus rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#E9B3FB"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry={!showPassword}
                                            editable={!loginMutation.isPending}
                                        />
                                    )}
                                />
                                <View className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                    <FontAwesome
                                        name="lock"
                                        pressRetentionOffset={{
                                            top: 10,
                                            bottom: 10,
                                            left: 10,
                                            right: 10,
                                        }}
                                        size={20}
                                        color="#6F00FF"
                                    />
                                </View>
                                <TouchableOpacity
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2"
                                    onPress={togglePasswordVisibility}
                                    disabled={loginMutation.isPending}
                                >
                                    <FontAwesome
                                        name={
                                            showPassword ? 'eye-slash' : 'eye'
                                        }
                                        size={20}
                                        color="#6F00FF"
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && (
                                <View className="flex-row items-center mt-2 ml-1">
                                    <FontAwesome
                                        name="exclamation-circle"
                                        size={16}
                                        color="#EF4444"
                                    />
                                    <Text className="text-feedback-error-DEFAULT font-montserrat text-sm ml-2">
                                        {errors.password.message}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Forgot Password Link */}
                        <View className="flex-row items-center mb-4">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    router.push('/(auth)/forgot-pass')
                                }
                                disabled={loginMutation.isPending}
                            >
                                <Text className="text-interactive-primary font-montserrat-bold text-sm">
                                    Forgot Password?
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            className={`bg-interactive-primary rounded-2xl p-4 mb-2 shadow-lg ${loginMutation.isPending ? 'opacity-70' : ''}`}
                            onPress={handleSubmit(onSubmit)}
                            disabled={loginMutation.isPending}
                            activeOpacity={0.8}
                        >
                            {loginMutation.isPending ? (
                                <View className="flex-row items-center justify-center">
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFF1F1"
                                    />
                                    <Text className="text-interactive-primary-foreground text-base font-montserrat-bold ml-2">
                                        Signing in...
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-interactive-primary-foreground text-xl font-montserrat-bold text-center">
                                    Login
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Register Link */}
                        <View className="flex-col space-y-2 items-center mt-2">
                            <View className="flex-row items-center">
                                <Text className="text-text-muted font-montserrat text-base">
                                    Don&apos;t have an account?
                                </Text>
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push('/(auth)/register')
                                    }
                                    className="ml-1"
                                    disabled={loginMutation.isPending}
                                >
                                    <Text className="text-interactive-primary font-montserrat-bold text-base">
                                        Register here
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Footer */}
                    <View className="mt-8 items-center">
                        <Text className="text-text-inverse/80 font-montserrat text-sm text-center">
                            By signing in, you agree to our Terms of Service
                            {'\n'}and Privacy Policy
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}