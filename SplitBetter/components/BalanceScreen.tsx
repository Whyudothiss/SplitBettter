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
  splitId: string;
  createdAt: any;
}

interface BalanceScreenProps {
  split: Split;
  expenses: Expense[];
}

// Helper: Calculate net spent per participant
function calculateNetBalances(split: Split, expenses: Expense[]) {
  const balances: { [userId: string]: number } = {};
  split.participants.forEach((uid) => {
    balances[uid] = 0;
  });
  expenses.forEach((expense) => {
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
  });
  return balances;
}

export default function BalanceScreen({ split, expenses }: BalanceScreenProps) {
  if (!split) return null;

  const netBalances = calculateNetBalances(split, expenses);

  // Use split.participantsNames if available, else fallback to userId
  const getDisplayName = (uid: string) =>
    (split.participantsNames && split.participantsNames[uid]) || uid;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Net Spent by Each Participant</Text>
      <FlatList
        data={split.participants}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.user}>{getDisplayName(item)}</Text>
            <Text style={styles.amount}>
              {split.currency}{(netBalances[item] || 0).toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ marginTop: 30, color: '#888' }}>No participants or no expenses yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  user: { fontSize: 16 },
  amount: { fontSize: 16, fontWeight: 'bold' },
});