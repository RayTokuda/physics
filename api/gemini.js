export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { prompt, systemInstruction, requireJson } = req.body;
    
    // 2. Securely load the API key from Vercel's Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
    }

    // 3. Set up the exact same request to the Gemini Flash model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    
    let payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // CRITICAL: If the frontend requests JSON (for the MCQ generator), enforce the schema!
    if (requireJson) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "explanation": { "type": "STRING" },
                    "newQuestion": { "type": "STRING" },
                    "options": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "text": { "type": "STRING" },
                                "isCorrect": { "type": "BOOLEAN" }
                            }
                        }
                    }
                },
                required: ["explanation", "newQuestion", "options"]
            }
        };
    }

    try {
        // 4. Send the request to Google
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Google API responded with status: ${response.status}`);
        }

        // 5. Parse the answer and safely extract the text
        const data = await response.json();
        
        // Safety Check: Did Google block the request or return an empty answer?
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            console.error("Google API returned empty content or blocked request:", data);
            return res.status(500).json({ error: 'AI Safety Filter blocked the response or returned an empty answer.' });
        }

        const text = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: text });

    } catch (error) {
        console.error("Backend fetch error:", error);
        return res.status(500).json({ error: 'Failed to communicate with Google Gemini API.' });
    }
}
