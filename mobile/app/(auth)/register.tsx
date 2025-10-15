import { useState } from 'react';
import {
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Alert,
	Image,
	ScrollView,
	ActivityIndicator,
    ToastAndroid,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { auth } from '@/services/UserAuth';
import * as SecureStore from 'expo-secure-store';

const REGISTRATION_EMAIL_KEY = 'registration_email';
const REGISTRATION_PASSWORD_KEY = 'registration_password';

interface RegisterFormData {
	email: string;
	password: string;
	confirmPassword: string;
}

export default function RegisterScreen() {
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<RegisterFormData>({
		defaultValues: {
			email: '',
			password: '',
			confirmPassword: '',
		},
		mode: 'onSubmit',
	});

	const watchPassword = watch('password');

	const sendRegisterOTPMutation = useMutation({
		mutationFn: ({
			email,
			password,
			confirmPassword,
		}: {
			email: string;
			password: string;
			confirmPassword: string;
		}) => auth.sendRegisterOtp(email, password, confirmPassword),
		onSuccess: async (data, variables) => {
            await SecureStore.setItemAsync(REGISTRATION_EMAIL_KEY, variables.email);
            await SecureStore.setItemAsync(REGISTRATION_PASSWORD_KEY, variables.password);

            ToastAndroid.show('OTP sent to your email.', ToastAndroid.SHORT);
            router.push('/(auth)/verify');
		},
		onError: (error: any) => {
			const errorMessage = error?.message || 'An unexpected error occurred during registration';
			Alert.alert('Registration Failed', errorMessage);
		},
	});

	const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
		await sendRegisterOTPMutation.mutateAsync({
			email: data.email,
			password: data.password,
			confirmPassword: data.confirmPassword,
		});
	};

	const togglePasswordVisibility = () => setShowPassword(!showPassword);
	const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

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
					{/* Main Registration Card */}
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
								Create your account to start booking luxury accommodations
							</Text>
						</View>

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
										message: 'Please enter a valid email address'
									}
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
										/>
										<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
											<FontAwesome name="envelope" size={20} color="#6F00FF" />
										</View>
									</View>
								)}
							/>
							{errors.email && (
								<View className="flex-row items-center mt-2 ml-1">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
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
											value: 8,
											message: 'Password must be at least 8 characters'
										}
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
										/>
									)}
								/>
								<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
									<FontAwesome 
										name="lock"
										pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }} 
										size={20} 
										color="#6F00FF"
									/>
								</View>
								<TouchableOpacity
									className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2"
									onPress={togglePasswordVisibility}
								>
									<FontAwesome
										name={showPassword ? "eye-slash" : "eye"}
										size={20}
										color="#6F00FF"
									/>
								</TouchableOpacity>
							</View>
							{errors.password && (
								<View className="flex-row items-center mt-2 ml-1">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
										{errors.password.message}
									</Text>
								</View>
							)}
						</View>

						{/* Confirm Password Input */}
						<View className="mb-6">
							<Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
								Confirm Password
							</Text>
							<View className="relative">
								<Controller
									control={control}
									name="confirmPassword"
									rules={{
										required: 'Please confirm your password',
										validate: (value) =>
											value === watchPassword || 'Passwords do not match',
									}}
									render={({
										field: { onChange, onBlur, value },
									}) => (
										<TextInput
											className={`bg-input-background border-2 ${errors.confirmPassword ? 'border-input-border-error' : 'border-input-border'} focus:border-input-border-focus rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
											placeholder="Confirm your password"
											placeholderTextColor="#E9B3FB"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showConfirmPassword}
										/>
									)}
								/>
								<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
									<FontAwesome 
										name="lock"
										pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }} 
										size={20} 
										color="#6F00FF"
									/>
								</View>
								<TouchableOpacity
									className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2"
									onPress={toggleConfirmPasswordVisibility}
								>
									<FontAwesome
										name={showConfirmPassword ? "eye-slash" : "eye"}
										size={20}
										color="#6F00FF"
									/>
								</TouchableOpacity>
							</View>
							{errors.confirmPassword && (
								<View className="flex-row items-center mt-2 ml-1">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
										{errors.confirmPassword.message}
									</Text>
								</View>
							)}
						</View>

						{/* Register Button */}
						<TouchableOpacity
							className={`bg-interactive-primary rounded-2xl p-4 mb-4 shadow-lg ${sendRegisterOTPMutation.isPending ? 'opacity-70' : ''}`}
							onPress={handleSubmit(onSubmit)}
							disabled={sendRegisterOTPMutation.isPending}
							activeOpacity={0.8}
						>
							{sendRegisterOTPMutation.isPending ? (
								<View className="flex-row items-center justify-center">
									<ActivityIndicator size="small" color="#FFF1F1" />
									<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
										Creating Account...
									</Text>
								</View>
							) : (
								<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold text-center">
									Create Account
								</Text>
							)}
						</TouchableOpacity>

						{/* Login Link */}
						<View className="flex-row justify-center items-center">
							<Text className="text-text-muted font-montserrat text-base">
								Already have an account? 
							</Text>
							<TouchableOpacity
								onPress={() => router.push('/(auth)/login')}
								className="ml-1"
							>
								<Text className="text-interactive-primary font-montserrat-bold text-base">
									Login here
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Footer */}
					<View className="mt-8 items-center">
						<Text className="text-text-inverse/80 font-montserrat text-sm text-center">
							By creating an account, you agree to our Terms of Service{'\n'}and Privacy Policy
						</Text>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}