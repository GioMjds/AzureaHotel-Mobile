import { useQuery } from '@tanstack/react-query';
import {
	addMonths,
	differenceInCalendarDays,
	eachDayOfInterval,
	endOfMonth,
	format,
	isBefore,
	isSameDay,
	parseISO,
	startOfDay,
	startOfMonth,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Image,
} from 'react-native';
import useAuthStore from '@/store/AuthStore';
import useAlertStore from '@/store/AlertStore';
import { GetAreaById, GetAreaBookings } from '@/types/Area.types';
import { calculateAreaPricing } from '@/utils/pricing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { booking } from '@/services/Booking';
import StyledAlert from '@/components/ui/StyledAlert';

interface BookingsByDate {
	[date: string]: {
		status: string;
		bookingId: number;
		unavailableTimes?: {
			start_time: string;
			end_time: string;
			status: string;
		}[];
	};
}

export default function AreaBookingCalendar() {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({});
	const [price, setPrice] = useState<number>(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Styled alert state/helper
	const { alertConfig, setAlertConfig } = useAlertStore();

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
	}) => {
		setAlertConfig({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK' }],
		});
	};

	const { user } = useAuthStore();
	const { areaId } = useLocalSearchParams<{ areaId: string }>();
	const router = useRouter();

	const isVerifiedUser = user?.is_verified === 'verified';
	const lastBookingDay = user?.last_booking_date;
	const daysSinceLastBooking = lastBookingDay
		? differenceInCalendarDays(
				startOfDay(new Date()),
				new Date(lastBookingDay)
			)
		: Infinity;

	const isBookingLocked = !isVerifiedUser && daysSinceLastBooking === 0;

	const { data: areaResponse, isLoading: isLoadingArea } = useQuery<{
		data: GetAreaById;
	}>({
		queryKey: ['area', areaId],
		queryFn: () => booking.getAreaById(areaId!),
		enabled: !!areaId,
		refetchInterval: 60000,
	});

	const areaData = areaResponse?.data;

	const { data: bookingsData, isLoading: isLoadingBookings } = useQuery<{
		data: GetAreaBookings[];
	}>({
		queryKey: ['areaBookings', areaId, currentMonth],
		queryFn: async () => {
			const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
			const endDate = format(
				endOfMonth(addMonths(currentMonth, 1)),
				'yyyy-MM-dd'
			);
			return await booking.getAreaBookings(areaId!, startDate, endDate);
		},
		enabled: !!areaId,
		refetchInterval: 60000,
	});

	useEffect(() => {
		if (bookingsData?.data) {
			const newBookingsByDate: BookingsByDate = {};

			bookingsData.data.forEach((booking) => {
				const dateString = format(
					parseISO(booking.check_in_date),
					'yyyy-MM-dd'
				);

				if (!newBookingsByDate[dateString]) {
					newBookingsByDate[dateString] = {
						status: booking.status,
						bookingId: booking.id,
						unavailableTimes: [],
					};
				}

				if (booking.start_time && booking.end_time) {
					newBookingsByDate[dateString]?.unavailableTimes?.push({
						start_time: booking.start_time,
						end_time: booking.end_time,
						status: booking.status,
					});
				}
			});

			setBookingsByDate(newBookingsByDate);
		}
	}, [bookingsData]);

	useEffect(() => {
		if (areaData) {
			const userForPricing = user
				? { ...user, username: user.email || `user_${user.id}` }
				: null;

			const areaForPricing = {
				...areaData,
				price_per_hour: areaData.price_per_hour || '0',
				discounted_price: areaData.discounted_price || undefined,
				senior_discounted_price:
					areaData.senior_discounted_price || undefined,
			};

			const pricingResult = calculateAreaPricing({
				areaData: areaForPricing as any,
				userDetails: userForPricing as any,
				hours: 1,
			});
			setPrice(pricingResult.finalPrice);
		}
	}, [areaData, user]);

	const isDateBooked = (date: Date): boolean => {
		const dateString = format(date, 'yyyy-MM-dd');
		const booking = bookingsByDate[dateString];

		if (booking && booking.status) {
			const status = booking.status.toLowerCase();
			return ['checked_in', 'reserved'].includes(status);
		}

		return false;
	};

	const getDateStatus = (date: Date): string | null => {
		const dateString = format(date, 'yyyy-MM-dd');
		return bookingsByDate[dateString]?.status || null;
	};

	const isDateUnavailable = (date: Date) => {
		const todayStart = startOfDay(new Date());
		const now = new Date();

		if (isBefore(date, todayStart)) return true;
		if (isSameDay(date, now) && now.getHours() >= 17) return true;

		return isDateBooked(date);
	};

	const handleDateClick = (date: Date) => {
		if (isDateUnavailable(date)) {
			showStyledAlert({ title: 'Date Unavailable', message: 'This date is not available for booking.', type: 'warning' });
			return;
		}
		setSelectedDate(date);
		setErrorMessage(null);
	};

	const getDateCellClass = (date: Date) => {
		const isUnavailable = isDateUnavailable(date);
		const isSelected = selectedDate && isSameDay(date, selectedDate);
		const dateStatus = getDateStatus(date);

		if (isSelected) return 'bg-violet-primary rounded-full';
		if (isUnavailable) return 'bg-neutral-300 rounded-full';

		if (
			dateStatus &&
			['reserved', 'checked_in'].includes(dateStatus.toLowerCase())
		) {
			switch (dateStatus.toLowerCase()) {
				case 'reserved':
					return 'bg-feedback-success-light border-2 border-feedback-success-DEFAULT rounded-full';
				case 'checked_in':
					return 'bg-feedback-info-light border-2 border-feedback-info-DEFAULT rounded-full';
				default:
					return 'bg-neutral-300 rounded-full';
			}
		}

		return 'bg-surface-default border border-border-focus rounded-full';
	};

	const getDateTextClass = (date: Date) => {
		const isUnavailable = isDateUnavailable(date);
		const isSelected = selectedDate && isSameDay(date, selectedDate);

		if (isSelected) return 'text-text-inverse font-montserrat-bold';
		if (isUnavailable) return 'text-neutral-500 font-montserrat';

		const dateStatus = getDateStatus(date);
		if (
			dateStatus &&
			['reserved', 'checked_in'].includes(dateStatus.toLowerCase())
		) {
			switch (dateStatus.toLowerCase()) {
				case 'reserved':
					return 'text-feedback-success-dark font-montserrat-bold';
				case 'checked_in':
					return 'text-feedback-info-dark font-montserrat-bold';
				default:
					return 'text-neutral-500 font-montserrat';
			}
		}

		return 'text-text-primary font-montserrat';
	};

	const isTodayUnavailable = () => {
		const now = new Date();
		return now.getHours() >= 17 && isSameDay(now, new Date());
	};

	const handleProceed = () => {
		if (!selectedDate || !areaData) {
			showStyledAlert({ title: 'Selection Required', message: 'Please select a date to proceed.', type: 'warning' });
			return;
		}

		if (isBookingLocked) {
			showStyledAlert({ title: 'Booking Limit Reached', message: 'Daily booking limit reached. Verify your ID to book multiple stays.', type: 'warning' });
			return;
		}

		const dateStr = format(selectedDate, 'yyyy-MM-dd');
		const startTime = `${dateStr}`;
		const endTime = `${dateStr}T17:00:00`;

		router.push({
			pathname: './confirm',
			params: {
				areaId: areaId,
				startTime: startTime,
				endTime: endTime,
				totalPrice: price.toString(),
			},
		});
	};

	const renderPriceDisplay = () => {
		if (!areaData) return null;

		const isSeniorOrPwd = user?.is_senior_or_pwd;
		const parsePrice = (val: string | number | null | undefined) => {
			if (!val) return null;
			if (typeof val === 'number') return val;
			if (typeof val === 'string') {
				return parseFloat(val.replace(/[^\d.]/g, ''));
			}
			return null;
		};

		const originalPrice = parsePrice(areaData.price_per_hour) || 0;
		const adminDiscounted = parsePrice(areaData.discounted_price);
		const seniorDiscounted = parsePrice(areaData.senior_discounted_price);

		let displayDiscountedPrice: number | null = null;
		let displayDiscountPercent = 0;

		if (isSeniorOrPwd) {
			const availableDiscounts = [];
			if (adminDiscounted !== null && adminDiscounted < originalPrice) {
				availableDiscounts.push({
					price: adminDiscounted,
					percent: areaData.discount_percent ?? 0,
				});
			}
			if (seniorDiscounted !== null && seniorDiscounted < originalPrice) {
				availableDiscounts.push({
					price: seniorDiscounted,
					percent: 20,
				});
			}
			if (availableDiscounts.length > 0) {
				const bestDiscount = availableDiscounts.reduce((best, current) =>
					current.price < best.price ? current : best
				);
				displayDiscountedPrice = bestDiscount.price;
				displayDiscountPercent = bestDiscount.percent;
			}
		} else {
			if (adminDiscounted !== null && adminDiscounted < originalPrice) {
				displayDiscountedPrice = adminDiscounted;
				displayDiscountPercent = areaData.discount_percent ?? 0;
			}
		}

		if (displayDiscountedPrice !== null) {
			return (
				<>
					<Text className="text-neutral-500 line-through text-2xl font-montserrat">
						₱{originalPrice.toLocaleString()}
					</Text>
					<View className="flex-row items-center">
						<Text className="text-text-secondary font-montserrat-bold text-xl">
							₱{displayDiscountedPrice.toLocaleString()}
						</Text>
						<Text className="text-feedback-success-DEFAULT font-montserrat-bold text-sm ml-1">
							-{displayDiscountPercent}% OFF
						</Text>
					</View>
				</>
			);
		} else {
			return (
				<Text className="text-text-secondary font-montserrat-bold text-2xl">
					₱{originalPrice.toLocaleString()}
				</Text>
			);
		}
	};

	const renderCalendarLegend = () => (
		<View className="border-t border-border-focus pt-4">
			<Text className="text-text-primary font-montserrat-bold mb-3">
				CALENDAR LEGEND
			</Text>
			<View className="flex-row flex-wrap">
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-surface-default border border-border-strong rounded-full mr-2" />
					<Text className="text-text-primary font-montserrat text-sm">
						Available
					</Text>
				</View>
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-violet-primary rounded-full mr-2" />
					<Text className="text-text-primary font-montserrat text-sm">
						Selected
					</Text>
				</View>
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-neutral-300 rounded-full mr-2" />
					<Text className="text-text-primary font-montserrat text-sm">
						Unavailable
					</Text>
				</View>
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-feedback-success-light border-2 border-feedback-success-DEFAULT rounded-full mr-2" />
					<Text className="text-text-primary font-montserrat text-sm">
						Reserved
					</Text>
				</View>
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-feedback-info-light border-2 border-feedback-info-DEFAULT rounded-full mr-2" />
					<Text className="text-text-primary font-montserrat text-sm">
						Checked In
					</Text>
				</View>
			</View>
		</View>
	);

	const renderCalendarMonth = (month: Date) => {
		const monthStart = startOfMonth(month);
		const monthEnd = endOfMonth(month);
		const days = eachDayOfInterval({
			start: monthStart,
			end: monthEnd,
		});
		const startWeekday = monthStart.getDay();

		const calendarDays = [];
		for (let i = 0; i < startWeekday; i++) {
			calendarDays.push(null);
		}
		calendarDays.push(...days);

		return (
			<View key={`month-${format(month, 'yyyy-MM')}`} className="mb-2">
				<View className="flex-row flex-wrap">
					{calendarDays.map((day, index) => (
						<View
							key={`${format(month, 'yyyy-MM')}-cell-${index}`}
							className="w-[14.28%] aspect-square p-1"
						>
							{day ? (
								<TouchableOpacity
									className={`flex-1 items-center justify-center rounded-full ${getDateCellClass(day)}`}
									onPress={() => handleDateClick(day)}
									disabled={isDateUnavailable(day)}
								>
									<Text className={`text-sm ${getDateTextClass(day)}`}>
										{format(day, 'd')}
									</Text>
								</TouchableOpacity>
							) : (
								<View className="flex-1" />
							)}
						</View>
					))}
				</View>
			</View>
		);
	};

	const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
	const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

	if (isLoadingArea || isLoadingBookings) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<Text className="text-text-primary font-montserrat mt-4">
					Loading venue details...
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-surface-default">
			{/* Header */}
			<View className="bg-surface-default px-4 py-2 border-b border-border-focus">
				<View className="flex-row items-center justify-between">
					<TouchableOpacity
						onPress={() => router.back()}
						className="flex-row items-center p-2"
					>
						<Ionicons name="arrow-back" size={24} color="#3B0270" />
					</TouchableOpacity>
					<Text className="text-text-primary font-playfair-semibold text-3xl text-center">
						Book Your Area
					</Text>
					<View className="w-10" />
				</View>
			</View>
			<ScrollView className="flex-1 bg-background-default">
				<View className="p-6">
					{/* Area Info Card */}
					{areaData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-focus">
							<Image
								source={{ uri: areaData.images[0].area_image }}
								className="w-full h-48"
								resizeMode="cover"
							/>

							<View className="p-4">
								<View className="flex-row justify-between items-start mb-3">
									<Text className="text-text-primary font-playfair-semibold text-4xl flex-1 mr-2">
										{areaData.area_name}
									</Text>

									{/* Price Display */}
									<View className="items-end">
										{renderPriceDisplay()}
									</View>
								</View>

								<View className="flex-row items-center mb-2">
									<Ionicons
										name="people-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										Capacity: {areaData.capacity} pax
									</Text>
								</View>

								<View className="flex-row items-center">
									<Ionicons
										name="time-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										9 hours (8:00 AM - 5:00 PM)
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Error Messages */}
					{errorMessage && (
						<View className="bg-feedback-error-light border border-feedback-error-DEFAULT rounded-2xl p-4 mb-6">
							<Text className="text-feedback-error-dark font-montserrat">
								{errorMessage}
							</Text>
						</View>
					)}

					{isBookingLocked && (
						<View className="bg-feedback-error-light border border-feedback-error-DEFAULT rounded-2xl p-4 mb-6">
							<Text className="text-feedback-error-dark font-montserrat">
								⚠️ Daily booking limit reached. Verify your ID
								to book multiple stays.
							</Text>
						</View>
					)}

					{isTodayUnavailable() && (
						<View className="bg-feedback-warning-light border border-feedback-warning-DEFAULT rounded-2xl p-4 mb-6">
							<Text className="text-feedback-warning-dark font-montserrat">
								⚠️ Today&apos;s date is unavailable for new
								bookings after 5:00 PM.
							</Text>
						</View>
					)}

					{/* Calendar Section */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-focus">
						<Text className="text-text-primary text-center font-playfair-bold text-3xl mb-4">
							Select Booking Date
						</Text>

						{/* Calendar Controls */}
						<View className="flex-row justify-between items-center mb-4">
							<TouchableOpacity
								onPress={prevMonth}
								className="p-2"
							>
								<Text className="text-text-secondary font-montserrat-bold text-3xl">
									‹
								</Text>
							</TouchableOpacity>

							<Text className="text-text-primary font-playfair-bold text-3xl">
								{format(currentMonth, 'MMMM yyyy')}
							</Text>

							<TouchableOpacity
								onPress={nextMonth}
								className="p-2"
							>
								<Text className="text-text-secondary font-montserrat-bold text-3xl">
									›
								</Text>
							</TouchableOpacity>
						</View>

						{/* Calendar Grid */}
						<View className="mb-2">
							<View className="flex-row justify-between mb-2">
								{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
									(day, dayIndex) => (
										<View key={`weekday-${dayIndex}-${day}`} className="flex-1">
											<Text className="text-text-muted font-montserrat-bold text-center">
												{day}
											</Text>
										</View>
									)
								)}
							</View>

							{renderCalendarMonth(currentMonth)}
						</View>

						{/* Calendar Legend */}
						{renderCalendarLegend()}
					</View>

					{/* Proceed Button */}
					<TouchableOpacity
						onPress={handleProceed}
						disabled={!selectedDate || isBookingLocked}
						className={`rounded-2xl py-4 px-6 mb-8 ${
							selectedDate && !isBookingLocked
								? 'bg-violet-primary'
								: 'bg-neutral-300'
						}`}
					>
						<Text
							className={`text-center font-montserrat-bold text-lg ${
								selectedDate && !isBookingLocked
									? 'text-text-inverse'
									: 'text-neutral-500'
							}`}
						>
							Proceed to Booking
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Global Styled Alert */}
			<StyledAlert
				visible={alertConfig.visible}
				type={alertConfig.type}
				title={alertConfig.title}
				message={alertConfig.message}
				buttons={alertConfig.buttons}
				onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
			/>
		</SafeAreaView>
	);
};
