import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { StatusBar } from 'expo-status-bar';
import { Octicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

export default function AuthScreen() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Using useRef for form inputs (tutorial approach)
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const usernameRef = useRef('');
  
  const authContext = useAuth();
  console.log('Auth context:', authContext); // Debug log
  const { login, register } = authContext;

  const handleSignIn = async () => {
    if(!emailRef.current || !passwordRef.current) {
      Alert.alert('Sign In', 'Please fill in all the fields!');
      return;
    }
    setIsLoading(true);

    try {
      let response = await login(emailRef.current, passwordRef.current);
      setIsLoading(false);

      console.log('got result: ', response);
      if(!response.success){
        Alert.alert('Sign In', response.msg);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Sign In', 'An error occurred. Please try again.');
      console.error('Sign in error:', error);
    }
  };

  const handleRegister = async () => {
    console.log('handleRegister called');
    console.log('register function:', register);
    console.log('typeof register:', typeof register);
    
    if(!emailRef.current || !passwordRef.current || !usernameRef.current) {
      Alert.alert('Sign Up', 'Please fill in all the fields!');
      return;
    }
    setIsLoading(true);

    try {
      // Register with email, password, and username only
      let response = await register(emailRef.current, passwordRef.current, usernameRef.current);
      setIsLoading(false);

      console.log('got result: ', response);
      if(!response.success){
        Alert.alert('Sign Up', response.msg);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Sign Up', 'An error occurred. Please try again.');
      console.error('Register error:', error);
    }
  };

  const handleAuth = () => {
    if (isSignIn) {
      handleSignIn();
    } else {
      handleRegister();
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    // Clear the ref values
    emailRef.current = '';
    passwordRef.current = '';
    usernameRef.current = '';
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
          
          {/* Username input for Sign Up */}
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
                placeholder='Username' 
                placeholderTextColor={'gray'}
                onChangeText={(text) => { usernameRef.current = text; }}
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
              onChangeText={(text) => { emailRef.current = text; }}
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
              onChangeText={(text) => { passwordRef.current = text; }}
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