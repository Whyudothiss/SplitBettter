// // //import { Image } from 'expo-image';
// //import './global.css';
import { View, Text, Image, Button, TouchableOpacity, TextInput, Platform, StyleSheet } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import React from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {

  // Show AuthScreen if not authenticated


  return (
    <View style={styles.container}>
      <Text style={styles.header}>SplitBetter</Text>
      
      <TouchableOpacity style={styles.tripButton}>
        <Text style={styles.tripButtonText}>Trip 1</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tripButton}>
        <Text style={styles.tripButtonText}>Meal 2</Text>
      </TouchableOpacity>
    </View>
  );
  
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5', // light grey background to match mockup
  },
  header: {
    marginTop: 80,
    marginBottom: 40,
    textAlign: 'center',
    color: '#4169E1', // royal blue color
    fontSize: 34,
    fontWeight: 'bold'
  },
  tripButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
    height: 80,
    justifyContent: 'center',
    // Add shadow for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    // Add elevation for Android
    elevation: 5,
  },
  tripButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});
