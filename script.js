// DOM Element References
const analyzeButton = document.getElementById("analyze-button");
const incidentDescription = document.getElementById("incident-description");
const loader = document.getElementById("loader");
const resultsSection = document.getElementById("results-section");
const sectionsOutput = document.getElementById("sections-output");
const judgementsOutput = document.getElementById("judgements-output");
const summaryOutput = document.getElementById("summary-output");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");

// Attach event listener to the button
analyzeButton.addEventListener("click", handleAnalysis);

/*
 * Main function to handle the analysis process when the button is clicked.
 */
async function handleAnalysis() {
  const incidentText = incidentDescription.value.trim();

  if (!incidentText) {
    displayError("Please enter an incident description.");
    return;
  }

  // --- UI State Update: Start Loading ---
  setLoadingState(true);

  try {
    // --- Define the AI model's role and the desired JSON output structure ---
    const prompt = `You are an expert AI legal assistant for the Indian Police, specializing in the Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), and other relevant Indian laws. Your task is to analyze an incident report and provide structured legal information to help an officer write an accurate First Information Report (FIR).

        Based on the following incident description, provide a JSON object with the following structure:
        1.  "summary_of_incident": A brief, neutral summary of the key events described.
        2.  "suggested_sections": An array of objects, where each object contains:
            - "section_act": The full section and act (e.g., "Section 302 of the Indian Penal Code, 1860").
            - "reasoning": A clear and concise explanation for why this section is applicable to the described incident.
            - "url": A verifiable link to the full text of the section, preferably from a government source like 'indiacode.nic.in'.
        3.  "landmark_judgements": An array of objects, where each object contains:
            - "case_name": The name of a relevant landmark case (e.g., "Vishaka & Ors vs State Of Rajasthan & Ors").
            - "summary": A brief summary of the judgment's relevance to the incident or the suggested sections.

        Incident Description:
        ---
        ${incidentText}
        ---
        `;

    const schema = {
      type: "OBJECT",
      properties: {
        summary_of_incident: { type: "STRING" },
        suggested_sections: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              section_act: { type: "STRING" },
              reasoning: { type: "STRING" },
              url: { type: "STRING" },
            },
            required: ["section_act", "reasoning", "url"],
          },
        },
        landmark_judgements: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              case_name: { type: "STRING" },
              summary: { type: "STRING" },
            },
            required: ["case_name", "summary"],
          },
        },
      },
      required: [
        "summary_of_incident",
        "suggested_sections",
        "landmark_judgements",
      ],
    };

    // --- Call the Gemini API ---
    const data = await callGeminiAPI(prompt, schema);

    // --- Display the results ---
    displayResults(data);
  } catch (error) {
    console.error("Error during analysis:", error);
    displayError(
      "An unexpected error occurred while analyzing the incident. Please check the console for details or try again."
    );
  } finally {
    // --- UI State Update: Stop Loading ---
    setLoadingState(false);
  }
}

/**
 * Calls the Gemini API with the provided prompt and schema.
 * @param {string} prompt The full prompt for the AI.
 * @param {object} schema The JSON schema for the expected response.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON data.
 */
async function callGeminiAPI(prompt, schema) {
  const apiKey = "AIzaSyCXsPDb-7Eeayv16uDs9rz7BCk5LVfavC0"; // API key is handled by the environment
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API request failed with status ${response.status}: ${errorBody}`
    );
  }

  const result = await response.json();

  if (
    result.candidates &&
    result.candidates.length > 0 &&
    result.candidates[0].content &&
    result.candidates[0].content.parts &&
    result.candidates[0].content.parts.length > 0
  ) {
    const jsonText = result.candidates[0].content.parts[0].text;
    return JSON.parse(jsonText);
  } else {
    console.warn("Unexpected API response structure:", result);
    throw new Error(
      "Failed to get a valid response from the AI. The response format was unexpected."
    );
  }
}

/**
 * Manages the UI loading state.
 * @param {boolean} isLoading - True to show loader, false to hide.
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    analyzeButton.disabled = true;
    loader.classList.remove("hidden");
    resultsSection.classList.add("hidden");
    errorBox.classList.add("hidden");
  } else {
    analyzeButton.disabled = false;
    loader.classList.add("hidden");
  }
}

/**
 * Displays an error message in the UI.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
  errorMessage.textContent = message;
  errorBox.classList.remove("hidden");
  resultsSection.classList.add("hidden");
}

/**
 * Renders the data received from the API into the results section.
 * @param {object} data - The parsed JSON object from the API.
 */
function displayResults(data) {
  // Clear previous results
  sectionsOutput.innerHTML = "";
  judgementsOutput.innerHTML = "";

  // Populate summary
  summaryOutput.textContent =
    data.summary_of_incident || "No summary provided.";

  // Populate Suggested Sections
  if (data.suggested_sections && data.suggested_sections.length > 0) {
    data.suggested_sections.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card prose-custom";
      // MODIFIED: Added a clickable link for the section
      card.innerHTML = `
                <p>
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-300 hover:text-blue-200 hover:underline">
                        ${item.section_act}
                    </a>
                </p>
                <p>${item.reasoning}</p>
            `;
      sectionsOutput.appendChild(card);
    });
  } else {
    sectionsOutput.innerHTML = `<div class="card prose-custom"><p>No specific sections could be identified.</p></div>`;
  }

  // Populate Landmark Judgements
  if (data.landmark_judgements && data.landmark_judgements.length > 0) {
    data.landmark_judgements.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card prose-custom";
      card.innerHTML = `
                <p><strong>${item.case_name}</strong></p>
                <p>${item.summary}</p>
            `;
      judgementsOutput.appendChild(card);
    });
  } else {
    judgementsOutput.innerHTML = `<div class="card prose-custom"><p>No specific landmark judgements were found for this incident.</p></div>`;
  }

  // Show the results
  resultsSection.classList.remove("hidden");
  // Scroll to results for better user experience on mobile
  resultsSection.scrollIntoView({ behavior: "smooth" });
}
2;
