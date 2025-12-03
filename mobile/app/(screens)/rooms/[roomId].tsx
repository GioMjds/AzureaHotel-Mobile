import {
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
	View,
	Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { room } from '@/services/Room';
import { pesoFormatter } from '@/utils/formatters';
import { getCloudinaryUrl } from '@/utils/cloudinary';
import { Room } from '@/types/Room.types';
import { FontAwesome } from '@expo/vector-icons';
import StyledText from '@/components/ui/StyledText';
import PhotoGallery from '@/components/PhotoGallery';
import useLastBookingCheck from '@/hooks/useLastBookingCheck';
import useAuthStore from '@/store/AuthStore';
import { useCallback } from 'react';

export default function GetRoomScreen() {
	const router = useRouter();
	const { roomId } = useLocalSearchParams();
	const fetchUser = useAuthStore((s) => s.fetchUser);

	useFocusEffect(
		useCallback(() => {
			fetchUser();
		}, [fetchUser])
	);

	const { isBookingLocked, bookingLockedMessage } = useLastBookingCheck();

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
					<StyledText className="text-violet-600 font-montserrat mt-2">
						Loading room details...
					</StyledText>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<StyledText className="text-red-500 font-montserrat-bold text-lg text-center">
						Error loading room details
					</StyledText>
					<StyledText className="text-neutral-600 font-montserrat mt-2 text-center">
						Please try again later
					</StyledText>
				</View>
			</SafeAreaView>
		);
	}

	const roomData: Room = data?.data;

	if (!roomData) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<StyledText variant='montserrat-regular' className="text-neutral-600 text-center">
						Room not found
					</StyledText>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<View className="flex-1 bg-neutral-50">
			<ScrollView
				className='flex-1' showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 110 }}
			>
				{/* Image Gallery */}
				<View className="h-64 bg-neutral-100">
					<View className="w-full h-64 bg-neutral-100 mr-4">
						<Image
							source={{ uri: getCloudinaryUrl(roomData.images[0]?.room_image) }}
							className="w-full h-full"
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
							<StyledText variant='montserrat-bold' className="text-white text-sm">
								{roomData.status.toUpperCase()}
							</StyledText>
						</View>
					</View>

					{/* Discount Badge */}
					{roomData.discount_percent > 0 && (
						<View className="absolute top-4 right-4 bg-feedback-error-DEFAULT rounded-full px-3 py-2">
							<StyledText variant='montserrat-bold' className="text-white text-sm">
								{roomData.discount_percent}% OFF
							</StyledText>
						</View>
					)}
				</View>

				{/* Room Details */}
				<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
					{/* Header */}
					<View className="flex-row justify-between items-start mb-4">
						<View className="flex-1">
							<StyledText variant='playfair-bold' className="text-5xl text-neutral-800 mb-1">
								{roomData.room_name}
							</StyledText>
						</View>
						{/* Rating */}
						{roomData.average_rating > 0 && (
							<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
								<StyledText variant='montserrat-bold' className="text-violet-700 text-lg">
									★
								</StyledText>
								<StyledText variant='montserrat-bold' className="text-brand-primary text-lg ml-1">
									{roomData.average_rating.toFixed(1)}
								</StyledText>
							</View>
						)}
					</View>

					{/* Description */}
					<StyledText variant='montserrat-regular' className="text-neutral-700 text-base leading-6 mb-6">
						{roomData.description}
					</StyledText>

					{/* Room Information */}
					<View className="border-t border-neutral-200 pt-6 mb-6">
						<StyledText variant='montserrat-bold' className="text-lg text-neutral-800 mb-4">
							Room Information
						</StyledText>

						<View className="space-y-3">
							<View className="flex-row justify-between items-center">
								<StyledText variant='montserrat-regular' className="text-neutral-600">
									<FontAwesome name="bed" size={16} />
									{''} Bed Type
								</StyledText>
								<StyledText variant='montserrat-bold' className="text-violet-600 capitalize">
									{''} {roomData.bed_type}
								</StyledText>
							</View>

							<View className='flex-row justify-between items-center'>
								<StyledText variant='montserrat-regular' className="text-neutral-600">
									<FontAwesome name="building" size={16} />
									{''} Room Type
								</StyledText>
								<StyledText variant='montserrat-bold' className="text-violet-600 capitalize">
									{''} {roomData.room_type}
								</StyledText>
							</View>

							<View className="flex-row justify-between items-center">
								<StyledText variant='montserrat-regular' className="text-neutral-600">
									<FontAwesome name="users" size={16} />
									{''} Max Guests
								</StyledText>
								<StyledText variant='montserrat-bold' className="text-violet-600">
									{roomData.max_guests} people
								</StyledText>
							</View>

							<View className="flex-row justify-between items-center">
								<StyledText variant='montserrat-regular' className="text-neutral-600">
									<FontAwesome name="info-circle" size={16} />
									{''} Status
								</StyledText>
								<StyledText 
									variant='montserrat-bold'
									className={`capitalize ${
										roomData.status === 'available'
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{roomData.status}
								</StyledText>
							</View>
						</View>
					</View>

					{/* Amenities */}
					{roomData.amenities && roomData.amenities.length > 0 && (
						<View className="border-t border-neutral-200 pt-6 mb-6">
							<StyledText variant='montserrat-bold' className="text-lg text-neutral-800 mb-4">
								Amenities
							</StyledText>
							<View className="flex-row flex-wrap">
								{roomData.amenities.map((amenity) => (
									<View
										key={amenity.id}
										className="bg-brand-primary px-3 py-2 rounded-full mr-2 mb-2"
									>
										<StyledText variant='montserrat-regular' className="text-brand-surface text-md">
											{amenity.description}
										</StyledText>
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
										<StyledText variant='montserrat-bold' className="text-neutral-400 text-lg line-through">
											{pesoFormatter.format(
												roomData.price_per_night
											)}
										</StyledText>
										<StyledText variant='montserrat-bold' className="text-violet-600 text-3xl">
											{pesoFormatter.format(
												roomData.discounted_price_numeric
											)}
										</StyledText>
									</View>
								) : (
									<StyledText variant='montserrat-bold' className="text-violet-600 text-3xl">
										{pesoFormatter.format(
											roomData.price_per_night
										)}
									</StyledText>
								)}
							</View>
						</View>
					</View>
				</View>

				{/* Photo Gallery */}
				<View className="mx-4 mt-4">
					<StyledText variant='montserrat-regular' className="text-xl text-neutral-800 mb-2">
						Preview photos of {roomData.room_name}
					</StyledText>
					<PhotoGallery
						images={roomData.images || []}
						imageKey="room_image"
					/>
				</View>

				{/* Reviews Section */}
				{roomData.reviews && roomData.reviews.length > 0 && (
					<View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
						<View className="flex-row items-center justify-between mb-4">
							<StyledText className="text-lg font-montserrat-bold text-neutral-800">
								Reviews ({roomData.reviews.length})
							</StyledText>
							{roomData.average_rating > 0 && (
								<View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
									<StyledText variant='montserrat-bold' className="text-violet-700 text-lg">
										★
									</StyledText>
									<StyledText variant='montserrat-bold' className="text-violet-700 text-lg ml-1">
										{roomData.average_rating.toFixed(1)}
									</StyledText>
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
															uri: getCloudinaryUrl(review.user_profile_image),
														}}
														className="w-14 h-14 rounded-full"
														resizeMode="cover"
													/>
												) : (
													<StyledText variant='montserrat-bold' className="text-violet-700 text-lg">
														{review.user_name}
													</StyledText>
												)}
											</View>
										<View className="flex-1">
											<StyledText variant='montserrat-bold' className="text-neutral-800 text-md ml-2">
												{review.user_name}
											</StyledText>
											<View className="flex-row items-center justify-between">
												<View className="flex-row ml-2">
													{[...Array(5)].map(
														(_, i) => (
															<StyledText
																key={i}
																className={`text-md ${i < review.rating ? 'text-yellow-500' : 'text-neutral-300'}`}
															>
																★
															</StyledText>
														)
													)}
												</View>
												<StyledText variant='montserrat-regular' className="text-neutral-500 text-xs">
													{review.formatted_date}
												</StyledText>
											</View>
										</View>
									</View>

									{/* Review Text & Booking Details */}
									<View className="bg-white rounded-lg p-3 mt-3 border border-neutral-200">
										<StyledText variant='montserrat-regular' className="text-neutral-600 text-sm">
											{review.review_text}
										</StyledText>
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
							roomData.status === 'available' && !isBookingLocked
								? 'bg-violet-600'
								: 'bg-neutral-400'
						}`}
						onPress={() => router.push(`/(booking-flow)/room-booking/${roomData.id}` as any)}
						disabled={roomData.status !== 'available' || isBookingLocked}
					>
						<StyledText variant='montserrat-bold' className="text-white text-center text-lg">
							{roomData.status === 'available' && !isBookingLocked
								? 'Book This Room'
								: 'Verify your account for infinite bookings'}
						</StyledText>
					</TouchableOpacity>

					{isBookingLocked && (
						<StyledText variant='raleway-regular' className="text-center text-sm text-neutral-600 mt-2">
							{bookingLockedMessage}
						</StyledText>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
