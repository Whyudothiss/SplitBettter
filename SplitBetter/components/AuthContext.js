// import React, { createContext, useContext, useState, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
// import {doc, getDoc, setDoc} from 'firebase/firestore'
// import { db, auth } from '../firebaseConfig';

// const AuthContext = createContext({});

// export const AuthContextProvider = ({children}) => {
//     const [user, setUser] = useState(null);
//     const [isAuthenticated, setIsAuthenticated] = useState(undefined);

//     useEffect(() => {
//         const unsub = onAuthStateChanged(auth, (user) => {
//           //check if user is authenticated or not then move on from there
//           if(user){
//             setIsAuthenticated(true);
//             setUser(user);
//           }else{
//             setIsAuthenticated(false);
//             setUser(null);
//           }
//         });
//         return unsub;
//     }, []);

//     const login = async(email, password) => {
//         try{
//           const response = await signInWithEmailAndPassword(auth, email, password)

//           return {success: true};
//         }catch(e){
//           let msg = e.message;
//           if(msg.includes('(auth/invalid-email)')) msg='Invalid Email'
//           return {success: false, msg};
//         }
//     };
    
//     const logout = async() => {
//         try{
//           await signOut(auth);
//           return {success: true};
//         }catch(e){
//           return {success: false, msg: e.message, error: e}
//         }
//     };

//     const register = async(email, password, username) => {
//         try{
//           const response = await createUserWithEmailAndPassword(auth, email, password)
          
//           await setDoc(doc(db, "users", response.user.uid), {
//             username, 
//             userId: response.user.uid
//           });
//           return {success: true, data: response?.user};
//         }catch(e){
//           let msg = e.message;
//           if(msg.includes('(auth/invalid-email)')) msg='Invalid Email'
//           if(msg.includes('(auth/email-already-in-use)')) msg='This Email Is Already In Use'
//           return {success: false, msg};
//         }
//     };
//     const contextValue = {user, isAuthenticated, login, logout, register};
//     return (
//         <AuthContext.Provider value={{user, isAuthenticated, login, logout, register}}>
//             {children}
//         </AuthContext.Provider>
//     );
// }; 

// export const useAuth = () => {
//     const value = useContext(AuthContext);

//     if(!value){
//         throw new Error('useAuth must be wrapped inside AuthContextProvider')
//     }

//     return value;
// };