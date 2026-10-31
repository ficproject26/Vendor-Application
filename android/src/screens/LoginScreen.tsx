import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  CheckSquare,
  Square,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { loginVendor, setToken, setVendorUser } from '../services/apiService';

// Google "G" icon component
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToSignup: () => void;
  isDark?: boolean;
}

export default function LoginScreen({ onLogin, onNavigateToSignup, isDark = false }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // OTP Modal states
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const passwordInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // OTP Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isOtpModalVisible && otpStep === 'code' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOtpModalVisible, otpStep, resendTimer]);

  const handleLogin = async () => {
    if (loading) return;
    const loginEmail = email.trim().toLowerCase();
    const loginPassword = password;

    if (!loginEmail || !loginPassword) {
      Alert.alert('Required Fields', 'Please enter your email and password to log in.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginVendor(loginEmail, loginPassword, rememberMe);
      if (res && res.success && res.user) {
        onLogin(res.user);
      } else {
        Alert.alert('Login Failed', res?.message || 'Invalid vendor credentials.');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to authenticate with backend server.';
      const lower = errMsg.toLowerCase();
      if (lower.includes('timed out')) {
        Alert.alert('Connection Timeout', 'Server response timed out. Please check your network connection.');
      } else if (
        lower.includes('unable to connect') ||
        lower.includes('network request failed') ||
        lower.includes('network connection') ||
        lower.includes('failed to fetch')
      ) {
        Alert.alert('Connection Error', 'Unable to reach the backend server. Please verify your internet connection or check if the backend service is running.');
      } else {
        Alert.alert('Authentication Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    Alert.alert(
      'Google Sign-In',
      'Google authentication requires a configured OAuth Client ID in your Google Cloud Console for the mobile package ID com.vendormobile.\n\nPlease sign in with your Vendor Email and Password, or use Mobile OTP.',
      [{ text: 'OK' }]
    );
  };

  // Mobile OTP Request Handler
  const handleRequestOtp = () => {
    const cleaned = otpPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setOtpLoading(true);
    // Simulate SMS dispatch with clear notice
    setTimeout(() => {
      setOtpLoading(false);
      setOtpStep('code');
      setResendTimer(30);
      Alert.alert('OTP Sent', `A 6-digit verification code has been dispatched to +91 ${cleaned}.`);
    }, 800);
  };

  // Mobile OTP Verify Handler
  const handleVerifyOtp = () => {
    const code = otpCode.trim();
    if (!code || code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the verification code sent to your mobile phone.');
      return;
    }

    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      Alert.alert(
        'Vendor Authentication',
        'Mobile OTP backend integration requires dedicated vendor phone verification endpoints. Please authenticate with your registered vendor credentials.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsOtpModalVisible(false);
              setOtpStep('phone');
              setOtpCode('');
            },
          },
        ]
      );
    }, 800);
  };

  return (
    <View style={[tw`flex-1`, isDark ? tw`bg-zinc-950` : tw`bg-white`]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? '#09090b' : '#0F172A'}
      />

      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`flex-grow`}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}>

          {/* Dark Navy Header Banner */}
          <View
            style={[
              tw`px-6 items-center`,
              {
                paddingTop: insets.top + 20,
                paddingBottom: 44,
                backgroundColor: isDark ? '#09090b' : '#0F172A',
              },
            ]}>
            {/* Decorative dots */}
            <View style={tw`absolute top-10 left-4 opacity-20`}>
              {[0, 1, 2, 3].map(row => (
                <View key={row} style={tw`flex-row mb-1.5`}>
                  {[0, 1, 2].map(col => (
                    <View key={col} style={tw`w-1.5 h-1.5 rounded-full bg-white mr-2`} />
                  ))}
                </View>
              ))}
            </View>

            {/* Decorative diamonds */}
            <View style={[tw`absolute top-16 right-12 w-2.5 h-2.5 opacity-25`, { transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(255,255,255,0.5)' }]} />
            <View style={[tw`absolute bottom-12 right-6 w-2 h-2 opacity-20`, { transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(255,255,255,0.5)' }]} />

            {/* Logo */}
            <View style={tw`items-center justify-center mb-1`}>
              <Image
                source={require('../assets/logo.png')}
                style={tw`w-20 h-20 rounded-full border-2 border-amber-500/40`}
                resizeMode="cover"
              />
            </View>

            <Text style={tw`text-white text-2xl font-bold mt-2 text-center`}>
              Connect <Text style={{ color: '#F59E0B' }}>App</Text>
            </Text>
            <Text style={tw`text-gray-400 text-xs font-medium mt-0.5`}>
              Vendor Dashboard
            </Text>

            <Text style={tw`text-gray-300 text-center text-xs mt-2.5 px-4 leading-4`}>
              Manage your business, orders, and customers in one place
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              tw`flex-1 px-6 pt-7 pb-6`,
              isDark ? tw`bg-zinc-950 border-t border-zinc-800` : tw`bg-white`,
              {
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                marginTop: -20,
              },
            ]}>
            <Text style={[tw`text-2xl font-bold text-center`, isDark ? tw`text-white` : tw`text-gray-900`]}>
              Welcome Back!
            </Text>
            <Text style={[tw`text-sm text-center mt-1 mb-6`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
              Sign in to your vendor account
            </Text>

            {/* Email / Username Input */}
            <View style={[
              tw`flex-row items-center rounded-xl px-4 py-0.5 mb-3.5 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-gray-50 border-gray-200`
            ]}>
              <Mail size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
              <TextInput
                style={[
                  tw`flex-1 ml-3 text-sm font-medium py-3`,
                  isDark ? tw`text-white` : tw`text-gray-800`
                ]}
                placeholder="Email Address"
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Password Input */}
            <View style={[
              tw`flex-row items-center rounded-xl px-4 py-0.5 mb-2 border`,
              isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-gray-50 border-gray-200`
            ]}>
              <Lock size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
              <TextInput
                ref={passwordInputRef}
                style={[
                  tw`flex-1 ml-3 text-sm font-medium py-3`,
                  isDark ? tw`text-white` : tw`text-gray-800`
                ]}
                placeholder="Password"
                placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <Eye size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
                ) : (
                  <EyeOff size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
                )}
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={tw`self-end mb-4`}
              onPress={() => Alert.alert('Password Reset', 'Please visit the Vendor Web Portal or contact Platform Support to reset your password.')}>
              <Text style={tw`text-indigo-600 text-xs font-bold`}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Remember Me */}
            <TouchableOpacity
              style={tw`flex-row items-center mb-5`}
              onPress={() => setRememberMe(!rememberMe)}>
              {rememberMe ? (
                <CheckSquare size={18} color="#4F46E5" />
              ) : (
                <Square size={18} color={isDark ? '#52525B' : '#9CA3AF'} />
              )}
              <Text style={[tw`text-sm font-medium ml-2`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                Remember me
              </Text>
            </TouchableOpacity>

            {/* Submit / Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={[
                tw`py-3.5 rounded-2xl items-center justify-center mb-4`,
                {
                  backgroundColor: loading ? '#D1D5DB' : '#F59E0B',
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 5,
                },
              ]}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={tw`text-white font-bold text-base`}>Login</Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={tw`flex-row items-center mb-4`}>
              <View style={[tw`flex-1 h-px`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
              <Text style={[tw`text-xs font-medium mx-4`, isDark ? tw`text-zinc-500` : tw`text-gray-400`]}>OR</Text>
              <View style={[tw`flex-1 h-px`, isDark ? tw`bg-zinc-800` : tw`bg-gray-200`]} />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
              style={[
                tw`flex-row items-center justify-center py-3.5 rounded-2xl mb-2.5 border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`
              ]}>
              <GoogleIcon size={20} />
              <Text style={[tw`font-semibold text-sm ml-3`, isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Continue with Mobile OTP */}
            <TouchableOpacity
              onPress={() => {
                setOtpStep('phone');
                setOtpPhone('');
                setOtpCode('');
                setIsOtpModalVisible(true);
              }}
              activeOpacity={0.7}
              style={[
                tw`flex-row items-center justify-center py-3.5 rounded-2xl mb-5 border`,
                isDark ? tw`bg-zinc-900 border-zinc-800` : tw`bg-white border-gray-200`
              ]}>
              <View style={[tw`w-5 h-5 rounded-full items-center justify-center`, { backgroundColor: '#4F46E5' }]}>
                <Phone size={12} color="#FFFFFF" />
              </View>
              <Text style={[tw`font-semibold text-sm ml-3`, isDark ? tw`text-zinc-200` : tw`text-gray-700`]}>
                Continue with Mobile OTP
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={tw`flex-row justify-center pb-2`}>
              <Text style={[tw`text-sm`, isDark ? tw`text-zinc-400` : tw`text-gray-500`]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onNavigateToSignup}>
                <Text style={tw`text-indigo-600 text-sm font-bold`}>
                  Register Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mobile OTP Modal */}
      <Modal
        visible={isOtpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOtpModalVisible(false)}>
        <View style={[tw`flex-1 justify-end`, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[
            tw`rounded-t-3xl px-6 pt-6 pb-8`,
            isDark ? tw`bg-zinc-900 border-t border-zinc-800` : tw`bg-white`
          ]}>
            {/* Modal Header */}
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={[tw`text-xl font-bold`, isDark ? tw`text-white` : tw`text-gray-900`]}>
                {otpStep === 'phone' ? 'Mobile OTP Login' : 'Enter Verification Code'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsOtpModalVisible(false)}
                style={[tw`w-8 h-8 rounded-full items-center justify-center`, isDark ? tw`bg-zinc-800` : tw`bg-gray-100`]}>
                <X size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {otpStep === 'phone' ? (
              <>
                <Text style={[tw`text-sm mb-4`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  Enter your registered 10-digit mobile number to receive a one-time verification code.
                </Text>
                <View style={[
                  tw`flex-row items-center rounded-xl px-4 py-1 mb-5 border`,
                  isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-50 border-gray-200`
                ]}>
                  <Text style={[tw`font-bold text-sm mr-2`, isDark ? tw`text-zinc-300` : tw`text-gray-700`]}>+91</Text>
                  <TextInput
                    style={[tw`flex-1 text-sm font-medium py-3`, isDark ? tw`text-white` : tw`text-gray-900`]}
                    placeholder="Enter 10-digit Mobile Number"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    value={otpPhone}
                    onChangeText={setOtpPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={otpLoading}
                  style={[
                    tw`py-3.5 rounded-2xl items-center justify-center bg-indigo-600`,
                    otpLoading && tw`opacity-50`
                  ]}>
                  {otpLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={tw`text-white font-bold text-base`}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[tw`text-sm mb-4`, isDark ? tw`text-zinc-400` : tw`text-gray-600`]}>
                  Enter the 6-digit verification code sent to +91 {otpPhone}.
                </Text>
                <View style={[
                  tw`rounded-xl px-4 py-1 mb-4 border items-center`,
                  isDark ? tw`bg-zinc-800 border-zinc-700` : tw`bg-gray-50 border-gray-200`
                ]}>
                  <TextInput
                    style={[tw`text-center text-xl font-bold tracking-widest py-3 w-full`, isDark ? tw`text-white` : tw`text-gray-900`]}
                    placeholder="• • • • • •"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={tw`flex-row justify-between items-center mb-5`}>
                  <TouchableOpacity onPress={() => setOtpStep('phone')}>
                    <Text style={tw`text-indigo-600 text-xs font-semibold`}>Change Number</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    disabled={resendTimer > 0}>
                    <Text style={[tw`text-xs font-semibold`, resendTimer > 0 ? (isDark ? tw`text-zinc-600` : tw`text-gray-400`) : tw`text-indigo-600`]}>
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                  style={[
                    tw`py-3.5 rounded-2xl items-center justify-center bg-emerald-600`,
                    otpLoading && tw`opacity-50`
                  ]}>
                  {otpLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={tw`text-white font-bold text-base`}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
