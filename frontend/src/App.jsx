import React, { useEffect, useRef, useState } from "react";

function useWebSocket(url) {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket;

    const connect = () => {
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("Connected to server");
        setConnected(true);
      };

      socket.onclose = () => {
        console.log("Disconnected. Reconnecting...");
        setConnected(false);
        setTimeout(connect, 3000); // auto-reconnect after 3s
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
        } catch {
          console.warn("Invalid message format:", event.data);
        }
      };
    };

    connect();
    return () => socket?.close();
  }, [url]);

  const sendMessage = (msg) => {
    if (socketRef.current && connected && msg.trim()) {
      socketRef.current.send(JSON.stringify({ message: msg }));
      setMessages((prev) => [...prev, { sender: "user", text: msg }]);
    }
  };

  return { messages, sendMessage, connected };
}

export default function App() {
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const { messages, sendMessage, connected } = useWebSocket(
    "wss://medibot-eyzq.onrender.com/chat"
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setInput("")
  }, [messages]);

  return (
    <>
    <div className="mx-4 md:mx-0">
      <h1 className="text-center mt-16 text-2xl font-bold">MediBot</h1>

      <div className="max-w-md h-[70vh] m-auto mt-4 bg-indigo-200 rounded-lg px-4 py-6 shadow-lg flex flex-col ">
        {!connected && (
          <div className="text-red-500 mb-2 text-center">
            Connecting to server...
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${msg.sender === "user" ? "text-right" : "text-left"}`}
            >
              <span
                className={`inline-block px-3 py-2 rounded-lg ${
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
            className="bg-white rounded px-3 flex-1 w-[70%]"
            placeholder="Ask anything"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input) && setInput("")}
          />
          <button
            className="bg-blue-400 px-1 py-2 w-[20%] rounded text-white"
            onClick={() => {
              sendMessage(input);
              setInput("");
            }}
          >
            Send
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
