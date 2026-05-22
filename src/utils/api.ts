import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d5611146`;

export interface Preset {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  guitarModel: string;
  settings: Record<string, any>;
  tags: string[];
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

class API {
  private getHeaders(token?: string) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }
    return headers;
  }

  async signup(email: string, password: string, name: string) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }
    return response.json();
  }

  async getPresets(search?: string, userId?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (userId) params.append('userId', userId);

    const response = await fetch(`${API_BASE}/presets?${params}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch presets');
    return response.json();
  }

  async getPreset(id: string) {
    const response = await fetch(`${API_BASE}/presets/${id}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch preset');
    return response.json();
  }

  async createPreset(token: string, preset: Partial<Preset>) {
    const response = await fetch(`${API_BASE}/presets`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(preset),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create preset');
    }
    return response.json();
  }

  async updatePreset(token: string, id: string, preset: Partial<Preset>) {
    const response = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(preset),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update preset');
    }
    return response.json();
  }

  async deletePreset(token: string, id: string) {
    const response = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete preset');
    }
    return response.json();
  }

  async ratePreset(token: string, id: string, rating: number) {
    const response = await fetch(`${API_BASE}/presets/${id}/rate`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ rating }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to rate preset');
    }
    return response.json();
  }

  async addComment(token: string, id: string, text: string) {
    const response = await fetch(`${API_BASE}/presets/${id}/comments`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add comment');
    }
    return response.json();
  }

  async getUserProfile(userId: string) {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  }
}

export const api = new API();
