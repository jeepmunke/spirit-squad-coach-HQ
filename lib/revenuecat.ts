import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS!;
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID!;

export function initRevenueCat(userId?: string) {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  Purchases.configure({ apiKey, appUserID: userId ?? null });
}

export async function checkProEntitlement(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}

export async function getOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}
