import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StatusBar,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Animation Values
  const scaleValue = useRef(new Animated.Value(0.3)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(25)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations: Logo entrance -> Text reveal
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Extending & fading ripple animation loop (rings expand outward and fade)
    const rippleLoop = Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    rippleLoop.start();

    // Optional timer to trigger onFinish callback after 2.6 seconds
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 2600);

    return () => {
      rippleLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onFinish}
      style={tw`flex-1 bg-slate-900 justify-between items-center relative overflow-hidden`}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent />

      {/* Ambient background blur/gradient glow circles */}
      <View
        style={[
          tw`absolute w-96 h-96 rounded-full opacity-15 bg-amber-500`,
          { top: -100, right: -100, transform: [{ scale: 1.4 }] },
        ]}
      />
      <View
        style={[
          tw`absolute w-96 h-96 rounded-full opacity-10 bg-indigo-600`,
          { bottom: -120, left: -100, transform: [{ scale: 1.4 }] },
        ]}
      />

      {/* Decorative Grid Dots */}
      <View style={[tw`absolute opacity-15`, { top: insets.top + 40, left: 24 }]}>
        {[0, 1, 2, 3].map(row => (
          <View key={row} style={tw`flex-row mb-2`}>
            {[0, 1, 2, 3].map(col => (
              <View key={col} style={tw`w-1.5 h-1.5 rounded-full bg-slate-300 mr-2.5`} />
            ))}
          </View>
        ))}
      </View>

      {/* Decorative Geometry */}
      <View
        style={[
          tw`absolute top-28 right-12 w-3 h-3 opacity-20 bg-amber-400`,
          { transform: [{ rotate: '45deg' }] },
        ]}
      />
      <View
        style={[
          tw`absolute bottom-40 right-16 w-2 h-2 opacity-25 bg-indigo-400`,
          { transform: [{ rotate: '45deg' }] },
        ]}
      />

      {/* Center Logo & Rings Section */}
      <View style={tw`flex-1 justify-center items-center`}>
        {/* Dedicated Centered Logo & Rings Container */}
        <View style={tw`w-48 h-48 items-center justify-center relative mb-2`}>
          {/* Animated Extending & Fading Ripple Rings */}
          <Animated.View
            style={[
              tw`absolute w-36 h-36 rounded-full border border-amber-500/40 bg-amber-500/10`,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0.8, 0.6, 0.2, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.55],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`absolute w-44 h-44 rounded-full border border-amber-500/25 bg-amber-500/5`,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.25, 0.8, 1],
                  outputRange: [0.6, 0.45, 0.1, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1.95],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              tw`absolute w-52 h-52 rounded-full border border-amber-400/15 bg-amber-400/5`,
              {
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.3, 0.85, 1],
                  outputRange: [0.4, 0.3, 0.05, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.0, 2.35],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Main Logo Container - Centered relative to rings */}
          <Animated.View
            style={[
              tw`items-center justify-center shadow-2xl z-10`,
              {
                opacity: opacityValue,
                transform: [{ scale: scaleValue }],
              },
            ]}>
            <View style={tw`p-1 rounded-full bg-slate-900 border-2 border-amber-500/70 shadow-lg`}>
              <Image
                source={require('../assets/logo.png')}
                style={tw`w-28 h-28 rounded-full`}
                resizeMode="cover"
              />
            </View>
          </Animated.View>
        </View>

        {/* Text Details */}
        <Animated.View
          style={[
            tw`items-center mt-6`,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}>
          <Text style={tw`text-white text-3xl font-extrabold tracking-wider text-center`}>
            Connect <Text style={{ color: '#F59E0B' }}>App</Text>
          </Text>

          <View style={tw`flex-row items-center mt-2.5 px-3.5 py-1 bg-slate-800/80 rounded-full border border-slate-700/60`}>
            <View style={tw`w-2 h-2 rounded-full bg-amber-500 mr-2`} />
            <Text style={tw`text-amber-400 text-xs font-semibold tracking-widest uppercase`}>
              Vendor Dashboard
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer / Tagline */}
      <Animated.View
        style={[
          tw`items-center pb-8`,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32,
            opacity: bottomOpacity,
          },
        ]}>
        <Text style={tw`text-slate-400 text-xs font-medium tracking-wide mb-3`}>
          Empowering Local Businesses
        </Text>

        {/* Subtle Progress Bar Line */}
        <View style={tw`w-32 h-1 bg-slate-800 rounded-full overflow-hidden`}>
          <Animated.View
            style={[
              tw`h-full w-full bg-amber-500 rounded-full`,
              {
                transform: [
                  {
                    scaleX: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.15, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
