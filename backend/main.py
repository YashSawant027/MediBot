import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from fastapi.middleware.cors import CORSMiddleware

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

### Task Instructions:
You will receive the full chat history and the latest user message.

The user's message may be:
- In English
- In another language (Hindi, Marathi, etc.)
- Transliterated (e.g., "sar dukh raha hai", "bukhar aa raha hai")

--- Responsibilities ---
1. Understand, translate, or interpret the message if required.
2. If the message is **health-related**:
   - Clearly identify the possible issue.
   - Suggest **safe solutions**, such as:
     - Home remedies
     - Over-the-counter medicines (generic, non-prescription)
     - Lifestyle or dietary advice
     - Precautions to follow
   - Mention **when to consult a doctor** if symptoms persist or worsen.
3. If the issue appears **serious or life-threatening** (e.g., chest pain, seizures, severe bleeding, Dengue, COVID):
   Reply exactly:
   >>> "This may be a medical emergency. Please go to the nearest hospital or call your emergency number immediately."
4. If the message is **NOT health-related**, reply exactly:
   >>> "I'm a Doctor Bot. I only help with health-related questions."
5. Do NOT repeat introductions or previous answers.

--- Response Rules ---
- Reply only in English
- Be short, clear, and practical (max 4–5 lines)
- Do NOT give medical diagnosis certainty
- Do NOT prescribe restricted medicines
- Be polite, calm, and professional

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
    allow_origins=["https://medi-bot-7pwo.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/chat")
async def chat(websocket: WebSocket):
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
        pass
