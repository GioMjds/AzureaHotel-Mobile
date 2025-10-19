import {
	ActivityIndicator,
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { area } from '@/services/Area';
import { Area } from '@/types/Area.types';
import { pesoFormatter } from '@/utils/formatters';
import PhotoGallery from '@/components/PhotoGallery';

export default function GetAreaScreen() {
	const { areaId } = useLocalSearchParams();
	const router = useRouter();

	const { data, isLoading, error } = useQuery({
		queryKey: ['area', areaId],
		queryFn: async () => {
			return await area.getSingleArea(areaId as string);
		},
		enabled: !!areaId,
	});

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading area details...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<Text className="text-red-500 font-montserrat-bold text-lg text-center">
						Error loading area details
					</Text>
					<Text className="text-neutral-600 font-montserrat mt-2 text-center">
						Please try again later
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const areaData: Area = data.data;

	return (
		<View className="flex-1 bg-neutral-50">
			<ScrollView
				className="flex-1" 
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 110 }}
			>
				{/* Image Gallery */}
				<View className="h-64 bg-neutral-100">
					{areaData.images.length > 0 && (
						<ScrollView>
							{areaData.images.map((image, index) => (
								<View
									key={index}
									className="w-full h-64 bg-neutral-100"
								>
									<Image
										source={{ uri: image.area_image }}
										className="w-full h-full"
										resizeMode="cover"
									/>
								</View>
							))}
						</ScrollView>
					)}

					{/* Status Badge */}
					<View className="absolute top-4 left-4">
						<View
							className={`px-3 py-2 rounded-full ${
								areaData.status === 'available'
									? 'bg-green-500'
									: 'bg-red-500'
							}`}
						>
							<Text className="text-white font-montserrat-bold text-sm capitalize">
								{areaData.status}
							</Text>
						</View>
					</View>

					{/* Discount Badge */}
					{areaData.discount_percent > 0 && (
						<View className="absolute top-4 right-4 bg-feedback-error-DEFAULT rounded-full px-3 py-2">
							<Text className="text-white font-montserrat-bold text-sm">
								{areaData.discount_percent}% OFF
							</Text>
						</View>
					)}
				</View>

				{/* Area Details */}
				<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
					{/* Header */}
					<View className="flex-row justify-between items-start mb-4">
						<View className="flex-1">
							<Text className="text-5xl font-playfair-bold text-neutral-800 mb-1">
								{areaData.area_name}
							</Text>
						</View>
						{/* Rating */}
						{areaData.average_rating > 0 && (
							<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
								<Text className="text-violet-700 font-montserrat-bold text-lg">
									★
								</Text>
								<Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
									{areaData.average_rating.toFixed(1)}
								</Text>
							</View>
						)}
					</View>

					{/* Description */}
					<Text className="text-neutral-700 font-montserrat text-base leading-6 mb-6">
						{areaData.description}
					</Text>

					{/* Area Information */}
					<View className="border-t border-neutral-200 pt-6 mb-6">
						<Text className="text-xl font-montserrat-bold text-neutral-800 mb-2">
							Area Information
						</Text>

						<View className="space-y-3">
							<View className="flex-row justify-between items-center">
								<Text className="text-neutral-600 font-montserrat">
									Capacity
								</Text>
								<Text className="text-violet-600 font-montserrat-bold">
									{areaData.capacity} people
								</Text>
							</View>

							<View className="flex-row justify-between items-center">
								<Text className="text-neutral-600 font-montserrat">
									Status
								</Text>
								<Text
									className={`font-montserrat-bold capitalize ${
										areaData.status === 'available'
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{areaData.status}
								</Text>
							</View>
						</View>
					</View>

					{/* Pricing */}
					<View className="border-t border-neutral-200 pt-6">
						<View className="flex-row items-center justify-between">
							<View>
								{areaData.discounted_price_numeric ? (
									<View>
										<Text className="text-neutral-400 font-montserrat text-lg line-through">
											{pesoFormatter.format(
												areaData.price_per_hour_numeric
											)}
										</Text>
										<Text className="text-violet-600 font-black text-3xl">
											{pesoFormatter.format(
												areaData.discounted_price_numeric
											)}
										</Text>
									</View>
								) : (
									<Text className="text-violet-600 font-black text-3xl">
										{pesoFormatter.format(
											areaData.price_per_hour_numeric
										)}
									</Text>
								)}
							</View>
						</View>
					</View>
				</View>

                {/* Photo Gallery */}
				<View className="mx-4 mt-4">
                    <Text className='text-lg font-montserrat text-neutral-800 mb-2'>
                        Preview photos of {areaData.area_name}
                    </Text>
					<PhotoGallery images={areaData.images || []} imageKey="area_image" />
				</View>

				{/* Reviews Section */}
				{areaData.reviews && areaData.reviews.length > 0 && (
					<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
						<View className="flex-row items-center justify-between mb-4">
							<Text className="text-lg font-montserrat-bold text-neutral-800">
								Reviews ({areaData.reviews.length})
							</Text>
							{areaData.average_rating > 0 && (
								<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
									<Text className="text-violet-700 font-montserrat-bold text-lg">
										★
									</Text>
									<Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
										{areaData.average_rating.toFixed(1)}
									</Text>
								</View>
							)}
						</View>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							className="space-x-4"
						>
							{areaData.reviews.map((review) => (
								<View
									key={review.id}
									className="bg-neutral-50 rounded-lg p-4 mr-4 w-80 border border-neutral-100"
								>
									{/* User Info & Rating */}
									<View className="flex-row items-center mb-3">
										<View className="w-10 h-10 bg-violet-200 rounded-full items-center justify-center mr-3">
											{review.user_profile_image ? (
												<Image
													source={{
														uri: review.user_profile_image,
													}}
													className="w-14 h-14 rounded-full"
													resizeMode="cover"
												/>
											) : (
												<Text className="text-violet-700 font-montserrat-bold text-lg">
													{review.user_name}
												</Text>
											)}
										</View>
										<View className="flex-1">
											<Text className="text-neutral-800 font-montserrat-bold text-md ml-2">
												{review.user_name}
											</Text>
											<View className="flex-row items-center justify-between">
												<View className="flex-row ml-2">
													{[...Array(5)].map(
														(_, i) => (
															<Text
																key={i}
																className={`text-md ${i < review.rating ? 'text-yellow-500' : 'text-neutral-300'}`}
															>
																★
															</Text>
														)
													)}
												</View>
												<Text className="text-neutral-500 font-montserrat text-xs">
													{review.formatted_date}
												</Text>
											</View>
										</View>
									</View>

									{/* Booking Details */}
									<View className="bg-white rounded-lg p-3 mt-3 border border-neutral-200">
										<Text className="text-neutral-600 font-montserrat text-sm">
											{review.review_text}
										</Text>
									</View>
								</View>
							))}
						</ScrollView>
					</View>
				)}

				{/* Book Button */}
				<View className="px-4 py-6">
					<TouchableOpacity
						className={`rounded-xl py-4 ${
							areaData.status === 'available'
								? 'bg-violet-600'
								: 'bg-neutral-400'
						}`}
                        onPress={() => router.push(`/(booking-flow)/area-booking/${areaData.id}` as any)}
						disabled={areaData.status !== 'available'}
					>
						<Text className="text-white font-montserrat-bold text-center text-lg">
							{areaData.status === 'available'
								? 'Book This Area'
								: 'Currently Unavailable'}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}
