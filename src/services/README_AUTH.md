# Rally Authentication System

## Overview

Complete authentication system for Rally React Native app with K-State email verification requirement. This system ensures that only K-State students with verified @ksu.edu email addresses can use the app.

## Architecture

```
src/
├── services/
│   └── authService.ts          # Core auth operations
├── hooks/
│   └── useAuth.ts              # React hook for auth state
├── models/
│   └── User.ts                 # User model & validation
├── types/
│   └── errors.ts               # Error types
├── config/
│   └── firebase.ts             # Firebase configuration
└── screens/Auth/
    └── SignUpScreen.tsx        # Sign up UI
```

## Features

### 1. K-State Email Enforcement
- **CRITICAL**: Only @ksu.edu emails are allowed
- Validation happens both client-side and server-side (Firebase Rules)
- Case-insensitive email handling (all emails stored in lowercase)

### 2. Email Verification Flow
1. User signs up with @ksu.edu email
2. Firebase sends verification email
3. User clicks verification link in email
4. User can now sign in
5. App checks verification status on every sign in

### 3. Password Security
- **Minimum 8 characters** (enforced client-side)
- **At least one uppercase letter**
- **At least one lowercase letter**
- **At least one number**
- Stored securely by Firebase Authentication
- Password reset via email with validation

### 4. Phone Number Validation
- E.164 format: +15551234567
- Auto-formatting: (555) 123-4567 → +15551234567
- US phone numbers only (+1 country code)

### 5. Session Management
- AsyncStorage persistence (session survives app restarts)
- Auto token refresh (Firebase handles this)
- Auth state listeners for real-time updates

## Usage

### Basic Setup

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, authState, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <MainApp user={user} />;
}
```

### Sign Up

```typescript
import { signUp, SignUpData } from '../services/authService';

async function handleSignUp() {
  try {
    const userData: SignUpData = {
      email: 'student@ksu.edu',  // Must be @ksu.edu
      password: 'SecurePass123',  // Min 8 chars, uppercase, lowercase, number
      name: 'John Doe',
      phoneNumber: '5551234567',  // Will be formatted to +15551234567
      chapterId: '',              // Optional, set by admin later
      classYear: 1,               // 1=freshman, 2=sophomore, 3=junior, 4=senior
    };

    const { userId, user } = await signUp(userData);
    console.log('User created:', user);
    console.log('User ID:', userId);
    // Verification email sent automatically
  } catch (error) {
    console.error('Sign up failed:', error.message);
  }
}
```

### Sign In

```typescript
import { signIn } from '../services/authService';

async function handleSignIn() {
  try {
    const { userId, user } = await signIn('student@ksu.edu', 'SecurePass123');
    console.log('Signed in:', user);
    console.log('User ID:', userId);
  } catch (error) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      // Show email verification prompt
    }
  }
}
```

### Email Verification Check

```typescript
import { checkEmailVerification } from '../services/authService';

async function handleCheckVerification() {
  try {
    const isVerified = await checkEmailVerification();
    if (isVerified) {
      console.log('Email verified! User can now access app');
    } else {
      console.log('Email not verified yet');
    }
  } catch (error) {
    console.error('Error checking verification:', error);
  }
}
```

### Password Reset

#### Send Reset Email

```typescript
import { sendPasswordReset } from '../services/authService';

async function handlePasswordReset() {
  try {
    await sendPasswordReset('student@ksu.edu');
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Password reset failed:', error);
  }
}
```

#### Confirm Password Reset

```typescript
import { confirmPasswordResetWithCode } from '../services/authService';

async function handleConfirmReset() {
  try {
    const code = 'code-from-email';  // From password reset email link
    const newPassword = 'NewSecurePass123';

    await confirmPasswordResetWithCode(code, newPassword);
    console.log('Password reset successful');
  } catch (error) {
    if (error.code === 'WEAK_PASSWORD') {
      console.error('Password doesn\'t meet requirements');
    } else {
      console.error('Password reset failed:', error);
    }
  }
}
```

### Auth State Listener

```typescript
import { useEffect } from 'react';
import { onAuthStateChange, AuthState } from '../services/authService';

useEffect(() => {
  const unsubscribe = onAuthStateChange((state, user) => {
    switch (state) {
      case AuthState.SIGNED_OUT:
        console.log('User signed out');
        break;
      case AuthState.EMAIL_NOT_VERIFIED:
        console.log('User needs to verify email:', user?.email);
        break;
      case AuthState.SIGNED_IN:
        console.log('User signed in:', user);
        break;
    }
  });

  return () => unsubscribe();
}, []);
```

## Error Handling

All errors are typed and provide user-friendly messages:

```typescript
import { AuthError } from '../types/errors';

