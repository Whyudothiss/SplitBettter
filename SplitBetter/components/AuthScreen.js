import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { StatusBar } from 'expo-status-bar';
import { Octicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

export default function AuthScreen() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password || (!isSignIn && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      let result;
      if (isSignIn) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar style="dark" />
      <View style={{
        paddingHorizontal: wp(5), 
        paddingTop: hp(8),
        flex: 1,
        justifyContent: 'center',
        gap: 48
      }}>
        <View style={{ gap: 20 }}>
          <Text style={{
            fontSize: hp(4), 
            fontWeight: 'bold', 
            textAlign: 'center'
          }}>
            {isSignIn ? 'Sign In' : 'Sign Up'}
          </Text>
          
          {/* Name input for Sign Up */}
          {!isSignIn && (
            <View style={{
              height: hp(7),
              flexDirection: 'row',
              gap: 16,
              paddingHorizontal: 16,
              backgroundColor: '#e5e7eb',
              alignItems: 'center',
              borderRadius: 16
            }}>
              <Octicons name="person" size={hp(2.7)} color='gray' />
              <TextInput 
                style={{ fontSize: hp(2), flex: 1, fontWeight: '600', color: '#4B5563' }}
                placeholder='Full Name' 
                placeholderTextColor={'gray'}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}
          
          {/* Email input */}
          <View style={{
            height: hp(7),
            flexDirection: 'row',
            gap: 16,
            paddingHorizontal: 16,
            backgroundColor: '#e5e7eb',
            alignItems: 'center',
            borderRadius: 16
          }}>
            <Octicons name="mail" size={hp(2.7)} color='gray' />
            <TextInput 
              style={{ fontSize: hp(2), flex: 1, fontWeight: '600', color: '#4B5563' }}
              placeholder='Email Address' 
              placeholderTextColor={'gray'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {/* Password input */}
          <View style={{
            height: hp(7),
            flexDirection: 'row',
            gap: 16,
            paddingHorizontal: 16,
            backgroundColor: '#e5e7eb',
            alignItems: 'center',
            borderRadius: 16
          }}>
            <Octicons name="lock" size={hp(2.7)} color='gray' />
            <TextInput 
              style={{ fontSize: hp(2), flex: 1, fontWeight: '600', color: '#4B5563' }}
              placeholder='Password' 
              placeholderTextColor={'gray'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={{
              height: hp(6.5),
              backgroundColor: '#6366F1', 
              borderRadius: 16, 
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1
            }}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{
                fontSize: hp(2.7),
                color: 'white', 
                fontWeight: 'bold', 
                letterSpacing: 1.5 
              }}>
                {isSignIn ? 'Sign In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Toggle between Sign In and Sign Up */}
          <TouchableOpacity onPress={toggleMode} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2), color: '#6366F1', fontWeight: '600' }}>
              {isSignIn ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}