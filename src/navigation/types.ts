/**
 * Navigation Types and Param Lists for Rally React Native
 *
 * Defines type-safe navigation props for all navigators and screens
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// ============================================================================
// Auth Stack Types
// ============================================================================

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  EmailVerification: {
    email: string;
    password: string;
  };
};

export type AuthScreenNavigationProp<T extends keyof AuthStackParamList> =
  StackNavigationProp<AuthStackParamList, T>;

export type AuthScreenRouteProp<T extends keyof AuthStackParamList> =
  RouteProp<AuthStackParamList, T>;

// ============================================================================
// Admin Stack Types
// ============================================================================

export type AdminStackParamList = {
  AdminDashboard: undefined;
  EventManagement: undefined;
  CreateEvent: undefined;
  EditEvent: {
    eventId: string;
  };
  DDManagement: undefined;
  AssignDD: {
    eventId: string;
    ddId?: string;
    ddName?: string;
  };
  MemberManagement: undefined;
  MemberDetails: {
    userId: string;
  };
  RideHistory: undefined;
  RideDetails: {
    rideId: string;
  };
  JoinRequests: undefined;
  TransferAdmin: undefined;
};

export type AdminScreenNavigationProp<T extends keyof AdminStackParamList> =
  StackNavigationProp<AdminStackParamList, T>;

export type AdminScreenRouteProp<T extends keyof AdminStackParamList> =
  RouteProp<AdminStackParamList, T>;

// ============================================================================
// DD Stack Types
// ============================================================================

export type DDStackParamList = {
  DDDashboard: undefined;
  RideDetails: {
    rideId: string;
  };
  Navigation: {
    rideId: string;
    destination: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  CarSettings: undefined;
  Profile: undefined;
};

export type DDScreenNavigationProp<T extends keyof DDStackParamList> =
  StackNavigationProp<DDStackParamList, T>;

export type DDScreenRouteProp<T extends keyof DDStackParamList> =
  RouteProp<DDStackParamList, T>;

// ============================================================================
// Rider Stack Types
// ============================================================================

export type RiderStackParamList = {
  RiderDashboard: undefined;
  RequestRide: { isEmergency?: boolean } | undefined;
  MyRides: undefined;
  RideDetails: {
    rideId: string;
  };
  QueueStatus: undefined;
  JoinChapter: undefined;
  Profile: undefined;
};

export type RiderScreenNavigationProp<T extends keyof RiderStackParamList> =
  StackNavigationProp<RiderStackParamList, T>;

export type RiderScreenRouteProp<T extends keyof RiderStackParamList> =
  RouteProp<RiderStackParamList, T>;

// ============================================================================
// Root Stack Types (for modals and deep linking)
// ============================================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  // Global modals that can be accessed from anywhere
  EmergencyRide: undefined;
  Notification: {
    type: 'ride_assigned' | 'dd_enroute' | 'ride_completed' | 'ride_cancelled';
    rideId: string;
  };
};

export type RootScreenNavigationProp<T extends keyof RootStackParamList> =
  StackNavigationProp<RootStackParamList, T>;

export type RootScreenRouteProp<T extends keyof RootStackParamList> =
  RouteProp<RootStackParamList, T>;

// ============================================================================
// Navigation Props Helper Types
// ============================================================================

export type AuthScreenProps<T extends keyof AuthStackParamList> = {
  navigation: AuthScreenNavigationProp<T>;
  route: AuthScreenRouteProp<T>;
};

export type AdminScreenProps<T extends keyof AdminStackParamList> = {
  navigation: AdminScreenNavigationProp<T>;
  route: AdminScreenRouteProp<T>;
};

export type DDScreenProps<T extends keyof DDStackParamList> = {
  navigation: DDScreenNavigationProp<T>;
  route: DDScreenRouteProp<T>;
};

export type RiderScreenProps<T extends keyof RiderStackParamList> = {
  navigation: RiderScreenNavigationProp<T>;
  route: RiderScreenRouteProp<T>;
};

export type RootScreenProps<T extends keyof RootStackParamList> = {
  navigation: RootScreenNavigationProp<T>;
  route: RootScreenRouteProp<T>;
};

// ============================================================================
// Deep Linking Types
// ============================================================================

export type DeepLinkConfig = {
  screens: {
    Auth: {
      screens: {
        Login: 'login';
        Signup: 'signup';
        EmailVerification: 'verify-email';
      };
    };
    Main: {
      screens: {
        Admin: {
          screens: {
            AdminDashboard: 'admin';
            EventManagement: 'admin/events';
            DDManagement: 'admin/dds';
            MemberManagement: 'admin/members';
            RideHistory: 'admin/rides';
          };
        };
        DD: {
          screens: {
            DDDashboard: 'dd';
            ActiveRides: 'dd/rides';
          };
        };
        Rider: {
          screens: {
            RiderDashboard: 'rider';
            RequestRide: 'rider/request';
            MyRides: 'rider/rides';
            QueueStatus: 'rider/queue';
          };
        };
      };
    };
    EmergencyRide: 'emergency';
    Notification: 'notification/:type/:rideId';
  };
};
