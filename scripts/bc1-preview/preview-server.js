import express from "express";
import cors from "cors";
import ogs from "open-graph-scraper";

const app = express();
app.use(cors()); // allow your front‑end to fetch across ports

app.get("/preview", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  try {
    const { result } = await ogs({ url });

    let authors = [];
    if (result.ogAuthor) {
      authors = Array.isArray(result.ogAuthor)
        ? result.ogAuthor
        : [result.ogAuthor];
    } else if (result.twitterCreator) {
      authors = [result.twitterCreator];
    } else if (result.author) {
      authors = result.author.split(",").map((s) => s.trim());
    }

    res.json({
      title: result.ogTitle || result.twitterTitle,
      description: result.ogDescription || result.twitterDescription,
      image: result.ogImage?.url || result.twitterImage,
      authors
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () =>
  console.log("Preview server listening on http://localhost:3000")
);
