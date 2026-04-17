import { useState } from "react";
import { postFormData, postJson } from "../api/client";

const QUICK_PROMPTS = [
  "What crop should I plant this season?",
  "How can I reduce fertilizer loss before rain?",
  "Create a 2-week field activity plan.",
  "What pest risks should I scout this week?"
];

export default function FarmerChatPanel({ farmId }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [mediaFile, setMediaFile] = useState(null);

  const ask = async (rawQuestion) => {
    const cleanQuestion = String(rawQuestion || "").trim();
    if (!cleanQuestion) return;
    setLoading(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", text: cleanQuestion }]);
    setQuestion("");

    try {
      const payload = {
        question: cleanQuestion,
        ...(farmId ? { farmId } : {})
      };
      const response = await postJson("/advisory/chat", payload);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: response.response || "No response received.",
          meta: response.context
            ? `${response.context.location || ""} | ${response.context.crop || ""} | ${response.context.season || ""}`
            : ""
        }
      ]);
    } catch (_error) {
      setError("Unable to reach advisory bot right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    await ask(question);
  };

  const submitMedia = async (event) => {
    event.preventDefault();
    if (!mediaFile) return;

    setLoading(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: question.trim() || `Uploaded media: ${mediaFile.name}`
      }
    ]);

    try {
      const formData = new FormData();
      formData.append("media", mediaFile);
      if (question.trim()) formData.append("question", question.trim());
      if (farmId) formData.append("farmId", farmId);

      const response = await postFormData("/advisory/chat/media", formData);
      const issue = response.issueType ? `Detected: ${response.issueType}` : "Media advisory";
      const findings = Array.isArray(response.findings) ? response.findings.map((item) => `- ${item}`).join("\n") : "";
      const actions = Array.isArray(response.immediateActions)
        ? response.immediateActions.map((item) => `- ${item}`).join("\n")
        : "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `${issue}\n\n${response.advisoryMessage || "No advisory message"}${findings ? `\n\nFindings:\n${findings}` : ""}${actions ? `\n\nImmediate actions:\n${actions}` : ""}`,
          meta: response.context
            ? `${response.context.location || ""} | ${response.context.crop || ""} | ${response.context.season || ""} | ${response.context.mediaType || ""}`
            : ""
        }
      ]);

      setMediaFile(null);
      setQuestion("");
    } catch (_error) {
      setError("Unable to analyze uploaded media right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chat-panel">
      <div className="row">
        <h3>Farmer Advisory Chat</h3>
        <small>AI agronomy assistant</small>
      </div>

      <div className="chat-quick-actions">
        {QUICK_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" className="chat-chip" onClick={() => ask(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          placeholder="Ask about crop choice, weather timing, pests, or activity planning..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Advising..." : "Ask"}
        </button>
      </form>

      <form className="chat-media-form" onSubmit={submitMedia}>
        <input
          type="file"
          accept="image/*,audio/*,video/*"
          onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !mediaFile}>
          {loading ? "Analyzing..." : "Analyze media"}
        </button>
      </form>

      {mediaFile ? <small className="chat-media-meta">Selected: {mediaFile.name}</small> : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="chat-thread">
        {messages.length === 0 ? (
          <p className="chat-empty">Start with a question to get tailored farm advice from climate and crop context.</p>
        ) : (
          messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
              <strong>{message.role === "user" ? "You" : "Advisor"}</strong>
              <p style={{ whiteSpace: "pre-line" }}>{message.text}</p>
              {message.meta ? <small>{message.meta}</small> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
