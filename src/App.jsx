import React, { useState } from "react";
import Chat from "./components/Chat";
import "./App.css"; // Import the CSS file for background animation

const App = () => {
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);

  const handleActivityChange = (status) => {
    setIsActivityEnabled(status);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="background-animation"></div>
      <Chat />
    </div>
  );
};

export default App;
