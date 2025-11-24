import React, { useState, useEffect, useRef } from 'react';
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/configs/axios';
import { auth } from '@/services/UserAuth';
import { ApiRoutes } from '@/configs/axios.routes';
import { useAuth } from '@/hooks/useAuth';
import useAlertStore from '@/store/AlertStore';
import StyledAlert from '@/components/ui/StyledAlert';

const REGISTRATION_EMAIL_KEY = 'registration_email';
const REGISTRATION_PASSWORD_KEY = 'registration_password';

export default function VerifyRegisterOTPScreen() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [countdown, setCountdown] = useState<number>(120);
    const [canResend, setCanResend] = useState<boolean>(false);
	const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
	const otpInputRefs = useRef<(TextInput | null)[]>([]);

	const { alertConfig, setAlertConfig, hideAlert } = useAlertStore();

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
	}) => {
		setAlertConfig({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK' }],
		});
	};

    const { login } = useAuth();

    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const storedEmail = await SecureStore.getItemAsync(REGISTRATION_EMAIL_KEY);
                const storedPassword = await SecureStore.getItemAsync(REGISTRATION_PASSWORD_KEY);
                const storedFirstName = await SecureStore.getItemAsync('registration_first_name');
                const storedLastName = await SecureStore.getItemAsync('registration_last_name');
                
                if (!storedEmail || !storedPassword) {
                    showStyledAlert({ title: 'Error', message: 'Registration data not found. Please start registration again.', buttons: [{ text: 'OK', onPress: () => router.replace('/(auth)/register') }], type: 'error' });
                    return;
                }
                
                setEmail(storedEmail);
                setPassword(storedPassword);
                if (storedFirstName) setFirstName(storedFirstName);
                if (storedLastName) setLastName(storedLastName);
            } catch (error) {
                console.error('Error loading stored data:', error);
                showStyledAlert({ title: 'Error', message: 'Failed to load registration data.', buttons: [{ text: 'OK', onPress: () => router.replace('/(auth)/register') }], type: 'error' });
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
        mutationFn: async () => {
            const otpCode = otp.join('');
            return await auth.verifyOtp(email, password, otpCode, firstName, lastName);
        },
        onSuccess: async () => {
            await SecureStore.deleteItemAsync(REGISTRATION_EMAIL_KEY);
            await SecureStore.deleteItemAsync(REGISTRATION_PASSWORD_KEY);
            await SecureStore.deleteItemAsync('registration_first_name');
            await SecureStore.deleteItemAsync('registration_last_name');
            await login(email, password);
        },
        onError: (error: any) => {
            const errorMessage = error?.message || 'Failed to verify OTP. Please try again.';
            showStyledAlert({ title: 'Verification Failed', message: errorMessage, type: 'error' });
        },
    });

    const resendOTPMutation = useMutation({
        mutationFn: () => httpClient.post(ApiRoutes.RESEND_OTP, { email }),
        onSuccess: () => {
            setCountdown(120);
            setCanResend(false);
            showStyledAlert({ title: 'Success', message: 'OTP resent successfully!', type: 'success' });
        },
        onError: (error: any) => {
            const errorMessage = error?.message || 'Failed to resend OTP. Please try again.';
            showStyledAlert({ title: 'Resend Failed', message: errorMessage, type: 'error' });
        },
    });

    const onSubmit = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            showStyledAlert({ 
                title: 'Invalid Code', 
                message: 'Please enter all 6 digits', 
                type: 'error' 
            });
            return;
        }
        await verifyOTPMutation.mutateAsync();
    };

    const handleOtpChange = (text: string, index: number) => {
        // Only allow numbers
        if (text && !/^\d+$/.test(text)) return;

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto-focus next input
        if (text && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        // Handle backspace
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
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
        <>
        <View className="flex-1 bg-background-default">
            {/* Background Gradient Overlay */}
            <View className="absolute inset-0">
                <LinearGradient
                    colors={['#6F00FF', '#3B0270', '#E9B3FB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                />
                {/* Decorative Elements */}
                <View className="absolute top-20 right-8 w-32 h-32 rounded-full bg-brand-accent opacity-20" />
                <View className="absolute top-40 right-16 w-20 h-20 rounded-full bg-text-inverse opacity-15" />
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
                    {/* Main Verification Card */}
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
                            <Text className="text-2xl font-playfair-semibold text-text-primary text-center mb-2">
                                Verify Your Email
                            </Text>
                            <Text className="text-text-secondary font-montserrat text-base text-center leading-6 mb-1">
                                Enter the verification code sent to
                            </Text>
                            <Text className="text-interactive-primary font-montserrat-bold text-base text-center">
                                {email}
                            </Text>
                        </View>

                        {/* OTP Input - 6 Boxes */}
                        <View className="mb-6">
                            <Text className="text-text-primary font-montserrat-bold text-sm mb-4 text-center">
                                Enter Verification Code
                            </Text>
                            <View className="flex-row justify-between px-2">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            if (ref) otpInputRefs.current[index] = ref;
                                        }}
                                        className="bg-input-background border-2 border-input-border focus:border-input-border-focus rounded-2xl w-12 h-14 text-center text-text-primary font-montserrat-bold text-2xl"
                                        value={otp[index]}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                                        keyboardType="numeric"
                                        maxLength={1}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            className={`bg-interactive-primary rounded-2xl p-4 mb-6 shadow-lg ${verifyOTPMutation.isPending || otp.join('').length !== 6 ? 'opacity-50' : ''}`}
                            onPress={onSubmit}
                            disabled={verifyOTPMutation.isPending || otp.join('').length !== 6}
                            activeOpacity={0.8}
                        >
                            {verifyOTPMutation.isPending ? (
                                <View className="flex-row items-center justify-center">
                                    <ActivityIndicator size="small" color="#FFF1F1" />
                                    <Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
                                        Verifying...
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-interactive-primary-foreground text-lg font-montserrat-bold text-center">
                                    Verify Code
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Countdown Timer and Resend */}
                        {!canResend && (
                            <View className="mb-4 items-center">
                                <Text className="text-text-muted font-montserrat text-sm text-center">
                                    Resend code in {formatTime(countdown)}
                                </Text>
                            </View>
                        )}

                        {/* Resend OTP */}
                        <View className="flex-row justify-center items-center mb-6">
                            <Text className="text-text-muted font-montserrat text-base">
                                Didn&apos;t receive the code? 
                            </Text>
                            <TouchableOpacity
                                onPress={handleResendOTP}
                                disabled={!canResend || resendOTPMutation.isPending}
                                className="ml-1"
                                activeOpacity={0.8}
                            >
                                <Text className={`font-montserrat-bold text-base ${
                                    canResend && !resendOTPMutation.isPending 
                                        ? 'text-interactive-primary' 
                                        : 'text-text-disabled'
                                }`}>
                                    {resendOTPMutation.isPending ? 'Sending...' : 'Resend'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Back to Register Link */}
                        <View className="flex-row justify-center items-center">
                            <Text className="text-text-muted font-montserrat text-base">
                                Wrong email? 
                            </Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    await SecureStore.deleteItemAsync(REGISTRATION_EMAIL_KEY);
                                    await SecureStore.deleteItemAsync(REGISTRATION_PASSWORD_KEY);
                                    router.replace('/(auth)/register');
                                }}
                                className="ml-1"
                                activeOpacity={0.8}
                            >
                                <Text className="text-interactive-primary font-montserrat-bold text-base">
                                    Go back
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View className="mt-8 items-center">
                        <Text className="text-text-inverse/80 font-montserrat text-sm text-center">
                            Check your email and spam folder{'\n'}for the verification code
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
        <StyledAlert
            visible={alertConfig.visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            onDismiss={hideAlert}
        />
        </>
    );
}