// DOM Element References
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const loader = document.getElementById("loader");

// Conversation history array
let conversationHistory = [];

// Initial welcome message from the AI
document.addEventListener("DOMContentLoaded", () => {
  const welcomeMessage =
    "Hello! I am Vidhi AI, your legal assistant. Please describe the incident you need to report. I can help you identify the correct legal sections and relevant case laws.";
  addMessageToChat("ai", welcomeMessage);
  // Initialize conversation history with the AI's role and the welcome message
  conversationHistory.push(
    {
      role: "user",
      parts: [
        {
          text: `You are an expert AI legal assistant for the Indian Police named "Vidhi AI". Your primary role is to be a conversational chatbot. You must guide police officers by asking clarifying questions to gather all necessary details for an FIR. Once you have enough information about an incident (like what happened, if force was used, what was stolen, etc.), you will then provide a final, structured analysis. Do NOT provide the structured analysis until you have asked clarifying questions and gathered sufficient details. Your final analysis should be a JSON object with the keys "summary_of_incident", "suggested_sections" (each with "section_act", "reasoning", "url"), and "landmark_judgements" (each with "case_name", "summary"). Start the conversation by introducing yourself and asking for the initial incident description.`,
        },
      ],
    },
    { role: "model", parts: [{ text: welcomeMessage }] }
  );
});

// Event Listeners
sendButton.addEventListener("click", handleUserMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserMessage();
  }
});

/**
 * Handles sending the user's message.
 */
async function handleUserMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  addMessageToChat("user", message);
  userInput.value = ""; // Clear input field

  // Add user message to history
  conversationHistory.push({ role: "user", parts: [{ text: message }] });

  setLoadingState(true);

  try {
    // *** THIS IS THE UPDATED PART ***
    const aiResponse = await callBackendAPI(conversationHistory);

    // Add AI response to history
    const aiMessage = aiResponse.candidates[0].content.parts[0].text;
    conversationHistory.push({ role: "model", parts: [{ text: aiMessage }] });

    // Process and display the AI's response
    processAIResponse(aiMessage);
  } catch (error) {
    console.error("Error communicating with backend:", error);
    addMessageToChat(
      "ai",
      "I'm sorry, I encountered an error communicating with the server. Please try again."
    );
  } finally {
    setLoadingState(false);
  }
}

/**
 * Calls our secure backend API with the conversation history.
 * @param {Array} history - The full conversation history.
 * @returns {Promise<object>} A promise that resolves with the AI's full JSON response.
 */
async function callBackendAPI(history) {
  // The fetch call now points to our own server's endpoint
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ history: history }), // Send history in the request body
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      errorBody.error || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// --- The rest of the functions remain the same ---

/**
 * Adds a message to the chat display.
 * @param {string} sender - 'user' or 'ai'.
 * @param {string} message - The message content.
 */
function addMessageToChat(sender, message) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}-bubble`;
  bubble.innerHTML = message; // Use innerHTML to render links and formatting
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to the latest message
}

/**
 * Processes the AI's response, checking if it's a structured JSON or plain text.
 * @param {string} responseText - The raw text from the AI.
 */
function processAIResponse(responseText) {
  const jsonMatch = responseText.match(
    /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/
  );
  if (jsonMatch) {
    try {
      const jsonString = jsonMatch[1] || jsonMatch[2];
      const jsonData = JSON.parse(jsonString);
      displayStructuredResults(jsonData);
      return;
    } catch (e) {
      console.warn("Failed to parse potential JSON, treating as text.", e);
    }
  }
  addMessageToChat("ai", responseText);
}

/**
 * Displays the final structured analysis from the AI.
 * @param {object} data - The parsed JSON object.
 */
function displayStructuredResults(data) {
  let htmlResponse = `Here is the legal analysis based on our conversation:<br><br>`;

  if (data.summary_of_incident) {
    htmlResponse += `<strong>Summary of Incident:</strong><p>${data.summary_of_incident}</p>`;
  }

  if (data.suggested_sections && data.suggested_sections.length > 0) {
    htmlResponse += `<strong>Suggested Sections & Acts:</strong>`;
    data.suggested_sections.forEach((item) => {
      htmlResponse += `
                <div style="margin-top: 10px; padding: 10px; border-left: 3px solid #4b5563; border-radius: 4px;">
                    <p>
                        <a href="${
                          item.url || "#"
                        }" target="_blank" rel="noopener noreferrer">
                            <strong>${item.section_act}</strong>
                        </a>
                    </p>
                    <p style="font-size: 0.9em;">${item.reasoning}</p>
                </div>
            `;
    });
  }

  if (data.landmark_judgements && data.landmark_judgements.length > 0) {
    htmlResponse += `<br><strong>Relevant Landmark Judgements:</strong>`;
    data.landmark_judgements.forEach((item) => {
      htmlResponse += `
                <div style="margin-top: 10px; padding: 10px; border-left: 3px solid #4b5563; border-radius: 4px;">
                    <p><strong>${item.case_name}</strong></p>
                    <p style="font-size: 0.9em;">${item.summary}</p>
                </div>
            `;
    });
  }

  addMessageToChat("ai", htmlResponse);
}

/**
 * Manages the UI loading state.
 * @param {boolean} isLoading - True to show loader, false to hide.
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    loader.classList.remove("hidden");
    loader.classList.add("flex");
    sendButton.disabled = true;
    userInput.disabled = true;
  } else {
    loader.classList.add("hidden");
    loader.classList.remove("flex");
    sendButton.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}
