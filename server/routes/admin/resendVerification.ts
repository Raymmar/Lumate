import { Request, Response } from "express";
import { storage } from "../../storage";
import { sendVerificationEmail } from "../../email";

export async function resendVerification(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    // Get the user
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ error: "User is already verified" });
    }
    
    // Delete any existing verification tokens
    await storage.deleteVerificationTokensByEmail(user.email);
    
    // Create a new verification token
    const verificationToken = await storage.createVerificationToken(user.email);
    
    // Send the verification email (using the correct parameter order)
    await sendVerificationEmail(user.email, verificationToken.token);
    
    return res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return res.status(500).json({ error: "Failed to resend verification email" });
  }
}