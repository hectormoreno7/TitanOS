import { createContext, useContext, useEffect, useState } from "react";
import { listenAuth, logout } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = listenAuth((user) => {
      setUsuario(user);
      setCargandoAuth(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargandoAuth,
        logout,
        tenantId: "titan-bike-works",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}