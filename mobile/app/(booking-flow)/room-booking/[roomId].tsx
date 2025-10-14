import { useQuery } from '@tanstack/react-query';
import {
	addMonths,
	differenceInCalendarDays,
	eachDayOfInterval,
	endOfMonth,
	format,
	isBefore,
	isEqual,
	isSameDay,
	isWithinInterval,
	parseISO,
	startOfDay,
	startOfMonth,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Image,
} from 'react-native';
import useAuthStore from '@/store/AuthStore';
import { GetRoomById, GetRoomBookings } from '@/types/Room.types';
import { calculateRoomPricing, formatPrice } from '@/utils/pricing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { booking } from '@/services/Booking';

interface BookingsByDate {
	[date: string]: {
		status: string;
		bookingId: number;
	};
}

export default function RoomBookingCalendar() {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [checkInDate, setCheckInDate] = useState<Date | null>(null);
	const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
	const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
	const [numberOfNights, setNumberOfNights] = useState<number>(1);
	const [totalPrice, setTotalPrice] = useState<number>(0);
	const [bookingsByDate, setBookingsByDate] = useState<BookingsByDate>({});
	const [hasConflict, setHasConflict] = useState<boolean>(false);
	const [conflictMessage, setConflictMessage] = useState<string | null>(null);
	const [isSameDayBooking, setIsSameDayBooking] = useState<boolean>(false);
	const [maxDayExceed, setMaxDayExceed] = useState<boolean>(false);

	const { user } = useAuthStore();
	const { roomId } = useLocalSearchParams<{ roomId: string }>();
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

	const { data: roomResponse, isLoading: isLoadingRoom } = useQuery<{
		data: GetRoomById;
	}>({
		queryKey: ['room', roomId],
		queryFn: () => booking.getRoomById(roomId!),
		enabled: !!roomId,
		refetchInterval: 60000,
	});

	const roomData = roomResponse?.data;

	const { data: bookingsData, isLoading: isLoadingBookings } = useQuery<{
		data: GetRoomBookings[];
	}>({
		queryKey: ['roomBookings', roomId, currentMonth],
		queryFn: async () => {
			const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
			const endDate = format(
				endOfMonth(currentMonth),
				'yyyy-MM-dd'
			);
			return await booking.getRoomBookings(roomId!, startDate, endDate);
		},
		enabled: !!roomId,
		refetchInterval: 60000,
	});

	useEffect(() => {
		if (bookingsData?.data) {
			const newBookingsByDate: BookingsByDate = {};

			bookingsData.data.forEach(booking => {
				const checkInDate = parseISO(booking.check_in_date);
				const checkOutDate = parseISO(booking.check_out_date);

				const datesInRange = eachDayOfInterval({ start: checkInDate, end: checkOutDate });

				datesInRange.forEach(date => {
					const dateString = format(date, 'yyyy-MM-dd');
					newBookingsByDate[dateString] = {
						status: booking.status,
						bookingId: booking.id
					};
				});
			});

			setBookingsByDate(newBookingsByDate);
		}
	}, [bookingsData]);

	useEffect(() => {
		if (checkInDate && checkOutDate) {
			const sameDayBooking = isSameDay(checkInDate, checkOutDate);
			setIsSameDayBooking(sameDayBooking);
		} else {
			setIsSameDayBooking(false);
		}
	}, [checkInDate, checkOutDate]);

	useEffect(() => {
		if (checkInDate && checkOutDate && bookingsData?.data) {
			const hasOverlap = bookingsData.data.some(booking => {
				if (!['reserved', 'confirmed', 'checked_in'].includes(booking.status.toLowerCase())) return false;

				const existingCheckIn = parseISO(booking.check_in_date);
				const existingCheckOut = parseISO(booking.check_out_date);

				if (isSameDay(checkOutDate, existingCheckIn)) return false;

				const hasDateOverlap = (
					checkInDate < existingCheckOut &&
					existingCheckIn < checkOutDate
				);

				return hasDateOverlap;
			});

			setHasConflict(hasOverlap);
			setConflictMessage(hasOverlap ? "Selected dates overlap with an existing booking. Please choose different dates." : null);
		} else {
			setHasConflict(false);
			setConflictMessage(null);
		}
	}, [checkInDate, checkOutDate, bookingsData]);

	useEffect(() => {
		if (checkInDate && checkOutDate && roomData) {
			const days = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
			setNumberOfNights(days);

			setMaxDayExceed(days > 30);

			const userForPricing = user
				? { ...user, username: user.email || `user_${user.id}` }
				: null;

			const pricingResult = calculateRoomPricing({
				roomData: roomData as any,
				userDetails: userForPricing as any,
				nights: days
			});

			setTotalPrice(pricingResult.totalPrice);
		}
	}, [checkInDate, checkOutDate, roomData, user]);

	const isDateBooked = useCallback((date: Date): boolean => {
		const dateString = format(date, 'yyyy-MM-dd');
		const booking = bookingsByDate[dateString];

		if (booking && booking.status) {
			const status = booking.status.toLowerCase();
			return ['checked_in', 'reserved'].includes(status);
		}

		return false;
	}, [bookingsByDate]);

	const getDateStatus = useCallback((date: Date): string | null => {
		const dateString = format(date, 'yyyy-MM-dd');
		return bookingsByDate[dateString]?.status || null;
	}, [bookingsByDate]);

	const isDateUnavailable = useCallback((date: Date, isCheckout = false) => {
		if (isBefore(date, startOfDay(new Date()))) return true;

		if (isCheckout) {
			const dateString = format(date, 'yyyy-MM-dd');
			const booking = bookingsByDate[dateString];

			if (booking && ['checked_in', 'reserved'].includes(booking.status.toLowerCase())) return true;
			return false;
		}

		return isDateBooked(date);
	}, [isDateBooked, bookingsByDate]);

	const handleDateClick = (date: Date) => {
		if (!checkInDate || (checkInDate && checkOutDate)) {
			if (isDateUnavailable(date)) {
				Alert.alert('Date Unavailable', 'This date is not available for booking.');
				return;
			}

			setCheckInDate(date);
			setCheckOutDate(null);
		} else {
			if (isDateUnavailable(date, true)) {
				Alert.alert('Date Unavailable', 'This date is not available for checkout.');
				return;
			}

			if (isBefore(date, checkInDate)) {
				setCheckOutDate(checkInDate);
				setCheckInDate(date);
			} else {
				setCheckOutDate(date);
			}
		}

		if (checkInDate && checkOutDate) {
			const daysBetween = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
			if (daysBetween > 30) {
				setMaxDayExceed(true);
				return;
			}
		}
	};

	const isDateInRange = (date: Date) => {
		if (checkInDate && checkOutDate) return isWithinInterval(date, { start: checkInDate, end: checkOutDate });
		if (checkInDate && hoveredDate && !checkOutDate) {
			if (isBefore(hoveredDate, checkInDate)) {
				return isWithinInterval(date, { start: hoveredDate, end: checkInDate });
			} else {
				return isWithinInterval(date, { start: checkInDate, end: hoveredDate });
			}
		}
		return false;
	};

	const getDateCellClass = (date: Date) => {
		const isCheckout = checkInDate !== null && checkOutDate === null;
		const isUnavailable = isDateUnavailable(date, isCheckout);
		const dateStatus = getDateStatus(date);
		const isBooked = dateStatus && ['reserved', 'checked_in'].includes(dateStatus.toLowerCase());

		const isToday = isEqual(date, startOfDay(new Date()));
		const isCheckinDate = checkInDate && isEqual(date, checkInDate);
		const isCheckoutDate = checkOutDate && isEqual(date, checkOutDate);
		const isInRange = !isDateUnavailable(date, true) && isDateInRange(date);

		if (isBooked) {
			switch (dateStatus?.toLowerCase()) {
				case 'reserved':
					return 'bg-feedback-success-light border-2 border-feedback-success-DEFAULT';
				case 'checked_in':
					return 'bg-feedback-info-light border-2 border-feedback-info-DEFAULT';
				default:
					return 'bg-neutral-300';
			}
		}

		if (isCheckinDate || isCheckoutDate) return 'bg-violet-primary';
		if (isInRange) return 'bg-violet-primary';
		if (isUnavailable) return 'bg-neutral-300';
		if (isToday && !isUnavailable) return 'border-2 border-violet-primary bg-surface-default';
		return 'bg-surface-default border border-border-default';
	};

	const getDateTextClass = (date: Date) => {
		const isCheckout = checkInDate !== null && checkOutDate === null;
		const isUnavailable = isDateUnavailable(date, isCheckout);
		const dateStatus = getDateStatus(date);
		const isBooked = dateStatus && ['reserved', 'checked_in'].includes(dateStatus.toLowerCase());

		const isCheckinDate = checkInDate && isEqual(date, checkInDate);
		const isCheckoutDate = checkOutDate && isEqual(date, checkOutDate);
		const isInRange = !isDateUnavailable(date, true) && isDateInRange(date);

		if (isCheckinDate || isCheckoutDate || isInRange) return 'text-text-inverse font-montserrat-bold';
		if (isBooked) {
			switch (dateStatus?.toLowerCase()) {
				case 'reserved':
					return 'text-feedback-success-dark font-montserrat-bold';
				case 'checked_in':
					return 'text-feedback-info-dark font-montserrat-bold';
				default:
					return 'text-neutral-500 font-montserrat';
			}
		}
		if (isUnavailable) return 'text-neutral-500 font-montserrat';
		return 'text-text-primary font-montserrat';
	};

	const handleProceed = () => {
		if (checkInDate && checkOutDate && numberOfNights > 0 && !hasConflict && !isSameDayBooking && !maxDayExceed && !isBookingLocked) {
			router.push({
				pathname: './confirm',
				params: {
					roomId: roomId,
					checkInDate: format(checkInDate, "yyyy-MM-dd"),
					checkOutDate: format(checkOutDate, "yyyy-MM-dd"),
					totalPrice: totalPrice.toString(),
				},
			});
		} else {
			Alert.alert('Invalid Selection', 'Please select valid check-in and check-out dates.');
		}
	};

	const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
	const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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
			<View key={`month-${format(month, 'yyyy-MM')}`} className="mb-4">
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
									onPressIn={() => setHoveredDate(day)}
									onPressOut={() => setHoveredDate(null)}
									disabled={isDateUnavailable(day, checkInDate !== null && checkOutDate === null)}
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

	const renderCalendarLegend = () => (
		<View className="border-t border-border-default pt-4">
			<Text className="text-text-primary font-montserrat-bold mb-3">
				CALENDAR LEGEND
			</Text>
			<View className="flex-row flex-wrap">
				<View className="flex-row items-center w-1/2 mb-2">
					<View className="w-4 h-4 bg-surface-default border border-border-default rounded-full mr-2" />
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

	const renderRoomCardPriceDisplay = () => {
		if (!roomData) return null;

		const isSeniorOrPwd = user?.is_senior_or_pwd;
		const parsePrice = (val: string | number | null | undefined) => {
			if (!val) return null;
			if (typeof val === 'number') return val;
			if (typeof val === 'string') {
				const parsed = parseFloat(val);
				return isNaN(parsed) ? null : parsed;
			}
			return null;
		};

		const originalPrice = parsePrice(roomData.price_per_night || roomData.room_price) || 0;
		const adminDiscounted = parsePrice(roomData.discounted_price_numeric || roomData.discounted_price);
		const seniorDiscounted = parsePrice(roomData.senior_discounted_price);

		let displayDiscountedPrice: number | null = null;
		let displayDiscountPercent = 0;

		if (isSeniorOrPwd) {
			const availableDiscounts = [];
			if (adminDiscounted !== null && adminDiscounted < originalPrice) {
				availableDiscounts.push({
					price: adminDiscounted,
					percent: Math.round(((originalPrice - adminDiscounted) / originalPrice) * 100),
				});
			}
			if (seniorDiscounted !== null && seniorDiscounted < originalPrice) {
				availableDiscounts.push({
					price: seniorDiscounted,
					percent: Math.round(((originalPrice - seniorDiscounted) / originalPrice) * 100),
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
				displayDiscountPercent = Math.round(((originalPrice - adminDiscounted) / originalPrice) * 100);
			}
		}

		if (displayDiscountedPrice !== null) {
			return (
				<View className="mt-3 pt-3 border-t border-border-subtle">
					<View className="flex-row justify-between items-center mb-1">
						<Text className="text-neutral-500 line-through text-lg font-montserrat">
							{formatPrice(originalPrice)}/night
						</Text>
						<View className="bg-feedback-success-light px-2 py-1 rounded-full">
							<Text className="text-feedback-success-dark font-montserrat-bold text-sm">
								{displayDiscountPercent}% OFF
							</Text>
						</View>
					</View>
					<View className="flex-row justify-between items-baseline">
						<Text className="text-text-primary font-playfair-bold text-3xl">
							{formatPrice(displayDiscountedPrice)}
						</Text>
						<Text className="text-text-muted font-montserrat text-sm">
							per night
						</Text>
					</View>
				</View>
			);
		} else {
			return (
				<View className="mt-3 pt-3 border-t border-border-subtle">
					<View className="flex-row justify-between items-baseline">
						<Text className="text-text-primary font-playfair-bold text-2xl">
							{formatPrice(originalPrice)}
						</Text>
						<Text className="text-text-muted font-montserrat text-sm">
							per night
						</Text>
					</View>
				</View>
			);
		}
	};

	if (isLoadingRoom || isLoadingBookings) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<Text className="text-text-primary font-montserrat mt-4">
					Loading room details...
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-background-default">
			{/* Header */}
			<View className="bg-surface-default px-6 py-4 border-b border-border-default">
				<View className="flex-row items-center justify-between">
					<TouchableOpacity
						onPress={() => router.back()}
						className="flex-row items-center p-2"
					>
						<Ionicons name="arrow-back" size={24} color="#3B0270" />
					</TouchableOpacity>
					<Text className="text-text-primary font-playfair-semibold text-3xl text-center">
						Book Your Room
					</Text>
					<View className="w-10" />
				</View>
			</View>

			<ScrollView className="flex-1 bg-background-default">
				<View className="p-6">
					{/* Room Info Card */}
					{roomData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-default">
							<Image
								source={{
									uri:
										Array.isArray(roomData.images) &&
										roomData.images.length > 0
											? roomData.images[0].room_image
											: 'https://via.placeholder.com/300x200?text=Room+Image',
								}}
								className="w-full h-48"
								resizeMode="cover"
							/>

							<View className="p-4">
								{/* Room Name and Type */}
								<View className="mb-3">
									<Text className="text-text-primary font-playfair-bold text-4xl mb-1">
										{roomData.room_name}
									</Text>
								</View>

								{/* Room Details */}
								<View className="mb-3">
									<View className="flex-row items-center mb-2">
										<Ionicons
											name="people-outline"
											size={18}
											color="#6F00FF"
										/>
										<Text className="text-text-primary font-montserrat ml-2">
											Max Guests: <Text className="font-montserrat-bold">{roomData.max_guests}</Text>
										</Text>
									</View>

									<View className="flex-row items-center mb-2">
										<Ionicons
											name="bed-outline"
											size={18}
											color="#6F00FF"
										/>
										<Text className="text-text-primary font-montserrat ml-2">
											Room Type: <Text className="font-montserrat uppercase">{roomData.room_type}</Text>
										</Text>
									</View>
									
									<View className='flex-row items-center'>
										<Ionicons
											name="bed-outline"
											size={18}
											color="#6F00FF"
										/>
										<Text className="text-text-primary font-montserrat ml-2">
											Bed Type: <Text className="font-montserrat uppercase">{roomData.bed_type}</Text>
										</Text>
									</View>
								</View>

								{/* Amenities */}
								{roomData.amenities && roomData.amenities.length > 0 && (
									<View className="mb-2">
										<Text className="text-text-primary font-montserrat-bold text-md mb-2">
											Amenities
										</Text>
										<View className="flex-row flex-wrap">
											{roomData.amenities.map((amenity: any, index: number) => (
												<View
													key={index}
													className="bg-background-subtle px-3 py-1.5 rounded-full mr-2 mb-2"
												>
													<Text className="text-text-primary font-montserrat text-sm">
														{typeof amenity === 'object' && 'description' in amenity 
															? amenity.description 
															: String(amenity)}
													</Text>
												</View>
											))}
										</View>
									</View>
								)}

								{/* Price Display */}
								{renderRoomCardPriceDisplay()}
							</View>
						</View>
					)}

					{/* Error Messages */}
					{conflictMessage && (
						<View className="bg-feedback-error-light border-l-4 border-feedback-error-DEFAULT rounded-xl p-4 mb-4">
							<View className="flex-row items-start">
								<Ionicons name="alert-circle" size={20} color="#DC2626" className="mr-2" />
								<Text className="text-feedback-error-dark font-montserrat flex-1">
									{conflictMessage}
								</Text>
							</View>
						</View>
					)}

					{isBookingLocked && (
						<View className="bg-feedback-error-light border-l-4 border-feedback-error-DEFAULT rounded-xl p-4 mb-4">
							<View className="flex-row items-start">
								<Ionicons name="lock-closed" size={20} color="#DC2626" className="mr-2" />
								<View className="flex-1">
									<Text className="text-feedback-error-dark font-montserrat-bold mb-1">
										Booking Limit Reached
									</Text>
									<Text className="text-feedback-error-dark font-montserrat text-sm">
										Daily booking limit reached. Verify your ID to book multiple stays.
									</Text>
								</View>
							</View>
						</View>
					)}

					{isSameDayBooking && (
						<View className="bg-feedback-warning-light border-l-4 border-feedback-warning-DEFAULT rounded-xl p-4 mb-4">
							<View className="flex-row items-start">
								<Ionicons name="time-outline" size={20} color="#D97706" className="mr-2" />
								<Text className="text-feedback-warning-dark font-montserrat flex-1">
									Minimum stay is 1 night. Please select different check-out date.
								</Text>
							</View>
						</View>
					)}

					{maxDayExceed && (
						<View className="bg-feedback-error-light border-l-4 border-feedback-error-DEFAULT rounded-xl p-4 mb-4">
							<View className="flex-row items-start">
								<Ionicons name="calendar-outline" size={20} color="#DC2626" className="mr-2" />
								<Text className="text-feedback-error-dark font-montserrat flex-1">
									Maximum stay duration is 30 days. Please select a shorter date range.
								</Text>
							</View>
						</View>
					)}

					{/* Calendar Section */}
					<View className="bg-surface-default rounded-2xl p-5 mb-6 border border-border-default shadow-sm">
						<Text className="text-text-primary font-playfair-bold text-2xl mb-4">
							Select Your Stay Dates
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

							<Text className="text-text-primary font-playfair-semibold text-3xl">
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
						<View className="mb-6">
							<View className="flex-row justify-between mb-2">
								{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
									(day, dayIndex) => (
										<Text
											key={`weekday-${dayIndex}-${day}`}
											className="text-text-muted font-montserrat-bold text-center flex-1"
										>
											{day}
										</Text>
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
						disabled={!checkInDate || !checkOutDate || hasConflict || isSameDayBooking || maxDayExceed || isBookingLocked}
						className={`rounded-2xl py-4 px-6 mb-8 ${
							checkInDate && checkOutDate && !hasConflict && !isSameDayBooking && !maxDayExceed && !isBookingLocked
								? 'bg-violet-primary'
								: 'bg-neutral-300'
						}`}
					>
						<Text
							className={`text-center font-montserrat-bold text-lg ${
								checkInDate && checkOutDate && !hasConflict && !isSameDayBooking && !maxDayExceed && !isBookingLocked
									? 'text-text-inverse'
									: 'text-neutral-500'
							}`}
						>
							Proceed to Booking
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}