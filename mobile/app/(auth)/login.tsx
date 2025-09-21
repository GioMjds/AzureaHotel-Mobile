import { useState } from 'react';
import {
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Image,
	ScrollView,
	ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

interface LoginFormData {
    email: string;
    password: string;
}

export default function LoginScreen() {
	const [showPassword, setShowPassword] = useState<boolean>(false);

	const { login } = useAuth();

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm({
		defaultValues: {
			email: '',
			password: '',
		},
		mode: 'onSubmit',
	});

	const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
		await login(data.email, data.password);
	};

	const togglePasswordVisibility = () => setShowPassword(!showPassword);

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
							Welcome to Azurea Hotel!
						</Text>
						<Text className="text-gray-600 text-center text-lg mb-6">
							Log in with your Azurea Hotel for hotel bookings!
						</Text>

						<View className="mb-5">
							<Controller
								control={control}
								name="email"
								rules={{ required: 'Email is required' }}
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

						<View className="mb-5">
							<View className="relative">
								<Controller
									control={control}
									name="password"
									rules={{ required: 'Password is required' }}
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

						<TouchableOpacity className="self-start mb-6">
							<Text className="text-violet-600">
								Forgot password?
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							className={`bg-violet-600 rounded-xl p-3 mb-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
							onPress={handleSubmit(onSubmit)}
							disabled={isSubmitting}
						>
							<Text className="text-white text-2xl uppercase text-center font-semibold">
								{isSubmitting ? (
									<>
										<ActivityIndicator color="#fff" />
										<Text>Logging in...</Text>
									</>
								) : (
									<>
										<Text>Login</Text>
									</>
								)}
							</Text>
						</TouchableOpacity>

						<View className="flex-row justify-center">
							<Text className="text-gray-600">
								Don&apos;t have an account?{' '}
							</Text>
							<TouchableOpacity
								onPress={() => router.push('/(auth)/register')}
							>
								<Text className="text-violet-600 font-semibold">
									Register here
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}
