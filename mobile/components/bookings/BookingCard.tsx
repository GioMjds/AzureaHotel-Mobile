import { View, Text, Image } from 'react-native';
import React from 'react';
import { UserBooking } from '@/types/Bookings.types';
import { colorMap, formatDate, pesoFormatter } from '@/utils/formatters';
import { Link } from 'expo-router';

interface BookingCardProps {
	item: UserBooking;
}

const BookingCard = ({ item }: BookingCardProps) => {
	const isAreaBooking = item.is_venue_booking;

	const propertyName = isAreaBooking
		? item.area_details?.area_name
		: item.room_details?.room_name;

	const propertyImage = isAreaBooking
		? item.area_details?.images?.[0]?.area_image
		: item.room_details?.images?.[0]?.room_image;

	return (
		<View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-neutral-200">
			{/* Property Image */}
			<View className="h-40 bg-neutral-100">
				{propertyImage && (
					<Image
						source={{ uri: propertyImage }}
						className="w-full h-full"
						resizeMode="cover"
					/>
				)}

				{/* Status Badge */}
				<View className="absolute top-3 left-3">
					<View className={`px-3 py-2 rounded-full ${colorMap[item.status]}`}>
						<Text className="text-white font-bold text-md uppercase">
							{item.status.replace('_', ' ')}
						</Text>
					</View>
				</View>

				{/* Booking Type Badge */}
				<View className="absolute top-3 right-3 bg-white/90 rounded-full px-3 py-1">
					<Text className="text-neutral-700 font-semibold text-md">
						{isAreaBooking ? 'Area' : 'Room'}
					</Text>
				</View>
			</View>

			{/* Booking Details */}
			<View className="p-4">
				{/* Property Name */}
				<Text className="text-2xl font-montserrat-bold text-neutral-800 mb-2">
					{propertyName}
				</Text>

				{/* Booking Information */}
				<View className="space-y-2 mb-4">
					{/* Check-in/Check-out Dates */}
					<View className="flex-row items-center justify-between">
						<View className="flex-1">
							<Text className="text-neutral-500 font-montserrat text-xs">
								Check-in
							</Text>
							<Text className="text-neutral-800 font-montserrat-bold text-sm">
								{item.check_in_date
									? formatDate(item.check_in_date)
									: 'N/A'}
							</Text>
						</View>
						<View className="flex-1">
							<Text className="text-neutral-500 font-montserrat text-xs">
								Check-out
							</Text>
							<Text className="text-neutral-800 font-montserrat-bold text-sm">
								{item.check_out_date
									? formatDate(item.check_out_date)
									: 'N/A'}
							</Text>
						</View>
					</View>

					{/* Guests and Payment Method */}
					<View className="flex-row items-center justify-between">
						<View className="flex-1">
							<Text className="text-neutral-500 font-montserrat text-xs">
								Guests
							</Text>
							<Text className="text-neutral-800 font-montserrat-bold text-sm">
								{item.number_of_guests}{' '}
								{item.number_of_guests > 1
									? 'guests'
									: 'guest'}
							</Text>
						</View>
						<View className="flex-1">
							<Text className="text-neutral-500 font-montserrat text-xs">
								Payment
							</Text>
							<Text className="text-neutral-800 font-montserrat-bold text-sm capitalize">
								{item.payment_method}
							</Text>
						</View>
					</View>
				</View>

				{/* Pricing */}
				<View className="border-t border-neutral-200 pt-4">
					<View className="flex-row items-center justify-between">
						<View>
							{item.discount_percent > 0 &&
							item.discounted_price ? (
								<View>
									<Text className="text-neutral-400 font-montserrat text-sm line-through">
										{pesoFormatter.format(item.original_price)}
									</Text>
									<View className="flex-row items-center">
										<Text className="text-violet-600 font-black text-lg">
											{pesoFormatter.format(item.discounted_price)}
										</Text>
										<View className="bg-green-100 px-2 py-1 rounded-full ml-2">
											<Text className="text-green-700 font-montserrat-bold text-xs">
												{item.discount_percent}% OFF
											</Text>
										</View>
									</View>
								</View>
							) : (
								<Text className="text-violet-600 font-black text-lg">
									{pesoFormatter.format(item.total_price)}
								</Text>
							)}
						</View>

						<Link 
							href={`/booking/${item.id}` as any} 
							className='bg-violet-600 px-4 py-2 rounded-full' 
							asChild
						>
							<Text className="text-white font-semibold text-md">
								View Details
							</Text>
						</Link>
					</View>
				</View>

				{/* Special Request */}
				{item.special_request && (
					<View className="mt-3 pt-3 border-t border-neutral-100">
						<Text className="text-neutral-500 font-montserrat text-xs mb-1">
							Special Request
						</Text>
						<Text className="text-neutral-700 font-montserrat text-sm">
							{item.special_request}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
};

export default BookingCard;
