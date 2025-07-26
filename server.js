// server.js

// Import required packages
const express = require("express");
// const fetch = require("node-fetch"); // To make HTTP requests from the server
require("dotenv").config(); // To load environment variables from a .env file

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000; // Use port from environment or default to 3000

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Middleware to serve static frontend files (HTML, CSS, JS)
app.use(express.static(".")); // Serves files from the root directory

// --- The Secure API Endpoint ---
// The frontend will send requests to this endpoint instead of directly to Google
app.post("/api/chat", async (req, res) => {
  // Get the conversation history from the request body sent by the frontend
  const { history } = req.body;

  // Retrieve the secret API key from the server's environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Check if the API key is available
  if (!GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "API key is not configured on the server." });
  }

  // Check if conversation history was provided
  if (!history) {
    return res.status(400).json({ error: "Conversation history is required." });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    // Make the actual call to the Gemini API from the secure server
    const geminiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: history }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Error:", errorBody);
      throw new Error(
        `Gemini API request failed with status ${geminiResponse.status}`
      );
    }

    const data = await geminiResponse.json();

    // Send the response from Gemini back to the frontend client
    res.json(data);
  } catch (error) {
    console.error("Error in /api/chat endpoint:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
