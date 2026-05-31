import { createContext, useState } from "react";

export const AuthContext = createContext();

function AuthProvider({ children }) {

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const login = (jwtToken) => {

    localStorage.setItem("token", jwtToken);

    setToken(jwtToken);

  };

  const logout = () => {

    localStorage.removeItem("token");

    setToken("");

  };

  return (

    <AuthContext.Provider
      value={{
        token,
        login,
        logout
      }}
    >

      {children}

    </AuthContext.Provider>

  );
}

export default AuthProvider;