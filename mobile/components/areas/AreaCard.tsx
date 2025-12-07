import { TouchableOpacity, View, Image } from 'react-native';
import { Area } from '@/types/Area.types';
import { pesoFormatter } from '@/utils/formatters';
import { getCloudinaryUrl } from '@/utils/cloudinary';
import { Link } from 'expo-router';
import StyledText from '@/components/ui/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../NetworkProvider';
import useAuthStore from '@/store/AuthStore';

interface AreaCardProps {
	item: Area;
}

const PWD_DISCOUNT_PERCENT = 20;

const AreaCard = ({ item }: AreaCardProps) => {
	const { isOffline } = useNetwork();
	const user = useAuthStore((s) => s.user);

	const isEligibleForPwdDiscount = user?.is_verified === 'verified' && user?.is_senior_or_pwd === true;

	const getBestDiscount = () => {
		const adminDiscountPrice = item.discounted_price_numeric;
		const pwdDiscountPrice = item.senior_discounted_price;

		if (adminDiscountPrice && item.discount_percent > PWD_DISCOUNT_PERCENT) {
			return {
				finalPrice: adminDiscountPrice,
				discountPercent: item.discount_percent,
				hasDiscount: true,
				discountLabel: `${item.discount_percent}% OFF`,
			};
		}
		
		// PWD discount is only available for verified PWD/Senior users
		if (isEligibleForPwdDiscount && pwdDiscountPrice) {
			return {
				finalPrice: pwdDiscountPrice,
				discountPercent: PWD_DISCOUNT_PERCENT,
				hasDiscount: true,
				discountLabel: `${PWD_DISCOUNT_PERCENT}% PWD`,
			};
		}

		// Fallback to admin discount if it exists (but is <= PWD discount)
		if (adminDiscountPrice && item.discount_percent > 0) {
			return {
				finalPrice: adminDiscountPrice,
				discountPercent: item.discount_percent,
				hasDiscount: true,
				discountLabel: `${item.discount_percent}% OFF`,
			};
		}
		
		return {
			finalPrice: item.price_per_hour_numeric,
			discountPercent: 0,
			hasDiscount: false,
			discountLabel: '',
		};
	};

	const bestDiscount = getBestDiscount();

	return (
		<View className="bg-surface-default rounded-2xl shadow-lg mx-4 mb-6 overflow-hidden border border-border-subtle">
			{/* Area Image with Overlay Gradient */}
			<View className="h-48 bg-neutral-100 relative">
				{item.images && item.images.length > 0 ? (
					<Image
						source={{ uri: getCloudinaryUrl(item.images[0]?.area_image) }}
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
					{bestDiscount.hasDiscount && (
						<View className={`ml-2 rounded-full px-4 py-2 shadow-md ${bestDiscount.discountPercent === PWD_DISCOUNT_PERCENT ? 'bg-feedback-info-DEFAULT' : 'bg-feedback-error-DEFAULT'}`}>
							<StyledText
								variant="montserrat-bold"
								className="text-white text-xs tracking-wide"
							>
								-{bestDiscount.discountLabel}
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
					className="text-text-primary text-3xl mb-2"
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
					<Ionicons name="people-outline" size={20} />
					<StyledText
						variant="montserrat-bold"
						className="text-brand-primary text-base ml-2"
					>
						{item.capacity}{' '}
						{item.capacity === 1 ? 'person' : 'people'}
					</StyledText>
				</View>

				{/* Divider */}
				<View className="h-px bg-border-subtle mb-4" />

				{/* Pricing and CTA Section */}
				<View className="flex-row items-center justify-between">
					{/* Pricing */}
					<View className="flex-1">
						{bestDiscount.hasDiscount ? (
							<View>
								<StyledText
									variant="montserrat-regular"
									className="text-text-muted text-xs line-through mb-1"
								>
									{pesoFormatter.format(
										item.price_per_hour_numeric
									)}
								</StyledText>
								<View className="flex-row items-baseline">
									<StyledText
										variant="playfair-bold"
										className="text-brand-primary text-3xl"
									>
										{pesoFormatter.format(
											bestDiscount.finalPrice
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
									{pesoFormatter.format(
										item.price_per_hour_numeric
									)}
								</StyledText>
							</View>
						)}
					</View>

					{/* View Details Button */}
					<Link
						href={`/(screens)/areas/${item.id}` as any}
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

export default AreaCard;
