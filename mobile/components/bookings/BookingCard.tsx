import React from 'react';
import { useRouter } from 'expo-router';
import { View, Image, TouchableOpacity } from 'react-native';
import { UserBooking } from '@/types/Bookings.types';
import {
	formatDate,
	pesoFormatter,
	getStatusStyle,
} from '@/utils/formatters';
import StyledText from '@/components/ui/StyledText';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

interface BookingCardProps {
	item: UserBooking;
	onLeaveFeedback?: (booking: UserBooking) => void;
	showFeedbackButton?: boolean;
	footer?: React.ReactNode;
}

const BookingCard = ({ 
	item, 
	onLeaveFeedback,
	showFeedbackButton = true,
	footer,
}: BookingCardProps) => {
	const isAreaBooking = item.is_venue_booking;

	const propertyName = isAreaBooking
		? item.area_details?.area_name
		: item.room_details?.room_name;

	const propertyImage = isAreaBooking
		? item.area_details?.images?.[0]?.area_image
		: item.room_details?.images?.[0]?.room_image;

	const router = useRouter();

	const areaReviews = item.area_details?.reviews ?? [];
	const roomReviews = item.room_details?.reviews ?? [];
	const hasFeedback = [...areaReviews, ...roomReviews].some((r: any) => r?.booking === item.id);

	// Determine if feedback button should be shown
	const canShowFeedbackButton = showFeedbackButton &&
		(item.status === 'completed' || item.status === 'checked_out') &&
		!hasFeedback;

	const statusStyle = getStatusStyle(item.status);

	const handleFeedbackPress = () => {
		if (onLeaveFeedback) onLeaveFeedback(item);
	};

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={() => router.push(`/booking/${item.id}`)}
			className="mx-4 mb-4"
		>
			<View className="bg-background-elevated rounded-2xl p-4 shadow-lg border border-border-subtle overflow-hidden">
				{/* Status Badge */}
				<View className="absolute top-4 right-4 z-10">
					<View 
						style={statusStyle}
						className="px-3 py-1 rounded-full shadow-sm"
					>
						<StyledText
							variant="montserrat-bold"
							className="text-text-inverse text-xs"
						>
							{item.status.replace('_', ' ').toUpperCase()}
						</StyledText>
					</View>
				</View>

				<View className="flex-row items-start">
					{/* Left image */}
					<View className="relative">
						<Image
							source={{ uri: propertyImage }}
							className="w-24 h-32 rounded-lg mr-4"
							resizeMode="cover"
						/>
					</View>

					<View className="flex-1">
						<View className="flex-row items-center mb-1">
							<FontAwesome
								name={isAreaBooking ? 'map-marker' : 'bed'}
								size={18}
								color="#6F00FF"
								style={{ marginRight: 8 }}
							/>
							<StyledText
								variant="playfair-bold"
								className="text-2xl text-text-primary leading-7"
								numberOfLines={1}
							>
								{propertyName}
							</StyledText>
						</View>

						<View className="mb-3">
							<View className="flex-row items-center mb-1">
								<Ionicons 
									name="calendar-outline" 
									size={16} 
									color="#6F00FF80" 
									style={{ marginRight: 6 }}
								/>
								<StyledText
									variant="montserrat-regular"
									className="text-text-muted text-sm"
								>
									{formatDate(item.check_in_date || item.created_at)}{' '}
									—{' '}
									{formatDate(item.check_out_date || item.created_at)}
								</StyledText>
							</View>

							<View className="flex-row items-center mb-1">
								<Ionicons 
									name="people-outline" 
									size={16} 
									color="#6F00FF80" 
									style={{ marginRight: 6 }}
								/>
								<StyledText
									variant="montserrat-regular"
									className="text-text-muted text-sm"
								>
									{item.number_of_guests}{' '}
									{item.number_of_guests === 1 ? 'Guest' : 'Guests'}
								</StyledText>
							</View>
						</View>

						<View className="flex-row items-center justify-between">
							<StyledText
								variant="montserrat-bold"
								className="text-interactive-primary text-2xl"
							>
								{pesoFormatter.format(item.total_price)}
							</StyledText>

							{/* Feedback Button */}
							{canShowFeedbackButton && (
								<TouchableOpacity
									onPress={handleFeedbackPress}
									className="bg-interactive-secondary px-4 py-2 rounded-lg border border-interactive-secondary-pressed active:bg-interactive-secondary-hover"
								>
									<View className="flex-row items-center">
										<Ionicons 
											name="star-outline" 
											size={16} 
											color="#3B0270" 
											style={{ marginRight: 4 }}
										/>
										<StyledText
											variant="montserrat-bold"
											className="text-interactive-secondary-foreground text-sm"
										>
											Review
										</StyledText>
									</View>
								</TouchableOpacity>
							)}

							{/* Feedback Submitted Indicator */}
							{hasFeedback && (
								<View className="flex-row items-center bg-feedback-success-light px-3 py-2 rounded-lg border border-feedback-success-DEFAULT">
									<Ionicons 
										name="star" 
										size={16} 
										color="#047857" 
										style={{ marginRight: 4 }}
									/>
									<StyledText
										variant="montserrat-bold"
										className="text-feedback-success-dark text-sm"
									>
										Reviewed
									</StyledText>
								</View>
							)}
						</View>
					</View>
				</View>

				{/* Enhanced Status Bar */}
				<View 
					style={statusStyle}
					className="h-1 rounded-full mt-3 opacity-80"
				/>
			</View>

			{/* Optional footer (e.g. pagination). Rendered inside the same touchable area so it scrolls with the list */}
			{footer && (
				<View className="px-4 mt-2">
					{footer}
				</View>
			)}
		</TouchableOpacity>
	);
};

export default BookingCard;