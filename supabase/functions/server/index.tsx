import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to get authenticated user
const getAuthUser = async (authHeader: string | null) => {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

// Health check endpoint
app.get("/make-server-d5611146/health", (c) => {
  return c.json({ status: "ok" });
});

// User signup endpoint
app.post("/make-server-d5611146/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get all presets (with optional filters)
app.get("/make-server-d5611146/presets", async (c) => {
  try {
    const searchQuery = c.req.query('search') || '';
    const userId = c.req.query('userId');

    let presets = await kv.getByPrefix('preset:');

    // Filter by user if userId provided
    if (userId) {
      presets = presets.filter((p: any) => p.userId === userId);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      presets = presets.filter((p: any) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.guitarModel?.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    presets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ presets });
  } catch (error) {
    console.log(`Error fetching presets: ${error}`);
    return c.json({ error: 'Failed to fetch presets' }, 500);
  }
});

// Get single preset by ID
app.get("/make-server-d5611146/presets/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const preset = await kv.get(`preset:${id}`);

    if (!preset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    // Get comments for this preset
    const comments = await kv.get(`preset_comments:${id}`) || [];

    return c.json({ preset, comments });
  } catch (error) {
    console.log(`Error fetching preset ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to fetch preset' }, 500);
  }
});

// Create new preset (requires auth)
app.post("/make-server-d5611146/presets", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, description, guitarModel, settings, tags } = await c.req.json();

    const presetId = crypto.randomUUID();
    const preset = {
      id: presetId,
      userId: user.id,
      userName: user.user_metadata?.name || 'Anonymous',
      name,
      description,
      guitarModel,
      settings,
      tags: tags || [],
      rating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`preset:${presetId}`, preset);

    return c.json({ preset });
  } catch (error) {
    console.log(`Error creating preset: ${error}`);
    return c.json({ error: 'Failed to create preset' }, 500);
  }
});

// Update preset (requires auth and ownership)
app.put("/make-server-d5611146/presets/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const preset = await kv.get(`preset:${id}`);

    if (!preset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    if (preset.userId !== user.id) {
      return c.json({ error: 'Forbidden: You can only edit your own presets' }, 403);
    }

    const { name, description, guitarModel, settings, tags } = await c.req.json();

    const updatedPreset = {
      ...preset,
      name: name || preset.name,
      description: description || preset.description,
      guitarModel: guitarModel || preset.guitarModel,
      settings: settings || preset.settings,
      tags: tags || preset.tags,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`preset:${id}`, updatedPreset);

    return c.json({ preset: updatedPreset });
  } catch (error) {
    console.log(`Error updating preset ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to update preset' }, 500);
  }
});

// Delete preset (requires auth and ownership)
app.delete("/make-server-d5611146/presets/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const preset = await kv.get(`preset:${id}`);

    if (!preset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    if (preset.userId !== user.id) {
      return c.json({ error: 'Forbidden: You can only delete your own presets' }, 403);
    }

    await kv.del(`preset:${id}`);
    await kv.del(`preset_comments:${id}`);
    await kv.del(`preset_ratings:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting preset ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to delete preset' }, 500);
  }
});

// Rate a preset (requires auth)
app.post("/make-server-d5611146/presets/:id/rate", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { rating } = await c.req.json();

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    const preset = await kv.get(`preset:${id}`);
    if (!preset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    // Get existing ratings
    const ratings = await kv.get(`preset_ratings:${id}`) || {};
    const oldRating = ratings[user.id];

    // Update rating
    ratings[user.id] = rating;
    await kv.set(`preset_ratings:${id}`, ratings);

    // Recalculate average
    const allRatings = Object.values(ratings) as number[];
    const avgRating = allRatings.reduce((a: number, b: number) => a + b, 0) / allRatings.length;

    preset.rating = Math.round(avgRating * 10) / 10;
    preset.ratingCount = allRatings.length;
    await kv.set(`preset:${id}`, preset);

    return c.json({ rating: preset.rating, ratingCount: preset.ratingCount });
  } catch (error) {
    console.log(`Error rating preset ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to rate preset' }, 500);
  }
});

// Add comment to preset (requires auth)
app.post("/make-server-d5611146/presets/:id/comments", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { text } = await c.req.json();

    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Comment text is required' }, 400);
    }

    const preset = await kv.get(`preset:${id}`);
    if (!preset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    const comments = await kv.get(`preset_comments:${id}`) || [];

    const comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.user_metadata?.name || 'Anonymous',
      text,
      createdAt: new Date().toISOString(),
    };

    comments.push(comment);
    await kv.set(`preset_comments:${id}`, comments);

    return c.json({ comment });
  } catch (error) {
    console.log(`Error adding comment to preset ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Get user profile
app.get("/make-server-d5611146/users/:id", async (c) => {
  try {
    const userId = c.req.param('id');

    // Get user's presets
    const presets = await kv.getByPrefix('preset:');
    const userPresets = presets.filter((p: any) => p.userId === userId);

    // Get user's basic info from first preset or return default
    const userInfo = userPresets.length > 0
      ? { id: userId, name: userPresets[0].userName }
      : { id: userId, name: 'Unknown User' };

    return c.json({
      user: userInfo,
      presets: userPresets,
      totalPresets: userPresets.length,
    });
  } catch (error) {
    console.log(`Error fetching user profile ${c.req.param('id')}: ${error}`);
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

Deno.serve(app.fetch);