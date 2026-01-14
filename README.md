# Rally Ride

Cross-platform designated driver coordination app for university organizations.

## Overview

Rally Ride connects riders with designated drivers (DDs) during events. Built with React Native (Expo) and Firebase.

### Key Features
- **Ride Request**: Location-based pickup with manual address fallback
- **DD Queue**: Priority-based assignment (class year + wait time)
- **Push Notifications**: Real-time status updates
- **Admin Tools**: Member management, event scheduling, DD monitoring
- **Multi-Chapter**: University-based chapters with cross-chapter event support

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, TypeScript |
| **State** | Redux Toolkit, Redux Persist |
| **Backend** | Firebase (Auth, Firestore, Cloud Functions) |
| **Notifications** | Expo Push Notifications |

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Firebase CLI: `npm install -g firebase-tools`

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/rally-react-native.git
cd rally-react-native

# Install dependencies
npm install
cd functions && npm install && cd ..

# Start development
npm start
```

### Firebase Setup

1. Create project in [Firebase Console](https://console.firebase.google.com)
2. Enable: Authentication, Firestore, Cloud Functions
3. Download config files:
   - `GoogleService-Info.plist` → project root (iOS)
   - `google-services.json` → project root (Android)

### Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Environment Variables

Create `.env` in project root:
```env
# Google Places API (optional - stored in Cloud Function secrets)
GOOGLE_PLACES_API_KEY=your_key_here
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Firebase, constants
├── models/         # TypeScript interfaces
├── navigation/     # React Navigation setup
├── screens/        # App screens by role
│   ├── Auth/       # Login, Signup
│   ├── Rider/      # Request ride, status
│   ├── DD/         # Queue, navigation
│   └── Admin/      # Dashboard, members
├── services/       # API, Firebase calls
└── store/          # Redux slices
functions/
└── src/            # Cloud Functions
```

## User Roles

| Role | Capabilities |
|------|-------------|
| **Rider** | Request rides, view status, cancel |
| **DD** | View queue, accept rides, mark complete |
| **Admin** | All above + manage members/events |

## Testing

```bash
# TypeScript check
npm run tsc

# Run tests
npm test
```

## Deployment

### Mobile App
```bash
# Build for iOS/Android
eas build --platform all
```

### Cloud Functions
```bash
firebase deploy --only functions
```

## License

Private - All rights reserved.
