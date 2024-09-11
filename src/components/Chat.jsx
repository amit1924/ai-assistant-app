import React, { useState, useEffect, useRef } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "./chat.css";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDefaultMessage, setShowDefaultMessage] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const chatContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const userScrolledUp = useRef(false);
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        stopListening();
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognitionRef.current.onstart = () => {
        setIsFlashing(true);
      };

      recognitionRef.current.onend = () => {
        setIsFlashing(false);
      };
    } else {
      alert("Your browser does not support speech recognition.");
    }
  }, [language]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        const cleanedResponse = sanitizeText(aiResponse);
        speakText(cleanedResponse);
        setShowDefaultMessage(false);
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

  const sanitizeText = (text) => {
    return text.replace(/\*\*/g, "").replace(/\*/g, "");
  };

  const handleSend = async () => {
    if (input.trim() === "") return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", type: "text", content: input },
    ]);
    setInput("");

    const aiResponse = await fetchAIResponse(input);
    setMessages((prev) => [
      ...prev,
      { sender: "ai", type: "text", content: aiResponse },
    ]);
  };

  const handleTyping = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1000);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Your browser does not support speech synthesis.");
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

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
    Prism.highlightAll();
  }, [messages]);

  return (
    <div className="chat-container max-w-screen-sm mx-auto p-4">
      <div
        ref={chatContainerRef}
        className="chat-messages h-[70vh] overflow-y-auto mb-2"
      >
        {showDefaultMessage && (
          <div className="mt-[250px] p-2 rounded bg-gradient-to-r from-maroon-600 to-maroon-900 text-white">
            <h1 className="text-5xl text-black">
              Hello users, ask anything to me.{" "}
              <span className="text-pink-900 animate-pulse text-5xl">
                I am your chat assistant.
              </span>
            </h1>
          </div>
        )}
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
        {isTyping && <div className="p-2 text-sm text-gray-500">Typing...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 p-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="p-1 rounded border border-gray-300"
        >
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi (India)</option>
        </select>
        <button
          onClick={startListening}
          className={`p-2 ${
            isFlashing ? "bg-blue-300 animate-pulse" : "bg-blue-500"
          } rounded text-white`}
        >
          {isFlashing ? "Listening..." : "Start Listening"}
        </button>
        <button
          onClick={stopListening}
          className="p-2 bg-red-500 rounded text-white"
        >
          Stop Listening
        </button>
        <button
          onClick={handleSend}
          className="p-2 bg-green-500 rounded text-white"
        >
          Send
        </button>
        <button
          onClick={stopSpeaking}
          className={`p-2 ${
            isSpeaking ? "bg-yellow-300 animate-pulse" : "bg-yellow-500"
          } rounded text-white`}
        >
          {isSpeaking ? "Stop Speaking" : "Speak"}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="p-2 border rounded w-full"
        />
      </div>
    </div>
  );
}

export default Chat;
