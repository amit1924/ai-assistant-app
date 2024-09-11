import React, { useState, useEffect, useRef } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai"; // Loading spinner icon from react-icons
import Prism from "prismjs"; // Import Prism.js for syntax highlighting
import "prismjs/themes/prism-tomorrow.css";
import "./chat.css"; // Import a Prism.js theme for styling code

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if currently speaking
  const [isTyping, setIsTyping] = useState(false); // Typing indicator
  const [showDefaultMessage, setShowDefaultMessage] = useState(true); // Show default message state
  const [isFlashing, setIsFlashing] = useState(false); // Track if mic is flashing
  const chatContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const userScrolledUp = useRef(false); // Track if user has scrolled up
  const recognitionRef = useRef(null); // Ref for speech recognition
  const speechRef = useRef(null); // Ref for SpeechSynthesisUtterance

  // Initialize Speech Recognition API
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        stopListening(); // Stop listening after getting the result
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognitionRef.current.onstart = () => {
        setIsFlashing(true); // Start flashing when speech recognition starts
      };

      recognitionRef.current.onend = () => {
        setIsFlashing(false); // Stop flashing when speech recognition ends
      };
    } else {
      alert("Your browser does not support speech recognition.");
    }
  }, []);

  // Clean up Speech Synthesis when component unmounts
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, []);

  // Effect to automatically scroll to the bottom when new messages arrive
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle AI response
  const fetchAIResponse = async (message) => {
    const apiKey = import.meta.env.VITE_API_KEY;
    setLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: message }],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        const cleanedResponse = sanitizeText(aiResponse); // Clean AI's response
        speakText(cleanedResponse); // Speak AI's response
        setShowDefaultMessage(false); // Hide default message
        return aiResponse;
      } else {
        return "No response from the AI.";
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "An error occurred while fetching the response.";
    } finally {
      setLoading(false);
    }
  };

  // Sanitize text to remove special characters for speech synthesis
  const sanitizeText = (text) => {
    return text.replace(/\*\*/g, "").replace(/\*/g, "");
  };

  // Handle sending messages
  const handleSend = async () => {
    if (input.trim() === "") return;

    // Optimistically add the user's message to the chat
    setMessages((prev) => [
      ...prev,
      { sender: "user", type: "text", content: input },
    ]);
    setInput("");

    // Fetch AI response in the background
    const aiResponse = await fetchAIResponse(input);
    setMessages((prev) => [
      ...prev,
      { sender: "ai", type: "text", content: aiResponse },
    ]);
  };

  // Handle typing indicator
  const handleTyping = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1000); // Hide typing indicator after 1 second
  };

  // Start voice input
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // Stop voice input
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Speak text
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      if (speechRef.current) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech synthesis
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Your browser does not support speech synthesis.");
    }
  };

  // Stop speech synthesis
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Render message content based on type
  const renderMessageContent = (message) => {
    switch (message.type) {
      case "text":
        return message.sender === "ai"
          ? renderFormattedContent(message.content)
          : message.content;
      default:
        return message.content;
    }
  };

  // Format content (Markdown-like support)
  const renderFormattedContent = (content) => {
    const formattedContent = content.split("\n").map((line, index) => {
      if (line.startsWith("**")) {
        const content = line.replace(/\*\*/g, "");
        return (
          <p key={index} className="text-bold-red text-xl">
            {content}
          </p>
        );
      } else if (line.startsWith("*")) {
        const content = line.replace(/\*/g, "");
        return (
          <li key={index} className="text-black text-xl">
            {content}
          </li>
        );
      } else if (line.match(/^# /)) {
        return (
          <h2 key={index} className="text-lg font-semibold text-green-600">
            {line.replace(/^# /, "")}
          </h2>
        );
      } else if (line.match(/^## /)) {
        return (
          <h3 key={index} className="text-md font-semibold text-yellow-600">
            {line.replace(/^## /, "")}
          </h3>
        );
      } else if (line.startsWith("!")) {
        return (
          <p key={index} className="text-bold-blue">
            {line.replace(/^!/, "")}
          </p>
        );
      } else {
        return (
          <p key={index} className="text-gray-900">
            {line}
          </p>
        );
      }
    });

    return <div className="space-y-2">{formattedContent}</div>;
  };

  useEffect(() => {
    Prism.highlightAll(); // Highlight code syntax after component updates
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-white shadow-md rounded-lg">
      <div
        ref={chatContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-2"
        onScroll={() => {
          const container = chatContainerRef.current;
          if (container) {
            userScrolledUp.current =
              container.scrollTop <
              container.scrollHeight - container.clientHeight - 50;
          }
        }}
      >
        {/* Show default message if no AI response has been received */}
        {showDefaultMessage && (
          <div className="p-2 rounded bg-gradient-to-r from-maroon-600 to-maroon-900 text-white">
            Hello users, ask anything to me. I am your chat assistant.
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              msg.sender === "user"
                ? "bg-blue-100 text-blue-800 self-end"
                : "bg-gray-200 text-gray-800 self-start"
            }`}
          >
            {renderMessageContent(msg)}
          </div>
        ))}
        {loading && (
          <div className="flex justify-center items-center py-2">
            <AiOutlineLoading3Quarters className="animate-spin text-blue-500" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input and buttons */}
      <div className="p-4 border-t flex items-center bg-gray-100">
        <textarea
          className="flex-1 p-2 border rounded-md"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
        />
        <button
          onClick={startListening}
          className={`p-3 ${
            isFlashing ? "flashing" : ""
          } bg-green-500 text-white rounded-lg mr-2`}
        >
          🎤
        </button>
        <button
          onClick={handleSend}
          className="p-3 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="ml-2 p-2 bg-red-500 text-white rounded-lg"
          >
            Stop Speaking
          </button>
        )}
      </div>
    </div>
  );
}

export default Chat;
