import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/components/AuthContext';
import AddExpenseModal from './AddExpenseModal';

interface Split {
  id: string;
  title: string;
  currency: string;
  budget: number;
  participants: string[];
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

interface SplitDetailsScreenProps {
  splitId: string;
  onBack: () => void;
}

export default function SplitDetailsScreen({ splitId, onBack }: SplitDetailsScreenProps) {
  const [split, setSplit] = useState<Split | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [userExpenses, setUserExpenses] = useState(0);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const { user } = useAuth();

  // Fetch split details and expenses
  const fetchSplitData = async () => {
    if (!splitId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch split details
      const splitDoc = await getDoc(doc(db, 'splits', splitId));
      if (splitDoc.exists()) {
        setSplit({
          id: splitDoc.id,
          ...splitDoc.data()
        } as Split);
      }

      // FIXED: Fetch expenses from the correct subcollection path
      const expensesQuery = query(
        collection(db, 'splits', splitId, 'expenses'), // Fixed path to subcollection
        orderBy('createdAt', 'desc')
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData: Expense[] = [];
      let total = 0;
      let userTotal = 0;

      expensesSnapshot.forEach((doc) => {
        const expenseData = {
          id: doc.id,
          splitId: splitId, // Add splitId since it's not stored in the document
          ...doc.data()
        } as Expense;
        
        expensesData.push(expenseData);
        total += expenseData.amount;
        
        if (expenseData.paidBy === user.uid) {
          userTotal += expenseData.amount;
        }
      });

      setExpenses(expensesData);
      setTotalExpenses(total);
      setUserExpenses(userTotal);
    } catch (error) {
      console.error('Error fetching split data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplitData();
  }, [splitId, user]);

  const budgetLeft = split ? split.budget - totalExpenses : 0;

  // Handle opening the add expense modal
  const handleAddExpense = () => {
    setShowAddExpenseModal(true);
  };

  // Handle closing the add expense modal
  const handleCloseAddExpenseModal = () => {
    setShowAddExpenseModal(false);
    // Refresh the expenses list after adding
    fetchSplitData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading split details...</Text>
      </View>
    );
  }

  if (!split) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Split not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonHeader}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{split.title}</Text>
        <View style={styles.headerRight}>
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Photos</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>My Expenses</Text>
          <Text style={styles.summaryAmount}>
            {split.currency}{userExpenses.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Budget Left</Text>
          <Text style={[styles.summaryAmount, budgetLeft < 0 && styles.negativeAmount]}>
            {split.currency}{budgetLeft.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Expenses List */}
      <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No expenses yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add your first expense to start tracking!
            </Text>
          </View>
        ) : (
          expenses.map((expense, index) => (
            <TouchableOpacity 
              key={expense.id} 
              style={[
                styles.expenseItem,
                expense.paidBy === user?.uid && styles.userExpenseItem
              ]}
            >
              <View style={styles.expenseContent}>
                <Text style={styles.expenseTitle}>{expense.title}</Text>
                <Text style={styles.expensePaidBy}>
                  Paid by {expense.paidBy === user?.uid ? 'Me' : expense.paidByName || 'Someone'}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>
                {expense.currency || split.currency}{expense.amount.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Add Expense Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>ADD EXPENSES</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddExpenseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <AddExpenseModal 
          splitId={splitId}
          onClose={handleCloseAddExpenseModal}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f5f5f5',
  },
  backButtonHeader: {
    padding: 5,
  },
  backArrow: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeTab: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 30,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  negativeAmount: {
    color: '#e74c3c',
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  expenseItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  userExpenseItem: {
    borderColor: '#4169E1',
    borderWidth: 2,
  },
  expenseContent: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  expensePaidBy: {
    fontSize: 14,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  addButton: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
});