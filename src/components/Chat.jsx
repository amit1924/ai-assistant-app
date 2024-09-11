import React, { useState, useEffect, useRef } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai"; // Loading spinner icon from react-icons

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if currently speaking
  const [isTyping, setIsTyping] = useState(false); // Typing indicator
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
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
    } else {
      alert("Your browser does not support speech recognition.");
    }
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

  // Speak text
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
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
        return (
          <p key={index} className="font-bold">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      } else if (line.startsWith("*")) {
        return (
          <li key={index} className="list-disc list-inside">
            {line.replace(/\*/g, "")}
          </li>
        );
      } else if (line.match(/^# /)) {
        return (
          <h2 key={index} className="text-lg font-semibold">
            {line.replace(/^# /, "")}
          </h2>
        );
      } else if (line.match(/^## /)) {
        return (
          <h3 key={index} className="text-md font-semibold">
            {line.replace(/^## /, "")}
          </h3>
        );
      } else {
        return <p key={index}>{line}</p>;
      }
    });

    return <div className="space-y-2">{formattedContent}</div>;
  };

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
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              msg.sender === "user"
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-300"
            }`}
          >
            {renderMessageContent(msg)}
          </div>
        ))}
        {loading && (
          <div className="flex items-center justify-center p-2">
            <AiOutlineLoading3Quarters
              className="animate-spin text-gray-500"
              size={24}
            />
          </div>
        )}
        {isTyping && <div className="p-2 text-gray-500">User is typing...</div>}
        <div ref={bottomRef} /> {/* Empty div to serve as the scroll target */}
      </div>
      <div className="p-4 border-t flex items-center space-x-2">
        <button
          onClick={startListening}
          className="p-3 bg-green-500 text-white rounded-lg mr-2"
        >
          🎤
        </button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            className="w-full p-3 border rounded-lg text-lg resize-none overflow-auto"
            placeholder="Type a message or click the mic..."
            style={{
              maxHeight: "70px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }} // Limit height and add scrolling
          />
        </div>

        <button
          onClick={handleSend}
          className="p-3 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
        {isSpeaking && ( // Conditionally render the Stop button
          <button
            onClick={stopSpeaking}
            className="p-3 bg-red-500 text-white rounded-lg ml-2"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

export default Chat;
