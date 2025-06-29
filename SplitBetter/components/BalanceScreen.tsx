import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface Split {
  id: string;
  title: string;
  currency: string;
  budget: number;
  participants: string[];
  participantsNames?: Record<string, string>;
  createdAt: any;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName: string;
  participants?: string[];
  splitId: string;
  createdAt: any;
}

interface BalanceScreenProps {
  split: Split;
  expenses: Expense[];
  currentUserId: string;
}

// Calculate net balances for each user
function calculateNetBalances(split: Split, expenses: Expense[]) {
  const paid: { [userId: string]: number } = {};
  const owed: { [userId: string] : number } = {};
  split.participants.forEach(uid => {
    paid[uid] = 0;
    owed[uid] = 0;
  });

  expenses.forEach(expense => {
    // Expense Participants
    const participants = expense.participants || split.participants;
    const share = expense.amount / participants.length; // For equal splitting 

    // Add to payer's paid
    paid[expense.paidBy] = (paid[expense.paidBy] || 0 ) + expense.amount;

    // Add to owed of all participants
    participants.forEach(uid => {
      owed[uid] = (owed[uid] || 0) + share;
    });
  });


  const net: { [usedId: string]: number} = {};
  split.participants.forEach(uid => {
    net[uid] = paid[uid] - owed[uid];
  });

  return net;
}


// Calculate settlements
interface Settlement {
  from: string;
  to: string;
  amount: number;
}

// Greedy settlement algorithm
function calculateSettlements(balances: { [userId: string]: number }): Settlement[] {
  // First split into creditors and debtors
  let creditors: {userId: string; amount:number }[] = [];
  let debtors: {userId: string; amount: number}[] = [];
  Object.entries(balances).forEach(([userId, amount]) => {
    if(Math.abs(amount) < 0.01) return; // skip settled
    if (amount > 0) creditors.push({userId, amount});
    else debtors.push({userId, amount: -amount}); // store as positive
  });

  // Sort in descending order for greedy settlement
  creditors.sort((a,b) => b.amount - a.amount);
  debtors.sort((a,b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  while(i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledAmount = Math.min(debtor.amount, creditor.amount);
    settlements.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: settledAmount,
    });
    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
}


export default function BalanceScreen({ split, expenses, currentUserId }: BalanceScreenProps) {
  if (!split) return null;

  const netBalances = calculateNetBalances(split, expenses);
  const settlements = calculateSettlements(netBalances);

  // Use split.participantsNames if available, else fallback to userId
  const getDisplayName = (uid: string) =>
    (split.participantsNames && split.participantsNames[uid]) || (uid === currentUserId ? "You" : uid);

  // Calculate summary for current user
  const currentUserBalance = netBalances[currentUserId] || 0;
  const currentUserSettlements = settlements.filter(
    s => s.from === currentUserId || s.to === currentUserId
  );

  const totalOwedByUser = settlements.filter(s => s.from === currentUserId).reduce((sum, s) => sum + s.amount, 0);
  const totalOwedToUser = settlements.filter(s => s.to === currentUserId).reduce((sum, s) => sum + s.amount, 0);
  
  return (
    <View style={styles.container}>
      {/* Summary Card */}
      {(totalOwedByUser > 0 || totalOwedToUser > 0) && (
        <View style={styles.summaryCard}>
          {totalOwedByUser > 0 && (
            <Text style={styles.summaryText}>
              You owe {split.currency}{totalOwedByUser.toFixed(2)}
            </Text>
          )}
          {totalOwedToUser > 0 && (
            <Text style={styles.summaryText}>
              You are owed {split.currency}{totalOwedToUser.toFixed(2)}
            </Text>
          )}
          {currentUserSettlements.length > 0 && (
            <View style={styles.summaryDetails}>
              {currentUserSettlements.map((settlement, index) => (
                <Text key={index} style={styles.summaryDetailText}>
                  {settlement.from === currentUserId 
                    ? `To ${getDisplayName(settlement.to)}`
                    : `From ${getDisplayName(settlement.from)}`
                  }
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {settlements.length === 0 && (
        <View style={styles.settledCard}>
          <Text style={styles.settledText}>Everyone is settled up!</Text>
        </View>
      )}

      {/* Participants List */}
      <FlatList 
        data={split.participants} 
        keyExtractor={item => item}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const net = netBalances[item] || 0;
          const isCurrentUser = item === currentUserId;
          const displayName = getDisplayName(item);
          
          // Determine color based on balance
          let amountColor = '#666';
          if (Math.abs(net) > 0.01) {
            amountColor = net > 0 ? '#4CAF50' : '#F44336';
          }

          return (
            <View style={styles.participantCard}>
              <Text style={styles.participantName}>{displayName}</Text>
              <Text style={[styles.participantAmount, { color: amountColor }]}>
                {Math.abs(net) < 0.01 ? 
                  `${split.currency}0.00` : 
                  `${net > 0 ? '+' : '-'}${split.currency}${Math.abs(net).toFixed(2)}`
                }
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F5F5F5' },
  summaryCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,},
  summaryText: {fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8},
  summaryDetails: {marginTop: 8},
  summaryDetailText: {fontSize: 14, color: '#666', marginTop:4},
  settledCard: {backgroundColor: 'white',borderRadius: 12, padding: 20, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  settledText: {fontSize: 16, color: '#4CAF50', fontWeight: '500'},
  participantCard: {backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2},
  participantName: {fontSize: 16, fontWeight: '500', color: '#333'},
  participantAmount:{fontSize: 16, fontWeight: 'bold'},
});
