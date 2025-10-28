import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Animated } from 'react-native';
import { statusFilters } from '@/constants/statuses';
import { Ionicons } from '@expo/vector-icons';

interface StatusFilterProps {
	selectedStatus: string;
	onStatusChange: (status: string) => void;
}

const StatusFilter = ({
	selectedStatus,
	onStatusChange,
}: StatusFilterProps) => {
	const renderStatusFilter = ({
		item,
	}: {
		item: (typeof statusFilters)[0];
	}) => (
		<TouchableOpacity
			onPress={() => onStatusChange(item.value)}
			className="flex-row items-center px-4 py-3 mr-3 rounded-full border shadow-sm"
			style={{
				backgroundColor:
					selectedStatus === item.value ? '#6F00FF' : '#FFFFFF',
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
		<Animated.View
			pointerEvents="box-none"
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: 0,
				zIndex: 50,
			}}
		>
			<View className="py-2">
				<FlatList
					data={statusFilters}
					renderItem={renderStatusFilter}
					keyExtractor={(item) => item.value || 'all'}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 16 }}
				/>
			</View>
		</Animated.View>
	);
};

export default StatusFilter;
