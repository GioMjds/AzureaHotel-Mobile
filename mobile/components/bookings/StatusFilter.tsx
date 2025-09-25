import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { statusFilters } from '@/constants/statuses';
import { Ionicons } from '@expo/vector-icons';

interface StatusFilterProps {
	selectedStatus: string;
	onStatusChange: (status: string) => void;
}

const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
	const renderStatusFilter = ({ item }: { item: typeof statusFilters[0] }) => (
		<TouchableOpacity
			onPress={() => onStatusChange(item.value)}
			className="flex-row items-center px-4 py-3 mr-3 rounded-full border shadow-sm"
			style={{
				backgroundColor: selectedStatus === item.value ? '#6F00FF' : '#FFFFFF',
			}}
		>
			<Ionicons 
				name={item.icon as any} 
				size={16} 
				color={selectedStatus === item.value ? '#FFF1F1' : '#6F00FF'} 
				style={{ marginRight: 8 }}
			/>
			<Text
				className={`font-montserrat-bold text-sm ${
					selectedStatus === item.value 
						? 'text-interactive-primary-foreground' 
						: 'text-text-secondary'
				}`}
			>
				{item.label}
			</Text>
		</TouchableOpacity>
	);

	return (
		<View className="py-4 bg-background-elevated border-b border-border-subtle">
			<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide px-6 mb-3">
				Filter by Status
			</Text>
			<FlatList
				data={statusFilters}
				renderItem={renderStatusFilter}
				keyExtractor={(item) => item.value || 'all'}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 16 }}
			/>
		</View>
	);
};

export default StatusFilter;
