class Routes {
    static readonly API = '/api';
    static readonly MASTER = '/master';
    static readonly BOOKING = '/booking';
    static readonly PROPERTY = '/property';
}

// API routes (user_roles.urls)
export class ApiRoutes {
    static readonly TOKEN = `${Routes.API}/token`;
    static readonly TOKEN_REFRESH = `${Routes.API}/token/refresh`;
    static readonly FIREBASE_TOKEN = `${Routes.API}/firebase_token`;
    static readonly USER_AUTH = `${Routes.API}/auth/user`;
    static readonly LOGIN = `${Routes.API}/auth/login`;
    static readonly VERIFY_OTP = `${Routes.API}/auth/verify`;
    static readonly RESEND_OTP = `${Routes.API}/auth/resend_otp`;
    static readonly REGISTER = `${Routes.API}/auth/register`;
    static readonly LOGOUT = `${Routes.API}/auth/logout`;
    static readonly CHANGE_PASSWORD = `${Routes.API}/auth/change_password`;
    static readonly CHECK_OLD_PASSWORD = `${Routes.API}/auth/check_old_password`;
    static readonly CHANGE_NEW_PASSWORD = `${Routes.API}/auth/change_new_password`;
    static readonly RESET_PASSWORD = `${Routes.API}/auth/reset_password`;
    static readonly FORGOT_PASSWORD = `${Routes.API}/auth/forgot_password`;
    static readonly VERIFY_RESET_OTP = `${Routes.API}/auth/verify_reset_otp`;
    static readonly GOOGLE_AUTH = `${Routes.API}/auth/google-auth`;

    // Guest profile routes
    static readonly CHANGE_IMAGE = `${Routes.API}/guest/change_image`;
    static readonly USER_DETAILS = (id: number) => `${Routes.API}/guest/${id}`;
    static readonly UPDATE_USER_DETAILS = (id: number) => `${Routes.API}/guest/update/${id}`;
    static readonly GUEST_BOOKINGS = `${Routes.API}/guest/bookings`;
    static readonly UPLOAD_VALID_ID = `${Routes.API}/guest/upload_valid_id`;

    // Notifications
    static readonly NOTIFICATIONS = `${Routes.API}/guest/notifications`;
    static readonly MARK_NOTIFICATION_READ = (id: number) => `${Routes.API}/guest/notifications/${id}/read`;
    static readonly MARK_ALL_NOTIFICATIONS_READ = `${Routes.API}/guest/notifications/read-all`;
}

// Booking routes (booking.urls)
export class BookingRoutes {
    static readonly AVAILABILITY = `${Routes.BOOKING}/availability`;
    static readonly BOOKINGS = `${Routes.BOOKING}/bookings`;
    static readonly BOOKING_DETAIL = (bookingId: string) => `${Routes.BOOKING}/bookings/${bookingId}`;
    static readonly CANCEL_BOOKING = (bookingId: string) => `${Routes.BOOKING}/bookings/${bookingId}/cancel`;
    static readonly BOOKING_REVIEWS = (bookingId: number) => `${Routes.BOOKING}/bookings/${bookingId}/reviews`;
    static readonly USER_BOOKINGS = `${Routes.BOOKING}/user/bookings`;
    static readonly USER_REVIEWS = `${Routes.BOOKING}/user/reviews`;
    static readonly REVIEW_DETAIL = (reviewId: string) => `${Routes.BOOKING}/reviews/${reviewId}`;
    static readonly RESERVATION_LIST = `${Routes.BOOKING}/reservation`;
    static readonly RESERVATION_DETAIL = (reservationId: string) => `${Routes.BOOKING}/reservation/${reservationId}`;
    static readonly AREAS = `${Routes.BOOKING}/areas`;
    static readonly AREA_DETAIL = (areaId: string) => `${Routes.BOOKING}/areas/${areaId}`;
    static readonly AREA_BOOKINGS = (areaId: string) => `${Routes.BOOKING}/areas/${areaId}/bookings`;
    static readonly AREA_REVIEWS = (areaId: number) => `${Routes.BOOKING}/areas/${areaId}/reviews`;
    static readonly ROOM_DETAIL = (roomId: string) => `${Routes.BOOKING}/rooms/${roomId}`;
    static readonly ROOM_BOOKINGS = (roomId: string) => `${Routes.BOOKING}/rooms/${roomId}/bookings`;
    static readonly ROOM_REVIEWS = (roomId: number) => `${Routes.BOOKING}/rooms/${roomId}/reviews`;
    static readonly CHECKOUT_RECEIPT = (bookingId: string) => `${Routes.BOOKING}/generate_checkout_e_receipt/${bookingId}`;

    // Food ordering
    static readonly FETCH_FOODS = `${Routes.BOOKING}/fetch_foods`;
    static readonly PLACE_FOOD_ORDER = `${Routes.BOOKING}/place_food_order`;
    static readonly FETCH_FOOD_ORDERS = `${Routes.BOOKING}/fetch_food_orders`;
    static readonly REVIEW_FOOD_ORDER = `${Routes.BOOKING}/review_food_order`;
    static readonly USER_FOOD_ORDER_REVIEWS = `${Routes.BOOKING}/user/food_order_reviews`;
    static readonly REVIEWABLE_FOOD_ORDERS = `${Routes.BOOKING}/user/reviewable_food_orders`;
}

// Property routes (property.urls)
export class PropertyRoutes {
    static readonly ROOMS = `${Routes.PROPERTY}/rooms`;
    static readonly ROOM_DETAIL = (id: number) => `${Routes.PROPERTY}/rooms/${id}`;
    static readonly AREAS = `${Routes.PROPERTY}/areas`;
    static readonly AREA_DETAIL = (id: number) => `${Routes.PROPERTY}/areas/${id}`;
    static readonly AMENITIES = `${Routes.PROPERTY}/amenities`;
}