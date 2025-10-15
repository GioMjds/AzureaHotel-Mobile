import { calculateRoomPricing } from '../utils/pricing';

// Mock room data structure matching backend response
interface MockRoomData {
	id: number;
	room_name: string;
	price_per_night: number;
	room_price?: number;
	discounted_price_numeric?: number;
	discounted_price?: string | number;
	senior_discounted_price?: number;
	discount_percent?: number;
}

// Mock user data structure
interface MockUser {
	id: number;
	username: string;
	email: string;
	is_senior_or_pwd?: boolean;
}

describe('Room Booking Pricing - Comprehensive Discount Tests', () => {
	describe('No User Discounts (Regular Customer)', () => {
		const regularUser: MockUser = {
			id: 1,
			username: 'regular@test.com',
			email: 'regular@test.com',
			is_senior_or_pwd: false,
		};

		test('1-day booking with no admin discount', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(1000);
			expect(result.totalPrice).toBe(1000);
			expect(result.discountType).toBe('none');
			expect(result.discountPercent).toBe(0);
		});

		test('1-day booking with 15% admin discount', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Deluxe Room',
				price_per_night: 2000,
				discounted_price_numeric: 1700, // 15% off
				discount_percent: 15,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(2000);
			expect(result.finalPrice).toBe(1700);
			expect(result.totalPrice).toBe(1700);
			expect(result.discountType).toBe('admin');
			expect(result.discountPercent).toBe(15);
		});

		test('3-day booking with no admin discount - should get 5% long stay discount', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 3,
			});

			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(950); // 5% off
			expect(result.totalPrice).toBe(2850); // 950 * 3
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(5);
		});

		test('3-day booking with 10% admin discount - should get best of admin (10%) vs long stay (5%)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Premium Room',
				price_per_night: 2000,
				discounted_price_numeric: 1800, // 10% off
				discount_percent: 10,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 3,
			});

			expect(result.originalPrice).toBe(2000);
			expect(result.finalPrice).toBe(1800); // Admin 10% is better than long stay 5%
			expect(result.totalPrice).toBe(5400); // 1800 * 3
			expect(result.discountType).toBe('admin');
			expect(result.discountPercent).toBe(10);
		});

		test('3-day booking with 3% admin discount - should get long stay (5%) instead', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Budget Room',
				price_per_night: 1500,
				discounted_price_numeric: 1455, // 3% off
				discount_percent: 3,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 3,
			});

			expect(result.originalPrice).toBe(1500);
			expect(result.finalPrice).toBe(1425); // 5% long stay is better than 3% admin
			expect(result.totalPrice).toBe(4275); // 1425 * 3
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(5);
		});

		test('7-day booking with no admin discount - should get 10% long stay discount', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 7,
			});

			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(900); // 10% off
			expect(result.totalPrice).toBe(6300); // 900 * 7
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(10);
		});

		test('7-day booking with 8% admin discount - should get long stay (10%) instead', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 2000,
				discounted_price_numeric: 1840, // 8% off
				discount_percent: 8,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 7,
			});

			expect(result.originalPrice).toBe(2000);
			expect(result.finalPrice).toBe(1800); // 10% long stay is better than 8% admin
			expect(result.totalPrice).toBe(12600); // 1800 * 7
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(10);
		});

		test('7-day booking with 15% admin discount - should get admin (15%) instead', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Luxury Room',
				price_per_night: 3000,
				discounted_price_numeric: 2550, // 15% off
				discount_percent: 15,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 7,
			});

			expect(result.originalPrice).toBe(3000);
			expect(result.finalPrice).toBe(2550); // Admin 15% is better than long stay 10%
			expect(result.totalPrice).toBe(17850); // 2550 * 7
			expect(result.discountType).toBe('admin');
			expect(result.discountPercent).toBe(15);
		});

		test('10-day booking with 5% admin discount - should get long stay (10%) instead', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Ocean View',
				price_per_night: 2500,
				discounted_price_numeric: 2375, // 5% off
				discount_percent: 5,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 10,
			});

			expect(result.originalPrice).toBe(2500);
			expect(result.finalPrice).toBe(2250); // 10% long stay is better
			expect(result.totalPrice).toBe(22500); // 2250 * 10
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(10);
		});
	});

	describe('Senior/PWD Customer Discounts', () => {
		const seniorUser: MockUser = {
			id: 2,
			username: 'senior@test.com',
			email: 'senior@test.com',
			is_senior_or_pwd: true,
		};

		test('1-day booking with no admin discount - should get 20% senior discount', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				senior_discounted_price: 800, // 20% off
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(800);
			expect(result.totalPrice).toBe(800);
			expect(result.discountType).toBe('senior');
			expect(result.discountPercent).toBe(20);
		});

		test('1-day booking with 15% admin discount - should get senior (20%) instead', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Deluxe Room',
				price_per_night: 2000,
				discounted_price_numeric: 1700, // 15% admin
				senior_discounted_price: 1600, // 20% senior
				discount_percent: 15,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(2000);
			expect(result.finalPrice).toBe(1600); // Senior 20% is better
			expect(result.totalPrice).toBe(1600);
			expect(result.discountType).toBe('senior');
			expect(result.discountPercent).toBe(20);
		});

		test('3-day booking with no admin discount - senior (20%) should beat long stay (5%)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				senior_discounted_price: 800, // 20% senior
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 3,
			});

			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(800); // Senior 20% beats long stay 5%
			expect(result.totalPrice).toBe(2400); // 800 * 3
			expect(result.discountType).toBe('senior');
			expect(result.discountPercent).toBe(20);
		});

		test('7-day booking with no admin discount - senior (20%) should beat long stay (10%)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Suite',
				price_per_night: 3000,
				senior_discounted_price: 2400, // 20% senior
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 7,
			});

			expect(result.originalPrice).toBe(3000);
			expect(result.finalPrice).toBe(2400); // Senior 20% beats long stay 10%
			expect(result.totalPrice).toBe(16800); // 2400 * 7
			expect(result.discountType).toBe('senior');
			expect(result.discountPercent).toBe(20);
		});

		test('7-day booking with 25% admin discount - admin (25%) should beat senior (20%)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Premium Suite',
				price_per_night: 4000,
				discounted_price_numeric: 3000, // 25% admin
				senior_discounted_price: 3200, // 20% senior
				discount_percent: 25,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 7,
			});

			expect(result.originalPrice).toBe(4000);
			expect(result.finalPrice).toBe(3000); // Admin 25% is best
			expect(result.totalPrice).toBe(21000); // 3000 * 7
			expect(result.discountType).toBe('admin');
			expect(result.discountPercent).toBe(25);
		});
	});

	describe('Edge Cases', () => {
		const regularUser: MockUser = {
			id: 1,
			username: 'user@test.com',
			email: 'user@test.com',
			is_senior_or_pwd: false,
		};

		test('Zero price room', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Free Room',
				price_per_night: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(0);
			expect(result.finalPrice).toBe(0);
			expect(result.totalPrice).toBe(0);
		});

		test('Null user (unauthenticated)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Standard Room',
				price_per_night: 1000,
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: null,
				nights: 7,
			});

			// Should still get long stay discount
			expect(result.originalPrice).toBe(1000);
			expect(result.finalPrice).toBe(900); // 10% long stay
			expect(result.totalPrice).toBe(6300);
			expect(result.discountType).toBe('long_stay');
		});

		test('Very long stay (30 days)', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'Monthly Room',
				price_per_night: 800,
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 30,
			});

			expect(result.originalPrice).toBe(800);
			expect(result.finalPrice).toBe(720); // 10% long stay (7+ days rule)
			expect(result.totalPrice).toBe(21600); // 720 * 30
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(10);
		});

		test('Room with string price format', () => {
			const room: MockRoomData = {
				id: 1,
				room_name: 'String Price Room',
				price_per_night: 1500,
				room_price: 1500,
				discounted_price: '1350', // String format
				discount_percent: 10,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 1,
			});

			expect(result.originalPrice).toBe(1500);
			expect(result.finalPrice).toBe(1350);
			expect(result.totalPrice).toBe(1350);
		});
	});

	describe('Real-World Scenarios', () => {
		test('Scenario: Regular user books discounted room for 3 days', () => {
			// Room has 12% admin discount
			// User gets 3-day booking (5% long stay)
			// Should choose admin discount (12% > 5%)
			const regularUser: MockUser = {
				id: 1,
				username: 'user@test.com',
				email: 'user@test.com',
				is_senior_or_pwd: false,
			};

			const room: MockRoomData = {
				id: 5,
				room_name: 'Promotional Room',
				price_per_night: 2500,
				discounted_price_numeric: 2200, // 12% off
				discount_percent: 12,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 3,
			});

			expect(result.finalPrice).toBe(2200); // Admin 12%
			expect(result.totalPrice).toBe(6600); // 2200 * 3
			expect(result.discountType).toBe('admin');
		});

		test('Scenario: Senior books regular-priced room for 1 week', () => {
			// No admin discount
			// Senior gets 20% discount
			// Also 7-day booking (10% long stay)
			// Should choose senior discount (20% > 10%)
			const seniorUser: MockUser = {
				id: 2,
				username: 'senior@test.com',
				email: 'senior@test.com',
				is_senior_or_pwd: true,
			};

			const room: MockRoomData = {
				id: 3,
				room_name: 'Beach View',
				price_per_night: 1800,
				senior_discounted_price: 1440, // 20% senior
				discount_percent: 0,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: seniorUser as any,
				nights: 7,
			});

			expect(result.finalPrice).toBe(1440); // Senior 20% > Long stay 10%
			expect(result.totalPrice).toBe(10080); // 1440 * 7
			expect(result.discountType).toBe('senior');
		});

		test('Scenario: Regular user books room with small discount for 10 days', () => {
			// Room has 6% admin discount
			// 10-day booking (10% long stay)
			// Should choose long stay (10% > 6%)
			const regularUser: MockUser = {
				id: 1,
				username: 'user@test.com',
				email: 'user@test.com',
				is_senior_or_pwd: false,
			};

			const room: MockRoomData = {
				id: 7,
				room_name: 'Garden Room',
				price_per_night: 1200,
				discounted_price_numeric: 1128, // 6% off
				discount_percent: 6,
			};

			const result = calculateRoomPricing({
				roomData: room as any,
				userDetails: regularUser as any,
				nights: 10,
			});

			expect(result.finalPrice).toBe(1080); // Long stay 10% > Admin 6%
			expect(result.totalPrice).toBe(10800); // 1080 * 10
			expect(result.discountType).toBe('long_stay');
			expect(result.discountPercent).toBe(10);
		});
	});
});
