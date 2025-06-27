import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import { query, collection, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';


const categories = ["Food", "Transport", "Entertainment", "Others"];

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("Total Expenses");
  // const [expense, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState<{[k: string]: number}>({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [debtMap, setDebtMap] = useState<{ [userId: string]: number }>({});
  const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => { 
      let totals: {[k: string]: number} = {}
      let overall = 0;
      let newDebtMap: { [userId: string]: number} = {};

      // Get all Splits where user is a participant
      const splitsQuery = query(
        collection(db, 'splits'),
        where('participants', 'array-contains', user.uid)
      );
      const splitsSnapshot = await getDocs(splitsQuery);
      const splitsIds = splitsSnapshot.docs.map(doc => doc.id);

      // Need fetch usernames to store users
      const userIdSet = new Set<string>();

      // For each get all expenses where user is a participant
      for (const splitId of splitsIds) {
        const splitDoc = splitsSnapshot.docs.find(doc => doc.id === splitId);
        const splitData = splitDoc?.data() || {};
        const splitParticipants: string[] = splitData.participants || [];
        
        const expenseColl = collection(db, 'splits', splitId, 'expenses');
        const expensesSnapshot = await getDocs(expenseColl);
        
        expensesSnapshot.forEach(expDoc => {
          const exp = expDoc.data();
          const participants: string[] = exp.participants || splitParticipants;
          if (!participants || participants.length === 0) return;

          // For individual expenses
          if (participants.includes(user.uid)) {
            let share = 0;
            // Equal Splitting
            if (exp.splitType === "Equally" && Array.isArray(exp.participants)) {
              share = exp.amount / exp.participants.length;
            } else {
              // fallback for non-equal splits: just add full amount
              share = exp.amount;
            }
            const cat = exp.category || 'Others';
            totals[cat] = (totals[cat] || 0) + share;
            overall += share;
          }

          // Debt calculation 
          const payer = exp.paidBy;
          if (!payer) return;

          participants.forEach(participantId => {
            if (participantId === payer) return;
            userIdSet.add(participantId);
            userIdSet.add(payer);

            // If you are the payer ppl owe you
            if (payer === user.uid && participantId != user.uid) {
              newDebtMap[participantId] = (newDebtMap[participantId] || 0) + exp.amount / participants.length;
            }

            if (participantId === user.uid && payer != user.uid) {
              newDebtMap[payer] = (newDebtMap[payer] || 0) - exp.amount / participants.length;
            }
          });
        });
      }
      setCategoryTotals(totals);
      setTotalExpenses(overall);
      setDebtMap(newDebtMap);

      // Fetch username for all userIds in the debtMap
    };

    fetchData();
  }, [user]);

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
        <>
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={styles.cardAmount}>${totalExpenses.toFixed(2)}</Text>
          </View>
          {categories.map(cat => (
            <View style={styles.card} key={cat}>
              <Text style={styles.cardLabel}>{cat}</Text>
              <Text style={styles.cardAmount}>${(categoryTotals[cat] || 0).toFixed(2)}</Text>
            </View>
          ))}
         
        </ScrollView>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
      {selectedTab === "Debt Settlement" && (
        <ScrollView>
          {debtSettlement.length === 0 ? (
            <View>
              <Text>No debt settlements to show</Text>
            </View>
          ) : ()}
        </ScrollView>
      )}

    </View> 
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding:20, paddingTop:70, paddingBottom: 100},
  title: {fontSize: 24, fontWeight:"bold", color: "#4169E1", textAlign: "center", marginBottom: 30},
  tabContainer: {flexDirection: "row", backgroundColor: "#f5f5f5", borderRadius: 25, padding:4, marginBottom: 20, alignSelf:"stretch"},
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderRadius: 20, marginHorizontal: 2},
  tabActive: {backgroundColor: "#fff", shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3},
  tabText: {color: "#555", textAlign: "center"},
  tabTextActive: {textAlign: "center", color: "#1d4aff", fontWeight: "bold"},
  card: {borderRadius: 16, padding: 24, marginBottom: 16, backgroundColor: "#fff", shadowColor: "#000",shadowOffset: {width: 0, height: 2},shadowOpacity: 0.06,shadowRadius: 8,elevation: 2 },
  cardLabel: { fontWeight: "600", fontSize: 18, marginBottom: 8,  color: "#212529" },
  signOutButton: { backgroundColor: "#4169E1", borderRadius: 8, alignItems: "center", padding: 16, marginTop: 20 },
  signOutText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  cardAmount: {fontSize: 28,fontWeight: 'bold',color: "#212529",marginTop: 4},
});
