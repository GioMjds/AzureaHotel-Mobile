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
import { room } from '@/services/Room';
import { pesoFormatter } from '@/utils/formatters';
import { Room } from '@/types/Room.types';
import { FontAwesome } from '@expo/vector-icons';
import PhotoGallery from '@/components/PhotoGallery';

export default function GetRoomScreen() {
	const router = useRouter();
	const { roomId } = useLocalSearchParams();

	const { data, isLoading, error } = useQuery({
		queryKey: ['room', roomId],
		queryFn: async () => {
			return await room.getSingleRoom(roomId as string);
		},
		enabled: !!roomId,
	});

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading room details...
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
						Error loading room details
					</Text>
					<Text className="text-neutral-600 font-montserrat mt-2 text-center">
						Please try again later
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const roomData: Room = data?.data;

	if (!roomData) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<Text className="text-neutral-600 font-montserrat text-center">
						Room not found
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-neutral-50">
			{/* Header */}
			<View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-200">
				<TouchableOpacity
					onPress={() => router.back()}
					className="mr-4 p-2 -ml-2"
				>
					<FontAwesome name="arrow-left" size={20} color="#6b7280" />
				</TouchableOpacity>
				<Text className="text-3xl font-playfair-bold text-neutral-800 flex-1">
					Room Details
				</Text>
			</View>

			<ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
				{/* Image Gallery */}
				<View className="h-64 bg-neutral-100">
					<View className="w-full h-64 bg-neutral-100 mr-4">
						<Image
							source={{ uri: roomData.images[0]?.room_image }}
							className="w-full h-full rounded-lg"
							resizeMode="cover"
						/>
					</View>
					{/* Status Badge */}
					<View className="absolute top-4 left-4">
						<View
							className={`px-3 py-2 rounded-full ${
								roomData.status === 'available'
									? 'bg-green-500'
									: 'bg-red-500'
							}`}
						>
							<Text className="text-white font-montserrat-bold text-sm capitalize">
								{roomData.status}
							</Text>
						</View>
					</View>

					{/* Discount Badge */}
					{roomData.discount_percent > 0 && (
						<View className="absolute top-4 right-4 bg-feedback-error-DEFAULT rounded-full px-3 py-2">
							<Text className="text-white font-montserrat-bold text-sm">
								{roomData.discount_percent}% OFF
							</Text>
						</View>
					)}
				</View>

				{/* Room Details */}
				<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
					{/* Header */}
					<View className="flex-row justify-between items-start mb-4">
						<View className="flex-1">
							<Text className="text-5xl font-playfair-bold text-neutral-800 mb-1">
								{roomData.room_name}
							</Text>
						</View>
						{/* Rating */}
						{roomData.average_rating > 0 && (
							<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
								<Text className="text-violet-700 font-montserrat-bold text-lg">
									★
								</Text>
								<Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
									{roomData.average_rating.toFixed(1)}
								</Text>
							</View>
						)}
					</View>

					{/* Description */}
					<Text className="text-neutral-700 font-montserrat text-base leading-6 mb-6">
						{roomData.description}
					</Text>

					{/* Room Information */}
					<View className="border-t border-neutral-200 pt-6 mb-6">
						<Text className="text-lg font-montserrat-bold text-neutral-800 mb-4">
							Room Information
						</Text>

						<View className="space-y-3">
							<View className="flex-row justify-between items-center">
								<Text className="text-neutral-600 font-montserrat">
									<FontAwesome name="bed" size={16} />
									{''} Bed Type
								</Text>
								<Text className="text-violet-600 capitalize font-montserrat-bold">
									{''} {roomData.bed_type}
								</Text>
							</View>

							<View className='flex-row justify-between items-center'>
								<Text className="text-neutral-600 font-montserrat">
									<FontAwesome name="building" size={16} />
									{''} Room Type
								</Text>
								<Text className="text-violet-600 capitalize font-montserrat-bold">
									{''} {roomData.room_type}
								</Text>
							</View>

							<View className="flex-row justify-between items-center">
								<Text className="text-neutral-600 font-montserrat">
									<FontAwesome name="users" size={16} />
									{''} Max Guests
								</Text>
								<Text className="text-violet-600 font-montserrat-bold">
									{roomData.max_guests} people
								</Text>
							</View>

							<View className="flex-row justify-between items-center">
								<Text className="text-neutral-600 font-montserrat">
									<FontAwesome name="info-circle" size={16} />
									{''} Status
								</Text>
								<Text
									className={`font-montserrat-bold capitalize ${
										roomData.status === 'available'
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{roomData.status}
								</Text>
							</View>
						</View>
					</View>

					{/* Amenities */}
					{roomData.amenities && roomData.amenities.length > 0 && (
						<View className="border-t border-neutral-200 pt-6 mb-6">
							<Text className="text-lg font-montserrat-bold text-neutral-800 mb-4">
								Amenities
							</Text>
							<View className="flex-row flex-wrap">
								{roomData.amenities.map((amenity) => (
									<View
										key={amenity.id}
										className="bg-violet-100 px-3 py-2 rounded-full mr-2 mb-2"
									>
										<Text className="text-violet-700 font-montserrat text-sm">
											{amenity.description}
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Pricing */}
					<View className="border-t border-neutral-200 pt-6">
						<View className="flex-row items-center justify-between">
							<View>
								{roomData.discounted_price_numeric ? (
									<View>
										<Text className="text-neutral-400 font-montserrat text-lg line-through">
											{pesoFormatter.format(
												roomData.price_per_night
											)}
										</Text>
										<Text className="text-violet-600 font-black text-3xl">
											{pesoFormatter.format(
												roomData.discounted_price_numeric
											)}
										</Text>
									</View>
								) : (
									<Text className="text-violet-600 font-black text-3xl">
										{pesoFormatter.format(
											roomData.price_per_night
										)}
									</Text>
								)}
							</View>
						</View>
					</View>
				</View>

				{/* Photo Gallery */}
				<View className="mx-4 mt-4">
					<Text className="text-lg font-montserrat text-neutral-800 mb-2">
						Preview photos of {roomData.room_name}
					</Text>
					<PhotoGallery
						images={roomData.images || []}
						imageKey="room_image"
					/>
				</View>

				{/* Reviews Section */}
				{roomData.reviews && roomData.reviews.length > 0 && (
					<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
						<View className="flex-row items-center justify-between mb-4">
							<Text className="text-lg font-montserrat-bold text-neutral-800">
								Reviews ({roomData.reviews.length})
							</Text>
							{roomData.average_rating > 0 && (
								<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
									<Text className="text-violet-700 font-montserrat-bold text-lg">
										★
									</Text>
									<Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
										{roomData.average_rating.toFixed(1)}
									</Text>
								</View>
							)}
						</View>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							className="space-x-4"
						>
							{roomData.reviews.map((review) => (
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

									{/* Review Text & Booking Details */}
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

				{/* Book Now Button */}
				<View className="px-4 py-6">
					<TouchableOpacity
						className={`rounded-xl py-4 ${
							roomData.status === 'available'
								? 'bg-violet-600'
								: 'bg-neutral-400'
						}`}
						onPress={() => router.push(`/(booking-flow)/room-booking/${roomData.id}` as any)}
						disabled={roomData.status !== 'available'}
					>
						<Text className="text-white font-montserrat-bold text-center text-lg">
							{roomData.status === 'available'
								? 'Book Now'
								: 'Not Available'}
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
