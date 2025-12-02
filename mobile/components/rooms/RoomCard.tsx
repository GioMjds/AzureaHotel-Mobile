import { TouchableOpacity, View, Image } from 'react-native';
import { Room } from '@/types/Room.types';
import { pesoFormatter } from '@/utils/formatters';
import { getCloudinaryUrl } from '@/utils/cloudinary';
import { Link } from 'expo-router';
import StyledText from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../NetworkProvider';

interface RoomCardProps {
	item: Room;
}

const RoomCard = ({ item }: RoomCardProps) => {
	const { isOffline } = useNetwork();

	const roomType = (roomType: string) => {
		switch (roomType) {
			case 'premium':
				return {
					icon: '💎',
					badgeClass: 'bg-brand-secondary',
					textClass: 'text-white',
					label: 'PREMIUM',
				};
			case 'suites':
				return {
					icon: '🏩',
					badgeClass: 'bg-brand-primary',
					textClass: 'text-white',
					label: 'SUITES',
				};
			default:
				return {
					icon: '🏠',
					badgeClass: 'bg-background-subtle',
					textClass: 'text-text-primary',
					label: roomType?.toUpperCase() ?? 'ROOM',
				};
		}
	};

	const bedType = (bedType: string) => {
		switch (bedType) {
			case 'single':
				return {
					icon: '🛏️',
					badgeClass: 'bg-background-subtle',
					textClass: 'text-text-primary',
					label: 'SINGLE',
				};
			case 'twin':
				return {
					icon: '🛌',
					badgeClass: 'bg-interactive-primary',
					textClass: 'text-white',
					label: 'TWIN',
				};
			case 'double':
				return {
					icon: '🛋️',
					badgeClass: 'bg-interactive-primary/20',
					textClass: 'text-brand-primary',
					label: 'DOUBLE',
				};
			case 'queen':
				return {
					icon: '👑',
					badgeClass: 'bg-feedback-success-DEFAULT',
					textClass: 'text-white',
					label: 'QUEEN',
				};
			case 'king':
				return {
					icon: '👑',
					badgeClass: 'bg-feedback-error-DEFAULT',
					textClass: 'text-white',
					label: 'KING',
				};
			default:
				return {
					icon: '🛏️',
					badgeClass: 'bg-background-subtle',
					textClass: 'text-text-primary',
					label: bedType?.toUpperCase() ?? 'BED',
				};
		}
	};

	return (
		<View className="bg-surface-default rounded-2xl shadow-lg mx-4 mb-6 overflow-hidden border border-border-subtle">
			{/* Room Image with Overlay Gradient */}
			<View className="h-48 bg-neutral-100 relative">
				{item.images && item.images.length > 0 ? (
					<Image
						source={{ uri: getCloudinaryUrl(item.images[0]?.room_image) }}
						className="w-full h-full"
						resizeMode="cover"
						defaultSource={require('@/assets/images/logo.png')}
					/>
				) : (
					<Image
						source={require('@/assets/images/logo.png')}
						className="w-full h-full"
						resizeMode="contain"
					/>
				)}

				{/* Top Row: Status and Discount Badges */}
				<View className="absolute top-4 left-0 right-0 flex-row justify-between items-start px-3">
					{/* Status Badge */}
					<View
						className={`px-4 py-2 rounded-full shadow-md ${
							item.status === 'available'
								? 'bg-feedback-success-DEFAULT'
								: 'bg-feedback-error-DEFAULT'
						}`}
					>
						<StyledText
							variant="montserrat-bold"
							className="text-white text-xs tracking-wider"
						>
							{item.status.toUpperCase()}
						</StyledText>
					</View>

					{/* Discount Badge */}
					{item.discount_percent > 0 && (
						<View className="bg-feedback-error-DEFAULT ml-2 rounded-full px-4 py-2 shadow-md">
							<StyledText
								variant="montserrat-bold"
								className="text-white text-xs tracking-wide"
							>
								-{item.discount_percent}% OFF
							</StyledText>
						</View>
					)}
				</View>

				{/* Rating Badge - Bottom Right of Image */}
				{item.average_rating > 0 && (
					<View className="absolute right-4 mt-2 bg-background-elevated rounded-full px-3 py-2 shadow-lg flex-row items-center border border-border-subtle">
						<StyledText
							variant="montserrat-bold"
							className="text-brand-primary text-base"
						>
							★
						</StyledText>
						<StyledText
							variant="montserrat-bold"
							className="text-brand-primary text-sm ml-1"
						>
							{item.average_rating.toFixed(1)}
						</StyledText>
					</View>
				)}
			</View>

			{/* Room Details */}
			<View className="p-5 bg-background-elevated">
				{/* Room Name */}
				<StyledText
					variant="playfair-bold"
					className="text-text-primary text-3xl mb-2"
					numberOfLines={2}
				>
					{item.room_name}
				</StyledText>

				{/* Description */}
				<StyledText
					variant="montserrat-regular"
					className="text-text-secondary text-sm leading-5 mb-4"
					numberOfLines={3}
				>
					{item.description}
				</StyledText>

				{/* Room Type and Bed Type Row (single-line container) */}
				{(() => {
					const rt = roomType(item.room_type);
					const bt = bedType(item.bed_type);

					return (
						<View className="flex-row items-center mb-3 space-x-3">
							{/* Room Type Badge */}
							<View
								className={`${rt.badgeClass} rounded-xl px-4 py-2 flex-row items-center mr-1`}
							>
								<StyledText
									variant="montserrat-bold"
									className={`${rt.textClass} text-lg mr-2`}
								>
									{rt.icon}
								</StyledText>
								<StyledText
									variant="montserrat-bold"
									className={`${rt.textClass} text-sm`}
								>
									{rt.label}
								</StyledText>
							</View>

							{/* Bed Type Badge */}
							<View
								className={`${bt.badgeClass} rounded-xl px-4 py-2 flex-row items-center ml-1`}
							>
								<StyledText
									variant="montserrat-bold"
									className={`${bt.textClass} text-lg mr-2`}
								>
									{bt.icon}
								</StyledText>
								<StyledText
									variant="montserrat-bold"
									className={`${bt.textClass} text-sm`}
								>
									{bt.label}
								</StyledText>
							</View>
						</View>
					);
				})()}

				{/* Max Guests Info */}
				<View className="flex-row items-center mb-4 bg-background-subtle/20 rounded-lg">
					<Ionicons name="people-outline" size={20} />
					<StyledText
						variant="montserrat-bold"
						className="text-brand-primary text-base ml-2"
					>
						{item.max_guests}{' '}
						{item.max_guests === 1 ? 'person' : 'people'}
					</StyledText>
				</View>

				{/* Divider */}
				<View className="h-px bg-border-subtle mb-4" />

				{/* Pricing and CTA Section */}
				<View className="flex-row items-center justify-between">
					{/* Pricing */}
					<View className="flex-1">
						{item.discounted_price_numeric ? (
							<View>
								<StyledText
									variant="montserrat-regular"
									className="text-text-muted text-xs line-through mb-1"
								>
									{pesoFormatter.format(item.price_per_night)}
								</StyledText>
								<View className="flex-row items-baseline">
									<StyledText
										variant="playfair-bold"
										className="text-brand-primary text-3xl"
									>
										{pesoFormatter.format(
											item.discounted_price_numeric
										)}
									</StyledText>
								</View>
							</View>
						) : (
							<View className="flex-row items-baseline">
								<StyledText
									variant="playfair-bold"
									className="text-brand-primary text-3xl"
								>
									{pesoFormatter.format(item.price_per_night)}
								</StyledText>
							</View>
						)}
					</View>

					{/* View Details Button */}
					<Link
						href={`/(screens)/rooms/${item.id}` as any}
						asChild
						disabled={!!isOffline}
					>
						<TouchableOpacity
							className={`bg-interactive-primary rounded-xl px-4 py-2 shadow-md active:bg-interactive-primary-pressed ${
								isOffline ? 'opacity-50' : ''
							}`}
							activeOpacity={0.8}
						>
							<StyledText
								variant="montserrat-bold"
								className="text-interactive-primary-foreground text-md tracking-wide"
							>
								View Details
							</StyledText>
						</TouchableOpacity>
					</Link>
				</View>
			</View>
		</View>
	);
};

export default RoomCard;
