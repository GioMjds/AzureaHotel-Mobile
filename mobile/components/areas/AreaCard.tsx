import { Image, TouchableOpacity, View } from 'react-native';
import { Area } from '@/types/Area.types';
import { pesoFormatter } from '@/utils/formatters';
import { Link } from 'expo-router';
import StyledText from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';

interface AreaCardProps {
	item: Area;
}

const AreaCard = ({ item }: AreaCardProps) => {
	return (
		<View className="bg-surface-default rounded-2xl shadow-lg mx-4 mb-6 overflow-hidden border border-border-subtle">
			{/* Area Image with Overlay Gradient */}
			<View className="h-48 bg-neutral-100 relative">
				{item.images && item.images.length > 0 && (
					<Image
						source={{ uri: item.images[0].area_image }}
						className="w-full h-full"
						resizeMode="cover"
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

			{/* Area Details */}
			<View className="p-5 bg-background-elevated">
				{/* Area Name */}
				<StyledText
					variant="playfair-bold"
					className="text-text-primary text-4xl mb-2"
					numberOfLines={2}
				>
					{item.area_name}
				</StyledText>

				{/* Description */}
				<StyledText
					variant="montserrat-regular"
					className="text-text-secondary text-sm leading-5 mb-4"
					numberOfLines={3}
				>
					{item.description}
				</StyledText>

				{/* Capacity Info */}
				<View className="flex-row items-center mb-4 bg-background-subtle/20 rounded-lg">
					<Ionicons 
						name="people-outline"
						size={20}
					/>
					<StyledText
						variant="montserrat-bold"
						className="text-brand-primary text-base ml-2"
					>
						{item.capacity} {item.capacity === 1 ? 'person' : 'people'}
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
									{pesoFormatter.format(item.price_per_hour_numeric)}
								</StyledText>
								<View className="flex-row items-baseline">
									<StyledText
										variant="playfair-bold"
										className="text-brand-primary text-3xl"
									>
										{pesoFormatter.format(item.discounted_price_numeric)}
									</StyledText>
								</View>
							</View>
						) : (
							<View className="flex-row items-baseline">
								<StyledText
									variant="playfair-bold"
									className="text-brand-primary text-3xl"
								>
									{pesoFormatter.format(item.price_per_hour_numeric)}
								</StyledText>
							</View>
						)}
					</View>

					{/* View Details Button */}
					<Link href={`/(screens)/areas/${item.id}` as any} asChild>
						<TouchableOpacity 
							className="bg-interactive-primary rounded-xl px-4 py-2 shadow-md active:bg-interactive-primary-pressed"
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

export default AreaCard;