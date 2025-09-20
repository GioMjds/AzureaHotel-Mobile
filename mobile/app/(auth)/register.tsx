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
		formState: { errors, isSubmitting },
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
							Create Your Account
						</Text>
						<Text className="text-gray-600 text-center text-lg mb-6">
							Register to start booking with Azurea Hotel!
						</Text>

						{/* Email Field */}
						<View className="mb-5">
							<Controller
								control={control}
								name="email"
								rules={{
									required: 'Email is required',
									pattern: {
										value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
										message: 'Please enter a valid email address',
									},
								}}
								render={({
									field: { onChange, onBlur, value },
								}) => (
									<TextInput
										className="bg-white/50 border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-xl"
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
								<Text className="text-red-500 mt-2">
									{errors.email.message}
								</Text>
							)}
						</View>

						{/* Password Field */}
						<View className="mb-5">
							<View className="relative">
								<Controller
									control={control}
									name="password"
									rules={{
										required: 'Password is required',
										minLength: {
											value: 8,
											message: 'Password must be at least 8 characters',
										},
									}}
									render={({
										field: { onChange, onBlur, value },
									}) => (
										<TextInput
											className="bg-white/50 border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-xl pr-12"
											placeholder="Password"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showPassword}
										/>
									)}
								/>
								<TouchableOpacity
									className="absolute right-3 top-2 p-2"
									onPress={togglePasswordVisibility}
								>
									{showPassword ? (
										<FontAwesome
											name="eye-slash"
											size={24}
											color="black"
										/>
									) : (
										<FontAwesome
											name="eye"
											size={24}
											color="black"
										/>
									)}
								</TouchableOpacity>
							</View>
							{errors.password && (
								<Text className="text-red-500 mt-2">
									{errors.password.message}
								</Text>
							)}
						</View>

						{/* Confirm Password Field */}
						<View className="mb-5">
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
											className="bg-white/50 border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-xl pr-12"
											placeholder="Confirm Password"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showConfirmPassword}
										/>
									)}
								/>
								<TouchableOpacity
									className="absolute right-3 top-2 p-2"
									onPress={toggleConfirmPasswordVisibility}
								>
									{showConfirmPassword ? (
										<FontAwesome
											name="eye-slash"
											size={24}
											color="black"
										/>
									) : (
										<FontAwesome
											name="eye"
											size={24}
											color="black"
										/>
									)}
								</TouchableOpacity>
							</View>
							{errors.confirmPassword && (
								<Text className="text-red-500 mt-2">
									{errors.confirmPassword.message}
								</Text>
							)}
						</View>

						{/* Register Button */}
						<TouchableOpacity
							className={`bg-violet-600 rounded-xl p-3 mb-3 ${
								isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
							}`}
							onPress={handleSubmit(onSubmit)}
							disabled={isSubmitting}
						>
							<Text className="text-white text-2xl uppercase text-center font-semibold">
								{isSubmitting ? (
									<View className="flex-row items-center justify-center">
										<ActivityIndicator color="#fff" />
										<Text className="ml-2">Creating Account...</Text>
									</View>
								) : (
									'Register'
								)}
							</Text>
						</TouchableOpacity>

						{/* Divider */}
						<View className="flex-row items-center mb-3">
							<View className="flex-1 h-px bg-violet-600" />
							<Text className="mx-4 text-lg text-gray-600">OR</Text>
							<View className="flex-1 h-px bg-violet-600" />
						</View>

						{/* Google Register Button */}
						<TouchableOpacity
							className="border border-violet-500 rounded-xl p-4 mb-6 flex-row justify-center items-center"
							onPress={() => {
								Alert.alert('Info', 'Google registration coming soon!');
							}}
						>
							<FontAwesome
								name="google"
								size={24}
								color="#7c3aed"
								className="mr-2"
							/>
							<Text className="text-gray-800 text-lg font-medium">
								Register with Google
							</Text>
						</TouchableOpacity>

						{/* Login Link */}
						<View className="flex-row justify-center">
							<Text className="text-gray-600">
								Already have an account?{' '}
							</Text>
							<TouchableOpacity
								onPress={() => router.push('/(auth)/login')}
							>
								<Text className="text-violet-600 font-semibold">
									Login here
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}