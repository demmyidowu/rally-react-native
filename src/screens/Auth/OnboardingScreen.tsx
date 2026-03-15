import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, updateUserProfile } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🚗',
    title: 'Request a Ride',
    body:
      'Need a safe ride home? Tap "Request a Ride" and you\'ll be placed in the queue. Your spot is prioritized by class year and how long you\'ve been waiting.',
  },
  {
    id: '2',
    emoji: '🚨',
    title: 'Emergency Button',
    body:
      'If you\'re in an unsafe situation, press the Emergency button. Your ride is moved to the top of the queue instantly and chapter admins are alerted right away.',
  },
  {
    id: '3',
    emoji: '🏅',
    title: 'Be a DD',
    body:
      'Want to be a designated driver? Head to the DD tab, fill in your car details, then toggle yourself active. You\'ll receive ride assignments directly in the app.',
  },
];

const OnboardingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const handleGetStarted = async () => {
    if (user) {
      await dispatch(updateUserProfile({
        userId: user.id,
        data: { onboardingComplete: true },
      }));
    }
    // AppNavigator auto-switches to Main when onboardingComplete = true
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideBody}>{item.body}</Text>
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        {isLastSlide ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xl,
  },
  slideTitle: {
    ...typography.h1,
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  slideBody: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[200],
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default OnboardingScreen;
