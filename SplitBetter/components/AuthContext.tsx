import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

interface AuthResponse {
  success: boolean;
  data?: User;
  msg?: string;
  error?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean | undefined;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<AuthResponse>;
  register: (email: string, password: string, username: string) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthContextProviderProps {
  children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
          //check if user is authenticated or not then move on from there
          if(user){
            setIsAuthenticated(true);
            setUser(user);
          }else{
            setIsAuthenticated(false);
            setUser(null);
          }
          setIsLoading(false);
        });
        return unsub;
    }, []);

    const login = async(email: string, password: string): Promise<AuthResponse> => {
        try{
          const response = await signInWithEmailAndPassword(auth, email, password);
          return {success: true, data: response?.user};
        }catch(e: any){
          let msg = e.message;
          if(msg.includes('(auth/invalid-email)')) msg='Invalid Email';
          if(msg.includes('(auth/wrong-password)')) msg='Wrong Password';
          if(msg.includes('(auth/user-not-found)')) msg='User Not Found';
          if(msg.includes('(auth/invalid-credential)')) msg='Invalid Credentials';
          return {success: false, msg};
        }
    };
    
    const logout = async(): Promise<AuthResponse> => {
        try{
          await signOut(auth);
          return {success: true};
        }catch(e: any){
          return {success: false, msg: e.message, error: e};
        }
    };

    const register = async(email: string, password: string, username: string): Promise<AuthResponse> => {
        try{
          const response = await createUserWithEmailAndPassword(auth, email, password)
          
          await setDoc(doc(db, "users", response.user.uid), {
            username, 
            userId: response.user.uid,
            email: email
          });
          return {success: true, data: response?.user};
        }catch(e: any){
          let msg = e.message;
          if(msg.includes('(auth/invalid-email)')) msg='Invalid Email';
          if(msg.includes('(auth/email-already-in-use)')) msg='Email Already In Use';
          if(msg.includes('(auth/weak-password)')) msg='Password Too Weak';
          return {success: false, msg};
        }
    };

    const contextValue: AuthContextType = {
      user, 
      isAuthenticated, 
      isLoading,
      login, 
      logout, 
      register
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}; 

export const useAuth = (): AuthContextType => {
    const value = useContext(AuthContext);

    if(!value){
        throw new Error('useAuth must be wrapped inside AuthContextProvider')
    }

    return value;
};