import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from '../firebaseConfig'; // Adjust path to Firebase config
  import { auth } from '../firebaseConfig'; // For getting current user
  
  export interface Split {
    id?: string;
    title: string;
    currency: string;
    budget: number;
    participants: string[];
    createdBy: string;
    createdAt: any;
    updatedAt: any;
  }
  
  export interface Expense {
    id?: string;
    splitId: string;
    title: string;
    amount: number;
    paidBy: string;
    participants: string[];
    createdAt: any;
  }
  
  // Create a new split
  export const createSplit = async (splitData: Omit<Split, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
  
      const split: Omit<Split, 'id'> = {
        ...splitData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
  
      const docRef = await addDoc(collection(db, 'splits'), split);
      console.log('Split created with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating split: ', error);
      throw error;
    }
  };
  
  // Get all splits for current user
  export const getUserSplits = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
  
      const q = query(
        collection(db, 'splits'),
        where('createdBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
  
      const querySnapshot = await getDocs(q);
      const splits: Split[] = [];
      
      querySnapshot.forEach((doc) => {
        splits.push({
          id: doc.id,
          ...doc.data()
        } as Split);
      });
  
      return splits;
    } catch (error) {
      console.error('Error getting splits: ', error);
      throw error;
    }
  };
  
  // Add expense to a split
  export const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const expense: Omit<Expense, 'id'> = {
        ...expenseData,
        createdAt: serverTimestamp(),
      };
  
      const docRef = await addDoc(collection(db, 'expenses'), expense);
      console.log('Expense added with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding expense: ', error);
      throw error;
    }
  };
  
  // Get expenses for a specific split
  export const getSplitExpenses = async (splitId: string) => {
    try {
      const q = query(
        collection(db, 'expenses'),
        where('splitId', '==', splitId),
        orderBy('createdAt', 'desc')
      );
  
      const querySnapshot = await getDocs(q);
      const expenses: Expense[] = [];
      
      querySnapshot.forEach((doc) => {
        expenses.push({
          id: doc.id,
          ...doc.data()
        } as Expense);
      });
  
      return expenses;
    } catch (error) {
      console.error('Error getting expenses: ', error);
      throw error;
    }
  };