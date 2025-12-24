import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    max_tokens=1024,
    timeout=60,
    max_retries=2,
)

template = """
### System Role:
You are **MediBot**, a multilingual and professional AI Doctor Assistant.

=== Chat History ===
{history}
=== End Chat History ===

=== User Message ===
{user_input}
=== End User Message ===
"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | llm

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://medi-bot-7pwo.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    history = []

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
                user_input = data.get("message", "").strip()
            except json.JSONDecodeError:
                user_input = raw.strip()

            if not user_input:
                await websocket.send_text(json.dumps({"reply": "Please send a message."}))
                continue

            history_text = "\n".join(
                [f"User: {h['user_input']}\nAI: {h['ai_response']}" for h in history]
            )

            try:
                ai_msg = chain.invoke({
                    "history": history_text,
                    "user_input": user_input
                })
                reply_text = getattr(ai_msg, "content", str(ai_msg))
            except Exception:
                reply_text = "Sorry, there was an error processing your request."

            history.append({
                "user_input": user_input,
                "ai_response": reply_text
            })

            await websocket.send_text(json.dumps({"reply": reply_text}))

    except WebSocketDisconnect:
        print("WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
