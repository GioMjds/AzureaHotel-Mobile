import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Area } from '@/types/Area.types';
import { pesoFormatter } from '@/utils/formatters';
import { Link } from 'expo-router';

interface AreaCardProps {
	item: Area;
}

const AreaCard = ({ item }: AreaCardProps) => {
	return (
		<View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-neutral-200">
			{/* Area Image */}
			<View className="h-48 bg-neutral-100">
				{item.images ? (
					<Image
						source={{ uri: item.images[0].area_image }}
						className="w-full h-full"
						resizeMode="cover"
					/>
				) : (
					<View className="w-full h-full bg-violet-100 justify-center items-center">
						<Text className="text-violet-400 font-montserrat">
							No Image
						</Text>
					</View>
				)}

				{/* Discount Badge */}
				{item.discount_percent > 0 && (
					<View className="absolute top-4 right-4 bg-feedback-error-DEFAULT rounded-full px-3 py-1">
						<Text className="text-white font-montserrat-bold text-md">
							{item.discount_percent}% OFF
						</Text>
					</View>
				)}

				{/* Status Badge */}
				<View className="absolute top-4 left-4">
					<View
						className={`px-3 py-1 rounded-full ${
							item.status === 'available'
								? 'bg-green-500'
								: 'bg-red-500'
						}`}
					>
						<Text className="text-white font-montserrat-bold text-md capitalize">
							{item.status}
						</Text>
					</View>
				</View>
			</View>

			{/* Area Details */}
			<View className="p-4">
				<View className="flex-row justify-between items-start mb-2">
					<Text className="text-4xl font-playfair-bold text-neutral-800 flex-1">
						{item.area_name}
					</Text>
					{/* Rating */}
					{item.average_rating > 0 && (
						<View className="flex-row items-center bg-violet-100 px-3 py-1 rounded-full">
							<Text className="text-violet-700 font-montserrat-bold text-sm">
								★
							</Text>
							<Text className="text-violet-700 font-montserrat-bold text-sm ml-1">
								{item.average_rating.toFixed(1)}
							</Text>
						</View>
					)}
				</View>

				<Text className="text-neutral-600 font-montserrat text-sm mb-3 line-height-5">
					{item.description}
				</Text>

				{/* Capacity */}
				<View className="flex-row items-center mb-3">
					<Text className="text-neutral-600 font-montserrat text-sm">
						Capacity:{' '}
					</Text>
					<Text className="text-violet-600 font-montserrat-bold text-sm">
						{item.capacity} people
					</Text>
				</View>

				{/* Pricing */}
				<View className="flex-row items-center justify-between">
					<View>
						{item.discounted_price_numeric ? (
							<View className="flex-row items-center">
								<Text className="text-neutral-400 font-montserrat text-sm line-through">
									{pesoFormatter.format(item.price_per_hour_numeric)}
								</Text>
								<Text className="text-violet-600 font-black text-2xl ml-2">
									{pesoFormatter.format(item.discounted_price_numeric)}
								</Text>
							</View>
						) : (
							<Text className="text-violet-600 font-black text-2xl">
								{pesoFormatter.format(item.price_per_hour_numeric)}
							</Text>
						)}
					</View>

					<Link href={`/(screens)/areas/${item.id}` as any} asChild>
						<TouchableOpacity className="bg-violet-600 px-6 py-2 rounded-full">
							<Text className="text-white font-montserrat-bold text-sm">
								View Details
							</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</View>
		</View>
	);
};

export default AreaCard;
