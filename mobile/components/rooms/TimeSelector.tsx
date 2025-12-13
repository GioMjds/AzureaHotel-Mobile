import {
	Modal,
	Pressable,
	View,
	FlatList,
	TouchableOpacity,
} from 'react-native';
import StyledText from '@/components/ui/StyledText';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';

interface Props {
	visible: boolean;
	value?: string | null;
	onSelect: (time: string) => void;
	onClose: () => void;
}

function generateTimes(startHour = 14, endHour = 23, stepMinutes = 30) {
	const times: Date[] = [];
	const base = new Date();
	let current = setMinutes(setHours(new Date(base), startHour), 0);

	const end = setMinutes(setHours(new Date(base), endHour), 0);

	while (current <= end) {
		times.push(new Date(current));
		current = addMinutes(current, stepMinutes);
	}

	return times;
}

export default function TimeSelector({
	visible,
	value,
	onSelect,
	onClose,
}: Props) {
	const times = generateTimes(14, 23, 30);

	const renderItem = ({ item }: { item: Date }) => {
		const label = format(item, 'hh:mm a');
		const selected = value === label;

		return (
			<TouchableOpacity
				onPress={() => {
					onSelect(label);
				}}
				activeOpacity={0.7}
				className={`py-3 px-4 rounded-xl my-1 ${selected ? 'bg-interactive-primary' : 'bg-background-elevated'}`}
			>
				<StyledText
					className={`${selected ? 'text-interactive-primary-foreground' : 'text-text-primary'} text-lg text-center`}
				>
					{label}
				</StyledText>
			</TouchableOpacity>
		);
	};

	return (
		<Modal
			transparent
			visible={visible}
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable
				className="flex-1 justify-end"
				style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
				onPress={onClose}
			>
				<Pressable
					onPress={(e: any) => e.stopPropagation()}
					className="bg-background-elevated rounded-t-3xl p-4 w-full"
					style={{ maxHeight: '50%', alignSelf: 'stretch' }}
				>
					<View className="flex-row items-center justify-between mb-3">
						<StyledText
							variant="montserrat-bold"
							className="text-text-primary text-lg"
						>
							Select arrival time
						</StyledText>
						<TouchableOpacity
							onPress={onClose}
							className="px-2 py-1"
						>
							<StyledText className="text-text-secondary">
								Close
							</StyledText>
						</TouchableOpacity>
					</View>

					<FlatList
						data={times}
						keyExtractor={(d) => d.toISOString()}
						renderItem={renderItem}
						contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 8 }}
						showsVerticalScrollIndicator={false}
					/>
				</Pressable>
			</Pressable>
		</Modal>
	);
}
