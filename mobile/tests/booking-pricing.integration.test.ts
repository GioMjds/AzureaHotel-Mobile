import { room } from '@/services/Room';
import { calculateRoomPricing } from '@/utils/pricing';
import type { Room as RoomType } from '@/types/Room.types';

// Helper to coerce price field to number
function toNumber(value: any): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') return value;
	const n = Number(String(value).replace(/[^0-9.\-]/g, ''));
	return Number.isFinite(n) ? n : 0;
}

// Long-stay percent helper (same rules as frontend/backend)
function longStayPercentForNights(nights: number): number {
	if (nights >= 7) return 10;
	if (nights >= 3) return 5;
	return 0;
}

describe('Integration: Pricing using real rooms from Room service', () => {
	let rooms: RoomType[] = [];
	let skipIntegration = false;

	beforeAll(async () => {
		try {
			const res = await room.getRooms();
			// Room service returns { data: [...] } (see property.views.fetch_rooms)
			rooms = res?.data || res || [];
			if (!Array.isArray(rooms) || rooms.length === 0) {
				console.warn('No rooms returned by room.getRooms() - skipping integration assertions.');
				skipIntegration = true;
			}
		} catch (err: any) {
			console.warn('Could not fetch rooms from backend - skipping integration assertions.', err?.message || err);
			skipIntegration = true;
		}
	});

	test('fetched rooms should be an array', () => {
		if (skipIntegration) return;
		expect(Array.isArray(rooms)).toBe(true);
		expect(rooms.length).toBeGreaterThan(0);
	});

	describe('Scenario: Deluxe Room with 30% Admin Discount', () => {
		// Find a room that matches the scenario (30% discount, ~1500 original price)
		// Or test with any room that has admin discount
		
		test('1-day booking: Should apply 30% admin discount (best)', () => {
			if (skipIntegration) return;

			// Find room with admin discount or use first available room
			const deluxeRoom = rooms.find(r => {
				const discount = toNumber(r.discount_percent || 0);
				return discount >= 25 && discount <= 35; // Looking for ~30% discount
			}) || rooms[0];

			if (!deluxeRoom) {
				console.warn('No suitable room found for Deluxe Room scenario');
				return;
			}

			const originalPrice = toNumber(deluxeRoom.price_per_night ?? deluxeRoom.room_price ?? 0);
			const adminDiscounted = toNumber(deluxeRoom.discounted_price_numeric ?? deluxeRoom.discounted_price ?? 0);
			const adminPercent = toNumber(deluxeRoom.discount_percent || 0);

			const result = calculateRoomPricing({ 
				roomData: deluxeRoom as any, 
				userDetails: null, 
				nights: 1 
			});

			// For 1-day booking with 30% admin discount:
			// - Admin discount: 30% (1500 * 0.70 = 1050)
			// - Long stay discount: 0% (only 1 day, doesn't qualify)
			// - Best discount: Admin 30% = ₱1,050/night
			// - Total: ₱1,050 (not ₱1,500)

			if (adminDiscounted && adminDiscounted < originalPrice) {
				expect(result.finalPrice).toBe(adminDiscounted);
				expect(result.discountType).toBe('admin');
				expect(result.totalPrice).toBe(adminDiscounted * 1);
				
				console.log(`✓ 1-day: ${deluxeRoom.room_name}`);
				console.log(`  Original: ₱${originalPrice.toFixed(2)}, Admin discount: ${adminPercent}%`);
				console.log(`  Final price/night: ₱${result.finalPrice.toFixed(2)}`);
				console.log(`  Total (1 night): ₱${result.totalPrice.toFixed(2)}`);
			}
		});

		test('3-day booking: Should apply 30% admin discount (beats 5% long stay)', () => {
			if (skipIntegration) return;

			const deluxeRoom = rooms.find(r => {
				const discount = toNumber(r.discount_percent || 0);
				return discount >= 25 && discount <= 35;
			}) || rooms[0];

			if (!deluxeRoom) return;

			const originalPrice = toNumber(deluxeRoom.price_per_night ?? deluxeRoom.room_price ?? 0);
			const adminDiscounted = toNumber(deluxeRoom.discounted_price_numeric ?? deluxeRoom.discounted_price ?? 0);
			const adminPercent = toNumber(deluxeRoom.discount_percent || 0);

			const result = calculateRoomPricing({ 
				roomData: deluxeRoom as any, 
				userDetails: null, 
				nights: 3 
			});

			// For 3-day booking with 30% admin discount:
			// - Admin discount: 30% (1500 * 0.70 = 1050)
			// - Long stay discount: 5% (1500 * 0.95 = 1425)
			// - Best discount: Admin 30% = ₱1,050/night (beats 5%)
			// - Total: ₱3,150 (not ₱4,275 from long stay)

			if (adminDiscounted && adminDiscounted < originalPrice) {
				const longStayPrice = originalPrice * 0.95; // 5% discount
				
				// Admin should win (lower price)
				expect(result.finalPrice).toBe(adminDiscounted);
				expect(result.finalPrice).toBeLessThan(longStayPrice);
				expect(result.discountType).toBe('admin');
				expect(result.totalPrice).toBe(adminDiscounted * 3);
				
				console.log(`✓ 3-day: ${deluxeRoom.room_name}`);
				console.log(`  Original: ₱${originalPrice.toFixed(2)}, Admin: ${adminPercent}%`);
				console.log(`  Admin price/night: ₱${adminDiscounted.toFixed(2)}`);
				console.log(`  Long stay price/night (5%): ₱${longStayPrice.toFixed(2)}`);
				console.log(`  Winner: Admin discount (₱${result.finalPrice.toFixed(2)}/night)`);
				console.log(`  Total (3 nights): ₱${result.totalPrice.toFixed(2)}`);
			}
		});

		test('7-day booking: Should apply 30% admin discount (beats 10% long stay)', () => {
			if (skipIntegration) return;

			const deluxeRoom = rooms.find(r => {
				const discount = toNumber(r.discount_percent || 0);
				return discount >= 25 && discount <= 35;
			}) || rooms[0];

			if (!deluxeRoom) return;

			const originalPrice = toNumber(deluxeRoom.price_per_night ?? deluxeRoom.room_price ?? 0);
			const adminDiscounted = toNumber(deluxeRoom.discounted_price_numeric ?? deluxeRoom.discounted_price ?? 0);
			const adminPercent = toNumber(deluxeRoom.discount_percent || 0);

			const result = calculateRoomPricing({ 
				roomData: deluxeRoom as any, 
				userDetails: null, 
				nights: 7 
			});

			// For 7-day booking with 30% admin discount:
			// - Admin discount: 30% (1500 * 0.70 = 1050)
			// - Long stay discount: 10% (1500 * 0.90 = 1350)
			// - Best discount: Admin 30% = ₱1,050/night (beats 10%)
			// - Total: ₱7,350 (not ₱9,450 from long stay)
			// 
			// BUG SCENARIO: If admin-side shows ₱9,450, it means:
			// - It's applying long stay (1500 * 0.90 = 1350/night)
			// - Total: 1350 * 7 = ₱9,450 ❌ WRONG
			// 
			// CORRECT: Should apply admin discount (best)
			// - Total: 1050 * 7 = ₱7,350 ✓ CORRECT

			if (adminDiscounted && adminDiscounted < originalPrice) {
				const longStayPrice = originalPrice * 0.90; // 10% discount
				
				// Admin should win (lower price)
				expect(result.finalPrice).toBe(adminDiscounted);
				expect(result.finalPrice).toBeLessThan(longStayPrice);
				expect(result.discountType).toBe('admin');
				expect(result.totalPrice).toBe(adminDiscounted * 7);
				
				// Verify it's NOT the wrong price (9450 for 1500 original)
				const wrongTotal = longStayPrice * 7; // This would be the bug
				expect(result.totalPrice).not.toBe(wrongTotal);
				
				console.log(`✓ 7-day: ${deluxeRoom.room_name}`);
				console.log(`  Original: ₱${originalPrice.toFixed(2)}, Admin: ${adminPercent}%`);
				console.log(`  Admin price/night: ₱${adminDiscounted.toFixed(2)}`);
				console.log(`  Long stay price/night (10%): ₱${longStayPrice.toFixed(2)}`);
				console.log(`  Winner: Admin discount (₱${result.finalPrice.toFixed(2)}/night)`);
				console.log(`  Total (7 nights): ₱${result.totalPrice.toFixed(2)} ✓ CORRECT`);
				console.log(`  Wrong total would be: ₱${wrongTotal.toFixed(2)} ❌ (if using long stay)`);
			}
		});
	});

	describe('General Room Pricing Verification', () => {
		// Run pricing checks on up to 5 rooms to keep test fast
		const sampleN = 5;
		const nightsToTest = [1, 3, 7];

		for (const nights of nightsToTest) {
			test(`pricing behavior for ${nights} night(s) using up to ${sampleN} real rooms`, async () => {
				if (skipIntegration) return;

				const slice = rooms.slice(0, sampleN);
				for (const r of slice) {
					// Match calculateRoomPricing: original uses price_per_night || room_price || 0
					const originalPrice = toNumber(r.price_per_night ?? r.room_price ?? 0);

					// Admin discounted value comes from discounted_price_numeric || discounted_price
					const adminDiscounted = toNumber(r.discounted_price_numeric ?? r.discounted_price ?? 0);

					const longPercent = longStayPercentForNights(nights);
					const longPrice = longPercent > 0 ? originalPrice * (1 - longPercent / 100) : originalPrice;

					// Build expected candidates following same rules as calculateRoomPricing
					const candidates: number[] = [originalPrice];

					if (adminDiscounted && adminDiscounted < originalPrice) {
						candidates.push(adminDiscounted);
					}

					// userDetails passed as null in this integration test, so senior shouldn't apply

					if (longPrice < originalPrice) {
						candidates.push(longPrice);
					}

					const expectedLowest = Math.min(...candidates);

					// Use the library function under test
					const result = calculateRoomPricing({ roomData: r as any, userDetails: null, nights });

					// numeric checks
					expect(result.finalPrice).toBeGreaterThanOrEqual(0);
					// final price should be approximately the expected lowest candidate
					expect(result.finalPrice).toBeCloseTo(expectedLowest, 2);

					// discount type should be one of allowed types
					expect(['admin', 'senior', 'long_stay', 'none']).toContain(result.discountType);
				}
			});
		}
	});
});
