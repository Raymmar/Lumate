import { Router } from "express";
import multer from "multer";
import { Client } from "@replit/object-storage";
import { randomUUID } from "crypto";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Initialize Replit Object Storage client
const client = new Client({
  bucketId: "replit-objstore-fdb314e8-358e-4080-9f92-57e210181986",
});

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;

    // Generate a unique filename with original extension
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `uploads/${randomUUID()}.${fileExtension}`;

    // Upload the file to Replit Object Storage
    await client.put(fileName, file.buffer);

    // Generate the public URL for the uploaded file
    const bucketUrl = "https://replit-objstore-fdb314e8-358e-4080-9f92-57e210181986.id.repl.co";
    const url = `${bucketUrl}/${fileName}`;

    res.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

export default router;