try {
  await signUp(email, password, name, phone);
} catch (error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'EMAIL_NOT_KSU':
        // Show: "Must use K-State email address (@ksu.edu)"
        break;
      case 'EMAIL_NOT_VERIFIED':
        // Show: "Please verify your K-State email before continuing"
        break;
      case 'INVALID_PHONE_NUMBER':
        // Show: "Invalid phone number format. Must be 10 digits."
        break;
      // ... etc
    }
  }
}
```

### Available Error Codes

- `EMAIL_NOT_KSU` - Email is not @ksu.edu
- `EMAIL_NOT_VERIFIED` - Email not verified yet
- `INVALID_PHONE_NUMBER` - Phone number format invalid
- `USER_NOT_FOUND` - User doesn't exist
- `WRONG_PASSWORD` - Incorrect password
- `EMAIL_ALREADY_IN_USE` - Email already registered
- `WEAK_PASSWORD` - Password too weak (less than 8 chars)
- `PASSWORD_TOO_SHORT` - Password must be at least 8 characters
- `PASSWORD_NEEDS_UPPERCASE` - Password must contain uppercase letter
- `PASSWORD_NEEDS_LOWERCASE` - Password must contain lowercase letter
- `PASSWORD_NEEDS_NUMBER` - Password must contain a number
- `INVALID_EMAIL` - Email format invalid
- `TOO_MANY_REQUESTS` - Rate limited
- `NETWORK_ERROR` - Network issue
- `NOT_AUTHENTICATED` - User must be signed in for this operation

## User Model

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  name: string;                  // Full name
  email: string;                 // @ksu.edu email (lowercase)
  phoneNumber: string;           // E.164 format (+15551234567)
  chapterId: string;             // Set by admin
  role: UserRole;                // 'admin' | 'member'
  classYear: number;             // 1-4 (freshman to senior)
  isEmailVerified: boolean;      // Email verification status
  fcmToken?: string;             // Push notification token
  createdAt: Date;
  updatedAt: Date;
}
```

## Validation Functions

### Password Validation

```typescript
import { validatePassword } from '../services/authService';

const result = validatePassword('mypassword');

if (!result.isValid) {
  console.error('Password errors:', result.errors);
  // Example output:
  // [
  //   'Password must be at least 8 characters',
  //   'Password must contain at least one uppercase letter',
  //   'Password must contain at least one number'
  // ]
}

// Valid password example
const validResult = validatePassword('SecurePass123');
console.log(validResult.isValid);  // true
console.log(validResult.errors);   // []
```

### Email Validation

```typescript
import { validateKSUEmail } from '../services/authService';
// Or from models:
import { isKSUEmail } from '../models/User';

// Email validation
validateKSUEmail('student@ksu.edu');     // true
validateKSUEmail('STUDENT@KSU.EDU');     // true (case insensitive)
validateKSUEmail('student@gmail.com');   // false
```

### Phone Number Validation

```typescript
import { validatePhoneNumber } from '../services/authService';
// Or from models:
import { formatPhoneNumber, isValidPhoneNumber } from '../models/User';

// Phone number formatting
formatPhoneNumber('5551234567');   // '+15551234567'
formatPhoneNumber('15551234567');  // '+15551234567'
formatPhoneNumber('+15551234567'); // '+15551234567'

// Phone number validation
validatePhoneNumber('+15551234567');  // true
isValidPhoneNumber('5551234567');     // true
isValidPhoneNumber('555123');         // false (too short)
```

### Session Management Utilities

```typescript
import {
  isAuthenticated,
  isEmailVerified,
  getCurrentUserId,
  getCurrentFirebaseUser,
  reloadUser
} from '../services/authService';

// Check if user is signed in
if (isAuthenticated()) {
  const userId = getCurrentUserId();
  console.log('User ID:', userId);
}

// Check email verification
if (isEmailVerified()) {
  console.log('Email is verified');
}

// Get Firebase user object
const firebaseUser = getCurrentFirebaseUser();
console.log('Email:', firebaseUser?.email);

// Refresh verification status
await reloadUser();
```

### User Profile Management

