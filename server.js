require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

app.post("/shopify-order", async (req, res) => {
  try {
    const secret = req.headers["x-shopify-tracking-secret"];

    if (!secret || secret !== process.env.SHOPIFY_WEBHOOK_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    const order = req.body;

    const response = await fetch(
      `https://bzr.openai.com/v1/events?pid=${process.env.PIXEL_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          events: [{
            id: `order_${order.id}`,
            type: "order_created",
            timestamp_ms: Date.now(),
            action_source: "web",
            source_url: order.source_url,
            data: {
              type: "contents",
              amount: Math.round(Number(order.amount) * 100),
              currency: order.currency
            }
          }]
        })
      }
    );

    const result = await response.text();
    if (!response.ok) {
      return res.status(502).send(result);
    }

    res.status(200).send("Purchase event sent");
  } catch (error) {
    res.status(500).send("Tracking error");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Purchase tracking server running");
});