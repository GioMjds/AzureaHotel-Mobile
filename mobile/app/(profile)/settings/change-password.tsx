import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import StyledText from '@/components/ui/StyledText';
import StyledModal from '@/components/ui/StyledModal';
import { auth } from '@/services/UserAuth';

type Step = 'verify-old' | 'set-new';

interface OldPasswordForm {
	oldPassword: string;
}

interface NewPasswordForm {
	newPassword: string;
	confirmNewPassword: string;
}

export default function ChangePassword() {
	const [currentStep, setCurrentStep] = useState<Step>('verify-old');
	const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
	const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
	const [modalVisible, setModalVisible] = useState<boolean>(false);
	const [modalConfig, setModalConfig] = useState({
		title: '',
		message: '',
		icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
		iconColor: '#10B981',
	});

	const {
		control: oldPasswordControl,
		handleSubmit: handleOldPasswordSubmit,
        setError: setOldPasswordError,
		formState: { errors: oldPasswordErrors },
	} = useForm<OldPasswordForm>({
        mode: 'onSubmit',
		defaultValues: { oldPassword: '' },
	});

	const {
		control: newPasswordControl,
		handleSubmit: handleNewPasswordSubmit,
		formState: { errors: newPasswordErrors },
		watch,
	} = useForm<NewPasswordForm>({
		defaultValues: { newPassword: '', confirmNewPassword: '' },
	});

	const newPasswordValue = watch('newPassword');

	const checkOldPasswordMutation = useMutation({
		mutationFn: (oldPassword: string) => auth.checkOldPassword(oldPassword),
		onSuccess: () => {
			setCurrentStep('set-new');
		},
		onError: (error: any) => {
			setOldPasswordError('oldPassword', {
                type: 'manual',
                message: error.message,
            });
		},
	});

	// Mutation for changing password
	const changePasswordMutation = useMutation({
		mutationFn: ({ newPassword, confirmNewPassword }: NewPasswordForm) =>
			auth.changeNewPassword(newPassword, confirmNewPassword),
		onSuccess: () => {
			setModalConfig({
				title: 'Success!',
				message: 'Your password has been changed successfully.',
				icon: 'checkmark-circle',
				iconColor: '#10B981',
			});
			setModalVisible(true);
		},
		onError: (error: any) => {
			setModalConfig({
				title: 'Error',
				message: error.response?.data?.message || 'Failed to change password. Please try again.',
				icon: 'close-circle',
				iconColor: '#EF4444',
			});
			setModalVisible(true);
		},
	});

	const onVerifyOldPassword = (data: OldPasswordForm) => {
		checkOldPasswordMutation.mutate(data.oldPassword);
	};

	const onSubmitNewPassword = (data: NewPasswordForm) => {
		changePasswordMutation.mutate(data);
	};

	const handleModalClose = () => {
		setModalVisible(false);
		if (changePasswordMutation.isSuccess) {
			router.back();
		}
	};

	const passwordRequirements = [
		{ text: 'At least 8 characters', met: newPasswordValue?.length >= 8 },
		{ text: 'Contains uppercase letter', met: /[A-Z]/.test(newPasswordValue || '') },
		{ text: 'Contains lowercase letter', met: /[a-z]/.test(newPasswordValue || '') },
		{ text: 'Contains number', met: /\d/.test(newPasswordValue || '') },
	];

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
				{/* Header */}
				<View className="px-6 pt-6 pb-8">
					<TouchableOpacity
						onPress={() => router.back()}
						className="mb-6 self-start"
						activeOpacity={0.7}
					>
						<Ionicons name="arrow-back" size={28} color="#3B0270" />
					</TouchableOpacity>

					<StyledText variant="playfair-bold" className="text-text-primary text-5xl mb-3">
						Change Password
					</StyledText>
					<StyledText variant="montserrat-regular" className="text-text-secondary text-lg">
						{currentStep === 'verify-old'
							? 'First, enter your current password'
							: 'Enter your new password'}
					</StyledText>
				</View>

				{/* Progress Indicator */}
				<View className="px-6 mb-8">
					<View className="flex-row items-center">
						<View
							className={`h-2 flex-1 rounded-full ${
								currentStep === 'verify-old' ? 'bg-brand-primary' : 'bg-brand-primary'
							}`}
						/>
						<View className="w-4" />
						<View
							className={`h-2 flex-1 rounded-full ${
								currentStep === 'set-new' ? 'bg-brand-primary' : 'bg-border-subtle'
							}`}
						/>
					</View>
					<View className="flex-row justify-between mt-2">
						<StyledText
							variant="montserrat-regular"
							className={`text-sm ${
								currentStep === 'verify-old' ? 'text-brand-primary' : 'text-text-muted'
							}`}
						>
							Check Current Password
						</StyledText>
						<StyledText
							variant="montserrat-regular"
							className={`text-sm ${
								currentStep === 'set-new' ? 'text-brand-primary' : 'text-text-muted'
							}`}
						>
							New Password
						</StyledText>
					</View>
				</View>

				<View className="px-6">
					{/* Step 1: Verify Old Password */}
					{currentStep === 'verify-old' && (
						<View>
							<View className="mb-6">
								<StyledText variant="montserrat-bold" className="text-text-primary text-lg mb-2">
									Current Password
								</StyledText>
								<Controller
									control={oldPasswordControl}
									name="oldPassword"
									rules={{
										required: 'Current password is required',
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<View className="relative">
											<TextInput
												className="bg-input-background border-2 border-input-border rounded-xl px-4 py-4 text-input-text text-lg pr-14"
												style={{ fontFamily: 'Montserrat_400Regular' }}
												placeholder="Enter current password"
												placeholderTextColor="#E9B3FB"
												secureTextEntry={!showOldPassword}
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
											/>
											<TouchableOpacity
												onPress={() => setShowOldPassword(!showOldPassword)}
												className="absolute right-4 top-4"
												activeOpacity={0.7}
											>
												<Ionicons
													name={showOldPassword ? 'eye-off' : 'eye'}
													size={24}
													color="#6F00FF"
												/>
											</TouchableOpacity>
										</View>
									)}
								/>
								{oldPasswordErrors.oldPassword && (
									<View className="flex-row items-center mt-2">
										<Ionicons name="alert-circle" size={16} color="#EF4444" />
										<StyledText
											variant="montserrat-regular"
											className="text-feedback-error-DEFAULT text-sm ml-1"
										>
											{oldPasswordErrors.oldPassword.message}
										</StyledText>
									</View>
								)}
							</View>

							<TouchableOpacity
								onPress={handleOldPasswordSubmit(onVerifyOldPassword)}
								disabled={checkOldPasswordMutation.isPending}
								className="bg-interactive-primary rounded-xl py-4 active:opacity-80 disabled:opacity-50"
							>
								{checkOldPasswordMutation.isPending ? (
									<ActivityIndicator color="#FFF1F1" />
								) : (
									<StyledText
										variant="montserrat-bold"
										className="text-interactive-primary-foreground text-center text-xl"
									>
										Verify Password
									</StyledText>
								)}
							</TouchableOpacity>
						</View>
					)}

					{/* Step 2: Set New Password */}
					{currentStep === 'set-new' && (
						<View>
							{/* New Password Input */}
							<View className="mb-6">
								<StyledText variant="montserrat-bold" className="text-text-primary text-lg mb-2">
									New Password
								</StyledText>
								<Controller
									control={newPasswordControl}
									name="newPassword"
									rules={{
										required: 'New password is required',
										minLength: {
											value: 8,
											message: 'Password must be at least 8 characters',
										},
										pattern: {
											value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
											message: 'Password must contain uppercase, lowercase, and number',
										},
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<View className="relative">
											<TextInput
												className="bg-input-background border-2 border-border-focus font-montserrat rounded-xl px-4 py-4 text-input-text text-lg pr-14"
												placeholder="Enter new password"
												placeholderTextColor="#E9B3FB"
												secureTextEntry={!showNewPassword}
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
											/>
											<TouchableOpacity
												onPress={() => setShowNewPassword(!showNewPassword)}
												className="absolute right-4 top-4"
												activeOpacity={0.7}
											>
												<Ionicons
													name={showNewPassword ? 'eye-off' : 'eye'}
													size={24}
													color="#6F00FF"
												/>
											</TouchableOpacity>
										</View>
									)}
								/>
								{newPasswordErrors.newPassword && (
									<View className="flex-row items-center mt-2">
										<Ionicons name="alert-circle" size={16} color="#EF4444" />
										<StyledText
											variant="montserrat-regular"
											className="text-feedback-error-DEFAULT text-sm ml-1"
										>
											{newPasswordErrors.newPassword.message}
										</StyledText>
									</View>
								)}
							</View>

							{/* Confirm Password Input */}
							<View className="mb-6">
								<StyledText variant="montserrat-bold" className="text-text-primary text-lg mb-2">
									Confirm New Password
								</StyledText>
								<Controller
									control={newPasswordControl}
									name="confirmNewPassword"
									rules={{
										required: 'Please confirm your password',
										validate: (value) =>
											value === newPasswordValue || 'Passwords do not match',
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<View className="relative">
											<TextInput
												className="bg-input-background border-2 border-border-focus font-montserrat rounded-xl px-4 py-4 text-input-text text-lg pr-14"
												placeholder="Confirm new password"
												placeholderTextColor="#E9B3FB"
												secureTextEntry={!showConfirmPassword}
												value={value}
												onChangeText={onChange}
												onBlur={onBlur}
											/>
											<TouchableOpacity
												onPress={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute right-4 top-4"
												activeOpacity={0.7}
											>
												<Ionicons
													name={showConfirmPassword ? 'eye-off' : 'eye'}
													size={24}
													color="#6F00FF"
												/>
											</TouchableOpacity>
										</View>
									)}
								/>
								{newPasswordErrors.confirmNewPassword && (
									<View className="flex-row items-center mt-2">
										<Ionicons name="alert-circle" size={16} color="#EF4444" />
										<StyledText
											variant="montserrat-regular"
											className="text-feedback-error-DEFAULT text-sm ml-1"
										>
											{newPasswordErrors.confirmNewPassword.message}
										</StyledText>
									</View>
								)}
							</View>

                            {/* Password Requirements */}
							<View className="bg-background-elevated rounded-xl p-4 mb-6 border border-border-subtle">
								<StyledText variant="montserrat-bold" className="text-text-primary text-base mb-3">
									Password Requirements
								</StyledText>
								{passwordRequirements.map((req, index) => (
									<View key={index} className="flex-row items-center mb-2">
										<Ionicons
											name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
											size={20}
											color={req.met ? '#10B981' : '#E9B3FB'}
										/>
										<StyledText
											variant="montserrat-regular"
											className={`ml-2 text-sm ${
												req.met ? 'text-feedback-success-dark' : 'text-text-muted'
											}`}
										>
											{req.text}
										</StyledText>
									</View>
								))}
							</View>

							{/* Action Buttons */}
							<View className="gap-3">
								<TouchableOpacity
									onPress={handleNewPasswordSubmit(onSubmitNewPassword)}
									disabled={changePasswordMutation.isPending}
									className="bg-interactive-primary rounded-xl py-4 active:opacity-80 disabled:opacity-50"
								>
									{changePasswordMutation.isPending ? (
										<ActivityIndicator color="#FFF1F1" />
									) : (
										<StyledText
											variant="montserrat-bold"
											className="text-interactive-primary-foreground text-center text-xl"
										>
											Change Password
										</StyledText>
									)}
								</TouchableOpacity>

								<TouchableOpacity
									onPress={() => setCurrentStep('verify-old')}
									disabled={changePasswordMutation.isPending}
									className="bg-interactive-outline border-2 border-interactive-outline-border rounded-xl py-4 active:opacity-80 disabled:opacity-50"
								>
									<StyledText
										variant="montserrat-bold"
										className="text-interactive-outline-foreground text-center text-xl"
									>
										Back
									</StyledText>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>
			</ScrollView>

			{/* Modal */}
			<StyledModal
				visible={modalVisible}
				title={modalConfig.title}
				message={modalConfig.message}
				icon={modalConfig.icon}
				iconColor={modalConfig.iconColor}
				buttons={[
					{
						text: 'OK',
						style: 'default',
						onPress: handleModalClose,
					},
				]}
				onClose={handleModalClose}
			/>
		</SafeAreaView>
	);
}