import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

// Lets code outside the component tree (AuthContext's 401 handler) trigger
// navigation — there's no screen/hook context available there.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
