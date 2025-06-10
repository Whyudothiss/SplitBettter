import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const AuthContextProvider = ({children})=> {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);

    useEffect(()=>{
        //onAuthStateChange
    },[])

    const login = async(email, password) =>{
        try{

      }catch(e){

      }
    }
    const logout = async()  =>{
        try{

      }catch(e){
        
      }
    }
    const register = async(email, password, username, profileUrl) =>{
        try{

      }catch(e){
        
      }

      return (
        <AuthContext.Provider value={{user, isAuthenticated, login, logout, register}}>
            {children}
        </AuthContext.Provider>
      )
    }

}

export const useAuth = ()=>{
    const value = useContext(AuthContext);

    if(!value){
        throw new Error('useAuth must be wrapped inside AuthContextProvider')
    }

    return value;
}