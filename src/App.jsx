import React, { useState } from "react";
import Chat from "./components/Chat";

const App = () => {
  const [isActivityEnabled, setIsActivityEnabled] = useState(true);

  const handleActivityChange = (status) => {
    setIsActivityEnabled(status);
  };
  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center
     justify-center"
    >
      <Chat />
    </div>
  );
};

export default App;
