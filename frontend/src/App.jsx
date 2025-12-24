import React from "react"
import { useEffect, useRef, useState } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket("wss://medibot-production-4d00.up.railway.app/chat")
    socketRef.current = socket;

    socket.onopen = () => console.log("Connected to server");
    socket.onclose = () => console.log("Disconnected from server");

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.reply },
      ]);
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    socketRef.current.send(JSON.stringify({ message: input }));
    setInput("");
  };

  return (
    <>
      <h1 className="text-center mt-[4rem] text-[25px]">MediBot</h1>

      <div className="max-w-[500px] h-[70vh] m-auto mt-[1rem] bg-indigo-200 rounded-[10px] px-4 py-6 shadow-lg">
        <div className="h-[90%] overflow-y-auto mb-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 ${
                msg.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`inline-block px-3 py-2 rounded-[10px] ${
                  msg.sender === "user"
                    ? "bg-indigo-400 text-white"
                    : "bg-white text-black"
                }`}
              >
                {msg.text}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            className="bg-white rounded-[5px] basis-[85%] px-3"
            placeholder="Ask anything"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            className="bg-blue-400 px-4 py-2 rounded text-white cursor-pointer"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}

export default App
