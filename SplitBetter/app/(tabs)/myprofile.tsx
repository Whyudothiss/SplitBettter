import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import { query, collection, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

const categories = ["Food", "Transport", "Entertainment", "Others"];

interface SettlementPageProps {
    person: {
      userId: string;
      displayName: string;
      amount: number;
    };
    onBack: () => void;
    onSettle: () => void;
  }
// Settlement Page Component
function SettlementPage({ person, onBack, onSettle }: SettlementPageProps) {
  const { user } = useAuth();
  
  // Case where user is null
  if (!user) {
    return (
      <View style={styles.settlementContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  const handleSettleUp = async () => {
    try {
      // Create a settlement expense - the person who owes money pays the person they owe
      const settlementAmount = Math.abs(person.amount);
      
      // Find a split where both users are participants to add the settlement
      const splitsQuery = query(
        collection(db, 'splits'),
        where('participants', 'array-contains', user.uid)
      );
      const splitsSnapshot = await getDocs(splitsQuery);
      
      // Find a split that also contains the other person
      let targetSplitId = null;
      for (const splitDoc of splitsSnapshot.docs) {
        const splitData = splitDoc.data();
        if (splitData.participants.includes(person.userId)) {
          targetSplitId = splitDoc.id;
          break;
        }
      }
      
      if (!targetSplitId) {
        alert('No shared split found to record settlement');
        return;
      }
      
      // Add settlement expense
      await addDoc(collection(db, 'splits', targetSplitId, 'expenses'), {
        title: `Settlement: ${person.displayName}`,
        amount: settlementAmount,
        currency: 'SGD',
        category: 'Others',
        splitType: 'Equally',
        // If current user owes money, they are paying 
        // If current user is owed money, the other person is paying 
        paidBy: person.amount < 0 ? user.uid : person.userId,
        paidByName: person.amount < 0 ? (user.displayName || user.email) : person.displayName,
        participants: [user.uid, person.userId],
        type: 'settlement',
        createdAt: serverTimestamp(),
        description: `Settlement between ${user.displayName || user.email} and ${person.displayName}`
      });
      
      onSettle();
    } catch (error) {
      console.error('Error settling up:', error);
      alert('Failed to settle up. Please try again.');
    }
  };

  return (
    <View style={styles.settlementContainer}>
      <View style={styles.settlementHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.settlementTitle}>Settlement</Text>
      </View>
      
      <View style={styles.settlementCard}>
        <Text style={styles.settlementPersonName}>{person.displayName}</Text>
        <Text style={styles.settlementAmount}>
          {person.amount < 0 
            ? `You owe ${person.displayName}` 
            : `${person.displayName} owes you`}
        </Text>
        <Text style={[styles.settlementAmountValue, { 
          color: person.amount < 0 ? '#e74c3c' : '#27ae60' 
        }]}>
          ${Math.abs(person.amount).toFixed(2)}
        </Text>
        
        <Text style={styles.settlementDescription}>
          {person.amount < 0 
            ? `Settling this will record that you paid ${person.displayName} $${Math.abs(person.amount).toFixed(2)}`
            : `Settling this will record that ${person.displayName} paid you $${Math.abs(person.amount).toFixed(2)}`}
        </Text>
        
        <TouchableOpacity 
          style={styles.settleButton} 
          onPress={handleSettleUp}
        >
          <Text style={styles.settleButtonText}>Settle Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("Total Expenses");
  const [categoryTotals, setCategoryTotals] = useState<{[k: string]: number}>({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [debtMap, setDebtMap] = useState<{ [userId: string]: number }>({});
  const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<{ userId: string; displayName: string; amount: number} | null>(null);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
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

        const isSettlement = exp.type === 'settlement'; // So it don't get added to total expenditure
        // For individual expenses
        if (participants.includes(user.uid) && !isSettlement) {
          let share = 0;
          // Handle different split types
          if (exp.splitType === "Custom" && exp.customAmounts && exp.customAmounts[user.uid]) {
            // Use custom amount for this user
            share = exp.customAmounts[user.uid];
          } else if (exp.splitType === "Equally" && Array.isArray(exp.participants)) {
            // Equal splitting
            share = exp.amount / exp.participants.length;
          } else {
            // Fallback for other split types
            share = exp.amount / participants.length;
          }
          const cat = exp.category || 'Others';
          totals[cat] = (totals[cat] || 0) + share;
          overall += share;
        }

        // Debt calculation 
        const payer = exp.paidBy;
        if (!payer) return;


        // Handle Settlement differently
        if (isSettlement) {
          participants.forEach(participantId => {
            userIdSet.add(participantId);
            userIdSet.add(payer);
            
            if (payer === user.uid && participantId !== user.uid) {
              // You paid someone directly (settlement)
              newDebtMap[participantId] = (newDebtMap[participantId] || 0) + exp.amount;
            } else if (participantId === user.uid && payer !== user.uid) {
              // Someone paid you directly (settlement)
              newDebtMap[payer] = (newDebtMap[payer] || 0) - exp.amount;
            }
          });
        } else {
          // Handle regular expenses for debt calculation
          participants.forEach(participantId => {
            userIdSet.add(participantId);
            userIdSet.add(payer);
          });

          // Calculate each person's share of the expense
          let userShare = 0;
          let payerShare = 0;
          
          if (exp.splitType === "Custom" && exp.customAmounts) {
            // For custom splits, use the exact amounts
            userShare = exp.customAmounts[user.uid] || 0;
            payerShare = exp.customAmounts[payer] || 0;
          } else {
            // For equal splits, divide equally
            const shareAmount = exp.amount / participants.length;
            userShare = participants.includes(user.uid) ? shareAmount : 0;
            payerShare = participants.includes(payer) ? shareAmount : 0;
          }

          // Update debt based on who paid vs who owes
          if (payer === user.uid) {
            // Current user paid - others owe them their share
            participants.forEach(participantId => {
              if (participantId !== user.uid) {
                let participantShare = 0;
                if (exp.splitType === "Custom" && exp.customAmounts) {
                  participantShare = exp.customAmounts[participantId] || 0;
                } else {
                  participantShare = exp.amount / participants.length;
                }
                newDebtMap[participantId] = (newDebtMap[participantId] || 0) + participantShare;
              }
            });
          } else if (participants.includes(user.uid)) {
            // Someone else paid and current user participated - current user owes their share
            newDebtMap[payer] = (newDebtMap[payer] || 0) - userShare;
          }
        }  
      });
    }
    setCategoryTotals(totals);
    setTotalExpenses(overall);
    setDebtMap(newDebtMap);

    // Fetch username for all userIds in the debtMap
    const idList = Array.from(new Set([...Object.keys(newDebtMap), ...Array.from(userIdSet)])).filter(id => id !== user.uid);
    const names: { [userId: string]: string } = {};
    await Promise.all(idList.map(async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          names[uid] = userData.username || userData.name || uid;
        } else {
          names[uid] = uid;
        }
      } catch {
        names[uid] = uid;
      }
    }));
    setUsernames(names);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const handlePersonSelect = (userId: string, displayName: string, amount: number) => {
    setSelectedPerson({ userId, displayName, amount });
  };

  const handleBackFromSettlement = () => {
    setSelectedPerson(null);
  };

  const handleSettlementComplete = () => {
    setSelectedPerson(null);
    // Refresh data after settlement
    fetchData();
  };

  // If a person is selected, show the settlement page
  if (selectedPerson && user) {
    return (
      <SettlementPage
        person={selectedPerson}
        onBack={handleBackFromSettlement}
        onSettle={handleSettlementComplete}
      />
    );
  }

  // Show loading state if user is not available
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

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
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {Object.keys(debtMap).length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>No debt settlements to show</Text>
            </View>
          ) : (
            Object.entries(debtMap).map(([otherUserId, amount]) => {
              if (Math.abs(amount) < 0.01) return null; // skip settled
              const displayName = usernames[otherUserId] || otherUserId;
              return (
                <TouchableOpacity 
                  key={otherUserId} 
                  style={styles.card} 
                  onPress={() => handlePersonSelect(otherUserId, displayName, amount)}
                >
                  <Text style={styles.cardLabel}>
                    {amount < 0 ? `You owe ${displayName}` : `${displayName} owes you`}
                  </Text>
                  <Text style={[styles.cardAmount, { color: amount < 0 ? '#e74c3c' : '#27ae60' }]}>
                    ${Math.abs(amount).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
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
    settlementContainer: {flex: 1, backgroundColor: "#fff", padding: 20, paddingTop: 70,},
    settlementHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 30,},
    backButton: {padding:10, marginRight: 10},
    backButtonText: {fontSize:16, color: "#4169E1", fontWeight: '600',},
    settlementTitle: {fontSize: 24, fontWeight: "bold", color: "#4169E1", flex: 1, textAlign: "center", marginRight: 50,},
    settlementCard: {borderRadius: 16, padding: 24, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: 'center'},
    settlementPersonName: {fontSize: 24, fontWeight: 'bold', color: "#212529", marginBottom: 10, },
    settlementAmount: {fontSize: 18, color: "#666", marginBottom: 5, },
    settlementAmountValue: {fontSize: 32, fontWeight: 'bold', marginBottom: 20},
    settlementDescription: {fontSize: 16, color: "#666", textAlign: 'center', marginBottom: 30, lineHeight: 22, },
    settleButton: {backgroundColor: "#4169E1", borderRadius: 8, paddingVertical: 16, paddingHorizontal: 40, alignItems: "center", },
    settleButtonText: { color: "#fff", fontWeight: "bold", fontSize: 18,},
  });