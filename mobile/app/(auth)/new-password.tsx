import React, { useState, useEffect } from 'react';
import {
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ScrollView,
	ActivityIndicator,
	ToastAndroid,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import useAlertStore from '@/store/AlertStore';
import StyledAlert from '@/components/ui/StyledAlert';

interface NewPasswordFormData {
	newPassword: string;
	confirmPassword: string;
}

export default function NewPasswordScreen() {
	const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
	const [email, setEmail] = useState<string>('');

	const { resetPasswordMutation, getStoredEmail } = useForgotPassword();

	const {
		control,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<NewPasswordFormData>({
		defaultValues: {
			newPassword: '',
			confirmPassword: '',
		},
		mode: 'onSubmit',
	});

	const watchNewPassword = watch('newPassword');
	const { alertConfig, setAlertConfig } = useAlertStore();

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

	// Load stored email on mount
	useEffect(() => {
		const loadEmail = async () => {
			const storedEmail = await getStoredEmail();
			if (!storedEmail) {
				showStyledAlert({
					title: 'Session Expired',
					message: 'Please start the password reset process again.',
					buttons: [
						{ text: 'OK', onPress: () => router.replace('/(auth)/forgot-pass') },
					],
					type: 'warning',
				});
			} else {
				setEmail(storedEmail);
			}
		};

		loadEmail();
	}, [getStoredEmail]);

	const onSubmit: SubmitHandler<NewPasswordFormData> = async (data) => {
			if (!email) {
				showStyledAlert({ title: 'Error', message: 'Email not found. Please restart the process.', type: 'error', buttons: [{ text: 'OK', onPress: () => router.replace('/(auth)/forgot-pass') }] });
				return;
			}

		await resetPasswordMutation.mutateAsync(
			{
				email,
				newPassword: data.newPassword,
				confirmNewPassword: data.confirmPassword,
			},
			{
				onSuccess: () => {
					ToastAndroid.show('Password reset successfully', ToastAndroid.LONG);
					showStyledAlert({
						title: 'Success',
						message: 'Your password has been reset successfully. Please login with your new password.',
						buttons: [
							{ text: 'Login', onPress: () => router.replace('/(auth)/login') },
						],
						type: 'success',
					});
				},
				onError: (error: any) => {
					const errorMessage =
						error?.response?.data?.error ||
						error?.message ||
						'Failed to reset password';
					showStyledAlert({ title: 'Error', message: errorMessage, type: 'error' });
				},
			}
		);
	};

	const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
	const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

	return (
		<>
		<View className="flex-1 bg-background-default">
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
					{/* Main Card */}
					<View className="w-full max-w-md bg-surface-default/95 backdrop-blur-xl rounded-3xl p-8 self-center shadow-2xl border border-border-subtle">
						{/* Header with Back Button */}
						<View className="flex-row items-center mb-6">
							<TouchableOpacity
								onPress={() => router.back()}
								className="mr-4 p-2 rounded-full bg-background-subtle"
							>
								<Ionicons name="arrow-back" size={24} color="#3B0270" />
							</TouchableOpacity>
							<View className="flex-1">
								<Text className="text-2xl font-playfair-bold text-text-primary">
									Reset Password
								</Text>
							</View>
						</View>

						{/* Illustration/Icon */}
						<View className="items-center mb-6">
							<View className="bg-brand-primary/10 rounded-full p-6 mb-4">
								<FontAwesome name="key" size={48} color="#6F00FF" />
							</View>
							<Text className="text-text-secondary font-montserrat text-base text-center leading-6">
								Create a strong password for your account
							</Text>
						</View>

						{/* New Password Input */}
						<View className="mb-6">
							<Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
								New Password
							</Text>
							<View className="relative">
								<Controller
									control={control}
									name="newPassword"
									rules={{
										required: 'New password is required',
										minLength: {
											value: 8,
											message: 'Password must be at least 8 characters',
										},
										pattern: {
											value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
											message: 'Password must include uppercase, lowercase, and number',
										},
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											className={`bg-input-background border-2 ${
												errors.newPassword
													? 'border-input-border-error'
													: 'border-input-border'
											} focus:border-input-border-focus rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
											placeholder="Enter new password"
											placeholderTextColor="#E9B3FB"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showNewPassword}
											editable={!resetPasswordMutation.isPending}
										/>
									)}
								/>
								<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
									<FontAwesome name="lock" size={20} color="#6F00FF" />
								</View>
								<TouchableOpacity
									className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2"
									onPress={toggleNewPasswordVisibility}
								>
									<FontAwesome
										name={showNewPassword ? 'eye-slash' : 'eye'}
										size={20}
										color="#6F00FF"
									/>
								</TouchableOpacity>
							</View>
							{errors.newPassword && (
								<View className="flex-row items-center mt-2 ml-1">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
										{errors.newPassword.message}
									</Text>
								</View>
							)}
							{/* Password Requirements */}
							<View className="mt-3 ml-1">
								<Text className="text-text-muted font-montserrat text-xs mb-1">
									Password must contain:
								</Text>
								<View className="flex-row items-center mb-1">
									<View
										className={`w-2 h-2 rounded-full mr-2 ${
											watchNewPassword?.length >= 8
												? 'bg-feedback-success-DEFAULT'
												: 'bg-neutral-300'
										}`}
									/>
									<Text className="text-text-muted font-montserrat text-xs">
										At least 8 characters
									</Text>
								</View>
								<View className="flex-row items-center mb-1">
									<View
										className={`w-2 h-2 rounded-full mr-2 ${
											/(?=.*[A-Z])/.test(watchNewPassword || '')
												? 'bg-feedback-success-DEFAULT'
												: 'bg-neutral-300'
										}`}
									/>
									<Text className="text-text-muted font-montserrat text-xs">
										One uppercase letter
									</Text>
								</View>
								<View className="flex-row items-center mb-1">
									<View
										className={`w-2 h-2 rounded-full mr-2 ${
											/(?=.*[a-z])/.test(watchNewPassword || '')
												? 'bg-feedback-success-DEFAULT'
												: 'bg-neutral-300'
										}`}
									/>
									<Text className="text-text-muted font-montserrat text-xs">
										One lowercase letter
									</Text>
								</View>
								<View className="flex-row items-center">
									<View
										className={`w-2 h-2 rounded-full mr-2 ${
											/(?=.*\d)/.test(watchNewPassword || '')
												? 'bg-feedback-success-DEFAULT'
												: 'bg-neutral-300'
										}`}
									/>
									<Text className="text-text-muted font-montserrat text-xs">
										One number
									</Text>
								</View>
							</View>
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
											value === watchNewPassword || 'Passwords do not match',
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											className={`bg-input-background border-2 ${
												errors.confirmPassword
													? 'border-input-border-error'
													: 'border-input-border'
											} focus:border-input-border-focus rounded-2xl p-4 pl-12 pr-14 text-input-text font-montserrat text-lg`}
											placeholder="Confirm new password"
											placeholderTextColor="#E9B3FB"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											secureTextEntry={!showConfirmPassword}
											editable={!resetPasswordMutation.isPending}
										/>
									)}
								/>
								<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
									<FontAwesome name="lock" size={20} color="#6F00FF" />
								</View>
								<TouchableOpacity
									className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2"
									onPress={toggleConfirmPasswordVisibility}
								>
									<FontAwesome
										name={showConfirmPassword ? 'eye-slash' : 'eye'}
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

						{/* Reset Password Button */}
						<TouchableOpacity
							className={`bg-interactive-primary rounded-2xl p-4 mb-4 shadow-lg ${
								resetPasswordMutation.isPending ? 'opacity-70' : ''
							}`}
							onPress={handleSubmit(onSubmit)}
							disabled={resetPasswordMutation.isPending}
							activeOpacity={0.8}
						>
							{resetPasswordMutation.isPending ? (
								<View className="flex-row items-center justify-center">
									<ActivityIndicator size="small" color="#FFF1F1" />
									<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
										Resetting Password...
									</Text>
								</View>
							) : (
								<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold text-center">
									Reset Password
								</Text>
							)}
						</TouchableOpacity>

						{/* Cancel Link */}
						<View className="flex-row justify-center items-center">
							<TouchableOpacity
								onPress={() => router.replace('/(auth)/login')}
								className="ml-1"
							>
								<Text className="text-text-muted font-montserrat text-base">
									Cancel and return to{' '}
									<Text className="text-interactive-primary font-montserrat-bold">
										Login
									</Text>
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
		</>
	);
}