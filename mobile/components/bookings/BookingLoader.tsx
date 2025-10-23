import { View, ActivityIndicator } from 'react-native';
import React from 'react';
import StyledText from '@/components/ui/StyledText';

const BookingLoader = () => {
	return (
		<View className="flex-1 bg-white justify-center items-center px-6">
			{/* Animated Loader Circle */}
			<View className="mb-8">
				<ActivityIndicator size="large" color="#1E40AF" />
			</View>

			{/* Main Heading */}
			<StyledText 
				variant="playfair-bold" 
				className="text-2xl text-gray-900 text-center mb-3"
			>
				Processing Your Booking
			</StyledText>

			{/* Subtext */}
			<StyledText 
				variant="montserrat-regular" 
				className="text-base text-gray-600 text-center mb-8 leading-6"
			>
				Please wait while we confirm your reservation details
			</StyledText>

			{/* Info Cards */}
			<View className="w-full max-w-sm space-y-3">
				<View className="flex-row items-center bg-blue-50 rounded-xl p-4">
					<View className="w-2 h-2 rounded-full bg-blue-600 mr-3" />
					<StyledText 
						variant="raleway-regular" 
						className="text-sm text-gray-700 flex-1"
					>
						Verifying availability
					</StyledText>
				</View>

				<View className="flex-row items-center bg-blue-50 rounded-xl p-4">
					<View className="w-2 h-2 rounded-full bg-blue-600 mr-3" />
					<StyledText 
						variant="raleway-regular" 
						className="text-sm text-gray-700 flex-1"
					>
						Securing your reservation
					</StyledText>
				</View>

				<View className="flex-row items-center bg-blue-50 rounded-xl p-4">
					<View className="w-2 h-2 rounded-full bg-blue-600 mr-3" />
					<StyledText 
						variant="raleway-regular" 
						className="text-sm text-gray-700 flex-1"
					>
						Preparing confirmation
					</StyledText>
				</View>
			</View>

			{/* Bottom Note */}
			<StyledText 
				variant="montserrat-regular" 
				className="text-xs text-gray-500 text-center mt-12"
			>
				This usually takes just a few seconds
			</StyledText>
		</View>
	);
};

export default BookingLoader;