```typescript
import {
  createUserProfile,
  updateUserProfile
} from '../services/authService';

// Create profile (usually done internally during signup)
await createUserProfile('user_id', {
  name: 'John Doe',
  email: 'student@ksu.edu',
  phoneNumber: '+15551234567',
  chapterId: 'chapter_id',
  classYear: 2,
});

// Update profile
await updateUserProfile('user_id', {
  name: 'John Smith',
  classYear: 3,
});
```

## Firebase Configuration

The app uses AsyncStorage for session persistence:

```typescript
// src/config/firebase.ts
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

This means:
- User stays signed in after app restart
- No need to sign in every time
- Secure token storage via AsyncStorage

## Firebase Security Rules

Required Firestore security rules (already in firebase/firestore.rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isKSUEmail() {
      return request.auth.token.email.matches('.*@ksu\\.edu$');
    }

    function isEmailVerified() {
      return request.auth.token.email_verified == true;
    }

    match /users/{userId} {
      // Can create own user during signup (even if not verified yet)
      allow create: if request.auth != null &&
                       isKSUEmail() &&
                       request.auth.uid == userId;

      // Can only read/write if email verified
      allow read, update: if request.auth != null &&
                            isEmailVerified() &&
                            request.auth.uid == userId;
    }
  }
}
```

## Testing

### Emulator Setup

```bash
# Start Firebase emulators
firebase emulators:start

# The app will auto-connect in development mode
```

### Test Credentials

For Firebase emulator testing:

```typescript
// These work in emulator without real email verification
const testUser = {
  email: 'test@ksu.edu',
  password: 'testpassword123',
  name: 'Test User',
  phoneNumber: '5551234567'
};
```

### Manual Testing Checklist

- [ ] Sign up with non-KSU email → Error
- [ ] Sign up with KSU email → Success + verification email
- [ ] Sign in before verifying email → Error
- [ ] Verify email via link → Success
- [ ] Sign in after verification → Success
- [ ] Sign out → Success
- [ ] Password reset → Email sent
- [ ] Invalid phone number → Error
- [ ] Session persistence → User stays signed in after app restart

## Production Deployment

### Email Verification

Firebase sends emails from: `noreply@<your-project>.firebaseapp.com`

To customize:
1. Go to Firebase Console → Authentication → Templates
2. Edit "Email address verification" template
3. Customize subject line and body
4. Add your app logo

### Recommended Settings

In Firebase Console → Authentication → Settings:

1. **Authorized domains**: Add your production domain
2. **Password policy**: Enforce minimum 8 characters (optional)
3. **Email enumeration protection**: Enable (recommended)
4. **User account management emails**: Customize templates

## Troubleshooting

### Email verification not working

```typescript
// Check if email was sent
import { resendVerificationEmail } from '../services/authService';

await resendVerificationEmail();
```

### Session not persisting

Check that AsyncStorage is properly installed:

```bash
npm install @react-native-async-storage/async-storage
```

For iOS:
```bash
cd ios && pod install
```

### Firebase errors

Enable debug logging:

```typescript
// In firebase.ts
import { setLogLevel } from 'firebase/app';
setLogLevel('debug');
```

## Security Best Practices

1. **Never disable email verification** - It's required for KSU domain validation
2. **Always validate email on server-side** - Firebase Rules enforce this
3. **Use HTTPS only** - Firebase uses HTTPS by default
4. **Rate limit auth attempts** - Firebase handles this automatically
5. **Monitor auth errors** - Use Firebase Analytics
6. **Keep Firebase SDK updated** - Run `npm update firebase` regularly

## Related Files

- `/Users/didowu/Desktop/Coding/rally-react-native/src/services/authService.ts`
- `/Users/didowu/Desktop/Coding/rally-react-native/src/hooks/useAuth.ts`
- `/Users/didowu/Desktop/Coding/rally-react-native/src/models/User.ts`
- `/Users/didowu/Desktop/Coding/rally-react-native/src/types/errors.ts`
- `/Users/didowu/Desktop/Coding/rally-react-native/src/config/firebase.ts`
- `/Users/didowu/Desktop/Coding/rally-react-native/src/screens/Auth/SignUpScreen.tsx`

## Migration from Swift

Key changes from the original Swift implementation:

| Swift | React Native |
|-------|-------------|
| `@MainActor` class | Regular TypeScript functions |
| `@Published var` | React hooks (`useState`) |
| `Combine` publishers | Auth state listeners |
| `try await` | `async/await` (same syntax!) |
| `FirebaseAuth.User` | `firebase/auth` User |
| SwiftUI views | React Native components |

The business logic remains identical - only the UI layer changed.
