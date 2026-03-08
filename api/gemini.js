
export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { prompt, systemInstruction } = req.body;
    
    // 2. Securely load the API key from Vercel's Environment Variables
    // (Your students will never be able to see this)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
    }

    // 3. Set up the exact same request to the standard Gemini Flash model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    try {
        // 4. Send the request to Google
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        // 5. Parse the answer and send it back down to the student's browser
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        return res.status(200).json({ text: text });

    } catch (error) {
        console.error("Backend fetch error:", error);
        return res.status(500).json({ error: 'Failed to generate content from AI.' });
    }
}
