import { useState } from 'react';
import {
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ActivityIndicator,
	Modal,
	ToastAndroid,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import useAlertStore from '@/store/AlertStore';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StyledAlert from '@/components/ui/StyledAlert';

interface EmailFormData {
	email: string;
}

interface OtpFormData {
	otp: string;
}

export default function ForgotPassScreen() {
	const [email, setEmail] = useState<string>('');
	const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
	const [resendTimer, setResendTimer] = useState<number>(0);
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

	const { forgotPasswordMutation, verifyResetOtpMutation } = useForgotPassword();

	const {
		control: emailControl,
		handleSubmit: handleEmailSubmit,
		formState: { errors: emailErrors },
	} = useForm<EmailFormData>({
		defaultValues: {
			email: '',
		},
		mode: 'onSubmit',
	});

	const {
		control: otpControl,
		handleSubmit: handleOtpSubmit,
		formState: { errors: otpErrors },
		reset: resetOtpForm,
	} = useForm<OtpFormData>({
		defaultValues: {
			otp: '',
		},
		mode: 'onSubmit',
	});

	// Start resend timer
	const startResendTimer = () => {
		setResendTimer(60);
		const interval = setInterval(() => {
			setResendTimer((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const onEmailSubmit: SubmitHandler<EmailFormData> = async (data) => {
		await forgotPasswordMutation.mutateAsync(data.email, {
			onSuccess: () => {
				setEmail(data.email);
				setShowOtpModal(true);
				startResendTimer();
				ToastAndroid.show('OTP sent to your email', ToastAndroid.SHORT);
			},
			onError: (error: any) => {
				const errorMessage = error?.response?.data?.error || error?.message || 'Failed to send reset OTP';
				showStyledAlert({ title: 'Error', message: errorMessage, type: 'error' });
			},
		});
	};

	const onOtpSubmit: SubmitHandler<OtpFormData> = async (data) => {
		await verifyResetOtpMutation.mutateAsync(
			{ email, otp: data.otp },
			{
				onSuccess: () => {
					setShowOtpModal(false);
					resetOtpForm();
					ToastAndroid.show('OTP verified successfully', ToastAndroid.SHORT);
					router.push('/(auth)/new-password');
				},
				onError: (error: any) => {
					const errorMessage = error?.response?.data?.error || error?.message || 'Invalid OTP';
					showStyledAlert({ title: 'Verification Failed', message: errorMessage, type: 'error' });
				},
			}
		);
	};

	const handleResendOtp = async () => {
		if (resendTimer > 0) return;

		await forgotPasswordMutation.mutateAsync(email, {
			onSuccess: () => {
				startResendTimer();
				ToastAndroid.show('OTP resent successfully', ToastAndroid.SHORT);
			},
			onError: (error: any) => {
				const errorMessage = error?.response?.data?.error || error?.message || 'Failed to resend OTP';
				showStyledAlert({ title: 'Error', message: errorMessage, type: 'error' });
			},
		});
	};

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
				<KeyboardAwareScrollView
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: 'center',
					}}
					showsVerticalScrollIndicator={false}
					enableOnAndroid={true}
					extraScrollHeight={20}
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
									Forgot Password
								</Text>
							</View>
						</View>

						{/* Illustration/Icon */}
						<View className="items-center mb-6">
							<View className="bg-brand-primary/10 rounded-full px-6 py-4 mb-4">
								<FontAwesome name="lock" size={48} color="#6F00FF" />
							</View>
							<Text className="text-text-secondary font-montserrat text-base text-center leading-6">
								Enter your email address and we&apos;ll send you a verification code
							</Text>
						</View>

						{/* Email Input */}
						<View className="mb-6">
							<Text className="text-text-primary font-montserrat-bold text-sm mb-2 ml-1">
								Email Address
							</Text>
							<Controller
								control={emailControl}
								name="email"
								rules={{
									required: 'Email is required',
									pattern: {
										value: /\S+@\S+\.\S+/,
										message: 'Please enter a valid email address',
									},
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<View className="relative">
										<TextInput
											className={`bg-input-background border-2 ${
												emailErrors.email
													? 'border-input-border-error'
													: 'border-input-border'
											} focus:border-input-border-focus rounded-2xl p-4 pl-12 text-input-text font-montserrat text-lg`}
											placeholder="Enter your email"
											placeholderTextColor="#E9B3FB"
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											keyboardType="email-address"
											autoCapitalize="none"
											editable={!forgotPasswordMutation.isPending}
										/>
										<View className="absolute left-4 top-1/2 transform -translate-y-1/2">
											<FontAwesome name="envelope" size={20} color="#6F00FF" />
										</View>
									</View>
								)}
							/>
							{emailErrors.email && (
								<View className="flex-row items-center mt-2 ml-1">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
										{emailErrors.email.message}
									</Text>
								</View>
							)}
						</View>

						{/* Send Code Button */}
						<TouchableOpacity
							className={`bg-interactive-primary rounded-2xl p-4 mb-4 shadow-lg ${
								forgotPasswordMutation.isPending ? 'opacity-70' : ''
							}`}
							onPress={handleEmailSubmit(onEmailSubmit)}
							disabled={forgotPasswordMutation.isPending}
							activeOpacity={0.8}
						>
							{forgotPasswordMutation.isPending ? (
								<View className="flex-row items-center justify-center">
									<ActivityIndicator size="small" color="#FFF1F1" />
									<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
										Sending Code...
									</Text>
								</View>
							) : (
								<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold text-center">
									Send Verification Code
								</Text>
							)}
						</TouchableOpacity>

						{/* Back to Login Link */}
						<View className="flex-row justify-center items-center">
							<Text className="text-text-muted font-montserrat text-base">
								Remember your password?
							</Text>
							<TouchableOpacity onPress={() => router.push('/(auth)/login')} className="ml-1">
								<Text className="text-interactive-primary font-montserrat-bold text-base">
									Login
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAwareScrollView>
			</SafeAreaView>

			{/* OTP Verification Modal */}
			<Modal
				visible={showOtpModal}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowOtpModal(false)}
			>
				<View className="flex-1 justify-center items-center bg-background-overlay">
					<View className="w-11/12 max-w-md bg-surface-default rounded-3xl p-8 shadow-2xl">
						{/* Modal Header */}
						<View className="items-center mb-6">
							<View className="bg-brand-primary/10 rounded-full p-4 mb-4">
								<FontAwesome name="envelope-open" size={40} color="#6F00FF" />
							</View>
							<Text className="text-2xl font-playfair-bold text-text-primary mb-2 text-center">
								Verify OTP
							</Text>
							<Text className="text-text-secondary font-montserrat text-base text-center leading-6">
								Enter the 6-digit code sent to{'\n'}
								<Text className="font-montserrat-bold">{email}</Text>
							</Text>
						</View>

						{/* OTP Input */}
						<View className="mb-6">
							<Controller
								control={otpControl}
								name="otp"
								rules={{
									required: 'OTP is required',
									pattern: {
										value: /^[0-9]{6}$/,
										message: 'OTP must be 6 digits',
									},
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<TextInput
										className={`bg-input-background border-2 ${
											otpErrors.otp ? 'border-input-border-error' : 'border-input-border'
										} focus:border-input-border-focus rounded-2xl p-4 text-input-text font-montserrat-bold text-2xl text-center tracking-widest`}
										placeholder="000000"
										placeholderTextColor="#E9B3FB"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										keyboardType="number-pad"
										maxLength={6}
										editable={!verifyResetOtpMutation.isPending}
									/>
								)}
							/>
							{otpErrors.otp && (
								<View className="flex-row items-center justify-center mt-2">
									<FontAwesome name="exclamation-circle" size={16} color="#EF4444" />
									<Text className="text-feedback-error-DEFAULT text-sm ml-2 font-montserrat">
										{otpErrors.otp.message}
									</Text>
								</View>
							)}
						</View>

						{/* Verify Button */}
						<TouchableOpacity
							className={`bg-interactive-primary rounded-2xl p-4 mb-4 shadow-lg ${
								verifyResetOtpMutation.isPending ? 'opacity-70' : ''
							}`}
							onPress={handleOtpSubmit(onOtpSubmit)}
							disabled={verifyResetOtpMutation.isPending}
							activeOpacity={0.8}
						>
							{verifyResetOtpMutation.isPending ? (
								<View className="flex-row items-center justify-center">
									<ActivityIndicator size="small" color="#FFF1F1" />
									<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold ml-2">
										Verifying...
									</Text>
								</View>
							) : (
								<Text className="text-interactive-primary-foreground text-lg font-montserrat-bold text-center">
									Verify OTP
								</Text>
							)}
						</TouchableOpacity>

						{/* Resend OTP */}
						<View className="items-center mb-4">
							<Text className="text-text-muted font-montserrat text-sm mb-2">
								Didn&apos;t receive the code?
							</Text>
							<TouchableOpacity
								onPress={handleResendOtp}
								disabled={resendTimer > 0 || forgotPasswordMutation.isPending}
								className={`${
									resendTimer > 0 || forgotPasswordMutation.isPending ? 'opacity-50' : ''
								}`}
							>
								<Text className="text-interactive-primary font-montserrat-bold text-base">
									{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Cancel Button */}
						<TouchableOpacity
							onPress={() => {
								setShowOtpModal(false);
								resetOtpForm();
							}}
							className="bg-interactive-secondary rounded-2xl p-4"
							activeOpacity={0.8}
						>
							<Text className="text-interactive-secondary-foreground text-lg font-montserrat-bold text-center">
								Cancel
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
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
