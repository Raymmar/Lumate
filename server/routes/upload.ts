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

// Get token from environment
const token = process.env.REPLIT_OBJECT_STORE_TOKEN;
console.log('Object Storage Token available:', !!token);

// Initialize Replit Object Storage client
const client = new Client({
  bucketId: "replit-objstore-fdb314e8-358e-4080-9f92-57e210181986",
  token: token, // Add token explicitly
});

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!token) {
      console.error("Object Storage Token not found in environment");
      return res.status(500).json({ error: "Storage configuration error" });
    }

    const file = req.file;

    // Generate a unique filename with original extension
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `uploads/${randomUUID()}.${fileExtension}`;

    // Upload the file to Replit Object Storage
    await client.putObject(fileName, file.buffer);

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