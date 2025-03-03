import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const searchParamsSchema = z.object({
  query: z.string().min(1),
});

router.get('/search', async (req, res) => {
  try {
    const { query } = searchParamsSchema.parse(req.query);

    // Log key availability (without exposing the actual key)
    console.log('Unsplash Debug:', {
      hasAccessKey: !!process.env.UNSPLASH_ACCESS_KEY,
      query,
      timestamp: new Date().toISOString()
    });

    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30`;
    console.log('Unsplash API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      },
    });

    console.log('Unsplash API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      throw new Error(
        `Unsplash API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Unsplash route error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid search query',
        details: error.errors 
      });
    }

    // Handle different types of errors with appropriate status codes
    if (error instanceof Error && error.message.includes('Unsplash API error')) {
      return res.status(502).json({ 
        error: 'Failed to fetch images from Unsplash',
        details: error.message
      });
    }

    res.status(500).json({ 
      error: 'Internal server error while fetching images',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;