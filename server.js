const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Serve index.html and any other files in this folder
app.use(express.static(__dirname));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";

app.post("/generate", async (req, res) => {
  try {
    const { description, photos } = req.body;

    const parts = [{ text: description || "Create an image." }];
    if (photos && photos.length) {
      photos.forEach(p => {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: p.replace(/^data:image\/\w+;base64,/, "")
          }
        });
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        })
      }
    );

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    const imgPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
    const imgData = imgPart?.inlineData?.data || imgPart?.inline_data?.data;

    if (!imgData) {
      return res.status(500).json({ error: "No image returned", raw: data });
    }

    res.json({ image: `data:image/png;base64,${imgData}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
