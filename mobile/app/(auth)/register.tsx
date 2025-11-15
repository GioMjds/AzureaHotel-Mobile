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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { auth } from '@/services/UserAuth';
import * as SecureStore from 'expo-secure-store';
import useAlertStore from '@/store/AlertStore';
import StyledAlert from '@/components/ui/StyledAlert';
import TermsModal from '@/components/TermsModal';
import { useGoogleOAuth } from '@/hooks/useGoogleOAuth';

const REGISTRATION_EMAIL_KEY = 'registration_email';
const REGISTRATION_PASSWORD_KEY = 'registration_password';
const REGISTRATION_FIRST_NAME_KEY = 'registration_first_name';
const REGISTRATION_LAST_NAME_KEY = 'registration_last_name';

interface RegisterFormData {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	confirmPassword: string;
}

export default function RegisterScreen() {
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
	const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
	const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
	const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(false);

	const { handleGoogleSignIn, isLoading: isGoogleLoading } = useGoogleOAuth();
	const { alertConfig, setAlertConfig } = useAlertStore();

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[];
	}) => {
		setAlertConfig({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK' }],
		});
	};

	const handleGoogleSignUpPress = async () => {
		setGoogleAuthError(null);
		const result = await handleGoogleSignIn();
		
		// Handle new Google users requiring OTP verification
		if (result.requiresVerification && result.email && result.password) {
			try {
				// Store registration data for OTP verification
				await SecureStore.setItemAsync(REGISTRATION_EMAIL_KEY, result.email);
				await SecureStore.setItemAsync(REGISTRATION_PASSWORD_KEY, result.password);
				
				// Navigate to verify screen
				showStyledAlert({
					title: 'Verification Required',
					message: result.message || 'Please verify your email with the OTP sent to your inbox.',
					type: 'info',
					buttons: [
						{
							text: 'OK',
							onPress: () => router.push('/(auth)/verify'),
						},
					],
				});
			} catch (error) {
				console.error('Failed to store Google auth data:', error);
				setGoogleAuthError('Failed to process Google sign-up. Please try again.');
			}
			return;
		}
		
		// Handle existing Google users (successful authentication)
		if (result.success) {
			router.replace('/(screens)');
			return;
		}
		
		// Handle errors (but not cancellation)
		if (!result.success && result.error && !result.cancelled) {
			setGoogleAuthError(result.error);
		}
	};

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		watch,
	} = useForm<RegisterFormData>({
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			confirmPassword: '',
		},
		mode: 'onChange',
	});

	const watchPassword = watch('password');
	const watchAllFields = watch();

	const sendRegisterOTPMutation = useMutation({
		mutationFn: ({
			firstName,
			lastName,
			email,
			password,
			confirmPassword,
		}: RegisterFormData) =>
			auth.sendRegisterOtp(
				firstName,
				lastName,
				email,
				password,
				confirmPassword
			),
		onSuccess: async (data, variables) => {
			await SecureStore.setItemAsync(
				REGISTRATION_EMAIL_KEY,
				variables.email
			);
			await SecureStore.setItemAsync(
				REGISTRATION_PASSWORD_KEY,
				variables.password
			);

			if (variables.firstName) {
				await SecureStore.setItemAsync(
					REGISTRATION_FIRST_NAME_KEY,
					variables.firstName
				);
			}
			if (variables.lastName) {
				await SecureStore.setItemAsync(
					REGISTRATION_LAST_NAME_KEY,
					variables.lastName
				);
			}

			showStyledAlert({
				title: 'Success!',
				message: 'OTP sent to your email. Please check your inbox.',
				type: 'success',
				buttons: [
					{
						text: 'OK',
						onPress: () => router.push('/(auth)/verify'),
					},
				],
			});
		},
		onError: (error: any) => {
			const errorMessage = error?.message;
			showStyledAlert({
				title: 'Registration Failed',
				message: errorMessage,
				type: 'error',
			});
		},
	});

	// Check if all fields are filled
	const areAllFieldsFilled = 
		watchAllFields.firstName?.trim() !== '' &&
		watchAllFields.lastName?.trim() !== '' &&
		watchAllFields.email?.trim() !== '' &&
		watchAllFields.password?.trim() !== '' &&
		watchAllFields.confirmPassword?.trim() !== '';

	// Check if button should be disabled
	const isButtonDisabled = 
		!areAllFieldsFilled || 
		!hasAgreedToTerms || 
		!isValid ||
		sendRegisterOTPMutation.isPending || 
		isGoogleLoading;

	const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
		// Check if user has agreed to terms
		if (!hasAgreedToTerms) {
			showStyledAlert({
				title: 'Terms Required',
				message: 'Please read and agree to the Terms and Conditions before registering.',
				type: 'warning',
			});
			return;
		}

		await sendRegisterOTPMutation.mutateAsync({
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			password: data.password,
			confirmPassword: data.confirmPassword,
		});
	};

	const togglePasswordVisibility = () => setShowPassword(!showPassword);
	const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

	return (
		<>
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
						<View className="w-full max-w-md bg-surface-default/95 backdrop-blur-xl rounded-3xl p-8 self-center">
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
									Create your account to start booking luxury
									accommodations
								</Text>
							</View>

							{/* Google Auth Error */}
							{googleAuthError && (
								<View className="mb-6 bg-feedback-error-light border border-feedback-error-DEFAULT rounded-xl p-4">
									<View className="flex-row items-center">
										<FontAwesome
											name="exclamation-circle"
											size={20}
											color="#DC2626"
										/>
										<Text className="text-feedback-error-dark font-montserrat-bold text-sm ml-2 flex-1">
											{googleAuthError}
										</Text>
									</View>
								</View>
							)}
							<TouchableOpacity
								className={`border-2 border-interactive-primary rounded-2xl p-4 mb-4 flex-row items-center justify-center ${isGoogleLoading ? 'opacity-70' : ''}`}
								onPress={handleGoogleSignUpPress}
								disabled={
									isGoogleLoading ||
									sendRegisterOTPMutation.isPending
								}
								activeOpacity={0.8}
							>
								{isGoogleLoading ? (
									<>
										<ActivityIndicator
											size="small"
											color="#6F00FF"
										/>
										<Text className="text-interactive-primary font-montserrat-bold text-base ml-2">
											Signing up with Google...
										</Text>
									</>
								) : (
									<>
										<FontAwesome
											name="google"
											size={20}
											color="#6F00FF"
										/>
										<Text className="text-interactive-primary font-montserrat-bold text-base ml-3">
											Sign Up with Google
										</Text>
									</>
								)}
							</TouchableOpacity>

							{/* Divider */}
							<View className="flex-row items-center mb-4">
								<View className="flex-1 h-px bg-border-subtle" />
								<Text className="text-text-muted font-montserrat text-sm px-3">
									OR
								</Text>
								<View className="flex-1 h-px bg-border-subtle" />
							</View>
							<View className="mb-4">
								<View className="flex-row">
									<View className="flex-1 mx-1">
										<Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
											First Name
										</Text>
										<Controller
											control={control}
											name="firstName"
											rules={{
												required:
													'First name is required',
											}}
											render={({
												field: {
													onChange,
													onBlur,
													value,
												},
											}) => (
												<TextInput
													className={`bg-input-background border-2 ${errors.firstName ? 'border-input-border-error' : 'border-input-border-focus'} rounded-2xl p-4 text-input-text font-montserrat text-lg`}
													placeholder="First name"
													placeholderTextColor="#E9B3FB"
													value={value}
													onChangeText={onChange}
													onBlur={onBlur}
												/>
											)}
										/>
										{errors.firstName && (
											<View className="flex-row items-center mt-2 ml-1">
												<FontAwesome
													name="exclamation-circle"
													size={16}
													color="#EF4444"
												/>
												<Text className="text-feedback-error-dark font-raleway text-sm ml-2">
													{
														errors.firstName
															?.message as string
													}
												</Text>
											</View>
										)}
									</View>

									<View className="flex-1 mx-1">
										<Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
											Last Name
										</Text>
										<Controller
											control={control}
											name="lastName"
											rules={{
												required:
													'Last name is required',
											}}
											render={({
												field: {
													onChange,
													onBlur,
													value,
												},
											}) => (
												<TextInput
													className={`bg-input-background border-2 ${errors.lastName ? 'border-input-border-error' : 'border-input-border-focus'} rounded-2xl p-4 text-input-text font-montserrat text-lg`}
													placeholder="Last name"
													placeholderTextColor="#E9B3FB"
													value={value}
													onChangeText={onChange}
													onBlur={onBlur}
												/>
											)}
										/>
										{errors.lastName && (
											<View className="flex-row items-center mt-2 ml-1">
												<FontAwesome
													name="exclamation-circle"
													size={16}
													color="#EF4444"
												/>
												<Text className="text-feedback-error-dark font-raleway text-sm ml-2">
													{
														errors.lastName
															?.message as string
													}
												</Text>
											</View>
										)}
									</View>
								</View>
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
											message:
												'Please enter a valid email address',
										},
									}}
									render={({
										field: { onChange, onBlur, value },
									}) => (
										<View className="relative">
											<TextInput
												className={`bg-input-background border-2 ${errors.email ? 'border-input-border-error' : 'border-input-border-focus'} rounded-2xl p-4 pl-12 text-input-text font-montserrat text-lg`}
												placeholder="Enter your email"
												placeholderTextColor="#E9B3FB"
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
												keyboardType="email-address"
												autoCapitalize="none"
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
												message:
													'Password must be at least 8 characters',
											},
										}}
										render={({
											field: { onChange, onBlur, value },
										}) => (
											<TextInput
												className={`bg-input-background border-2 ${errors.password ? 'border-input-border-error' : 'border-input-border-focus'} rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
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
									>
										<FontAwesome
											name={
												showPassword
													? 'eye-slash'
													: 'eye'
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
											required:
												'Please confirm your password',
											validate: (value) =>
												value === watchPassword ||
												'Passwords do not match',
										}}
										render={({
											field: { onChange, onBlur, value },
										}) => (
											<TextInput
												className={`bg-input-background border-2 ${errors.confirmPassword ? 'border-input-border-error' : 'border-input-border-focus'} rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
												placeholder="Confirm your password"
												placeholderTextColor="#E9B3FB"
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
												secureTextEntry={
													!showConfirmPassword
												}
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
										onPress={
											toggleConfirmPasswordVisibility
										}
									>
										<FontAwesome
											name={
												showConfirmPassword
													? 'eye-slash'
													: 'eye'
											}
											size={20}
											color="#6F00FF"
										/>
									</TouchableOpacity>
								</View>
								{errors.confirmPassword && (
									<View className="flex-row items-center mt-2 ml-1">
										<FontAwesome
											name="exclamation-circle"
											size={16}
											color="#EF4444"
										/>
										<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
											{errors.confirmPassword.message}
										</Text>
									</View>
								)}
							</View>

							{/* Terms and Conditions Agreement */}
							<View className="mb-6">
								<TouchableOpacity
									onPress={() => setShowTermsModal(true)}
									className="flex-row items-start"
									activeOpacity={0.7}
								>
									<View
										className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 mt-0.5 ${
											hasAgreedToTerms
												? 'bg-brand-primary border-brand-primary'
												: 'border-border-focus bg-input-background'
										}`}
									>
										{hasAgreedToTerms && (
											<FontAwesome
												name="check"
												size={14}
												color="#FFF1F1"
											/>
										)}
									</View>
									<View className="flex-1">
										<Text className="text-sm font-montserrat text-text-primary leading-5">
											I agree to the{' '}
											<Text className="text-interactive-primary font-montserrat-bold underline">
												Terms and Conditions
											</Text>
										</Text>
										<Text className="text-xs font-montserrat text-text-muted mt-1">
											Tap to read the full terms
										</Text>
									</View>
								</TouchableOpacity>
							</View>

							{/* Register Button */}
							<TouchableOpacity
								className={`rounded-2xl p-4 mb-4 shadow-lg ${
									isButtonDisabled 
										? 'bg-interactive-primary-disabled opacity-50' 
										: 'bg-interactive-primary'
								}`}
								onPress={handleSubmit(onSubmit)}
								disabled={isButtonDisabled}
								activeOpacity={0.8}
							>
								{sendRegisterOTPMutation.isPending ? (
									<View className="flex-row items-center justify-center">
										<ActivityIndicator
											size="small"
											color="#FFF1F1"
										/>
										<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
											Creating Account...
										</Text>
									</View>
								) : (
									<Text className={`text-lg font-montserrat-bold text-center ${
										isButtonDisabled 
											? 'text-text-disabled' 
											: 'text-interactive-primary-foreground'
									}`}>
										Create Account
									</Text>
								)}
							</TouchableOpacity>
							<View className="flex-row justify-center items-center">
								<Text className="text-text-muted font-montserrat text-base">
									Already have an account?
								</Text>
								<TouchableOpacity
									onPress={() => router.push('/(auth)/login')}
									hitSlop={20}
									className="ml-1"
								>
									<Text className="text-interactive-primary font-montserrat-bold text-base">
										Login here
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>
				</SafeAreaView>
			</View>

			{/* Styled Alert */}
			<StyledAlert
				visible={alertConfig.visible}
				type={alertConfig.type}
				title={alertConfig.title}
				message={alertConfig.message}
				buttons={alertConfig.buttons}
				onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
			/>

			{/* Terms Modal */}
			<TermsModal
				isOpen={showTermsModal}
				onClose={() => setShowTermsModal(false)}
				onAgree={() => {
					setHasAgreedToTerms(true);
					setShowTermsModal(false);
				}}
			/>
		</>
	);
}
