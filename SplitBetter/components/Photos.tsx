import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PhotosProps {
  splitId: string;
}

export default function Photos({ splitId }: PhotosProps) {
  // Placeholder: Replace with actual photo upload/gallery logic
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photos</Text>
      <Text style={styles.subtitle}>Participants can upload and view trip photos here.</Text>
      {/* TODO: Add photo upload and gallery features */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
});