import { useState, useEffect } from 'react';
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/configs/axios';
import { ApiRoutes } from '@/configs/axios.routes';
import { useAuth } from '@/contexts/UserContext';

const REGISTRATION_EMAIL_KEY = 'registration_email';
const REGISTRATION_PASSWORD_KEY = 'registration_password';

interface VerifyFormData {
    otp: string;
}

export default function VerifyRegisterOTPScreen() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [countdown, setCountdown] = useState<number>(120);
    const [canResend, setCanResend] = useState<boolean>(false);
    
    const { login } = useAuth();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<VerifyFormData>({
        defaultValues: {
            otp: '',
        },
        mode: 'onSubmit',
    });

    // Load stored email and password on component mount
    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const storedEmail = await SecureStore.getItemAsync(REGISTRATION_EMAIL_KEY);
                const storedPassword = await SecureStore.getItemAsync(REGISTRATION_PASSWORD_KEY);
                
                if (!storedEmail || !storedPassword) {
                    Alert.alert('Error', 'Registration data not found. Please start registration again.', [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/(auth)/register'),
                        },
                    ]);
                    return;
                }
                
                setEmail(storedEmail);
                setPassword(storedPassword);
            } catch (error) {
                console.error('Error loading stored data:', error);
                Alert.alert('Error', 'Failed to load registration data.', [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(auth)/register'),
                    },
                ]);
            }
        };

        loadStoredData();
    }, []);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const verifyOTPMutation = useMutation({
        mutationFn: ({ otp }: { otp: string }) => 
            httpClient.post(ApiRoutes.VERIFY_OTP, {
                email,
                password,
                otp,
                first_name: 'Guest',
                last_name: '',
            }),
        onSuccess: async (data) => {
            // Clear stored registration data
            await SecureStore.deleteItemAsync(REGISTRATION_EMAIL_KEY);
            await SecureStore.deleteItemAsync(REGISTRATION_PASSWORD_KEY);
            
            Alert.alert('Success', 'Account created successfully!', [
                {
                    text: 'OK',
                    onPress: async () => {
                        // Auto-login the user after successful registration
                        try {
                            await login(email, password);
                            router.replace('/(screens)');
                        } catch (error) {
                            console.error('Auto-login failed:', error);
                            router.replace('/(auth)/login');
                        }
                    },
                },
            ]);
        },
        onError: (error: any) => {
            const errorMessage = error?.message || 'Failed to verify OTP. Please try again.';
            Alert.alert('Verification Failed', errorMessage);
        },
    });

    const resendOTPMutation = useMutation({
        mutationFn: () =>
            httpClient.post(ApiRoutes.RESEND_OTP, { email }),
        onSuccess: () => {
            setCountdown(120);
            setCanResend(false);
            Alert.alert('Success', 'OTP resent successfully!');
        },
        onError: (error: any) => {
            const errorMessage = error?.message || 'Failed to resend OTP. Please try again.';
            Alert.alert('Resend Failed', errorMessage);
        },
    });

    const onSubmit: SubmitHandler<VerifyFormData> = async (data) => {
        await verifyOTPMutation.mutateAsync({ otp: data.otp });
    };

    const handleResendOTP = async () => {
        if (canResend) {
            await resendOTPMutation.mutateAsync();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <LinearGradient
            colors={['#7c3aed', '#a78bfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <SafeAreaView className="flex-1 p-5 justify-center">
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                    }}
                >
                    <View className="w-full max-w-md bg-gray-100/65 rounded-2xl p-8 self-center shadow-lg">
                        {/* Logo Container */}
                        <View className="flex-row items-center justify-center mb-6">
                            <Image
                                source={require('@/assets/images/logo.png')}
                                className="w-16 h-16 mr-2"
                            />
                            <Text className="text-2xl font-bold text-gray-800">
                                Azurea
                            </Text>
                        </View>

                        <Text className="text-4xl font-bold text-center text-gray-800 mb-1">
                            Verify Your Email
                        </Text>
                        <Text className="text-gray-600 text-center text-lg mb-2">
                            Enter the OTP sent to
                        </Text>
                        <Text className="text-violet-600 text-center text-lg font-semibold mb-6">
                            {email}
                        </Text>

                        {/* OTP Input Field */}
                        <View className="mb-5">
                            <Controller
                                control={control}
                                name="otp"
                                rules={{
                                    required: 'OTP is required',
                                    pattern: {
                                        value: /^\d{6}$/,
                                        message: 'OTP must be 6 digits',
                                    },
                                }}
                                render={({
                                    field: { onChange, onBlur, value },
                                }) => (
                                    <TextInput
                                        className="bg-white/50 border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-xl text-center"
                                        placeholder="Enter 6-digit OTP"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                )}
                            />
                            {errors.otp && (
                                <Text className="text-red-500 mt-2 text-center">
                                    {errors.otp.message}
                                </Text>
                            )}
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            className={`bg-violet-600 rounded-xl p-3 mb-4 ${
                                isSubmitting ? 'opacity-50' : ''
                            }`}
                            onPress={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                        >
                            <Text className="text-white text-2xl uppercase text-center font-semibold">
                                {isSubmitting ? (
                                    <View className="flex-row items-center justify-center">
                                        <ActivityIndicator color="#fff" />
                                        <Text className="ml-2">Verifying...</Text>
                                    </View>
                                ) : (
                                    'Verify OTP'
                                )}
                            </Text>
                        </TouchableOpacity>

                        {/* Resend OTP */}
                        <View className="flex-row justify-center items-center mb-4">
                            <Text className="text-gray-600 mr-2">Didn&apos;t receive OTP?</Text>
                            <TouchableOpacity
                                onPress={handleResendOTP}
                                disabled={!canResend || resendOTPMutation.isPending}
                            >
                                <Text className={`font-semibold ${
                                    canResend ? 'text-violet-600' : 'text-gray-400'
                                }`}>
                                    {resendOTPMutation.isPending ? 'Sending...' : 'Resend'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Countdown Timer */}
                        {!canResend && (
                            <Text className="text-gray-500 text-center mb-4">
                                Resend available in {formatTime(countdown)}
                            </Text>
                        )}

                        {/* Back to Register Link */}
                        <View className="flex-row justify-center">
                            <Text className="text-gray-600">
                                Wrong email?{' '}
                            </Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    await SecureStore.deleteItemAsync(REGISTRATION_EMAIL_KEY);
                                    await SecureStore.deleteItemAsync(REGISTRATION_PASSWORD_KEY);
                                    router.replace('/(auth)/register');
                                }}
                            >
                                <Text className="text-violet-600 font-semibold">
                                    Go back
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}