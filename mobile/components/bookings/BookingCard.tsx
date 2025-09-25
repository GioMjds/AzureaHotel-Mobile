import { Link } from 'expo-router';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { UserBooking } from '@/types/Bookings.types';
import { formatDate, formatTime, getStatusStyle, pesoFormatter } from '@/utils/formatters';

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
		<View className="bg-background-elevated rounded-2xl mx-4 mb-4 overflow-hidden border border-border-DEFAULT shadow-sm">
			{/* Property Image */}
			<View className="h-48 bg-background-subtle relative">
				{propertyImage && (
					<Image
						source={{ uri: propertyImage }}
						className="w-full h-full"
						resizeMode="cover"
					/>
				)}

				{/* Status Badge */}
				<View className="absolute top-4 left-4">
					<View 
						className="px-4 py-2 rounded-full shadow-sm"
						style={getStatusStyle(item.status)}
					>
						<Text className="text-white font-montserrat-bold text-sm uppercase tracking-wide">
							{item.status.replace('_', ' ')}
						</Text>
					</View>
				</View>
			</View>

			{/* Booking Details */}
			<View className="p-6">
				{/* Property Name & Creation Date */}
				<View className="mb-4">
					<Text className="text-2xl font-playfair-bold text-text-primary mb-1">
						{propertyName}
					</Text>
					<Text className="text-text-muted font-montserrat text-sm">
						Booked on {formatDate(item.created_at)}
					</Text>
				</View>

				{/* Primary Booking Information */}
				<View className="bg-background-subtle rounded-xl p-4 mb-4">
					<View className="flex-row items-center justify-between mb-3">
						<View className="flex-1 mr-4">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Check-in
							</Text>
							<Text className="text-text-primary font-playfair-medium text-base">
								{item.check_in_date
									? formatDate(item.check_in_date)
									: 'Not specified'}
							</Text>
							{item.time_of_arrival && (
								<Text className="text-text-muted font-montserrat text-sm">
									Arrival: {formatTime(item.time_of_arrival)}
								</Text>
							)}
						</View>
						<View className="flex-1">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Check-out
							</Text>
							<Text className="text-text-primary font-playfair-medium text-base">
								{item.check_out_date
									? formatDate(item.check_out_date)
									: 'Not specified'}
							</Text>
						</View>
					</View>

					<View className="flex-row items-center justify-between">
						<View className="flex-1 mr-4">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Guests
							</Text>
							<Text className="text-text-primary font-playfair-medium text-base">
								{item.number_of_guests} {item.number_of_guests === 1 ? 'Guest' : 'Guests'}
							</Text>
						</View>
						<View className="flex-1">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Contact
							</Text>
							<Text className="text-text-primary font-montserrat text-sm">
								{item.phone_number || 'Not provided'}
							</Text>
						</View>
					</View>
				</View>

				{/* Payment Information */}
				<View className="border border-border-DEFAULT rounded-xl p-4 mb-4">
					<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-3">
						Payment Details
					</Text>
					
					<View className="flex-row items-center justify-between mb-2">
						<Text className="text-text-primary font-montserrat text-sm">Method:</Text>
						<Text className="text-text-primary font-montserrat-bold text-sm capitalize">
							{item.payment_method}
						</Text>
					</View>
					
					{item.payment_date && (
						<View className="flex-row items-center justify-between mb-2">
							<Text className="text-text-primary font-montserrat text-sm">Paid on:</Text>
							<Text className="text-text-primary font-montserrat-bold text-sm">
								{formatDate(item.payment_date)}
							</Text>
						</View>
					)}
					
					{item.down_payment && (
						<View className="flex-row items-center justify-between mb-2">
							<Text className="text-text-primary font-montserrat text-sm">Down Payment:</Text>
							<Text className="text-interactive-primary-DEFAULT font-montserrat-bold text-sm">
								{pesoFormatter.format(parseFloat(item.down_payment))}
							</Text>
						</View>
					)}
				</View>

				{/* Pricing */}
				<View className="border-t border-border-DEFAULT pt-4 mb-4">
					<View className="flex-row items-center justify-between">
						<View className="flex-1">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Total Amount
							</Text>
							{item.discount_percent > 0 && item.discounted_price ? (
								<View>
									<Text className="text-text-muted font-montserrat text-sm line-through">
										{pesoFormatter.format(item.original_price)}
									</Text>
									<View className="flex-row items-center">
										<Text className="text-interactive-primary-DEFAULT font-playfair-bold text-xl">
											{pesoFormatter.format(item.discounted_price)}
										</Text>
										<View className="bg-feedback-success-light px-2 py-1 rounded-full ml-2">
											<Text className="text-feedback-success-dark font-montserrat-bold text-xs">
												{item.discount_percent}% OFF
											</Text>
										</View>
									</View>
								</View>
							) : (
								<Text className="text-interactive-primary-DEFAULT font-playfair-bold text-xl">
									{pesoFormatter.format(item.total_amount || item.total_price)}
								</Text>
							)}
						</View>

						<Link 
							href={`/booking/${item.id}` as any} 
							asChild
						>
							<TouchableOpacity className='bg-interactive-primary-DEFAULT px-6 py-3 rounded-xl shadow-sm active:bg-interactive-primary-pressed'>
								<Text className="text-interactive-primary-foreground font-montserrat-bold text-sm">
									View Details
								</Text>
							</TouchableOpacity>
						</Link>
					</View>
				</View>

				{/* Special Request */}
				{item.special_request && (
					<View className="bg-background-subtle rounded-xl p-4 mb-4">
						<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-2">
							Special Request
						</Text>
						<Text className="text-text-primary font-montserrat text-sm leading-relaxed">
							{item.special_request}
						</Text>
					</View>
				)}

				{/* Cancellation Information */}
				{(item.cancellation_date || item.cancellation_reason) && (
					<View className="bg-feedback-error-light border border-feedback-error-DEFAULT rounded-xl p-4">
						<Text className="text-feedback-error-dark font-montserrat-bold text-xs uppercase tracking-wide mb-2">
							Cancellation Details
						</Text>
						{item.cancellation_date && (
							<View className="flex-row justify-between mb-1">
								<Text className="text-feedback-error-dark font-montserrat text-sm">Cancelled on:</Text>
								<Text className="text-feedback-error-dark font-montserrat-bold text-sm">
									{formatDate(item.cancellation_date)}
								</Text>
							</View>
						)}
						{item.cancellation_reason && (
							<Text className="text-feedback-error-dark font-montserrat text-sm mt-2">
								Reason: {item.cancellation_reason}
							</Text>
						)}
					</View>
				)}
			</View>
		</View>
	);
};

export default BookingCard;
