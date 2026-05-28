export const API_BASE_URL = 'http://203.94.72.18/trainee/api';

export const API_URLS = {
  authSignIn: `${API_BASE_URL}/auth/signin`,
  activeHalls: `${API_BASE_URL}/production/hall/get/all/active`,
  hallSave: 'http://203.94.72.18/production/hall/save',
  hallUpdate: `${API_BASE_URL}/production/hall/update`,
  bookingSave: `${API_BASE_URL}/production/booking/save`,
  bookingUpdate: `${API_BASE_URL}/production/booking/update`,
  bookingGetAll: `${API_BASE_URL}/production/booking/get/all/bookings`
} as const;