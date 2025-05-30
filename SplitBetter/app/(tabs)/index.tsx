//import { Image } from 'expo-image';
import { View, Text, Image, Button, TouchableOpacity, TextInput, Platform, StyleSheet } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
//import './global.css';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

//const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  return (
    <View>
      <Text style={styles.header}>SplitBetter</Text>
      

      <View style={styles.itemContainer}>
        <Text style={styles.header}>Body</Text>
      </View>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 80,
    paddingLeft: responsiveWidth(7),
    width: '100%',
    color: 'blue',
    fontSize: 34,
    fontWeight: 'bold'
  },
  itemContainer: {
    backgroundColor: '#fff', // white background
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc', // light grey border
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 18,
  },
});
