import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../components/AuthContext';


const categories = ["Food", "Transport", "Entertainment", "Others"];

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("Total Expenses");
  const [expense, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});

  const handleLogout = async () => {
    await logout();
  }; 

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My profile</Text>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, selectedTab === "Total Expenses" && styles.tabActive]} 
        onPress={() => setSelectedTab("Total Expenses")}>
          <Text style={selectedTab === "Total Expenses" ? styles.tabTextActive : styles.tabText}>Total Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, selectedTab === "Debt Settlement" && styles.tabActive]}
        onPress={() => setSelectedTab("Debt Settlement")}>
          <Text style={selectedTab === "Debt Settlement" ? styles.tabTextActive : styles.tabText}>Debt Settlement</Text>
        </TouchableOpacity>
      </View>
      {selectedTab === "Total Expenses" && (
        <ScrollView style={{flex: 1}}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text></Text>
          </View>
          {categories.map(cat => (
            <View style={styles.card} key={cat}>
              <Text style={styles.cardLabel}>{cat}</Text>
              <Text></Text>
            </View>
          ))}
          <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      {/* {selectedTab === "Debt Settlement" && ()} */}

    </View> 
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding:20, paddingTop:70},
  title: {fontSize: 24, fontWeight:"bold", color: "#4169E1", textAlign: "center", marginBottom: 30},
  tabContainer: {flexDirection: "row", backgroundColor: "#f5f5f5", borderRadius: 25, padding:4, marginBottom: 20, alignSelf:"stretch"},
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderRadius: 20, marginHorizontal: 2},
  tabActive: {backgroundColor: "#fff", shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3},
  tabText: {color: "#555", textAlign: "center"},
  tabTextActive: {textAlign: "center", color: "#1d4aff", fontWeight: "bold"},
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 20, marginBottom: 12, backgroundColor: "#fff" },
  cardLabel: { fontWeight: "bold", fontSize: 17, marginBottom: 6 },
  cardAmount: { fontSize: 28, fontWeight: "bold" },
  signOutButton: { backgroundColor: "#4169E1", borderRadius: 8, alignItems: "center", padding: 16, marginTop: 20 },
  signOutText: { color: "#fff", fontWeight: "bold", fontSize: 18 }
});
